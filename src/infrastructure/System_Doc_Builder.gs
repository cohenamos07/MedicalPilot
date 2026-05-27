/**
 * MedicalPilot — System_Doc_Builder.gs
 * @version 1.5.3 | @updated 27/05/2026 20:23 | @service INFRA
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/System_Doc_Builder.gs
 * @impacts בניית גיליונות תיעוד מערכת וניהול משימות פיתוח.
 *          כולל: גיליון תיעוד AI, גיליון קשרי שירות, גיליון ניהול_משימות.
 *          פונקציות משימות: הוספה, סגירה, דוח יומי וסיום סשן.
 *          נקרא מציורים בגיליון ומהתפריט — אינו חלק מזרימת עיבוד אוטומטי.
 * שינוי: [v1.5.3] task_SyncToday הפכה לטופס HTML אינטראקטיבי (showModalDialog).
 *                נוספה task_AddFromDialog — שמירת משימה יחידה מהטופס עם כל השדות.
 *                תמיכה בסטטוס, עדיפות, מודול, תיאור, Task_ID אוטומטי, תאריך פתיחה/סגירה.
 * שינוי: [v1.5.2] תוקן באג קריטי ב-task_LoadList — getLastRow() הושפע מ-Data Validation
 *                על 200 שורות וגרם לכתיבה לשורה 205+. עבר לסריקת עמודת Task_ID.
 *                נוסף try-catch ו-flush. תוקנה בדיקת כפילויות (case-insensitive).
 *                תוקן באג עדיפות ריקה ב-task_SyncToday.
 * שינוי: [v1.5.1] נוספה task_SyncToday — טעינה אינטראקטיבית של משימות יום מאייקון.
 *                פורמט קלט: מודול|תיאור|עדיפות (שורה אחת למשימה).
 *                צמד לאייקון C2 בגיליון ניהול_משימות.
 * שינוי: [v1.5.0] task_SessionStart אוחדה עם task_RunReport —
 *                רענון צבעים וספירת משימות בוצעו בתחילת הפונקציה,
 *                ולאחר מכן מוצג סדר יום מקובץ לפי ספרייה ודחיפות.
 *                task_RunReport הפכה לעטיפה שקוראת ל-task_SessionStart
 *                בלבד — לא נמחקת כדי לא לשבור ציורים מוצמדים.
 */

// ══════════════════════════════════════════════════════════════════
// בניית גיליון תיעוד מערכת
// ══════════════════════════════════════════════════════════════════

function createOrUpdateSystemDoc_v5() {
  const ss = SpreadsheetApp.getActive();
  const sheetName = "תיעוד מערכת";
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  unlockSheet(sheet);
  updateDailyStatus(sheet);
  updateStaticSections(sheet);
  const sheetData = scanSheets_v1();
  const codeData  = scanCodeFiles_v2();
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
  const ss      = SpreadsheetApp.getActive();
  const sheets  = ss.getSheets();
  let results   = [];
  sheets.forEach(sh => {
    const name   = sh.getName();
    const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const fields = header.filter(h => h && h.toString().trim() !== "");
    results.push({
      type:        "גיליון",
      name:        name,
      description: name.replace(/_/g, " "),
      fields:      fields.join(", "),
      dependency:  "—",
      version:     "—"
    });
  });
  return results;
}

function scanCodeFiles_v2() {
  const files   = DriveApp.getFilesByType(MimeType.GOOGLE_APPS_SCRIPT);
  let results   = [];
  while (files.hasNext()) {
    const file       = files.next();
    const content    = file.getBlob().getDataAsString();
    const moduleInfo = extractModuleMetadata(content);
    const functions  = extractFunctions_v2(content, moduleInfo.module);
    results.push({
      fileName:    file.getName(),
      module:      moduleInfo.module,
      version:     moduleInfo.version,
      role:        moduleInfo.role,
      description: moduleInfo.description,
      functions:   functions
    });
  }
  return results;
}

function extractModuleMetadata(content) {
  return {
    module:      getMatch(content, /Module:\s*(.*)/)                       || "—",
    version:     getMatch(content, /Version:\s*([0-9]+\.[0-9]+\.[0-9]+)/) || "—",
    role:        getMatch(content, /Role:\s*(.*)/)                         || "—",
    description: getMatch(content, /Description:\s*(.*)/)                 || "—"
  };
}

function extractFunctions_v2(content, moduleName) {
  const regex = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
  let match;
  let list = [];
  while ((match = regex.exec(content)) !== null) {
    const name = match[1];
    list.push({
      type:        name.startsWith("_") ? "פונקציה (פנימית)" : "פונקציה",
      name:        name,
      description: "חסר תיעוד",
      fields:      "—",
      dependency:  moduleName,
      version:     "—"
    });
  }
  return list;
}

