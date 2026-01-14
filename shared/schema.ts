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

export const cakto_entitlements = pgTable("cakto_entitlements", {
  email: text("email").primaryKey(),
  status: text("status").notNull().default("blocked"),
  lastEvent: text("last_event"),
  rawPayload: jsonb("raw_payload"),
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

// Validation schema for simulation input
export const simulationInputSchema = z.object({
  initialWeight: z.number().min(0.5, "Peso mínimo é 0.5g").max(200000, "Peso máximo é 200kg"),
  quantity: z.number().int().min(1, "Quantidade mínima é 1").max(2000000, "Quantidade máxima é 2 milhões"),
  temperature: z.number().min(10, "Temperatura mínima é 10°C").max(40, "Temperatura máxima é 40°C"),
  feedPrice: z.number().min(0, "Preço não pode ser negativo").max(10000, "Preço máximo é R$ 10.000"),
  weeks: z.number().int().min(1, "Mínimo de 1 semana").max(52, "Máximo de 52 semanas"),
  phase: z.string().optional(),
});

export type SimulationInputValidated = z.infer<typeof simulationInputSchema>;

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Simulation = typeof feeding_simulations.$inferSelect;
export type InsertSimulation = z.infer<typeof insertSimulationSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
