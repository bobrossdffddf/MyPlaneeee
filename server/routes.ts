import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertServiceRequestSchema, insertChatMessageSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware (non-blocking for development)
  console.log("Setting up auth...");
  try {
    await setupAuth(app);
    console.log("Auth setup complete");
  } catch (error) {
    console.warn("Auth setup failed, continuing with mock auth:", error.message);
  }

  // Initialize PTFS airports
  const ptfsAirports = [
    { icao: "IBAR", name: "IBAR" },
    { icao: "IHEN", name: "IHEN" },
    { icao: "ILAR", name: "ILAR" },
    { icao: "IIAB", name: "IIAB" },
    { icao: "IPAP", name: "IPAP" },
    { icao: "IGRV", name: "IGRV" },
    { icao: "IJAF", name: "IJAF" },
    { icao: "IZOL", name: "IZOL" },
    { icao: "ISCM", name: "ISCM" },
    { icao: "IDCS", name: "IDCS" },
    { icao: "ITKO", name: "ITKO" },
    { icao: "ILKL", name: "ILKL" },
    { icao: "IPPH", name: "IPPH" },
    { icao: "IGAR", name: "IGAR" },
    { icao: "IBLT", name: "IBLT" },
    { icao: "IRFD", name: "IRFD" },
    { icao: "IMLR", name: "IMLR" },
    { icao: "ITRC", name: "ITRC" },
    { icao: "IBTH", name: "IBTH" },
    { icao: "IUFO", name: "IUFO" },
    { icao: "ISAU", name: "ISAU" },
    { icao: "ISKP", name: "ISKP" },
  ];

  // Seed airports on startup (non-blocking)
  setImmediate(async () => {
    try {
      console.log("Seeding airports...");
      for (const airport of ptfsAirports) {
        await storage.upsertAirport(airport);
      }
      console.log("Airports seeded successfully");
    } catch (error) {
      console.error("Failed to seed airports:", error);
    }
  });

  // Auth routes (bypassed for testing)
  app.get('/api/auth/user', async (req: any, res) => {
    // Mock user for testing
    const mockUser = {
      id: "test-user-123",
      email: "test@example.com", 
      firstName: "Test",
      lastName: "User",
      profileImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    res.json(mockUser);
  });

  // Airport routes
  app.get("/api/airports", async (req, res) => {
    try {
      const airports = await storage.getAirports();
      res.json(airports);
    } catch (error) {
      console.error("Error fetching airports:", error);
      res.status(500).json({ message: "Failed to fetch airports" });
    }
  });

  // Service request routes
  app.get("/api/requests", async (req: any, res) => {
    try {
      const { airport, role } = req.query;
      const userId = "test-user-123"; // Mock user ID
      
      let requests;
      if (role === "pilot") {
        requests = await storage.getServiceRequestsByPilot(userId);
      } else if (role === "crew") {
        requests = await storage.getServiceRequestsByGroundCrew(userId);
      } else if (airport) {
        requests = await storage.getServiceRequestsByAirport(airport);
      } else {
        requests = await storage.getOpenRequests();
      }
      
      res.json(requests);
    } catch (error) {
      console.error("Error fetching requests:", error);
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  app.get("/api/requests/open", async (req, res) => {
    try {
      const { airport } = req.query;
      const requests = await storage.getOpenRequests(airport as string);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching open requests:", error);
      res.status(500).json({ message: "Failed to fetch open requests" });
    }
  });

  app.post("/api/requests", async (req: any, res) => {
    try {
      const userId = "test-user-123"; // Mock user ID
      const requestData = insertServiceRequestSchema.parse({
        ...req.body,
        pilotId: userId,
      });
      
      const request = await storage.createServiceRequest(requestData);
      
      // Notify WebSocket clients
      broadcastToClients({
        type: "new_request",
        data: request,
      });
      
      res.json(request);
    } catch (error) {
      console.error("Error creating request:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create request" });
      }
    }
  });

  app.post("/api/requests/:id/claim", async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = "test-user-123"; // Mock user ID
      
      const request = await storage.claimServiceRequest(id, userId);
      
      // Notify WebSocket clients
      broadcastToClients({
        type: "request_claimed",
        data: request,
      });
      
      res.json(request);
    } catch (error) {
      console.error("Error claiming request:", error);
      res.status(500).json({ message: "Failed to claim request" });
    }
  });

  app.post("/api/requests/:id/status", async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const request = await storage.updateServiceRequestStatus(id, status);
      
      // Notify WebSocket clients
      broadcastToClients({
        type: "request_status_updated",
        data: request,
      });
      
      res.json(request);
    } catch (error) {
      console.error("Error updating request status:", error);
      res.status(500).json({ message: "Failed to update request status" });
    }
  });

  // Chat routes
  app.get("/api/requests/:id/messages", async (req, res) => {
    try {
      const { id } = req.params;
      const messages = await storage.getChatMessages(id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/requests/:id/messages", async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = "test-user-123"; // Mock user ID
      
      const messageData = insertChatMessageSchema.parse({
        requestId: id,
        userId,
        message: req.body.message,
      });
      
      const message = await storage.addChatMessage(messageData);
      
      // Notify WebSocket clients
      broadcastToClients({
        type: "new_message",
        data: { requestId: id, message },
      });
      
      res.json(message);
    } catch (error) {
      console.error("Error adding message:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid message data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to add message" });
      }
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Set<WebSocket>();

  function broadcastToClients(data: any) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  wss.on('connection', (ws) => {
    clients.add(ws);
    
    ws.on('close', () => {
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  return httpServer;
}
