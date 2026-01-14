import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { calculateSimulation, ENGINE_VERSION, type SimulationInput } from "@shared/engine";
import { simulationInputSchema } from "@shared/schema";
import { saveSimulation, getSimulationsByUser, type SaveSimulationParams } from "./repositories/simulations";
import { authenticateUser } from "./middleware/auth";
import { checkUserAccess } from "./middleware/subscription";
import { logger } from "./lib/logger";

// Rate limiters for different endpoints
const calculationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many calculation requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const dataLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: "Too many data requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check endpoint (no auth, no rate limit)
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      env: process.env.NODE_ENV,
    });
  });

  // Access check endpoint (for frontend to verify subscription status)
  app.get("/api/auth/access", dataLimiter, authenticateUser, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const email = req.user?.email;

      if (!userId) {
        res.status(401).json({ access: "blocked", reason: "unauthenticated" });
        return;
      }

      const result = await checkUserAccess(userId, email);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Public route with rate limiting and input validation
  app.post("/api/calculate", calculationLimiter, (req, res, next) => {
    try {
      const rawInput = req.body?.input;

      if (!rawInput) {
        res.status(400).json({ message: "Missing input payload" });
        return;
      }

      // Validate input with Zod
      const validation = simulationInputSchema.safeParse(rawInput);
      if (!validation.success) {
        res.status(400).json({ 
          message: "Invalid input", 
          errors: validation.error.issues.map(i => ({ field: i.path.join("."), message: i.message }))
        });
        return;
      }

      const input = validation.data as SimulationInput;
      const result = calculateSimulation(input);

      res.json({
        output: result,
        engineVersion: ENGINE_VERSION,
      });
    } catch (err) {
      next(err);
    }
  });

  // Protected route: Save simulation (requires authentication)
  app.post("/api/simulations", dataLimiter, authenticateUser, async (req, res, next) => {
    try {
      const { name, input, output, engineVersion } = req.body as Partial<SaveSimulationParams>;

      // Use authenticated user ID from middleware
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      if (!name || !input || !output) {
        res.status(400).json({ message: "Missing required fields: name, input, output" });
        return;
      }

      const saved = await saveSimulation({
        userId,
        name,
        input,
        output,
        engineVersion: engineVersion ?? ENGINE_VERSION,
      });

      res.json({ simulation: saved });
    } catch (err) {
      next(err);
    }
  });

  // Protected route: Get user simulations (requires authentication)
  app.get("/api/simulations/:userId", dataLimiter, authenticateUser, async (req, res, next) => {
    try {
      const { userId } = req.params;
      const authenticatedUserId = req.user?.id;

      // Ensure user can only access their own simulations
      if (userId !== authenticatedUserId) {
        res.status(403).json({ message: "Forbidden: You can only access your own simulations" });
        return;
      }

      const simulations = await getSimulationsByUser(userId);

      res.json({ simulations });
    } catch (err) {
      next(err);
    }
  });

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  return httpServer;
}
