# Restore production source — 2026-10-07

Production had been deploying from `feature/student-stores`. The deployment step succeeded even when the later verification step failed. A temporary switch made `main` auto-deploy, but `main` was substantially behind `feature/student-stores`, causing visible regressions.

This commit intentionally triggers the existing production deployment from `feature/student-stores` to restore the previously active feature set while branch reconciliation is prepared.

Do not switch production permanently to `main` until the missing feature-branch work has been reconciled.
