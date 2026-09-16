import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  admissions,
  appointments,
  auditLogs,
  beds,
  bills,
  departments,
  doctors,
  laboratoryTests,
  medicalRecords,
  medicines,
  notifications,
  patients,
  prescriptions,
  InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getDashboardData() {
  const db = await getDb();
  if (!db) return null;
  const [patientRows, doctorRows, departmentRows, appointmentRows, bedRows, medicineRows, billRows, recentPatients, upcomingAppointments, criticalNotifications] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(patients),
    db.select({ count: sql<number>`count(*)` }).from(doctors).where(eq(doctors.status, "active")),
    db.select({ count: sql<number>`count(*)` }).from(departments).where(eq(departments.status, "active")),
    db.select({ count: sql<number>`count(*)` }).from(appointments).where(and(eq(appointments.status, "scheduled"), sql`date(${appointments.appointmentDate}) = current_date()`)),
    db.select({ status: beds.status, count: sql<number>`count(*)` }).from(beds).groupBy(beds.status),
    db.select({ status: medicines.status, count: sql<number>`count(*)` }).from(medicines).groupBy(medicines.status),
    db.select({ count: sql<number>`count(*)` }).from(bills).where(eq(bills.status, "pending")),
    db.select().from(patients).orderBy(desc(patients.registrationDate)).limit(5),
    db.select().from(appointments).orderBy(appointments.appointmentDate).limit(5),
    db.select().from(notifications).where(or(eq(notifications.severity, "critical"), eq(notifications.severity, "warning"))).orderBy(desc(notifications.createdAt)).limit(5),
  ]);
  const bedsByStatus = Object.fromEntries(bedRows.map((row) => [row.status, Number(row.count)]));
  const medicineByStatus = Object.fromEntries(medicineRows.map((row) => [row.status, Number(row.count)]));
  return {
    totals: {
      patients: Number(patientRows[0]?.count ?? 0),
      doctors: Number(doctorRows[0]?.count ?? 0),
      departments: Number(departmentRows[0]?.count ?? 0),
      todayAppointments: Number(appointmentRows[0]?.count ?? 0),
      availableBeds: bedsByStatus.available ?? 0,
      occupiedBeds: bedsByStatus.occupied ?? 0,
      pendingBills: Number(billRows[0]?.count ?? 0),
      lowStockMedicines: (medicineByStatus.low_stock ?? 0) + (medicineByStatus.out_of_stock ?? 0),
    },
    bedOccupancy: bedsByStatus,
    medicineStatus: medicineByStatus,
    recentPatients,
    upcomingAppointments,
    criticalNotifications,
  };
}

export async function searchPatients(query?: string) {
  const db = await getDb();
  if (!db) return [];
  if (!query?.trim()) return db.select().from(patients).orderBy(desc(patients.registrationDate));
  const pattern = `%${query.trim()}%`;
  return db.select().from(patients).where(or(like(patients.fullName, pattern), like(patients.patientCode, pattern), like(patients.phone, pattern))).orderBy(desc(patients.registrationDate));
}

export async function getPatient360(patientId: number) {
  const db = await getDb();
  if (!db) return null;
  const patient = (await db.select().from(patients).where(eq(patients.id, patientId)).limit(1))[0];
  if (!patient) return null;
  const [patientAppointments, records, patientPrescriptions, labs, patientAdmissions, patientBills, activity] = await Promise.all([
    db.select().from(appointments).where(eq(appointments.patientId, patientId)).orderBy(desc(appointments.appointmentDate)),
    db.select().from(medicalRecords).where(eq(medicalRecords.patientId, patientId)).orderBy(desc(medicalRecords.recordDate)),
    db.select().from(prescriptions).where(eq(prescriptions.patientId, patientId)).orderBy(desc(prescriptions.createdAt)),
    db.select().from(laboratoryTests).where(eq(laboratoryTests.patientId, patientId)).orderBy(desc(laboratoryTests.orderedAt)),
    db.select().from(admissions).where(eq(admissions.patientId, patientId)).orderBy(desc(admissions.admittedAt)),
    db.select().from(bills).where(eq(bills.patientId, patientId)).orderBy(desc(bills.issuedAt)),
    db.select().from(auditLogs).where(and(eq(auditLogs.entity, "patient"), eq(auditLogs.entityId, patientId))).orderBy(desc(auditLogs.createdAt)),
  ]);
  return { patient, appointments: patientAppointments, records, prescriptions: patientPrescriptions, labs, admissions: patientAdmissions, bills: patientBills, activity };
}

export async function logAudit(action: string, entity: string, entityId: number | undefined, actor: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({ action, entity, entityId, actor });
}

export const tables = { patients, doctors, departments, appointments, medicalRecords, prescriptions, laboratoryTests, medicines, beds, admissions, bills, notifications, auditLogs };
