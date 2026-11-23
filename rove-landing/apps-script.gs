// الصقي الكود ده في Google Sheet ← Extensions ← Apps Script، وبعدين Deploy ← New deployment ← Web app
// Execute as: Me  |  Who has access: Anyone
// وابعتي لينك الـ Web app (اللي آخره /exec).
const HEADERS = ['رقم الطلب','التاريخ','الاسم','الموبايل','المحافظة','العنوان','المنتجات','العدد','سعر القطعة','قبل الشحن','الشحن','الإجمالي','ملاحظات','المصدر','الحالة'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const o = JSON.parse(e.postData.contents);
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
    sh.appendRow([o.id, o.created_at, o.name, "'" + o.phone, o.gov, o.address, o.items, o.count,
                  o.unit_price, o.subtotal, o.shipping, o.total, o.notes, o.source, 'جديد']);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
