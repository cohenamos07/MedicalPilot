/**
 * @file        S07_Classify.gs
 * @version     2.13.0 | @updated 19/07/2026 17:45 | @service S07
 * @git         https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S07_Classify.gs
 * @description סיווג מסמכים רפואיים בעזרת Gemini API.
 *              קורא טקסט מ-TXT_URL (X) או Raw_Text (Z).
 *              מחלץ: כותרת, מנפיק, תאריך, קטגוריה, מורכבות.
 *              בודק כפולים — 5 קריטריונים, סף 3/5.
 *              מופעל משורה בודדת (כל תא) או אצווה (עמודה M) — אינו אוטומטי.
 * @impacts     ניהול_מיילים:
 *              I(9)=Doc_Title | J(10)=Doc_Issuer | K(11)=Doc_Date
 *              L(12)=Doc_Category | M(13)=Pipeline_Status
 *              N(14)=Extraction_Status | Q(17)=Complexity
 *              R(18)=Duplicate_Flag | S(19)=Error_Code | T(20)=Error_Detail
 *              AA(27)=Duplicate_Target_FileID [v2.9.0, Task 131]
 *              קורא: X(24)=TXT_URL | Z(26)=Raw_Text
 *              [v2.10.0] כותב גם לתוך תוכן קובץ ה-TXT עצמו (Drive) — ראה @changes.
 *              תלויות: GEMINI_API_KEY, COLUMN_MAP.SHEETS_MAP,
 *                      מנהל_משאבים (getAvailableExtractor),
 *                      דוגמאות_למידה (גליון)
 * @callers     runS07Icon (ViewEngine) | classifyDocument (תפריט, ידני בלבד)
 *              run_S07_ActiveRow (תפריט, ידני בלבד)
 * @functions   classifyDocument | run_S07_ActiveRow | executeS07Classification
 *              _processS07Batch | _getS07ColumnMap | _getColDefByName
 *              _safeWrite | _safeClear | _callAiWithFullPrompt_S07
 *              _validateAiResult_S07 | _isFilled_S07 | _countFilledFields_S07
 *              _fetchTextFromUrl_S07 | _getLearningExamples_S07
 *              _calculateDuplicates_S07 | _extractTxtHeader_S07
 *              _guardAlreadyClassified_S07 | _s07_syncComplexityToTxt
 *              S07_ValidateWritePermissions
 * @changes     [v2.12.1] Task 146 — תיקון קוסמטי בלבד: טקסט דיאלוג האישור
 *              ב-_guardAlreadyClassified_S07 הזכיר "R+Note" — מנגנון ה-Note
 *              הוסר לגמרי מהארכיטקטורה ב-Task 131 (הוחלף בעמודה 27,
 *              Duplicate_Target_FileID). שינוי טקסט תצוגה בלבד, ללא שינוי
 *              לוגי — לא משפיע על שום פונקציונליות.
 * @changes     [v2.12.0] Task 155(א) (בקשת עמוס) — _calculateDuplicates_S07:
 *              בתחילת הפונקציה נוספה בדיקת V (עמודה 22, QA_Dismiss_Note) —
 *              אם השורה הנוכחית סומנה ידנית "נבדק ידנית — לא רלוונטי
 *              (כפול)" (דרך s08_cancelDuplicateFlag, S08_Validate.gs
 *              v1.0.25) — הפונקציה חוזרת מיד בלי לבדוק כפילות בכלל. גם
 *              במסננת המועמדים (שלב 2) נוסף אותו תנאי — מועמד עם V
 *              מסומן מדולג. מונע לולאת-דגל-חוזר: לפני התיקון, R+עמודה27
 *              שנוקו ע"י s08_cancelDuplicateFlag היו יכולים לגרום
 *              לזיהוי מחדש של אותה כפילות בדיוק בהרצה חוזרת של S07.
 * @changes     [v2.11.0] Task 156 (בקשת עמוס) — _getLearningExamples_S07
 *              שוכתבה: (1) תיקון באג שורש — קריאה משורה 2 קשיחה הוחלפה
 *              ב-SHEET_CONFIG["דוגמאות_למידה"].FIRST_DATA_ROW (5). לאחר
 *              מיגרציית Task 154 (הזזת נתונים 1→4) הפונקציה קראה בפועל
 *              משורות הקפאה/כותרת ולא מנתונים אמיתיים. (2) לוגיקה חדשה:
 *              סריקת כל שורות הגליון (לא רק 3 הראשונות) וסינון לפי
 *              התאמת Issuer (עמודה 2) כתת-מחרוזת בטקסט הגולמי של המסמך
 *              החדש (fullText, חיפוש טקסט רגיל — לא AI, לא קריאת Gemini
 *              נוספת). התאמה→עד 5 דוגמאות מאותו מנפיק בלבד (הגבלה לפי
 *              בקשת עמוס, מונעת פרומפט ענק למנפיק עם הרבה שורות). אין
 *              התאמה→נפילה לברירת מחדל (3 הראשונות, כפי שהיה). מטרה:
 *              מנפיק חוזר (למשל "אסותא") ילמד את המודל לזהות תבנית.
 *              הפונקציה מקבלת כעת פרמטר נוסף fullText — נקודת הקריאה
 *              ב-executeS07Classification עודכנה בהתאם.
 * @changes     [v2.10.0] תיקון שורש (בקשת עמוס, חקירת אמינות עמודה Q) —
 *              4 שינויים ב-executeS07Classification + פונקציות תומכות:
 *              (1) רובריקת מורכבות-תוכן אוניברסלית (לא תלוית קטגוריה) נוספה
 *                  לפרומפט ב-_callAiWithFullPrompt_S07 — במקום "בחר אחד
 *                  מ-3" בלי שום קריטריון.
 *              (2) fullText.substring(0, 3800) → substring(0, 15000) —
 *                  יישור לאותו סף שכבר קיים במסלולי DOCX/TXT של S06 עצמו
 *                  (execute_Direct_Path/execute_Text_Path). התיקון הישן חתך
 *                  מסמכים ארוכים לפני שה-AI בכלל הגיע לתוכן המהותי שלהם.
 *              (3) generationConfig.temperature=0.1 נוסף לקריאת S07 (כמו
 *                  שכבר קיים במסלולי S06 PDF/תמונה) — צמצום אקראיות בשיפוט
 *                  מורכבות סובייקטיבי.
 *              (4) _extractTxtHeader_S07 הורחבה לשלוף גם complexity מהכותרת
 *                  הקיימת בקובץ ה-TXT (מה שS06 קבע במקור). ברירת המחדל
 *                  השתנתה מ-"בינוני" עיוור ל-aiResult.complexity ||
 *                  header.complexity || "בינוני" (נופל על קביעת S06 לפני
 *                  שנופל על קבוע). אם הערך הסופי שונה מהכותרת המקורית —
 *                  _s07_syncComplexityToTxt (חדשה) כותבת אותו בחזרה גם
 *                  לתוך קובץ ה-TXT ב-Drive, כדי שהוא וQ יישארו מסונכרנים
 *                  תמיד (מכינה את הבסיס לבדיקת התאמה עתידית ב-S11, טרם
 *                  נכתבה). כשל בסנכרון ה-TXT נרשם ללוג בלבד — לא מפיל את
 *                  הסיווג עצמו.
 * @changes     [v2.9.0] Task 131 [שלב 3/8, שרשרת עמודה 27] — שינוי בלוק
 *              זיהוי הכפילות (Task 91 המקורי) בתוך executeS07Classification.
 *              (1) שתי קריאות ה-setNote(File_ID) על עמודה R (18) — הוחלפו
 *              ב-setValue(File_ID) על עמודה 27 (AA, Duplicate_Target_FileID),
 *              סימטרי לשתי השורות, בדיוק כמו קודם. R (18) עצמה נשארת עם
 *              setValue של Duplicate_Flag בלבד — לא Note. (2) הוסר "— שורה X"
 *              מטקסט R שנכתב לשתי השורות. "| ניקוד Y/5" נשאר בטקסט בינתיים
 *              (החלטה מפורשת — עמודת ניקוד נפרדת נדחתה לעתיד). הפורמט
 *              החדש: "כפול מאושר | ניקוד Y/5" במקום "כפול מאושר — שורה X
 *              | ניקוד Y/5". (3) מחרוזת "חשוד כלוגו/ריק" (E25, נכתבת ע"י
 *              S11 לא ע"י S07) אינה מושפעת כלל משינוי זה.
 *              ⚠️ תלות הפעלה קריטית: קוד זה תלוי בכך ש-Task 129+130 כבר
 *              רצו בהצלחה (עמודה 27 קיימת ומאוכלסת מנתונים היסטוריים).
 *              ⚠️ אזהרת רצף עבודה: לפי החלטת עמוס — אין להריץ סיווג מסמכים
 *              (executeS07Classification/_processS07Batch) בפועל אחרי
 *              העלאת גרסה זו, עד ש-Task 132 (S11_QArun.gs) ו-Task 133
 *              (S08_Validate.gs) יועלו גם הם — אחרת כפילויות חדשות שייכתבו
 *              רק לעמודה 27 לא יזוהו נכון ע"י הגרסאות הישנות של S11/S08
 *              שעדיין קוראות מ-Note/"שורה X".
 * @changes     [v2.8.1] Task 119 — תיקון תיעוד @callers: הוסר אזכור שגוי של
 *              "nightlyConvertBatch (S_Scheduler — אצווה לילית)". אומת בקריאת
 *              קוד חי: nightlyConvertBatch (ב-S06_ConvertTXT.gs) קוראת אך ורק
 *              ל-_processRow (המרת TXT) ואינה קוראת בשום מקום ל-
 *              executeS07Classification או ל-_processS07Batch. הקריאה
 *              היחידה ל-S07 מתבצעת ידנית (אייקון/תפריט) — תואם את שורה 9
 *              בתיאור ("אינו אוטומטי") שהייתה נכונה כל העת; רק שורת
 *              @callers הייתה שגויה/מיושנת. אין שינוי בלוגיקה — תיעוד בלבד.
 * @changes     [v2.8.0] Task 120 (השלמה) — התיקון ב-v2.7.0 חסם רק את
 *              הכתיבה ל-R+Note כש-R כבר "מאושר למחיקה", אך _calculateDuplicates_S07
 *              (עד 500 שורות + קריאות Drive בפועל לכל מועמד — הרצה יקרה)
 *              עדיין רצה בכל פעם ללא תנאי, וללא הגנה על "כפול מאושר" (רק
 *              על "מאושר למחיקה"). כעת: בדיקת כניסה מוקדמת (isAlreadySettled)
 *              — לפני הקריאה ל-_calculateDuplicates_S07 בכלל — בודקת אם R
 *              של השורה הנוכחית מתחיל ב"כפול מאושר" (כבר טופלה ע"י S07
 *              בעבר) או "מאושר למחיקה" (החלטת QA סופית מ-S11). אם כן —
 *              מדלגים לגמרי על החישוב היקר (לא רק על הכתיבה), עם רישום
 *              ל-Logger. אין כרגע דגל מפורש לבקשת "בדיקה חוזרת" (Task 120
 *              מציין זאת כתנאי עתידי) — כשיתווסף כזה, יש לשלב אותו כאן.
 *              בנוסף: הגנת שורת ה"תאום" (v2.7.0) הורחבה לבדוק גם "כפול
 *              מאושר" ולא רק "מאושר למחיקה", לעקביות עם הבדיקה הראשית.
 * @changes     [v2.7.0] Tasks 107+120:
 *              (1) Task 107 — נוספה _guardAlreadyClassified_S07: בודקת אם
 *                  Doc_Title מלא או Pipeline_Status="עבר סיווג " לפני הרצה בודדת
 *                  (classifyDocument במסלול תא-בודד + run_S07_ActiveRow).
 *                  אם כן — דיאלוג אישור (YES_NO) לפני המשך; ביטול = יציאה
 *                  שקטה עם toast. _processS07Batch לא שונה (כבר מוגן).
 *              (2) Task 120 — ב-executeS07Classification, לפני כתיבת
 *                  Duplicate_Flag+Note (גם בשורה הנוכחית וגם בשורת ה"תאום"),
 *                  נבדק אם R הקיים כבר מתחיל ב-"מאושר למחיקה" (החלטת QA
 *                  סופית מ-S11) — אם כן, לא נדרס; רק רישום ל-Logger.
 * @changes     [v2.6.1] Task 91 fix — תיקון Note: שורה Y מקבלת File_ID של X,
 *                       שורה X מקבלת File_ID של Y (כיוונים מתוקנים).
 *              [v2.6.0] Task 91 — הוספת setNote(File_ID) לתא R בכתיבת Duplicate_Flag.
 *                       Task 73 — תיקון פרומפט Gemini + נרמול category.
 *              [v2.5.1] תיקון קריטי — SHEET_CONFIG.FIRST_DATA_ROW (5).
 *              [v2.5.0] תיקון Duplicate_Flag + סימטריה.
 *              [v2.4.0] תיקון Complexity דינמי + כותרת מורחבת.
 *              [v2.3.6] שיפור _calculateDuplicates_S07 — 5 קריטריונים, סף 3/5.
 *              [v2.3.5] תיקון _calculateDuplicates_S07 — מחזיר מספר שורה.
 *              [v2.3.4] טריגר אצווה עבר לעמודה M | גודל אצווה 3.
 */
