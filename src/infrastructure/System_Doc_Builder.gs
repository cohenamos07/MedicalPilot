/**
 * Version: 0.5.1
 * Module: System_Doc_Builder
 * Role: Build and update system documentation sheet
 * Description: Scans sheets, code files, functions, and updates mapping table.
 */

function createOrUpdateSystemDoc_v5() {
  const ss = SpreadsheetApp.getActive();
  const sheetName = "תיעוד מערכת";
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  unlockSheet(sheet);
  updateDailyStatus(sheet);
  updateStaticSections(sheet);
  const sheetData = scanSheets_v1();
  const codeData = scanCodeFiles_v2();
  updateMappingTable_v2(sheet, sheetData, codeData);
  lockSheet(sheet);
  sheet.setFrozenRows(2);
}

function updateDailyStatus(sheet) {
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
  sheet.insertRowBefore(2);
  sheet.getRange("A2").setValue("סטטוס יומי (" + now + "): מוכן לעדכון.");
  sheet.getRange("A2").setFontWeight("bold").setBackground("#fff2cc");
  sheet.getRange("B2:G2").clearContent();
}

function updateStaticSections(sheet) {
  sheet.getRange("A3").setValue(
    "כללי עבודה:\n" +
    "1. כל התוכן בעברית בלבד (למעט קוד).\n" +
    "2. אסור לשנות מבנה גיליונות.\n" +
    "3. חובה תיעוד מלא לכל קובץ ופונקציה.\n" +
    "4. כל שינוי קוד מחייב עדכון גרסה.\n" +
    "5. כל שינוי מתועד בשורות 22+."
  );
  sheet.getRange("B3").setValue(
    "כללי ניהול גרסאות:\n" +
    "1. כל קובץ חייב לכלול: Module, Version, Role, Description.\n" +
    "2. כל פונקציה חייבת לכלול: Function, Version, Purpose, Inputs, Outputs.\n" +
    "3. שינוי קטן = Patch, בינוני = Minor, גדול = Major.\n" +
    "4. קוד ללא גרסה → אסור לשימוש.\n" +
    "5. אם חסר תיעוד – יסומן בצהוב.\n" +
    "6. פונקציות פנימיות יסומנו כ'פנימיות'."
  );
  sheet.getRange("C3").setValue(
    "כללי שימוש בשירותים חיצוניים:\n" +
    "1. שימוש רק בשירותים חינמיים.\n" +
    "2. שירות בתשלום → לעצור ולהתריע.\n" +
    "3. אם אין חלופה חינמית – להציע פתרון עוקף.\n" +
    "4. אין לבצע אינטגרציה לשירות בתשלום ללא אישור.\n" +
    "5. עדיפות לשירותים מובנים של Apps Script בלבד."
  );
  sheet.getRange("D3").setValue(
    "כלל סנכרון גיטהאב:\n" +
    "1. כל קובץ בגיטהאב חייב להיות קיים בשמו המדויק בעורך.\n" +
    "2. אין להעלות לגיטהאב פונקציות שאינן בקובץ עצמאי בעורך.\n" +
    "3. לפני העלאה לגיטהאב — ודא שהקובץ קיים בעורך."
  );
  sheet.getRange("E3").setValue(
    "כלל עדכון אוטומטי:\n" +
    "1. אין לעדכן את הגיליון או גיטהאב ידנית.\n" +
    "2. יש להשתמש תמיד בכלי הסנכרון:\n" +
    "   - updateSystemContext לגיליון\n" +
    "   - pushContextToGitHub לגיטהאב\n" +
    "   - endSessionSync לשניהם יחד."
  );
  sheet.getRange("A6").setValue("מיפוי מערכת (טבלה):").setFontWeight("bold");
}

function scanSheets_v1() {
  const ss = SpreadsheetApp.getActive();
  const sheets = ss.getSheets();
  let results = [];
  sheets.forEach(sh => {
    const name = sh.getName();
    const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const fields = header.filter(h => h && h.toString().trim() !== "");
    results.push({ type: "גיליון", name: name, description: name.replace(/_/g, " "), fields: fields.join(", "), dependency: "—", version: "—" });
  });
  return results;
}

function scanCodeFiles_v2() {
  const files = DriveApp.getFilesByType(MimeType.GOOGLE_APPS_SCRIPT);
  let results = [];
  while (files.hasNext()) {
    const file = files.next();
    const content = file.getBlob().getDataAsString();
    const moduleInfo = extractModuleMetadata(content);
    const functions = extractFunctions_v2(content, moduleInfo.module);
    results.push({ fileName: file.getName(), module: moduleInfo.module, version: moduleInfo.version, role: moduleInfo.role, description: moduleInfo.description, functions: functions });
  }
  return results;
}

