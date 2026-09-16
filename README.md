# MEDINEXUS 2.0

**AI-Assisted Smart Hospital Operations & Patient Care Management Platform**

MEDINEXUS is an academic hospital/patient management system built to demonstrate a complete frontend → API → server → ORM → database workflow. It provides a live operational dashboard, patient registry, Patient 360° profile, appointment scheduling with conflict detection, clinical records, pharmacy stock monitoring, beds/admissions, billing, notifications, audit logging, and explainable AI-assisted recommendations.

> **Academic disclaimer:** AI-Assisted Recommendation features are for educational/software demonstration purposes only. They do not diagnose disease, guarantee treatment, or replace professional medical advice.

## Stack

The active WebDev project uses React 19 + TypeScript + Vite on the frontend, Express + tRPC on the backend, Drizzle ORM, and a managed MySQL/TiDB database. Recharts supplies operational charts, Tailwind/shadcn primitives support the UI, and Manus OAuth supplies the built-in authentication flow. The schema is portable to PostgreSQL with the usual Drizzle dialect adjustments.

## Local development

```powershell
# from the project root
pnpm install
pnpm db:push
pnpm seed
pnpm dev
```

Open the local preview shown by the dev server. The hosted preview for this session is available from the delivery link in the task response. On Windows PowerShell, `pnpm` can be replaced with `npm run` equivalents after installing Node.js 20+.

## Demo sequence

1. Open **Overview** and inspect live dashboard totals, bed occupancy, registration pulse, alerts, and recent patients.
2. Open **Patients → Register patient**, submit a patient, search it, open **Patient 360°**, and inspect the activity, records, and billing tabs.
3. Open **Appointments → Schedule appointment**. Attempting to schedule the same doctor within 30 minutes produces a real backend conflict error.
4. Open **Clinical** and use the clearly labelled department suggestion. The rule-based explanation is intentionally transparent and non-diagnostic.
5. Inspect **Pharmacy**, **Beds & Admissions**, and **Billing** for seeded workflow records.
6. Use **Sign in** to launch the configured OAuth flow. The API context exposes the current user and role; logout clears the session cookie.

## Key directories

| Area | Location |
|---|---|
| Frontend routes and UI | `client/src/pages/Home.tsx` |
| Visual system | `client/src/index.css` |
| Database schema | `drizzle/schema.ts` |
| Database helpers | `server/db.ts` |
| API procedures | `server/routers.ts` |
| Demo data | `server/seed.ts` |
| Migrations | `drizzle/migrations/` |
| Documentation | `docs/` |
| API collection | `postman/MEDINEXUS_API_COLLECTION.json` |

## Validation commands

```powershell
pnpm check
pnpm test
pnpm build
```

The included Vitest test covers logout cookie clearing. The tRPC procedures are intentionally small enough to inspect in a viva and all major mutations write through Drizzle rather than relying on frontend-only state.

## Security and scope notes

Patient-facing data is fictional seed data. Production deployments should add stronger per-role authorization, encrypted audit storage, clinical identity verification, retention policies, and formal medical-device/security review. This project is not a clinical system and must not be used for real patient care.

## Role workspaces and management controls

The authenticated user role is now represented as `admin`, `doctor`, `receptionist`, or `patient` and is returned by `auth.permissions`. The API applies capability checks to write operations while preserving an unauthenticated demo mode for classroom walkthroughs. The UI includes role-preview navigation so the four workspace perspectives can be demonstrated before OAuth sign-in.

Management tables now expose edit forms for doctors, departments, medicines, beds, and bills. Each update is persisted through a typed mutation and audit event rather than changing local-only state. Patient 360° includes a downloadable plain-text report, and billing includes a printable invoice window suitable for PDF printing from the browser.

## MEDINEXUS 2.1 Upgrade

This release adds authenticated access for application APIs, server-side capability-based RBAC, capability-driven navigation, safer patient deactivation, transactional admissions/discharges, stronger appointment validation, and a refreshed protected-workspace UI.

### Roles
- Admin: full operational access
- Doctor: clinical, patient-read, scheduling and read-only operational access
- Receptionist: registration, scheduling, admissions and billing operations
- Patient: patient-portal capabilities only; staff dashboard is blocked
- User: restricted account

### Windows setup
Use Node.js 20+ and pnpm. Then run:

```bash
pnpm install
pnpm check
pnpm test
pnpm build
pnpm dev
```

Configure `DATABASE_URL` and the OAuth/session environment variables before using the application. Do not use real patient data in a demo deployment.