function updateMappingTable_v2(sheet, sheetData, codeData) {
  const startRow = 7;
  const header   = ["סוג", "שם", "תיאור", "שדות", "תלות", "גרסה"];
  sheet.getRange(startRow, 1, 1, header.length)
    .setValues([header]).setFontWeight("bold").setBackground("#cfe2f3");
  let rows = [];
  sheetData.forEach(item => {
    rows.push([item.type, item.name, item.description, item.fields, item.dependency, item.version]);
  });
  codeData.forEach(file => {
    rows.push(["ספרייה", file.module, file.description, "—", file.role, file.version]);
    file.functions.forEach(fn => {
      rows.push([fn.type, fn.name, fn.description, fn.fields, fn.dependency, fn.version]);
    });
  });
  sheet.getRange(startRow + 1, 1, rows.length, header.length).setValues(rows);
  rows.forEach((row, i) => {
    if (row[2] === "חסר תיעוד" || row[5] === "—") {
      sheet.getRange(startRow + 1 + i, 1, 1, header.length).setBackground("#fff2cc");
    }
  });
}

function unlockSheet(sheet) { try { sheet.protect().remove(); } catch (e) {} }
function lockSheet(sheet)   { sheet.protect().setWarningOnly(true); }
function getMatch(text, regex) { const m = text.match(regex); return m ? m[1].trim() : null; }

// ══════════════════════════════════════════════════════════════════
// עדכון גיליון תיעוד מערכת AI
// ══════════════════════════════════════════════════════════════════

