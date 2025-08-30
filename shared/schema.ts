import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  pgEnum,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const serviceTypeEnum = pgEnum("service_type", [
  "fuel",
  "baggage_loading",
  "baggage_unloading", 
  "catering",
  "maintenance",
  "cleaning_cabin",
  "cleaning_exterior",
  "pushback",
  "ground_power",
  "security_check",
  "cargo_loading",
  "cargo_unloading",
  "passenger_boarding",
  "passenger_deboarding",
  "de_icing",
  "anti_icing",
  "lavatory_service",
  "water_service",
  "stairs_positioning",
  "stairs_removal",
  "jetbridge_connection",
  "jetbridge_disconnection",
  "marshalling",
  "customs_inspection",
  "immigration_check",
  "ground_transport",
  "wheelchair_assistance",
  "special_cargo",
  "dangerous_goods",
  "aircraft_towing",
  "engine_start",
  "pre_flight_inspection",
  "post_flight_inspection",
  "tire_pressure_check",
  "oil_service",
  "hydraulic_service",
  "nitrogen_service",
  "oxygen_service",
  "air_conditioning",
  "cabin_service",
  "galley_service",
  "emergency_equipment_check",
  "cargo_documentation",
  "weight_balance",
  "flight_planning_support",
  "meteorological_briefing",
  "crew_transport",
  "hotel_shuttle",
  "aircraft_parking",
  "hangar_service"
]);

export const requestStatusEnum = pgEnum("request_status", [
  "open",
  "claimed", 
  "in_progress",
  "completed",
  "cancelled"
]);

export const airports = pgTable("airports", {
  icao: varchar("icao", { length: 4 }).primaryKey(),
  name: text("name").notNull(),
});

export const serviceRequests = pgTable("service_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  pilotId: varchar("pilot_id").notNull().references(() => users.id),
  airportIcao: varchar("airport_icao", { length: 4 }).notNull().references(() => airports.icao),
  serviceType: serviceTypeEnum("service_type").notNull(),
  gate: varchar("gate").notNull(),
  flightNumber: varchar("flight_number").notNull(),
  aircraft: varchar("aircraft"),
  description: text("description").notNull(),
  status: requestStatusEnum("status").notNull().default("open"),
  groundCrewId: varchar("ground_crew_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: uuid("request_id").notNull().references(() => serviceRequests.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  pilotRequests: many(serviceRequests, { relationName: "pilot_requests" }),
  crewRequests: many(serviceRequests, { relationName: "crew_requests" }),
  chatMessages: many(chatMessages),
}));

export const serviceRequestsRelations = relations(serviceRequests, ({ one, many }) => ({
  pilot: one(users, {
    fields: [serviceRequests.pilotId],
    references: [users.id],
    relationName: "pilot_requests",
  }),
  groundCrew: one(users, {
    fields: [serviceRequests.groundCrewId],
    references: [users.id],
    relationName: "crew_requests",
  }),
  airport: one(airports, {
    fields: [serviceRequests.airportIcao],
    references: [airports.icao],
  }),
  chatMessages: many(chatMessages),
}));

export const airportsRelations = relations(airports, ({ many }) => ({
  serviceRequests: many(serviceRequests),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  request: one(serviceRequests, {
    fields: [chatMessages.requestId],
    references: [serviceRequests.id],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

// Schemas
export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  groundCrewId: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertAirportSchema = createInsertSchema(airports);

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Airport = typeof airports.$inferSelect;
export type InsertAirport = z.infer<typeof insertAirportSchema>;
