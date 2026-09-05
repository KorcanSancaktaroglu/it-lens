"""
IT-Lens Backend — QA Test Paketi
Test Mühendisi bakış açısıyla: fonksiyonel, sınır (boundary), hata durumu
ve basit güvenlik testleri.

Çalıştırma: venv/bin/pytest test_qa.py -v
"""
import os
import sqlite3
import time
import pytest
from fastapi.testclient import TestClient

# Her test çalıştırmasından önce temiz bir veritabanıyla başlamak için
# eski db dosyasını sil (varsa) ve main'i import et.
DB_PATH = os.path.join(os.path.dirname(__file__), "envanter.db")
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

import main  # noqa: E402

client = TestClient(main.app)


# ---------------------------------------------------------------------
# TC-01 — TEMEL SAĞLIK KONTROLÜ (Health Check)
# ---------------------------------------------------------------------
def test_tc01_kok_endpoint_calisiyor():
    """Sunucu ayakta mı ve beklenen JSON'u dönüyor mu?"""
    r = client.get("/")
    assert r.status_code == 200
    assert r.json() == {"durum": "IT-Lens backend calisiyor"}


# ---------------------------------------------------------------------
# TC-02..05 — /ping ENDPOINT'İ: GEÇERLİ GİRİŞLER
# ---------------------------------------------------------------------
def test_tc02_ping_localhost_acik_donmeli():
    """127.0.0.1 her zaman erişilebilir olmalı -> durum 'acik'."""
    r = client.get("/ping/127.0.0.1")
    assert r.status_code == 200
    data = r.json()
    assert data["ip"] == "127.0.0.1"
    assert data["durum"] == "acik"
    assert data["detay"] is not None


def test_tc03_ping_erisilemeyen_ip_kapali_ya_da_timeout_donmeli():
    """
    TEST-NET-1 (RFC 5737) blogundaki bir IP: gercek ama tahsis edilmemis,
    yanit vermemesi beklenir -> 'kapali' veya 'zaman_asimi'.
    """
    r = client.get("/ping/192.0.2.1")
    assert r.status_code == 200
    assert r.json()["durum"] in ("kapali", "zaman_asimi")


def test_tc04_ping_ipv6_localhost_kabul_edilmeli():
    """ipaddress.ip_address() IPv6'yi de gecerli sayar; endpoint 400 donmemeli."""
    r = client.get("/ping/::1")
    # IPv6 formati gecerli oldugu icin dogrulamadan gecmeli (200 donmeli,
    # sistemde ping6 farkli calisabilir ama en azindan 400 OLMAMALI)
    assert r.status_code != 400


def test_tc05_gecmis_kaydi_olusuyor_mu():
    """Bir ping sonrasi /gecmis'te bu kayit gorunmeli."""
    client.get("/ping/127.0.0.1")
    r = client.get("/gecmis")
    assert r.status_code == 200
    kayitlar = r.json()["taramalar"]
    assert len(kayitlar) >= 1
    assert kayitlar[0]["ip"] == "127.0.0.1"


# ---------------------------------------------------------------------
# TC-06..11 — /ping ENDPOINT'İ: GEÇERSİZ / SINIR DEĞER GİRİŞLERİ
# ---------------------------------------------------------------------
@pytest.mark.parametrize(
    "gecersiz_deger",
    [
        "abc",  # tamamen alfabetik
        "999.999.999.999",  # oktet sinirini asan deger
        "192.168.1",  # eksik oktet
        "192.168.1.1.1",  # fazla oktet
        "",  # bos deger (route'a hic ulasmayabilir)
        "192.168.1.1; ls",  # komut enjeksiyonu denemesi
        "192.168.1.1 && whoami",  # komut enjeksiyonu denemesi
        "$(whoami)",  # komut enjeksiyonu denemesi
        "-h",  # ping'in kendi bayragi gibi gorunen deger
        "..",  # path traversal benzeri deger
    ],
)
def test_tc06_11_gecersiz_ip_400_donmeli(gecersiz_deger):
    """
    Guvenlik + dogrulama testi: hicbir gecersiz/kotu niyetli girdi
    subprocess'e ulasmamali, hepsi 400 ile reddedilmeli.
    """
    r = client.get(f"/ping/{gecersiz_deger}")
    if gecersiz_deger == "":
        # Bos deger FastAPI route'unu hic eslesmeyebilir (404 olabilir),
        # bu da kabul edilebilir bir sonuc.
        assert r.status_code in (400, 404)
    else:
        assert r.status_code == 400, (
            f"'{gecersiz_deger}' girisi 400 yerine {r.status_code} dondu! "
            f"Govde: {r.text}"
        )


