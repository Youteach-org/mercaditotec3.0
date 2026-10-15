import type { ActionCodeSettings } from "firebase/auth";

export const EMAIL_ACTION_URL = "https://mercaditotec.store/auth/action";

/**
 * Firebase uses this as the authorized continue URL.
 * To change the actual URL shown in the email, Firebase Console →
 * Authentication → Templates → Customize action URL must also point at
 * EMAIL_ACTION_URL. A continue URL alone does not change the link domain.
 */
export const verificationActionSettings: ActionCodeSettings = {
  url: "https://mercaditotec.store/verify-email",
  handleCodeInApp: false,
};

export const passwordResetActionSettings: ActionCodeSettings = {
  url: "https://mercaditotec.store/login",
  handleCodeInApp: false,
};
