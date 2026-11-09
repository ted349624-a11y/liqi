# Liqi — Claim your welcome bonus

[@liqiely](https://x.com/liqiely) için karşılama bonusu ($35) sayfası.

**Akış:** X kullanıcı adı → X görevleri (takip, beğeni, repost, kendi yazdığın yorum, bildirim aç) → Robinhood Wallet (Ethereum, `0x…`) adresi → liste onayı.

## Vercel kurulumu

1. Vercel → **Add New → Project** → bu repoyu içe aktar → Deploy. Build ayarı gerekmez (statik `index.html` + `api/` fonksiyonları).
2. Projede **Storage → Upstash (Redis)** oluştur ve bağla. `KV_REST_API_URL` / `KV_REST_API_TOKEN` otomatik eklenir (`UPSTASH_REDIS_REST_URL` / `_TOKEN` da çalışır).
3. **Settings → Environment Variables** → `ADMIN_KEY` ekle (uzun, tahmin edilemez bir şifre).
4. **Redeploy**.

## Ayarlar

`index.html` en alttaki `CONFIG` bloğu:

| Alan | Açıklama |
|---|---|
| `handle` | X hesabı (`liqiely`) |
| `tweetId` | Duyuru postunun ID'si (URL'deki rakamlar). Boşsa beğeni/repost/yorum butonları profili açar. |
| `siteUrl` | Canlı adres (paylaşım linki ve og:image için) |

`og:image` / `twitter:image` etiketlerindeki alan adını kendi adresinle güncelle.

## API

| Yol | Ne yapar |
|---|---|
| `POST /api/submit` | `{x, wallet, tasks}` kaydeder. Bir cüzdan tek X hesabına bağlanır. IP başına dakikada 10 istek. |
| `GET /api/count` | `{count}` — listedeki cüzdan sayısı. |
| `GET /api/export?key=ADMIN_KEY` | Tüm kayıtlar CSV (`x, wallet, tasks, ts`). |
| `GET /api/export?key=ADMIN_KEY&format=wallets&limit=300` | Sadece cüzdanlar, en eski kayıttan başlayarak, satır satır. |

Not: X görevleri kullanıcı onayına dayanır; X bunları ücretsiz API ile doğrulatmaz. Kazananları seçmeden önce handle'ları postta kontrol et.
