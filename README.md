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

## /claim sayfası

`/claim` aynı sayfayı açar (`vercel.json` yönlendirmesi); akış ve kayıt aynıdır. Fark son ekrandadır: cüzdan girildikten sonra 35 $ELYUSD bakiye ve $LIQIELY'ye henüz açılmamış ("Coming soon") bir swap paneli gösterilir. Bakiye yalnızca arayüzde gösterilir; zincir üstünde bir token ya da transfer yoktur.

## Davet linki

Cüzdanını giren herkese `siteUrl/?ref=kullanici` linki verilir ve bu linkle kayıt olanların sayısı ona gösterilir. Davet, gelen kişi görevleri bitirip cüzdanını girdiğinde ve yalnızca ilk kaydında sayılır; kişi kendini davet edemez.

## Listeyi sıfırlama (yeni tur)

`lib/db.js` içindeki `ROUND` ve `index.html` içindeki `CONFIG.round` değerini birlikte bir artır, push et. Sayaç 0'dan başlar, herkes görevleri yeniden yapar. Eski turların kayıtları silinmez; `/api/export?key=…&round=1` ile indirilebilir.

## API

| Yol | Ne yapar |
|---|---|
| `POST /api/submit` | `{x, wallet, tasks}` kaydeder. Bir cüzdan tek X hesabına bağlanır. IP başına dakikada 10 istek. |
| `GET /api/stats?x=kullanici` | `{refs}` — o kişinin davet linkiyle kayıt olanların sayısı. |
| `GET /api/count` | `{count}` — listedeki cüzdan sayısı. |
| `GET /api/export?key=ADMIN_KEY` | Tüm kayıtlar CSV (`x, wallet, ref, refs, tasks, ts`). |
| `GET /api/export?key=ADMIN_KEY&format=wallets&limit=300` | Sadece cüzdanlar, en eski kayıttan başlayarak, satır satır. |

Not: X görevleri kullanıcı onayına dayanır; X bunları ücretsiz API ile doğrulatmaz. Kazananları seçmeden önce handle'ları postta kontrol et.