// ══════════════════════════════════════════════════════════════════
// גשר לתפריט
// ══════════════════════════════════════════════════════════════════

function classifyDocument() {
  const sheet       = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ניהול_מיילים");
  const firstRow    = SHEET_CONFIG["ניהול_מיילים"].FIRST_DATA_ROW;
  const activeRange = sheet.getActiveRange();
  const activeRow   = sheet.getActiveCell().getRow();
  const activeCol   = sheet.getActiveCell().getColumn();

  if (activeRange.getNumColumns() >= sheet.getMaxColumns()) {
    if (activeRow < firstRow) {
      SpreadsheetApp.getUi().alert("⚠️ שורה מוגנת (1-" + (firstRow - 1) + ") — לא ניתן לסווג.");
      return;
    }
    // [v2.7.0] Task 107 — הגנת re-extraction בהרצה בודדת
    if (!_guardAlreadyClassified_S07(sheet, activeRow)) {
      SpreadsheetApp.getActiveSpreadsheet().toast("הופסק — השורה כבר מסווגת", "S07", 3);
      return;
    }
    executeS07Classification(activeRow);
    return;
  }

  if (activeCol === 13) {
    _processS07Batch(sheet, 3);
    return;
  }

  if (activeRow < firstRow) {
    SpreadsheetApp.getUi().alert("⚠️ שורה מוגנת (1-" + (firstRow - 1) + ") — לא ניתן לסווג.");
    return;
  }
  // [v2.7.0] Task 107 — הגנת re-extraction בהרצה בודדת
  if (!_guardAlreadyClassified_S07(sheet, activeRow)) {
    SpreadsheetApp.getActiveSpreadsheet().toast("הופסק — השורה כבר מסווגת", "S07", 3);
    return;
  }
  executeS07Classification(activeRow);
}