function extractModuleMetadata(content) {
  return {
    module: getMatch(content, /Module:\s*(.*)/) || "—",
    version: getMatch(content, /Version:\s*([0-9]+\.[0-9]+\.[0-9]+)/) || "—",
    role: getMatch(content, /Role:\s*(.*)/) || "—",
    description: getMatch(content, /Description:\s*(.*)/) || "—"
  };
}

function extractFunctions_v2(content, moduleName) {
  const regex = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
  let match;
  let list = [];
  while ((match = regex.exec(content)) !== null) {
    const name = match[1];
    list.push({ type: name.startsWith("_") ? "פונקציה (פנימית)" : "פונקציה", name: name, description: "חסר תיעוד", fields: "—", dependency: moduleName, version: "—" });
  }
  return list;
}

function updateMappingTable_v2(sheet, sheetData, codeData) {
  const startRow = 7;
  const header = ["סוג", "שם", "תיאור", "שדות", "תלות", "גרסה"];
  sheet.getRange(startRow, 1, 1, header.length).setValues([header]).setFontWeight("bold").setBackground("#cfe2f3");
  let rows = [];
  sheetData.forEach(item => { rows.push([item.type, item.name, item.description, item.fields, item.dependency, item.version]); });
  codeData.forEach(file => {
    rows.push(["ספרייה", file.module, file.description, "—", file.role, file.version]);
    file.functions.forEach(fn => { rows.push([fn.type, fn.name, fn.description, fn.fields, fn.dependency, fn.version]); });
  });
  sheet.getRange(startRow + 1, 1, rows.length, header.length).setValues(rows);
  rows.forEach((row, i) => {
    if (row[2] === "חסר תיעוד" || row[5] === "—") {
      sheet.getRange(startRow + 1 + i, 1, 1, header.length).setBackground("#fff2cc");
    }
  });
}

function unlockSheet(sheet) { try { sheet.protect().remove(); } catch (e) {} }
function lockSheet(sheet) { sheet.protect().setWarningOnly(true); }
function getMatch(text, regex) { const m = text.match(regex); return m ? m[1].trim() : null; }

/**
 * MedicalPilot — System Context Module
 * פונקציה לעדכון גיליון חפיפה למודל AI
 * גרסה: v97.5 | תאריך: 09/04/2026
 */
