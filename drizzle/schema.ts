import { boolean, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "doctor", "receptionist", "patient"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 160 }),
  contact: varchar("contact", { length: 40 }),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const doctors = mysqlTable("doctors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  specialization: varchar("specialization", { length: 120 }).notNull(),
  departmentId: int("departmentId"),
  qualification: varchar("qualification", { length: 160 }),
  experience: int("experience").default(0).notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  consultationFee: decimal("consultationFee", { precision: 10, scale: 2 }).default("0"),
  availability: mysqlEnum("availability", ["available", "on_leave", "busy"]).default("available").notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const patients = mysqlTable("patients", {
  id: int("id").autoincrement().primaryKey(),
  patientCode: varchar("patientCode", { length: 32 }).notNull().unique(),
  fullName: varchar("fullName", { length: 180 }).notNull(),
  dob: varchar("dob", { length: 12 }),
  age: int("age"),
  gender: mysqlEnum("gender", ["female", "male", "non_binary", "prefer_not_to_say"]),
  bloodGroup: varchar("bloodGroup", { length: 8 }),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  emergencyContact: varchar("emergencyContact", { length: 160 }),
  emergencyPhone: varchar("emergencyPhone", { length: 40 }),
  medicalHistory: text("medicalHistory"),
  allergies: text("allergies"),
  status: mysqlEnum("status", ["active", "admitted", "discharged", "inactive"]).default("active").notNull(),
  registrationDate: timestamp("registrationDate").defaultNow().notNull(),
});

export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  doctorId: int("doctorId"),
  departmentId: int("departmentId"),
  appointmentDate: timestamp("appointmentDate").notNull(),
  reason: varchar("reason", { length: 240 }),
  status: mysqlEnum("status", ["scheduled", "checked_in", "completed", "cancelled"]).default("scheduled").notNull(),
  priority: mysqlEnum("priority", ["routine", "urgent", "emergency"]).default("routine").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const medicalRecords = mysqlTable("medical_records", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  doctorId: int("doctorId"),
  diagnosis: varchar("diagnosis", { length: 240 }),
  symptoms: text("symptoms"),
  notes: text("notes"),
  recordDate: timestamp("recordDate").defaultNow().notNull(),
});

export const prescriptions = mysqlTable("prescriptions", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  doctorId: int("doctorId"),
  medicineName: varchar("medicineName", { length: 160 }).notNull(),
  dosage: varchar("dosage", { length: 80 }),
  frequency: varchar("frequency", { length: 80 }),
  duration: varchar("duration", { length: 80 }),
  status: mysqlEnum("status", ["active", "completed", "cancelled"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const laboratoryTests = mysqlTable("laboratory_tests", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  testName: varchar("testName", { length: 160 }).notNull(),
  status: mysqlEnum("status", ["ordered", "in_progress", "completed"]).default("ordered").notNull(),
  result: text("result"),
  orderedAt: timestamp("orderedAt").defaultNow().notNull(),
  resultDate: timestamp("resultDate"),
});

export const medicines = mysqlTable("medicines", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  category: varchar("category", { length: 100 }),
  stock: int("stock").default(0).notNull(),
  reorderLevel: int("reorderLevel").default(10).notNull(),
  unit: varchar("unit", { length: 30 }).default("packs").notNull(),
  expiryDate: varchar("expiryDate", { length: 12 }),
  status: mysqlEnum("status", ["in_stock", "low_stock", "out_of_stock"]).default("in_stock").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const beds = mysqlTable("beds", {
  id: int("id").autoincrement().primaryKey(),
  bedNumber: varchar("bedNumber", { length: 30 }).notNull().unique(),
  ward: varchar("ward", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["general", "icu", "private", "emergency"]).default("general").notNull(),
  status: mysqlEnum("status", ["available", "occupied", "maintenance"]).default("available").notNull(),
  currentPatientId: int("currentPatientId"),
});

export const admissions = mysqlTable("admissions", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  bedId: int("bedId").notNull(),
  admittedAt: timestamp("admittedAt").defaultNow().notNull(),
  dischargedAt: timestamp("dischargedAt"),
  status: mysqlEnum("status", ["admitted", "discharged"]).default("admitted").notNull(),
  notes: text("notes"),
});

export const bills = mysqlTable("bills", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).default("0").notNull(),
  status: mysqlEnum("status", ["pending", "paid", "overdue"]).default("pending").notNull(),
  description: varchar("description", { length: 240 }),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("info").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  action: varchar("action", { length: 80 }).notNull(),
  entity: varchar("entity", { length: 80 }).notNull(),
  entityId: int("entityId"),
  actor: varchar("actor", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;
export type Doctor = typeof doctors.$inferSelect;
export type Department = typeof departments.$inferSelect;
