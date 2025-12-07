import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Identity Profiles - stores analyzed subject identities
export const identityProfiles = pgTable("identity_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  uid: text("uid").notNull(), // The identity UID from analysis
  identityProfile: jsonb("identity_profile").notNull(), // Full analysis result from Gemini
  headshotImage: text("headshot_image"), // Base64 or URL
  bodyshotImage: text("bodyshot_image"), // Base64 or URL
  sourceImage: text("source_image"), // Original upload
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Datasets - stores generated prompt sets and metadata
export const datasets = pgTable("datasets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  identityId: varchar("identity_id").references(() => identityProfiles.id).notNull(),
  name: text("name").notNull(), // User-provided name or auto-generated
  prompts: jsonb("prompts").notNull(), // Array of PromptItem
  safetyMode: text("safety_mode").notNull(), // 'sfw' | 'nsfw'
  targetTotal: integer("target_total").notNull(),
  generatedCount: integer("generated_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert Schemas
export const insertIdentityProfileSchema = createInsertSchema(identityProfiles).omit({
  id: true,
  createdAt: true,
});

export const insertDatasetSchema = createInsertSchema(datasets).omit({
  id: true,
  createdAt: true,
});

// Select Types
export type IdentityProfile = typeof identityProfiles.$inferSelect;
export type Dataset = typeof datasets.$inferSelect;
export type InsertIdentityProfile = z.infer<typeof insertIdentityProfileSchema>;
export type InsertDataset = z.infer<typeof insertDatasetSchema>;
