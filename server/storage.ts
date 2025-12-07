import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq } from "drizzle-orm";
import {
  identityProfiles,
  datasets,
  type IdentityProfile,
  type Dataset,
  type InsertIdentityProfile,
  type InsertDataset,
} from "@shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface IStorage {
  // Identity Profile operations
  createIdentityProfile(data: InsertIdentityProfile): Promise<IdentityProfile>;
  getIdentityProfile(id: string): Promise<IdentityProfile | undefined>;
  listIdentityProfiles(): Promise<IdentityProfile[]>;
  
  // Dataset operations
  createDataset(data: InsertDataset): Promise<Dataset>;
  getDataset(id: string): Promise<Dataset | undefined>;
  listDatasets(identityId?: string): Promise<Dataset[]>;
  updateDatasetProgress(id: string, generatedCount: number): Promise<Dataset | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Identity Profile operations
  async createIdentityProfile(data: InsertIdentityProfile): Promise<IdentityProfile> {
    const [profile] = await db
      .insert(identityProfiles)
      .values(data)
      .returning();
    return profile;
  }

  async getIdentityProfile(id: string): Promise<IdentityProfile | undefined> {
    const [profile] = await db
      .select()
      .from(identityProfiles)
      .where(eq(identityProfiles.id, id))
      .limit(1);
    return profile;
  }

  async listIdentityProfiles(): Promise<IdentityProfile[]> {
    return db
      .select()
      .from(identityProfiles)
      .orderBy(identityProfiles.createdAt);
  }

  // Dataset operations
  async createDataset(data: InsertDataset): Promise<Dataset> {
    const [dataset] = await db
      .insert(datasets)
      .values(data)
      .returning();
    return dataset;
  }

  async getDataset(id: string): Promise<Dataset | undefined> {
    const [dataset] = await db
      .select()
      .from(datasets)
      .where(eq(datasets.id, id))
      .limit(1);
    return dataset;
  }

  async listDatasets(identityId?: string): Promise<Dataset[]> {
    if (identityId) {
      return db
        .select()
        .from(datasets)
        .where(eq(datasets.identityId, identityId))
        .orderBy(datasets.createdAt);
    }
    return db
      .select()
      .from(datasets)
      .orderBy(datasets.createdAt);
  }

  async updateDatasetProgress(id: string, generatedCount: number): Promise<Dataset | undefined> {
    const [dataset] = await db
      .update(datasets)
      .set({ generatedCount })
      .where(eq(datasets.id, id))
      .returning();
    return dataset;
  }
}

export const storage = new DatabaseStorage();
