import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function IndexPage() {
  const { user } = useAuth();

  if (user) {
    return <Redirect href="/(tabs)/chat" />;
  }

  return <Redirect href="/login" />;
}
