/**
 * MedicalPilot — S09_ExtractMedical.gs
 * @version 1.5.0 | @updated 14/08/2026 18:05 | @service S09
 * @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S09_ExtractMedical.gs
 * @impacts חילוץ אירועים רפואיים ממסמכים מאומתים לגליונות יעד — מנגנון דואלי (שורה בודדת / אצווה).
 *          תנאי סף: עמודה M = "אומת ידנית" + עמודה L = רפואי + עמודה X לא ריקה.
 *          קריאה: ניהול_מיילים עמודות A,I,J,K,L,M,W,X + גליון S10_למידה_רפואי (few-shot).
 *          כתיבה: ניהול_מיילים עמודות M,S,T + 6 גליונות יעד:
 *          יומן_אירועים_רפואי, תרופות_קבועות, יומן_מצב_רפואי,
 *          בדיקות_דם, בדיקות_גנטיות, הנחיות_רפואיות_ומשימות.
 *          תלויות: GEMINI_API_KEY (gemini-2.0-flash), Drive API, COLUMN_MAP.gs.
 *          מופעל מהתפריט ומאייקון עמודה O בגליון ניהול_מיילים.
 * @changes [v1.5.0] [Task 182] Event_Date/תאריכי-שדות לא עקביים ביומן_אירועים_רפואי
 *          (Gemini מחזיר לפעמים DD.MM.YYYY עם נקודות במקום DD/MM/YYYY עם קו נטוי,
 *          למרות הנחיית הפרומפט — Sheets לא מזהה זאת כתאריך אמיתי). תוקן בשתי
 *          שכבות: (1) הידוק rulesBlock בפרומפט בשני המצבים (general/blood).
 *          (2) פונקציית עזר חדשה _s09_normalizeDate() — רשת ביטחון שממירה
 *          נקודות/מקפים ל-/ בכל 6 נקודות הכתיבה לגליונות (events, medical_status,
 *          blood_tests, genetic_tests, medications×2), גם אם Gemini לא יציית.
 *          [v1.4.0] [Task 180] MAX_TOKENS ב-general call: הגורם האמיתי אינו כמות
 *          רשומות (blood_tests) אלא thinking tokens של gemini-2.5-flash שנצרכים
 *          מתוך maxOutputTokens עוד לפני הפלט. תוקן: thinkingConfig:{budget:0} +
 *          maxOutputTokens 8192→32768. נוסף לוג ייעודי (_s09_lastFailReason) —
 *          כל כשל Gemini מתויג בעמודה S כ-PARSE_<סיבה> (HTTP_xxx/NO_CANDIDATE/
 *          MAX_TOKENS/SAFETY/NO_TEXT_PART/JSON_PARSE/EXCEPTION) במקום PARSE גנרי.
 *          אומת בשטח על 6 שורות רפואיות (6,7,8,11,12,13) — כולן "חולץ לגליונות".
 *          [v1.3.0] [Task 68 — הכנה] _s09_callGemini פוצלה ל-2 קריאות
 *          נפרדות במקום קריאה יחידה: mode="general" (events, medical_
 *          status, medications, genetic_tests, instructions — ביחד,
 *          כמו קודם) + mode="blood" (רק blood_tests, בפרומפט ובסכימה
 *          נפרדים). פותר PARSE/maxOutputTokens במסמכים עתירי-פרמטרים
 *          (פאנל בדיקות דם נרחב, כמו שורה 7 בניהול_מיילים — 40+
 *          פרמטרים גרמו לחריגת 8192 טוקנים בקריאה המשולבת הישנה).
 *          _s09_processRow: כישלון קריאת "blood" בלבד אינו מפיל את
 *          כל השורה — נכתב "חילוץ חלקי — בדיקות דם נכשל" ל-M, קוד
 *          PARSE_PARTIAL ל-S, פירוט ל-T. שאר 5 הקטגוריות נכתבות
 *          לגליונות היעד כרגיל. לא אושש עדיין בהרצה חיה על שורה 7.
 * @changes [v1.2.6] [Task 68 — הכנה] _s09_writeToSheets: שדה מערכת_רפואית
 *                   (Medical_System, יומן_אירועים_רפואי) קיבל ברירת מחדל
 *                   "כללי" כש-Gemini לא מחזיר ערך — קורה במסמכים ללא זיקה
 *                   לאיבר/מערכת ספציפית (למשל אישורי כושר עבודה תעסוקתיים).
 *                   שאר שדות extracted.events כבר קיבלו fallback דומה קודם
 *                   (docData.docDate/docIssuer) — זה השלים את העקביות.
 * @changes [v1.2.4] [Task 79] תיקון _s09_fetchTxtContent — הכשל החזיר שגיאת ACCESS
 *                   גנרית ("שגיאת גישה לקובץ TXT") בלי לרשום fileId/txtUrl/e.message
 *                   בפועל. נבדק חיצונית — הקובץ ב-Drive תקין ונגיש (text/plain,
 *                   2754 בייט) — כלומר זו לא בעיית קובץ אלא תקלה בתוך DriveApp
 *                   בעורך (הרשאה/scope). כעת הלוג ירשום בדיוק את ה-fileId שחולץ,
 *                   ה-txtUrl המקורי, וההודעה המדויקת מ-DriveApp, כדי לאתר את
 *                   השורש האמיתי בריצה הבאה.
 *          [v1.2.3] [Task 79] תיקון באג PARSE — _s09_callGemini היה בולע כל כשל פענוח
 *                   לכדי "Gemini לא החזיר JSON תקין" גנרי, בלי לדעת את הסיבה האמיתית:
 *                   (1) הוספת בדיקת response.getResponseCode() לפני כל ניסיון פענוח —
 *                       שגיאת HTTP (429/503/וכו') לא תיתפס יותר כ-PARSE עיוור.
 *                   (2) הוספת בדיקת candidate.finishReason (SAFETY/MAX_TOKENS) — אם
 *                       Gemini חסם או קטע את התשובה, candidate.content.parts[0] לא
 *                       קיים והפונקציה תקרוס; כעת זה מאותר ונרשם לפני שזה קורה.
 *                   (3) הוספת maxOutputTokens:8192 ל-generationConfig — מניעת קיטוע
 *                       תשובה ארוכה (מסמך עם אירועים רבים) שגרם ל-JSON חצי.
 *                   (4) Fallback לחילוץ תת-מחרוזת JSON (בין '{' ל-'}' האחרון) אם
 *                       JSON.parse הראשי נכשל — מטפל בטקסט עוטף שהמודל הוסיף בכל זאת.
 *                   (5) כל נקודת כשל כותבת ל-Logger את raw/responseCode/candidate
 *                       (עד 1000 תווים) — בעבר ה-catch לא רשם את raw כלל, מה שהפך
 *                       אבחון לבלתי אפשרי. חוזה ההחזרה (null בכשל) לא השתנה — אין
 *                       צורך בשינוי בקוד הקורא (_s09_processRow).
 *          [v1.2.2] [Task 65] תיקון קריטי — בלוק כתיבת "יומן_אירועים_רפואי":
 *                   הוסר sourceUrl מהמערך (לא קיים במפת 7 העמודות) — היה דורס
 *                   את עמודה F (Routing_Category) עם לינק Drive, ודוחף את
 *                   docData.fileId לעמודה H הלא-מוגדרת. כעת 7 ערכים מתואמים
 *                   בדיוק ל-COLUMN_MAP: Event_Date, Event_Type, Medical_System,
 *                   Issuer, Summary, Routing_Category, File_ID.
 *          [v1.2.1] תיקון Task 71 — שינוי S09_STATUS_TRIGGER מ-"אומת ידנית" ל-"מאושר" (13:00)
 *                   והזרקתן לפרומפט Gemini לשיפור חילוץ
 *          [v1.0.0] גרסה ראשונה
 */
