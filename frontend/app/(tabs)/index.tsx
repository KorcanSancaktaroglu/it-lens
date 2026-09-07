import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Button,
  Text,
  ScrollView,
  FlatList,
  Animated,
  Easing,
} from "react-native";

import { BACKEND_URL } from "@/constants/api";
import { useDeviceMonitor } from "@/hooks/use-device-monitor";

// Tarama sirasinda gosterilen radar tarzi animasyon bileseni
function RadarAnimasyonu() {
  const halka1 = useRef(new Animated.Value(0)).current;
  const halka2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animasyonOlustur = (deger: Animated.Value, gecikme: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(gecikme),
          Animated.timing(deger, {
            toValue: 1,
            duration: 1500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(deger, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );

    const anim1 = animasyonOlustur(halka1, 0);
    const anim2 = animasyonOlustur(halka2, 750);
    anim1.start();
    anim2.start();

    return () => {
      anim1.stop();
      anim2.stop();
    };
  }, []);

  const halkaStili = (deger: Animated.Value) => ({
    position: "absolute" as const,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#2E7D32",
    opacity: deger.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
    transform: [
      {
        scale: deger.interpolate({
          inputRange: [0, 1],
          outputRange: [0.3, 1.6],
        }),
      },
    ],
  });

  return (
    <View style={styles.radarAlani}>
      <Animated.View style={halkaStili(halka1)} />
      <Animated.View style={halkaStili(halka2)} />
      <View style={styles.radarMerkez} />
    </View>
  );
}

export default function HomeScreen() {
  const [ip, setIp] = useState("");
  const [sonuc, setSonuc] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");

  const [agTaraniyor, setAgTaraniyor] = useState(false);
  const [agSonucu, setAgSonucu] = useState<any>(null);

  const { izlenenler, izlemeAktif, izlemeyiBaslat, izlemeyiDurdur, izlemeAraligiSaniye } =
    useDeviceMonitor();

  const taramaYap = async () => {
    if (!ip) {
      setHata("Lutfen bir IP adresi girin");
      return;
    }
    setHata("");
    setYukleniyor(true);
    setSonuc(null);
    setAgSonucu(null);

    try {
      const response = await fetch(`${BACKEND_URL}/ping/${ip}`);
      const data = await response.json();
      setSonuc(data);
    } catch (err) {
      setHata(
        "Backend a baglanilamadi. IP adresini ve ağ bağlantısını kontrol et.",
      );
    } finally {
      setYukleniyor(false);
    }
  };

  const agiTara = async () => {
    const kaynakIp = ip || "192.168.1.106";
    const parcalar = kaynakIp.split(".");
    if (parcalar.length !== 4) {
      setHata(
        "Ag taramasi icin once gecerli bir IP formati girin (orn: 192.168.1.106)",
      );
      return;
    }
    const subnet = `${parcalar[0]}.${parcalar[1]}.${parcalar[2]}`;

    setHata("");
    setAgTaraniyor(true);
    setAgSonucu(null);
    setSonuc(null);
    izlemeyiDurdur(); // onceki taramadan kalan izlemeyi durdur

    try {
      const response = await fetch(`${BACKEND_URL}/network-scan/${subnet}`);
      const data = await response.json();
      setAgSonucu(data);

      if (data.cihazlar && data.cihazlar.length > 0) {
        izlemeyiBaslat(data.cihazlar);
      }
    } catch (err) {
      setHata("Ag taramasi basarisiz. Backend baglantisini kontrol et.");
    } finally {
      setAgTaraniyor(false);
    }
  };

  const taraniyorMu = yukleniyor || agTaraniyor;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.baslik}>IT-Lens</Text>
      <Text style={styles.altBaslik}>Ag Tanilama Araci</Text>

      <TextInput
        style={styles.input}
        placeholder="IP adresi girin (orn: 192.168.1.1)"
        value={ip}
        onChangeText={setIp}
        autoCapitalize="none"
        keyboardType="default"
        editable={!taraniyorMu}
      />

      <View style={styles.butonSatiri}>
        <View style={styles.butonYaris}>
          <Button title="Tara" onPress={taramaYap} disabled={taraniyorMu} />
        </View>
        <View style={styles.butonYaris}>
          <Button
            title="Agi Tara"
            onPress={agiTara}
            color="#2E7D32"
            disabled={taraniyorMu}
          />
        </View>
      </View>

      {taraniyorMu && (
        <View style={styles.taramaKutusu}>
          <RadarAnimasyonu />
          <Text style={styles.taramaMetni}>
            {agTaraniyor ? "Ag taraniyor..." : "Taraniyor..."}
          </Text>
        </View>
      )}

      {hata !== "" && <Text style={styles.hataMetni}>{hata}</Text>}

      {sonuc && !taraniyorMu && (
        <View style={styles.sonucKart}>
          <Text style={styles.sonucSatir}>IP: {sonuc.ip}</Text>
          <Text style={styles.sonucSatir}>
            Durum:{" "}
            {sonuc.durum === "acik"
              ? "🟢 Acik"
              : sonuc.durum === "kapali"
                ? "🔴 Kapali"
                : "⚠️ Zaman Asimi"}
          </Text>
          {sonuc.detay && <Text style={styles.detayMetni}>{sonuc.detay}</Text>}
        </View>
      )}

      {agSonucu && !taraniyorMu && (
        <View style={styles.agSonucKart}>
          <Text style={styles.agBaslik}>
            {agSonucu.subnet} — {agSonucu.bulunan_cihaz_sayisi} cihaz bulundu
          </Text>

          {izlemeAktif && (
            <View style={styles.izlemeSatiri}>
              <View style={styles.izlemeNoktasi} />
              <Text style={styles.izlemeMetni}>
                Canli izleme aktif ({izlemeAraligiSaniye}sn'de bir kontrol)
              </Text>
            </View>
          )}

          <FlatList
            data={agSonucu.cihazlar}
            keyExtractor={(item) => item.ip}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const canliDurum =
                izlenenler.find((c) => c.ip === item.ip)?.durum ?? "acik";
              const durumGosterimi =
                canliDurum === "acik"
                  ? "🟢 Acik"
                  : canliDurum === "kapali"
                    ? "🔴 Kapali"
                    : "⚠️ Zaman Asimi";
              return (
                <View style={styles.cihazSatiri}>
                  <Text style={styles.cihazIp}>{item.ip}</Text>
                  <Text style={styles.cihazDurum}>{durumGosterimi}</Text>
                </View>
              );
            }}
          />

          {izlemeAktif && (
            <Text style={styles.izlemeyiDurdurButonu} onPress={izlemeyiDurdur}>
              Izlemeyi durdur
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingTop: 60, alignItems: "center" },
  baslik: { fontSize: 32, fontWeight: "bold", marginBottom: 4 },
  altBaslik: { fontSize: 14, color: "#666", marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    width: "100%",
    marginBottom: 16,
    fontSize: 16,
  },
  butonSatiri: { flexDirection: "row", width: "100%", gap: 12 },
  butonYaris: { flex: 1 },
  taramaKutusu: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    height: 120,
  },
  radarAlani: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  radarMerkez: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#2E7D32",
  },
  taramaMetni: { marginTop: 12, fontSize: 14, color: "#555" },
  hataMetni: { color: "red", marginTop: 16, textAlign: "center" },
  sonucKart: {
    marginTop: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    width: "100%",
    backgroundColor: "#f9f9f9",
  },
  sonucSatir: { fontSize: 16, marginBottom: 6, fontWeight: "600" },
  detayMetni: {
    fontSize: 12,
    color: "#555",
    marginTop: 8,
    fontFamily: "monospace",
  },
  agSonucKart: {
    marginTop: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    width: "100%",
    backgroundColor: "#f0f7f0",
  },
  agBaslik: { fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  cihazSatiri: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  cihazIp: { fontSize: 15, fontFamily: "monospace" },
  cihazDurum: { fontSize: 15 },
  izlemeSatiri: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  izlemeNoktasi: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2E7D32",
    marginRight: 8,
  },
  izlemeMetni: { fontSize: 12, color: "#2E7D32", fontStyle: "italic" },
  izlemeyiDurdurButonu: {
    fontSize: 13,
    color: "#c0392b",
    textAlign: "center",
    marginTop: 14,
    textDecorationLine: "underline",
  },
});
