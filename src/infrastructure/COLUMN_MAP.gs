/**
 * MedicalPilot — COLUMN_MAP.gs
 * @version 2.2.0 | @updated 28/04/2026 16:03 | @service COLUMN_MAP
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/COLUMN_MAP.gs
 * תפקיד: תיעוד מבנה עמודות + הקמת גליונות + שחזור כותרות + בדיקת הרשאות
 * שינוי: הוספת גליון מנהל_משאבים + פונקציית הקמת גליון חדש מהמפה
 */

// ══════════════════════════════════════════════════════════════════
// תיעוד — מבנה עמודות גליון ניהול_מיילים
// ══════════════════════════════════════════════════════════════════

/*
## מיפוי שינוי — ישן → חדש (26/04/2026)

| עמודה ישנה | שם ישן | עמודה חדשה | שם חדש | סוג שינוי |
|-----------|---------------------|-----------|-------------------|-------------------|
| A | File ID | A | File_ID | שינוי שם |
| B | Capture Date | B | Capture_Date | שינוי שם |
| C | Source | C | Source | ללא שינוי |
| D | Internal ID | D | Source_Reference | שינוי שם + לוגיקה |
| E | Subject | E | Source_Title | שינוי שם |
| F | Sender | F | Source_Author | שינוי שם |
| G | Document Date | G | Source_Date | שינוי שם |
| H | File Name | H | Attachment_Name | שינוי שם |
| I | Subject (כפול) | I | Doc_Title | שינוי שם + תוכן |
| J | Issuer | J | Doc_Issuer | שינוי שם |
| K | System Admin | K | Doc_Date | שינוי שם + תוכן |
| L | Classification | L | Doc_Category | שינוי שם |
| M | Extraction Status | M | Pipeline_Status | שינוי שם + לוגיקה |
| N | Status | N | Extraction_Status | שינוי שם |
| O | Stored URL | W | Source_URL | הזזת נתונים |
| P | Source_Type | O | File_Type | הזזת נתונים |
| Q | Link_TXT | X | TXT_URL | הזזת נתונים |
| R | File_Size | P | File_Size | הזזת נתונים |
| S | Technical_Temp_Name | U | QA_Status | הזזה + תוכן חדש |
| T | Scan_Complexity | Q | Complexity | הזזת נתונים |
| U | Duplicate_Suspect | R | Duplicate_Flag | הזזת נתונים |
| — | חדש | S | Error_Code | חדש |
| — | חדש | T | Error_Detail | חדש |
| — | חדש | V | שמור | חדש |
| — | חדש | Y | Temp_URL | חדש |
| — | חדש | Z | Raw_Text | חדש |

## כללי כתיבה לכל שירות

S03, S04 — כותבים רק לעמודות A-H ו-W
S05 — כותב רק לעמודות M, O, P, R, S, T
S06 — כותב רק לעמודות M, O, P, Q, S, T, X, Y, Z
S07 — כותב רק לעמודות I, J, K, L, M, N, Q, R, S, T
QA — כותב רק לעמודה U
כל שירות — בהצלחה מנקה S ו-T. בכישלון כותב קוד ב-S ופירוט ב-T
*/

// ══════════════════════════════════════════════════════════════════
// מבנה נתונים — מפת עמודות לפי גליון
// ══════════════════════════════════════════════════════════════════