function updateSystemContext() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "תיעוד מערכת AI";
  let sheet = ss.getSheetByName(sheetName);
  try {
    if (!sheet) { sheet = ss.insertSheet(sheetName); }
    sheet.clearContents();
    sheet.clearFormats();
    const headers = [["Model_Instructions", "Version_Protocol", "AI_Preferences", "Backup_Procedure", "System_Notes", "Current_Versions", "Critical_Modules"]];
    sheet.getRange("A1:G1").setValues(headers).setBackground("#333333").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
    const now = Utilities.formatDate(new Date(), "GMT+3", "yyyy-MM-dd HH:mm");
    sheet.getRange("A2").setValue("סטטוס יומי (" + now + "): מוכן לעדכון.");
    sheet.getRange("A2:G2").setBackground("#fff2cc").setFontWeight("bold");
    sheet.setFrozenRows(2);
    const rulesRow = [[
      "כללי עבודה:\n1. כל התוכן נכתב בעברית בלבד.\n2. אסור לשנות מבנה גיליונות.\n3. אסור להחזיר קוד חלקי.\n4. חובה להגיש תכנון לפני כתיבת קוד.\n5. כל קוד חייב לכלול גרסה ותיאור שינוי.\n6. כל שינוי מתועד בגליון.\n7. שורות 22+ להיסטוריה בלבד.",
      "כללי ניהול גרסאות:\n1. גרסאות LAB ו-PROD נפרדות.\n2. אין לדלג על מספרי גרסאות.\n3. שינוי קטן = Patch, בינוני = Minor, גדול = Major.\n4. כל שינוי קוד מחייב עדכון גרסה.\n5. כל שינוי גרסה מתועד ב-Current_Versions.",
      "העדפות AI:\n1. תשובות ברורות ומפורטות.\n2. עברית כברירת מחדל.\n3. קוד מלא בלבד בתיבת העתקה.\n4. תכנון לפני קוד.\n5. הסברים צעד-אחר-צעד.\n6. שמות פונקציות ברורים.\n7. אין לחשוף מידע רגיש.\n8. עמוס מוגבל ביד ימין — תמיד תיבת העתקה.\n9. עמוס אינו מתכנת — קוד מלא בלבד.",
      "נהלי גיבוי:\n1. גיבוי ידני לפני כל שינוי.\n2. גיבוי לפני כל שינוי גרסה.\n3. שמירת Snapshot לכל שינוי משמעותי.\n4. אין למחוק גיבויים.\n5. כל גיבוי מתועד בהיסטוריה.",
      "כלל סנכרון גיטהאב:\n1. כל קובץ בגיטהאב חייב להיות קיים בשמו המדויק בעורך.\n2. אין להעלות לגיטהאב פונקציות שאינן בקובץ עצמאי בעורך.\n3. לפני העלאה — ודא שהקובץ קיים בעורך.\n\nכלל עדכון אוטומטי:\n1. אין לעדכן ידנית.\n2. יש להשתמש תמיד בכלי הסנכרון:\n   - updateSystemContext לגיליון\n   - pushContextToGitHub לגיטהאב\n   - endSessionSync לשניהם יחד.",
      "גרסאות נוכחיות:\nPROD: v97.5\nLAB: v97.5\nתאריך עדכון: 09/04/2026",
      "מודולים קריטיים:\nSystem_Logger.gs — תלוי שורה 6\nMenu_PROD.gs — תפריט ייצור\nMenu_LAB.gs — תפריט מעבדה\nMain.gs — נקודת כניסה\nGitHubSync.gs — סנכרון קוד"
    ]];
    sheet.getRange("A3:G3").setValues(rulesRow).setVerticalAlignment("top");
    sheet.getRange("A4").setValue("מיפוי 15 שירותים:");
    sheet.getRange("A4:G4").setBackground("#cfe2f3").setFontWeight("bold");
    const servicesData = [
      ["S01", "בדיקת בוקר טוב", "System_HealthCheck.gs", "פעיל", ""],
      ["S02", "הרשאות גישה", "S02_Auth.gs", "אזהרה", "לא מחובר לתפריט"],
      ["S03", "סריקת Gmail", "Mod_Ingestion.gs", "פעיל חלקית", ""],
      ["S04", "סריקת Drive", "Service_Folders.gs", "פעיל חלקית", ""],
      ["S05", "חילוץ מטא-דאטה", "AI_Parser_Utility.gs", "אזהרה", "נכשל בקבצים כבדים"],
      ["S06", "הכנה ל-OCR", "Mod_Brain_OCR.gs", "מעבדה", "Prompt מתבלבל"],
      ["S07", "סיווג מסמכים", "AI_Header_Extractor.gs", "שגיאה", "לא שומר תיקונים"],
      ["S08", "אימות ידני", "Sidebar.html", "אזהרה", ""],
      ["S09", "חילוץ שדות", "Lab_Extractor.gs", "פעיל", ""],
      ["S10", "סנכרון GitHub", "GitHubSync.gs", "פעיל", ""],
      ["S11", "ניהול לוגים", "System_Logger.gs", "תוקן", "פורק לפונקציות מינימליות"],
      ["S12", "משימות פיתוח", "DevManagement.gs", "פעיל", ""],
      ["S13", "אבחון AI", "Check_Models.gs", "פעיל", ""],
      ["S14", "הגדרות תשתית", "appsscript.json", "פעיל", ""],
      ["S15", "בדיקות QA", "טסטים_ניסוייה.gs", "חלקי", "מכסה 30% בלבד"]
    ];
    sheet.getRange("A5:E19").setValues(servicesData);
    sheet.getRange("A20").setValue("משימה הבאה:");
    sheet.getRange("B20").setValue("בניית INDEX.md בגיטהאב + המשך תיעוד 15 שירותים");
    sheet.getRange("A20:G20").setBackground("#d9ead3").setFontWeight("bold");
    sheet.getRange("A21:D21").setValues([["קישורים קריטיים:", "גיליון: docs.google.com/spreadsheets/d/1uYnt-wleYpuk1ZrX7fTn2HDZ12PNWBEFRDGqHQN_U4I", "עורך: script.google.com/u/0/home/projects/1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf", "גיטהאב: github.com/cohenamos07/MedicalPilot"]]);
    sheet.setColumnWidth(1, 120); sheet.setColumnWidth(2, 200); sheet.setColumnWidth(3, 200);
    sheet.setColumnWidth(4, 200); sheet.setColumnWidth(5, 250); sheet.setColumnWidth(6, 180); sheet.setColumnWidth(7, 220);
    sheet.getRange("A1:G21").setWrap(true);
    SpreadsheetApp.getUi().alert("תיעוד מערכת AI עודכן בהצלחה");
  } catch (e) {
    Logger.log("שגיאה בעדכון תיעוד: " + e.message);
    SpreadsheetApp.getUi().alert("שגיאה בעדכון הגיליון: " + e.message);
  }
}