// ══════════════════════════════════════════════════════════════════
// [v2.7.0] Task 107 — הגנה מפני re-extraction בהרצה בודדת
// אם L (Doc_Title, אינדיקטור סיווג) כבר מלא — מציג דיאלוג אישור לפני
// הרצה חוזרת, כדי למנוע דריסה בטעות של סיווג קיים (ובעקיפין, גם
// R+עמודה 27 [v2.12.1, Task 146] אם יימצא כפול מחדש — ראה גם Task 120
// ב-executeS07Classification).
// ══════════════════════════════════════════════════════════════════
function _guardAlreadyClassified_S07(sheet, row) {
  const docTitle = sheet.getRange(row, 9).getValue();   // I = Doc_Title
  const pipeline = sheet.getRange(row, 13).getValue();  // M = Pipeline_Status

  if (!docTitle && pipeline !== "עבר סיווג") return true; // עדיין לא סווג — אפשר להמשיך

  const ui       = SpreadsheetApp.getUi();
  const response = ui.alert(
    "⚠️ שורה " + row + " כבר סווגה",
    "השורה כבר עברה סיווג (Doc_Title/Pipeline_Status מלאים).\n" +
 "הרצה חוזרת תדרוס I/J/K/L/N/Q, ואם יימצא כפול חדש — גם R+עמודה 27.\n\n" +
    "להריץ בכל זאת?",
    ui.ButtonSet.YES_NO
  );
  return response === ui.Button.YES;
}
// ══════════════════════════════════════════════════════════════════
// עיבוד אצווה
// ══════════════════════════════════════════════════════════════════

function _processS07Batch(sheet, batchSize) {
  const firstRow    = SHEET_CONFIG["ניהול_מיילים"].FIRST_DATA_ROW;
  const lastRow     = sheet.getLastRow();
  let processed     = 0;
  let lastProcessed = firstRow;

  for (let i = firstRow; i <= lastRow && processed < batchSize; i++) {
    const fileId = sheet.getRange(i, 1).getValue();
    if (!fileId) continue;

    const pipeline = sheet.getRange(i, 13).getValue();
    if (pipeline === "עבר סיווג") continue;

    const docTitle = sheet.getRange(i, 9).getValue();
    if (docTitle) continue;

    const errorCode = sheet.getRange(i, 19).getValue();
    if (errorCode === "S07_ERR") {
      const errorDetail = sheet.getRange(i, 20).getValue();
      const isTemporary = errorDetail && (
        errorDetail.includes("429") ||
        errorDetail.includes("503")
      );
      if (!isTemporary) continue;
    }

    const txtUrl = sheet.getRange(i, 24).getValue();
    if (!txtUrl) continue;

    const success = executeS07Classification(i);
    SpreadsheetApp.flush();

    if (success) {
      lastProcessed = i;
      processed++;
      Logger.log("[S07 Batch] הצלחה שורה " + i);
    } else {
      Logger.log("[S07 Batch] כישלון שורה " + i + " — דולג לשורה הבאה");
    }

    Utilities.sleep(10000);
  }

  sheet.getRange(lastProcessed, 9).activate();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    "סווגו " + processed + " שורות", "MedicalPilot S07", 4
  );
}