const SHEETS_MAP = {

  "ניהול_מיילים": [
    { col: 1,  name: "File_ID",           zone: "Source Metadata",  writers: ["S03","S04"],                   readers: ["S05","S06"],               values: "מזהה Drive",                                                              notes: "מזהה ייחודי של הקובץ ב-Drive" },
    { col: 2,  name: "Capture_Date",      zone: "Source Metadata",  writers: ["S03","S04"],                   readers: [],                          values: "תאריך",                                                                   notes: "תאריך כניסה למערכת" },
    { col: 3,  name: "Source",            zone: "Source Metadata",  writers: ["S03","S04"],                   readers: ["S05"],                     values: "Gmail|Drive_Manual",                                                      notes: "מקור הרשומה" },
    { col: 4,  name: "Source_Reference",  zone: "Source Metadata",  writers: ["S03","S04"],                   readers: [],                          values: "מזהה חופשי",                                                             notes: "מזהה מייל (Gmail) / מזהה תיקייה (Drive)" },
    { col: 5,  name: "Source_Title",      zone: "Source Metadata",  writers: ["S03","S04"],                   readers: [],                          values: "טקסט חופשי",                                                             notes: "נושא מייל / שם קובץ" },
    { col: 6,  name: "Source_Author",     zone: "Source Metadata",  writers: ["S03","S04"],                   readers: [],                          values: "טקסט חופשי",                                                             notes: "שולח מייל / עמוס ידני" },
    { col: 7,  name: "Source_Date",       zone: "Source Metadata",  writers: ["S03","S04"],                   readers: [],                          values: "תאריך",                                                                   notes: "תאריך מייל / תאריך עדכון קובץ" },
    { col: 8,  name: "Attachment_Name",   zone: "Source Metadata",  writers: ["S03","S04"],                   readers: ["QA"],                      values: "שם קובץ",                                                                notes: "שם הקובץ הפיזי כולל סיומת" },
    { col: 9,  name: "Doc_Title",         zone: "Content Metadata", writers: ["S07"],                         readers: [],                          values: "טקסט חופשי",                                                             notes: "כותרת המסמך האמיתית — מחולץ ע\"י S07" },
    { col: 10, name: "Doc_Issuer",        zone: "Content Metadata", writers: ["S07"],                         readers: [],                          values: "טקסט חופשי",                                                             notes: "מנפיק המסמך — מחולץ ע\"י S07" },
    { col: 11, name: "Doc_Date",          zone: "Content Metadata", writers: ["S07"],                         readers: [],                          values: "תאריך",                                                                   notes: "תאריך המסמך עצמו — מחולץ ע\"י S07" },
    { col: 12, name: "Doc_Category",      zone: "Content Metadata", writers: ["S07"],                         readers: [],                          values: "רפואי|חשבונאי|משפטי|ביטוחי|אחר",                                        notes: "קטגוריה — מחולץ ע\"י S07" },
    { col: 13, name: "Pipeline_Status",   zone: "סטטוסים",          writers: ["S05","S06","S07"],             readers: ["S06","QA"],                values: "ממתין להמרה ל-TXT|הומר ל-TXT|מחולץ|ממתין לאימות|מאושר",               notes: "סטטוס הרשומה ב-pipeline" },
    { col: 14, name: "Extraction_Status", zone: "סטטוסים",          writers: ["S07"],                         readers: [],                          values: "ממתין|חולץ חלקי|חולץ מלא",                                              notes: "סטטוס חילוץ תוכן" },
    { col: 15, name: "File_Type",         zone: "טכני",             writers: ["S05","S06"],                   readers: ["QA"],                      values: "SYSTEM_PDF|SYSTEM_IMG|SYSTEM_GDOC|SYSTEM_DOCX|SYSTEM_TXT|SYSTEM_SHEET", notes: "סוג קובץ לפי MIME" },
    { col: 16, name: "File_Size",         zone: "טכני",             writers: ["S05","S06"],                   readers: ["QA"],                      values: "XX KB|XX MB",                                                            notes: "גודל קובץ" },
    { col: 17, name: "Complexity",        zone: "טכני",             writers: ["S06","S07"],                   readers: ["S07"],                     values: "פשוט|בינוני|מורכב",                                                      notes: "מורכבות המסמך" },
    { col: 18, name: "Duplicate_Flag",    zone: "טכני",             writers: ["S05","S07"],                   readers: ["QA","S07"],                values: "חשוד ככפול — שורה X|כפול מאושר — שורה X|חשוד כלוגו/ריק|לוגו מאושר",  notes: "זיהוי ואימות כפולים" },
    { col: 19, name: "Error_Code",        zone: "שגיאות",           writers: ["S03","S04","S05","S06","S07"], readers: ["QA"],                      values: "429|503|NO_ID|ACCESS|EMPTY|UNSUPPORTED|PARSE|UNKNOWN|SKIP",            notes: "קוד שגיאה קצר — מנוקה בהצלחה" },
    { col: 20, name: "Error_Detail",      zone: "שגיאות",           writers: ["S03","S04","S05","S06","S07"], readers: ["QA"],                      values: "טקסט חופשי",                                                             notes: "פירוט שגיאה — מנוקה בהצלחה" },
    { col: 21, name: "QA_Status",         zone: "בדיקות",           writers: ["QA"],                          readers: [],                          values: "✅ תקין|⚠️ + פירוט",                                                     notes: "תוצאת בדיקת QA" },
    { col: 22, name: "",                  zone: "מרווח",            writers: [],                              readers: [],                          values: "",                                                                       notes: "שמור לשימוש עתידי" },
    { col: 23, name: "Source_URL",        zone: "לינקים",           writers: ["S03","S04"],                   readers: ["S06","QA"],                values: "https://drive.google.com/...",                                           notes: "קישור לקובץ המקורי ב-Drive" },
    { col: 24, name: "TXT_URL",           zone: "לינקים",           writers: ["S06"],                         readers: ["S05","S07","QA"],          values: "https://drive.google.com/...",                                           notes: "קישור לקובץ TXT שנוצר" },
    { col: 25, name: "Temp_URL",          zone: "לינקים",           writers: ["S06"],                         readers: [],                          values: "https://drive.google.com/...",                                           notes: "קישור זמני במהלך המרה" },
    { col: 26, name: "Raw_Text",          zone: "טקסט גולמי",       writers: ["S06","S07"],                   readers: [],                          values: "טקסט מלא",                                                               notes: "הטקסט המלא — עמודה אחרונה, רחבה מאוד" }
  ],

  "דוגמאות_למידה": [
    { col: 1,  name: "Subject",           zone: "זיהוי",   writers: ["S08"], readers: ["S07"], values: "טקסט חופשי",                      notes: "כותרת/סוג המסמך לדוגמה" },
    { col: 2,  name: "Issuer",            zone: "זיהוי",   writers: ["S08"], readers: ["S07"], values: "טקסט חופשי",                      notes: "מנפיק המסמך לדוגמה" },
    { col: 3,  name: "Classification",    zone: "זיהוי",   writers: ["S08"], readers: ["S07"], values: "רפואי|חשבונאי|משפטי|ביטוחי|אחר", notes: "קטגוריה מאושרת ידנית" },
    { col: 4,  name: "TXT_Document_Link", zone: "קישורים", writers: ["S08"], readers: ["S07"], values: "https://drive.google.com/...",      notes: "קישור לקובץ TXT לדוגמה" },
    { col: 5,  name: "Complexity",        zone: "זיהוי",   writers: ["S08"], readers: ["S07"], values: "פשוט|בינוני|מורכב",                notes: "מורכבות המסמך" },
    { col: 6,  name: "Doc_Date",          zone: "זיהוי",   writers: ["S08"], readers: ["S07"], values: "תאריך",                            notes: "תאריך המסמך" },
    { col: 7,  name: "Approved_By",       zone: "אימות",   writers: ["S08"], readers: [],      values: "טקסט חופשי",                      notes: "מי אישר את הדוגמה" },
    { col: 8,  name: "Approved_Date",     zone: "אימות",   writers: ["S08"], readers: [],      values: "תאריך",                            notes: "תאריך אישור" },
    { col: 9,  name: "Notes",             zone: "אימות",   writers: ["S08"], readers: ["S07"], values: "טקסט חופשי",                      notes: "הערות לדוגמה" },
    { col: 10, name: "Original_File_ID",  zone: "קישורים", writers: ["S08"], readers: ["S07"], values: "Drive ID",                         notes: "מזהה קובץ מקורי ב-Drive" }
  ],

  "מנהל_משאבים": [
    { col: 1,  name: "Extractor_ID",     zone: "זיהוי",  writers: ["ExtractorManager"], readers: ["S06","S07"],                    values: "GEMINI_FLASH|GEMINI_PRO",                      notes: "מזהה ייחודי של המחלץ" },
    { col: 2,  name: "Endpoint_URL",     zone: "זיהוי",  writers: ["ExtractorManager"], readers: ["S06","S07"],                    values: "https://generativelanguage.googleapis.com/...", notes: "כתובת ה-API המלאה" },
    { col: 3,  name: "Daily_Quota",      zone: "מכסה",   writers: ["ExtractorManager"], readers: ["ExtractorManager"],             values: "1500|50",                                      notes: "מכסה יומית מקסימלית" },
    { col: 4,  name: "Used_Today",       zone: "מכסה",   writers: ["ExtractorManager"], readers: ["ExtractorManager"],             values: "מספר שלם",                                     notes: "כמה בקשות נשלחו היום — מתאפס כל לילה" },
    { col: 5,  name: "Remaining",        zone: "מכסה",   writers: [],                   readers: ["ExtractorManager","S06","S07"], values: "=C-D",                                         notes: "נוסחה חיה — Daily_Quota פחות Used_Today" },
    { col: 6,  name: "RPM_Limit",        zone: "קצב",    writers: ["ExtractorManager"], readers: ["ExtractorManager"],             values: "15|2",                                         notes: "בקשות מקסימליות לדקה" },
    { col: 7,  name: "Status",           zone: "סטטוס",  writers: ["ExtractorManager"], readers: ["S06","S07"],                    values: "ACTIVE|EXHAUSTED|ERROR|DISABLED",              notes: "מצב המחלץ כרגע" },
    { col: 8,  name: "Complexity_Match", zone: "ניתוב",  writers: ["ExtractorManager"], readers: ["S07"],                         values: "SIMPLE,MEDIUM|COMPLEX",                        notes: "לאיזה מורכבות המחלץ מתאים" },
    { col: 9,  name: "Reset_Time",       zone: "תזמון",  writers: ["ExtractorManager"], readers: ["ExtractorManager"],             values: "00:00 UTC",                                    notes: "שעת איפוס יומי" },
    { col: 10, name: "Last_Used",        zone: "תזמון",  writers: ["ExtractorManager"], readers: [],                              values: "תאריך ושעה",                                   notes: "מתי בוצעה הבקשה האחרונה" },
    { col: 11, name: "Notes",            zone: "מידע",   writers: ["ExtractorManager"], readers: [],                              values: "טקסט חופשי",                                   notes: "הערות — למשל: מפתח הוחלף, שגיאה ידועה" }
  ]

};

