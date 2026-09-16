# MEDINEXUS 2.1 — Security & Hospital Workflow Upgrade

## Authentication
All clinical/operational tRPC procedures now require an authenticated session. The public surface is limited to authentication session inspection and logout.

## RBAC
Server-side capability checks enforce role permissions for patient, clinical, scheduling, pharmacy, bed, billing and settings operations. UI navigation is derived from the authenticated role capabilities; the old role-impersonation selector has been removed.

## Patient safety
Patient deletion is now a soft deactivation. Records with an active admission cannot be deactivated until discharge.

## Scheduling
Appointment creation/update validates that the patient is active and prevents doctor double-booking within 30 minutes. Cancellation preserves the appointment history.

## Admissions
Admission and discharge update bed, patient and admission records inside database transactions. Discharge validates the active admission, patient and bed relationship before changing state.

## Clinical disclaimer
Recommendation logic remains explainable rule-based routing and must not be represented as a clinical diagnosis or autonomous medical decision.

## Deployment
Set DATABASE_URL and the OAuth/session environment variables before running the application. Use HTTPS in production and never place real patient information into a demo environment.

## Development Demo Login
For local college/SOP demonstrations, MEDINEXUS 2.1 includes a development-only demo login for Admin, Doctor, Receptionist, and Patient roles. The server creates/updates dedicated demo users and issues a normal signed session cookie, so the same server-side RBAC checks are exercised. Demo login is rejected when `NODE_ENV=production`.