// ══════════════════════════════════════════════════════════════════
// הרצה ישירה
// ══════════════════════════════════════════════════════════════════

function run_S07_ActiveRow() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ניהול_מיילים");
  const row   = sheet.getActiveCell().getRow();
  // [v2.7.0] Task 107 — הגנת re-extraction בהרצה בודדת
  if (!_guardAlreadyClassified_S07(sheet, row)) {
    SpreadsheetApp.getActiveSpreadsheet().toast("הופסק — השורה כבר מסווגת", "S07", 3);
    return;
  }
  executeS07Classification(row);
}

// ══════════════════════════════════════════════════════════════════
// מיפוי עמודות + כתיבה בטוחה
// ══════════════════════════════════════════════════════════════════

function _getS07ColumnMap() {
  const cols = SHEETS_MAP["ניהול_מיילים"];
  const map  = {};
  cols.forEach(function(c) { if (c.name) map[c.name] = c.col; });
  return map;
}

function _getColDefByName(sheetName, colName) {
  return SHEETS_MAP[sheetName].find(function(c) { return c.name === colName; }) || null;
}

function _safeWrite(sheet, row, colName, value) {
  const colDef = _getColDefByName(sheet.getName(), colName);
  if (!colDef) throw new Error("S07_SAFEWRITE_NO_COL_DEF: " + colName);
  if (colDef.writers.indexOf("S07") === -1)
    throw new Error("S07_SAFEWRITE_FORBIDDEN: " + colName);
  sheet.getRange(row, colDef.col).setValue(value);
}

