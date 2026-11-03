/**
 * Public controller information: edited only after real-world verification.
 * These fields are PUBLIC legal facts, not credentials.
 * Keep reviewedForPublication=false until a responsible person confirms
 * the legal notice, hosting vendors and personal-data retention terms.
 */
import controllerDetails from "./controller.json";

export type PrivacyController = {
  legalName: string;
  address: string;
  contactEmail: string;
};

export const privacyController: PrivacyController = controllerDetails;

export function isPrivacyControllerConfigured(controller: PrivacyController): boolean {
  return controller.legalName.trim().length >= 5 &&
    controller.address.trim().length >= 12 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(controller.contactEmail.trim());
}

export const privacyNoticeApprovedForPublication =
  isPrivacyControllerConfigured(privacyController) && controllerDetails.reviewedForPublication === true;

export const privacyNoticeRevision = "2026-11-03";
