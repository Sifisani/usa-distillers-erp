# Electrical Distribution & Plant Asset Security Specification (Phase 0)

## 1. Data Invariants
1. **Default-Deny Catch-All**: All Firestore paths not explicitly matched deny read and write (`match /{document=**} { allow read, write: if false; }`).
2. **Role-Tiered Electrical Topology Governance**:
   - Only Authorized Engineering Users (`Admin`, `Manager`, `Supervisor`, or verified bootstrapped admin `sifisani@gmail.com`) may create/modify/delete `powerDistributionNodes` and `powerConnections`, or create/relocate/delete `equipment` assets.
   - Ordinary `Technician` and `Operator` users cannot alter electrical topology or breaker assignments (`feederNodeId`, `feederPanel`, `transformerSource`, `feederBreaker`, `code`, `name`); they may only update equipment inspection fields (`loadCurrentAmps`, `status`, `notes`, `lastServiceDate`, `nextServiceDate`, `modificationHistory`, `updatedAt`).
3. **Referential & Topological Integrity**:
   - `powerConnections` documents must specify distinct `sourceNodeId != targetNodeId`, valid `edgeRole` (`PRIMARY_FEED`, `SUB_FEED`, `STANDBY_FEED`, `INTERLOCK_TIE`), and valid `voltageTier`.
   - `powerDistributionNodes` and `equipment` enforce bounded strings, valid enums, and bounded `modificationHistory` arrays (`<= 200`).
4. **PII Isolation & Role Escalation Guard**:
   - `users/{userId}` restricts `get` to `isOwner(userId) || isAdmin()`, `list` to `isAdmin()`, forbids non-admins from registering as `'Admin'`, and locks `uid`/`role` on non-admin updates.
5. **Immutable Historical Electrical Measurements**:
   - `/electricalMeasurements/{measurementId}` is strictly append-only (`allow update, delete: if false;`).
   - Only `source in ['MEASURED', 'METERED']` is permitted (blocking nameplate estimates from masquerading as historical meter readings) and `recordedByUid == request.auth.uid` is enforced on create.
6. **Immutable Structured Electrical Inspections & Supervisor Review Ledger**:
   - `/electricalInspections/{inspectionId}` is strictly append-only (`allow update, delete: if false;`).
   - `technicianId == request.auth.uid`, `createdAt == request.time` (`serverTimestamp()`), and `technicianRole in ['Admin', 'Manager', 'Supervisor', 'Technician']` are enforced on create. Operators cannot submit inspections (`PERMISSION_DENIED`).
   - Photos are capped at `<= 4` compressed attachments (`sizeBytes <= 220000`) to protect the 1 MB Firestore document ceiling.
   - `/electricalInspectionReviews/{reviewId}` is strictly append-only (`allow update, delete: if false;`), restricted to Supervisors/Managers/Admins (`isElectricalEngineer()`), with `reviewerUid == request.auth.uid` and `createdAt == request.time`.
7. **Admin-Controlled Inspection Templates**:
   - `/inspectionTemplates/{templateId}` restricts `templateId in ['CIRCUIT_BREAKER', 'TRANSFORMER', 'MOTOR', 'MCC_DB']` and limits `create`/`update` to Engineering Administrators (`Admin` / `Manager` via `isEngineeringAdmin()`) with `updatedByUid == request.auth.uid` and `updatedAt == request.time`.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated SLD write**: `{ "code": "C8", "operatingState": "OPEN" }` on `/powerDistributionNodes/C8` with `auth == null`.
2. **Technician modifying electrical topology**: `Technician` user updating `/powerDistributionNodes/C4` (`{ "operatingState": "CLOSED" }`).
3. **Technician creating multi-source `powerConnections` link**: `Technician` user creating `/powerConnections/CONN_1` with `{ "sourceNodeId": "BUS_TX2", "targetNodeId": "C17", "voltageTier": "400V", "edgeRole": "PRIMARY_FEED" }`.
4. **Operator relocating a motor between MCCs**: `Operator` updating `/equipment/eq-1` with `{ "feederPanel": "MCC 4", "feederNodeId": "C10" }` (violates `affectedKeys().hasOnly(...)`).
5. **Self-loop power connection**: `Supervisor` creating `/powerConnections/LOOP` with `{ "sourceNodeId": "C8", "targetNodeId": "C8", "voltageTier": "400V", "edgeRole": "PRIMARY_FEED" }`.
6. **ID Poisoning on powerConnections**: `Supervisor` creating `/powerConnections/invalid$id/../hack` (fails `isValidId()`).
7. **Shadow / Ghost Field Injection on equipment**: `Technician` updating `/equipment/eq-1` with `{ "loadCurrentAmps": 25, "isAdminBypass": true }`.
8. **Role Self-Escalation in `users/{uid}`**: `Technician` creating `/users/{uid}` with `{ "uid": "{uid}", "role": "Admin", ... }` or updating `role` from `'Technician'` to `'Supervisor'`.
9. **Spoofed Admin Email without `email_verified`**: User with `token.email == 'sifisani@gmail.com'` and `token.email_verified == false` deleting `/equipment/eq-1`.
10. **PII Leak Attempt**: `Supervisor` reading `/users/{otherUid}` (`get` or `list`).
11. **Oversized String / Resource Poisoning**: `Supervisor` writing `name` of 5000 chars or `modificationHistory` with 250 items.
12. **Terminal State Violation**: Non-admin updating `/jobCards/{id}` whose existing status is `'Completed'`.
13. **Historical Measurement Tampering**: Any user (including `Admin`) attempting `update` or `delete` on `/electricalMeasurements/{measurementId}` (must return `PERMISSION_DENIED`).
14. **Spoofed Measurement Attribution or Source**: Creating `/electricalMeasurements/{id}` with `recordedByUid != request.auth.uid` or `source: 'ESTIMATED'`.
15. **Inspection Identity Spoofing & Immutability Breach**: Technician creating `/electricalInspections/{id}` with `technicianId != request.auth.uid`, or any user attempting `update`/`delete` on `/electricalInspections/{id}`.
16. **Technician Approving Own Inspection**: `Technician` creating `/electricalInspectionReviews/{id}` (fails `isElectricalEngineer()`).
17. **Non-Admin Modifying Inspection Templates**: `Technician` or `Supervisor` updating `/inspectionTemplates/CIRCUIT_BREAKER` (fails `isEngineeringAdmin()`).
18. **Operator Submitting Electrical Inspection**: `Operator` creating `/electricalInspections/{id}` (fails role check).