function _safeClear(sheet, row, colName) {
  _safeWrite(sheet, row, colName, "");
}
// ══════════════════════════════════════════════════════════════════
// פונקציית ליבה
// ══════════════════════════════════════════════════════════════════
function executeS07Classification(row) {
  const firstRow = SHEET_CONFIG["ניהול_מיילים"].FIRST_DATA_ROW;
  if (row < firstRow) {
    Logger.log("[S07] דולג — שורה " + row + " מוגנת (1-" + (firstRow - 1) + ").");
    return false;
  }

  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = ss.getSheetByName("ניהול_מיילים") || ss.getActiveSheet();
  const COL     = _getS07ColumnMap();
  const lastCol = sheet.getLastColumn();
  const data    = sheet.getRange(row, 1, 1, lastCol).getValues()[0];

  _safeClear(sheet, row, "Error_Code");
  _safeClear(sheet, row, "Error_Detail");
  _safeClear(sheet, row, "Pipeline_Status");
  _safeClear(sheet, row, "Extraction_Status");

  try {
    const txtUrl  = data[COL["TXT_URL"] - 1];
    const rawText = data[COL["Raw_Text"] - 1];

    if (!txtUrl && !rawText)
      throw new Error("NO_TEXT_SOURCE: אין TXT_URL ואין Raw_Text");

    let fullText = txtUrl ? _fetchTextFromUrl_S07(txtUrl) : String(rawText);

    if (!fullText || fullText.trim() === "")
      throw new Error("NO_TEXT_FOUND: הטקסט שהתקבל ריק");

    // [v2.8.0] Task 120 (השלמה) — בדיקת כניסה *לפני* הקריאה היקרה ל-
    // _calculateDuplicates_S07 (עד 500 שורות + קריאות Drive). אם R של
    // השורה הנוכחית כבר במצב סופי — מדלגים על החישוב כולו, לא רק על הכתיבה.
    const fileIdForNote   = (data[0] || "").toString().trim(); // File_ID של שורה Y הנוכחית
    const currentRFlagPre = (data[17] || "").toString().trim(); // R = col 18
    const isAlreadySettled =
      currentRFlagPre.indexOf("כפול מאושר")   === 0 ||
      currentRFlagPre.indexOf("מאושר למחיקה") === 0;

    if (isAlreadySettled) {
      Logger.log("[S07] Task 120 — דילוג מלא על _calculateDuplicates_S07 בשורה " + row +
                  ": R כבר במצב סופי ('" + currentRFlagPre + "') — אין חישוב מחדש.");
    } else {
      const dupResult = _calculateDuplicates_S07(row, sheet, fullText);
      if (dupResult) {
        // [v2.9.0] Task 131 — הוסר "— שורה X" מהטקסט. "ניקוד" נשאר בינתיים.
        const dupFlag = "כפול מאושר | ניקוד " + dupResult.score + "/5";
        _safeWrite(sheet, row, "Duplicate_Flag", dupFlag);
        // [v2.9.0] Task 131 — עמודה 27 (AA) במקום Note על R.
        // עמודה 27 של שורה Y = File_ID של שורת המטרה X
        const dupTargetFileId = (sheet.getRange(dupResult.sheetRow, 1).getValue() || "").toString().trim();
        if (dupTargetFileId) { sheet.getRange(row, 27).setValue(dupTargetFileId); }

        // [v2.8.0] הגנת שורת ה"תאום" — הורחבה לבדוק גם "כפול מאושר" (לא
        // רק "מאושר למחיקה" כמו ב-v2.7.0), לעקביות עם הבדיקה הראשית למעלה.
        try {
          const mirrorRFlag = (sheet.getRange(dupResult.sheetRow, 18).getValue() || "").toString().trim();
          const isMirrorSettled =
            mirrorRFlag.indexOf("כפול מאושר")   === 0 ||
            mirrorRFlag.indexOf("מאושר למחיקה") === 0;

          if (isMirrorSettled) {
            Logger.log("[S07] Task 120 — דילוג על עדכון R+עמודה27 בשורה " + dupResult.sheetRow +
                        ": R כבר במצב סופי ('" + mirrorRFlag + "') — לא נדרס.");
          } else {
            // [v2.9.0] Task 131 — הוסר "— שורה X" מהטקסט. "ניקוד" נשאר בינתיים.
            const mirrorFlag = "כפול מאושר | ניקוד " + dupResult.score + "/5";
            _safeWrite(sheet, dupResult.sheetRow, "Duplicate_Flag", mirrorFlag);
            // [v2.9.0] Task 131 — עמודה 27 (AA) במקום Note על R.
            // עמודה 27 של שורה X = File_ID של שורה Y (fileIdForNote)
            if (fileIdForNote) { sheet.getRange(dupResult.sheetRow, 27).setValue(fileIdForNote); }
          }
        } catch (mirrorErr) {
          Logger.log("[S07] סימטריה — לא הצליח לכתוב לשורה " + dupResult.sheetRow + ": " + mirrorErr.message);
        }
      }
    }

    const extractor = getAvailableExtractor("SIMPLE");
    if (!extractor) throw new Error("NO_FREE_EXTRACTOR: Flash מוצה — נסה מחר");
    console.log("[S07] מחלץ: " + extractor.id);

    const examples = _getLearningExamples_S07(ss, fullText);

    // [v2.10.0] תיקון שורש (חקירת אמינות עמודה Q, בקשת עמוס) — שליפת
    // הכותרת הקיימת בקובץ ה-TXT (כולל complexity שS06 כתב במקור) *לפני*
    // קריאת ה-AI, לשימוש כ-fallback וכעוגן השוואה לסנכרון בהמשך.
    const header = _extractTxtHeader_S07(fullText);

    const aiResult = _callAiWithFullPrompt_S07(
      fullText.substring(0, 15000), extractor, examples
    );

    if (!aiResult || Object.keys(aiResult).length === 0)
      throw new Error("AI_EMPTY_RESPONSE: AI החזיר תשובה ריקה");

    _validateAiResult_S07(aiResult);

    const filled = _countFilledFields_S07(aiResult);
    if (filled < 2)
      throw new Error("AI_RESULT_TOO_WEAK: רק " + filled + " שדות — לא מספיק");

    // [v2.10.0] תיקון שורש — ברירת מחדל משופרת: קודם תשובת ה-AI, אחרת
    // מה שS06 כבר קבע (מהכותרת), ורק אם גם זה חסר — "בינוני" כמוצא אחרון
    // (במקום נפילה עיוורת ל"בינוני" בלי קשר לתוכן המסמך, כמו קודם).
    const finalComplexity = aiResult.complexity || header.complexity || "בינוני";

    _safeWrite(sheet, row, "Doc_Title",         aiResult.title      || "");
    _safeWrite(sheet, row, "Doc_Issuer",         aiResult.issuer     || "");
    _safeWrite(sheet, row, "Doc_Date",           aiResult.date       || "");
    _safeWrite(sheet, row, "Doc_Category",       aiResult.category   || "");
    _safeWrite(sheet, row, "Complexity",         finalComplexity);

    // [v2.10.0] תיקון שורש — אם הערך הסופי שונה מהערך שכבר כתוב בכותרת
    // קובץ ה-TXT (קביעת S06 המקורית) — מסנכרנים את הקובץ עצמו, כדי
    // שהוא ועמודה Q יישארו תואמים תמיד. אם header.complexity חסר (קובץ
    // ישן/פורמט לא מזוהה) — אין עוגן להשוואה, מדלגים על הסנכרון בשקט.
    if (txtUrl && header.complexity && header.complexity !== finalComplexity) {
      _s07_syncComplexityToTxt(txtUrl, finalComplexity);
    }

    const extractionStatus = filled === 4 ? "חולץ מלא" : "חולץ חלקי";
    _safeWrite(sheet, row, "Extraction_Status", extractionStatus);
    _safeWrite(sheet, row, "Pipeline_Status",   "עבר סיווג");

    updateExtractorUsage(extractor.id);

    console.log("[S07] הצלחה שורה " + row + " | " + extractionStatus);
    sheet.getRange(row, COL["Doc_Title"]).activate();
    return true;

  } catch (e) {
    try {
      _safeWrite(sheet, row, "Error_Code",   "S07_ERR");
      _safeWrite(sheet, row, "Error_Detail",  e.message);
      sheet.getRange(row, COL["Error_Code"]).activate();
    } catch (inner) {
      console.error("[S07] שגיאה נוספת: " + inner.message);
    }
    console.error("[S07] שגיאה שורה " + row + ": " + e.message);
    return false;
  }
}
// ══════════════════════════════════════════════════════════════════
// סנכרון מורכבות לקובץ TXT — תיקון שורש (חקירת אמינות עמודה Q)
// ══════════════════════════════════════════════════════════════════

/**
 * [v2.10.0] מעדכנת את שורת "מורכבות:" בתוך תוכן קובץ ה-TXT ב-Drive,
 * כדי שהיא תישאר תואמת לערך הסופי שנכתב לעמודה Q. נקראת רק כשיש
 * אי-התאמה בין מה שכבר כתוב בקובץ (קביעת S06 המקורית) לבין הערך
 * הסופי שנקבע ב-executeS07Classification. כשל כאן (קובץ לא נגיש/
 * נמחק וכו') נרשם ללוג בלבד — לא מפיל את הסיווג עצמו, כי הכתיבה
 * לעמודה Q (מקור האמת התפעולי) כבר הצליחה בשלב קודם.
 */
