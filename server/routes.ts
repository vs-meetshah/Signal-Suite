import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, updateUserProfileSchema, insertIndicatorSchema } from "@shared/schema";
import { seedDatabase } from "./seed";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seedDatabase();

  app.get("/api/indicators", async (_req, res) => {
    const indicators = await storage.getIndicators();
    res.json(indicators);
  });

  app.get("/api/indicators/:slug", async (req, res) => {
    const indicator = await storage.getIndicatorBySlug(req.params.slug);
    if (!indicator) {
      return res.status(404).json({ message: "Indicator not found" });
    }
    res.json(indicator);
  });

  app.get("/api/access/:indicatorId", async (req, res) => {
    const indicatorId = parseInt(req.params.indicatorId);
    if (!req.session.userId || isNaN(indicatorId)) {
      return res.json({ hasAccess: false });
    }
    const userOrders = await storage.getUserOrders(req.session.userId);
    for (const order of userOrders) {
      if (order.status !== "approved") continue;
      const items = await storage.getOrderItems(order.id);
      const match = items.find((i) => i.indicatorId === indicatorId);
      if (!match) continue;
      if (!order.approvedAt) {
        return res.json({ hasAccess: true });
      }
      const expiry = new Date(order.approvedAt);
      expiry.setMonth(expiry.getMonth() + match.duration);
      if (expiry.getTime() > Date.now()) {
        return res.json({ hasAccess: true });
      }
    }
    res.json({ hasAccess: false });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      req.session.destroy(() => { });
      return res.status(401).json({ message: "User not found" });
    }
    res.json(user);
  });

  app.get("/api/auth/check-email", async (req, res) => {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    const user = await storage.getUserByEmail(email);
    if (user) {
      res.json({ exists: true, user: { firstName: user.firstName, lastName: user.lastName, username: user.username, mobileNumber: user.mobileNumber, tradingViewUsername: user.tradingViewUsername } });
    } else {
      res.json({ exists: false });
    }
  });

  app.post("/api/auth/signup-or-login", async (req, res) => {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
    }

    const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const existing = await storage.getUserByEmail(parsed.data.email);
    if (existing) {
      if (adminEmail && existing.email.toLowerCase() === adminEmail && !existing.isAdmin) {
        await storage.setUserAdmin(existing.id, true);
        existing.isAdmin = true;
      }
      req.session.userId = existing.id;
      return res.json({ user: existing, isNewUser: false });
    }

    const user = await storage.createUser(parsed.data);
    if (adminEmail && user.email.toLowerCase() === adminEmail) {
      await storage.setUserAdmin(user.id, true);
      user.isAdmin = true;
    }
    req.session.userId = user.id;
    res.status(201).json({ user, isNewUser: true });
  });

  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    const allUsers = await storage.getAllUsers();
    const allIndicators = await storage.getIndicators();
    const indicatorMap = new Map(allIndicators.map((i) => [i.id, i]));

    const enriched = await Promise.all(
      allUsers.map(async (u) => {
        const userOrders = await storage.getUserOrders(u.id);
        const ordersWithItems = await Promise.all(
          userOrders.map(async (order) => {
            const items = await storage.getOrderItems(order.id);
            const enrichedItems = items.map((item) => {
              const ind = indicatorMap.get(item.indicatorId);
              let daysRemaining: number | null = null;
              let accessStatus: "pending" | "active" | "expired" | "rejected" = "pending";
              if (order.status === "rejected") {
                accessStatus = "rejected";
              } else if (order.status === "approved" && order.approvedAt) {
                const expiry = new Date(order.approvedAt);
                expiry.setMonth(expiry.getMonth() + item.duration);
                const ms = expiry.getTime() - Date.now();
                daysRemaining = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
                accessStatus = daysRemaining > 0 ? "active" : "expired";
              }
              return {
                ...item,
                indicatorName: ind?.name || "Unknown",
                indicatorSlug: ind?.slug || "",
                indicatorTier: ind?.tier || "premium",
                daysRemaining,
                accessStatus,
              };
            });
            return { ...order, items: enrichedItems };
          })
        );

        const hasActivePlan = ordersWithItems.some((o) =>
          o.items.some((it) => it.accessStatus === "active")
        );
        const planType = ordersWithItems.some((o) =>
          o.items.some((it) => it.accessStatus === "active" && it.indicatorTier === "premium" && !it.isTrial)
        )
          ? "paid"
          : ordersWithItems.some((o) => o.items.some((it) => it.accessStatus === "active" && it.isTrial))
            ? "trial"
            : ordersWithItems.some((o) => o.items.some((it) => it.accessStatus === "active" && it.indicatorTier === "free"))
              ? "free"
              : "none";

        const maxDays = ordersWithItems
          .flatMap((o) => o.items.map((it) => it.daysRemaining))
          .filter((d): d is number => typeof d === "number")
          .reduce((a, b) => Math.max(a, b), 0);

        return {
          ...u,
          orders: ordersWithItems,
          hasActivePlan,
          planType,
          daysRemaining: hasActivePlan ? maxDays : null,
          totalOrders: ordersWithItems.length,
          totalSpent: ordersWithItems
            .filter((o) => o.status === "approved")
            .reduce((sum, o) => sum + parseFloat(o.totalAmount), 0),
        };
      })
    );

    res.json(enriched);
  });

  app.post("/api/admin/orders/:id/approve", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid order id" });
    const order = await storage.getOrderById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const updated = await storage.approveOrder(id);
    res.json(updated);
  });

  // Analytics
  app.get("/api/admin/analytics", requireAdmin, async (_req, res) => {
    const [allUsers, allOrders, allItems, allIndicators] = await Promise.all([
      storage.getAllUsers(),
      storage.getAllOrders(),
      storage.getAllOrderItems(),
      storage.getIndicators(),
    ]);

    const indicatorMap = new Map(allIndicators.map((i) => [i.id, i]));
    const itemsByOrder = new Map<number, typeof allItems>();
    for (const it of allItems) {
      const arr = itemsByOrder.get(it.orderId) || [];
      arr.push(it);
      itemsByOrder.set(it.orderId, arr);
    }

    const now = new Date();
    const startOfDay = (d: Date) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };
    const startOfMonth = (y: number, m: number) => new Date(y, m, 1);
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    const today = startOfDay(now);
    const thisMonthStart = startOfMonth(now.getFullYear(), now.getMonth());
    const lastMonthStart = startOfMonth(now.getFullYear(), now.getMonth() - 1);
    const lastYearSameMonthStart = startOfMonth(now.getFullYear() - 1, now.getMonth());
    const lastYearSameMonthEnd = startOfMonth(now.getFullYear() - 1, now.getMonth() + 1);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

    // ---------- Users ----------
    const totalUsers = allUsers.length;
    const newUsersToday = allUsers.filter((u) => u.createdAt && new Date(u.createdAt) >= today).length;
    const newUsersThisMonth = allUsers.filter((u) => u.createdAt && new Date(u.createdAt) >= thisMonthStart).length;
    const newUsersLastMonth = allUsers.filter(
      (u) => u.createdAt && new Date(u.createdAt) >= lastMonthStart && new Date(u.createdAt) < thisMonthStart
    ).length;
    const userGrowthMoMPct = newUsersLastMonth === 0
      ? (newUsersThisMonth > 0 ? 100 : 0)
      : ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100;

    // Daily user signups (last 30 days)
    const dailySignups: { date: string; users: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const count = allUsers.filter(
        (u) => u.createdAt && new Date(u.createdAt) >= d && new Date(u.createdAt) < next
      ).length;
      dailySignups.push({ date: d.toISOString().slice(5, 10), users: count });
    }

    // Monthly user growth (last 12 months)
    const monthlyUsers: { month: string; users: number; cumulative: number }[] = [];
    let cumUsers = allUsers.filter((u) => {
      const start = startOfMonth(now.getFullYear(), now.getMonth() - 11);
      return u.createdAt && new Date(u.createdAt) < start;
    }).length;
    for (let i = 11; i >= 0; i--) {
      const mStart = startOfMonth(now.getFullYear(), now.getMonth() - i);
      const mEnd = startOfMonth(now.getFullYear(), now.getMonth() - i + 1);
      const count = allUsers.filter(
        (u) => u.createdAt && new Date(u.createdAt) >= mStart && new Date(u.createdAt) < mEnd
      ).length;
      cumUsers += count;
      monthlyUsers.push({
        month: mStart.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        users: count,
        cumulative: cumUsers,
      });
    }

    // ---------- Revenue (only approved orders) ----------
    const approvedOrders = allOrders.filter((o) => o.status === "approved");
    const totalRevenue = approvedOrders.reduce((s, o) => s + parseFloat(o.totalAmount), 0);
    const revenueThisMonth = approvedOrders
      .filter((o) => o.approvedAt && new Date(o.approvedAt) >= thisMonthStart)
      .reduce((s, o) => s + parseFloat(o.totalAmount), 0);
    const revenueLastMonth = approvedOrders
      .filter((o) => o.approvedAt && new Date(o.approvedAt) >= lastMonthStart && new Date(o.approvedAt) < thisMonthStart)
      .reduce((s, o) => s + parseFloat(o.totalAmount), 0);
    const revenueLastYearSameMonth = approvedOrders
      .filter((o) => o.approvedAt && new Date(o.approvedAt) >= lastYearSameMonthStart && new Date(o.approvedAt) < lastYearSameMonthEnd)
      .reduce((s, o) => s + parseFloat(o.totalAmount), 0);
    const revenueLastYearTotal = approvedOrders
      .filter((o) => o.approvedAt && new Date(o.approvedAt).getFullYear() === now.getFullYear() - 1)
      .reduce((s, o) => s + parseFloat(o.totalAmount), 0);
    const revenueThisYear = approvedOrders
      .filter((o) => o.approvedAt && new Date(o.approvedAt).getFullYear() === now.getFullYear())
      .reduce((s, o) => s + parseFloat(o.totalAmount), 0);

    const revenueMoMPct = revenueLastMonth === 0
      ? (revenueThisMonth > 0 ? 100 : 0)
      : ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100;
    const revenueYoYPct = revenueLastYearSameMonth === 0
      ? (revenueThisMonth > 0 ? 100 : 0)
      : ((revenueThisMonth - revenueLastYearSameMonth) / revenueLastYearSameMonth) * 100;

    // Monthly revenue (last 12 months)
    const monthlyRevenue: { month: string; revenue: number; orders: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const mStart = startOfMonth(now.getFullYear(), now.getMonth() - i);
      const mEnd = startOfMonth(now.getFullYear(), now.getMonth() - i + 1);
      const monthOrders = approvedOrders.filter(
        (o) => o.approvedAt && new Date(o.approvedAt) >= mStart && new Date(o.approvedAt) < mEnd
      );
      monthlyRevenue.push({
        month: mStart.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        revenue: monthOrders.reduce((s, o) => s + parseFloat(o.totalAmount), 0),
        orders: monthOrders.length,
      });
    }

    // ---------- Projections (based on last 3 months avg growth) ----------
    const last3MonthsRevenue = monthlyRevenue.slice(-3).map((m) => m.revenue);
    const avgMonthlyRevenue = last3MonthsRevenue.reduce((s, v) => s + v, 0) / Math.max(1, last3MonthsRevenue.length);
    let monthlyGrowthRate = 0;
    if (last3MonthsRevenue.length >= 2 && last3MonthsRevenue[0] > 0) {
      const ratios: number[] = [];
      for (let i = 1; i < last3MonthsRevenue.length; i++) {
        if (last3MonthsRevenue[i - 1] > 0) {
          ratios.push((last3MonthsRevenue[i] - last3MonthsRevenue[i - 1]) / last3MonthsRevenue[i - 1]);
        }
      }
      if (ratios.length > 0) monthlyGrowthRate = ratios.reduce((s, v) => s + v, 0) / ratios.length;
    }
    const projectedNextMonth = Math.max(0, avgMonthlyRevenue * (1 + monthlyGrowthRate));
    const projectedAnnual = Math.max(0, avgMonthlyRevenue * 12 * (1 + monthlyGrowthRate));

    // User growth rate
    const last3MonthsUsers = monthlyUsers.slice(-3).map((m) => m.users);
    const avgMonthlyNewUsers = last3MonthsUsers.reduce((s, v) => s + v, 0) / Math.max(1, last3MonthsUsers.length);
    let userGrowthRate = 0;
    if (last3MonthsUsers.length >= 2) {
      const ratios: number[] = [];
      for (let i = 1; i < last3MonthsUsers.length; i++) {
        if (last3MonthsUsers[i - 1] > 0) {
          ratios.push((last3MonthsUsers[i] - last3MonthsUsers[i - 1]) / last3MonthsUsers[i - 1]);
        }
      }
      if (ratios.length > 0) userGrowthRate = ratios.reduce((s, v) => s + v, 0) / ratios.length;
    }
    const projectedNewUsersNextMonth = Math.round(Math.max(0, avgMonthlyNewUsers * (1 + userGrowthRate)));
    const projectedTotalUsersYearEnd = totalUsers + Math.round(Math.max(0, avgMonthlyNewUsers * 12 * (1 + userGrowthRate)));

    // ---------- Most-used indicators ----------
    const indicatorOrderCounts = new Map<number, { orders: number; revenue: number; activeUsers: Set<number> }>();
    for (const order of approvedOrders) {
      const items = itemsByOrder.get(order.id) || [];
      for (const it of items) {
        const cur = indicatorOrderCounts.get(it.indicatorId) || { orders: 0, revenue: 0, activeUsers: new Set<number>() };
        cur.orders += 1;
        cur.revenue += parseFloat(it.price);
        cur.activeUsers.add(order.userId);
        indicatorOrderCounts.set(it.indicatorId, cur);
      }
    }
    const mostUsedIndicators = Array.from(indicatorOrderCounts.entries())
      .map(([id, stats]) => {
        const ind = indicatorMap.get(id);
        return {
          id,
          name: ind?.name || "Unknown",
          slug: ind?.slug || "",
          tier: ind?.tier || "premium",
          category: ind?.category || "",
          orders: stats.orders,
          revenue: Math.round(stats.revenue),
          uniqueUsers: stats.activeUsers.size,
        };
      })
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10);

    // ---------- User segmentation: free / paid / trial / inactive ----------
    // Build per-user access view
    const userAccess = new Map<number, { hasPaid: boolean; hasTrial: boolean; hasFree: boolean; hasActive: boolean }>();
    for (const order of allOrders) {
      if (order.status !== "approved") continue;
      const items = itemsByOrder.get(order.id) || [];
      const cur = userAccess.get(order.userId) || { hasPaid: false, hasTrial: false, hasFree: false, hasActive: false };
      for (const it of items) {
        const ind = indicatorMap.get(it.indicatorId);
        let isActive = false;
        if (order.approvedAt) {
          const expiry = new Date(order.approvedAt);
          expiry.setMonth(expiry.getMonth() + it.duration);
          isActive = expiry.getTime() > now.getTime();
        }
        if (ind?.tier === "free") cur.hasFree = true;
        else if (it.isTrial) {
          cur.hasTrial = true;
          if (isActive) cur.hasActive = true;
        } else {
          cur.hasPaid = true;
          if (isActive) cur.hasActive = true;
        }
      }
      userAccess.set(order.userId, cur);
    }

    let activePaidUsers = 0;
    let activeTrialUsers = 0;
    let freeUsers = 0;
    let inactiveUsers = 0;
    let convertedTrialToPaid = 0;
    let trialUsersTotal = 0;
    for (const u of allUsers) {
      const a = userAccess.get(u.id);
      if (!a) {
        inactiveUsers += 1;
        continue;
      }
      if (a.hasTrial) trialUsersTotal += 1;
      if (a.hasTrial && a.hasPaid) convertedTrialToPaid += 1;
      if (a.hasPaid && a.hasActive) {
        activePaidUsers += 1;
      } else if (a.hasTrial && a.hasActive) {
        activeTrialUsers += 1;
      } else if (a.hasFree) {
        freeUsers += 1;
      } else {
        inactiveUsers += 1;
      }
    }
    const trialToPaidRate = trialUsersTotal === 0 ? 0 : (convertedTrialToPaid / trialUsersTotal) * 100;

    // ---------- Renewal / Churn (paid premium, non-trial) ----------
    // Bucket paid orders by month based on approvedAt
    const paidByMonth = new Map<string, Set<number>>();
    for (const order of approvedOrders) {
      if (!order.approvedAt) continue;
      const items = itemsByOrder.get(order.id) || [];
      const hasPaidNonTrial = items.some((it) => !it.isTrial && (indicatorMap.get(it.indicatorId)?.tier !== "free"));
      if (!hasPaidNonTrial) continue;
      const k = monthKey(new Date(order.approvedAt));
      const set = paidByMonth.get(k) || new Set<number>();
      set.add(order.userId);
      paidByMonth.set(k, set);
    }
    const lastMonthKey = monthKey(lastMonthStart);
    const thisMonthKey = monthKey(thisMonthStart);
    const lastMonthPaid = paidByMonth.get(lastMonthKey) || new Set<number>();
    const thisMonthPaid = paidByMonth.get(thisMonthKey) || new Set<number>();
    let renewedFromLastMonth = 0;
    lastMonthPaid.forEach((uid) => {
      if (thisMonthPaid.has(uid)) renewedFromLastMonth += 1;
    });
    const renewalRate = lastMonthPaid.size === 0 ? 0 : (renewedFromLastMonth / lastMonthPaid.size) * 100;
    const churnedFromLastMonth = lastMonthPaid.size - renewedFromLastMonth;
    const churnRate = lastMonthPaid.size === 0 ? 0 : (churnedFromLastMonth / lastMonthPaid.size) * 100;

    // Monthly retention curve (last 6 months)
    const retentionTrend: { month: string; renewed: number; churned: number; retentionRate: number }[] = [];
    for (let i = 5; i >= 1; i--) {
      const mStart = startOfMonth(now.getFullYear(), now.getMonth() - i);
      const nextStart = startOfMonth(now.getFullYear(), now.getMonth() - i + 1);
      const k = monthKey(mStart);
      const nk = monthKey(nextStart);
      const cohort = paidByMonth.get(k) || new Set<number>();
      const next = paidByMonth.get(nk) || new Set<number>();
      let renewed = 0;
      cohort.forEach((uid) => { if (next.has(uid)) renewed += 1; });
      const churned = cohort.size - renewed;
      retentionTrend.push({
        month: mStart.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        renewed,
        churned,
        retentionRate: cohort.size === 0 ? 0 : Math.round((renewed / cohort.size) * 1000) / 10,
      });
    }

    // ---------- Order status breakdown ----------
    const orderStatusBreakdown = {
      pending: allOrders.filter((o) => o.status === "pending").length,
      approved: allOrders.filter((o) => o.status === "approved").length,
      rejected: allOrders.filter((o) => o.status === "rejected").length,
    };

    // ---------- ARPU ----------
    const payingUsers = activePaidUsers + activeTrialUsers;
    const arpu = payingUsers === 0 ? 0 : totalRevenue / payingUsers;
    const aov = approvedOrders.length === 0 ? 0 : totalRevenue / approvedOrders.length;

    res.json({
      summary: {
        totalUsers,
        newUsersToday,
        newUsersThisMonth,
        newUsersLastMonth,
        userGrowthMoMPct: Math.round(userGrowthMoMPct * 10) / 10,
        totalRevenue: Math.round(totalRevenue),
        revenueThisMonth: Math.round(revenueThisMonth),
        revenueLastMonth: Math.round(revenueLastMonth),
        revenueLastYearSameMonth: Math.round(revenueLastYearSameMonth),
        revenueThisYear: Math.round(revenueThisYear),
        revenueLastYearTotal: Math.round(revenueLastYearTotal),
        revenueMoMPct: Math.round(revenueMoMPct * 10) / 10,
        revenueYoYPct: Math.round(revenueYoYPct * 10) / 10,
        arpu: Math.round(arpu),
        aov: Math.round(aov),
      },
      segmentation: {
        activePaidUsers,
        activeTrialUsers,
        freeUsers,
        inactiveUsers,
        totalActive: activePaidUsers + activeTrialUsers + freeUsers,
      },
      conversion: {
        trialUsersTotal,
        convertedTrialToPaid,
        trialToPaidRate: Math.round(trialToPaidRate * 10) / 10,
      },
      retention: {
        renewedFromLastMonth,
        churnedFromLastMonth,
        renewalRate: Math.round(renewalRate * 10) / 10,
        churnRate: Math.round(churnRate * 10) / 10,
        lastMonthPaidUsers: lastMonthPaid.size,
        thisMonthPaidUsers: thisMonthPaid.size,
        retentionTrend,
      },
      projections: {
        avgMonthlyRevenue: Math.round(avgMonthlyRevenue),
        monthlyGrowthRatePct: Math.round(monthlyGrowthRate * 1000) / 10,
        projectedNextMonthRevenue: Math.round(projectedNextMonth),
        projectedAnnualRevenue: Math.round(projectedAnnual),
        avgMonthlyNewUsers: Math.round(avgMonthlyNewUsers),
        userGrowthRatePct: Math.round(userGrowthRate * 1000) / 10,
        projectedNewUsersNextMonth,
        projectedTotalUsersYearEnd,
      },
      charts: {
        dailySignups,
        monthlyUsers,
        monthlyRevenue,
      },
      mostUsedIndicators,
      orderStatusBreakdown,
    });
  });

  // Indicator CRUD (admin)
  app.post("/api/admin/indicators", requireAdmin, async (req, res) => {
    const parsed = insertIndicatorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
    }
    const created = await storage.createIndicator(parsed.data);
    res.status(201).json(created);
  });

  app.patch("/api/admin/indicators/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid indicator id" });
    const existing = await storage.getIndicatorById(id);
    if (!existing) return res.status(404).json({ message: "Indicator not found" });
    const parsed = insertIndicatorSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
    }
    const updated = await storage.updateIndicator(id, parsed.data);
    res.json(updated);
  });

  app.delete("/api/admin/indicators/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid indicator id" });
    const existing = await storage.getIndicatorById(id);
    if (!existing) return res.status(404).json({ message: "Indicator not found" });
    await storage.deleteIndicator(id);
    res.json({ message: "Deleted" });
  });

  app.post("/api/admin/orders/:id/reject", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid order id" });
    const reason = (req.body?.reason || "").toString().trim();
    if (!reason || reason.length < 3) {
      return res.status(400).json({ message: "Rejection reason is required (min 3 characters)" });
    }
    const order = await storage.getOrderById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const updated = await storage.rejectOrder(id, reason);
    res.json(updated);
  });

  app.post("/api/auth/update", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const parsed = updateUserProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
    }
    const user = await storage.updateUser(req.session.userId, parsed.data);
    res.json(user);
  });

  app.post("/api/auth/logout", async (req, res) => {
    req.session.destroy(() => { });
    res.json({ message: "Logged out" });
  });

  app.get("/api/dashboard", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userOrders = await storage.getUserOrders(req.session.userId);
    const allIndicators = await storage.getIndicators();
    const indicatorMap = new Map(allIndicators.map(i => [i.id, i]));

    const ordersWithItems = await Promise.all(
      userOrders.map(async (order) => {
        const items = await storage.getOrderItems(order.id);
        const enrichedItems = items.map((item) => {
          const indicator = indicatorMap.get(item.indicatorId);
          let daysRemaining: number | null = null;
          let accessStatus: "pending" | "active" | "expired" | "rejected" = "pending";

          if (order.status === "rejected") {
            accessStatus = "rejected";
          } else if (order.status === "approved" && order.approvedAt) {
            const approvedDate = new Date(order.approvedAt);
            const expiryDate = new Date(approvedDate);
            expiryDate.setMonth(expiryDate.getMonth() + item.duration);
            const now = new Date();
            const msRemaining = expiryDate.getTime() - now.getTime();
            daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
            accessStatus = daysRemaining > 0 ? "active" : "expired";
          } else if (order.status === "approved") {
            accessStatus = "active";
            daysRemaining = null;
          }

          return {
            ...item,
            indicatorName: indicator?.name || "Unknown",
            indicatorSlug: indicator?.slug || "",
            indicatorCategory: indicator?.category || "",
            daysRemaining,
            accessStatus,
          };
        });
        return { ...order, items: enrichedItems };
      })
    );

    res.json(ordersWithItems);
  });

  app.post("/api/orders", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.isAdmin) {
      return res.status(403).json({ message: "Admins cannot place orders" });
    }

    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Invalid order data" });
    }

    let serverTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const indicator = await storage.getIndicatorById(item.indicatorId);
      if (!indicator) {
        return res.status(400).json({ message: `Indicator ${item.indicatorId} not found` });
      }

      const duration = Math.max(1, Math.min(12, parseInt(item.duration) || 1));
      const isTrial = item.isTrial === true && indicator.tier === "premium";

      const version: "indicator" | "strategy" | "both" =
        item.version === "strategy"
          ? "strategy"
          : item.version === "both"
            ? "both"
            : "indicator";

      const indicatorBase = parseFloat(indicator.price);
      const strategyBase =
        indicatorBase === 0 ? 499 : Math.round(indicatorBase * 1.35);

      const baseUnit =
        version === "strategy"
          ? strategyBase
          : version === "both"
            ? indicatorBase + strategyBase
            : indicatorBase;

      let price: string;
      if (isTrial) {
        const trialIndicator = 5250;
        const trialStrategy = Math.round(5250 * 1.35);

        price =
          version === "strategy"
            ? trialStrategy.toFixed(2)
            : version === "both"
              ? (trialIndicator + trialStrategy).toFixed(2)
              : trialIndicator.toFixed(2);
      } else {
        price = (baseUnit * duration).toFixed(2);
      }

      serverTotal += parseFloat(price);

      validatedItems.push({
        indicatorId: indicator.id,
        duration,
        price,
        isTrial,
        version,
      });
    }

    const order = await storage.createOrder({
      userId: req.session.userId,
      status: "pending",
      totalAmount: serverTotal.toFixed(2),
    });

    for (const vi of validatedItems) {
      await storage.createOrderItem({
        orderId: order.id,
        ...vi,
      });
    }

    res.status(201).json(order);
  });

  return httpServer;
}