// ══════════════════════════════════════════════════════════════════
// קבועים
// ══════════════════════════════════════════════════════════════════

const S09_SOURCE_SHEET    = "ניהול_מיילים";
const S09_LEARNING_SHEET  = "S10_למידה_רפואי";
const S09_CATEGORIES      = ["רפואי", "מסמך רפואי"];
const S09_STATUS_TRIGGER = "מאושר";
const S09_GEMINI_MODEL    = "gemini-2.5-flash";
const S09_MAX_EXAMPLES    = 5;
let _s09_lastFailReason = ""; // [v1.4.0 — Task 180] קוד סיבת כשל אחרון מ-_s09_callGemini, ללוג ייעודי

const S09_TARGET_SHEETS  = {
  events:       "יומן_אירועים_רפואי",
  medications:  "תרופות_קבועות",
  medStatus:    "יומן_מצב_רפואי",
  bloodTests:   "בדיקות_דם",
  geneticTests: "בדיקות_גנטיות",
  instructions: "הנחיות_רפואיות_ומשימות"
};

// ══════════════════════════════════════════════════════════════════
// נקודת כניסה — מנגנון דואלי
// ══════════════════════════════════════════════════════════════════

function runS09() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(S09_SOURCE_SHEET);

  if (!sheet) {
    SpreadsheetApp.getUi().alert("❌ גליון '" + S09_SOURCE_SHEET + "' לא נמצא.");
    return;
  }

  const activeRow = sheet.getActiveCell().getRow();

  if (activeRow >= 2) {
    _s09_processSingleRow(ss, sheet, activeRow);
  } else {
    _s09_processBatch(ss, sheet);
  }
}