function updateSystemContext() {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "תיעוד מערכת AI";
  let sheet       = ss.getSheetByName(sheetName);
  try {
    if (!sheet) { sheet = ss.insertSheet(sheetName); }
    sheet.clearContents();
    sheet.clearFormats();
    const headers = [["Model_Instructions", "Version_Protocol", "AI_Preferences", "Backup_Procedure", "System_Notes", "Current_Versions", "Critical_Modules"]];
    sheet.getRange("A1:G1").setValues(headers)
      .setBackground("#333333").setFontColor("#ffffff")
      .setFontWeight("bold").setHorizontalAlignment("center");
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
      "גרסאות נוכחיות:\nPROD: v10.5\nLAB: v10.7\nתאריך עדכון: 25/05/2026",
      "מודולים קריטיים:\nSystem_Logger.gs — תלוי שורה 6\nMenu_PROD.gs — תפריט ייצור\nMenu_LAB.gs — תפריט מעבדה\nMain.gs — נקודת כניסה\nGitHubSync.gs — סנכרון קוד"
    ]];
    sheet.getRange("A3:G3").setValues(rulesRow).setVerticalAlignment("top");
    sheet.getRange("A4").setValue("מיפוי 15 שירותים:");
    sheet.getRange("A4:G4").setBackground("#cfe2f3").setFontWeight("bold");
    const servicesData = [
      ["S01", "בדיקת בוקר טוב",   "System_HealthCheck.gs", "פעיל",        ""],
      ["S02", "הרשאות גישה",       "Auth_Check.gs",         "פעיל",        ""],
      ["S03", "סריקת Gmail",       "Mod_Ingestion.gs",      "פעיל חלקית", ""],
      ["S04", "סריקת Drive",       "S04_DriveSync.gs",      "פעיל חלקית", ""],
      ["S05", "חילוץ מטא-דאטה",   "S05_MetaExtract.gs",    "אזהרה",       "נכשל בקבצים כבדים"],
      ["S06", "המרה ל-TXT",        "S06_ConvertTXT.gs",     "פעיל",        ""],
      ["S07", "סיווג מסמכים",      "S07_Classify.gs",       "פעיל",        ""],
      ["S08", "אימות ידני ולמידה", "S08_Validate.gs",       "בפיתוח",      ""],
      ["S09", "חילוץ שדות",        "Lab_Extractor.gs",      "פעיל",        ""],
      ["S10", "סנכרון GitHub",     "EditorToGitHub.gs",     "פעיל",        ""],
      ["S11", "ניהול לוגים",       "System_Logger.gs",      "תוקן",        "תלוי שורה 6"],
      ["S12", "משימות פיתוח",      "DevManagement.gs",      "פעיל",        ""],
      ["S13", "אבחון AI",          "Check_Models.gs",       "פעיל",        ""],
      ["S14", "הגדרות תשתית",     "appsscript.json",       "פעיל",        ""],
      ["S15", "בדיקות QA",         "QA_Tests.gs",           "חלקי",        "מכסה 30% בלבד"]
    ];
    sheet.getRange("A5:E19").setValues(servicesData);
    sheet.getRange("A20").setValue("משימה הבאה:");
    sheet.getRange("B20").setValue("פיתוח S08 אימות ידני + סנכרון מלא");
    sheet.getRange("A20:G20").setBackground("#d9ead3").setFontWeight("bold");
    sheet.getRange("A21:D21").setValues([[
      "קישורים קריטיים:",
      "גיליון: docs.google.com/spreadsheets/d/1uYnt-wleYpuk1ZrX7fTn2HDZ12PNWBEFRDGqHQN_U4I",
      "עורך: script.google.com/u/0/home/projects/1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf",
      "גיטהאב: github.com/cohenamos07/MedicalPilot"
    ]]);
    sheet.setColumnWidth(1, 120); sheet.setColumnWidth(2, 200);
    sheet.setColumnWidth(3, 200); sheet.setColumnWidth(4, 200);
    sheet.setColumnWidth(5, 250); sheet.setColumnWidth(6, 180);
    sheet.setColumnWidth(7, 220);
    sheet.getRange("A1:G21").setWrap(true);
    SpreadsheetApp.getUi().alert("תיעוד מערכת AI עודכן בהצלחה");
  } catch (e) {
    Logger.log("שגיאה בעדכון תיעוד: " + e.message);
    SpreadsheetApp.getUi().alert("שגיאה בעדכון הגיליון: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// ניהול משימות — Task Manager
// @version 1.5.1 | @updated 27/05/2026 | @service INFRA
// מבנה עמודות:
//   A=Task_ID | B=Open_Date | C=Closed_Date | D=Status
//   E=Module  | F=Description | G=Priority  | H=Notes
// הקפאה: 4 עמודות ראשונות (A–D)
// ══════════════════════════════════════════════════════════════════

const TASK_SHEET_NAME   = "ניהול_משימות";
const TASK_HEADER_ROW   = 4;
const TASK_DATA_START   = 5;
const TASK_COLOR_HEADER = "#1a3a5c";
const TASK_COLOR_WHITE  = "#FFFFFF";
const TASK_COLOR_RED    = "#F4CCCC";
const TASK_COLOR_GREEN  = "#B7E1CD";
const TASK_COLOR_YELLOW = "#FCE8B2";

const COL_TASK_ID     = 1;  // A
const COL_OPEN_DATE   = 2;  // B
const COL_CLOSED_DATE = 3;  // C
const COL_STATUS      = 4;  // D
const COL_MODULE      = 5;  // E
const COL_DESC        = 6;  // F
const COL_PRIORITY    = 7;  // G
const COL_NOTES       = 8;  // H

// ══════════════════════════════════════════════════════════════════
// SETUP — מריצים פעם אחת בלבד
// ══════════════════════════════════════════════════════════════════

function task_SetupSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName(TASK_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(TASK_SHEET_NAME);
  sheet.clearContents();
  sheet.clearFormats();
  sheet.setRowHeight(1, 20);
  sheet.getRange(1, 1, 1, 8).setBackground(TASK_COLOR_WHITE);
  sheet.setRowHeight(2, 50);
  sheet.getRange(2, 1, 1, 8).setBackground(TASK_COLOR_WHITE);
  sheet.setRowHeight(3, 20);
  sheet.getRange(3, 1, 1, 8).setBackground(TASK_COLOR_WHITE);
  const headers     = ["Task_ID","Open_Date","Closed_Date","Status","Module","Description","Priority","Notes"];
  const headerRange = sheet.getRange(TASK_HEADER_ROW, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground(TASK_COLOR_HEADER);
  headerRange.setFontColor(TASK_COLOR_WHITE);
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  headerRange.setFontSize(11);
  sheet.setRowHeight(TASK_HEADER_ROW, 35);
  sheet.setColumnWidth(COL_TASK_ID,     80);
  sheet.setColumnWidth(COL_OPEN_DATE,   130);
  sheet.setColumnWidth(COL_CLOSED_DATE, 130);
  sheet.setColumnWidth(COL_STATUS,      110);
  sheet.setColumnWidth(COL_MODULE,      150);
  sheet.setColumnWidth(COL_DESC,        350);
  sheet.setColumnWidth(COL_PRIORITY,    90);
  sheet.setColumnWidth(COL_NOTES,       200);
  sheet.setFrozenRows(TASK_HEADER_ROW);
  sheet.setFrozenColumns(4);
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["🔴 פתוח", "🟡 בביצוע", "✅ סגור"], true).build();
  const priorityRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["🔥 גבוה", "🔵 רגיל", "⚪ נמוך"], true).build();
  sheet.getRange(TASK_DATA_START, COL_STATUS,   200, 1).setDataValidation(statusRule);
  sheet.getRange(TASK_DATA_START, COL_PRIORITY, 200, 1).setDataValidation(priorityRule);
  SpreadsheetApp.getUi().alert(
    "✅ גיליון ניהול_משימות הוגדר.\n\n" +
    "הצמד ציורים:\n" +
    "A2 → task_SessionStart  (פתיחת סשן + דוח)\n" +
    "B2 → task_ChangePriority\n" +
    "C2 → task_SyncToday     (סנכרון משימות יום ← זה האייקון החדש)\n" +
    "D2 → task_ToggleStatus\n" +
    "F2 → task_EndOfDay"
  );
}

// ══════════════════════════════════════════════════════════════════
// פתיחת סשן — רענון צבעים + ספירה + סדר יום מקובץ
// (אוחד עם task_RunReport החל מ-v1.5.0)
// ══════════════════════════════════════════════════════════════════

function task_SessionStart() {
  const ui    = SpreadsheetApp.getUi();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TASK_SHEET_NAME);
  if (!sheet) { ui.alert("גיליון לא נמצא — הרץ task_SetupSheet תחילה."); return; }

  const lastRow = sheet.getLastRow();
  if (lastRow < TASK_DATA_START) { ui.alert("אין משימות פתוחות בגיליון."); return; }

  const rowCount = lastRow - TASK_DATA_START + 1;
  const data     = sheet.getRange(TASK_DATA_START, 1, rowCount, 8).getValues();

  // ── שלב א׳: רענון צבעים + ספירה ──────────────────────────────
  let open = 0, inProgress = 0, closed = 0;
  data.forEach(function(row, i) {
    const status   = String(row[COL_STATUS - 1]).trim();
    const rowRange = sheet.getRange(TASK_DATA_START + i, 1, 1, 8);
    if      (status.includes("סגור"))   { rowRange.setBackground(TASK_COLOR_GREEN);  closed++;     }
    else if (status.includes("בביצוע")) { rowRange.setBackground(TASK_COLOR_YELLOW); inProgress++; }
    else if (status.includes("פתוח"))   { rowRange.setBackground(TASK_COLOR_RED);    open++;       }
  });

  // ── שלב ב׳: שליפת משימות פתוחות לסדר יום ────────────────────
  const openTasks = [];
  data.forEach(function(row) {
    const status = String(row[COL_STATUS - 1]).trim();
    if (!status.includes("סגור") && row[COL_TASK_ID - 1] !== "") {
      openTasks.push({
        id:       row[COL_TASK_ID   - 1],
        module:   String(row[COL_MODULE   - 1]).trim(),
        desc:     String(row[COL_DESC     - 1]).trim(),
        priority: String(row[COL_PRIORITY - 1]).trim(),
        status:   status
      });
    }
  });

  if (openTasks.length === 0) {
    ui.alert(
      "📊 דוח משימות\n\n" +
      "🔴 פתוח:    " + open       + "\n" +
      "🟡 בביצוע:  " + inProgress + "\n" +
      "✅ סגור:    " + closed      + "\n" +
      "─────────────────\n" +
      "סה\"כ: " + (open + inProgress + closed) + "\n\n" +
      "🎉 אין משימות פתוחות — הגיליון נקי!"
    );
    return;
  }

  // ── שלב ג׳: מיון וקיבוץ לפי ספרייה ודחיפות ──────────────────
  const priorityOrder = { "🔥 גבוה": 1, "🔵 רגיל": 2, "⚪ נמוך": 3 };
  openTasks.sort(function(a, b) {
    if (a.module < b.module) return -1;
    if (a.module > b.module) return  1;
    return (priorityOrder[a.priority] || 9) - (priorityOrder[b.priority] || 9);
  });

  const grouped = {};
  openTasks.forEach(function(t) {
    if (!grouped[t.module]) grouped[t.module] = [];
    grouped[t.module].push(t);
  });

  // ── שלב ד׳: בניית טקסט מאוחד ─────────────────────────────────
  const now = Utilities.formatDate(new Date(), "Asia/Jerusalem", "dd/MM/yyyy HH:mm");
  let agenda  = "📊 דוח משימות — " + now + "\n";
  agenda     += "🔴 פתוח: " + open + "  |  🟡 בביצוע: " + inProgress + "  |  ✅ סגור: " + closed + "\n";
  agenda     += "══════════════════════════════\n\n";
  agenda     += "📋 סדר יום — משימות פתוחות: " + openTasks.length + "\n";
  agenda     += "══════════════════════════════\n\n";

  Object.keys(grouped).sort().forEach(function(module) {
    agenda += "📁 " + module + "\n";
    agenda += "──────────────────────────────\n";
    grouped[module].forEach(function(t) {
      agenda += t.priority + " #" + t.id + " — " + t.desc + "\n";
    });
    agenda += "\n";
  });

  agenda += "══════════════════════════════\n";
  agenda += "העתק לצ'אט עם הסוכן להתחלת עבודה.";

  ui.alert("סדר יום לסשן", agenda, ui.ButtonSet.OK);
}