// ══════════════════════════════════════════════════════════════════
// נתוני ברירת מחדל לגליונות חדשים
// ══════════════════════════════════════════════════════════════════

const SHEETS_DEFAULT_DATA = {

  "מנהל_משאבים": [
    [
      "GEMINI_FLASH",
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      1500, 0, "=C2-D2", 15, "ACTIVE", "SIMPLE,MEDIUM", "00:00 UTC", "", ""
    ],
    [
      "GEMINI_PRO",
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent",
      50, 0, "=C3-D3", 2, "ACTIVE", "COMPLEX", "00:00 UTC", "", ""
    ]
  ]

};

// ══════════════════════════════════════════════════════════════════
// פונקציה 1 — הדפסת מבנה גליון
// ══════════════════════════════════════════════════════════════════

function printSheetMap() {
  const ui = SpreadsheetApp.getUi();
  const sheetName = _promptSheetName(ui);
  if (!sheetName) return;

  const cols = SHEETS_MAP[sheetName];
  if (!cols) { ui.alert("גליון לא נמצא במפה: " + sheetName); return; }

  let report = "מבנה עמודות — " + sheetName + "\n";
  report += "═".repeat(50) + "\n\n";

  let currentZone = "";
  cols.forEach(function(c) {
    if (c.zone !== currentZone) {
      currentZone = c.zone;
      report += "\n── " + currentZone + " ──\n";
    }
    const letter = _colToLetter(c.col);
    report += letter + " | " + (c.name || "שמור") + "\n";
    if (c.notes)          report += "   → " + c.notes + "\n";
    if (c.writers.length) report += "   כותבים: " + c.writers.join(", ") + "\n";
    if (c.values)         report += "   ערכים: " + c.values + "\n";
  });

  ui.alert("מפת עמודות — " + sheetName, report, ui.ButtonSet.OK);
}

