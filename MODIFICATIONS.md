# MEDINEXUS 2.0 - Upgrade Notes

## Completed in this upgraded package

### CRUD improvements
- Patient: Create, Read, Update, Delete UI and API flow.
- Doctors: Create, Read, Update, Delete API and delete action in the clinical directory.
- Departments: Create, Read, Update, Delete API and delete action in the clinical directory.
- Appointments: Create, Read, Update, Cancel flow with conflict checking during updates.
- Pharmacy medicines: Create, Read, Update, Delete.
- Billing: Create, Read, Update, Delete.

### Safety-oriented delete behavior
- Doctors and departments with appointment history are protected from hard deletion; the user is told to mark them inactive instead.
- Appointment deletion is implemented as cancellation so scheduling history is retained.

### Windows compatibility
- Development and production scripts now use `cross-env` so `NODE_ENV` works correctly on Windows PowerShell as well as Unix-like systems.

## Validation note
The source was statically inspected after modification. A full dependency install/build could not be completed in this environment because external package registry access was unavailable. Run `pnpm install`, `pnpm check`, `pnpm test`, and `pnpm build` locally after extracting the ZIP.


## 2.1 security/workflow upgrade
- All non-auth application procedures require authentication.
- Server-side RBAC now gates read and write capabilities.
- Role preview/impersonation was removed from the dashboard UI.
- Patient deletion is a safe deactivation.
- Admission and discharge are transactional and validate state relationships.
- UI navigation is capability-driven.
- Added protected clinical workspace/security messaging.

## MEDINEXUS 2.1.1 — Development Demo Authentication
- Added development-only Demo Login for Admin, Doctor, Receptionist, and Patient roles.
- Demo login creates/updates dedicated database users and issues the same signed session-token format used by normal authentication.
- Local demo cookies use `SameSite=Lax` for reliable localhost operation.
- Demo authentication is explicitly blocked when `NODE_ENV=production`.
- Added role-specific demo buttons to the restricted-access screen so the project can be demonstrated locally without Manus OAuth credentials.
