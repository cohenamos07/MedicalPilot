/**
 * MedicalPilot — COLUMN_MAP.gs
 * @version 2.8.0 | @updated 14/06/2026 20:10 | @service COLUMN_MAP
 * @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/COLUMN_MAP.gs
 * @description מאגר עמודות מרכזי — Single Source of Truth לכל גיליוני המערכת.
 * @impacts גיליונות: ניהול_מיילים (26 עמודות), דוגמאות_למידה, מנהל_משאבים, S10, מסנכרן_קבצים.
 *          תלויים ישירים: S03 (A-H), S05 (M,O,P,R,S,T), S06 (M,O,P,Q,S,T,X,Y,Z),
 *          S07 (I,J,K,L,M,N,Q,R,S,T), S08 (I,J,K,L,M,U), S09 (גיליון S10).
 *          שינוי מספר עמודה = שבירת כל שירות שכותב אליה — לא לשנות ללא בדיקת כל התלויים.
 *          פונקציות printSheetMap, restoreHeaders, checkWritePermissions — כלי אבחון ידני בלבד.
 * @callers System_Doc_Builder (buildSheetFromMap), ViewEngine (restoreHeaders), כל שירותי ה-Pipeline
 * @functions SHEET_CONFIG, SHEETS_MAP, SHEETS_DEFAULT_DATA,
 *            insertEditorGitLinesColumns, printSheetMap, printColumnDetail,
 *            restoreHeaders, checkWritePermissions, buildSheetFromMap,
 *            buildS10LearningSheet, buildDevSyncSheet,
 *            _promptSheetName, _colToLetter, _letterToCol
 * @changes [v2.8.0] הוספת SHEET_CONFIG — FROZEN_ROWS:4, HEADER_ROW:4, FIRST_DATA_ROW:5 לגליון ניהול_מיילים
 *          [v2.7.0] הוספת Editor_Lines (5) ו-Git_Lines (6) למסנכרן_קבצים —
 *                   הזזת Version_Editor→7, Version_Git→8, Status→9, Action→10, Notes→11.
 *                   נוספה פונקציה חד-פעמית insertEditorGitLinesColumns.
 *          [v2.6.1] גרסת עורך קודמת
 *          [v2.6.0] [FIX-5] buildS10LearningSheet
 */

// ══════════════════════════════════════════════════════════════════
// תיעוד — מבנה עמודות גליון ניהול_מיילים
// ══════════════════════════════════════════════════════════════════

/*
## כללי כתיבה לכל שירות

S03, S04 — כותבים רק לעמודות A-H ו-W
S05      — כותב רק לעמודות M, O, P, R, S, T
S06      — כותב רק לעמודות M, O, P, Q, S, T, X, Y, Z
S07      — כותב רק לעמודות I, J, K, L, M, N, Q, R, S, T
S08      — כותב רק לעמודות I, J, K, L, M, U
S09      — כותב רק לגליונות היעד (יומן_אירועים_רפואי וכו')
S10      — כותב רק לגליון S10_למידה_רפואי
QA       — כותב רק לעמודה U
כל שירות — בהצלחה מנקה S ו-T. בכישלון כותב קוד ב-S ופירוט ב-T
*/


// ══════════════════════════════════════════════════════════════════
// תצורת גליונות — שורות מוגנות ונתונים
// ══════════════════════════════════════════════════════════════════

const SHEET_CONFIG = {
  "ניהול_מיילים": {
    FROZEN_ROWS:    4,  // שורות 1-4 מוקפאות — לא לגעת בקוד
    HEADER_ROW:     4,  // שורת כותרות
    FIRST_DATA_ROW: 5   // שורת נתונים ראשונה — כל לולאה מתחילה כאן
  }
};

