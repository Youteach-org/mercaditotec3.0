# MercaditoTec3 Security, Trust and Administration Spec

## Goal
Protect MercaditoTec3 while keeping access low-friction and independent from Tecnológico de Morelia administration.

## Identity and trust
- Institutional email remains the first access signal.
- The site does not request or store student ID-card images as the normal verification method.
- Student confirmation is based on trust inside the community, not on any official Tec integration.
- Student trust status is `pending`, `verified`, or `revoked`.
- Two independent verified students are required to confirm a pending student.
- A verified student may issue at most 5 new endorsements per trust period (Jan-Jun or Jul-Dec).
- A user cannot endorse themselves or endorse the same target twice in the same period.
- Superadmin/subadmin may directly confirm or revoke student status when they have a justified reason.
- Revoking an endorser does not automatically revoke people previously endorsed by them; those accounts can be reviewed separately.
- Existing user flows are not blocked by student-trust status during the rollout. Enforcement for chat/store creation is a later explicit phase so current users are not unexpectedly locked out.

## Administrative roles
Only these effective administrative levels exist:
- `superadmin`: full administrative access; may assign/remove subadmins.
- `subadmin`: may operate users, stores, reports and moderation, but may not manage administrator privileges.

Legacy `admin` accounts are treated as superadmin for backward compatibility until explicitly migrated.

## Audit
Sensitive administrative actions must create immutable server-side audit entries with actor, action, target, timestamp and relevant metadata. Client code must not be able to create or edit audit entries directly.

## Administration UI
The administration center will converge on these sections:
- Usuarios
- Tiendas
- Reportes
- Chat
- Administradores
- Historial

This phase implements the security foundation and the user/administrator/audit surfaces needed for later reporting and chat moderation.

## Reports and blocking (next phase)
- Keep a single `Reportar` action whose context determines whether the target is a user, store or message.
- Reports never cause an automatic ban solely by count.
- Users may block another user without filing a report.
- Automatic content detection is a later layer and must not silently make irreversible moderation decisions without review.

## Privacy
Store only the minimum data needed to establish trust, moderation history and administrative accountability. Do not expose endorsement relationships publicly.