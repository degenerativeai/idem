import { z } from "zod";

// Identity Profile type - stores analyzed subject identities
export interface IdentityProfile {
  id: string;
  uid: string;
  identityProfile: Record<string, any>;
  headshotImage?: string;
  bodyshotImage?: string;
  sourceImage?: string;
}

// Dataset type - stores generated prompt sets
export interface Dataset {
  id: string;
  identityId: string;
  name: string;
  prompts: any[];
  safetyMode: string;
  targetTotal: number;
  generatedCount: number;
}

// Insert types (for creating new records)
export type InsertIdentityProfile = Omit<IdentityProfile, 'id'>;
export type InsertDataset = Omit<Dataset, 'id'>;

// Zod schemas for validation
export const insertIdentityProfileSchema = z.object({
  uid: z.string(),
  identityProfile: z.record(z.any()),
  headshotImage: z.string().optional(),
  bodyshotImage: z.string().optional(),
  sourceImage: z.string().optional(),
});

export const insertDatasetSchema = z.object({
  identityId: z.string(),
  name: z.string(),
  prompts: z.array(z.any()),
  safetyMode: z.string(),
  targetTotal: z.number(),
  generatedCount: z.number().default(0),
});
