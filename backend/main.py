from fastapi import FastAPI, HTTPException
import subprocess
import platform
import sqlite3
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import ipaddress

app = FastAPI()

DB_ADI = "envanter.db"

def veritabani_baslat():
    baglanti = sqlite3.connect(DB_ADI)
    imlec = baglanti.cursor()
    imlec.execute("""
        CREATE TABLE IF NOT EXISTS taramalar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip TEXT NOT NULL,
            durum TEXT NOT NULL,
            zaman TEXT NOT NULL
        )
    """)
    baglanti.commit()
    baglanti.close()

# Uygulama baslarken veritabanini ve tabloyu hazirla
veritabani_baslat()


@app.get("/")
def test():
    return {"durum": "IT-Lens backend calisiyor"}


@app.get("/ping/{ip_adresi}")
def ping_at(ip_adresi: str):
    # Gecersiz IP formatlarini (orn. bos deger, komut satiri parametresi
    # gibi gorunen degerler) ping komutuna gondermeden once reddet.
    try:
        ipaddress.ip_address(ip_adresi)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Gecersiz IP adresi formati: '{ip_adresi}'"
        )

    param = "-n" if platform.system().lower() == "windows" else "-c"
    komut = ["ping", param, "1", ip_adresi]

    try:
        sonuc = subprocess.run(komut, capture_output=True, text=True, timeout=3)
        basarili = sonuc.returncode == 0
        durum = "acik" if basarili else "kapali"
        detay = sonuc.stdout
    except subprocess.TimeoutExpired:
        durum = "zaman_asimi"
        detay = None

    baglanti = sqlite3.connect(DB_ADI)
    imlec = baglanti.cursor()
    imlec.execute(
        "INSERT INTO taramalar (ip, durum, zaman) VALUES (?, ?, ?)",
        (ip_adresi, durum, datetime.now().isoformat())
    )
    baglanti.commit()
    baglanti.close()

    return {
        "ip": ip_adresi,
        "durum": durum,
        "detay": detay
    }


@app.get("/gecmis")
def gecmis_taramalar():
    baglanti = sqlite3.connect(DB_ADI)
    baglanti.row_factory = sqlite3.Row
    imlec = baglanti.cursor()
    imlec.execute("SELECT * FROM taramalar ORDER BY id DESC LIMIT 50")
    kayitlar = [dict(satir) for satir in imlec.fetchall()]
    baglanti.close()
    return {"taramalar": kayitlar}


def tek_ip_tara(ip_str: str):
    sistem = platform.system().lower()
    if sistem == "windows":
        komut = ["ping", "-n", "1", "-w", "500", ip_str]
    else:
        komut = ["ping", "-c", "1", "-W", "1", ip_str]

    try:
        sonuc = subprocess.run(komut, capture_output=True, text=True, timeout=1.5)
        if sonuc.returncode == 0:
            return {"ip": ip_str, "durum": "acik"}
    except subprocess.TimeoutExpired:
        pass
    return None


@app.get("/network-scan/{subnet_on_eki}")
def ag_tara(subnet_on_eki: str):
    # subnet_on_eki "192.168.1" gibi ilk 3 oktet olmali; gecersiz
    # bir deger gelirse ip_network cökmeden once yakalayip anlamli
    # bir hata donuyoruz (orn. 500 yerine 400).
    try:
        ag = ipaddress.ip_network(f"{subnet_on_eki}.0/24", strict=False)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Gecersiz subnet formati: '{subnet_on_eki}' "
                   f"(orn: 192.168.1)"
        )

    ip_listesi = [str(ip) for ip in ag.hosts()]

    acik_cihazlar = []
    with ThreadPoolExecutor(max_workers=50) as havuz:
        sonuclar = havuz.map(tek_ip_tara, ip_listesi)
        for sonuc in sonuclar:
            if sonuc is not None:
                acik_cihazlar.append(sonuc)

    baglanti = sqlite3.connect(DB_ADI)
    imlec = baglanti.cursor()
    for cihaz in acik_cihazlar:
        imlec.execute(
            "INSERT INTO taramalar (ip, durum, zaman) VALUES (?, ?, ?)",
            (cihaz["ip"], "acik", datetime.now().isoformat())
        )
    baglanti.commit()
    baglanti.close()

    return {
        "subnet": f"{subnet_on_eki}.0/24",
        "bulunan_cihaz_sayisi": len(acik_cihazlar),
        "cihazlar": acik_cihazlar
    }