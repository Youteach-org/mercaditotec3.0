import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from "react-native";
import { addDoc, collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/contexts/AuthContext";

export default function ChatPage() {
  const { appUser } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "rooms", "general", "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  async function sendTemplate(text: string) {
    if (!appUser) return;

    try {
      await addDoc(collection(db, "rooms", "general", "messages"), {
        text,
        senderEmail: appUser.email ?? "usuario",
        type: "template",
        createdAt: Date.now()
      });
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo enviar");
    }
  }

  async function sendPremium() {
    if (!appUser || appUser.plan !== "premium") {
      Alert.alert("Premium", "Solo usuarios premium pueden escribir libremente");
      return;
    }

    try {
      await addDoc(collection(db, "rooms", "general", "messages"), {
        text: "Mensaje libre premium",
        senderEmail: appUser.email ?? "premium",
        type: "custom",
        createdAt: Date.now()
      });
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo enviar");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat general</Text>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.msg}>
            <Text style={styles.sender}>{item.senderEmail}</Text>
            <Text>{item.text}</Text>
          </View>
        )}
      />

      <View style={styles.row}>
        <Pressable style={styles.templateBtn} onPress={() => sendTemplate("¿Sigue disponible?")}>
          <Text style={styles.btnText}>¿Sigue disponible?</Text>
        </Pressable>
        <Pressable style={styles.templateBtn} onPress={() => sendTemplate("Me interesa")}>
          <Text style={styles.btnText}>Me interesa</Text>
        </Pressable>
      </View>

      <Pressable style={styles.premiumBtn} onPress={sendPremium}>
        <Text style={styles.btnText}>Enviar mensaje libre premium</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 28, fontWeight: "700" },
  msg: { padding: 10, borderWidth: 1, borderColor: "#ddd", borderRadius: 10, marginBottom: 8 },
  sender: { fontWeight: "700", marginBottom: 4 },
  row: { flexDirection: "row", gap: 8 },
  templateBtn: { flex: 1, backgroundColor: "#2563eb", padding: 12, borderRadius: 10, alignItems: "center" },
  premiumBtn: { backgroundColor: "#7c3aed", padding: 14, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", textAlign: "center" }
});
