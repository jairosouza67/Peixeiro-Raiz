import { pgTable, text, timestamp, integer, jsonb, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (integrates with Supabase Auth)
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feeding_simulations = pgTable("feeding_simulations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  name: text("name").notNull(),
  input: jsonb("input").notNull(),
  output: jsonb("output").notNull(),
  engineVersion: text("engine_version").notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  status: text("status").notNull().default("blocked"), // blocked, active
  planId: text("plan_id"),
  trialEnd: timestamp("trial_end"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const engine_versions = pgTable("engine_versions", {
  version: text("version").primaryKey(),
  logicHash: text("logic_hash").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for insertion
export const insertUserSchema = createInsertSchema(users);
export const insertSimulationSchema = createInsertSchema(feeding_simulations);
export const insertSubscriptionSchema = createInsertSchema(subscriptions);

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Simulation = typeof feeding_simulations.$inferSelect;
export type InsertSimulation = z.infer<typeof insertSimulationSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