const SHEETS_MAP = {

  "ניהול_מיילים": [
    { col: 1,  name: "File_ID",           zone: "Source Metadata",  writers: ["S03","S04"],                            readers: ["S05","S06"],               values: "מזהה Drive",                                                                           notes: "מזהה ייחודי של הקובץ ב-Drive" },
    { col: 2,  name: "Capture_Date",      zone: "Source Metadata",  writers: ["S03","S04"],                            readers: [],                          values: "תאריך",                                                                                notes: "תאריך כניסה למערכת" },
    { col: 3,  name: "Source",            zone: "Source Metadata",  writers: ["S03","S04"],                            readers: ["S05"],                     values: "Gmail|Drive_Manual",                                                                   notes: "מקור הרשומה" },
    { col: 4,  name: "Source_Reference",  zone: "Source Metadata",  writers: ["S03","S04"],                            readers: [],                          values: "מזהה חופשי",                                                                           notes: "מזהה מייל (Gmail) / מזהה תיקייה (Drive)" },
    { col: 5,  name: "Source_Title",      zone: "Source Metadata",  writers: ["S03","S04"],                            readers: [],                          values: "טקסט חופשי",                                                                           notes: "נושא מייל / שם קובץ" },
    { col: 6,  name: "Source_Author",     zone: "Source Metadata",  writers: ["S03","S04"],                            readers: [],                          values: "טקסט חופשי",                                                                           notes: "שולח מייל / עמוס ידני" },
    { col: 7,  name: "Source_Date",       zone: "Source Metadata",  writers: ["S03","S04"],                            readers: [],                          values: "תאריך",                                                                                notes: "תאריך מייל / תאריך עדכון קובץ" },
    { col: 8,  name: "Attachment_Name",   zone: "Source Metadata",  writers: ["S03","S04"],                            readers: ["QA"],                      values: "שם קובץ",                                                                              notes: "שם הקובץ הפיזי כולל סיומת" },
    { col: 9,  name: "Doc_Title",         zone: "Content Metadata", writers: ["S07","S08"],                            readers: [],                          values: "טקסט חופשי",                                                                           notes: "כותרת המסמך האמיתית" },
    { col: 10, name: "Doc_Issuer",        zone: "Content Metadata", writers: ["S07","S08"],                            readers: [],                          values: "טקסט חופשי",                                                                           notes: "מנפיק המסמך" },
    { col: 11, name: "Doc_Date",          zone: "Content Metadata", writers: ["S07","S08"],                            readers: [],                          values: "תאריך",                                                                                notes: "תאריך המסמך עצמו" },
    { col: 12, name: "Doc_Category",      zone: "Content Metadata", writers: ["S07","S08"],                            readers: [],                          values: "רפואי|חשבונאי|משפטי|ביטוחי|אחר",                                                       notes: "קטגוריה" },
    { col: 13, name: "Pipeline_Status",   zone: "סטטוסים",          writers: ["S05","S06","S07","S08","S09"],          readers: ["S06","QA"],                values: "ממתין להמרה ל-TXT|הומר ל-TXT|מחולץ|ממתין לאימות|מאושר|חולץ לגליונות",         notes: "סטטוס הרשומה ב-pipeline" },
    { col: 14, name: "Extraction_Status", zone: "סטטוסים",          writers: ["S07"],                                  readers: [],                          values: "ממתין|חולץ חלקי|חולץ מלא",                                                             notes: "סטטוס חילוץ תוכן" },
    { col: 15, name: "File_Type",         zone: "טכני",             writers: ["S05","S06"],                            readers: ["QA"],                      values: "SYSTEM_PDF|SYSTEM_IMG|SYSTEM_GDOC|SYSTEM_DOCX|SYSTEM_TXT|SYSTEM_SHEET",          notes: "סוג קובץ לפי MIME" },
    { col: 16, name: "File_Size",         zone: "טכני",             writers: ["S05","S06"],                            readers: ["QA"],                      values: "XX KB|XX MB",                                                                          notes: "גודל קובץ" },
    { col: 17, name: "Complexity",        zone: "טכני",             writers: ["S06","S07"],                            readers: ["S07"],                     values: "פשוט|בינוני|מורכב",                                                                    notes: "מורכבות המסמך" },
    { col: 18, name: "Duplicate_Flag",    zone: "טכני",             writers: ["S05","S07"],                            readers: ["QA","S07","S08"],          values: "חשוד ככפול — שורה X|כפול מאושר — שורה X|חשוד כלוגו|לוגו מאושר",              notes: "זיהוי ואימות כפולים" },
    { col: 19, name: "Error_Code",        zone: "שגיאות",           writers: ["S03","S04","S05","S06","S07","S09"],    readers: ["QA"],                      values: "429|503|NO_ID|ACCESS|EMPTY|UNSUPPORTED|PARSE|UNKNOWN|SKIP",                       notes: "קוד שגיאה קצר — מנוקה בהצלחה" },
    { col: 20, name: "Error_Detail",      zone: "שגיאות",           writers: ["S03","S04","S05","S06","S07","S09"],    readers: ["QA"],                      values: "טקסט חופשי",                                                                           notes: "פירוט שגיאה — מנוקה בהצלחה" },
    { col: 21, name: "QA_Status",         zone: "בדיקות",           writers: ["QA","S08"],                             readers: [],                          values: "✅ תקין|⚠️ + פירוט|✅ אושר ידנית|נשלח ללמידה",                                   notes: "תוצאת בדיקת QA / אימות ידני S08" },
    { col: 22, name: "",                  zone: "מרווח",            writers: [],                                       readers: [],                          values: "",                                                                                     notes: "שמור לשימוש עתידי" },
    { col: 23, name: "Source_URL",        zone: "לינקים",           writers: ["S03","S04"],                            readers: ["S06","QA","S08","S09"],    values: "https://drive.google.com/...",                                                          notes: "קישור לקובץ המקורי ב-Drive" },
    { col: 24, name: "TXT_URL",           zone: "לינקים",           writers: ["S06"],                                  readers: ["S05","S07","QA","S08","S09"], values: "https://drive.google.com/...",                                                       notes: "קישור לקובץ TXT שנוצר" },
    { col: 25, name: "Temp_URL",          zone: "לינקים",           writers: ["S06"],                                  readers: [],                          values: "https://drive.google.com/...",                                                          notes: "קישור זמני במהלך המרה" },
    { col: 26, name: "Raw_Text",          zone: "טקסט גולמי",       writers: ["S06","S07"],                            readers: [],                          values: "טקסט מלא",                                                                             notes: "הטקסט המלא — עמודה אחרונה, רחבה מאוד" }
  ],

  "דוגמאות_למידה": [
    { col: 1, name: "Classification",    zone: "תוכן",  writers: ["S08"], readers: ["S07"], values: "רפואי|חשבונאי|משפטי|ביטוחי|אחר", notes: "קטגוריה מאושרת ידנית" },
    { col: 2, name: "Subject",           zone: "תוכן",  writers: ["S08"], readers: ["S07"], values: "טקסט חופשי",                      notes: "כותרת/סוג המסמך לדוגמה" },
    { col: 3, name: "Issuer",            zone: "תוכן",  writers: ["S08"], readers: ["S07"], values: "טקסט חופשי",                      notes: "מנפיק המסמך לדוגמה" },
    { col: 4, name: "Complexity",        zone: "תוכן",  writers: ["S08"], readers: ["S07"], values: "פשוט|בינוני|מורכב",               notes: "מורכבות המסמך" },
    { col: 5, name: "Doc_Date",          zone: "תוכן",  writers: ["S08"], readers: ["S07"], values: "תאריך",                           notes: "תאריך המסמך" },
    { col: 6, name: "Notes",             zone: "תוכן",  writers: ["S08"], readers: ["S07"], values: "טקסט חופשי",                      notes: "הערת למידה — סיבת התיקון" },
    { col: 7, name: "Original_File_ID",  zone: "טכני",  writers: ["S08"], readers: ["S07"], values: "Drive ID",                        notes: "מזהה קובץ מקורי ב-Drive" },
    { col: 8, name: "TXT_Document_Link", zone: "טכני",  writers: ["S08"], readers: ["S07"], values: "https://drive.google.com/...",     notes: "קישור לקובץ TXT לדוגמה" }
  ],

  // [FIX-4] גליון למידה חדש — S10 אימות אירועים רפואיים
  "S10_למידה_רפואי": [
    { col: 1, name: "Source_File_ID",       zone: "מפתח",   writers: ["S10"], readers: ["S09"], values: "Drive ID",          notes: "מזהה קובץ המקור — מפתח מקשר לשורה בניהול_מיילים" },
    { col: 2, name: "Split_Index",          zone: "מפתח",   writers: ["S10"], readers: ["S09"], values: "X/Y",               notes: "מספור האירוע מתוך המסמך — לדוגמה 2/3" },
    { col: 3, name: "Target_Sheet",         zone: "תוכן",   writers: ["S10"], readers: ["S09"], values: "יומן_אירועים_רפואי|תרופות_קבועות|יומן_מצב_רפואי|בדיקות_דם|בדיקות_גנטיות|הנחיות_רפואיות_ומשימות", notes: "גליון היעד שאליו נכתב האירוע" },
    { col: 4, name: "Extracted_Data_JSON",  zone: "תוכן",   writers: ["S10"], readers: ["S09"], values: "JSON",               notes: "אובייקט השדות המלא של האירוע לאחר אימות" },
    { col: 5, name: "Complexity_Level",     zone: "תוכן",   writers: ["S10"], readers: ["S09"], values: "1|2|3|4|5",          notes: "רמת מורכבות האירוע 1=פשוט, 5=מורכב מאוד" },
    { col: 6, name: "User_Correction_Note", zone: "תוכן",   writers: ["S10"], readers: ["S09"], values: "טקסט חופשי",         notes: "הסבר המשתמש לתיקון — מה Gemini טעה ולמה" },
    { col: 7, name: "Timestamp",            zone: "טכני",   writers: ["S10"], readers: [],      values: "תאריך ושעה",         notes: "מועד אימות האירוע" }
  ],

  "מנהל_משאבים": [
    { col: 1,  name: "Extractor_ID",     zone: "זיהוי",  writers: ["ExtractorManager"], readers: ["S06","S07"],                    values: "GEMINI_FLASH_1.5|GEMINI_FLASH_2.0|GEMINI_PRO_1.5|GEMINI_PRO_2.5", notes: "מזהה ייחודי של המחלץ" },
    { col: 2,  name: "Endpoint_URL",     zone: "זיהוי",  writers: ["ExtractorManager"], readers: ["S06","S07"],                    values: "https://generativelanguage.googleapis.com/...",                    notes: "כתובת ה-API המלאה" },
    { col: 3,  name: "Daily_Quota",      zone: "מכסה",   writers: ["ExtractorManager"], readers: ["ExtractorManager"],             values: "1500|50",                                                          notes: "מכסה יומית מקסימלית" },
    { col: 4,  name: "Used_Today",       zone: "מכסה",   writers: ["ExtractorManager"], readers: ["ExtractorManager"],             values: "מספר שלם",                                                         notes: "כמה בקשות נשלחו היום — מתאפס כל לילה" },
    { col: 5,  name: "Remaining",        zone: "מכסה",   writers: [],                   readers: ["ExtractorManager","S06","S07"], values: "=C-D",                                                             notes: "נוסחה חיה — Daily_Quota פחות Used_Today" },
    { col: 6,  name: "RPM_Limit",        zone: "קצב",    writers: ["ExtractorManager"], readers: ["ExtractorManager"],             values: "15|2",                                                             notes: "בקשות מקסימליות לדקה" },
    { col: 7,  name: "Status",           zone: "סטטוס",  writers: ["ExtractorManager"], readers: ["S06","S07"],                    values: "ACTIVE|EXHAUSTED|ERROR|DISABLED",                                  notes: "מצב המחלץ כרגע" },
    { col: 8,  name: "Complexity_Match", zone: "ניתוב",  writers: ["ExtractorManager"], readers: ["S07"],                         values: "SIMPLE|MEDIUM|COMPLEX|DIAGNOSTICS|TABLES|ULTIMATE|HANDWRITING|MEDICAL_DEEP", notes: "לאיזה מורכבות המחלץ מתאים" },
    { col: 9,  name: "Reset_Time",       zone: "תזמון",  writers: ["ExtractorManager"], readers: ["ExtractorManager"],             values: "00:00 UTC",                                                        notes: "שעת איפוס יומי" },
    { col: 10, name: "Last_Used",        zone: "תזמון",  writers: ["ExtractorManager"], readers: [],                              values: "תאריך ושעה",                                                       notes: "מתי בוצעה הבקשה האחרונה" },
    { col: 11, name: "Notes",            zone: "מידע",   writers: ["ExtractorManager"], readers: [],                              values: "טקסט חופשי",                                                       notes: "הערות — למשל: מפתח הוחלף, שגיאה ידועה" }
  ],

  "מסנכרן_קבצים": [
    { col: 1,  name: "File_Name",      zone: "סנכרון", writers: [], readers: [], values: "שם קובץ",       notes: "שם הקובץ ללא סיומת" },
    { col: 2,  name: "Git_Path",       zone: "סנכרון", writers: [], readers: [], values: "נתיב",           notes: "נתיב מלא בקוד המקור" },
    { col: 3,  name: "Exists_Editor",  zone: "סנכרון", writers: [], readers: [], values: "כן|לא",          notes: "האם קיים בעורך" },
    { col: 4,  name: "Exists_Git",     zone: "סנכרון", writers: [], readers: [], values: "כן|לא",          notes: "האם קיים בגיטהאב" },
    { col: 5,  name: "Editor_Lines",   zone: "סנכרון", writers: [], readers: [], values: "מספר שורות",    notes: "מספר שורות קוד בעורך — לזיהוי שינויים" },
    { col: 6,  name: "Git_Lines",      zone: "סנכרון", writers: [], readers: [], values: "מספר שורות",    notes: "מספר שורות קוד ב-GitHub — להשוואה" },
    { col: 7,  name: "Version_Editor", zone: "סנכרון", writers: [], readers: [], values: "שורת גרסה",     notes: "שורת @version מהעורך" },
    { col: 8,  name: "Version_Git",    zone: "סנכרון", writers: [], readers: [], values: "שורת גרסה",     notes: "שורת @version מהגיט" },
    { col: 9,  name: "Status",         zone: "סנכרון", writers: [], readers: [], values: "תואם|שונה|חסר",  notes: "מצב השוואה" },
    { col: 10, name: "Action",         zone: "סנכרון", writers: [], readers: [], values: "שחזר|דחוף",      notes: "פעולה מוצעת" },
    { col: 11, name: "Notes",          zone: "סנכרון", writers: [], readers: [], values: "טקסט חופשי",    notes: "הערות" }
  ]

};

