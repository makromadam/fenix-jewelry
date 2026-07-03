# FENIX Yönetim Paneli — Backend Kurulumu (tek seferlik, ~5 dk)

Bu adımlar tamamlanınca `/admin` panelindeki **“Canlıya Yayınla”** düğmesi çalışır:
katalog değişiklikleriniz **dosya indirip yüklemeden**, tüm ziyaretçilere birkaç
saniye içinde yansır. Site yine tamamen statik kalır; yalnızca küçük bir “anahtar
değer” deposu (Vercel KV) ve iki hazır sunucu fonksiyonu eklenir.

> Bu kurulum yalnızca **Vercel** hesabınızda yapılabilir (kod hazır, sizin
> hesabınıza erişimimiz yok). Adımlar tıklama düzeyinde basittir.

## Gerekenler
- Proje zaten Vercel'de yayında (`fenixjewelry.co`).
- Depoda bu dosyalar mevcut (panelle birlikte geldi):
  - `api/overrides.js` — herkese açık okuma (yayınlanan kataloğu döndürür)
  - `api/publish.js` — yalnızca yönetici yazma (KV'ye kaydeder)

## Adımlar

### 1) Depoyu (Upstash Redis) oluştur ve projeye bağla
1. Vercel panelinde **Storage → Create a database**.
2. **Upstash — Serverless DB (Redis, …)** satırını seç (soldaki yeşil ikon).
   - Not: Alttaki “Redis — Official Redis for Vercel” TCP bağlantısı verir; bu
     panelin ihtiyaç duyduğu **REST API** için **Upstash**'i seçin.
3. Kurulum akışında bir **Redis** veritabanı oluştur:
   - İsim: örn. `fenix-kv`
   - Bölge (region): Türkiye'ye yakın olsun diye **eu-central-1 / Frankfurt** iyi seçim.
4. Oluşturduktan sonra **Connect Project** ile **fenix-jewelry** projesine bağla
   (Production ortamı; istersen Preview de).
   - Bu işlem REST erişimi için ortam değişkenlerini otomatik ekler. Ada göre
     ikisinden biri olabilir; panelin kodu **ikisini de** tanır:
     `KV_REST_API_URL` / `KV_REST_API_TOKEN` **ya da**
     `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
   - Ekstra bir şey yapmana gerek yok; sadece bağlanmış olması yeterli.

### 2) Yayın anahtarını (şifreyi) ekle
1. Proje → **Settings → Environment Variables**.
2. Yeni değişken ekle:
   - **Name:** `ADMIN_TOKEN`
   - **Value:** güçlü ve gizli bir metin belirleyin (örn. `Fenix-Yayin-7Xk92Qm`).
   - **Environments:** Production (isterseniz Preview de).
3. Kaydet.

### 3) Yeniden yayınla (redeploy)
- **Deployments → en üstteki dağıtım → ⋯ → Redeploy** (ortam değişkenlerinin
  aktif olması için bir kez gerekir).

### 4) Panelden dene
1. `fenixjewelry.co/admin` → giriş yap.
2. **Yayınla & Yedek** sekmesi → üstte “Backend bağlı ✓” yazmalı.
3. **Yayın anahtarı** kutusuna 2. adımdaki `ADMIN_TOKEN` değerini gir.
4. Bir ürünü değiştir → **⚡ Canlıya Yayınla**.
5. Siteyi normal bir ziyaretçi gibi (farklı tarayıcı/telefon) aç → değişiklik
   birkaç saniye içinde görünür.

## Nasıl çalışır (kısa)
- Panel “Canlıya Yayınla” dediğinde, düzenlemeleriniz `POST /api/publish` ile
  (anahtarınızla doğrulanarak) KV'ye yazılır.
- Her sayfa yüklenişinde `GET /api/overrides.js` bu veriyi döndürür ve site onu
  temel kataloğun üzerine uygular. Backend boş/kapalıysa, depodaki
  `assets/fenix.overrides.js` (dosya yöntemi) devreye girer — yani hiçbir şey bozulmaz.

## Güvenlik
- Asıl güvenlik sınırı **`ADMIN_TOKEN`**'dır: bu anahtar olmadan kimse yayına
  yazamaz. Panelin giriş şifresi (PIN) yalnızca arayüzü gizler.
- `ADMIN_TOKEN`'ı gizli tutun; sızarsa Vercel'den değerini değiştirip redeploy edin.
- Okuma uç noktası herkese açıktır (katalog zaten herkese açık).

## Sık sorulanlar
- **KV kurmak istemiyorum:** Sorun değil — panel, dosya indirip
  `assets/fenix.overrides.js` ile değiştirme yöntemiyle de çalışır.
- **Büyük görsel yükleyince “çok büyük” hatası:** Backend'e yazarken görselleri
  dosya yerine **bağlantı (URL)** olarak ekleyin; ya da dosya yöntemini kullanın.
- **Değişiklik geç görünüyor:** Uç nokta ~20 sn önbelleklenir; kısa süre sonra
  otomatik güncellenir.