// ══════════════════════════════════════════════════════════════════
// עטיפה לאחורה-תאימות — מפנה ל-task_SessionStart
// לא נמחקת כדי לא לשבור ציורים מוצמדים ישנים
// ══════════════════════════════════════════════════════════════════

function task_RunReport() {
  task_SessionStart();
}

// ══════════════════════════════════════════════════════════════════
// שינוי תעדוף — על שורה מסומנת
// ══════════════════════════════════════════════════════════════════

function task_ChangePriority() {
  const ui    = SpreadsheetApp.getUi();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TASK_SHEET_NAME);
  if (!sheet) { ui.alert("גיליון לא נמצא."); return; }
  const row = sheet.getActiveCell().getRow();
  if (row < TASK_DATA_START) { ui.alert("יש לבחור שורת משימה תחילה."); return; }
  const values      = sheet.getRange(row, 1, 1, 8).getValues()[0];
  const taskId      = values[COL_TASK_ID  - 1];
  const desc        = values[COL_DESC     - 1];
  const currentPrio = values[COL_PRIORITY - 1];
  const status      = String(values[COL_STATUS - 1]).trim();
  if (status.includes("סגור")) { ui.alert("משימה #" + taskId + " סגורה — לא ניתן לשנות תעדוף."); return; }
  const result = ui.prompt(
    "שינוי תעדוף — משימה #" + taskId,
    "משימה: " + desc + "\n" +
    "תעדוף נוכחי: " + currentPrio + "\n\n" +
    "1 = 🔥 גבוה\n" +
    "2 = 🔵 רגיל\n" +
    "3 = ⚪ נמוך",
    ui.ButtonSet.OK_CANCEL
  );
  if (result.getSelectedButton() !== ui.Button.OK) return;
  const choice = result.getResponseText().trim();
  let newPrio;
  if      (choice === "1") newPrio = "🔥 גבוה";
  else if (choice === "2") newPrio = "🔵 רגיל";
  else if (choice === "3") newPrio = "⚪ נמוך";
  else { ui.alert("בחירה לא תקינה."); return; }
  sheet.getRange(row, COL_PRIORITY).setValue(newPrio);
  ui.alert("✅ תעדוף משימה #" + taskId + " עודכן ל-" + newPrio);
}

