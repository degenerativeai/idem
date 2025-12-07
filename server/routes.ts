import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // No database routes - app runs entirely client-side
  // Add any stateless API routes here if needed in the future
  
  return httpServer;
}