// ══════════════════════════════════════════════════════════════════
// נתוני ברירת מחדל לגליונות חדשים
// ══════════════════════════════════════════════════════════════════

const SHEETS_DEFAULT_DATA = {

  "מנהל_משאבים": [
    [
      "GEMINI_FLASH_1.5",
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      1500, 0, "=C2-D2", 15, "ACTIVE", "SIMPLE,MEDIUM", "00:00 UTC", "", "סוס עבודה יציב"
    ],
    [
      "GEMINI_FLASH_2.0",
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      1500, 0, "=C3-D3", 15, "ACTIVE", "SIMPLE,DIAGNOSTICS", "00:00 UTC", "", "המהיר החדש"
    ],
    [
      "GEMINI_PRO_1.5",
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent",
      50, 0, "=C4-D4", 2, "ACTIVE", "COMPLEX,TABLES", "00:00 UTC", "", "החזק היציב"
    ],
    [
      "GEMINI_PRO_2.5",
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent",
      50, 0, "=C5-D5", 2, "ACTIVE", "ULTIMATE,HANDWRITING,MEDICAL_DEEP", "00:00 UTC", "", "המוח המתקדם"
    ]
  ]

};

// ══════════════════════════════════════════════════════════════════
// פונקציה חד-פעמית — הכנסת עמודות Editor_Lines ו-Git_Lines
// להרצה פעם אחת בלבד אחרי עדכון הקוד
// ══════════════════════════════════════════════════════════════════