// ══════════════════════════════════════════════════════════════════
// פונקציה 2 — פרטי עמודה בודדת
// ══════════════════════════════════════════════════════════════════

function printColumnDetail() {
  const ui = SpreadsheetApp.getUi();
  const sheetName = _promptSheetName(ui);
  if (!sheetName) return;

  const colResult = ui.prompt("פרטי עמודה", "הכנס אות עמודה (A-Z):", ui.ButtonSet.OK_CANCEL);
  if (colResult.getSelectedButton() !== ui.Button.OK) return;

  const letter = colResult.getResponseText().trim().toUpperCase();
  const colNum = _letterToCol(letter);
  const cols = SHEETS_MAP[sheetName];
  if (!cols) { ui.alert("גליון לא נמצא: " + sheetName); return; }

  const col = cols.find(function(c) { return c.col === colNum; });
  if (!col) { ui.alert("עמודה " + letter + " לא מוגדרת במפה."); return; }

  let detail = "עמודה " + letter + " — " + sheetName + "\n";
  detail += "═".repeat(40) + "\n\n";
  detail += "שם: "     + (col.name || "שמור") + "\n";
  detail += "אזור: "   + col.zone + "\n";
  detail += "הערה: "   + col.notes + "\n";
  detail += "ערכים: "  + col.values + "\n";
  detail += "כותבים: " + (col.writers.join(", ") || "—") + "\n";
  detail += "קוראים: " + (col.readers.join(", ") || "—") + "\n";

  ui.alert("פרטי עמודה " + letter, detail, ui.ButtonSet.OK);
}