// ══════════════════════════════════════════════════════════════════
// פתיחה / סגירה — על שורה מסומנת
// ══════════════════════════════════════════════════════════════════

function task_ToggleStatus() {
  const ui    = SpreadsheetApp.getUi();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TASK_SHEET_NAME);
  if (!sheet) { ui.alert("גיליון לא נמצא."); return; }
  const row = sheet.getActiveCell().getRow();
  if (row < TASK_DATA_START) { ui.alert("יש לבחור שורת משימה תחילה."); return; }
  const values = sheet.getRange(row, 1, 1, 8).getValues()[0];
  const taskId = values[COL_TASK_ID - 1];
  const desc   = values[COL_DESC   - 1];
  const status = String(values[COL_STATUS - 1]).trim();
  const now    = Utilities.formatDate(new Date(), "Asia/Jerusalem", "dd/MM/yyyy HH:mm");
  if (status.includes("סגור")) {
    const confirm = ui.alert("פתיחה מחדש — משימה #" + taskId, "משימה: " + desc + "\n\nלפתוח מחדש?", ui.ButtonSet.YES_NO);
    if (confirm !== ui.Button.YES) return;
    sheet.getRange(row, COL_STATUS).setValue("🔴 פתוח");
    sheet.getRange(row, COL_CLOSED_DATE).setValue("");
    sheet.getRange(row, 1, 1, 8).setBackground(TASK_COLOR_RED);
    ui.alert("✅ משימה #" + taskId + " נפתחה מחדש.");
  } else {
    const confirm = ui.alert("סגירת משימה #" + taskId, "משימה: " + desc + "\n\nלסגור?", ui.ButtonSet.YES_NO);
    if (confirm !== ui.Button.YES) return;
    sheet.getRange(row, COL_STATUS).setValue("✅ סגור");
    sheet.getRange(row, COL_CLOSED_DATE).setValue(now);
    sheet.getRange(row, 1, 1, 8).setBackground(TASK_COLOR_GREEN);
    ui.alert("✅ משימה #" + taskId + " נסגרה.");
  }
}

