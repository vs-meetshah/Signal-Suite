import { 
  indicators, users, orders, orderItems,
  type Indicator, type InsertIndicator,
  type User, type InsertUser,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getIndicators(): Promise<Indicator[]>;
  getIndicatorBySlug(slug: string): Promise<Indicator | undefined>;
  getIndicatorById(id: number): Promise<Indicator | undefined>;
  createIndicator(indicator: InsertIndicator): Promise<Indicator>;
  updateIndicator(id: number, data: Partial<InsertIndicator>): Promise<Indicator>;
  deleteIndicator(id: number): Promise<void>;
  getAllOrders(): Promise<Order[]>;
  getAllOrderItems(): Promise<OrderItem[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User>;
  setUserAdmin(id: number, isAdmin: boolean): Promise<User>;
  getAllUsers(): Promise<User[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  getUserOrders(userId: number): Promise<Order[]>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  getOrderById(id: number): Promise<Order | undefined>;
  approveOrder(id: number): Promise<Order>;
  rejectOrder(id: number, reason: string): Promise<Order>;
}

export class DatabaseStorage implements IStorage {
  async getIndicators(): Promise<Indicator[]> {
    return db.select().from(indicators);
  }

  async getIndicatorBySlug(slug: string): Promise<Indicator | undefined> {
    const [result] = await db.select().from(indicators).where(eq(indicators.slug, slug));
    return result;
  }

  async getIndicatorById(id: number): Promise<Indicator | undefined> {
    const [result] = await db.select().from(indicators).where(eq(indicators.id, id));
    return result;
  }

  async createIndicator(indicator: InsertIndicator): Promise<Indicator> {
    const [result] = await db.insert(indicators).values(indicator).returning();
    return result;
  }

  async updateIndicator(id: number, data: Partial<InsertIndicator>): Promise<Indicator> {
    const [result] = await db.update(indicators).set(data).where(eq(indicators.id, id)).returning();
    return result;
  }

  async deleteIndicator(id: number): Promise<void> {
    await db.delete(indicators).where(eq(indicators.id, id));
  }

  async getAllOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getAllOrderItems(): Promise<OrderItem[]> {
    return db.select().from(orderItems);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.email, email));
    return result;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.id, id));
    return result;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [result] = await db.insert(users).values(user).returning();
    return result;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User> {
    const [result] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result;
  }

  async setUserAdmin(id: number, isAdmin: boolean): Promise<User> {
    const [result] = await db.update(users).set({ isAdmin }).where(eq(users.id, id)).returning();
    return result;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const [result] = await db.select().from(orders).where(eq(orders.id, id));
    return result;
  }

  async approveOrder(id: number): Promise<Order> {
    const [result] = await db.update(orders).set({ status: "approved", approvedAt: new Date(), rejectionReason: null }).where(eq(orders.id, id)).returning();
    return result;
  }

  async rejectOrder(id: number, reason: string): Promise<Order> {
    const [result] = await db.update(orders).set({ status: "rejected", rejectionReason: reason, approvedAt: null }).where(eq(orders.id, id)).returning();
    return result;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [result] = await db.insert(orders).values(order).returning();
    return result;
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [result] = await db.insert(orderItems).values(item).returning();
    return result;
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }
}

export const storage = new DatabaseStorage();
