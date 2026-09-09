# IT-Lens 🔍

**IT-Lens**, kurumsal ağ ortamlarında cihaz envanterinin manuel olarak (örneğin bir Excel tablosuyla) takip edilmesinin yarattığı zaman kaybını ortadan kaldırmak amacıyla geliştirilmiş, mobil öncelikli bir **ağ tanılama ve envanter yönetim aracıdır**.

**IT-Lens** is a mobile-first **network diagnostics and inventory management tool**, built to eliminate the time loss caused by manually tracking device inventories (e.g. via a spreadsheet) in corporate network environments.

Proje, Trakya Üniversitesi Bilgisayar Mühendisliği Bölümü öğrencisi tarafından, Lüleburgaz Belediyesi Bilgi İşlem Müdürlüğü'nde gerçekleştirilen yazılım stajı kapsamında geliştirilmiştir.

Developed by a Trakya University Computer Engineering student during a software internship at the Lüleburgaz Municipality IT Department.

---

## 🎯 Motivasyon / Motivation

Staj sürecinin ilk günlerinde, kurumun ağ envanterinin (hangi cihazın hangi IP'de olduğu, hangisinin çalışır durumda olduğu) elle tutulan bir tabloyla takip edildiği gözlemlenmiştir. Bu süreç hem zaman alıcı hem de hataya açık bir yöntemdir. IT-Lens, bu ihtiyaca yönelik olarak; IT personelinin sahada, telefonundan tek dokunuşla cihaz durumu sorgulayabilmesini, ağ genelinde tarama yapabilmesini ve geçmiş kayıtlara ulaşabilmesini hedefler.

During the early days of the internship, it was observed that the institution's network inventory (which device has which IP, which ones are online) was tracked using a manually maintained spreadsheet — a slow and error-prone process. IT-Lens addresses this by letting IT staff query device status, scan the network, and review past records directly from their phone in the field.

---

## ✨ Özellikler / Features

- **Tekli IP Sorgulama / Single IP Lookup:** Girilen bir IP adresine anlık ping atarak cihazın açık/kapalı durumunu ve gecikme süresini gösterir. — Pings a given IP address and shows its online/offline status along with round-trip time.
- **Ağ Tarama / Subnet Scan:** Belirtilen bir alt ağı (örn. `192.168.1.0/24`) paralel olarak tarayıp aktif cihazları listeler. — Scans a given subnet (e.g. `192.168.1.0/24`) in parallel and lists active devices.
- **Canlı Cihaz İzleme ve Bildirim / Live Device Monitoring & Alerts:** Bir ağ taraması sonrası bulunan cihazlar otomatik olarak arka planda periyodik aralıklarla (varsayılan 20 saniye) yeniden kontrol edilir; bir cihazın durumu değişirse (örn. açık → kapalı) anlık bir yerel bildirim (push notification) gönderilir. Bu izleme uygulama ön planda (foreground) olduğu sürece aktiftir. — Devices found by a subnet scan are automatically re-checked in the background at a set interval (default 20 seconds); if a device's status changes (e.g. online → offline), a local push notification is triggered immediately. Monitoring is active as long as the app is in the foreground.
- **QR Kod ile Hızlı Erişim / QR Code Quick Access:** Cihazlara atanmış QR etiketlerini okutarak IP'yi elle girmeden durum sorgular. — Scans a device's QR label to query its status without manually typing the IP.
- **Tarama Geçmişi / Scan History:** Tüm sorgular tarih/saat damgasıyla SQLite'ta saklanır ve "Geçmiş" ekranından incelenebilir. — All queries are timestamped and stored in SQLite, viewable from the "History" screen.

---

## 🏗️ Mimari / Architecture

```
┌─────────────────────┐        HTTP (REST)        ┌──────────────────────┐
│   Mobil Uygulama     │ ───────────────────────▶  │   Backend (API)      │
│  React Native/Expo   │ ◀───────────────────────  │  FastAPI + Uvicorn   │
└─────────────────────┘         JSON Response       └──────────┬───────────┘
                                                                │
                                                        subprocess (ping)
                                                                │
                                                                ▼
                                                        Yerel Ağ (LAN)
```

| Katman / Layer                                         | Teknoloji / Technology                                           | Neden / Why                                                                                                |
| ------------------------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Mobil / Frontend**                                   | React Native + Expo (SDK 57), TypeScript                         | Tip güvenliği ve tek kod tabanıyla iOS/Android desteği — Type safety and a single codebase for iOS/Android |
| **Backend**                                            | Python 3, FastAPI, Uvicorn (ASGI)                                | Asenkron yapı, I/O yoğun işlemler için uygun — Async design, well-suited to I/O-bound tasks                |
| **Ağ Tanılama / Network Diagnostics**                  | Python `subprocess`                                              | İşletim sistemi bağımsız çalışma — Cross-platform operation                                                |
| **Canlı İzleme & Bildirim / Live Monitoring & Alerts** | `expo-notifications` + periyodik `setInterval` sorgusu           | Durum değişikliklerini anlık olarak kullanıcıya iletir — Delivers status changes to the user in real time  |
| **Veritabanı / Database**                              | SQLite                                                           | Hafif, sunucusuz yerel depolama — Lightweight, serverless local storage                                    |
| **QR Kod / QR Code**                                   | `qrcode[pil]` (üretim/generation) / Expo Camera (okuma/scanning) | Hızlı ve az bağımlılıklı çözüm — Fast, low-dependency solution                                             |

---

## 🚀 Kurulum / Setup

### Backend

```bash
# Sanal ortam oluşturma / Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Bağımlılıkların kurulumu / Install dependencies
python -m pip install -r requirements.txt

# Sunucuyu başlatma / Start the server
uvicorn main:app --reload --host 0.0.0.0
```

> **Önemli / Important:** `--host 0.0.0.0` parametresi mutlaka eklenmelidir — aksi halde sunucu varsayılan olarak sadece `127.0.0.1` (yani sadece bilgisayarın kendisi) üzerinden erişilebilir olur ve mobil cihazdan (Expo Go) bağlanılamaz. — The `--host 0.0.0.0` flag is required — without it, the server defaults to `127.0.0.1` only, meaning it won't be reachable from a mobile device (Expo Go) on the same network.

Bu şekilde sunucu `http://0.0.0.0:8000` üzerinden, yani ağdaki tüm arayüzlerden erişilebilir hale gelir (bilgisayarının LAN IP'si üzerinden telefonundan bağlanabilirsin).
This makes the server listen on all network interfaces at `http://0.0.0.0:8000`, so it's reachable from your phone via your computer's LAN IP.

### Mobil Uygulama / Mobile App

```bash
# Projeyi klonlama / Clone the repo
git clone https://github.com/KorcanSancaktaroglu/it-lens.git
cd it-lens/frontend

# Bağımlılıkların kurulumu / Install dependencies
npm install

# Bildirim modülünün kurulumu / Install the notifications module
npx expo install expo-notifications

# Geliştirme sunucusunu başlatma (LAN modu) / Start dev server (LAN mode)
npx expo start
```

Fiziksel cihazınızda test etmek için **Expo Go** uygulamasını kullanabilir, telefonunuzun bilgisayarınızla **aynı Wi-Fi ağına** bağlı olduğundan emin olabilirsiniz. Canlı izleme özelliğinin bildirim gönderebilmesi için, uygulama ilk açıldığında istenen **bildirim izninin** onaylanması gerekir.
To test on a physical device, use the **Expo Go** app and make sure your phone is on the **same Wi-Fi network** as your computer. For the live monitoring feature to send notifications, you must grant the **notification permission** prompted on first launch.

> **Not / Note:** Kurumsal ağlarda ICMP (ping) trafiği güvenlik duvarı tarafından engellenebilir; bu durumda test için iç ağdaki (LAN) cihazlar kullanılmalıdır. — ICMP (ping) traffic may be blocked by the firewall on corporate networks; use LAN-internal devices for testing in that case.

---

## 🧪 Testler / Tests

Backend, fonksiyonel, sınır değer (boundary) ve güvenlik testlerini kapsayan bir `pytest` test paketi ile doğrulanmıştır. Testler; geçerli/geçersiz IP ve subnet girişlerini, komut enjeksiyonu (command injection) denemelerini, SQL injection direncini, performans sınırlarını ve `/gecmis` endpoint'inin 50 kayıt limitini kapsar.

The backend is validated with a `pytest` suite covering functional, boundary, and security cases — including valid/invalid IP and subnet inputs, command-injection attempts, SQL-injection resistance, performance limits, and the 50-record cap on `/gecmis`.

```bash
cd backend
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS/Linux

pip install pytest httpx
pytest test_qa.py -v
```

**Sonuç / Result:** 25 test senaryosundan **24'ü başarılı** (24/25 passed). Tek başarısız olan senaryo (`/ping/..`), uygulamanın kendisiyle değil, HTTP istemcilerinin `..` gibi path segmentlerini RFC 3986 standardına göre otomatik olarak temizlemesiyle ilgilidir — zararsız bir davranıştır, güvenlik açığı oluşturmaz.

Of the 25 test cases, **24 passed**. The single failure (`/ping/..`) stems from HTTP clients normalizing `..` path segments per RFC 3986 before the request reaches the app — a harmless behavior, not a security issue.

**Öne çıkan güvenlik testi / Key security test:** Komut enjeksiyonu denemeleri (`; touch /tmp/pwned`, `$(whoami)`, `&& whoami` vb.) hepsi başarıyla reddedildi; `subprocess.run()`'ın liste argümanlarıyla (`shell=False`) çağrılması ve IP doğrulama katmanı birlikte bu riski ortadan kaldırıyor. — Command-injection attempts were all successfully rejected, thanks to `subprocess.run()` being called with list arguments (`shell=False`) combined with the IP-validation layer.

---

## 🗺️ Yol Haritası / Roadmap

- [ ] `scapy`/`nmap` entegrasyonu ile daha gelişmiş port taraması / Advanced port scanning via `scapy`/`nmap`
- [ ] Bulut tabanlı veritabanına geçiş (Firebase/Supabase) / Migration to a cloud-based database (Firebase/Supabase)
- [x] Cihaz durumu için push bildirimleri / Push notifications for device status
- [ ] Uygulama kapalıyken de çalışan arka plan izleme (background task) / Background monitoring that works even when the app is closed

---

## 💼 Ticari Potansiyel / Commercial Potential

IT-Lens şu an için bir staj projesi olarak, tek bir kurumun (Lüleburgaz Belediyesi) ihtiyacına yönelik geliştirilmiştir ve herhangi bir ticari amaç taşımamaktadır. Bununla birlikte, benzer büyüklükteki belediyeler, küçük-orta ölçekli işletmeler (KOBİ) veya okul/kampüs ağları gibi, kendi IT altyapısını sınırlı kaynaklarla yöneten kurumlar için de uygulanabilir bir çözüm olma potansiyeli taşımaktadır. İleride çok kurumlu (multi-tenant) bir yapıya, bulut tabanlı senkronizasyona ve rol bazlı erişim kontrolüne (RBAC) genişletilmesi hâlinde, hafif bir "IT varlık yönetimi" (IT asset management) ürününe dönüşebilir.

IT-Lens is currently developed as an internship project for a single institution (Lüleburgaz Municipality) and carries no commercial intent at this stage. That said, it has potential applicability for similarly sized municipalities, small-to-medium businesses (SMBs), or school/campus networks that manage their own IT infrastructure with limited resources. With future extensions — such as multi-tenant support, cloud-based synchronization, and role-based access control (RBAC) — it could evolve into a lightweight IT asset management product.

---

## 📄 Lisans / License

Bu proje, Trakya Üniversitesi Bilgisayar Mühendisliği Bölümü staj programı kapsamında eğitim amaçlı geliştirilmiştir.
This project was developed for educational purposes as part of the Trakya University Computer Engineering internship program.

---

## 👤 Geliştirici / Developer

**Gökhan Korcan Sancaktaroğlu**
Trakya Üniversitesi – Bilgisayar Mühendisliği / Trakya University – Computer Engineering
Staj Yeri / Internship Site: Lüleburgaz Belediyesi, Bilgi İşlem Müdürlüğü

---

## 🤖 Yapay Zeka Desteği Hakkında / On AI Assistance

Bu proje geliştirilirken, çekirdek mantık ve mimari kararlar tarafımca alınmış olmakla birlikte; bazı noktalarda (hata mesajlarının yorumlanması, kod okunabilirliğinin artırılması, dokümantasyon metinlerinin düzenlenmesi ve bu README dosyasının yazımı gibi) yapay zeka destekli araçlardan (GitHub Copilot / ChatGPT / Claude vb.) faydalanılmıştır. Bu, günümüz yazılım geliştirme pratiğinde yaygın bir yöntemdir; projenin problem tanımı, mimari tasarımı ve uygulanan çözümler öğrenciye aittir.

While the core logic and architectural decisions in this project were made by the author, AI-assisted tools (GitHub Copilot / ChatGPT / Claude, etc.) were used for certain parts — such as interpreting error messages, improving code readability, refining documentation text, and writing this README. This is common practice in modern software development; the problem definition, architecture, and implemented solutions belong to the student.