// ══════════════════════════════════════════════════════════════════
// פונקציה 3 — שחזור כותרות
// ══════════════════════════════════════════════════════════════════

function restoreHeaders() {
  const ui = SpreadsheetApp.getUi();
  const sheetName = _promptSheetName(ui);
  if (!sheetName) return;

  const cols = SHEETS_MAP[sheetName];
  if (!cols) { ui.alert("גליון לא נמצא במפה: " + sheetName); return; }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) { ui.alert("גליון לא נמצא בקובץ: " + sheetName); return; }

  const confirm = ui.alert(
    "שחזור כותרות",
    "האם לשחזר את כותרות שורה 1 בגליון " + sheetName + "?\nפעולה זו תדרוס את הכותרות הנוכחיות.",
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  const totalCols = cols.length;
  const headers = new Array(totalCols).fill("");
  cols.forEach(function(c) { headers[c.col - 1] = c.name || ""; });

  sheet.getRange(1, 1, 1, totalCols).setValues([headers]);
  sheet.getRange(1, 1, 1, totalCols).setFontWeight("bold");
  sheet.getRange(1, 1).activate();

  ui.alert("✅ כותרות שוחזרו בהצלחה לגליון " + sheetName);
}

// ══════════════════════════════════════════════════════════════════
// פונקציה 4 — בדיקת הרשאות כתיבה
// ══════════════════════════════════════════════════════════════════