function insertEditorGitLinesColumns() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("מסנכרן_קבצים");
  if (!sheet) {
    Logger.log("❌ גליון מסנכרן_קבצים לא נמצא.");
    return;
  }

  // כתיבת כותרות לשורה 4 — שורת הכותרות בדוח המסנכרן
  sheet.getRange(4, 5).setValue("Editor_Lines");
  sheet.getRange(4, 6).setValue("Git_Lines");

  Logger.log("✅ כותרות Editor_Lines ו-Git_Lines נכתבו לשורה 4, עמודות E ו-F.");
}
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
  const cols   = SHEETS_MAP[sheetName];
  if (!cols) { ui.alert("גליון לא נמצא: " + sheetName); return; }

  const col = cols.find(function(c) { return c.col === colNum; });
  if (!col) { ui.alert("עמודה " + letter + " לא מוגדרת במפה."); return; }

  let detail = "עמודה " + letter + " — " + sheetName + "\n";
  detail += "═".repeat(40) + "\n\n";
  detail += "שם: "     + (col.name || "שמור") + "\n";
  detail += "אזור: "   + col.zone  + "\n";
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

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) { ui.alert("גליון לא נמצא בקובץ: " + sheetName); return; }

  const confirm = ui.alert(
    "שחזור כותרות",
    "האם לשחזר את כותרות שורה 1 בגליון " + sheetName + "?\nפעולה זו תדרוס את הכותרות הנוכחיות.",
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  const totalCols = cols.length;
  const headers   = new Array(totalCols).fill("");
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
    "הכנס שם שירות (S03/S04/S05/S06/S07/S08/S09/S10/QA/ExtractorManager):",
    ui.ButtonSet.OK_CANCEL
  );
  if (serviceResult.getSelectedButton() !== ui.Button.OK) return;

  const service = serviceResult.getResponseText().trim().toUpperCase();
  const cols    = SHEETS_MAP[sheetName];
  if (!cols) { ui.alert("גליון לא נמצא: " + sheetName); return; }

  let allowed   = [];
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
  report += "✅ מורשה לכתוב:\n" + (allowed.join(", ")   || "—") + "\n\n";
  report += "🚫 אסור לכתוב:\n"  + (forbidden.join(", ") || "—");

  ui.alert("הרשאות כתיבה — " + service, report, ui.ButtonSet.OK);
}

