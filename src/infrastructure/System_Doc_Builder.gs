/**
 * @file        System_Doc_Builder.gs
 * @version     2.0.0 | @updated 15/06/2026 12:07 | @service INFRA
 * @git         src/infrastructure/System_Doc_Builder.gs
 * @description בניית גיליונות תיעוד מערכת וניהול משימות פיתוח.
 *              כולל: גיליון תיעוד AI, גיליון קשרי שירות, גיליון ניהול_משימות.
 *              פונקציות משימות: הוספה, סגירה, מיון, דוח יומי וסיום סשן.
 *              נקרא מציורים בגיליון ומהתפריט — אינו חלק מזרימת עיבוד אוטומטי.
 * @impacts     גיליון ניהול_משימות:
 *              A=Task_ID | B=Open_Date | C=Closed_Date | D=Status
 *              E=Module  | F=Description | G=Priority   | H=Notes
 *              גיליון תיעוד מערכת AI — כותרות + שורות שירות.
 *              גיליון תיעוד_פונקציות — רשימת פונקציות מהעורך.
 *              גיליון יומן_אירועים_רפואי — עיצוב 4 שורות עליונות + כותרות אנגלית.
 * @callers     ציורים בגליון ניהול_משימות (שורה 2) | תפריט Menu_LAB
 * @functions   createOrUpdateSystemDoc_v5 | updateDailyStatus | updateStaticSections
 *              scanSheets_v1 | scanCodeFiles_v2 | extractModuleMetadata
 *              extractFunctions_v2 | updateMappingTable_v2
 *              unlockSheet | lockSheet | getMatch | updateSystemContext
 *              task_SetupSheet | task_SessionStart | task_RunReport
 *              task_ChangePriority | task_ToggleStatus | task_LoadList
 *              task_RefreshList | task_EndOfDay | task_DocFunctions
 *              task_AddFromDialog | task_SyncToday
 *              buildMedicalEventsSheet
 * @changes     [v2.0.0] הוספת buildMedicalEventsSheet — עיצוב גליון יומן_אירועים_רפואי:
 *                       הכנסת 3 שורות ריקות, כותרות אנגלית בשורה 4, עיצוב סטנדרט ניהול_מיילים
 *              [v1.9.0] שדרוג task_SessionStart — קריאה אוטומטית ל-task_RefreshList
 *                       מיון + מספור + ניקוי שורות ריקות בכל פתיחת סשן
 *              [v1.8.0] שדרוג task_EndOfDay — דוח HTML עם כפתור העתקה
 *                       מיון לפי ספרייה → עדיפות | 3 בלוקים: סטטוס / נסגרו / פתוחות
 *                       כותרת מורחבת לפי סטנדרט
 *              [v1.7.0] הוספת task_RefreshList — מיון + מספור + צביעה + ניקוי
 *              [v1.6.0] שדרוג task_SessionStart + task_EndOfDay + task_DocFunctions
 *              [v1.5.3] task_SyncToday — טופס HTML | task_AddFromDialog
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
      "גרסאות נוכחיות:\nPROD: v10.8\nLAB: v10.8\nתאריך עדכון: 15/06/2026",
      "מודולים קריטיים:\nSystem_Logger.gs — תלוי שורה 6\nMenu_PROD.gs — תפריט ייצור\nMenu_LAB.gs — תפריט מעבדה\nMain.gs — נקודת כניסה\nGitHubSync.gs — סנכרון קוד"
    ]];
    sheet.getRange("A3:G3").setValues(rulesRow).setVerticalAlignment("top");
    sheet.getRange("A4").setValue("מיפוי שירותים:");
    sheet.getRange("A4:G4").setBackground("#cfe2f3").setFontWeight("bold");
    const servicesData = [
      ["S01", "בדיקת בוקר טוב",      "System_HealthCheck.gs", "פעיל",        ""],
      ["S02", "הרשאות גישה",          "Auth_Check.gs",         "פעיל",        ""],
      ["S03", "סריקת Gmail",          "Mod_Ingestion.gs",      "פעיל",        ""],
      ["S04", "סריקת Drive",          "S04_DriveSync.gs",      "פעיל",        ""],
      ["S05", "חילוץ מטא-דאטה",      "S05_MetaExtract.gs",    "פעיל",        ""],
      ["S06", "המרה ל-TXT",           "S06_ConvertTXT.gs",     "פעיל",        ""],
      ["S07", "סיווג מסמכים",         "S07_Classify.gs",       "פעיל",        ""],
      ["S08", "אימות ידני ולמידה",    "S08_Validate.gs",       "פעיל",        ""],
      ["S09", "חילוץ אירועים",        "S09_ExtractMedical.gs", "פעיל",        ""],
      ["S10", "אימות אירועים",        "S10_Validate.gs",       "פעיל",        ""],
      ["S11", "בדיקת תקינות QA",      "S11_QArun.gs",          "פעיל",        ""],
      ["S12", "ארכיון",               "ViewEngine.gs",         "פעיל",        ""],
      ["INFRA", "ניהול משימות",       "System_Doc_Builder.gs", "פעיל",        ""],
      ["INFRA", "ניהול לוגים",        "System_Logger.gs",      "פעיל",        "תלוי שורה 6"],
      ["INFRA", "סנכרון גיטהאב",     "EditorToGitHub.gs",     "פעיל",        ""]
    ];
    sheet.getRange("A5:E19").setValues(servicesData);
    sheet.getRange("A20").setValue("משימה הבאה:");
    sheet.getRange("B20").setValue("המשך פיתוח Pipeline + תיקוני כותרות");
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
    "C2 → task_SyncToday     (סנכרון משימות יום)\n" +
    "D2 → task_ToggleStatus\n" +
    "F2 → task_EndOfDay"
  );
}

// ══════════════════════════════════════════════════════════════════
// פתיחת סשן — קריאת חפיפה + הצעת משימות
// ══════════════════════════════════════════════════════════════════

function task_SessionStart() {
  const ui    = SpreadsheetApp.getUi();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TASK_SHEET_NAME);
  if (!sheet) { ui.alert("גיליון לא נמצא — הרץ task_SetupSheet תחילה."); return; }
// [v1.9.0] מיון + מספור + ניקוי אוטומטי לפני הדוח
  SpreadsheetApp.getActiveSpreadsheet().toast("🔄 מסדר את הגליון...", "MedicalPilot", 3);
  task_RefreshList();
  SpreadsheetApp.flush();
  const lastRow = sheet.getLastRow();
  if (lastRow < TASK_DATA_START) { ui.alert("אין משימות פתוחות בגיליון."); return; }

  const rowCount = lastRow - TASK_DATA_START + 1;
  const data     = sheet.getRange(TASK_DATA_START, 1, rowCount, 8).getValues();

  let open = 0, inProgress = 0, closed = 0;
  data.forEach(function(row, i) {
    const status   = String(row[COL_STATUS - 1]).trim();
    const rowRange = sheet.getRange(TASK_DATA_START + i, 1, 1, 8);
    if      (status.includes("סגור"))   { rowRange.setBackground(TASK_COLOR_GREEN);  closed++;     }
    else if (status.includes("בביצוע")) { rowRange.setBackground(TASK_COLOR_YELLOW); inProgress++; }
    else if (status.includes("פתוח"))   { rowRange.setBackground(TASK_COLOR_RED);    open++;       }
  });

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

  let handoverText = "";
  try {
    const files = DriveApp.searchFiles(
      "title contains 'חפיפה' and mimeType = 'application/vnd.google-apps.document'"
    );
    if (files.hasNext()) {
      const doc  = DocumentApp.openById(files.next().getId());
      const body = doc.getBody().getText();
      handoverText = body.length > 800
        ? body.substring(0, 800) + "\n...[קוצר]"
        : body;
    }
  } catch (e) {
    Logger.log("[task_SessionStart] חפיפה: " + e.message);
  }

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

  const now = Utilities.formatDate(new Date(), "Asia/Jerusalem", "dd/MM/yyyy HH:mm");
  let agenda  = "📊 דוח משימות — " + now + "\n";
  agenda     += "🔴 פתוח: " + open + "  |  🟡 בביצוע: " + inProgress + "  |  ✅ סגור: " + closed + "\n";
  agenda     += "══════════════════════════════\n\n";

  if (handoverText) {
    agenda += "📋 מסמך חפיפה אחרון:\n";
    agenda += "──────────────────────────────\n";
    agenda += handoverText + "\n\n";
    agenda += "══════════════════════════════\n\n";
  }

  agenda += "📋 סדר יום — משימות פתוחות: " + openTasks.length + "\n";
  agenda += "══════════════════════════════\n\n";

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
// [v1.7.0] רענון גיליון — מיון + מספור + צביעה + ניקוי שורות ריקות
// ══════════════════════════════════════════════════════════════════

function task_RefreshList() {
  const ui    = SpreadsheetApp.getUi();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TASK_SHEET_NAME);
  if (!sheet) { ui.alert("גיליון לא נמצא — הרץ task_SetupSheet תחילה."); return; }

  const lastRow = sheet.getLastRow();
  if (lastRow < TASK_DATA_START) { ui.alert("אין משימות בגיליון."); return; }

  try {
    // ── שלב 1: קריאת כל הנתונים ─────────────────────────────────
    const rowCount = lastRow - TASK_DATA_START + 1;
    const data     = sheet.getRange(TASK_DATA_START, 1, rowCount, 8).getValues();

    // ── שלב 2: סינון שורות ריקות ─────────────────────────────────
    const validRows = data.filter(function(row) {
      return row[COL_MODULE - 1] !== "" || row[COL_DESC - 1] !== "";
    });

    if (validRows.length === 0) { ui.alert("אין משימות תקינות בגיליון."); return; }

    // ── שלב 3: מיון — פתוח לפי עדיפות+מודול, סגור בסוף ──────────
    const priorityOrder = { "🔥 גבוה": 1, "🔵 רגיל": 2, "⚪ נמוך": 3 };

    validRows.sort(function(a, b) {
      const statusA  = String(a[COL_STATUS   - 1]).trim();
      const statusB  = String(b[COL_STATUS   - 1]).trim();
      const closedA  = statusA.includes("סגור") ? 1 : 0;
      const closedB  = statusB.includes("סגור") ? 1 : 0;

      // סגורות תמיד בסוף
      if (closedA !== closedB) return closedA - closedB;

      // מיון לפי מודול
      const moduleA = String(a[COL_MODULE - 1]).trim();
      const moduleB = String(b[COL_MODULE - 1]).trim();
      if (moduleA < moduleB) return -1;
      if (moduleA > moduleB) return  1;

      // מיון לפי עדיפות בתוך אותו מודול
      const prioA = priorityOrder[String(a[COL_PRIORITY - 1]).trim()] || 9;
      const prioB = priorityOrder[String(b[COL_PRIORITY - 1]).trim()] || 9;
      return prioA - prioB;
    });

    // ── שלב 4: מספור מחדש + כתיבה חזרה לגיליון ─────────────────
    const now = Utilities.formatDate(new Date(), "Asia/Jerusalem", "dd/MM/yyyy HH:mm");

    // ניקוי אזור הנתונים הישן
    sheet.getRange(TASK_DATA_START, 1, rowCount, 8).clearContent();
    sheet.getRange(TASK_DATA_START, 1, rowCount, 8).setBackground(TASK_COLOR_WHITE);

    validRows.forEach(function(row, i) {
      const newRow    = TASK_DATA_START + i;
      const status    = String(row[COL_STATUS - 1]).trim();

      // כתיבה לגיליון
      sheet.getRange(newRow, 1, 1, 8).setValues([row]);

      // צביעה לפי סטטוס
      let bgColor = TASK_COLOR_WHITE;
      if      (status.includes("סגור"))   bgColor = TASK_COLOR_GREEN;
      else if (status.includes("בביצוע")) bgColor = TASK_COLOR_YELLOW;
      else if (status.includes("פתוח"))   bgColor = TASK_COLOR_RED;
      sheet.getRange(newRow, 1, 1, 8).setBackground(bgColor);
    });

    SpreadsheetApp.flush();

    // ── שלב 5: דוח סיכום ─────────────────────────────────────────
    let open = 0, inProg = 0, closed = 0;
    validRows.forEach(function(row) {
      const s = String(row[COL_STATUS - 1]).trim();
      if      (s.includes("סגור"))   closed++;
      else if (s.includes("בביצוע")) inProg++;
      else                            open++;
    });

    ui.alert(
      "✅ רענון הושלם — " + now + "\n\n" +
      "🔴 פתוח:   " + open   + "\n" +
      "🟡 בביצוע: " + inProg + "\n" +
      "✅ סגור:   " + closed  + "\n" +
      "─────────────────\n" +
      "סה\"כ: " + validRows.length + " משימות\n" +
      "שורות ריקות שהוסרו: " + (rowCount - validRows.length)
    );

    Logger.log("[task_RefreshList] הושלם — " + validRows.length + " משימות, " +
               (rowCount - validRows.length) + " שורות ריקות הוסרו");

  } catch (e) {
    Logger.log("[task_RefreshList] שגיאה: " + e.message);
    ui.alert("❌ שגיאה ב-task_RefreshList:\n" + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// סיום יום — חפיפה אוטומטית מלאה
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
  const today    = now.substring(0, 10);

  const closedTodayByLib = {};
  const openByLib        = {};
  let   totalOpen        = 0;
  let   totalInProg      = 0;
  let   totalClosed      = 0;
  let   totalClosedToday = 0;

  data.forEach(function(row) {
    const taskId   = row[COL_TASK_ID   - 1];
    const module   = String(row[COL_MODULE      - 1]).trim();
    const desc     = String(row[COL_DESC        - 1]).trim();
    const status   = String(row[COL_STATUS      - 1]).trim();
    const closedRaw = row[COL_CLOSED_DATE - 1];
    const closed    = closedRaw instanceof Date
      ? Utilities.formatDate(closedRaw, "Asia/Jerusalem", "dd/MM/yyyy HH:mm")
      : String(closedRaw).trim();
    const priority = String(row[COL_PRIORITY    - 1]).trim();
    if (!taskId || !module) return;

    if (status.includes("סגור")) {
      totalClosed++;
      if (closed.startsWith(today)) {
        totalClosedToday++;
        if (!closedTodayByLib[module]) closedTodayByLib[module] = [];
        closedTodayByLib[module].push("#" + taskId);
      }
    } else if (status.includes("בביצוע")) {
      totalInProg++;
      if (!openByLib[module]) openByLib[module] = [];
      openByLib[module].push({ id: taskId, desc: desc, priority: priority, status: status });
    } else {
      totalOpen++;
      if (!openByLib[module]) openByLib[module] = [];
      openByLib[module].push({ id: taskId, desc: desc, priority: priority, status: status });
    }
  });

  const priorityOrder = { "🔥 גבוה": 1, "🔵 רגיל": 2, "⚪ נמוך": 3 };
  const versionStr    = "LA v10.8 | PR v10.8";

  let report  = "📊 MedicalPilot | " + now + " | " + versionStr + "\n";
  report     += "✅ נסגרו היום: " + totalClosedToday +
                "  |  🔴 פתוחות: " + totalOpen +
                "  |  🟡 בביצוע: " + totalInProg + "\n";
  report     += "══════════════════════════════\n\n";

  report += "✅ נסגרו היום:\n";
  if (Object.keys(closedTodayByLib).length === 0) {
    report += "  (אין)\n";
  } else {
    Object.keys(closedTodayByLib).sort().forEach(function(lib) {
      const ids     = closedTodayByLib[lib].join(" ");
      const padding = lib.length < 16 ? lib + Array(16 - lib.length).join(" ") : lib;
      report += "  " + padding + "  " + ids + "\n";
    });
  }
  report += "\n══════════════════════════════\n\n";

  report += "📋 משימות פתוחות:\n";
  if (Object.keys(openByLib).length === 0) {
    report += "  🎉 כל המשימות סגורות!\n";
  } else {
    Object.keys(openByLib).sort().forEach(function(lib) {
      report += "\n📁 " + lib + "\n";
      const tasks = openByLib[lib];
      tasks.sort(function(a, b) {
        return (priorityOrder[a.priority] || 9) - (priorityOrder[b.priority] || 9);
      });
      tasks.forEach(function(t) {
        const icon = t.status.includes("בביצוע") ? "🟡" : t.priority;
        report += "    " + icon + " #" + t.id + " — " + t.desc + "\n";
      });
    });
  }

  report += "\n══════════════════════════════\n";
  report += "📌 החלטות שהתקבלו בסשן:\n  (עדכן ידנית)\n";
  report += "══════════════════════════════\n";
  report += "📌 נקודת המשך לסשן הבא:\n  (עדכן ידנית)";

  try {
    const fileName = "חפיפה_" + now.replace(/[/:]/g, "-") + ".txt";
    DriveApp.getRootFolder().createFile(fileName, report, MimeType.PLAIN_TEXT);
    Logger.log("[task_EndOfDay] נשמר: " + fileName);
  } catch (e) {
    Logger.log("[task_EndOfDay] שגיאה בשמירה: " + e.message);
  }

  const reportEscaped = report
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;");

  const htmlContent =
    '<!DOCTYPE html>' +
    '<html dir="rtl">' +
    '<head>' +
    '<base target="_top">' +
    '<style>' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { direction: rtl; font-family: Arial, sans-serif; padding: 16px; background: #f8f9fa; color: #222; font-size: 13px; }' +
    'h3 { color: #1a3a5c; font-size: 15px; border-bottom: 2px solid #1a3a5c; padding-bottom: 8px; margin-bottom: 12px; }' +
    '#reportBox { width: 100%; height: 380px; font-family: monospace; font-size: 12px; direction: rtl; padding: 10px; border: 1px solid #ccc; border-radius: 4px; background: #fff; resize: none; white-space: pre; overflow: auto; }' +
    '.buttons { margin-top: 12px; display: flex; gap: 8px; justify-content: center; }' +
    '.btn-copy { background: #1a3a5c; color: #fff; border: none; border-radius: 4px; padding: 9px 28px; font-size: 13px; cursor: pointer; font-weight: bold; }' +
    '.btn-copy:hover { background: #254e7a; }' +
    '.btn-close { background: #fff; border: 1px solid #bbb; border-radius: 4px; padding: 9px 20px; font-size: 13px; cursor: pointer; }' +
    '#msg { margin-top: 8px; text-align: center; font-size: 12px; color: #2e7d32; min-height: 16px; }' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<h3>\uD83D\uDCCB סיום יום \u2014 מסמך חפיפה</h3>' +
    '<textarea id="reportBox" readonly>' + reportEscaped + '</textarea>' +
    '<div id="msg"></div>' +
    '<div class="buttons">' +
    '<button class="btn-copy" onclick="copyReport()">\uD83D\uDCCB העתק דוח</button>' +
    '<button class="btn-close" onclick="google.script.host.close()">סגור</button>' +
    '</div>' +
    '<script>' +
    'function copyReport() {' +
    '  var box = document.getElementById("reportBox");' +
    '  box.select();' +
    '  box.setSelectionRange(0, 99999);' +
    '  try {' +
    '    document.execCommand("copy");' +
    '    document.getElementById("msg").textContent = "\u2705 הדוח הועתק ללוח!";' +
    '    setTimeout(function() { document.getElementById("msg").textContent = ""; }, 2500);' +
    '  } catch(e) {' +
    '    document.getElementById("msg").textContent = "\u274C שגיאה \u2014 סמן ידנית והעתק";' +
    '  }' +
    '}' +
    '<\/script>' +
    '</body>' +
    '</html>';

  const html = HtmlService.createHtmlOutput(htmlContent)
    .setWidth(620)
    .setHeight(560)
    .setTitle("סיום יום — מסמך חפיפה");
  ui.showModalDialog(html, "📋 סיום יום — מסמך חפיפה");
}

// ══════════════════════════════════════════════════════════════════
// תיעוד פונקציונלי
// ══════════════════════════════════════════════════════════════════

function task_DocFunctions() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheetName = "תיעוד_פונקציות";
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = ["שירות", "קובץ", "פונקציה", "תיאור", "קלט", "פלט", "תלויות", "גרסה"];
    const hRange  = sheet.getRange(1, 1, 1, headers.length);
    hRange.setValues([headers]);
    hRange.setBackground(TASK_COLOR_HEADER);
    hRange.setFontColor(TASK_COLOR_WHITE);
    hRange.setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else {
    sheet.getRange(2, 1, sheet.getLastRow(), 8).clearContent();
  }

  try {
    const response = UrlFetchApp.fetch(
      "https://script.googleapis.com/v1/projects/1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf/content",
      {
        method:  "get",
        headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      }
    );

    if (response.getResponseCode() !== 200) {
      ui.alert("❌ שגיאה בגישה לעורך: " + response.getResponseCode());
      return;
    }

    const files   = JSON.parse(response.getContentText()).files || [];
    const rows    = [];
    const fnRegex = /function\s+([a-zA-Z0-9_]+)\s*\(/g;

    files.forEach(function(file) {
      if (file.type !== "SERVER_JS" || !file.source) return;
      const source       = file.source;
      const versionLine  = source.match(/@version[^\n]*/);
      const version      = versionLine ? versionLine[0].replace(/@version/i, "").replace(/[*/|]/g, "").trim().split(" ")[0] : "—";
      const serviceMatch = source.match(/@service\s+(\S+)/);
      const service      = serviceMatch ? serviceMatch[1] : "—";

      let match;
      fnRegex.lastIndex = 0;
      while ((match = fnRegex.exec(source)) !== null) {
        const fnName = match[1];
        if (fnName.startsWith("_")) continue;
        rows.push([service, file.name, fnName, "—", "—", "—", "—", version]);
      }
    });

    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, 8).setValues(rows);
      sheet.autoResizeColumns(1, 8);
    }

    ui.alert("✅ תיעוד פונקציות הושלם — " + rows.length + " פונקציות נמצאו.");

  } catch (e) {
    Logger.log("[task_DocFunctions] " + e.message);
    ui.alert("❌ שגיאה: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// הוספת משימה יחידה מטופס HTML
// ══════════════════════════════════════════════════════════════════

function task_AddFromDialog(data) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TASK_SHEET_NAME);
  if (!sheet) return "❌ גיליון לא נמצא — הרץ task_SetupSheet תחילה";
  try {
    const now = Utilities.formatDate(new Date(), "Asia/Jerusalem", "dd/MM/yyyy HH:mm");
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
    if (lastDataRow >= TASK_DATA_START) {
      const existing     = sheet.getRange(TASK_DATA_START, COL_DESC, lastDataRow - TASK_DATA_START + 1, 1).getValues();
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

// ══════════════════════════════════════════════════════════════════
// [v2.0.0] עיצוב גליון יומן_אירועים_רפואי — סטנדרט ניהול_מיילים
// מריצים פעם אחת על גליון קיים עם כותרות עברית בשורה 1
// ══════════════════════════════════════════════════════════════════

function buildMedicalEventsSheet() {
  const SHEET_NAME   = "יומן_אירועים_רפואי";
  const HEADER_COLOR = "#1a3a5c";
  const HEADER_FONT  = "#FFFFFF";
  const ROW3_COLOR   = "#cfe2f3";  // תכלת בהיר — כמו ניהול_מיילים
  const TOTAL_COLS   = 7;

  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const ui  = SpreadsheetApp.getUi();

  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    ui.alert("❌ גליון '" + SHEET_NAME + "' לא נמצא.\nצור את הגליון תחילה.");
    return;
  }

  // ── שלב 1: הכנסת 3 שורות ריקות מעל שורה 1 הקיימת ──────────────
  // שורה 1 הנוכחית (כותרות עברית) תרד לשורה 4
  sheet.insertRowsBefore(1, 3);

  // ── שלב 2: עיצוב שורות 1-3 — ריקות, רקע לבן ─────────────────────
  const topRange = sheet.getRange(1, 1, 3, TOTAL_COLS);
  topRange.clearContent();
  topRange.setBackground("#FFFFFF");
  topRange.setBorder(false, false, false, false, false, false);

  // גובה שורות
  sheet.setRowHeight(1, 20);
  sheet.setRowHeight(2, 60);  // שורה 2 — מקום לאיקון עתידי
  sheet.setRowHeight(3, 20);

  // ── שלב 3: החלפת כותרות שורה 4 לאנגלית ─────────────────────────
  const headers = [
    "Event_Date",
    "Event_Type",
    "Medical_System",
    "Issuer",
    "Summary",
    "Routing_Category",
    "File_ID"
  ];

  const headerRange = sheet.getRange(4, 1, 1, TOTAL_COLS);
  headerRange.setValues([headers]);
  headerRange.setBackground(HEADER_COLOR);
  headerRange.setFontColor(HEADER_FONT);
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  headerRange.setFontSize(11);
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(4, 35);

  // ── שלב 4: עיצוב שורת תווית שורה 3 (label bar) ─────────────────
  // שורה 3 — רקע תכלת בהיר עם תוויות שירות (כמו ניהול_מיילים)
  sheet.getRange(3, 1, 1, TOTAL_COLS).setBackground(ROW3_COLOR);

  // ── שלב 5: הקפאת 4 שורות ראשונות ──────────────────────────────
  sheet.setFrozenRows(4);

  // ── שלב 6: רוחב עמודות ─────────────────────────────────────────
  sheet.setColumnWidth(1, 110);  // A — Event_Date
  sheet.setColumnWidth(2, 130);  // B — Event_Type
  sheet.setColumnWidth(3, 140);  // C — Medical_System
  sheet.setColumnWidth(4, 140);  // D — Issuer
  sheet.setColumnWidth(5, 350);  // E — Summary — רחב
  sheet.setColumnWidth(6, 130);  // F — Routing_Category
  sheet.setColumnWidth(7, 200);  // G — File_ID

  SpreadsheetApp.flush();

  Logger.log("[buildMedicalEventsSheet] הושלם — גליון " + SHEET_NAME + " עוצב בסטנדרט ניהול_מיילים.");
  ui.alert(
    "✅ גליון '" + SHEET_NAME + "' עוצב בהצלחה.\n\n" +
    "שורות 1-3: ריקות (שורה 2 מוכנה לאיקון עתידי)\n" +
    "שורה 4: כותרות אנגלית — רקע כחול כהה\n" +
    "הקפאה: 4 שורות\n\n" +
    "נתונים קיימים עברו לשורה 5+."
  );
}