function checkWritePermissions() {
  const ui = SpreadsheetApp.getUi();
  const sheetName = _promptSheetName(ui);
  if (!sheetName) return;

  const serviceResult = ui.prompt(
    "בדיקת הרשאות כתיבה",
    "הכנס שם שירות (S03/S04/S05/S06/S07/S08/QA/ExtractorManager):",
    ui.ButtonSet.OK_CANCEL
  );
  if (serviceResult.getSelectedButton() !== ui.Button.OK) return;

  const service = serviceResult.getResponseText().trim().toUpperCase();
  const cols = SHEETS_MAP[sheetName];
  if (!cols) { ui.alert("גליון לא נמצא: " + sheetName); return; }

  let allowed = [];
  let forbidden = [];

  cols.forEach(function(c) {
    const letter = _colToLetter(c.col);
    if (c.writers.indexOf(service) !== -1) {
      allowed.push(letter + " (" + (c.name || "שמור") + ")");
    } else if (c.name !== "") {
      forbidden.push(letter + " (" + c.name + ")");
    }
  });

  let report = "שירות: " + service + " | גליון: " + sheetName + "\n\n";
  report += "✅ מורשה לכתוב:\n" + (allowed.join(", ") || "—") + "\n\n";
  report += "🚫 אסור לכתוב:\n" + (forbidden.join(", ") || "—");

  ui.alert("הרשאות כתיבה — " + service, report, ui.ButtonSet.OK);
}

// ══════════════════════════════════════════════════════════════════
// פונקציה 5 — הקמת גליון חדש מהמפה (כולל נתוני ברירת מחדל)
// ══════════════════════════════════════════════════════════════════

function buildSheetFromMap() {
  const ui = SpreadsheetApp.getUi();
  const sheetName = _promptSheetName(ui);
  if (!sheetName) return;

  const cols = SHEETS_MAP[sheetName];
  if (!cols) { ui.alert("גליון לא נמצא במפה: " + sheetName); return; }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (sheet) {
    const answer = ui.alert(
      "גליון קיים",
      "הגליון '" + sheetName + "' כבר קיים.\nהאם לאפס ולבנות מחדש?\n\n⚠️ כל הנתונים הקיימים יימחקו.",
      ui.ButtonSet.YES_NO
    );
    if (answer !== ui.Button.YES) return;
    ss.deleteSheet(sheet);
  }

  // יצירת הגליון
  sheet = ss.insertSheet(sheetName);

  // כותרות — שורה 1
  const totalCols = cols.length;
  const headers = new Array(totalCols).fill("");
  cols.forEach(function(c) { headers[c.col - 1] = c.name || ""; });

  const headerRange = sheet.getRange(1, 1, 1, totalCols);
  headerRange.setValues([headers]);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#d9e1f2");

  // הקפאת שורה ראשונה
  sheet.setFrozenRows(1);

  // נתוני ברירת מחדל אם קיימים
  const defaultData = SHEETS_DEFAULT_DATA[sheetName];
  if (defaultData && defaultData.length > 0) {
    sheet.getRange(2, 1, defaultData.length, totalCols).setValues(defaultData);
  }

  // עיצוב — הרחבת עמודות לפי תוכן
  sheet.autoResizeColumns(1, totalCols);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1).activate();

  const dataMsg = defaultData
    ? " עם " + defaultData.length + " שורות נתוני ברירת מחדל."
    : " ללא נתונים — מוכן לקלט ידני.";

  ui.alert("✅ גליון '" + sheetName + "' נוצר בהצלחה" + dataMsg);
}

// ══════════════════════════════════════════════════════════════════
// פונקציות עזר
// ══════════════════════════════════════════════════════════════════

function _promptSheetName(ui) {
  const sheets = Object.keys(SHEETS_MAP).join("\n");
  const result = ui.prompt(
    "בחר גליון",
    "גליונות זמינים:\n" + sheets + "\n\nהכנס שם גליון:",
    ui.ButtonSet.OK_CANCEL
  );
  if (result.getSelectedButton() !== ui.Button.OK) return null;
  const name = result.getResponseText().trim();
  if (!SHEETS_MAP[name]) {
    ui.alert("גליון לא נמצא: " + name);
    return null;
  }
  return name;
}

function _colToLetter(num) {
  let letter = "";
  while (num > 0) {
    const mod = (num - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    num = Math.floor((num - 1) / 26);
  }
  return letter;
}

function _letterToCol(letter) {
  let col = 0;
  for (let i = 0; i < letter.length; i++) {
    col = col * 26 + letter.charCodeAt(i) - 64;
  }
  return col;
}