// ══════════════════════════════════════════════════════════════════
// פונקציה 5 — הקמת גליון חדש מהמפה
// ══════════════════════════════════════════════════════════════════

function buildSheetFromMap() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const existingSheets    = ss.getSheets().map(function(s) { return s.getName(); });
  const availableToCreate = Object.keys(SHEETS_MAP).filter(function(name) {
    return existingSheets.indexOf(name) === -1;
  });

  if (availableToCreate.length === 0) {
    ui.alert("✅ כל הגליונות המוגדרים במפה כבר קיימים בקובץ.\nאין גליונות חדשים להקים.");
    return;
  }

  const result = ui.prompt(
    "הקמת גליון חדש",
    "גליונות זמינים להקמה:\n" + availableToCreate.join("\n") + "\n\nהכנס שם גליון:",
    ui.ButtonSet.OK_CANCEL
  );
  if (result.getSelectedButton() !== ui.Button.OK) return;

  const sheetName = result.getResponseText().trim();
  if (!SHEETS_MAP[sheetName]) { ui.alert("גליון לא נמצא במפה: " + sheetName); return; }
  if (existingSheets.indexOf(sheetName) !== -1) {
    ui.alert("⚠️ גליון '" + sheetName + "' כבר קיים.\nלשחזור כותרות — השתמש ב'שחזור כותרות'.");
    return;
  }

  const cols      = SHEETS_MAP[sheetName];
  const sheet     = ss.insertSheet(sheetName);
  const totalCols = cols.length;
  const headers   = new Array(totalCols).fill("");
  cols.forEach(function(c) { headers[c.col - 1] = c.name || ""; });

  const headerRange = sheet.getRange(1, 1, 1, totalCols);
  headerRange.setValues([headers]);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#d9e1f2");
  sheet.setFrozenRows(1);

  const defaultData = SHEETS_DEFAULT_DATA[sheetName];
  if (defaultData && defaultData.length > 0) {
    sheet.getRange(2, 1, defaultData.length, totalCols).setValues(defaultData);
  }

  sheet.autoResizeColumns(1, totalCols);
  sheet.getRange(1, 1).activate();

  const dataMsg = defaultData
    ? " עם " + defaultData.length + " שורות נתוני ברירת מחדל."
    : " ללא נתונים — מוכן לקלט ידני.";

  ui.alert("✅ גליון '" + sheetName + "' נוצר בהצלחה" + dataMsg);
}