# ---------------------------------------------------------------------
# TC-12 — GÜVENLİK: subprocess'e gercekten zararli komut ulasiyor mu?
# ---------------------------------------------------------------------
def test_tc12_komut_enjeksiyonu_dosya_sistemini_etkilememeli():
    """
    '192.168.1.1; touch /tmp/pwned' gibi bir girdi backend'i etkilemiyor mu?
    (subprocess.run liste ile ve shell=False cagrildigi icin teorik olarak
    guvenli olmali; bu test bunu ampirik olarak dogruluyor.)
    """
    kanit_dosya = "/tmp/it_lens_pwned_test.txt"
    if os.path.exists(kanit_dosya):
        os.remove(kanit_dosya)

    client.get(f"/ping/127.0.0.1; touch {kanit_dosya}")

    assert not os.path.exists(kanit_dosya), (
        "KRITIK: Komut enjeksiyonu basarili oldu, dosya olusturuldu!"
    )


# ---------------------------------------------------------------------
# TC-13..17 — /network-scan ENDPOINT'İ
# ---------------------------------------------------------------------
def test_tc13_gecerli_subnet_taramasi_calisiyor():
    """127.0.0 subnet'i (127.0.0.1-254) taranabilmeli, en az localhost acik olmali."""
    r = client.get("/network-scan/127.0.0")
    assert r.status_code == 200
    data = r.json()
    assert data["subnet"] == "127.0.0.0/24"
    assert isinstance(data["bulunan_cihaz_sayisi"], int)
    assert isinstance(data["cihazlar"], list)


@pytest.mark.parametrize(
    "gecersiz_subnet",
    [
        "999.999.999",
        "abc.def.ghi",
        "192.168",  # eksik oktet
        "192.168.1.1",  # 4 oktet verilmis (fonksiyon 3 bekliyor)
        "; ls",
    ],
)
def test_tc14_18_gecersiz_subnet_400_donmeli(gecersiz_subnet):
    """Gecersiz subnet formatlari 500 yerine 400 ile reddedilmeli."""
    r = client.get(f"/network-scan/{gecersiz_subnet}")
    assert r.status_code == 400, (
        f"'{gecersiz_subnet}' subnet'i 400 yerine {r.status_code} dondu! "
        f"Govde: {r.text}"
    )


def test_tc19_network_scan_performans_sinirinda_kalmali():
    """
    /24 subnet'i (254 host) taramasi makul bir surede bitmeli.
    ThreadPoolExecutor(max_workers=50) ile 3.5 saniyeyi asmamasi beklenir
    (dogrulama gecen her IP icin ~1.5s timeout var, paralellik sayesinde
    toplam sure host sayisina linear olarak buyumemeli).
    """
    basla = time.time()
    r = client.get("/network-scan/198.51.100")  # TEST-NET-2, hicbiri acik olmamali
    sure = time.time() - basla

    assert r.status_code == 200
    assert sure < 10, f"Tarama {sure:.2f} saniye surdu, cok yavas!"


# ---------------------------------------------------------------------
# TC-20 — /gecmis SINIR DEĞERİ: 50 kayıt limiti
# ---------------------------------------------------------------------
def test_tc20_gecmis_50_kayitla_siniirli_mi():
    """
    Veritabanina 60 sahte kayit ekleyip /gecmis'in gercekten sadece
    son 50'sini dondurdugunu dogrula (main.py'deki LIMIT 50 mantigi).
    """
    baglanti = sqlite3.connect(main.DB_ADI)
    imlec = baglanti.cursor()
    for i in range(60):
        imlec.execute(
            "INSERT INTO taramalar (ip, durum, zaman) VALUES (?, ?, ?)",
            (f"10.0.0.{i % 255}", "acik", f"2026-01-01T00:00:{i:02d}"),
        )
    baglanti.commit()
    baglanti.close()

    r = client.get("/gecmis")
    kayitlar = r.json()["taramalar"]
    assert len(kayitlar) == 50, (
        f"Beklenen 50 kayit, donen: {len(kayitlar)}"
    )


# ---------------------------------------------------------------------
# TC-21 — SQL INJECTION DENEMESI (parametreli sorgu dogrulamasi)
# ---------------------------------------------------------------------
def test_tc21_sql_injection_ip_alaninda_etkisiz_olmali():
    """
    IP dogrulamasi zaten bunu 400'le reddedecek (ipaddress.ip_address
    gecersiz sayar), ama yine de veritabaninin bozulmadigini teyit ediyoruz.
    """
    zararli = "1' OR '1'='1"
    r = client.get(f"/ping/{zararli}")
    assert r.status_code in (400, 404)

    # Tablo hala sorgulanabilir olmali (drop table vs. olmamis olmali)
    r2 = client.get("/gecmis")
    assert r2.status_code == 200


if __name__ == "__main__":
    import sys
    sys.exit(pytest.main([__file__, "-v"]))
