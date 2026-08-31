# Security Trust Administration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add community-based student verification, superadmin/subadmin authorization and auditable administration without disrupting current marketplace use.

**Architecture:** Keep Firebase Auth as identity and Firestore `users` as the profile source. Add small pure domain helpers under `lib/security`, server-only repositories for trust/admin/audit mutations, and Next.js API routes that always verify Firebase ID tokens before changes. Existing `admin` profiles remain recognized as superadmin so current administration is not locked out.

**Tech Stack:** Next.js 16.2.3, React 19, TypeScript, Firebase Auth, Firestore/Firebase Admin, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-30-security-trust-admin.md`

## Global Constraints
- Work on `feature/student-stores`, not `main`.
- Do not enforce student verification on chat/store access in this phase.
- Two independent endorsements confirm a student.
- Maximum 5 endorsements per verified student per Jan-Jun / Jul-Dec trust period.
- Only superadmin may assign/remove subadmins.
- Legacy `admin` is treated as superadmin.
- Audit entries are server-written only.

---

### Task 1: Security domain and role compatibility

**Files:**
- Create: `lib/security/domain.ts`
- Create: `lib/security/domain.test.ts`
- Modify: `lib/store/auth.ts`
- Modify: `lib/store/auth.test.ts`
- Modify: `lib/useSession.ts`

**Interfaces:**
- Produces `AdminRole`, `StudentTrustStatus`, `effectiveAdminRole(profile)`, `isAdminRole(profile)`, `isSuperadminRole(profile)`, `trustPeriodId(date)`, `canEndorseStudent(input)`.

- [ ] Write tests for legacy admin -> superadmin, explicit superadmin/subadmin, normal user rejection, period IDs, self-endorsement rejection, duplicate rejection, non-verified endorser rejection, endorsement limit, and target-state validation.
- [ ] Verify the new tests fail because helpers do not exist yet.
- [ ] Implement the pure helpers and update `requireAdmin` plus new `requireSuperadmin` to use them.
- [ ] Expand `AppUser` with `superadmin/subadmin`, `studentStatus`, endorsement counts and verification timestamps while retaining legacy `admin` typing.
- [ ] Run unit tests and build/typecheck.

### Task 2: Trust repository and API

**Files:**
- Create: `lib/security/trustRepository.ts`
- Create: `lib/security/trustRepository.test.ts`
- Create: `app/api/trust/me/route.ts`
- Create: `app/api/trust/endorse/route.ts`
- Modify: `app/register/page.tsx`

**Interfaces:**
- `getStudentTrust(uid)` returns status/count.
- `endorseStudent(endorserUid, targetEmail, now)` transactionally enforces two endorsements and 5-per-period limit.

- [ ] Add tests for deterministic endorsement mutation rules and period counters.
- [ ] Verify RED.
- [ ] Implement server transaction using `users/{targetUid}/endorsements/{endorserUid}` and `users/{endorserUid}/trust_counters/{periodId}`.
- [ ] Add `studentStatus: "pending"`, `studentEndorsementCount: 0` to new registrations.
- [ ] Add authenticated API routes for own status and endorsement by institutional email.
- [ ] Run tests and build/typecheck.

### Task 3: Audit log and admin user operations

**Files:**
- Create: `lib/security/audit.ts`
- Create: `lib/security/adminUsers.ts`
- Create: `app/api/admin/users/route.ts`
- Create: `app/api/admin/users/[uid]/trust/route.ts`
- Create: `app/api/admin/users/[uid]/role/route.ts`
- Create: `app/api/admin/audit/route.ts`

**Interfaces:**
- `writeAuditEntry({ actorUid, actorRole, action, targetType, targetId, metadata })`.
- User trust updates require admin; role updates require superadmin.

- [ ] Write tests for admin action parsing and superadmin-only role assignment.
- [ ] Verify RED.
- [ ] Implement user listing with sanitized fields only.
- [ ] Implement direct verify/revoke actions and audit them.
- [ ] Implement subadmin assignment/removal through `requireSuperadmin`; forbid changing the caller's own effective superadmin role.
- [ ] Implement read-only audit listing for admins.
- [ ] Run tests and build/typecheck.

### Task 4: Administration center surfaces

**Files:**
- Create: `app/admin/page.tsx`
- Create: `app/admin/users/page.tsx`
- Create: `app/admin/audit/page.tsx`
- Modify: `app/admin/stores/page.tsx`
- Modify: `app/admin/stores/[storeId]/page.tsx`
- Modify: `app/admin/categories/page.tsx`

**Interfaces:**
- All admin pages use a shared client role helper accepting superadmin/subadmin/legacy admin.
- `/admin` links to Usuarios, Tiendas, Reportes, Chat, Administradores, Historial; unavailable future sections are visibly marked as pending rather than fake-functional.

- [ ] Add client helper coverage for all administrative roles.
- [ ] Replace exact `role === "admin"` checks with shared helper.
- [ ] Build `/admin/users` with trust-status controls; superadmin-only subadmin controls.
- [ ] Build `/admin/audit` read-only history.
- [ ] Add navigation back to `/admin` from store/category administration.
- [ ] Run build/typecheck and inspect Vercel preview.

### Task 5: Verification page without enforcement

**Files:**
- Create: `app/verify-student/page.tsx`
- Modify: `app/profile/page.tsx`

**Interfaces:**
- Page shows own status and allows verified users to endorse another institutional email.

- [ ] Add UI-state tests where practical for pure label/helpers.
- [ ] Implement status copy and endorsement form.
- [ ] Link from profile.
- [ ] Do not block chat or store creation yet.
- [ ] Run full tests and production build on preview branch.
