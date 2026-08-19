import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Button,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

const BACKEND_URL = "http://192.168.1.106:8000";

// Ana ekrandaki (index.tsx) ile ayni radar animasyonu
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

export default function QrTaramaEkrani() {
  const [izin, izinIste] = useCameraPermissions();
  const [taramaAktif, setTaramaAktif] = useState(true);
  const [sorgulaniyor, setSorgulaniyor] = useState(false);
  const [sonuc, setSonuc] = useState<any>(null);

  if (!izin) {
    return (
      <View style={styles.merkez}>
        <Text>Kamera izni kontrol ediliyor...</Text>
      </View>
    );
  }

  if (!izin.granted) {
    return (
      <View style={styles.merkez}>
        <Text style={styles.mesaj}>Kamerayi kullanmak icin izin gerekiyor</Text>
        <Button title="Izin Ver" onPress={izinIste} />
      </View>
    );
  }

  const qrOkundu = async ({ data }: { data: string }) => {
    if (!taramaAktif) return;
    setTaramaAktif(false);
    setSorgulaniyor(true);

    let ip = data.trim();
    ip = ip.replace(/^https?:\/\//i, "");
    ip = ip.replace(/\/$/, "");
    ip = ip.replace(/[\r\n]/g, "");

    try {
      const response = await fetch(`${BACKEND_URL}/ping/${ip}`);
      const json = await response.json();
      setSonuc(json);
    } catch (err) {
      Alert.alert("Hata", "Backend a baglanilamadi: " + String(err));
      setTaramaAktif(true);
    } finally {
      setSorgulaniyor(false);
    }
  };

  const yenidenTara = () => {
    setSonuc(null);
    setTaramaAktif(true);
  };

  return (
    <View style={styles.container}>
      {taramaAktif ? (
        <CameraView
          style={styles.kamera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={qrOkundu}
        />
      ) : (
        <View style={styles.merkez}>
          {sorgulaniyor && (
            <>
              <RadarAnimasyonu />
              <Text style={styles.taramaMetni}>Cihaz sorgulaniyor...</Text>
            </>
          )}

          {!sorgulaniyor && sonuc && (
            <View style={styles.sonucKart}>
              <Text style={styles.sonucBaslik}>QR Okundu</Text>
              <Text style={styles.sonucSatir}>IP: {sonuc.ip}</Text>
              <Text style={styles.sonucSatir}>
                Durum:{" "}
                {sonuc.durum === "acik"
                  ? "🟢 Acik"
                  : sonuc.durum === "kapali"
                    ? "🔴 Kapali"
                    : "⚠️ Zaman Asimi"}
              </Text>
            </View>
          )}

          {!sorgulaniyor && (
            <Button title="Tekrar Tara" onPress={yenidenTara} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kamera: { flex: 1 },
  merkez: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  mesaj: { fontSize: 16, marginBottom: 16, textAlign: "center" },
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
  sonucKart: {
    padding: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    backgroundColor: "#f9f9f9",
    marginBottom: 20,
    width: "100%",
  },
  sonucBaslik: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  sonucSatir: { fontSize: 16, marginBottom: 6 },
});
