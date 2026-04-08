# دليل إعداد Google Sheets (الحل النهائي الجذري)

سبب عدم ظهور البيانات واستيعابها في "الانتظار" هو أن أنظمة جوجل (عندما ترسل لها من ملف على كمبيوكرك مباشرة) تقوم بعمل إعادة توجيه (Redirect) أمني يؤدي أحياناً إلى "حذف" البيانات المخفية (POST Body) فتصل لجوجل فارغة! 

الحل العبقري والسليم 100% هو تمرير البيانات بشكل سريع ومكشوف عبر الرابط (GET Request).

## انسخ هذا الكود الجديد (والأخير):

1. ادخل للـ Apps Script الخاص بملفك وامسح الكود القديم.
2. الصق الكود التالي (المعدل كلياً ليعمل بطريقة الاستقبال بالرابط وتجاوز الحماية المحلية):

```javascript
// تم دمج النظام كاملاً في دالة doGet لتجنب حذف البيانات عند إعادة توجيه الروابط
function doGet(e) {
  try {
    // فحص ما إذا كان هناك بيانات مرسلة (مبلغ وملاحظة)
    if (e.parameter.amount && e.parameter.timestamp) {
        var timestamp = e.parameter.timestamp;
        var amount = e.parameter.amount;
        var note = e.parameter.note;
        
        var doc = SpreadsheetApp.getActiveSpreadsheet();
        var sheet = doc.getSheets()[0]; 
        
        var emptyRow = 10;
        var lastRow = Math.max(sheet.getLastRow(), 10);
        
        // البحث عن فراغ في العمود B ابتداءً من 10
        var range = sheet.getRange(10, 2, Math.max(1, lastRow - 9 + 5), 1).getValues(); 
        var foundEmpty = false;
        for (var i = 0; i < range.length; i++) {
           if (range[i][0] === "" || range[i][0] === null) {
              emptyRow = 10 + i;
              foundEmpty = true;
              break;
           }
        }
        
        // كتابة البيانات
        var targetRange = sheet.getRange(emptyRow, 2, 1, 3);
        targetRange.setValues([[note, timestamp, amount]]);
        
        // نسخ التنسيق الدقيق للخلايا للحفاظ على الجمالية
        if (emptyRow > 10) {
           var prevRowRange = sheet.getRange(emptyRow - 1, 1, 1, 4);
           var currRowRange = sheet.getRange(emptyRow, 1, 1, 4);
           prevRowRange.copyTo(currRowRange, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
           
           var colA = sheet.getRange(emptyRow, 1);
           if (colA.getValue() === "") {
              var prevA = sheet.getRange(emptyRow - 1, 1).getValue();
              if (typeof prevA === 'number') {
                 colA.setValue(prevA + 1);
              }
           }
        }
        
        return ContentService.createTextOutput(JSON.stringify({ result: 'success' })).setMimeType(ContentService.MimeType.JSON);
    } 
    
    // إذا فتحنا الرابط فارغاً
    return ContentService.createTextOutput("برنامج تسجيل المصاريف متصل، ونظام الاستقبال جاهز عبر الرابط!").setMimeType(ContentService.MimeType.TEXT);
      
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. بعد النسخ، لا تنسى، يجب إنشاء عنوان جديد! اضغط إيقونة الـ **Save**.
4. اضغط **Deploy** -> **New deployment** (إذا استخدمت Manage Deployments يجب أن تختار New version إجبارياً، الأسهل New deployment).
5. تأكد من أن Who has access: **Anyone**.
6. انسخ الرابط الجديد، وسأقوم أنا بإضافته من أجلك لاحقاً حالما تخبرني به، أو ضعه أنت في `app.js` مباشرة!
