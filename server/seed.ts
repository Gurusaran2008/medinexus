import "dotenv/config";
import { eq } from "drizzle-orm";
import { admissions, appointments, beds, bills, departments, doctors, laboratoryTests, medicalRecords, medicines, notifications, patients, prescriptions } from "../drizzle/schema";
import { getDb } from "./db";

async function seed() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const existing = await db.select().from(patients).limit(1);
  if (existing.length) {
    console.log("MEDINEXUS demo data already exists; nothing to seed.");
    return;
  }
  await db.insert(departments).values([
    { name: "General Medicine", description: "First-contact care and ongoing conditions", location: "North Wing · Level 1", contact: "+91 20 4000 1101" },
    { name: "Cardiology", description: "Heart and circulatory care coordination", location: "North Wing · Level 2", contact: "+91 20 4000 1102" },
    { name: "Emergency", description: "24/7 urgent response and triage", location: "Main Entrance", contact: "+91 20 4000 1199" },
    { name: "Laboratory", description: "Specimen collection and diagnostic reporting", location: "East Wing · Level 1", contact: "+91 20 4000 1106" },
  ]);
  await db.insert(doctors).values([
    { name: "Dr. Amara Shah", specialization: "Internal Medicine", qualification: "MBBS, MD", experience: 12, phone: "+91 98765 10001", email: "amara.shah@medinexus.local", consultationFee: "850", availability: "available" },
    { name: "Dr. Rohan Mehta", specialization: "Cardiology", qualification: "MBBS, DM", experience: 16, phone: "+91 98765 10002", email: "rohan.mehta@medinexus.local", consultationFee: "1200", availability: "busy" },
    { name: "Dr. Kavya Iyer", specialization: "Dermatology", qualification: "MBBS, DNB", experience: 9, phone: "+91 98765 10003", email: "kavya.iyer@medinexus.local", consultationFee: "900", availability: "available" },
  ]);
  await db.insert(patients).values([
    { patientCode: "PT-1048", fullName: "Meera Kulkarni", dob: "1986-08-14", age: 40, gender: "female", bloodGroup: "O+", phone: "+91 98220 11223", email: "meera.k@example.local", address: "Kothrud, Pune", emergencyContact: "Arun Kulkarni", emergencyPhone: "+91 98220 11224", medicalHistory: "Hypertension monitoring", allergies: "Penicillin", status: "active" },
    { patientCode: "PT-1047", fullName: "Arjun Rao", dob: "1979-02-19", age: 47, gender: "male", bloodGroup: "B+", phone: "+91 98220 11225", email: "arjun.rao@example.local", address: "Aundh, Pune", emergencyContact: "Nisha Rao", emergencyPhone: "+91 98220 11226", medicalHistory: "Follow-up after admission", allergies: "None recorded", status: "admitted" },
    { patientCode: "PT-1046", fullName: "Sana Sheikh", dob: "1998-11-02", age: 27, gender: "female", bloodGroup: "A+", phone: "+91 98220 11227", email: "sana.s@example.local", address: "Viman Nagar, Pune", emergencyContact: "Zaid Sheikh", emergencyPhone: "+91 98220 11228", medicalHistory: "No known history", allergies: "None recorded", status: "active" },
    { patientCode: "PT-1045", fullName: "Kabir Deshmukh", dob: "1958-05-30", age: 68, gender: "male", bloodGroup: "AB+", phone: "+91 98220 11229", email: "kabir.d@example.local", address: "Baner, Pune", emergencyContact: "Isha Deshmukh", emergencyPhone: "+91 98220 11230", medicalHistory: "Diabetes care plan", allergies: "Sulfa drugs", status: "discharged" },
    { patientCode: "PT-1044", fullName: "Nadia Fernandes", dob: "1990-03-12", age: 36, gender: "female", bloodGroup: "O-", phone: "+91 98220 11231", email: "nadia.f@example.local", address: "Camp, Pune", emergencyContact: "Louis Fernandes", emergencyPhone: "+91 98220 11232", medicalHistory: "Routine wellness visit", allergies: "None recorded", status: "active" },
  ]);
  const seededPatients = await db.select().from(patients).orderBy(patients.id);
  const seededDoctors = await db.select().from(doctors).orderBy(doctors.id);
  await db.insert(appointments).values([
    { patientId: seededPatients[0].id, doctorId: seededDoctors[0].id, appointmentDate: new Date(Date.now() + 2 * 60 * 60 * 1000), reason: "Hypertension review", priority: "routine" },
    { patientId: seededPatients[2].id, doctorId: seededDoctors[2].id, appointmentDate: new Date(Date.now() + 26 * 60 * 60 * 1000), reason: "Skin consultation", priority: "urgent" },
    { patientId: seededPatients[3].id, doctorId: seededDoctors[1].id, appointmentDate: new Date(Date.now() - 26 * 60 * 60 * 1000), reason: "Cardiac follow-up", priority: "routine", status: "completed" },
  ]);
  await db.insert(beds).values([
    { bedNumber: "G-101", ward: "General Ward", type: "general", status: "available" },
    { bedNumber: "G-102", ward: "General Ward", type: "general", status: "available" },
    { bedNumber: "ICU-04", ward: "Critical Care", type: "icu", status: "occupied", currentPatientId: seededPatients[1].id },
    { bedNumber: "P-201", ward: "Private Wing", type: "private", status: "available" },
    { bedNumber: "ER-02", ward: "Emergency", type: "emergency", status: "maintenance" },
  ]);
  const seededBeds = await db.select().from(beds).orderBy(beds.id);
  await db.insert(admissions).values({ patientId: seededPatients[1].id, bedId: seededBeds[2].id, notes: "Observation and care plan active" });
  await db.insert(medicines).values([
    { name: "Paracetamol 500mg", category: "Analgesic", stock: 160, reorderLevel: 50, unit: "strips", expiryDate: "2027-11-30", status: "in_stock" },
    { name: "Amlodipine 5mg", category: "Cardiovascular", stock: 24, reorderLevel: 30, unit: "strips", expiryDate: "2027-05-31", status: "low_stock" },
    { name: "Cefixime 200mg", category: "Antibiotic", stock: 0, reorderLevel: 20, unit: "boxes", expiryDate: "2026-12-31", status: "out_of_stock" },
    { name: "Insulin glargine", category: "Diabetes care", stock: 18, reorderLevel: 12, unit: "vials", expiryDate: "2026-10-15", status: "in_stock" },
  ]);
  await db.insert(medicalRecords).values({ patientId: seededPatients[0].id, doctorId: seededDoctors[0].id, diagnosis: "Hypertension monitoring", symptoms: "Occasional fatigue", notes: "Continue monitoring and review at next appointment." });
  await db.insert(prescriptions).values({ patientId: seededPatients[0].id, doctorId: seededDoctors[0].id, medicineName: "Amlodipine 5mg", dosage: "1 tablet", frequency: "Once daily", duration: "30 days" });
  await db.insert(laboratoryTests).values({ patientId: seededPatients[0].id, testName: "Complete blood count", status: "completed", result: "Within expected educational reference range", resultDate: new Date() });
  await db.insert(bills).values([
    { patientId: seededPatients[0].id, amount: "1850.00", description: "Consultation and laboratory services", status: "pending" },
    { patientId: seededPatients[3].id, amount: "12400.00", description: "Inpatient care package", status: "paid" },
  ]);
  await db.insert(notifications).values([
    { title: "Pharmacy replenishment needed", message: "Cefixime 200mg is out of stock. Review the reorder queue.", severity: "critical" },
    { title: "Bed capacity watch", message: "Critical Care currently has 1 occupied bed in the seeded workspace.", severity: "warning" },
  ]);
  console.log("MEDINEXUS demo data seeded successfully.");
}

seed().catch(error => { console.error(error); process.exit(1); });