function _s07_syncComplexityToTxt(txtUrl, newComplexity) {
  try {
    var id = null;
    if (txtUrl.includes("id="))      id = txtUrl.split("id=")[1].split("&")[0];
    else if (txtUrl.includes("/d/")) id = txtUrl.split("/d/")[1].split("/")[0];
    if (!id) throw new Error("לא נמצא File ID ב-URL");

    var file    = DriveApp.getFileById(id);
    var content = file.getBlob().getDataAsString();

    if (!content || content.trim() === "")
      throw new Error("קובץ TXT קיים אך ריק — לא ניתן לסנכרן");

    var updated = content.replace(/(מורכבות:\s*)(\S+)/, "$1" + newComplexity);

    if (updated === content) {
      Logger.log("[S07] סנכרון TXT — לא נמצאה שורת 'מורכבות:' בקובץ (" + id + "), לא בוצע שינוי.");
      return;
    }

    file.setContent(updated);
    Logger.log("[S07] סנכרון TXT הצליח — עודכן ל-'" + newComplexity + "' בקובץ " + id);

  } catch (e) {
    Logger.log("[S07] ⚠️ סנכרון TXT נכשל (" + txtUrl + "): " + e.message + " — עמודה Q כבר עודכנה, רק הקובץ לא.");
  }
}
function _extractTxtHeader_S07(txtContent) {
  if (!txtContent) return {};
  const result = {};
  const lines  = txtContent.split(/\r?\n/).slice(0, 6);
  lines.forEach(function(line) {
    const titleMatch = line.match(/^כותרת:\s*(.+?)\s{2,}/);
    if (titleMatch) result.title = titleMatch[1].trim();

    const issuerMatch = line.match(/^מנפיק:\s*(.+?)\s{2,}/);
    if (issuerMatch) result.issuer = issuerMatch[1].trim();

    const dateMatch = line.match(/^תאריך_מסמך:\s*(\S+)/);
    if (dateMatch) result.date = dateMatch[1].trim();

    const sizeMatch = line.match(/גודל_מקור:\s*(\S+\s*\S*)/);
    if (sizeMatch) result.size = sizeMatch[1].trim();

    const wordsMatch = line.match(/מספר_מילים:\s*(\d+)/);
    if (wordsMatch) result.words = parseInt(wordsMatch[1], 10);

    // [v2.10.0] תיקון שורש (חקירת אמינות עמודה Q) — שליפת הערך שS06 כתב
    // במקור לתוך כותרת קובץ ה-TXT, לשימוש כ-fallback וכעוגן השוואה
    // ב-executeS07Classification (במקום ברירת מחדל עיוורת ל"בינוני").
    const complexityMatch = line.match(/מורכבות:\s*(\S+)/);
    if (complexityMatch) result.complexity = complexityMatch[1].trim();
  });
  return result;
}

function _calculateDuplicates_S07(currentRow, sheet, currentTxtContent) {
  const MAX_ROWS = 500;
  const lastRow  = Math.min(sheet.getLastRow(), MAX_ROWS);
  if (lastRow < 2) return null;

  // [v2.12.0] Task 155(א) (בקשת עמוס) — אם השורה הנוכחית סומנה ידנית
  // כ"נבדק ידנית — לא רלוונטי (כפול)" (V, עמודה 22) — לא בודקים כפילות
  // בכלל. מונע לולאת-דגל-חוזר אחרי s08_cancelDuplicateFlag.
  const currentDismiss = String(sheet.getRange(currentRow, 22).getValue() || "").trim();
  if (currentDismiss.indexOf("(כפול)") !== -1) return null;

  const currentMeta = _extractTxtHeader_S07(currentTxtContent);
  if (!currentMeta.title && !currentMeta.issuer && !currentMeta.date) return null;

  // [v2.13.0] Task 152 — סינון "לא זוהה": אם כל 3 שדות = "לא זוהה" או ריק
  const isCurrentUndetected = (
    (currentMeta.title === "לא זוהה" || !currentMeta.title) &&
    (currentMeta.issuer === "לא זוהה" || !currentMeta.issuer) &&
    (currentMeta.date === "לא" || currentMeta.date === "לא זוהה" || !currentMeta.date)
  );
  if (isCurrentUndetected) return null;

  // ── שלב 1: קריאה אחת של עמודות I, J, K, X לזיכרון ──────────────
  const rangeData = sheet.getRange(2, 9, lastRow - 1, 16).getValues();
  // col 9=I(0), 10=J(1), 11=K(2) ... 24=X(15)

  const candidates = [];

  // ── שלב 2: סינון ראשוני לפי נתוני גליון בלבד ────────────────────
  for (var i = 0; i < rangeData.length; i++) {
    const sheetRow = i + 2;
    if (sheetRow === currentRow) continue;

    const rowTitle   = String(rangeData[i][0]  || "").trim(); // I
    const rowIssuer  = String(rangeData[i][1]  || "").trim(); // J
    const rowDate    = String(rangeData[i][2]  || "").trim(); // K
    const rowDismiss = String(rangeData[i][13] || "").trim(); // V(22)
    const rowTxtUrl  = String(rangeData[i][15] || "").trim(); // X(24)

    if (!rowTxtUrl) continue;
    // [v2.12.0] Task 155(א) — מדלג על מועמד שסומן ידנית "לא רלוונטי (כפול)"
    if (rowDismiss.indexOf("(כפול)") !== -1) continue;

    let quickScore = 0;

    if (currentMeta.title && rowTitle) {
      const a = currentMeta.title.toLowerCase();
      const b = rowTitle.toLowerCase();
      if (a.includes(b) || b.includes(a)) quickScore++;
    }
    if (currentMeta.issuer && rowIssuer &&
        currentMeta.issuer.toLowerCase() === rowIssuer.toLowerCase()) {
      quickScore++;
    }
    if (currentMeta.date && rowDate &&
        currentMeta.date === rowDate) {
      quickScore++;
    }

    if (quickScore >= 2) {
      candidates.push({ sheetRow: sheetRow, txtUrl: rowTxtUrl, quickScore: quickScore });
    }
  }

  if (candidates.length === 0) return null;

  // ── שלב 3: קריאת Drive רק לשורות מועמדות ────────────────────────
  for (var c = 0; c < candidates.length; c++) {
    const cand = candidates[c];

    let otherContent = "";
    try {
      otherContent = _fetchTextFromUrl_S07(cand.txtUrl);
    } catch (e) {
      continue;
    }

    const otherMeta = _extractTxtHeader_S07(otherContent);
    if (!otherMeta.title && !otherMeta.issuer) continue;

    // [v2.13.0] Task 152 — סינון "לא זוהה": דלג אם גם המועמד הזה לא מזוהה
    const isOtherUndetected = (
      (otherMeta.title === "לא זוהה" || !otherMeta.title) &&
      (otherMeta.issuer === "לא זוהה" || !otherMeta.issuer) &&
      (otherMeta.date === "לא" || otherMeta.date === "לא זוהה" || !otherMeta.date)
    );
    if (isOtherUndetected) continue;

    let score = 0;

    if (currentMeta.title && otherMeta.title) {
      const a = currentMeta.title.toLowerCase();
      const b = otherMeta.title.toLowerCase();
      if (a.includes(b) || b.includes(a)) score++;
    }
    if (currentMeta.issuer && otherMeta.issuer &&
        currentMeta.issuer.toLowerCase() === otherMeta.issuer.toLowerCase()) {
      score++;
    }
    if (currentMeta.date && otherMeta.date &&
        currentMeta.date === otherMeta.date) {
      score++;
    }
    if (currentMeta.size && otherMeta.size &&
        currentMeta.size === otherMeta.size) {
      score++;
    }
    if (currentMeta.words && otherMeta.words) {
      const diff = Math.abs(currentMeta.words - otherMeta.words);
      const pct  = diff / Math.max(currentMeta.words, otherMeta.words);
      if (pct <= 0.10) score++;
    }

    if (score >= 3) {
      Logger.log("[S07] כפול זוהה: שורה " + currentRow + " ↔ שורה " + cand.sheetRow +
                 " | quickScore: " + cand.quickScore + "/3 | finalScore: " + score + "/5");
      return { sheetRow: cand.sheetRow, score: score };
    }
  }

  return null;
}

