# MEDINEXUS 2.0 Testing

## Automated checks

Run `pnpm check` for TypeScript diagnostics, `pnpm test` for Vitest, and `pnpm build` for the production bundle. The existing auth test verifies that logout clears the secure session cookie with the expected options. Database-backed procedures should be exercised against the seeded workspace after `pnpm seed`.

## Manual acceptance checklist

| Area | Verification |
|---|---|
| Startup | Dev server starts and the preview renders without a major console error |
| Database | Migration creates the 14 application tables and seed is repeat-safe |
| Dashboard | Totals, occupancy, inventory alerts, patient list, and notifications come from queries |
| Patient CRUD | Create, search, open 360°, and delete persist through the API |
| Appointments | Schedule a valid slot; repeat the same doctor within 30 minutes to verify conflict handling |
| Clinical | Use department suggestion and verify the disclaimer and rationale are shown |
| Pharmacy | Inspect in-stock, low-stock, and out-of-stock statuses |
| Beds | Inspect available, occupied, and maintenance states; verify admission/discharge mutations update both bed and patient |
| Billing | Inspect patient-linked bills and total amount calculation |
| Auth | Sign in launches OAuth; `auth.me` returns context; sign out clears the cookie |
| Responsive UI | Check the mobile navigation button and narrow table overflow behavior |

All records in the seeded environment are fictional and intended only for software demonstration.
