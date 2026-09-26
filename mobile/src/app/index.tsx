import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { apiFetch } from "@/lib/api";

export default function Index() {
  const [status, setStatus] = useState("Verificando API...");

  useEffect(() => {
    apiFetch("/health")
      .then(() => setStatus("API conectada"))
      .catch((error: Error) => setStatus(`Erro: ${error.message}`));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ReadUp</Text>
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    gap: 8,
  },
  title: { fontSize: 32, fontWeight: "700", color: "#0F172A" },
  status: { fontSize: 16, color: "#0F172A" },
});