// ══════════════════════════════════════════════════════════════════
// טעינת רשימת משימות מהסוכן — עם בדיקת כפילויות
// ══════════════════════════════════════════════════════════════════

function task_LoadList(tasks) {
  const ui    = SpreadsheetApp.getUi();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TASK_SHEET_NAME);
  if (!sheet) { ui.alert("גיליון לא נמצא — הרץ task_SetupSheet תחילה."); return; }
  try {
    const now = Utilities.formatDate(new Date(), "Asia/Jerusalem", "dd/MM/yyyy HH:mm");

    // סריקת עמודת Task_ID למציאת השורה האחרונה עם נתונים.
    // getLastRow() עלול להחזיר 204 כאשר Data Validation מוגדר ל-200 שורות
    // ב-task_SetupSheet, מה שגרם לכתיבת משימות לשורה 205+ ולא נראות.
    const rawLastRow  = sheet.getLastRow();
    let   lastDataRow = TASK_DATA_START - 1;
    if (rawLastRow >= TASK_DATA_START) {
      const ids = sheet.getRange(TASK_DATA_START, COL_TASK_ID, rawLastRow - TASK_DATA_START + 1, 1).getValues();
      for (let i = ids.length - 1; i >= 0; i--) {
        if (ids[i][0] !== "" && ids[i][0] !== null && ids[i][0] !== 0) {
          lastDataRow = TASK_DATA_START + i;
          break;
        }
      }
    }

    let existingDesc = [];
    if (lastDataRow >= TASK_DATA_START) {
      const existing = sheet.getRange(TASK_DATA_START, COL_DESC, lastDataRow - TASK_DATA_START + 1, 1).getValues();
      existingDesc   = existing.map(r => r[0].toString().trim().toLowerCase());
    }

    let nextRow = lastDataRow + 1;
    let added   = 0;
    let skipped = 0;

    tasks.forEach(function(task) {
      const desc     = task.description.trim();
      const descLow  = desc.toLowerCase();
      if (existingDesc.some(ex => ex === descLow)) { skipped++; return; }
      const taskId   = nextRow - TASK_DATA_START + 1;
      const priority = (task.priority && task.priority.trim()) ? task.priority.trim() : "🔵 רגיל";
      sheet.getRange(nextRow, 1, 1, 8).setValues([[
        taskId, now, "", "🔴 פתוח", task.module, desc, priority, ""
      ]]);
      sheet.getRange(nextRow, 1, 1, 8).setBackground(TASK_COLOR_RED);
      existingDesc.push(descLow);
      nextRow++;
      added++;
    });

    SpreadsheetApp.flush();

    ui.alert(
      "✅ טעינת משימות הושלמה\n\n" +
      "נוספו:          " + added   + "\n" +
      "דולגו (כפילות): " + skipped
    );
  } catch (e) {
    Logger.log("שגיאה ב-task_LoadList: " + e.message + "\n" + e.stack);
    ui.alert("❌ שגיאה בטעינת משימות:\n" + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// סיום יום — מסמך חפיפה
// ══════════════════════════════════════════════════════════════════

function task_EndOfDay() {
  const ui    = SpreadsheetApp.getUi();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TASK_SHEET_NAME);
  if (!sheet) { ui.alert("גיליון לא נמצא."); return; }
  const lastRow = sheet.getLastRow();
  if (lastRow < TASK_DATA_START) { ui.alert("אין משימות בגיליון."); return; }
  const rowCount = lastRow - TASK_DATA_START + 1;
  const data     = sheet.getRange(TASK_DATA_START, 1, rowCount, 8).getValues();
  const now      = Utilities.formatDate(new Date(), "Asia/Jerusalem", "dd/MM/yyyy HH:mm");
  const closedList = [];
  const openList   = [];
  data.forEach(function(row) {
    const taskId = row[COL_TASK_ID - 1];
    const module = row[COL_MODULE  - 1];
    const desc   = row[COL_DESC   - 1];
    const status = String(row[COL_STATUS - 1]).trim();
    if (!taskId) return;
    if (status.includes("סגור")) {
      closedList.push("#" + taskId + " [" + module + "] " + desc);
    } else {
      openList.push("#" + taskId + " [" + module + "] " + desc + " (" + status + ")");
    }
  });
  let summary  = "═══════════════════════════════\n";
  summary     += "מסמך חפיפה — " + now + "\n";
  summary     += "═══════════════════════════════\n\n";
  summary     += "✅ נסגרו:\n";
  if (closedList.length === 0) {
    summary += "  (אין)\n";
  } else {
    closedList.forEach(function(t) { summary += "  • " + t + "\n"; });
  }
  summary += "\n🔴 נשארו פתוחות:\n";
  if (openList.length === 0) {
    summary += "  (אין — כל המשימות סגורות 🎉)\n";
  } else {
    openList.forEach(function(t) { summary += "  • " + t + "\n"; });
  }
  summary += "\n═══════════════════════════════\n";
  summary += "העתק את הסיכום למסמך החפיפה.";
  ui.alert("סיום יום — מסמך חפיפה", summary, ui.ButtonSet.OK);
}

// ══════════════════════════════════════════════════════════════════
// הוספת משימה יחידה מטופס HTML — נקרא מ-task_SyncToday דרך google.script.run
// ══════════════════════════════════════════════════════════════════

function task_AddFromDialog(data) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TASK_SHEET_NAME);
  if (!sheet) return "❌ גיליון לא נמצא — הרץ task_SetupSheet תחילה";

  try {
    const now = Utilities.formatDate(new Date(), "Asia/Jerusalem", "dd/MM/yyyy HH:mm");

    // סריקת עמודת Task_ID למציאת השורה האחרונה — זהה לתיקון ב-task_LoadList
    const rawLastRow = sheet.getLastRow();
    let lastDataRow  = TASK_DATA_START - 1;
    if (rawLastRow >= TASK_DATA_START) {
      const ids = sheet.getRange(TASK_DATA_START, COL_TASK_ID, rawLastRow - TASK_DATA_START + 1, 1).getValues();
      for (let i = ids.length - 1; i >= 0; i--) {
        if (ids[i][0] !== "" && ids[i][0] !== null && ids[i][0] !== 0) {
          lastDataRow = TASK_DATA_START + i;
          break;
        }
      }
    }

    // בדיקת כפילויות
    if (lastDataRow >= TASK_DATA_START) {
      const existing    = sheet.getRange(TASK_DATA_START, COL_DESC, lastDataRow - TASK_DATA_START + 1, 1).getValues();
      const existingDesc = existing.map(r => r[0].toString().trim().toLowerCase());
      if (existingDesc.some(ex => ex === data.description.trim().toLowerCase())) {
        return "⚠️ משימה עם אותו תיאור כבר קיימת בגיליון";
      }
    }

    const nextRow    = lastDataRow + 1;
    const taskId     = nextRow - TASK_DATA_START + 1;
    const status     = data.status   || "🔴 פתוח";
    const priority   = (data.priority && data.priority.trim()) ? data.priority.trim() : "🔵 רגיל";
    const closedDate = status.includes("סגור") ? now : "";

    let bgColor = TASK_COLOR_RED;
    if (status.includes("סגור"))   bgColor = TASK_COLOR_GREEN;
    if (status.includes("בביצוע")) bgColor = TASK_COLOR_YELLOW;

    sheet.getRange(nextRow, 1, 1, 8).setValues([[
      taskId, now, closedDate, status, data.module.trim(), data.description.trim(), priority, ""
    ]]);
    sheet.getRange(nextRow, 1, 1, 8).setBackground(bgColor);
    SpreadsheetApp.flush();

    return "✅ משימה #" + taskId + " נוספה בהצלחה";
  } catch (e) {
    Logger.log("שגיאה ב-task_AddFromDialog: " + e.message + "\n" + e.stack);
    return "❌ שגיאה: " + e.message;
  }
}