// ══════════════════════════════════════════════════════════════════
// [FIX-5] פונקציה 6 — הקמת גליון S10_למידה_רפואי + הגנה
// ══════════════════════════════════════════════════════════════════

function buildS10LearningSheet() {
  const SHEET_NAME = "S10_למידה_רפואי";
  const ss         = SpreadsheetApp.getActiveSpreadsheet();
  const ui         = SpreadsheetApp.getUi();
  const existing   = ss.getSheetByName(SHEET_NAME);

  if (existing) {
    ui.alert("⚠️ גליון '" + SHEET_NAME + "' כבר קיים.\nלשחזור כותרות — השתמש ב'שחזור כותרות'.");
    return;
  }

  const cols      = SHEETS_MAP[SHEET_NAME];
  const sheet     = ss.insertSheet(SHEET_NAME);
  const totalCols = cols.length;
  const headers   = new Array(totalCols).fill("");
  cols.forEach(function(c) { headers[c.col - 1] = c.name || ""; });

  const headerRange = sheet.getRange(1, 1, 1, totalCols);
  headerRange.setValues([headers]);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#fce4ec");
  headerRange.setFontColor("#880e4f");
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, totalCols);
  sheet.setColumnWidth(4, 400);

  const protection = sheet.getRange(1, 1, 1, totalCols).protect();
  protection.setDescription("כותרות S10_למידה_רפואי — מוגן על ידי COLUMN_MAP");
  protection.setWarningOnly(true);

  sheet.getRange(2, 1).activate();

  Logger.log("[COLUMN_MAP] גליון " + SHEET_NAME + " נוצר בהצלחה עם " + totalCols + " עמודות.");
  ui.alert("✅ גליון '" + SHEET_NAME + "' נוצר בהצלחה.\nשורת הכותרות מוגנת מפני שינויים.");
}

// ══════════════════════════════════════════════════════════════════
// פונקציית עזר — הקמת גליון מסנכרן_קבצים
// ══════════════════════════════════════════════════════════════════

function buildDevSyncSheet() {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const existing = ss.getSheetByName("מסנכרן_קבצים");
  if (existing) return;

  const cols      = SHEETS_MAP["מסנכרן_קבצים"];
  const sheet     = ss.insertSheet("מסנכרן_קבצים");
  const totalCols = cols.length;
  const headers   = new Array(totalCols).fill("");
  cols.forEach(function(c) { headers[c.col - 1] = c.name; });

  sheet.getRange(1, 1, 1, totalCols).setValues([headers]).setFontWeight("bold");
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, totalCols);
}

// ══════════════════════════════════════════════════════════════════
// [FIX-3] פונקציות עזר — הגדרה אחת בלבד
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
  if (!SHEETS_MAP[name]) { ui.alert("גליון לא נמצא: " + name); return null; }
  return name;
}

function _colToLetter(num) {
  let letter = "";
  while (num > 0) {
    const mod = (num - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    num    = Math.floor((num - 1) / 26);
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