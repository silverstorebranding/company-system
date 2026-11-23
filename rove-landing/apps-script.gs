const SHEET_ID = '16UgzToP87tB8IokZtekJ9QhCb_3k_5fsuz_fi4HJ-Oo';
const HEADERS = ['رقم الطلب','التاريخ','الاسم','الموبايل','المحافظة','العنوان','المنتجات','العدد','سعر القطعة','قبل الشحن','الشحن','الإجمالي','ملاحظات','المصدر','الحالة'];

function doGet() {
  return ContentService.createTextOutput('OK');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const o = JSON.parse(e.postData.contents);
    const sh = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
    sh.appendRow([o.id, o.created_at, o.name, "'" + o.phone, o.gov, o.address, o.items, o.count,
                  o.unit_price, o.subtotal, o.shipping, o.total, o.notes, o.source, 'جديد']);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// شغّلي دي مرة واحدة من زرار Run عشان توافقي على الصلاحيات
function setup() {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
}
