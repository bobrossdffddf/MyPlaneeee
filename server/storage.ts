import {
  users,
  airports,
  serviceRequests,
  chatMessages,
  type User,
  type UpsertUser,
  type ServiceRequest,
  type InsertServiceRequest,
  type ChatMessage,
  type InsertChatMessage,
  type Airport,
  type InsertAirport,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Airport operations
  getAirports(): Promise<Airport[]>;
  upsertAirport(airport: InsertAirport): Promise<Airport>;
  
  // Service request operations
  getServiceRequestsByAirport(airportIcao: string): Promise<ServiceRequest[]>;
  getServiceRequestsByPilot(pilotId: string): Promise<ServiceRequest[]>;
  getServiceRequestsByGroundCrew(groundCrewId: string): Promise<ServiceRequest[]>;
  getOpenRequests(airportIcao?: string): Promise<ServiceRequest[]>;
  createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest>;
  claimServiceRequest(requestId: string, groundCrewId: string): Promise<ServiceRequest>;
  updateServiceRequestStatus(requestId: string, status: string): Promise<ServiceRequest>;
  getServiceRequest(id: string): Promise<ServiceRequest | undefined>;
  
  // Chat operations
  getChatMessages(requestId: string): Promise<ChatMessage[]>;
  addChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Airport operations
  async getAirports(): Promise<Airport[]> {
    return await db.select().from(airports).orderBy(asc(airports.icao));
  }

  async upsertAirport(airportData: InsertAirport): Promise<Airport> {
    const [airport] = await db
      .insert(airports)
      .values(airportData)
      .onConflictDoUpdate({
        target: airports.icao,
        set: {
          name: airportData.name,
        },
      })
      .returning();
    return airport;
  }

  // Service request operations
  async getServiceRequestsByAirport(airportIcao: string): Promise<ServiceRequest[]> {
    return await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.airportIcao, airportIcao))
      .orderBy(desc(serviceRequests.createdAt));
  }

  async getServiceRequestsByPilot(pilotId: string): Promise<ServiceRequest[]> {
    return await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.pilotId, pilotId))
      .orderBy(desc(serviceRequests.createdAt));
  }

  async getServiceRequestsByGroundCrew(groundCrewId: string): Promise<ServiceRequest[]> {
    return await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.groundCrewId, groundCrewId))
      .orderBy(desc(serviceRequests.createdAt));
  }

  async getOpenRequests(airportIcao?: string): Promise<ServiceRequest[]> {
    const conditions = [eq(serviceRequests.status, "open")];
    if (airportIcao) {
      conditions.push(eq(serviceRequests.airportIcao, airportIcao));
    }
    
    return await db
      .select()
      .from(serviceRequests)
      .where(and(...conditions))
      .orderBy(desc(serviceRequests.createdAt));
  }

  async createServiceRequest(requestData: InsertServiceRequest): Promise<ServiceRequest> {
    const [request] = await db
      .insert(serviceRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async claimServiceRequest(requestId: string, groundCrewId: string): Promise<ServiceRequest> {
    const [request] = await db
      .update(serviceRequests)
      .set({
        groundCrewId,
        status: "claimed",
        updatedAt: new Date(),
      })
      .where(and(
        eq(serviceRequests.id, requestId),
        eq(serviceRequests.status, "open")
      ))
      .returning();
    return request;
  }

  async updateServiceRequestStatus(requestId: string, status: string): Promise<ServiceRequest> {
    const [request] = await db
      .update(serviceRequests)
      .set({
        status: status as any,
        updatedAt: new Date(),
      })
      .where(eq(serviceRequests.id, requestId))
      .returning();
    return request;
  }

  async getServiceRequest(id: string): Promise<ServiceRequest | undefined> {
    const [request] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, id));
    return request;
  }

  // Chat operations
  async getChatMessages(requestId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.requestId, requestId))
      .orderBy(asc(chatMessages.createdAt));
  }

  async addChatMessage(messageData: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(messageData)
      .returning();
    return message;
  }
}

export const storage = new DatabaseStorage();
