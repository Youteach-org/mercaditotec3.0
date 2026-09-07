import { redirect } from "next/navigation";

export default function LegacySellerOrdersRedirectPage() {
  redirect("/mystore/orders");
}
