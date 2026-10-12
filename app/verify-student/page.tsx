import { redirect } from "next/navigation";

// The former peer-endorsement flow is paused. Keep the route for old bookmarks.
export default function VerifyStudentPage() {
  redirect("/profile");
}