// ══════════════════════════════════════════════════════════════════
// עיבוד שורה אחת
// ══════════════════════════════════════════════════════════════════

function _s09_processSingleRow(ss, sheet, row) {
  const check = _s09_checkRow(sheet, row);
  if (!check.valid) {
    SpreadsheetApp.getUi().alert("⚠️ שורה " + row + " לא עומדת בתנאים:\n" + check.reason);
    return;
  }
  const result = _s09_processRow(ss, sheet, row);
  SpreadsheetApp.getUi().alert(result.msg);
}

// ══════════════════════════════════════════════════════════════════
// עיבוד אצווה
// ══════════════════════════════════════════════════════════════════

function _s09_processBatch(ss, sheet) {
  const lastRow = sheet.getLastRow();
  let processed = 0;
  let skipped   = 0;
  let errors    = 0;

  for (let row = 2; row <= lastRow; row++) {
    const check = _s09_checkRow(sheet, row);
    if (!check.valid) { skipped++; continue; }

    const result = _s09_processRow(ss, sheet, row);
    if (result.success) processed++;
    else errors++;

    Utilities.sleep(1500);
  }

  SpreadsheetApp.getUi().alert(
    "✅ S09 הסתיים\n" +
    "עובדו: " + processed + "\n" +
    "דולגו: " + skipped   + "\n" +
    "שגיאות: " + errors
  );
}

// ══════════════════════════════════════════════════════════════════
// בדיקת תנאי סף לשורה
// ══════════════════════════════════════════════════════════════════

function _s09_checkRow(sheet, row) {
  const status   = (sheet.getRange(row, 13).getValue() || "").toString().trim();
  const category = (sheet.getRange(row, 12).getValue() || "").toString().trim();
  const txtUrl   = (sheet.getRange(row, 24).getValue() || "").toString().trim();

  if (status !== S09_STATUS_TRIGGER)
    return { valid: false, reason: "עמודה M אינה '" + S09_STATUS_TRIGGER + "' (ערך: " + status + ")" };
  if (!S09_CATEGORIES.includes(category))
    return { valid: false, reason: "עמודה L אינה רפואי (ערך: " + category + ")" };
  if (!txtUrl)
    return { valid: false, reason: "עמודה X (TXT_URL) ריקה — יש להריץ S06 תחילה" };

  return { valid: true };
}

// ══════════════════════════════════════════════════════════════════
// עיבוד שורה בודדת — הזרימה המרכזית
// ══════════════════════════════════════════════════════════════════

