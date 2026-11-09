# Liqi GTD Mint

Liqi ([@liqiely](https://x.com/liqiely)) için GTD çekiliş sayfası.

**Akış:** X kullanıcı adı → X görevleri sırayla (takip, beğeni, RT, kendi yazdığın yorum) → EVM cüzdan → çekiliş bileti (x1 hak + referans linki, her ref +x1).

## Yayına alma

Statik bir site; build gerekmez. Repoyu Vercel, Netlify veya GitHub Pages'e bağlaman yeterli.

## Ayarlar

`index.html` içinde, en alttaki `CONFIG` bloğu:

| Alan | Ne yazılır |
|---|---|
| `tweetId` | GTD duyuru postunun ID'si. Beğeni/RT/yorum butonları bu postu açar. |
| `submitUrl` | `apps-script.gs` dağıtımından gelen `/exec` URL'si. |
| `siteUrl` | Sitenin canlı adresi (ref linkleri için). |

Paylaşım görselinin X'te görünmesi için `og:image` ve `twitter:image` etiketlerini tam adresle değiştir, örn. `https://liqi-gtd.vercel.app/assets/og-image.png`.

## Kayıtlar ve ref sayımı

`apps-script.gs` dosyasını bir Google Sheet'in Apps Script'ine yapıştır ve Web uygulaması olarak dağıt (adımlar dosyanın başında). Her katılımcı tek satır olarak tabloya düşer; ref sayısı oradan okunur.

Not: X görevleri kullanıcının onayına dayanır, X bunları ücretsiz API ile doğrulatmaz. Kazananları seçmeden önce kullanıcı adlarını kontrol et.
