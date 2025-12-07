import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertIdentityProfileSchema, insertDatasetSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Identity Profile Routes
  
  // Create identity profile
  app.post("/api/identities", async (req, res) => {
    try {
      const validatedData = insertIdentityProfileSchema.parse(req.body);
      const profile = await storage.createIdentityProfile(validatedData);
      res.json(profile);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error("Error creating identity profile:", error);
      res.status(500).json({ error: "Failed to create identity profile" });
    }
  });

  // List all identity profiles
  app.get("/api/identities", async (req, res) => {
    try {
      const profiles = await storage.listIdentityProfiles();
      res.json(profiles);
    } catch (error) {
      console.error("Error listing identity profiles:", error);
      res.status(500).json({ error: "Failed to list identity profiles" });
    }
  });

  // Get specific identity profile
  app.get("/api/identities/:id", async (req, res) => {
    try {
      const profile = await storage.getIdentityProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ error: "Identity profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error getting identity profile:", error);
      res.status(500).json({ error: "Failed to get identity profile" });
    }
  });

  // Dataset Routes
  
  // Create dataset
  app.post("/api/datasets", async (req, res) => {
    try {
      const validatedData = insertDatasetSchema.parse(req.body);
      const dataset = await storage.createDataset(validatedData);
      res.json(dataset);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error("Error creating dataset:", error);
      res.status(500).json({ error: "Failed to create dataset" });
    }
  });

  // List datasets (optionally filtered by identityId)
  app.get("/api/datasets", async (req, res) => {
    try {
      const identityId = req.query.identityId as string | undefined;
      const datasets = await storage.listDatasets(identityId);
      res.json(datasets);
    } catch (error) {
      console.error("Error listing datasets:", error);
      res.status(500).json({ error: "Failed to list datasets" });
    }
  });

  // Get specific dataset
  app.get("/api/datasets/:id", async (req, res) => {
    try {
      const dataset = await storage.getDataset(req.params.id);
      if (!dataset) {
        return res.status(404).json({ error: "Dataset not found" });
      }
      res.json(dataset);
    } catch (error) {
      console.error("Error getting dataset:", error);
      res.status(500).json({ error: "Failed to get dataset" });
    }
  });

  // Update dataset progress
  app.patch("/api/datasets/:id/progress", async (req, res) => {
    try {
      const { generatedCount } = req.body;
      if (typeof generatedCount !== "number") {
        return res.status(400).json({ error: "generatedCount must be a number" });
      }
      const dataset = await storage.updateDatasetProgress(req.params.id, generatedCount);
      if (!dataset) {
        return res.status(404).json({ error: "Dataset not found" });
      }
      res.json(dataset);
    } catch (error) {
      console.error("Error updating dataset progress:", error);
      res.status(500).json({ error: "Failed to update dataset progress" });
    }
  });

  return httpServer;
}
