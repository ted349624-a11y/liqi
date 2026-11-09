/**
 * Liqi GTD — Google Sheets backend
 *
 * Kurulum:
 * 1. Yeni bir Google Sheet aç. Uzantılar → Apps Script.
 * 2. Bu kodun tamamını yapıştır, kaydet.
 * 3. Dağıt → Yeni dağıtım → Tür: Web uygulaması
 *    - Şu kullanıcı olarak yürüt: Ben
 *    - Erişimi olanlar: Herkes
 * 4. Verilen /exec URL'sini index.html içindeki CONFIG.submitUrl alanına yapıştır.
 *
 * Sayfa sütunları: time | x | wallet | ref | tasks
 * Her X kullanıcı adı tek satır tutulur (tekrar gönderirse cüzdanı güncellenir).
 * Ref sayısı = ref sütununda bu kullanıcının adı geçen, görevleri bitirip cüzdan girmiş kişi sayısı.
 */

const SHEET = "entries";

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(["time", "x", "wallet", "ref", "tasks"]);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    const x = String(d.x || "").trim();
    const wallet = String(d.wallet || "").trim();
    let ref = String(d.ref || "").trim();
    if (!/^[A-Za-z0-9_]{1,15}$/.test(x)) return json_({ ok: false, error: "bad_x" });
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) return json_({ ok: false, error: "bad_wallet" });
    if (!/^[A-Za-z0-9_]{1,15}$/.test(ref) || ref.toLowerCase() === x.toLowerCase()) ref = "";

    const sh = sheet_();
    const rows = sh.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][1]).toLowerCase() === x.toLowerCase()) {
        // existing user: update wallet only, keep original referrer
        sh.getRange(i + 1, 3).setValue(wallet);
        return json_({ ok: true, updated: true });
      }
    }
    sh.appendRow([new Date(), x, wallet, ref, (d.tasks || []).join(",")]);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const x = String((e.parameter && e.parameter.x) || "").toLowerCase();
  if (!x) return json_({ refs: 0 });
  const rows = sheet_().getDataRange().getValues();
  let refs = 0;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][3]).toLowerCase() === x) refs++;
  }
  return json_({ refs: refs, entries: 1 + refs });
}