// ══════════════════════════════════════════════════════════════════
// כפתור רענון (C2) — טופס הוספת משימה אינטראקטיבי
// ══════════════════════════════════════════════════════════════════

function task_SyncToday() {
  const htmlContent = `<!DOCTYPE html>
<html dir="rtl">
<head>
  <base target="_top">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{direction:rtl;font-family:Arial,sans-serif;padding:18px 20px;background:#f8f9fa;color:#222;font-size:13px}
    h3{color:#1a3a5c;font-size:15px;border-bottom:2px solid #1a3a5c;padding-bottom:8px;margin-bottom:14px}
    .field{margin-bottom:11px}
    label{display:block;font-weight:bold;font-size:12px;color:#444;margin-bottom:4px}
    input,select,textarea{width:100%;padding:7px 9px;border:1px solid #ccc;border-radius:4px;font-size:13px;font-family:Arial,sans-serif;direction:rtl}
    input:focus,select:focus,textarea:focus{outline:none;border-color:#1a3a5c;box-shadow:0 0 0 2px #d0e4f7}
    textarea{height:68px;resize:vertical}
    .auto-val{background:#eef2f6;color:#666;padding:6px 9px;border-radius:4px;font-size:12px;border:1px solid #dde3ea}
    .row2{display:flex;gap:10px}
    .row2 .field{flex:1}
    #closedBlock{display:none;margin-bottom:11px}
    .buttons{margin-top:14px;display:flex;gap:8px;justify-content:center}
    .btn-add{background:#1a3a5c;color:#fff;border:none;border-radius:4px;padding:9px 26px;font-size:13px;cursor:pointer;font-weight:bold}
    .btn-add:hover{background:#254e7a}
    .btn-add:disabled{background:#aaa;cursor:default}
    .btn-cancel{background:#fff;border:1px solid #bbb;border-radius:4px;padding:9px 20px;font-size:13px;cursor:pointer}
    #msg{margin-top:10px;text-align:center;font-size:13px;min-height:18px}
  </style>
</head>
<body>
  <h3>➕ הוספת משימה חדשה</h3>

  <div class="field">
    <label>מודול</label>
    <input type="text" id="module" placeholder="לדוגמה: S08, INFRA, DevSyncInspector">
  </div>

  <div class="field">
    <label>תיאור</label>
    <textarea id="desc" placeholder="תיאור המשימה..."></textarea>
  </div>

  <div class="row2">
    <div class="field">
      <label>עדיפות</label>
      <select id="priority">
        <option value="🔥 גבוה">🔥 גבוה</option>
        <option value="🔵 רגיל" selected>🔵 רגיל</option>
        <option value="⚪ נמוך">⚪ נמוך</option>
      </select>
    </div>
    <div class="field">
      <label>סטטוס</label>
      <select id="status" onchange="onStatusChange(this.value)">
        <option value="🔴 פתוח" selected>🔴 פתוח</option>
        <option value="🟡 בביצוע">🟡 בביצוע</option>
        <option value="✅ סגור">✅ סגור</option>
      </select>
    </div>
  </div>

  <div class="row2">
    <div class="field">
      <label>מזהה משימה</label>
      <div class="auto-val">אוטומטי</div>
    </div>
    <div class="field">
      <label>תאריך פתיחה</label>
      <div class="auto-val">עכשיו (אוטומטי)</div>
    </div>
  </div>

  <div id="closedBlock">
    <label>תאריך סגירה</label>
    <div class="auto-val">עכשיו (אוטומטי)</div>
  </div>

  <div id="msg"></div>

  <div class="buttons">
    <button class="btn-add" id="btnAdd" onclick="doSubmit()">➕ הוסף משימה</button>
    <button class="btn-cancel" onclick="google.script.host.close()">ביטול</button>
  </div>

  <script>
    function onStatusChange(val) {
      document.getElementById('closedBlock').style.display =
        val.indexOf('סגור') !== -1 ? 'block' : 'none';
    }
    function doSubmit() {
      var mod  = document.getElementById('module').value.trim();
      var desc = document.getElementById('desc').value.trim();
      var prio = document.getElementById('priority').value;
      var stat = document.getElementById('status').value;
      var msg  = document.getElementById('msg');
      if (!mod)  { msg.textContent = '⚠️ יש להזין מודול.';  return; }
      if (!desc) { msg.textContent = '⚠️ יש להזין תיאור.'; return; }
      msg.textContent = '⏳ שומר...';
      document.getElementById('btnAdd').disabled = true;
      google.script.run
        .withSuccessHandler(function(res) {
          msg.textContent = res;
          setTimeout(function(){ google.script.host.close(); }, 1400);
        })
        .withFailureHandler(function(err) {
          msg.textContent = '❌ ' + err.message;
          document.getElementById('btnAdd').disabled = false;
        })
        .task_AddFromDialog({module:mod, description:desc, priority:prio, status:stat});
    }
  </script>
</body>
</html>`;

  const html = HtmlService.createHtmlOutput(htmlContent)
    .setWidth(440)
    .setHeight(490)
    .setTitle("הוספת משימה");
  SpreadsheetApp.getUi().showModalDialog(html, "➕ הוספת משימה חדשה");
}