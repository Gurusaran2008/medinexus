import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { admissions, appointments, beds, bills, departments, doctors, laboratoryTests, medicalRecords, medicines, patients, prescriptions } from "../drizzle/schema";
import { getDashboardData, getDb, getPatient360, logAudit, searchPatients, upsertUser } from "./db";

const patientInput = z.object({
  patientCode: z.string().min(2), fullName: z.string().min(2), dob: z.string().optional(), age: z.number().int().min(0).max(130).optional(),
  gender: z.enum(["female", "male", "non_binary", "prefer_not_to_say"]).optional(), bloodGroup: z.string().optional(), phone: z.string().optional(), email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(), emergencyContact: z.string().optional(), emergencyPhone: z.string().optional(), medicalHistory: z.string().optional(), allergies: z.string().optional(),
  status: z.enum(["active", "admitted", "discharged", "inactive"]).default("active"),
});
const doctorInput = z.object({ name: z.string().min(2), specialization: z.string().min(2), departmentId: z.number().int().optional(), qualification: z.string().optional(), experience: z.number().int().min(0).default(0), phone: z.string().optional(), email: z.string().email().optional().or(z.literal("")), consultationFee: z.string().optional(), availability: z.enum(["available", "on_leave", "busy"]).default("available"), status: z.enum(["active", "inactive"]).default("active") });
const departmentInput = z.object({ name: z.string().min(2), description: z.string().optional(), location: z.string().optional(), contact: z.string().optional(), status: z.enum(["active", "inactive"]).default("active") });
const actor = (ctx: { user?: { name?: string | null; email?: string | null } | null }) => ctx.user?.name || ctx.user?.email || "Demo operator";
const roleCapabilities = {
  admin: ["dashboard", "patients.read", "patients.write", "clinical.write", "appointments.read", "appointments.write", "inventory.read", "inventory.write", "beds.read", "beds.write", "billing.read", "billing.write", "settings"],
  doctor: ["dashboard", "patients.read", "clinical.write", "appointments.read", "appointments.write", "inventory.read", "beds.read", "billing.read"],
  receptionist: ["dashboard", "patients.read", "patients.write", "appointments.read", "appointments.write", "beds.read", "beds.write", "billing.read", "billing.write"],
  patient: ["patients.self", "appointments.self", "clinical.self", "billing.self"],
  user: ["dashboard"],
} as const;
type Role = keyof typeof roleCapabilities;
const hasCapability = (ctx: { user?: { role?: string } | null }, capability: string) => {
  if (!ctx.user) return false;
  const candidate = ctx.user.role ?? "user";
  const role = (candidate in roleCapabilities ? candidate : "user") as Role;
  return roleCapabilities[role].includes(capability as never);
};
const requireCapability = (ctx: { user?: { role?: string } | null }, capability: string) => {
  if (!hasCapability(ctx, capability)) throw new Error(`Your ${ctx.user?.role || "user"} role cannot perform ${capability}.`);
};

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    demoLogin: publicProcedure
      .input(z.object({ role: z.enum(["admin", "doctor", "receptionist", "patient"]) }))
      .mutation(async ({ input, ctx }) => {
        if (process.env.NODE_ENV === "production" && process.env.DEMO_LOGIN_ENABLED !== "true") {
  throw new Error("Demo login is disabled in production.");
}

        const profiles = {
          admin: { openId: "demo-admin", name: "MEDINEXUS Admin Demo", email: "admin.demo@medinexus.local" },
          doctor: { openId: "demo-doctor", name: "Dr. Demo Clinician", email: "doctor.demo@medinexus.local" },
          receptionist: { openId: "demo-receptionist", name: "Demo Receptionist", email: "reception.demo@medinexus.local" },
          patient: { openId: "demo-patient", name: "Demo Patient", email: "patient.demo@medinexus.local" },
        } as const;
        const profile = profiles[input.role];
        await upsertUser({
          openId: profile.openId,
          name: profile.name,
          email: profile.email,
          loginMethod: "development-demo",
          role: input.role,
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.createSessionToken(profile.openId, {
          name: profile.name,
          expiresInMs: ONE_YEAR_MS,
        });
        // Use the same helper that `auth.logout` uses to clear the cookie, so
        // the attributes set here (sameSite/secure/path) always match what
        // logout tries to clear. Previously this duplicated the logic with
        // its own isLocal check, which drifted from getSessionCookieOptions
        // and made logout silently fail to clear the cookie on localhost.
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });
        return { success: true, user: profile, role: input.role };
      }),
    permissions: publicProcedure.query(({ ctx }) => {
      const role = ((ctx.user?.role || "user") in roleCapabilities ? ctx.user?.role : "user") as Role;
      return { role: ctx.user ? role : "demo", capabilities: ctx.user ? roleCapabilities[role] : ["demo.read", "demo.write"] };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    requireCapability(ctx, "dashboard");
    return getDashboardData();
  }),
  patients: router({
    list: protectedProcedure.input(z.object({ search: z.string().optional() }).optional()).query(({ input, ctx }) => { requireCapability(ctx, "patients.read"); return searchPatients(input?.search); }),
    get360: protectedProcedure.input(z.object({ id: z.number().int() })).query(({ input, ctx }) => { requireCapability(ctx, "patients.read"); return getPatient360(input.id); }),
    create: protectedProcedure.input(patientInput).mutation(async ({ input, ctx }) => {
      requireCapability(ctx, "patients.write");
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await db.insert(patients).values({ ...input, email: input.email || null });
      const created = (await db.select().from(patients).where(eq(patients.patientCode, input.patientCode)).limit(1))[0];
      await logAudit("CREATE", "patient", created?.id, actor(ctx));
      return created;
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int(), data: patientInput.partial() })).mutation(async ({ input, ctx }) => {
      requireCapability(ctx, "patients.write");
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await db.update(patients).set({ ...input.data, email: input.data.email === "" ? null : input.data.email }).where(eq(patients.id, input.id));
      const updated = (await db.select().from(patients).where(eq(patients.id, input.id)).limit(1))[0];
      await logAudit("UPDATE", "patient", input.id, actor(ctx));
      return updated;
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input, ctx }) => {
      requireCapability(ctx, "patients.write");
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const linked = await db.select().from(admissions).where(eq(admissions.patientId, input.id)); const activeAdmission = linked.some(item => item.status === "admitted"); if (activeAdmission) throw new Error("Cannot deactivate a patient with an active admission. Discharge the patient first."); await db.update(patients).set({ status: "inactive" }).where(eq(patients.id, input.id)); await logAudit("DEACTIVATE", "patient", input.id, actor(ctx)); return { success: true, softDeleted: true };
    }),
  }),
  doctors: router({
    list: protectedProcedure.query(async ({ ctx }) => { requireCapability(ctx, "patients.read"); const db = await getDb(); return db ? db.select().from(doctors).orderBy(doctors.name) : []; }),
    create: protectedProcedure.input(doctorInput).mutation(async ({ input, ctx }) => { requireCapability(ctx, "settings"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.insert(doctors).values(input); const created = (await db.select().from(doctors).orderBy(desc(doctors.id)).limit(1))[0]; await logAudit("CREATE", "doctor", created?.id, actor(ctx)); return created; }),
    update: protectedProcedure.input(z.object({ id: z.number().int(), data: doctorInput.partial() })).mutation(async ({ input, ctx }) => { requireCapability(ctx, "settings"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.update(doctors).set(input.data).where(eq(doctors.id, input.id)); await logAudit("UPDATE", "doctor", input.id, actor(ctx)); return (await db.select().from(doctors).where(eq(doctors.id, input.id)).limit(1))[0]; }),
    remove: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input, ctx }) => { requireCapability(ctx, "settings"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); const linked = await db.select().from(appointments).where(eq(appointments.doctorId, input.id)); if (linked.length) throw new Error("Cannot delete a doctor with appointment history. Mark the doctor inactive instead."); await db.delete(doctors).where(eq(doctors.id, input.id)); await logAudit("DELETE", "doctor", input.id, actor(ctx)); return { success: true }; }),
  }),
  departments: router({
    list: protectedProcedure.query(async ({ ctx }) => { requireCapability(ctx, "patients.read"); const db = await getDb(); return db ? db.select().from(departments).orderBy(departments.name) : []; }),
    create: protectedProcedure.input(departmentInput).mutation(async ({ input, ctx }) => { requireCapability(ctx, "settings"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.insert(departments).values(input); const created = (await db.select().from(departments).orderBy(desc(departments.id)).limit(1))[0]; await logAudit("CREATE", "department", created?.id, actor(ctx)); return created; }),
    update: protectedProcedure.input(z.object({ id: z.number().int(), data: departmentInput.partial() })).mutation(async ({ input, ctx }) => { requireCapability(ctx, "settings"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.update(departments).set(input.data).where(eq(departments.id, input.id)); await logAudit("UPDATE", "department", input.id, actor(ctx)); return (await db.select().from(departments).where(eq(departments.id, input.id)).limit(1))[0]; }),
    remove: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input, ctx }) => { requireCapability(ctx, "settings"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); const linked = await db.select().from(appointments).where(eq(appointments.departmentId, input.id)); if (linked.length) throw new Error("Cannot delete a department with appointment history. Mark the department inactive instead."); await db.delete(departments).where(eq(departments.id, input.id)); await logAudit("DELETE", "department", input.id, actor(ctx)); return { success: true }; }),
  }),
  appointments: router({
    list: protectedProcedure.query(async ({ ctx }) => { requireCapability(ctx, "appointments.read"); const db = await getDb(); return db ? db.select().from(appointments).orderBy(desc(appointments.appointmentDate)) : []; }),
    create: protectedProcedure.input(z.object({ patientId: z.number().int(), doctorId: z.number().int().optional(), departmentId: z.number().int().optional(), appointmentDate: z.coerce.date(), reason: z.string().optional(), priority: z.enum(["routine", "urgent", "emergency"]).default("routine"), notes: z.string().optional() })).mutation(async ({ input, ctx }) => {
      requireCapability(ctx, "appointments.write");
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const patient = (await db.select().from(patients).where(eq(patients.id, input.patientId)).limit(1))[0];
      if (!patient || patient.status === "inactive") throw new Error("Patient is not available for scheduling.");
      if (input.doctorId) {
        const existing = await db.select().from(appointments).where(and(eq(appointments.doctorId, input.doctorId), eq(appointments.status, "scheduled")));
        const conflict = existing.some(item => Math.abs(new Date(item.appointmentDate).getTime() - input.appointmentDate.getTime()) < 30 * 60 * 1000);
        if (conflict) throw new Error("Appointment conflict: the selected doctor already has a scheduled slot within 30 minutes.");
      }
      await db.insert(appointments).values(input);
      const created = (await db.select().from(appointments).orderBy(desc(appointments.id)).limit(1))[0];
      await logAudit("CREATE", "appointment", created?.id, actor(ctx));
      return created;
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int(), data: z.object({ patientId: z.number().int().optional(), doctorId: z.number().int().nullable().optional(), departmentId: z.number().int().nullable().optional(), appointmentDate: z.coerce.date().optional(), reason: z.string().optional(), priority: z.enum(["routine", "urgent", "emergency"]).optional(), notes: z.string().optional(), status: z.enum(["scheduled", "checked_in", "completed", "cancelled"]).optional() }) })).mutation(async ({ input, ctx }) => {
      requireCapability(ctx, "appointments.write");
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const current = (await db.select().from(appointments).where(eq(appointments.id, input.id)).limit(1))[0];
      if (!current) throw new Error("Appointment not found");
      const nextDate = input.data.appointmentDate ?? current.appointmentDate;
      const nextDoctor = input.data.doctorId === undefined ? current.doctorId : input.data.doctorId;
      if (nextDoctor && (input.data.appointmentDate || input.data.doctorId !== undefined) && (input.data.status ?? current.status) === "scheduled") {
        const existing = await db.select().from(appointments).where(and(eq(appointments.doctorId, nextDoctor), eq(appointments.status, "scheduled")));
        const conflict = existing.some(item => item.id !== input.id && Math.abs(new Date(item.appointmentDate).getTime() - new Date(nextDate).getTime()) < 30 * 60 * 1000);
        if (conflict) throw new Error("Appointment conflict: the selected doctor already has a scheduled slot within 30 minutes.");
      }
      await db.update(appointments).set(input.data).where(eq(appointments.id, input.id));
      await logAudit("UPDATE", "appointment", input.id, actor(ctx));
      return (await db.select().from(appointments).where(eq(appointments.id, input.id)).limit(1))[0];
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input, ctx }) => { requireCapability(ctx, "appointments.write"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); const current = (await db.select().from(appointments).where(eq(appointments.id, input.id)).limit(1))[0]; if (!current) throw new Error("Appointment not found"); await db.update(appointments).set({ status: "cancelled" }).where(eq(appointments.id, input.id)); await logAudit("CANCEL", "appointment", input.id, actor(ctx)); return { success: true }; }),
  }),
  clinical: router({
    records: protectedProcedure.input(z.object({ patientId: z.number().int(), doctorId: z.number().int().optional(), diagnosis: z.string().optional(), symptoms: z.string().optional(), notes: z.string().optional() })).mutation(async ({ input, ctx }) => { requireCapability(ctx, "clinical.write"); requireCapability(ctx, "clinical.write"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.insert(medicalRecords).values(input); const created = (await db.select().from(medicalRecords).orderBy(desc(medicalRecords.id)).limit(1))[0]; await logAudit("CREATE", "medical_record", created?.id, actor(ctx)); return created; }),
    prescriptions: protectedProcedure.input(z.object({ patientId: z.number().int(), doctorId: z.number().int().optional(), medicineName: z.string().min(2), dosage: z.string().optional(), frequency: z.string().optional(), duration: z.string().optional() })).mutation(async ({ input, ctx }) => { requireCapability(ctx, "clinical.write"); requireCapability(ctx, "clinical.write"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.insert(prescriptions).values(input); const created = (await db.select().from(prescriptions).orderBy(desc(prescriptions.id)).limit(1))[0]; await logAudit("CREATE", "prescription", created?.id, actor(ctx)); return created; }),
    labOrder: protectedProcedure.input(z.object({ patientId: z.number().int(), testName: z.string().min(2) })).mutation(async ({ input, ctx }) => { requireCapability(ctx, "clinical.write"); requireCapability(ctx, "clinical.write"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.insert(laboratoryTests).values(input); const created = (await db.select().from(laboratoryTests).orderBy(desc(laboratoryTests.id)).limit(1))[0]; await logAudit("CREATE", "laboratory_test", created?.id, actor(ctx)); return created; }),
    labResult: protectedProcedure.input(z.object({ id: z.number().int(), result: z.string().min(1), status: z.enum(["ordered", "in_progress", "completed"]).default("completed") })).mutation(async ({ input, ctx }) => { requireCapability(ctx, "clinical.write"); requireCapability(ctx, "clinical.write"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.update(laboratoryTests).set({ result: input.result, status: input.status, resultDate: new Date() }).where(eq(laboratoryTests.id, input.id)); await logAudit("UPDATE", "laboratory_test", input.id, actor(ctx)); return { success: true }; }),
  }),
  inventory: router({
    list: protectedProcedure.query(async ({ ctx }) => { requireCapability(ctx, "inventory.read"); const db = await getDb(); return db ? db.select().from(medicines).orderBy(medicines.name) : []; }),
    add: protectedProcedure.input(z.object({ name: z.string().min(2), category: z.string().optional(), stock: z.number().int().min(0), reorderLevel: z.number().int().min(0).default(10), unit: z.string().default("packs"), expiryDate: z.string().optional() })).mutation(async ({ input, ctx }) => { requireCapability(ctx, "inventory.write"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); const status = input.stock === 0 ? "out_of_stock" : input.stock <= input.reorderLevel ? "low_stock" : "in_stock"; await db.insert(medicines).values({ ...input, status }); const created = (await db.select().from(medicines).orderBy(desc(medicines.id)).limit(1))[0]; await logAudit("CREATE", "medicine", created?.id, actor(ctx)); return created; }),
    adjust: protectedProcedure.input(z.object({ id: z.number().int(), stock: z.number().int().min(0) })).mutation(async ({ input, ctx }) => { requireCapability(ctx, "inventory.write"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); const current = (await db.select().from(medicines).where(eq(medicines.id, input.id)).limit(1))[0]; if (!current) throw new Error("Medicine not found"); const status = input.stock === 0 ? "out_of_stock" : input.stock <= current.reorderLevel ? "low_stock" : "in_stock"; await db.update(medicines).set({ stock: input.stock, status }).where(eq(medicines.id, input.id)); await logAudit("UPDATE", "medicine", input.id, actor(ctx)); return { success: true }; }),
    update: protectedProcedure.input(z.object({ id: z.number().int(), data: z.object({ name: z.string().min(2).optional(), category: z.string().optional(), stock: z.number().int().min(0).optional(), reorderLevel: z.number().int().min(0).optional(), unit: z.string().optional(), expiryDate: z.string().optional() }) })).mutation(async ({ input, ctx }) => { requireCapability(ctx, "inventory.write"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); const current = (await db.select().from(medicines).where(eq(medicines.id, input.id)).limit(1))[0]; if (!current) throw new Error("Medicine not found"); const stock = input.data.stock ?? current.stock; const reorderLevel = input.data.reorderLevel ?? current.reorderLevel; const status = stock === 0 ? "out_of_stock" : stock <= reorderLevel ? "low_stock" : "in_stock"; await db.update(medicines).set({ ...input.data, status }).where(eq(medicines.id, input.id)); await logAudit("UPDATE", "medicine", input.id, actor(ctx)); return { success: true }; }),
    remove: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input, ctx }) => { requireCapability(ctx, "inventory.write"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.delete(medicines).where(eq(medicines.id, input.id)); await logAudit("DELETE", "medicine", input.id, actor(ctx)); return { success: true }; }),
  }),
  beds: router({
    list: protectedProcedure.query(async ({ ctx }) => { requireCapability(ctx, "beds.read"); const db = await getDb(); return db ? db.select().from(beds).orderBy(beds.bedNumber) : []; }),
    update: protectedProcedure.input(z.object({ id: z.number().int(), data: z.object({ bedNumber: z.string().min(1).optional(), ward: z.string().min(1).optional(), type: z.enum(["general", "icu", "private", "emergency"]).optional(), status: z.enum(["available", "occupied", "maintenance"]).optional() }) })).mutation(async ({ input, ctx }) => { requireCapability(ctx, "beds.write"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.update(beds).set(input.data).where(eq(beds.id, input.id)); await logAudit("UPDATE", "bed", input.id, actor(ctx)); return { success: true }; }),
    admit: protectedProcedure.input(z.object({ patientId: z.number().int(), bedId: z.number().int(), notes: z.string().optional() })).mutation(async ({ input, ctx }) => { requireCapability(ctx, "beds.write"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); const bed = (await db.select().from(beds).where(eq(beds.id, input.bedId)).limit(1))[0]; if (!bed || bed.status !== "available") throw new Error("Selected bed is not available."); const patient = (await db.select().from(patients).where(eq(patients.id, input.patientId)).limit(1))[0]; if (!patient || patient.status === "inactive") throw new Error("Patient is not eligible for admission."); await db.transaction(async tx => { await tx.update(beds).set({ status: "occupied", currentPatientId: input.patientId }).where(eq(beds.id, input.bedId)); await tx.update(patients).set({ status: "admitted" }).where(eq(patients.id, input.patientId)); await tx.insert((await import("../drizzle/schema")).admissions).values(input); }); await logAudit("ADMIT", "patient", input.patientId, actor(ctx)); return { success: true }; }),
    discharge: protectedProcedure.input(z.object({ admissionId: z.number().int(), patientId: z.number().int(), bedId: z.number().int() })).mutation(async ({ input, ctx }) => { requireCapability(ctx, "beds.write"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); const admissionsTable = (await import("../drizzle/schema")).admissions; const admission = (await db.select().from(admissionsTable).where(eq(admissionsTable.id, input.admissionId)).limit(1))[0]; if (!admission || admission.status !== "admitted" || admission.patientId !== input.patientId || admission.bedId !== input.bedId) throw new Error("Active admission not found for this patient and bed."); await db.transaction(async tx => { await tx.update(admissionsTable).set({ status: "discharged", dischargedAt: new Date() }).where(eq(admissionsTable.id, input.admissionId)); await tx.update(beds).set({ status: "available", currentPatientId: null }).where(eq(beds.id, input.bedId)); await tx.update(patients).set({ status: "discharged" }).where(eq(patients.id, input.patientId)); }); await logAudit("DISCHARGE", "patient", input.patientId, actor(ctx)); return { success: true }; }),
  }),
  billing: router({
    list: protectedProcedure.query(async ({ ctx }) => { requireCapability(ctx, "billing.read"); const db = await getDb(); return db ? db.select().from(bills).orderBy(desc(bills.issuedAt)) : []; }),
    create: protectedProcedure.input(z.object({ patientId: z.number().int(), amount: z.string().regex(/^\d+(\.\d{1,2})?$/), description: z.string().optional(), status: z.enum(["pending", "paid", "overdue"]).default("pending") })).mutation(async ({ input, ctx }) => { requireCapability(ctx, "billing.write"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.insert(bills).values(input); const created = (await db.select().from(bills).orderBy(desc(bills.id)).limit(1))[0]; await logAudit("CREATE", "bill", created?.id, actor(ctx)); return created; }),
    update: protectedProcedure.input(z.object({ id: z.number().int(), data: z.object({ amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(), description: z.string().optional(), status: z.enum(["pending", "paid", "overdue"]).optional() }) })).mutation(async ({ input, ctx }) => { requireCapability(ctx, "billing.write"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.update(bills).set(input.data).where(eq(bills.id, input.id)); await logAudit("UPDATE", "bill", input.id, actor(ctx)); return { success: true }; }),
    remove: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input, ctx }) => { requireCapability(ctx, "billing.write"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.delete(bills).where(eq(bills.id, input.id)); await logAudit("DELETE", "bill", input.id, actor(ctx)); return { success: true }; }),
  }),
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => { requireCapability(ctx, "dashboard"); const db = await getDb(); return db ? db.select().from((await import("../drizzle/schema")).notifications).orderBy(desc((await import("../drizzle/schema")).notifications.createdAt)) : []; }),
    markRead: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input, ctx }) => { requireCapability(ctx, "dashboard"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.update((await import("../drizzle/schema")).notifications).set({ isRead: true }).where(eq((await import("../drizzle/schema")).notifications.id, input.id)); return { success: true }; }),
  }),
  recommendations: router({
    suggestDepartment: protectedProcedure.input(z.object({ symptoms: z.string().min(2), urgency: z.enum(["routine", "urgent", "emergency"]).default("routine") })).query(({ input, ctx }) => {
      requireCapability(ctx, "clinical.write");
      const text = input.symptoms.toLowerCase();
      const rules = text.includes("chest") || text.includes("heart") ? ["Cardiology", "Emergency"] : text.includes("skin") || text.includes("rash") ? ["Dermatology"] : text.includes("bone") || text.includes("fracture") ? ["Orthopedics", "Emergency"] : ["General Medicine"];
      return { recommendations: rules, rationale: `Matched symptom keywords with ${input.urgency} urgency.`, disclaimer: "For educational/software demonstration purposes only. Not medical advice." };
    }),
    priority: protectedProcedure.input(z.object({ symptoms: z.string(), age: z.number().int().optional(), notes: z.string().optional() })).query(({ input, ctx }) => { requireCapability(ctx, "clinical.write"); return ({ priority: /severe|unconscious|breathing|chest pain/i.test(`${input.symptoms} ${input.notes || ""}`) ? "emergency" : /pain|fever|bleeding/i.test(`${input.symptoms} ${input.notes || ""}`) ? "urgent" : "routine", rationale: "Transparent keyword-based triage demonstration; a clinician must make the final decision.", disclaimer: "AI-Assisted Recommendation — for educational/software demonstration purposes only. Not medical advice." }); }),
  }),
});

export type AppRouter = typeof appRouter;