// ══════════════════════════════════════════════════════════════════
// דוגמאות למידה
// ══════════════════════════════════════════════════════════════════

function _getLearningExamples_S07(ss, fullText) {
  try {
    const exSheet = ss.getSheetByName("דוגמאות_למידה");
    if (!exSheet) return "";

    // [v2.11.0] Task 156(1) — תיקון באג שורש: FIRST_DATA_ROW (5) במקום
    // "2" קשיח. לאחר מיגרציית Task 154 (הזזת נתונים 1→4), שורה 2 היא
    // שורת הקפאה/כותרת — לא נתונים אמיתיים.
    const firstDataRow = SHEET_CONFIG["דוגמאות_למידה"].FIRST_DATA_ROW;
    const lastRow = exSheet.getLastRow();
    if (lastRow < firstDataRow) return "";

    // עמודות לפי SHEETS_MAP["דוגמאות_למידה"]: 1=Subject, 2=Issuer,
    // 3=Classification.
    const numRows = lastRow - firstDataRow + 1;
    const allRows = exSheet.getRange(firstDataRow, 1, numRows, 3).getValues();

    // [v2.11.0] Task 156(2) — סריקת התאמת מנפיק בטקסט הגולמי של המסמך
    // החדש (חיפוש טקסט רגיל, לא AI, לא קריאת Gemini נוספת). מנפיק לא
    // ריק שמופיע כתת-מחרוזת ב-fullText — מטרה: מנפיק חוזר (למשל
    // "אסותא") ילמד את המודל לזהות תבנית.
    var matchedRows = [];
    if (fullText) {
      var haystack = fullText.toLowerCase();
      matchedRows = allRows.filter(function(r) {
        var issuer = (r[1] || "").toString().trim();
        return issuer && haystack.indexOf(issuer.toLowerCase()) !== -1;
      });
    }

    // [v2.11.0] Task 156 — הגבלה ל-5 דוגמאות מקסימום לאותו מנפיק (בקשת
    // עמוס, מונע פרומפט ענק כשלמנפיק יש הרבה שורות דוגמה). אין התאמה
    // → נפילה לברירת מחדל (3 השורות הראשונות, כפי שהיה לפני Task 156).
    const dataToUse = matchedRows.length > 0
      ? matchedRows.slice(0, 5)
      : allRows.slice(0, 3);

    let out = "\n--- דוגמאות לסיווג נכון ---\n";
    dataToUse.forEach(function(r) {
      if (r[0]) out += "טקסט: " + r[0] + " | מנפיק: " + (r[1] || "") + " | קטגוריה: " + (r[2] || "") + "\n";
    });
    return out;
  } catch (e) { return ""; }
}

// ══════════════════════════════════════════════════════════════════
// קריאה ל-AI
// ══════════════════════════════════════════════════════════════════

