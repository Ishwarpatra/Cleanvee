import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const buildings = mysqlTable("buildings", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  address: text("address").notNull(),
  shiftSchedule: varchar("shiftSchedule", { length: 80 }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ nameUnique: uniqueIndex("buildings_name_unique").on(table.name) }));

export const checkpoints = mysqlTable("checkpoints", {
  id: int("id").autoincrement().primaryKey(),
  buildingId: int("buildingId").notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  location: varchar("location", { length: 220 }).notNull(),
  nfcTag: varchar("nfcTag", { length: 160 }).notNull(),
  floor: varchar("floor", { length: 80 }).default("Level 1").notNull(),
  xPosition: int("xPosition").default(50).notNull(),
  yPosition: int("yPosition").default(50).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ nfcUnique: uniqueIndex("checkpoints_nfc_unique").on(table.nfcTag) }));

export const operationalSettings = mysqlTable("operationalSettings", {
  id: int("id").primaryKey(),
  evidenceThreshold: int("evidenceThreshold").default(80).notNull(),
  defaultShiftHours: varchar("defaultShiftHours", { length: 80 }).default("06:00 — 14:00").notNull(),
  notificationRules: json("notificationRules").notNull(),
  retentionDays: int("retentionDays").default(365).notNull(),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const cleaningLogs = mysqlTable("cleaningLogs", {
  id: int("id").autoincrement().primaryKey(),
  buildingId: int("buildingId").notNull(),
  checkpointId: int("checkpointId").notNull(),
  assignedUserId: int("assignedUserId"),
  status: mysqlEnum("status", ["waiting", "flagged", "approved", "verified"]).default("waiting").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const proofRecords = mysqlTable("proofRecords", {
  id: int("id").autoincrement().primaryKey(),
  cleaningLogId: int("cleaningLogId").notNull(),
  presence: mysqlEnum("presence", ["nfc", "nfc_gps", "missing"]).default("missing").notNull(),
  qualityScore: int("qualityScore"),
  evidenceKey: varchar("evidenceKey", { length: 512 }),
  evidenceUrl: varchar("evidenceUrl", { length: 1024 }),
  decision: mysqlEnum("decision", ["pending", "approved", "sent_back", "escalated"]).default("pending").notNull(),
  reviewerId: int("reviewerId"),
  capturedAt: timestamp("capturedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

export const shiftHistory = mysqlTable("shiftHistory", {
  id: int("id").autoincrement().primaryKey(),
  buildingId: int("buildingId").notNull(),
  shiftLabel: varchar("shiftLabel", { length: 80 }).notNull(),
  startedAt: timestamp("startedAt").notNull(),
  endedAt: timestamp("endedAt"),
  status: mysqlEnum("status", ["active", "completed", "cancelled"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const teamAssignments = mysqlTable("teamAssignments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  buildingId: int("buildingId").notNull(),
  assignmentRole: mysqlEnum("assignmentRole", ["operator", "supervisor", "manager"]).default("operator").notNull(),
  active: boolean("active").default(true).notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  deactivatedAt: timestamp("deactivatedAt"),
}, table => ({ assignmentUnique: uniqueIndex("team_assignment_unique").on(table.userId, table.buildingId) }));

export const teamInvites = mysqlTable("teamInvites", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  buildingId: int("buildingId").notNull(),
  assignmentRole: mysqlEnum("assignmentRole", ["operator", "supervisor", "manager"]).default("operator").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "cancelled"]).default("pending").notNull(),
  invitedBy: int("invitedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
});

export const adminActivity = mysqlTable("adminActivity", {
  id: int("id").autoincrement().primaryKey(),
  adminUserId: int("adminUserId").notNull(),
  action: varchar("action", { length: 160 }).notNull(),
  targetType: varchar("targetType", { length: 80 }).notNull(),
  targetId: varchar("targetId", { length: 80 }).notNull(),
  details: json("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