function _s09_processRow(ss, sheet, row) {
  try {
    const docData = {
      fileId:    (sheet.getRange(row, 1).getValue()  || "").toString().trim(),
      docTitle:  (sheet.getRange(row, 9).getValue()  || "").toString().trim(),
      docIssuer: (sheet.getRange(row, 10).getValue() || "").toString().trim(),
      docDate:   (sheet.getRange(row, 11).getValue() || "").toString().trim(),
      sourceUrl: (sheet.getRange(row, 23).getValue() || "").toString().trim(),
      txtUrl:    (sheet.getRange(row, 24).getValue() || "").toString().trim()
    };

    const txtContent = _s09_fetchTxtContent(docData.txtUrl);
    if (!txtContent) {
      _s09_writeError(sheet, row, "ACCESS", "לא ניתן לקרוא קובץ TXT — בדוק הרשאות Drive");
      return { success: false, msg: "❌ שגיאת גישה לקובץ TXT" };
    }

    // [v1.1.0] שליפת דוגמאות למידה מ-S10
    const fewShotExamples = _s09_fetchFewShotExamples(ss);

  const generalResult = _s09_callGemini(txtContent, docData, fewShotExamples, "general");
    if (!generalResult) {
      const failReason = _s09_lastFailReason || "UNKNOWN"; // [v1.4.0 — Task 180]
      _s09_writeError(sheet, row, "PARSE_" + failReason,
        "Gemini לא החזיר JSON תקין (קריאה כללית) — סיבה: " + failReason);
      return { success: false, msg: "❌ שגיאת עיבוד Gemini (" + failReason + ")" };
    }

    const bloodResult = _s09_callGemini(txtContent, docData, fewShotExamples, "blood");
    const bloodFailed = !bloodResult;
    const bloodFailReason = bloodFailed ? (_s09_lastFailReason || "UNKNOWN") : ""; // [v1.4.0 — Task 180]
    const extracted = Object.assign({}, generalResult, {
      blood_tests: bloodFailed ? [] : (bloodResult.blood_tests || [])
    });
    if (bloodFailed) {
      Logger.log("[S09] שורה " + row + " — קריאת בדיקות דם נכשלה (" + bloodFailReason + "), ממשיך עם שאר הקטגוריות");
    }
    const sheetsWritten = _s09_writeToSheets(ss, extracted, docData);

    let statusText = sheetsWritten.length === 1
      ? "חולץ ל" + sheetsWritten[0]
      : "חולץ לגליונות";

    if (bloodFailed) statusText = "חילוץ חלקי — בדיקות דם נכשל";

    sheet.getRange(row, 13).setValue(statusText);
    sheet.getRange(row, 19).setValue(bloodFailed ? "PARSE_PARTIAL" : "");
    sheet.getRange(row, 20).setValue(bloodFailed ? "קריאה כללית הצליחה, קריאת בדיקות הדם נכשלה (" + bloodFailReason + ") — נדרש אימות ידני ב-S10" : "");
    Logger.log("[S09] שורה " + row + " → " + statusText +
      (fewShotExamples.length > 0 ? " | דוגמאות: " + fewShotExamples.length : " | ללא דוגמאות"));

    return { success: true, msg: "✅ שורה " + row + " — " + statusText };

  } catch (e) {
    _s09_writeError(sheet, row, "UNKNOWN", e.message);
    Logger.log("[S09] שגיאה שורה " + row + ": " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// [v1.1.0] שליפת דוגמאות Few-Shot מגליון S10_למידה_רפואי
// ══════════════════════════════════════════════════════════════════

function _s09_fetchFewShotExamples(ss) {
  try {
    const learnSheet = ss.getSheetByName(S09_LEARNING_SHEET);
    if (!learnSheet) {
      Logger.log("[S09] גליון למידה לא נמצא — ממשיך ללא דוגמאות");
      return [];
    }

    const lastRow = learnSheet.getLastRow();
    if (lastRow < 2) {
      Logger.log("[S09] גליון למידה ריק — ממשיך ללא דוגמאות");
      return [];
    }

    // שליפת עד S09_MAX_EXAMPLES שורות אחרונות
    const startRow  = Math.max(2, lastRow - S09_MAX_EXAMPLES + 1);
    const numRows   = lastRow - startRow + 1;
    const data      = learnSheet.getRange(startRow, 1, numRows, 7).getValues();

    const examples = [];

    data.forEach(function(row) {
      const fileId       = (row[0] || "").toString().trim();
      const splitIndex   = (row[1] || "").toString().trim();
      const targetSheet  = (row[2] || "").toString().trim();
      const jsonRaw      = (row[3] || "").toString().trim();
      const complexity   = (row[4] || "").toString().trim();
      const correction   = (row[5] || "").toString().trim();

      if (!jsonRaw || !targetSheet) return;

      try {
        const parsed = JSON.parse(jsonRaw);
        examples.push({
          targetSheet: targetSheet,
          splitIndex:  splitIndex,
          complexity:  complexity,
          correction:  correction,
          data:        parsed
        });
      } catch (e) {
        Logger.log("[S09] לא ניתן לפרסר JSON בדוגמת למידה — fileId: " + fileId);
      }
    });

    Logger.log("[S09] נטענו " + examples.length + " דוגמאות למידה מ-" + S09_LEARNING_SHEET);
    return examples;

  } catch (e) {
    Logger.log("[S09] שגיאה בשליפת דוגמאות: " + e.message);
    return [];
  }
}

// ══════════════════════════════════════════════════════════════════
// בניית בלוק Few-Shot לפרומפט
// ══════════════════════════════════════════════════════════════════

function _s09_buildFewShotBlock(examples) {
  if (!examples || examples.length === 0) return "";

  let block = "\n--- דוגמאות מאומתות מהעבר (למד מהן) ---\n";

  examples.forEach(function(ex, i) {
    block += "\nדוגמה " + (i + 1) + " | גליון: " + ex.targetSheet;
    if (ex.complexity) block += " | מורכבות: " + ex.complexity;
    block += "\n";
    block += JSON.stringify(ex.data, null, 2) + "\n";
    if (ex.correction) block += "הערת מאמת: " + ex.correction + "\n";
  });

  block += "--- סוף דוגמאות ---\n";
  return block;
}

// ══════════════════════════════════════════════════════════════════
// קריאת קובץ TXT מ-Drive
// ══════════════════════════════════════════════════════════════════

function _s09_fetchTxtContent(txtUrl) {
  let fileId = null;
  try {
    if (txtUrl.includes("/d/"))  fileId = txtUrl.split("/d/")[1].split("/")[0];
    if (txtUrl.includes("id=")) fileId = txtUrl.split("id=")[1].split("&")[0];
    if (!fileId) {
      Logger.log("[S09] לא ניתן לחלץ fileId מ-txtUrl: " + txtUrl);
      return null;
    }
    const file = DriveApp.getFileById(fileId);
    return file.getBlob().getDataAsString("UTF-8");
  } catch (e) {
    // [v1.2.4 — Task 79] רישום מפורט: fileId + txtUrl + הודעת השגיאה המדויקת,
    // כדי לדעת אם זו שגיאת הרשאה, קובץ לא נמצא, או משהו אחר
    Logger.log("[S09] שגיאת קריאת TXT — fileId: " + fileId + " | txtUrl: " + txtUrl +
      " | שגיאה: " + e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// קריאת Gemini — חילוץ מובנה + Few-Shot
// ══════════════════════════════════════════════════════════════════

function _s09_callGemini(txtContent, docData, fewShotExamples, mode) {
  let raw = null;
  _s09_lastFailReason = ""; // [v1.4.0 — Task 180]
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    const url    = "https://generativelanguage.googleapis.com/v1beta/models/" +
                   S09_GEMINI_MODEL + ":generateContent?key=" + apiKey;

   // [v1.1.0] בניית בלוק הדוגמאות
    const fewShotBlock = _s09_buildFewShotBlock(fewShotExamples);

    // [Task 68/S09-split] מצב "blood" — סכימה ממוקדת בדיקות דם בלבד,
    // מונע חריגת maxOutputTokens במסמכים עם פאנל מעבדה נרחב (עשרות
    // פרמטרים). מצב "general" (ברירת מחדל) — 5 הקטגוריות האחרות.
    const schemaBlock = (mode === "blood")
      ? `{
  "blood_tests": [
    {
      "תאריך_בדיקה": "",
      "שם_בדיקה": "",
      "קטגוריה": "",
      "ערך": "",
      "טווח_נורמה": "",
      "סטטוס": "",
      "הערת_רופא": ""
    }
  ]
}`
      : `{
  "events": [
    {
      "תאריך_אירוע": "",
      "סוג_אירוע": "",
      "מערכת_רפואית": "",
      "מוסד_רופא": "",
      "סיכום_ממצא": "",
      "קטגוריית_ניתוב": ""
    }
  ],
  "medical_status": [
    {
      "תאריך_אירוע": "",
      "סוג_אירוע": "",
      "מערכת_איבר": "",
      "מוסד_רופא": "",
      "אבחנה_עיקרית": "",
      "חומרה_מצב": "",
      "המלצות_קצרות": "",
      "סטטוס_רשומה": "חדש"
    }
  ],
  "medications": [
    {
      "שם_תרופה": "",
      "חומר_פעיל": "",
      "מינון": "",
      "תדירות": "",
      "סיבת_טיפול": "",
      "תאריך_התחלה": "",
      "תאריך_סיום": "",
      "סטטוס": "פעיל"
    }
  ],
  "genetic_tests": [
    {
      "תאריך_בדיקה": "",
      "שם_פאנל": "",
      "גן_וריאנט": "",
      "ממצא": "",
      "משמעות_קלינית": "",
      "המלצה": ""
    }
  ],
  "instructions": [
    {
      "תאריך_הנחיה": "",
      "מקור": "",
      "תיאור_משימה": "",
      "סוג_משימה": "",
      "תאריך_יעד": "",
      "סטטוס": "פתוח"
    }
  ]
}`;

    const rulesBlock = (mode === "blood")
      ? `כללים:
- אם אין בדיקות דם במסמך — החזר מערך ריק []
- תאריכים חובה בפורמט DD/MM/YYYY עם קו נטוי (/) בלבד — לעולם לא עם נקודות (.) או מקפים (-)
- אל תמציא מידע שאינו במסמך
- חלץ כל פרמטר בדיקה כרשומה נפרדת, גם אם יש עשרות פרמטרים`
      : `כללים:
- אם אין נתונים לקטגוריה מסוימת — החזר מערך ריק []
- events תמיד יכיל לפחות רשומה אחת
- תאריכים חובה בפורמט DD/MM/YYYY עם קו נטוי (/) בלבד — לעולם לא עם נקודות (.) או מקפים (-)
- אל תמציא מידע שאינו במסמך`;

    const prompt = `אתה מומחה לניתוח מסמכים רפואיים בעברית.
קרא את המסמך הבא וחלץ ממנו מידע רפואי מובנה.
${fewShotBlock}
פרטי המסמך:
- כותרת: ${docData.docTitle}
- מנפיק: ${docData.docIssuer}
- תאריך: ${docData.docDate}

תוכן המסמך:
${txtContent}

החזר JSON בלבד (ללא טקסט נוסף) במבנה הבא:
${schemaBlock}

${rulesBlock}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      // [v1.2.3 — Task 79] maxOutputTokens — מניעת קיטוע תשובה ארוכה (JSON חצי)
      // [v1.4.0 — Task 180] thinkingConfig:0 מבטל "חשיבה" פנימית שצורכת טוקנים
      // מהתקציב עוד לפני כתיבת הפלט בפועל (התנהגות ברירת מחדל ב-gemini-2.5-flash);
      // maxOutputTokens הוגדל כרשת ביטחון נוספת למסמכים ארוכים באמת
      generationConfig: { temperature: 0.1, maxOutputTokens: 32768, thinkingConfig: { thinkingBudget: 0 } }
    };

    const response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();
    const bodyText      = response.getContentText();

    // [v1.2.3 — Task 79] BUG-A: בדיקת קוד HTTP לפני כל ניסיון פענוח
    if (responseCode !== 200) {
      _s09_lastFailReason = "HTTP_" + responseCode; // [v1.4.0 — Task 180]
      Logger.log("[S09] שגיאת HTTP מ-Gemini — קוד: " + responseCode +
        " | גוף תשובה (1000 תווים ראשונים): " + bodyText.substring(0, 1000));
      return null;
    }

    const json      = JSON.parse(bodyText);
    const candidate = json.candidates && json.candidates[0];

    if (!candidate) {
      _s09_lastFailReason = "NO_CANDIDATE"; // [v1.4.0 — Task 180]
      Logger.log("[S09] Gemini לא החזיר candidates — promptFeedback: " +
        JSON.stringify(json.promptFeedback || {}));
      return null;
    }

    // [v1.2.3 — Task 79] BUG-B: בדיקת finishReason — SAFETY/MAX_TOKENS גורמים
    // ל-content.parts חסר, וקודם לכן זה היה קורס בלי הסבר
    if (candidate.finishReason && candidate.finishReason !== "STOP") {
      _s09_lastFailReason = candidate.finishReason; // [v1.4.0 — Task 180] למשל MAX_TOKENS/SAFETY
      Logger.log("[S09] Gemini הסתיים עם finishReason לא תקין: " + candidate.finishReason +
        " | candidate (1000 תווים ראשונים): " + JSON.stringify(candidate).substring(0, 1000));
      return null;
    }

    const textPart = candidate.content && candidate.content.parts &&
                     candidate.content.parts[0] && candidate.content.parts[0].text;

    if (!textPart) {
      _s09_lastFailReason = "NO_TEXT_PART"; // [v1.4.0 — Task 180]
      Logger.log("[S09] Gemini החזיר candidate בלי content.parts[0].text — candidate " +
        "(1000 תווים ראשונים): " + JSON.stringify(candidate).substring(0, 1000));
      return null;
    }

    raw = textPart.trim();
    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      return JSON.parse(raw);
    } catch (parseErr) {
      // [v1.2.3 — Task 79] BUG-D fallback: חילוץ תת-מחרוזת JSON אם המודל הוסיף
      // טקסט עוטף לפני/אחרי ה-JSON בניגוד להוראה "החזר JSON בלבד"
      const firstBrace = raw.indexOf("{");
      const lastBrace   = raw.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          return JSON.parse(raw.substring(firstBrace, lastBrace + 1));
        } catch (innerErr) {
          _s09_lastFailReason = "JSON_PARSE"; // [v1.4.0 — Task 180]
          Logger.log("[S09] חילוץ תת-מחרוזת JSON נכשל גם הוא — raw (1000 תווים ראשונים): " +
            raw.substring(0, 1000));
          return null;
        }
      }
      _s09_lastFailReason = "JSON_PARSE"; // [v1.4.0 — Task 180]
      Logger.log("[S09] JSON.parse נכשל ולא נמצאו סוגריים מסולסלים תואמים — raw " +
        "(1000 תווים ראשונים): " + raw.substring(0, 1000));
      return null;
    }

  } catch (e) {
    _s09_lastFailReason = "EXCEPTION"; // [v1.4.0 — Task 180]
    // [v1.2.3 — Task 79] BUG-D: כעת רושם גם את raw (אם הגענו אליו) — בעבר נרשמה
    // רק e.message בלי שום הקשר לתוכן שגרם לכשל
    Logger.log("[S09] שגיאת Gemini: " + e.message +
      (raw ? " | raw (1000 תווים ראשונים): " + raw.substring(0, 1000) : ""));
    return null;
  }
}
// ══════════════════════════════════════════════════════════════════
// נורמליזציית תאריכים — [v1.5.0 — Task 182]
// ══════════════════════════════════════════════════════════════════

function _s09_normalizeDate(dateStr) {
  // ממיר DD.MM.YYYY או DD-MM-YYYY ל-DD/MM/YYYY (רשת ביטחון אם Gemini
  // לא ציית להנחיית הפרומפט). אם הפורמט כבר תקין או ריק — מוחזר כמו שהוא.
  if (!dateStr) return dateStr;
  const m = String(dateStr).trim().match(/^(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})$/);
  if (!m) return dateStr;
  return m[1].padStart(2, "0") + "/" + m[2].padStart(2, "0") + "/" + m[3];
}

// ══════════════════════════════════════════════════════════════════
// כתיבה לגליונות היעד
// ══════════════════════════════════════════════════════════════════

function _s09_writeToSheets(ss, extracted, docData) {
  const sheetsWritten = [];
  const sourceUrl     = docData.sourceUrl ||
                        "https://drive.google.com/file/d/" + docData.fileId + "/view";

  // [Task 65 — v1.2.2] תוקן: 7 ערכים מדויקים לפי COLUMN_MAP של "יומן_אירועים_רפואי"
  // Event_Date | Event_Type | Medical_System | Issuer | Summary | Routing_Category | File_ID
  if (extracted.events && extracted.events.length > 0) {
    const sheet = ss.getSheetByName(S09_TARGET_SHEETS.events);
    extracted.events.forEach(e => {
      sheet.appendRow([
        _s09_normalizeDate(e["תאריך_אירוע"]) || docData.docDate,
        e["סוג_אירוע"]      || "",
        e["מערכת_רפואית"]   || "כללי",
        e["מוסד_רופא"]      || docData.docIssuer,
        e["סיכום_ממצא"]     || "",
        e["קטגוריית_ניתוב"] || "",
        docData.fileId
      ]);
    });
    sheetsWritten.push("יומן אירועים");
  }

  if (extracted.medications && extracted.medications.length > 0) {
    const sheet = ss.getSheetByName(S09_TARGET_SHEETS.medications);
    extracted.medications.forEach(m => {
      sheet.appendRow([
        m["שם_תרופה"]       || "",
        m["חומר_פעיל"]      || "",
        m["מינון"]           || "",
        m["תדירות"]          || "",
        m["סיבת_טיפול"]     || "",
        _s09_normalizeDate(m["תאריך_התחלה"]) || "",
        _s09_normalizeDate(m["תאריך_סיום"]) || "",
        m["סטטוס"]           || "פעיל",
        docData.docIssuer,
        sourceUrl,
        docData.fileId
      ]);
    });
    sheetsWritten.push("תרופות");
  }

  if (extracted.medical_status && extracted.medical_status.length > 0) {
    const sheet = ss.getSheetByName(S09_TARGET_SHEETS.medStatus);
    extracted.medical_status.forEach(s => {
      sheet.appendRow([
        _s09_normalizeDate(s["תאריך_אירוע"]) || docData.docDate,
        s["סוג_אירוע"]       || "",
        s["מערכת_איבר"]      || "",
        s["מוסד_רופא"]       || docData.docIssuer,
        s["אבחנה_עיקרית"]    || "",
        s["חומרה_מצב"]       || "",
        s["המלצות_קצרות"]    || "",
        sourceUrl,
        docData.fileId,
        docData.docIssuer,
        s["סטטוס_רשומה"]     || "חדש"
      ]);
    });
    sheetsWritten.push("מצב רפואי");
  }

  if (extracted.blood_tests && extracted.blood_tests.length > 0) {
    const sheet = ss.getSheetByName(S09_TARGET_SHEETS.bloodTests);
    extracted.blood_tests.forEach(b => {
      sheet.appendRow([
        _s09_normalizeDate(b["תאריך_בדיקה"]) || docData.docDate,
        b["שם_בדיקה"]     || "",
        b["קטגוריה"]       || "",
        b["ערך"]           || "",
        b["טווח_נורמה"]   || "",
        b["סטטוס"]         || "",
        b["הערת_רופא"]    || "",
        sourceUrl,
        docData.fileId,
        docData.docIssuer
      ]);
    });
    sheetsWritten.push("בדיקות דם");
  }

  if (extracted.genetic_tests && extracted.genetic_tests.length > 0) {
    const sheet = ss.getSheetByName(S09_TARGET_SHEETS.geneticTests);
    extracted.genetic_tests.forEach(g => {
      sheet.appendRow([
        _s09_normalizeDate(g["תאריך_בדיקה"]) || docData.docDate,
        g["שם_פאנל"]          || "",
        g["גן_וריאנט"]        || "",
        g["ממצא"]              || "",
        g["משמעות_קלינית"]    || "",
        g["המלצה"]             || "",
        sourceUrl,
        docData.fileId
      ]);
    });
    sheetsWritten.push("בדיקות גנטיות");
  }

  if (extracted.instructions && extracted.instructions.length > 0) {
    const sheet = ss.getSheetByName(S09_TARGET_SHEETS.instructions);
    extracted.instructions.forEach(i => {
      sheet.appendRow([
        i["תאריך_הנחיה"]  || docData.docDate,
        i["מקור"]          || docData.docIssuer,
        i["תיאור_משימה"]  || "",
        i["סוג_משימה"]    || "",
        i["תאריך_יעד"]    || "",
        i["סטטוס"]         || "פתוח",
        sourceUrl,
        docData.fileId
      ]);
    });
    sheetsWritten.push("הנחיות");
  }

  return sheetsWritten;
}

// ══════════════════════════════════════════════════════════════════
// כתיבת שגיאה לעמודות S ו-T
// ══════════════════════════════════════════════════════════════════

function _s09_writeError(sheet, row, code, detail) {
  sheet.getRange(row, 19).setValue(code);
  sheet.getRange(row, 20).setValue(detail);
}