function _callAiWithFullPrompt_S07(text, extractor, examples) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY חסר ב-Script Properties");

  const fullPrompt =
    "אתה עוזר אדמיניסטרטיבי רפואי מומחה בישראל.\n" +
    "החזר JSON בלבד ללא טקסט נוסף:\n" +
    "{ \"title\": \"\", \"issuer\": \"\", \"date\": \"\", \"category\": \"\", \"complexity\": \"\" }\n" +
    "ערכי category חוקיים: רפואי / חשבונאי / משפטי / ביטוחי / אחר\n" +
    "חשוב: category חייב להיות בדיוק אחד מהערכים הנ\"ל — ללא מילת 'מסמך' לפניו.\n" + // [v2.6.0] Task 73
    "ערכי complexity חוקיים: פשוט / בינוני / מורכב\n" +
    // [v2.10.0] תיקון שורש (חקירת אמינות עמודה Q, בקשת עמוס) — רובריקה
    // אוניברסלית (לא תלוית קטגוריה — רפואי/חשבונאי/משפטי/ביטוחי/אחר כולם
    // נשפטים לפי אותם ארבעה קריטריונים מבניים). קודם לכן לא היה שום
    // קריטריון כלל, רק שלוש האפשרויות בשמן.
    "דרג את מורכבות התוכן (לא מורכבות טכנית/סריקה) לפי:\n" +
    "- מספר נושאים/ישויות נפרדים במסמך\n" +
    "- צפיפות מונחים מקצועיים\n" +
    "- כמות נתונים/ערכים לחילוץ\n" +
    "- מידת התלות בהקשר חיצוני להבנה מלאה\n" +
    "פשוט: נושא אחד, מעט מונחים, מעט נתונים, לא דורש הקשר חיצוני\n" +
    "בינוני: 2-3 נושאים קשורים, מונחים מפוזרים, נתונים בינוניים\n" +
    "מורכב: 4+ נושאים או מבנה רב-שכבתי, מונחים צפופים, הרבה נתונים, דורש הקשר חיצוני\n" +
    "חובה למלא לפחות title ו-category.\n" +
    examples +
    "\nהטקסט:\n" + text;

  const url = extractor.url + "?key=" + apiKey;

  const response = UrlFetchApp.fetch(url, {
    method:             "post",
    contentType:        "application/json",
    // [v2.10.0] תיקון שורש (בקשת עמוס) — נוסף temperature:0.1, כמו שכבר
    // קיים במסלולי S06 PDF/תמונה — צמצום אקראיות בשיפוט מורכבות סובייקטיבי.
    payload:            JSON.stringify({
      contents:         [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { temperature: 0.1 }
    }),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  if (code === 429) throw new Error("429: חריגת קצב RPM — המתן ונסה שוב");
  if (code === 503) throw new Error("503: שרת עמוס — נסה שוב");
  if (code !== 200) throw new Error("AI_API_FAIL_" + code + ": " + response.getContentText().substring(0, 150));

  let json;
  try { json = JSON.parse(response.getContentText()); }
  catch (e) { throw new Error("AI_RESPONSE_NOT_JSON"); }

  const rawText = (json.candidates &&
                   json.candidates[0] &&
                   json.candidates[0].content &&
                   json.candidates[0].content.parts &&
                   json.candidates[0].content.parts[0] &&
                   json.candidates[0].content.parts[0].text) || "";

  if (!rawText || rawText.trim() === "")
    throw new Error("AI_EMPTY_CONTENT: AI החזיר תוכן ריק");

  try {
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed  = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== "object")
      throw new Error("AI_INVALID_STRUCTURE");
    return parsed;
  } catch (e) { throw new Error("AI_JSON_PARSE_FAIL: " + e.message); }
}

// ══════════════════════════════════════════════════════════════════
// ולידציה
// ══════════════════════════════════════════════════════════════════

function _isFilled_S07(v) {
  return v !== null && v !== undefined && String(v).trim() !== "";
}

function _countFilledFields_S07(ai) {
  return [ai.title, ai.issuer, ai.date, ai.category].filter(_isFilled_S07).length;
}

function _validateAiResult_S07(ai) {
  if (!ai || typeof ai !== "object")
    throw new Error("VALIDATION_FAIL_STRUCTURE");

  if (!_isFilled_S07(ai.title) || ai.title.trim().length < 3)
    throw new Error("VALIDATION_FAIL_TITLE: כותרת חסרה או קצרה");

  if (!_isFilled_S07(ai.category))
    throw new Error("VALIDATION_FAIL_CATEGORY: קטגוריה חסרה");

  // [v2.6.0] Task 73 — נרמול category: הסרת "מסמך " מקדים אם קיים
  if (ai.category) { ai.category = ai.category.trim().replace(/^מסמך\s+/, ""); }

  const allowed = ["רפואי", "חשבונאי", "משפטי", "ביטוחי", "אחר"];
  if (allowed.indexOf(ai.category.trim()) === -1)
    throw new Error("VALIDATION_FAIL_CATEGORY: לא חוקית — " + ai.category);

  if (_isFilled_S07(ai.issuer) && ai.issuer.trim().length < 3)
    throw new Error("VALIDATION_FAIL_ISSUER: מנפיק קצר מדי");

  if (_isFilled_S07(ai.date) && ai.date.trim().length < 4)
    throw new Error("VALIDATION_FAIL_DATE: תאריך קצר מדי");
}
// ══════════════════════════════════════════════════════════════════
// קריאת טקסט מ-TXT_URL
// ══════════════════════════════════════════════════════════════════

function _fetchTextFromUrl_S07(url) {
  try {
    var id = null;
    if (url.includes("id="))      id = url.split("id=")[1].split("&")[0];
    else if (url.includes("/d/")) id = url.split("/d/")[1].split("/")[0];
    if (!id) throw new Error("לא נמצא File ID ב-URL");

    const text = DriveApp.getFileById(id).getBlob().getDataAsString();

    if (!text || text.trim() === "")
      throw new Error("קובץ TXT קיים אך ריק");

    return text;

  } catch (e) {
    throw new Error("FETCH_TEXT_FAIL: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// בדיקת הרשאות כתיבה (כלי פיתוח)
// ══════════════════════════════════════════════════════════════════

function S07_ValidateWritePermissions() {
  const ui        = SpreadsheetApp.getUi();
  const sheetName = "ניהול_מיילים";
  const cols      = SHEETS_MAP[sheetName];
  const allowed   = cols
    .filter(function(c) { return c.writers.indexOf("S07") !== -1; })
    .map(function(c) { return c.name; });

  const actual = [
    "Doc_Title", "Doc_Issuer", "Doc_Date", "Doc_Category",
    "Pipeline_Status", "Extraction_Status", "Complexity",
    "Duplicate_Flag", "Error_Code", "Error_Detail"
  ];

  const forbidden = actual.filter(function(a) { return allowed.indexOf(a) === -1; });

  var report  = "בדיקת הרשאות כתיבה — S07\n";
  report     += "══════════════════════════════\n\n";
  report     += "✔ מותר לכתוב:\n" + allowed.join(", ") + "\n\n";
  report     += "📝 הקוד כותב בפועל:\n" + actual.join(", ") + "\n\n";

  if (forbidden.length) {
    report += "❌ אסור לכתוב:\n" + forbidden.join(", ");
    ui.alert("❌ הרשאות לא תקינות", report, ui.ButtonSet.OK);
  } else {
    report += "✅ תקין — אין חריגות.";
    ui.alert("✔ הרשאות תקינות", report, ui.ButtonSet.OK);
  }
}