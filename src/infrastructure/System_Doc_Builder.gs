/**
 * MedicalPilot — System Context Module
 * פונקציה לעדכון גיליון חפיפה למודל AI
 * גרסה: v97.5 | תאריך: 07/04/2026
 */

function updateSystemContext() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "תיעוד מערכת AI";
  let sheet = ss.getSheetByName(sheetName);

  try {
    // 1. בדיקת קיום הגיליון או יצירתו
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    // 2. ניקוי תוכן ועיצוב קיים
    sheet.clearContents();
    sheet.clearFormats();

    // 3. הגדרת כותרות שורה 1
    const headers = [
      ["Model_Instructions", "Version_Protocol", "AI_Preferences", "Backup_Procedure", "System_Notes", "Current_Versions", "Critical_Modules"]
    ];
    const headerRange = sheet.getRange("A1:G1");
    headerRange.setValues(headers)
      .setBackground("#333333")
      .setFontColor("#ffffff")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");

    // 4. כתיבת שורה 2 - סטטוס יומי דינמי
    const now = Utilities.formatDate(new Date(), "GMT+3", "yyyy-MM-dd HH:mm");
    const dailyStatus = "סטטוס יומי (" + now + "): מוכן לעדכון.";
    sheet.getRange("A2").setValue(dailyStatus);
    sheet.getRange("A2:G2").setBackground("#fff2cc").setFontWeight("bold");

    // 5. הקפאת שורות
    sheet.setFrozenRows(2);

    // 6. כתיבת שורה 3 - כללים קבועים
    const rulesRow = [
      [
        "כללי עבודה:\n1. כל התוכן במערכת נכתב בעברית בלבד, למעט קוד ושמות טכניים.\n2. אסור לשנות מבנה גיליונות ושמות גיליונות.\n3. אסור להחזיר קוד חלקי.\n4. חובה להגיש תכנון לפני כתיבת קוד.\n5. כל קוד חייב לכלול גרסה, תיאור שינוי והוראות בדיקה.\n6. כל שינוי חייב להיות מתועד בגליון.\n7. שורות 22+ משמשות להיסטוריה בלבד.",
        "כללי ניהול גרסאות:\n1. גרסאות LAB ו-PROD נפרדות.\n2. אין לדלג על מספרי גרסאות.\n3. שינוי קטן = Patch, שינוי בינוני = Minor, שינוי גדול = Major.\n4. כל שינוי קוד מחייב עדכון גרסה.\n5. כל שינוי גרסה מתועד גם בתא Current_Versions.",
        "העדפות AI:\n1. תשובות ברורות, מסודרות ומפורטות.\n2. עברית כברירת מחדל.\n3. קוד מלא בלבד, בתיבת העתקה אחת.\n4. תכנון לפני קוד.\n5. הסברים צעד-אחר-צעד.\n6. שמות פונקציות ברורים.\n7. אין לחשוף מידע רגיש, מפתחות API, אסימונים או סיסמאות.\n8. עמוס מוגבל ביד ימין — תמיד תיבת העתקה.\n9. עמוס אינו מתכנת — קוד מלא בלבד, לא קטעים.",
        "נהלי גיבוי:\n1. גיבוי ידני לפני כל שינוי — שמור גרסה ב-Apps Script.\n2. גיבוי לפני כל שינוי גרסה.\n3. שמירת Snapshot לכל שינוי משמעותי.\n4. אין למחוק גיבויים.\n5. כל גיבוי מתועד בהיסטוריה.",
        "",
        "גרסאות נוכחיות:\nPROD: v97.5\nLAB: v97.5\nתאריך עדכון אחרון: 07/04/2026",
        "מודולים קריטיים:\nSystem_Logger.gs — תלוי שורה 6, אסור לגעת במבנה\nMenu_PROD.gs — תפריט ייצור\nMenu_LAB.gs — תפריט מעבדה\nMain.gs — נקודת כניסה ראשית\nGitHubSync.gs — סנכרון קוד"
      ]
    ];
    sheet.getRange("A3:G3").setValues(rulesRow).setVerticalAlignment("top");

    // 7. כתיבת שורה 4 - כותרת שירותים
    sheet.getRange("A4").setValue("מיפוי 15 שירותים:");
    sheet.getRange("A4:G4").setBackground("#cfe2f3").setFontWeight("bold");

    // 8. כתיבת שורות 5-19 - נתוני 15 השירותים
    const servicesData = [
      ["S01", "בדיקת בוקר טוב", "S01_HealthCheck.gs", "פעיל", ""],
      ["S02", "הרשאות גישה", "S02_Auth.gs", "אזהרה", "קוד קיים בגרסה ישנה, לא מחובר לתפריט"],
      ["S03", "סריקת Gmail", "S03_MailScanner.gs", "פעיל", ""],
      ["S04", "סריקת Drive", "S04_DriveSync.gs", "פעיל", ""],
      ["S05", "חילוץ מטא-דאטה", "S05_MetaExtract.gs", "אזהרה", "נכשל בקבצים כבדים"],
      ["S06", "הכנה ל-OCR", "S06_OCR.gs", "מעבדה", "Prompt מתבלבל"],
      ["S07", "סיווג מסמכים", "S07_Classifier.gs", "שגיאה", "לא שומר תיקונים ידניים"],
      ["S08", "אימות ידני ולמידה", "S08_ManualReview.gs", "אזהרה", ""],
      ["S09", "חילוץ שדות מלא", "S09_FieldExtract.gs", "פעיל", ""],
      ["S10", "סנכרון GitHub", "S10_GitHubSync.gs", "פעיל", ""],
      ["S11", "ניהול לוגים", "S11_Logger.gs", "תוקן", "פורק לפונקציות מינימליות 07/04/2026"],
      ["S12", "משימות פיתוח", "S12_TaskManager.gs", "פעיל", ""],
      ["S13", "אבחון AI", "S13_AIDiag.gs", "פעיל", ""],
      ["S14", "הגדרות תשתית", "S14_Config.gs", "פעיל", ""],
      ["S15", "בדיקות QA", "S15_QA.gs", "חלקי", "מכסה 30% בלבד"]
    ];
    sheet.getRange("A5:E19").setValues(servicesData);

    // 9. כתיבת שורה 20 - משימה הבאה
    sheet.getRange("A20").setValue("משימה הבאה:");
    sheet.getRange("B20").setValue("בניית פונקציית סנכרון אוטומטי לגיטהאב — העלאת כל קבצי הקוד בלחיצת כפתור");
    sheet.getRange("A20:G20").setBackground("#d9ead3").setFontWeight("bold");

    // 10. כתיבת שורה 21 - קישורים קריטיים
    const linksRow = [
      ["קישורים קריטיים:", "גיליון ראשי: docs.google.com/spreadsheets/d/1uYnt-wleYpuk1ZrX7fTn2HDZ12PNWBEFRDGqHQN_U4I", "עורך קוד: script.google.com/u/0/home/projects/1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf", "גיטהאב: github.com/cohenamos07/MedicalPilot"]
    ];
    sheet.getRange("A21:D21").setValues(linksRow);

    // 11. הגדרות עיצוב סופיות (רוחב עמודות ועיטוף טקסט)
    sheet.setColumnWidth(1, 120); // A
    sheet.setColumnWidth(2, 200); // B
    sheet.setColumnWidth(3, 200); // C
    sheet.setColumnWidth(4, 200); // D
    sheet.setColumnWidth(5, 250); // E
    sheet.setColumnWidth(6, 180); // F
    sheet.setColumnWidth(7, 220); // G
    
    sheet.getRange("A1:G21").setWrap(true);

    return "תיעוד מערכת AI עודכן בהצלחה";

  } catch (e) {
    Logger.log("שגיאה בעדכון תיעוד: " + e.message);
    throw new Error("נכשל בעדכון הגיליון: " + e.message);
  }
}
