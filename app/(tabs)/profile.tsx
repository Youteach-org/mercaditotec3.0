import { View, Text, Pressable, StyleSheet } from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/config";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfilePage() {
  const { appUser } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>
      <Text>Correo: {appUser?.email ?? "-"}</Text>
      <Text>Plan: {appUser?.plan ?? "-"}</Text>
      <Text>Activo: {appUser?.isActive ? "Sí" : "No"}</Text>

      <Pressable style={styles.button} onPress={() => signOut(auth)}>
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700" },
  button: { backgroundColor: "#dc2626", padding: 14, borderRadius: 10, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#fff", fontWeight: "700" }
});
