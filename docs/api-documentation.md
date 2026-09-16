# MEDINEXUS 2.0 API Documentation

The project exposes typed tRPC endpoints under the managed `/api/trpc` gateway. They are equivalent to REST-style resources for demonstration purposes: query procedures represent reads and mutation procedures represent create, update, or delete operations. Inputs are validated by Zod before database access.

| Procedure | Method semantics | Purpose |
|---|---|---|
| `dashboard` | GET/query | Dynamic totals, capacity, alerts, recent patients, and upcoming appointments |
| `patients.list` | GET/query | Search by patient name, code, or phone |
| `patients.get360` | GET/query | Patient profile plus appointments, records, prescriptions, labs, admissions, bills, and audit activity |
| `patients.create` | POST/mutation | Register a patient with required identity validation |
| `patients.update` | PATCH/mutation | Update patient profile fields |
| `patients.remove` | DELETE/mutation | Delete a patient and record an audit event |
| `appointments.list` | GET/query | List scheduled and historical appointments |
| `appointments.create` | POST/mutation | Create an appointment and reject doctor conflicts within 30 minutes |
| `clinical.records` | POST/mutation | Add a medical record |
| `clinical.prescriptions` | POST/mutation | Add a prescription |
| `clinical.labOrder` | POST/mutation | Order a lab test |
| `clinical.labResult` | PATCH/mutation | Record a lab result |
| `inventory.list` | GET/query | List medicine inventory |
| `inventory.add` | POST/mutation | Add inventory with computed stock status |
| `inventory.adjust` | PATCH/mutation | Adjust stock and recompute low/out-of-stock state |
| `beds.list` | GET/query | List bed capacity |
| `beds.admit` | POST/mutation | Occupy an available bed and change patient status |
| `beds.discharge` | PATCH/mutation | Release a bed and mark a patient discharged |
| `billing.list` | GET/query | List bills |
| `billing.create` | POST/mutation | Create a bill |
| `recommendations.suggestDepartment` | GET/query | Rule-based, explainable routing recommendation |
| `recommendations.priority` | GET/query | Rule-based appointment priority suggestion |

Errors are returned through tRPC error envelopes. The UI displays mutation errors as toast messages, while form controls use HTML required constraints and Zod provides server-side enforcement. Authentication context comes from the built-in OAuth cookie; `auth.me` returns the current user and `auth.logout` clears the session cookie.
