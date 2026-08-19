import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Button,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";

const BACKEND_URL = "http://192.168.1.106:8000";

type Tarama = {
  id: number;
  ip: string;
  durum: string;
  zaman: string;
};

export default function GecmisScreen() {
  const [taramalar, setTaramalar] = useState<Tarama[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");

  const gecmisiGetir = useCallback(async () => {
    setHata("");
    setYukleniyor(true);
    try {
      const response = await fetch(`${BACKEND_URL}/gecmis`);
      const data = await response.json();
      setTaramalar(data.taramalar ?? []);
    } catch (err) {
      setHata("Gecmis alinamadi. Backend baglantisini kontrol et.");
    } finally {
      setYukleniyor(false);
    }
  }, []);

  // Ekran her odaklandiginda (tab'a geçildiginde) gecmisi otomatik yenile
  useFocusEffect(
    useCallback(() => {
      gecmisiGetir();
    }, [gecmisiGetir]),
  );

  const durumIkon = (durum: string) => {
    if (durum === "acik") return "🟢 Acik";
    if (durum === "kapali") return "🔴 Kapali";
    return "⚠️ Zaman Asimi";
  };

  const zamanFormatla = (zaman: string) => {
    try {
      const tarih = new Date(zaman);
      return tarih.toLocaleString("tr-TR");
    } catch {
      return zaman;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.baslik}>Gecmis</Text>
      <Text style={styles.altBaslik}>Son 50 tarama kaydi</Text>

      <View style={styles.butonAlani}>
        <Button title="Yenile" onPress={gecmisiGetir} disabled={yukleniyor} />
      </View>

      {hata !== "" && <Text style={styles.hataMetni}>{hata}</Text>}

      <FlatList
        data={taramalar}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={yukleniyor} onRefresh={gecmisiGetir} />
        }
        ListEmptyComponent={
          !yukleniyor ? (
            <Text style={styles.bosMetni}>Henuz kayitli bir tarama yok.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.satir}>
            <View style={styles.satirSol}>
              <Text style={styles.ipMetni}>{item.ip}</Text>
              <Text style={styles.zamanMetni}>{zamanFormatla(item.zaman)}</Text>
            </View>
            <Text style={styles.durumMetni}>{durumIkon(item.durum)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  baslik: { fontSize: 32, fontWeight: "bold", marginBottom: 4 },
  altBaslik: { fontSize: 14, color: "#666", marginBottom: 16 },
  butonAlani: { marginBottom: 16, alignItems: "flex-start" },
  hataMetni: { color: "red", marginBottom: 12 },
  bosMetni: { textAlign: "center", color: "#999", marginTop: 40 },
  satir: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  satirSol: {},
  ipMetni: { fontSize: 16, fontWeight: "600", fontFamily: "monospace" },
  zamanMetni: { fontSize: 12, color: "#888", marginTop: 2 },
  durumMetni: { fontSize: 15 },
});
