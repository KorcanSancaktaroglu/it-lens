import { useCallback, useEffect, useRef, useState } from "react";
import * as Notifications from "expo-notifications";

import { BACKEND_URL } from "@/constants/api";

export type CihazDurumu = "acik" | "kapali" | "zaman_asimi";

export type IzlenenCihaz = {
  ip: string;
  durum: CihazDurumu;
};

// Cihazlarin ne siklikta yeniden kontrol edilecegini belirler (ms).
// Backend'e asiri yuk bindirmemek icin 15sn'nin altina inilmemesi onerilir.
const IZLEME_ARALIGI_MS = 20000;

const DURUM_METNI: Record<CihazDurumu, string> = {
  acik: "Acik",
  kapali: "Kapali",
  zaman_asimi: "Zaman Asimi",
};

// Uygulama on planda (foreground) iken de bildirimlerin gorunmesini sagla.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function bildirimIzniIste() {
  const mevcut = await Notifications.getPermissionsAsync();
  if (mevcut.status !== "granted") {
    await Notifications.requestPermissionsAsync();
  }
}

async function durumDegisikligiBildir(
  ip: string,
  eskiDurum: CihazDurumu,
  yeniDurum: CihazDurumu,
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Cihaz durumu degisti: ${ip}`,
      body: `${DURUM_METNI[eskiDurum]} -> ${DURUM_METNI[yeniDurum]}`,
    },
    trigger: null, // null = hemen gonder
  });
}

/**
 * Bir ag taramasi (subnet scan) sonrasi bulunan cihazlari periyodik
 * olarak yeniden pingleyip durum degisikliklerini izler; bir cihazin
 * durumu degisirse (orn. acik -> kapali) yerel bir bildirim gonderir.
 *
 * SINIRLAMA: Bu izleme sadece uygulama on planda (acik) oldugu surece
 * calisir. Telefon kilitliyken veya uygulama kapaliyken bildirim
 * gelmesi icin ayri bir arka plan gorev (background task) mekanizmasi
 * gerekir.
 *
 * Watches devices found by a subnet scan, re-pinging them periodically
 * and firing a local notification when a device's status flips.
 * LIMITATION: only runs while the app is in the foreground.
 */
export function useDeviceMonitor() {
  const [izlenenler, setIzlenenler] = useState<IzlenenCihaz[]>([]);
  const [izlemeAktif, setIzlemeAktif] = useState(false);
  const zamanlayici = useRef<ReturnType<typeof setInterval> | null>(null);
  const izlenenIpler = useRef<string[]>([]);

  const izlemeyiDurdur = useCallback(() => {
    if (zamanlayici.current) {
      clearInterval(zamanlayici.current);
      zamanlayici.current = null;
    }
    setIzlemeAktif(false);
  }, []);

  const birKontrolDongusu = useCallback(async () => {
    const sonuclar = await Promise.all(
      izlenenIpler.current.map(async (ip): Promise<IzlenenCihaz> => {
        try {
          const yanit = await fetch(`${BACKEND_URL}/ping/${ip}`);
          const veri = await yanit.json();
          return { ip, durum: veri.durum as CihazDurumu };
        } catch {
          return { ip, durum: "kapali" };
        }
      }),
    );

    setIzlenenler((oncekiListe) => {
      sonuclar.forEach((yeni) => {
        const eski = oncekiListe.find((c) => c.ip === yeni.ip);
        if (eski && eski.durum !== yeni.durum) {
          durumDegisikligiBildir(yeni.ip, eski.durum, yeni.durum);
        }
      });
      return sonuclar;
    });
  }, []);

  const izlemeyiBaslat = useCallback(
    async (cihazlar: { ip: string }[]) => {
      if (cihazlar.length === 0) return;

      await bildirimIzniIste();

      izlenenIpler.current = cihazlar.map((c) => c.ip);
      setIzlenenler(cihazlar.map((c) => ({ ip: c.ip, durum: "acik" })));
      setIzlemeAktif(true);

      if (zamanlayici.current) clearInterval(zamanlayici.current);
      zamanlayici.current = setInterval(birKontrolDongusu, IZLEME_ARALIGI_MS);
    },
    [birKontrolDongusu],
  );

  // Bilesen kaldirildiginda zamanlayiciyi temizle (memory leak onlemi).
  useEffect(() => {
    return () => {
      if (zamanlayici.current) clearInterval(zamanlayici.current);
    };
  }, []);

  return {
    izlenenler,
    izlemeAktif,
    izlemeyiBaslat,
    izlemeyiDurdur,
    izlemeAraligiSaniye: IZLEME_ARALIGI_MS / 1000,
  };
}
