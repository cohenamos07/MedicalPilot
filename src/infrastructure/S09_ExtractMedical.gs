/**
 * MedicalPilot — S09_ExtractMedical.gs
 * @version 2.0.2 | @updated 28/08/2026 18:12 | @service S09
 * @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S09_ExtractMedical.gs
 * @impacts חילוץ אירועים רפואיים ממסמכים מאומתים — קריאה יחידה לכל מסמך,
 *          כותב אך ורק ליומן_אירועים_רפואי (שורת אירוע גנרית לכל נושא/ממצא
 *          נבדל, כולל קטגוריית_ניתוב מתוך Enum סגור של 7 ערכים). פענוח מפורט
 *          לגליונות היעד (תרופות_קבועות/יומן_מצב_רפואי/בדיקות_דם/
 *          בדיקות_גנטיות/הנחיות_רפואיות_ומשימות) עבר ל-S13 — לאחר אימות
 *          S10/S12, לא כאן.
 *          תנאי סף: עמודה M = "אושר ידנית" + עמודה L = רפואי + עמודה X לא ריקה.
 *          קריאה: ניהול_מיילים עמודות A,I,J,K,L,M,W,X + גליון דוגמאות_למידה_S10
 *          (few-shot, סכימה שטוחה — מקובצת לפי Source_File_ID למסמכים שלמים).
 *          כתיבה: ניהול_מיילים עמודות M,S,T + יומן_אירועים_רפואי בלבד.
 *          תלויות: GEMINI_API_KEY (gemini-2.5-flash), Drive API, COLUMN_MAP.gs.
 *          מופעל מהתפריט ומאייקון עמודה O בגליון ניהול_מיילים.
 * @changes [v2.0.2] Task #207 — שורה 247 (_s09_processRow): statusText שונה
 *          מ-"חולץ ליומן אירועים" ל-"חולץ ליומן אירועים רפואי" — הכנה
 *          לריבוי יומנים עתידי (ביטוחי/חשבונאי וכו', כל אחד יקבל ערך משלו
 *          כשייבנה שירות מקביל). אין שינוי בלוגיקה מעבר לכך — שינוי מחרוזת
 *          יחיד. אומת מול הקוד החי (diff מדויק).
 * @changes [v2.0.1] Task #205 — בלוק כתיבת יומן_אירועים_רפואי (בתוך
 *                   _s09_writeToSheets): appendRow הורחב מ-7 ל-12 ערכים,
 *                   בעקבות הוספת עמודת S_Row (7) ל-COLUMN_MAP.gs (v2.10.0)
 *                   והזזת File_ID לעמודה 12. הוספו 5 ערכים ריקים (""):
 *                   G=S_Row (מחושב בהמשך ע"י refreshMedicalEventsRows,
 *                   ViewEngine.gs), H=Validation_Status, I=Extraction_Status,
 *                   J=Duplicate_Flag, K=Duplicate_Target_Ref (מתמלאות ע"י
 *                   S10/S13/S14 בהמשך הזרימה). קוד הפענוח עצמו
 *                   (_s09_processRow/_s09_callGemini) לא השתנה — שינוי
 *                   נקודתי בבלוק הכתיבה בלבד.
 * @changes [v2.0.0] Task 185 (בקשת עמוס) — שכתוב ארכיטקטוני: S09 כותב כעת
 *                   אך ורק ליומן_אירועים_רפואי (S09_TARGET_SHEETS צומצם
 *                   ליעד יחיד; _s09_writeToSheets — 5 בלוקים הוסרו). קריאת
 *                   Gemini יחידה במקום פיצול general/blood (_s09_processRow,
 *                   _s09_callGemini — פרמטר mode הוסר). סכימה יחידה בפרומפט
 *                   עם Enum סגור לקטגוריית_ניתוב (7 ערכים: בדיקת דם/בדיקה
 *                   גנטית/מרשם תרופה/מצב רפואי/ניתוח-פעולה רפואית/הנחיה/
 *                   כללי). כלל פיצול-שורות עודכן פעמיים בהתבסס על בדיקה
 *                   בפועל: קיבוץ פרטים לפי קטגוריית_ניתוב (לא לפי "החלטה
 *                   קלינית" גורפת) + דוגמה מוטמעת בפרומפט למקרה הבעייתי
 *                   שאותר (קביעת כושר עבודה + הגבלה + תוקף → 3 שורות: מצב
 *                   רפואי, הנחיה, הנחיה — לא שורה אחת ולא 5). S09_LEARNING_SHEET
 *                   → דוגמאות_למידה_S10 (גליון חדש, שטוח); _s09_fetchFewShotExamples
 *                   נכתבה מחדש — קוראת buffer של שורות אחרונות, מקבצת לפי
 *                   Source_File_ID לפירוק-מסמך-שלם (לא שורה בודדת), מציגה
 *                   ל-Gemini S09_MAX_EXAMPLES מסמכים מלאים כדוגמה. תיקון
 *                   סטטוס: "חולץ ליומן אירועים" תמיד (ענף "חולץ לגליונות"
 *                   הוסר — כבר לא רלוונטי עם יעד יחיד).
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
const S09_LEARNING_SHEET  = "דוגמאות_למידה_S10"; // [v2.0.0 — Task 185] גליון חדש, סכימה שטוחה
const S09_CATEGORIES      = ["רפואי", "מסמך רפואי"];
const S09_STATUS_TRIGGER = "מאושר";
const S09_GEMINI_MODEL    = "gemini-2.5-flash";
const S09_MAX_EXAMPLES    = 5;
let _s09_lastFailReason = ""; // [v1.4.0 — Task 180] קוד סיבת כשל אחרון מ-_s09_callGemini, ללוג ייעודי

// [v2.0.0 — Task 185] S09 כותב כעת רק ליומן_אירועים_רפואי — 5 היעדים
// האחרים (תרופות_קבועות/יומן_מצב_רפואי/בדיקות_דם/בדיקות_גנטיות/
// הנחיות_רפואיות_ומשימות) עוברים ל-S13 (חילוץ עמוק, אחרי אימות S10/S12).
const S09_TARGET_SHEETS  = {
  events: "יומן_אירועים_רפואי"
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

    // [v2.0.0 — Task 185] קריאה יחידה בלבד — אין יותר קריאת "blood" נפרדת
    const result = _s09_callGemini(txtContent, docData, fewShotExamples);
    if (!result) {
      const failReason = _s09_lastFailReason || "UNKNOWN"; // [v1.4.0 — Task 180]
      _s09_writeError(sheet, row, "PARSE_" + failReason,
        "Gemini לא החזיר JSON תקין — סיבה: " + failReason);
      return { success: false, msg: "❌ שגיאת עיבוד Gemini (" + failReason + ")" };
    }

    // [v2.0.0 — Task 185] כתיבה תמיד ליומן_אירועים_רפואי בלבד — סטטוס קבוע,
    // אין יותר ענף "חולץ לגליונות" (שהיה רלוונטי כשהיו עד 6 יעדים אפשריים)
    _s09_writeToSheets(ss, result, docData);
    const statusText = "חולץ ליומן אירועים רפואי";

    sheet.getRange(row, 13).setValue(statusText);
    sheet.getRange(row, 19).setValue("");
    sheet.getRange(row, 20).setValue("");
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

    // [v2.0.0 — Task 185] FIRST_DATA_ROW נקרא מ-SHEET_CONFIG (COLUMN_MAP.gs) —
    // הגליון עם 4 שורות מוגנות, לא 1 כמו בגרסה הישנה
    const firstData = (SHEET_CONFIG[S09_LEARNING_SHEET] && SHEET_CONFIG[S09_LEARNING_SHEET].FIRST_DATA_ROW) || 2;
    const lastRow   = learnSheet.getLastRow();
    if (lastRow < firstData) {
      Logger.log("[S09] גליון למידה ריק — ממשיך ללא דוגמאות");
      return [];
    }

    // [v2.0.0 — Task 185] סכימה שטוחה — שורה לכל אירוע, לא לכל מסמך.
    // קוראים buffer גדול מהשורות האחרונות ומקבצים לפי Source_File_ID,
    // כדי לא לחתוך פירוק של מסמך באמצע (מסמך אחד = עד כמה שורות אירוע).
    const bufferRows = Math.min(lastRow - firstData + 1, S09_MAX_EXAMPLES * 6);
    const startRow   = lastRow - bufferRows + 1;
    const data       = learnSheet.getRange(startRow, 1, bufferRows, 11).getValues();

    const grouped = {}; // Source_File_ID -> { complexity, events: [...] }
    const order   = [];  // סדר הופעה — לשמירת "המסמכים האחרונים" בסוף

    data.forEach(function(row) {
      const fileId          = (row[0] || "").toString().trim();
      const eventDate        = (row[2] || "").toString().trim();
      const eventType         = (row[3] || "").toString().trim();
      const medicalSystem      = (row[4] || "").toString().trim();
      const issuer               = (row[5] || "").toString().trim();
      const summary               = (row[6] || "").toString().trim();
      const routingCategory        = (row[7] || "").toString().trim();
      const complexity               = (row[8] || "").toString().trim();

      if (!fileId || !eventDate) return;

      if (!grouped[fileId]) {
        grouped[fileId] = { complexity: complexity, events: [] };
        order.push(fileId);
      }
      grouped[fileId].events.push({
        "תאריך_אירוע":     eventDate,
        "סוג_אירוע":       eventType,
        "מערכת_רפואית":    medicalSystem,
        "מוסד_רופא":       issuer,
        "סיכום_ממצא":      summary,
        "קטגוריית_ניתוב":  routingCategory
      });
    });

    // לוקחים את S09_MAX_EXAMPLES המסמכים (לא שורות) האחרונים
    const fileIds  = order.slice(-S09_MAX_EXAMPLES);
    const examples = fileIds.map(function(fid) {
      return { complexity: grouped[fid].complexity, events: grouped[fid].events };
    });

    Logger.log("[S09] נטענו " + examples.length + " דוגמאות למידה (מסמכים שלמים) מ-" + S09_LEARNING_SHEET);
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

  // [v2.0.0 — Task 185] כל דוגמה = פירוק שלם ומאומת של מסמך אחד למספר
  // שורות אירוע (בדיוק התבנית שה-Enum/כלל הקיבוץ בפרומפט אמור לשכפל)
  let block = "\n--- דוגמאות מאומתות מהעבר (למד מהן איך לפרק ולתייג נכון) ---\n";

  examples.forEach(function(ex, i) {
    block += "\nדוגמה " + (i + 1);
    if (ex.complexity) block += " | מורכבות: " + ex.complexity;
    block += "\n" + JSON.stringify({ events: ex.events }, null, 2) + "\n";
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

function _s09_callGemini(txtContent, docData, fewShotExamples) {
  let raw = null;
  _s09_lastFailReason = ""; // [v1.4.0 — Task 180]
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    const url    = "https://generativelanguage.googleapis.com/v1beta/models/" +
                   S09_GEMINI_MODEL + ":generateContent?key=" + apiKey;

   // [v1.1.0] בניית בלוק הדוגמאות
    const fewShotBlock = _s09_buildFewShotBlock(fewShotExamples);

    // [v2.0.0 — Task 185] קריאה יחידה, סכימה יחידה — S09 כותב רק אירועים
    // גנריים ליומן_אירועים_רפואי. פענוח מפורט (תרופות/בדיקות/הנחיות)
    // עובר ל-S13, אחרי אימות S10/S12. אין יותר פיצול mode="general"/"blood".
    const schemaBlock = `{
  "events": [
    {
      "תאריך_אירוע": "",
      "סוג_אירוע": "",
      "מערכת_רפואית": "",
      "מוסד_רופא": "",
      "סיכום_ממצא": "",
      "קטגוריית_ניתוב": ""
    }
  ]
}`;

    // [v2.0.0 — Task 185] קטגוריית_ניתוב מוגבלת לרשימה סגורה (Enum) —
    // זהו ה"רמז" היחיד ש-S13 יקבל כדי לדעת לאן לנתב את החילוץ העמוק בעתיד.
  const rulesBlock = `כללים:
- events תמיד יכיל לפחות רשומה אחת
- קבץ פרטים לפי קטגוריית_ניתוב: פרטים ששייכים לאותה קטגוריה מתאחדים לשורה אחת
- הבחנה חשובה בתוך "מצב רפואי" מול "הנחיה": פרמטרים כמותיים ישירים של
  הממצא/הקביעה עצמה (כמו אחוז משרה בקביעת כושר עבודה, דרגת חומרה) שייכים
  ל"מצב רפואי" — לעומת הוראות התנהגות/הגבלה (כמו הימנעות ממגע, איסור נהיגה)
  ותנאי מעקב/מנהלה (תוקף, מועד ביקורת הבא) ששייכים ל"הנחיה"
- אם יש כמה תת-נושאים שונים בתוך ה"הנחיות" עצמן (למשל גם הגבלה התנהגותית
  וגם תוקף/מעקב) — פצל לשורת "הנחיה" נפרדת לכל תת-נושא, אל תאחד את כולם יחד

דוגמה ממחישה:
מסמך שמכיל: "כשיר לעבודה ב-80% משרה (4 ימים בשבוע). להימנע מחשיפה לקהל.
תוקף הקביעה 6 חודשים, לחזור לביקורת לפי הצורך" → 3 שורות אירוע:
1. קטגוריית_ניתוב="מצב רפואי", סיכום_ממצא="כשיר לעבודתו הרגילה. מגבלות: 80%
   משרה (עד 4 ימים בשבוע)"
2. קטגוריית_ניתוב="הנחיה", סיכום_ממצא="הימנעות מחשיפה לקהל"
3. קטגוריית_ניתוב="הנחיה", סיכום_ממצא="תוקף הקביעה: 6 חודשים. לחזור למרפאה
   לפי הצורך"

- קטגוריית_ניתוב חייבת להיות אחד מהערכים הבאים בדיוק, ללא שינוי או תרגום:
  "בדיקת דם" | "בדיקה גנטית" | "מרשם תרופה" | "מצב רפואי" | "ניתוח/פעולה רפואית" | "הנחיה" | "כללי"
- אם אינך בטוח לאיזו קטגוריה שייך הנושא — בחר "כללי"
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
  // [v2.0.0 — Task 185] נשאר רק בלוק events — 5 הבלוקים האחרים
  // (medications/medical_status/blood_tests/genetic_tests/instructions)
  // הוסרו לגמרי. חילוץ מפורט עובר ל-S13, אחרי אימות S10/S12.
  // [חדש] Event_Date | Event_Type | Medical_System | Issuer | Summary | Routing_Category |
  //        S_Row | Validation_Status | Extraction_Status | Duplicate_Flag | Duplicate_Target_Ref | File_ID
  // File_ID עבר מעמודה G ל-L (12) — עמודה G משמשת כעת S_Row (מחושב ע"י
  // refreshMedicalEventsRows, ViewEngine.gs). 4 העמודות שביניהן (H-K)
  // נכתבות ריקות כאן — מתמלאות ע"י S10/S13/S14 בהמשך הזרימה.
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
        "",  // G = S_Row — מחושב ע"י כפתור "רענן שורות"
        "",  // H = Validation_Status
        "",  // I = Extraction_Status
        "",  // J = Duplicate_Flag
        "",  // K = Duplicate_Target_Ref
        docData.fileId  // L = File_ID
      ]);
    });
  }
}
// ══════════════════════════════════════════════════════════════════
// כתיבת שגיאה לעמודות S ו-T
// ══════════════════════════════════════════════════════════════════

function _s09_writeError(sheet, row, code, detail) {
  sheet.getRange(row, 19).setValue(code);
  sheet.getRange(row, 20).setValue(detail);
}
