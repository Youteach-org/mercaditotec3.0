import type {
  StoreStatus,
} from "./domain";

export type AdminStoreAction =
  | "approve"
  | "changes_required"
  | "suspend"
  | "reactivate";

export const adminTabs: Array<{
  status: StoreStatus;
  label: string;
}> = [
  {
    status: "pending_review",
    label: "Pendientes",
  },
  {
    status: "changes_required",
    label: "Requieren cambios",
  },
  {
    status: "active",
    label: "Activas",
  },
  {
    status: "suspended",
    label: "Suspendidas",
  },
];

export function actionsForStoreStatus(
  status: StoreStatus,
): AdminStoreAction[] {
  switch (status) {
    case "pending_review":
      return [
        "approve",
        "changes_required",
      ];

    case "active":
      return ["suspend"];

    case "suspended":
      return ["reactivate"];

    case "draft":
    case "changes_required":
      return [];
  }
}

export function adminActionLabel(
  action: AdminStoreAction,
): string {
  switch (action) {
    case "approve":
      return "Aprobar";

    case "changes_required":
      return "Requiere cambios";

    case "suspend":
      return "Suspender";

    case "reactivate":
      return "Reactivar";
  }
}

export function apiStatusForAction(
  action: AdminStoreAction,
):
  | "active"
  | "changes_required"
  | "suspended" {
  switch (action) {
    case "approve":
    case "reactivate":
      return "active";

    case "changes_required":
      return "changes_required";

    case "suspend":
      return "suspended";
  }
}
