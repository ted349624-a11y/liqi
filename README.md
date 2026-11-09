# Liqi GTD Mint

Liqi ([@liqiely](https://x.com/liqiely)) için GTD çekiliş sayfası.

**Akış:** X kullanıcı adı → X görevleri sırayla (takip, beğeni, RT, kendi yazdığın yorum) → EVM cüzdan → çekiliş bileti (x1 hak + referans linki, her ref +x1).

## Vercel kurulumu

1. Vercel'de **Add New → Project** ile bu repoyu içe aktar ve Deploy et. Build ayarı gerekmez.
2. Projede **Storage** sekmesi → **Upstash** (Redis) → oluştur ve bu projeye bağla.
   `KV_REST_API_URL` ve `KV_REST_API_TOKEN` ortam değişkenleri otomatik eklenir.
3. **Settings → Environment Variables** kısmına `ADMIN_KEY` ekle (uzun, tahmin edilemez bir şifre).
4. **Redeploy** et ki yeni değişkenler devreye girsin.

## Ayarlar

`index.html` içinde, en alttaki `CONFIG` bloğu:

| Alan | Ne yazılır |
|---|---|
| `tweetId` | GTD duyuru postunun ID'si. Beğeni/RT/yorum butonları bu postu açar. |
| `siteUrl` | Sitenin canlı adresi (ref linkleri için), örn. `https://liqi-gtd.vercel.app` |
| `api` | `"/api"` olarak kalsın. |

`og:image` ve `twitter:image` etiketlerini tam adresle değiştir, örn. `https://liqi-gtd.vercel.app/assets/og-image.png`.

## API

| Yol | Ne yapar |
|---|---|
| `POST /api/submit` | `{x, wallet, ref, tasks}` kaydeder. Bir cüzdan tek X hesabına bağlanır; ref sadece ilk kayıtta yazılır, kişi kendini ref'leyemez. Dakikada IP başına 10 istek. |
| `GET /api/stats?x=kullanici` | `{refs, entries}` döner. |
| `GET /api/export?key=ADMIN_KEY` | Tüm katılımcıları CSV indirir: x, wallet, ref, refs, entries, ts. |

Ref, ancak gelen kişi görevleri bitirip cüzdanını girdiğinde sayılır.

Not: X görevleri kullanıcının onayına dayanır, X bunları ücretsiz API ile doğrulatmaz. Kazananları seçmeden önce kullanıcı adlarını kontrol et.
