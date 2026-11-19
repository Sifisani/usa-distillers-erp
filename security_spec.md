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
8. **Job Card RBAC, 8-Stage Workflow & Linked Multi-Department Integrity**:
   - All `jobCards` mutations enforce `isValidJobCard(incoming())`, immutable `createdById`, `createdAt`, `parentJobCardId`, `parentJobCardNumber`, and non-terminal existing state (`!(existing().status in ['Completed', 'Cancelled'])`) for non-Admins.
   - `workflowStage` must be one of `['SUBMITTED', 'ACCEPTED', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'WAITING_FOR_SHUTDOWN', 'WORK_COMPLETE', 'CLOSED', 'CANCELLED']`, `holdReason` `<= 500` chars, and `statusHistory` `<= 200` entries.
   - `create`: Requires `incoming().createdById == request.auth.uid || isAdmin()`, and only Supervisors/Managers/Admins may create cards directly in `Completed`, `Cancelled`, `WORK_COMPLETE`, `WAITING_FOR_SHUTDOWN`, or `CLOSED` (with `CLOSED` / `HOD Closed` restricted to `Manager`/`Admin`).
   - `update`: Tiered by role:
     - `Admin`: Full override including reopening terminal cards.
     - `Manager`: Full workflow updates including Stage 7 `CLOSED` (`hodSignedBy`, `hodDigitalSignOff`, `requisitionStage == 'HOD Closed'`).
     - `Supervisor`: Assignment, shutdown deferral (`WAITING_FOR_SHUTDOWN`), handback (`WORK_COMPLETE`), spares, labor, and spawning linked companion department jobs (`parentJobCardId`), but CANNOT set `workflowStage == 'CLOSED'`, `requisitionStage == 'HOD Closed'`, or touch `hodSignedBy`/`hodDigitalSignOff`.
     - `Technician`: Limited to open cards and `affectedKeys().hasOnly(['comments', 'laborLogs', 'totalLaborHours', 'shiftHandovers', 'shiftAssigned', 'assignedTo', 'sparesRequested', 'attachments', 'status', 'requisitionStage', 'workflowStage', 'statusHistory', 'holdReason', 'safetyPermits', 'updatedAt'])`; may only set `workflowStage in ['IN_PROGRESS', 'WAITING_FOR_PARTS']` (cannot set `WAITING_FOR_SHUTDOWN`, `WORK_COMPLETE`, `CLOSED`, or `CANCELLED`), and cannot set `status in ['Completed', 'Cancelled']` or `'HOD Closed'`/`'Artisan Completed'`.
     - `Storeman`: Limited to open cards and `affectedKeys().hasOnly(['sparesRequested', 'comments', 'status', 'requisitionStage', 'workflowStage', 'statusHistory', 'holdReason', 'updatedAt'])`; may only set `workflowStage in ['IN_PROGRESS', 'WAITING_FOR_PARTS']`, and cannot close/complete/assign or touch HOD fields.
     - `Operator`: Can only edit their own `'Draft'` card (blocked from modifying `workflowStage`, `statusHistory`, `holdReason`, `parentJobCardId`, `parentJobCardNumber`, `attachments`, or supervisor/HOD/spares/labor fields) or append `'comments'` on open cards.
   - `attachments` array is strictly capped at `<= 4` items to preserve the 1 MB Firestore document ceiling.
   - `delete`: Strictly `isAdmin()` to preserve maintenance audit trails.
9. **Configurable Organization Master Data Governance (`/orgMasterData/plant-default`)**:
   - Signed-in users may read (`get` on `'plant-default'`, `list` on `/orgMasterData`).
   - Only `Manager` or `Admin` (`isEngineeringAdmin()`) may `create` or `update` `/orgMasterData/plant-default`, enforcing `isValidOrgMasterData(incoming())`, bounded arrays (`departments <= 30`, `trades <= 20`, `shifts <= 20`, `standbyRoster <= 20`), and `updatedByUid == request.auth.uid`. Delete is permanently denied (`allow delete: if false;`).
10. **Persistent Plant Notification Feed & Read-Receipt Isolation (`/notifications/{notificationId}`)**:
   - Signed-in users may `get` / `list` notifications.
   - `create` requires signed-in attribution `createdByUid == request.auth.uid` and valid `severity in ['INFO', 'ACTION_REQUIRED', 'EMERGENCY']` + `type` allowlist.
   - Non-admin `update` is strictly restricted to `affectedKeys().hasOnly(['readByUids'])` (`readByUids.size() <= 500`), preventing anyone from tampering with alert title, message, severity, or attribution. `delete` is strictly `isAdmin()`.

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
19. **Technician Closing or Completing a Job Card**: `Technician` updating `/jobCards/{id}` with `{ "status": "Completed" }` (fails status transition check for non-supervisors).
20. **Supervisor Forging HOD Sign-Off**: `Supervisor` updating `/jobCards/{id}` with `{ "hodSignedBy": "Antonio Miranda", "requisitionStage": "HOD Closed", "workflowStage": "CLOSED", "status": "Completed" }` (fails `Manager`/`Admin` HOD check).
21. **Operator Editing Another User's Draft or Assigning Work**: `Operator` updating `/jobCards/{id}` created by someone else or changing `assignedSupervisor` / `status: "In Progress"` (fails `Operator` Draft ownership + key check).
22. **Non-Admin Deleting a Job Card**: `Supervisor`, `Manager`, `Technician`, or `Operator` (even the card creator) calling `delete` on `/jobCards/{id}` (fails `isAdmin()`).
23. **Mutation of Job Card Creator or Parent Link Attribution**: Any non-Admin user updating `/jobCards/{id}` with `{ "createdById": "other-uid" }` or `{ "parentJobCardId": "forged-parent" }` (fails immutability check).
24. **Technician Setting Supervisor-Only Workflow Stage**: `Technician` updating `/jobCards/{id}` with `{ "workflowStage": "WAITING_FOR_SHUTDOWN" }` or `{ "workflowStage": "WORK_COMPLETE" }` (fails Technician stage allowlist).
25. **Operator Forging Workflow Stage or Status History**: `Operator` updating `/jobCards/{id}` with `{ "workflowStage": "ACCEPTED", "statusHistory": [...] }` (fails Operator key blacklist).
26. **Non-Admin Modifying Plant Master Data**: `Supervisor`, `Technician`, or `Operator` writing to `/orgMasterData/plant-default` (fails `isEngineeringAdmin()`).
27. **Spoofing or Tampering with Plant Notifications**: User creating `/notifications/{id}` with `createdByUid != request.auth.uid`, or non-Admin updating `title`, `message`, or `severity` on an existing notification (fails `readByUids`-only diff guard).
28. **Attachment Array Overflow on Job Card**: Any user writing `> 4` entries in `jobCard.attachments` (fails `data.attachments.size() <= 4`).
