import { pgTable, text, serial,index, integer, boolean, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const indicators = pgTable("indicators", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  shortDescription: text("short_description").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  tier: text("tier").notNull().default("premium"),
  price: text("price").notNull(),
  videoUrl: text("video_url"),
  imageUrl: text("image_url"),
  features: text("features").array().notNull(),
  winRate: text("win_rate"),
  avgReturn: text("avg_return"),
  totalTrades: text("total_trades"),
  trialDays: integer("trial_days").default(7),
  markets: text("markets").array(),
  bestTimeframes: text("best_timeframes").array(),
  signalLogic: text("signal_logic"),
  entryConditions: text("entry_conditions"),
  exitConditions: text("exit_conditions"),
  stopLossStrategy: text("stop_loss_strategy"),
  targetStrategy: text("target_strategy"),
  recommendedSettings: text("recommended_settings"),
  nonRepainting: boolean("non_repainting").default(false),
  faqs: jsonb("faqs").$type<{ q: string; a: string }[]>().default(sql`'[]'::jsonb`),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  avgRR: text("avg_rr"),
  profitFactor: text("profit_factor"),
  bestMarket: text("best_market"),
  tradingViewSymbol: text("trading_view_symbol"),
  rating: text("rating"),
  reviewCount: integer("review_count").default(0),
  versionLabel: text("version_label"),
  publishedDate: text("published_date"),
  developer: text("developer"),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  username: text("username").notNull(),
  email: text("email").notNull().unique(),
  mobileNumber: text("mobile_number").notNull(),
  tradingViewUsername: text("tradingview_username").notNull(),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessions = pgTable(
  "session",
  {
    sid: text("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire", { mode: "date" }).notNull(),
  },
  (table) => ({
    expireIdx: index("IDX_session_expire").on(table.expire),
  })
);

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull().default("pending"),
  totalAmount: text("total_amount").notNull(),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  approvedAt: timestamp("approved_at"),

  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  paymentStatus: text("payment_status").default("pending"),
  paidAt: timestamp("paid_at"),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  indicatorId: integer("indicator_id").notNull(),
  duration: integer("duration").notNull(),
  price: text("price").notNull(),
  isTrial: boolean("is_trial").default(false),
  version: text("version").default("indicator"),
});

export const insertIndicatorSchema = createInsertSchema(indicators).omit({ id: true }).extend({
  faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([]).optional(),
});
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, isAdmin: true }).extend({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  mobileNumber: z.string().min(10, "Please enter a valid mobile number").regex(/^[+]?[\d\s()-]+$/, "Invalid mobile number format"),
  tradingViewUsername: z.string().min(2, "TradingView username is required"),
});

export const updateUserProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  mobileNumber: z.string().min(10).regex(/^[+]?[\d\s()-]+$/).optional(),
  tradingViewUsername: z.string().min(2).optional(),
}).strict();
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });

export type Indicator = typeof indicators.$inferSelect;
export type InsertIndicator = z.infer<typeof insertIndicatorSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
