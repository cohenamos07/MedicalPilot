/**
 * MedicalPilot — S11_QArun.gs
 * @version 1.38.0 | @updated 05/08/2026 21:37 | @service S11
 * @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S11_QArun.gs
 * @description בדיקת תקינות Pipeline — סריקת גליון ניהול_מיילים לפי חוקי QA
 *              (E09-E28 + E30-E32, ללא E23/E24/E29; #149).
 * @impacts בודק עקביות עמודות L, M, N, Q, R, S, T, U, וכעת גם עמודה 27 (AA)
 *          לפי ציר התקדמות S03→S09.
 *          כותב לעמודות: M, N, Q, R, S+T, U.
 *          S11 אינו מוחק אף שורה בעצמו — רק מסמן בעמודה R (מלבד qa_deleteE17Findings, יוצא דופן).
 *          תלויות: COLUMN_MAP.gs (SHEET_CONFIG), S11_QADialog.html, גליון ניהול_מיילים.
 *          שורות 1-4 מוגנות — הלולאה מתחילה תמיד מ-SHEET_CONFIG.FIRST_DATA_ROW (5).
 * @callers ViewEngine.gs (runQAView), Menu_PROD.gs, Menu_LAB.gs
 * @functions runQAViewMain, s11_runSingleCheck, s11_runSingleCheckBatch, s11_storeFindings,
 *            qa_getFindings, qa_applySelectedFixes, qa_deleteE17Findings, _qa_scanRow,
 *            _qa_scanAll, _qa_checkRow, _qa_check_E01..._qa_check_E30, _qa_dedupeE11Findings,
 *            _qa_dedupeE32Findings, _qa_fetchTxtWordCount_E25, _qa_fetchTxtComplexity_E30,
 *            _qa_fetchTxtHeader_E32, _qa_calculateDuplicates_E32, _qa_parseFileSizeToBytes,
 *            _qa_buildSummary, _qa_applyFixes, _qa_validateCol, _qa_loadEventsFileIds,
 *            findAnchorRowAndAuditVerified, _qa_clearStaleUFlag_Task163
 * @changes [v1.38.0] Task 164 — _qa_check_E25_E31: ענף E25 (wordCountNew<20 ||
 *          docTitleNew==='לא זוהה' || docIssuerNew==='לא זוהה') תיקן רק את נוסח
 *          ה-desc/value כך שישקף את הסיבה האמיתית להפעלה (מילים/כותרת/מנפיק,
 *          כל תנאי שהתקיים בנפרד) במקום להציג תמיד ספירת מילים גם כשזו לא
 *          הסיבה. תנאי ההפעלה עצמו לא השתנה (חלופה 2, כפי שסוכם). אומת חי:
 *          מקרה 4 מילים מציג ספירה, מקרה מנפיק-לא-זוהה מציג "מנפיק לא זוהה".
 */
// ══════════════════════════════════════════════════════════════════
// קבועים
// ══════════════════════════════════════════════════════════════════

const QA_SHEET_NAME   = "ניהול_מיילים";
const QA_EVENTS_SHEET = "יומן_אירועים_רפואי";
const QA_DATA_START   = SHEET_CONFIG["ניהול_מיילים"].FIRST_DATA_ROW; // 5 — שורות 1-4 מוגנות

// ערכי L חוקיים — [v1.3.0] E14
const QA_VALID_L = [
  "רפואי",
  "חשבונאי",
  "משפטי",
  "ביטוחי",
  "אחר",
  "מסמך רפואי",
  "מסמך חשבונאי",
  "מסמך משפטי",
  "מסמך ביטוחי"
];

// ערכי M חוקיים
const QA_VALID_M = [
  "ממתין להמרה ל-TXT",
  "הומר ל-TXT",
  "עבר סיווג",
  "מחולץ", // [v1.14.0] E28 — ערך legacy זמני; E03 לא דורש דיווח כפול, E28 לבדו אחראי על ההמרה בפועל. להסיר מהרשימה בעתיד אחרי שכל השורות ההיסטוריות יתוקנו.
  "ממתין לאימות",
  "מאושר",
  "אומת ידנית",
  "חולץ לגליונות",
  "חולץ ליומן אירועים",
  "חולץ לתרופות",
  "חולץ למצב רפואי",
  "חולץ לבדיקות דם",
  "חולץ לבדיקות גנטיות",
  "חולץ להנחיות",
  "לא נתמך"
];

// ערכי N חוקיים
const QA_VALID_N = ["ממתין", "חולץ חלקי", "חולץ מלא"];

// ערכי Q חוקיים

const QA_VALID_Q = ["פשוט", "בינוני", "מורכב", "SIMPLE", "MEDIUM", "COMPLEX"];

// [v1.11.0] Task 121 — מיפוי תרגום Complexity אנגלית (שאריות מגרסת S07 לפני
// Task 33 / v2.4.0) לעברית הנוכחית. משמש את E26 בלבד.
const QA_COMPLEXITY_EN_TO_HE = {
  "SIMPLE":  "פשוט",
  "MEDIUM":  "בינוני",
  "COMPLEX": "מורכב"
};

// מיפוי עמודות מאושרות לכתיבה — שם + מספר
const QA_ALLOWED_COLS = {
  12: "Doc_Category",
  13: "Pipeline_Status",
  14: "Extraction_Status",
  17: "Complexity",
  18: "Duplicate_Flag",
  19: "Error_Code",
  20: "Error_Detail",
  21: "QA_Status",
  27: "Duplicate_Target_FileID"
};

var QA_STORED_FINDINGS = [];

// [v1.29.0] בקשת עמוס — רשימת שלבי הבדיקה להצגה בדיאלוג ההתקדמות בלבד.
// הסדר תואם את סדר ההרצה בפועל ב-_qa_checkRow. heavy:true = קוד שניגש
// ל-Drive (E25/E30/E31/E32) — איטי משמעותית משאר הקודים.
const QA_CHECK_STEPS = [
  { code: "E01",     label: "M ריק מול O" },
  { code: "E02",     label: "M מול TXT_URL" },
  { code: "E03",     label: "תקינות ערך M" },
  { code: "E04",     label: "ניקוי S/T (M=הומר)" },
  { code: "E05",     label: "ניקוי S/T (M=עבר סיווג)" },
  { code: "E06",     label: "ניקוי S/T (M=מאושר)" },
  { code: "E07",     label: "חילוץ N" },
  { code: "E08",     label: "תקינות ערך N" },
  { code: "E09",     label: "תקינות ערך Q" },
  { code: "E26",     label: "תרגום Q לעברית" },
  { code: "E10",     label: "Q לפני המרה" },
  { code: "E11-E12", label: "סימטריית כפילות (R + עמודה 27)" },
  { code: "E13",     label: "אישור ידני מול M" },
  { code: "E14",     label: "תקינות קטגוריה (L)" },
  { code: "E15",     label: "התאמה ליומן_אירועים_רפואי" },
  { code: "E16",     label: "שורות ארכיון OCR ישנות" },
  { code: "E17-E22", label: "מקור חסר ב-Drive", heavy: true },
  { code: "E27",     label: "M תקוע על 'הומר ל-TXT'" },
  { code: "E28",     label: "מיגרציית ערך M ישן" },
  { code: "E32-E25-E31-E30", label: "כפילות תוכן + לוגו/ריק + מורכבות — TXT משותף (Drive)", heavy: true }
];
// ══════════════════════════════════════════════════════════════════
// נקודת כניסה ראשית — נקראת מ-ViewEngine.runQAView
// ══════════════════════════════════════════════════════════════════

function runQAViewMain() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(QA_SHEET_NAME);

  if (!sheet) {
    SpreadsheetApp.getUi().alert("שגיאה", "גליון '" + QA_SHEET_NAME + "' לא נמצא.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < QA_DATA_START) {
    ss.toast("אין נתונים לבדיקה", "S11 QA", 3);
    return;
  }

  // [v1.29.0] נקבע מיד — מהיר, בלי Drive — לפני פתיחת הדיאלוג
  const activeRow   = sheet.getActiveCell().getRow();
  const activeRange = sheet.getActiveRange();
  const isSingleRow = activeRange.getNumColumns() >= sheet.getMaxColumns();

  // [v1.29.0] שלב 1 — הדיאלוג נפתח מיידית. הסריקה בפועל (24 קריאות,
  // אחת לכל שלב ב-QA_CHECK_STEPS) מתבצעת מה-Dialog עצמו אחרי הפתיחה,
  // עם עדכון התקדמות ביניהן. עד חיבור שלבים 2-4, ההרצה היא placeholder.
  const template = HtmlService.createTemplateFromFile('S11_QADialog');
  template.isSingleRow    = isSingleRow;
  template.activeRow      = activeRow;
  template.lastRow        = lastRow;
  template.checkStepsJson = JSON.stringify(QA_CHECK_STEPS);

  const html = template.evaluate()
    .setWidth(680)
    .setHeight(520);

  SpreadsheetApp.getUi().showModalDialog(html, 'S11 QA — דוח ממצאים');
}

// ══════════════════════════════════════════════════════════════════
// [v1.29.0] הרצת שלב בדיקה בודד — נקראת מה-Dialog, 24 פעמים (אחת לכל
// קוד ב-QA_CHECK_STEPS). PLACEHOLDER בשלב 1: טוענת allData אמיתי מהגליון
// בכל קריאה (בלי מטמון), אך מחזירה [] לכל קוד. הלוגיקה האמיתית תחובר
// בשלבים 2-4.
// ══════════════════════════════════════════════════════════════════
function s11_runSingleCheck(checkCode, isSingleRow, activeRow, lastRow) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(QA_SHEET_NAME);
    if (!sheet) return { error: true, msg: "גליון '" + QA_SHEET_NAME + "' לא נמצא", code: checkCode };

    const totalCols = 27;
    const allData = sheet.getRange(QA_DATA_START, 1, lastRow - QA_DATA_START + 1, totalCols).getValues();

    const fileIdRowMap = {};
    allData.forEach(function(rd, idx) {
      const fid = (rd[0] || "").toString().trim();
      if (fid) fileIdRowMap[fid] = idx + QA_DATA_START;
    });

    // eventsFileIds נדרש רק ל-E15 — לא נטען שלא לצורך בשלבים אחרים
    const eventsFileIds = (checkCode === "E15") ? _qa_loadEventsFileIds(ss) : {};

    const findings = [];

    for (let i = 0; i < allData.length; i++) {
      const row = i + QA_DATA_START;

      const rowData = allData[i];
      const fileId  = (rowData[0] || "").toString().trim();
      if (!fileId) continue;

      const v = _qa_extractRowVars(rowData);
      let rowFindings = [];

      switch (checkCode) {
        case "E01":       rowFindings = _qa_check_E01(v, row); break;
        case "E02":       rowFindings = _qa_check_E02(v, row); break;
        case "E03":       rowFindings = _qa_check_E03(v, row); break;
        case "E04":       rowFindings = _qa_check_E04(v, row); break;
        case "E05":       rowFindings = _qa_check_E05(v, row); break;
        case "E06":       rowFindings = _qa_check_E06(v, row); break;
        case "E07":       rowFindings = _qa_check_E07(v, row); break;
        case "E08":       rowFindings = _qa_check_E08(v, row); break;
        case "E09":       rowFindings = _qa_check_E09(v, row); break;
        case "E26":       rowFindings = _qa_check_E26(v, row); break;
        case "E10":       rowFindings = _qa_check_E10(v, row); break;
        case "E11-E12":   rowFindings = _qa_check_E11_E12(v, row, allData, fileIdRowMap); break;
        case "E13":       rowFindings = _qa_check_E13(v, row); break;
        case "E14":       rowFindings = _qa_check_E14(v, row); break;
        case "E15":       rowFindings = _qa_check_E15(v, row, eventsFileIds); break;
        case "E16":       rowFindings = _qa_check_E16(v, row); break;
        case "E17-E22":   rowFindings = _qa_check_E17_E22(v, row); break;
        case "E27":       rowFindings = _qa_check_E27(v, row, rowData); break;
        case "E28":       rowFindings = _qa_check_E28(v, row); break;
        case "E32-E25-E31-E30": {
          // [Task 159 — שלב 2] שליפת TXT פעם אחת לשורה, משותפת לשלוש הבדיקות
          const txtContent = v.txtUrl ? _qa_getTxtContent_S11(v.txtUrl) : null;
          rowFindings = []
            .concat(_qa_check_E32(v, row, allData, lastRow, txtContent))
            .concat(_qa_check_E25_E31(v, row, rowData, txtContent))
            .concat(_qa_check_E30(v, row, txtContent));
          break;
        }
        default:          rowFindings = [];
      }

      rowFindings.forEach(function(f) {
        const srcRow = allData[f.row - QA_DATA_START];
        f.fileId = srcRow ? (srcRow[0] || "").toString().trim() : "";
        findings.push(f);
      });
    }

   // [Task 159 — שלב 4] דה-דופ מוקדם ל-E32 בשלב הממוזג — כדי שחלון-הביניים
    // יציג את המספר האמיתי (לאחר דה-דופ), זהה למה שיוצג בדוח הסופי.
    var findingsToReturn = findings;
    if (checkCode === "E32-E25-E31-E30") {
      findingsToReturn = _qa_dedupeE32Findings(findings);
    }
    return { error: false, code: checkCode, findings: findingsToReturn };
  } catch (e) {
    Logger.log("[S11 QA] s11_runSingleCheck(" + checkCode + "): " + e.message);
    return { error: true, msg: e.message, code: checkCode };
  }
}
// ══════════════════════════════════════════════════════════════════
// [שלב A — Task 158, 28/07/2026] מושבתת — קוד מת, לא נקראת משום מקום.
// הבאצ'ים בוטלו: הוכח שהם מחזירים 0 ממצאים בכל הקודים הכבדים (E32,
// E25-E31, E17-E22, E30) למרות נתונים תקינים ואפס שגיאות; סיבת-שורש
// לא אותרה. הדיאלוג חזר לקרוא ל-s11_runSingleCheck (הלא-מחולקת, למעלה)
// באופן ישיר. נשמרת כאן להתייחסות בלבד — לא לחבר מחדש בלי בדיקה חוזרת.
// ══════════════════════════════════════════════════════════════════
/*
function s11_runSingleCheckBatch(checkCode, isSingleRow, activeRow, lastRow, startIdx, batchSize) {
  try {
    Logger.log("[S11 DEBUG] s11_runSingleCheckBatch נקראה | checkCode=" + checkCode +
      " isSingleRow=" + isSingleRow + " activeRow=" + activeRow + " lastRow=" + lastRow +
      " startIdx=" + startIdx + " batchSize=" + batchSize);

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(QA_SHEET_NAME);
    if (!sheet) return { error: true, msg: "גליון '" + QA_SHEET_NAME + "' לא נמצא", code: checkCode, isDone: true };

    Logger.log("[S11 DEBUG] ss.getName()=" + ss.getName() + " ss.getId()=" + ss.getId() +
      " sheet.getName()=" + sheet.getName() + " sheet.getLastRow()=" + sheet.getLastRow());

    const totalCols = 27;
    const allData = sheet.getRange(QA_DATA_START, 1, lastRow - QA_DATA_START + 1, totalCols).getValues();

    Logger.log("[S11 DEBUG] allData.length=" + allData.length +
      " | דוגמת fileId בשורה ראשונה=" + (allData[0] ? allData[0][0] : "אין נתונים"));

    const fileIdRowMap = {};

    const eventsFileIds = (checkCode === "E15") ? _qa_loadEventsFileIds(ss) : {};

    const endIdx   = Math.min(startIdx + batchSize, allData.length);
    const findings = [];

    for (let i = startIdx; i < endIdx; i++) {
      const row = i + QA_DATA_START;
      if (isSingleRow && row !== activeRow) continue;

      const rowData = allData[i];
      const fileId  = (rowData[0] || "").toString().trim();
      if (!fileId) continue;

      const v = _qa_extractRowVars(rowData);
      let rowFindings = [];

      switch (checkCode) {
        case "E01":       rowFindings = _qa_check_E01(v, row); break;
        case "E02":       rowFindings = _qa_check_E02(v, row); break;
        case "E03":       rowFindings = _qa_check_E03(v, row); break;
        case "E04":       rowFindings = _qa_check_E04(v, row); break;
        case "E05":       rowFindings = _qa_check_E05(v, row); break;
        case "E06":       rowFindings = _qa_check_E06(v, row); break;
        case "E07":       rowFindings = _qa_check_E07(v, row); break;
        case "E08":       rowFindings = _qa_check_E08(v, row); break;
        case "E09":       rowFindings = _qa_check_E09(v, row); break;
        case "E26":       rowFindings = _qa_check_E26(v, row); break;
        case "E10":       rowFindings = _qa_check_E10(v, row); break;
        case "E11-E12":   rowFindings = _qa_check_E11_E12(v, row, allData, fileIdRowMap); break;
        case "E32":       rowFindings = _qa_check_E32(v, row, allData, lastRow); break;
        case "E13":       rowFindings = _qa_check_E13(v, row); break;
        case "E14":       rowFindings = _qa_check_E14(v, row); break;
        case "E15":       rowFindings = _qa_check_E15(v, row, eventsFileIds); break;
        case "E16":       rowFindings = _qa_check_E16(v, row); break;
        case "E17-E22":   rowFindings = _qa_check_E17_E22(v, row); break;
        case "E25-E31":   rowFindings = _qa_check_E25_E31(v, row, rowData); break;
        case "E27":       rowFindings = _qa_check_E27(v, row, rowData); break;
        case "E28":       rowFindings = _qa_check_E28(v, row); break;
        case "E30":       rowFindings = _qa_check_E30(v, row); break;
        default:          rowFindings = [];
      }

      rowFindings.forEach(function(f) {
        const srcRow = allData[f.row - QA_DATA_START];
        f.fileId = srcRow ? (srcRow[0] || "").toString().trim() : "";
        findings.push(f);
      });
    }

    Logger.log("[S11 DEBUG] תוצאת באצ' | checkCode=" + checkCode +
      " startIdx=" + startIdx + " endIdx=" + endIdx +
      " findings.length=" + findings.length +
      " isDone=" + (endIdx >= allData.length));

    return {
      error:     false,
      code:      checkCode,
      findings:  findings,
      nextIdx:   endIdx,
      totalRows: allData.length,
      isDone:    endIdx >= allData.length
    };

  } catch (e) {
    Logger.log("[S11 QA] s11_runSingleCheckBatch(" + checkCode + "): " + e.message);
    return { error: true, msg: e.message, code: checkCode, isDone: true };
  }
}
*/

// ══════════════════════════════════════════════════════════════════
// [v1.29.0] שמירת הממצאים המצטברים מהסריקה ההדרגתית ל-QA_STORED_FINDINGS,
// כדי ש-qa_applySelectedFixes ימשיך לעבוד ללא שינוי. נקראת פעם אחת
// בסוף הסריקה (אחרי כל 24 השלבים).
// ══════════════════════════════════════════════════════════════════
function s11_storeFindings(findingsJson) {
  try {
    let findings = JSON.parse(findingsJson);
    // [v1.30.0] דה-דופ E11/E32 (זוגות שנתפסים משני הכיוונים) — הועבר
    // לכאן מ-runQAViewMain הישן. מופעל פעם אחת, על כלל הממצאים המצטברים.
    findings = _qa_dedupeE32Findings(_qa_dedupeE11Findings(findings));
    findings.forEach(function(f, i) { f.origIdx = i; });
    QA_STORED_FINDINGS = findings;
    return { success: true, findings: findings };
  } catch (e) {
    Logger.log("[S11 QA] s11_storeFindings: " + e.message);
    return { success: false, msg: e.message, findings: [] };
  }
}
// ══════════════════════════════════════════════════════════════════
// [v1.3.0] טעינת File_IDs מגליון יומן_אירועים_רפואי
// ══════════════════════════════════════════════════════════════════

function _qa_loadEventsFileIds(ss) {
  try {
    const eventsSheet = ss.getSheetByName(QA_EVENTS_SHEET);
    if (!eventsSheet) return {};

    const lastRow = eventsSheet.getLastRow();
    if (lastRow <= 4) return {}; // שורות 1-4 מוגנות — אין נתונים

    // עמודה G = File_ID בגליון יומן_אירועים_רפואי
    const data    = eventsSheet.getRange(5, 7, lastRow - 4, 1).getValues();
    const fileIds = {};

    if (!data || !data.length) return fileIds;

    data.forEach(function(row) {
      const id = (row[0] || "").toString().trim();
      if (id) fileIds[id] = true;
    });

    Logger.log("[S11 QA] נטענו " + Object.keys(fileIds).length + " File_IDs מ-" + QA_EVENTS_SHEET);
    return fileIds;

  } catch (e) {
    Logger.log("[S11 QA] שגיאה בטעינת יומן אירועים: " + e.message);
    return {};
  }
}

// נקרא מה-HTML בטעינה
function qa_getFindings() {
  return QA_STORED_FINDINGS;
}

// ══════════════════════════════════════════════════════════════════
// [v1.3.0] תיקון באג קריטי — פונקציה אחת בלבד
// הגרסה הקודמת כללה שתי פונקציות qa_applySelectedFixes
// ══════════════════════════════════════════════════════════════════

function qa_applySelectedFixes(findingsJson) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(QA_SHEET_NAME);
  if (!sheet)       return { success: false, appliedCount: 0, totalRequested: 0, msg: "❌ גליון לא נמצא" };
  if (!findingsJson) return { success: false, appliedCount: 0, totalRequested: 0, msg: "❌ לא התקבלו ממצאים לתיקון (findingsJson ריק)" };

  let selectedFindings;
  try {
    selectedFindings = JSON.parse(findingsJson);
  } catch (e) {
    Logger.log("[S11 QA] שגיאת JSON.parse ב-qa_applySelectedFixes: " + e.message);
    return { success: false, appliedCount: 0, totalRequested: 0, msg: "❌ שגיאת פענוח JSON: " + e.message };
  }

  if (!selectedFindings || !selectedFindings.length) {
    Logger.log("[S11 QA] qa_applySelectedFixes קיבלה מערך ריק — 0 ממצאים לתיקון");
    return { success: false, appliedCount: 0, totalRequested: 0, msg: "⚠️ לא נשלח אף ממצא לתיקון (בדוק בחירה)" };
  }

  Logger.log("[S11 QA] קיבלתי " + selectedFindings.length + " ממצאים לתיקון");
  const fixResult     = _qa_applyFixes(sheet, selectedFindings);
  const appliedCount  = fixResult.appliedCount;
  return {
    success: appliedCount === selectedFindings.length,
    appliedCount: appliedCount,
    totalRequested: selectedFindings.length,
    e17Rows: fixResult.e17Rows, // [v1.17.0] בקשת עמוס — מועמדי מחיקה, E17 בלבד
    msg: appliedCount === selectedFindings.length
      ? "✅ תוקנו " + appliedCount + " ממצאים"
      : "⚠️ תוקנו " + appliedCount + " מתוך " + selectedFindings.length + " — בדוק Executions ללוגים"
  };
}
// ══════════════════════════════════════════════════════════════════
// [v1.18.0] בקשת עמוס — פונקציית מחיקה עצמאית לגמרי, מנותקת מ-S08
// חשוב: זו **לא** אותה מחיקה כמו S08 (s08_deleteApproved/s08_delete).
// שם — כפילות/לוגו — הקובץ קיים בפועל ב-Drive וצריך למחוק גם אותו.
// כאן — E17 — המקור ממילא חסר/לא נגיש מ-Drive מלכתחילה (זו ההגדרה של
// E17 עצמו), כך שאין שום קובץ קיים למחוק. הפעולה כאן היא אך ורק מחיקת
// שורת הגליון — ללא שום קריאה ל-DriveApp וללא שום תלות ב-S08_Validate.gs.
// עצמאית לחלוטין — לא קוראת ולא נקראת ע"י שום פונקציה בקובץ אחר.
// בטיחות: לפני מחיקת כל שורה מוודאים מחדש שR שלה עדיין מתחיל ב"מאושר
// למחיקה" (מגן מפני race condition בין האישור לביצוע בפועל).
// הפניות "שורה X" בשורות אחרות שעלולות להתיישן עקב המחיקה (אם קיימות
// כאלה) מזוהות ומתוקנות באופן טבעי בסריקת S11 הבאה (E20/E21 קיימים
// כבר בדיוק לשם כך) — אין צורך בתיקון מיידי כאן.
// ══════════════════════════════════════════════════════════════════

function qa_deleteE17Findings(rowsJson) {
  try {
    if (!rowsJson) return { success: false, msg: "❌ לא התקבלו שורות למחיקה" };
    const rows = JSON.parse(rowsJson);
    if (!rows || !rows.length) return { success: true, msg: "אין שורות למחיקה", deleted: 0 };

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(QA_SHEET_NAME);
    if (!sheet) return { success: false, msg: "❌ גליון '" + QA_SHEET_NAME + "' לא נמצא" };

    // מיון יורד — מחיקה מלמטה למעלה כדי לא לשבש מספרי שורה באמצע הריצה
    const sortedRows = rows.slice().sort(function(a, b) { return b - a; });

    // אותה הגנה כמו בכל מחיקת שורה מרובה בפרויקט — הסרת פילטר פעיל לפני
    const existingFilter = sheet.getFilter();
    if (existingFilter) {
      existingFilter.remove();
      SpreadsheetApp.flush();
    }

    let deletedCount = 0;
    let skippedCount = 0;
    sortedRows.forEach(function(row) {
      try {
        const rVal = (sheet.getRange(row, 18).getValue() || "").toString().trim();
        if (rVal.indexOf("מאושר למחיקה") !== 0) {
          skippedCount++;
          Logger.log("[S11 QA] qa_deleteE17Findings — דילוג שורה " + row + ": R אינו 'מאושר למחיקה' יותר (\"" + rVal + "\")");
          return;
        }
        sheet.deleteRow(row); // שורה בלבד — אין קריאה ל-DriveApp כאן בכלל
        deletedCount++;
        Logger.log("[S11 QA] qa_deleteE17Findings — נמחקה שורה " + row + " (שורה בלבד, ללא Drive, עצמאי לגמרי מ-S08)");
      } catch (rowErr) {
        Logger.log("[S11 QA] qa_deleteE17Findings — שגיאה בשורה " + row + ": " + rowErr.message);
      }
    });

    SpreadsheetApp.flush();

    const skippedNote = skippedCount > 0 ? (" (" + skippedCount + " דולגו — כבר לא מסומנות)") : "";
    return { success: true, msg: "🗑️ נמחקו " + deletedCount + " שורות (ללא Drive)" + skippedNote, deleted: deletedCount, skipped: skippedCount };
  } catch (e) {
    Logger.log("[S11 QA] שגיאת qa_deleteE17Findings: " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// סריקת שורה בודדת
// ══════════════════════════════════════════════════════════════════

function _qa_scanRow(allData, activeRow, lastRow, eventsFileIds, fileIdRowMap, rNotesAll) {
  const i       = activeRow - QA_DATA_START;
  const rowData = allData[i];
  if (!rowData) return [];
  const myNote = (rNotesAll[i] && rNotesAll[i][0]) || "";
  const rowFindings = _qa_checkRow(rowData, activeRow, allData, lastRow, eventsFileIds, fileIdRowMap, myNote);

  // [v1.22.0] תיקון שורש (חקירת עמודה Q) — תיוג fileId על כל ממצא, לפי
  // השורה שאליה הממצא באמת מצביע (f.row) — לא בהכרח activeRow הנוכחית
  // (E11 למשל מצביע על שורת-התאום). allData כבר מכיל את כל הגליון,
  // כך שהשליפה תקינה גם עבור שורת-תאום. משמש את ה-guard ב-_qa_applyFixes.
  rowFindings.forEach(function(f) {
    const srcRow = allData[f.row - QA_DATA_START];
    f.fileId = srcRow ? (srcRow[0] || "").toString().trim() : "";
  });

  return rowFindings;
}

// ══════════════════════════════════════════════════════════════════
// סריקת כל הגליון
// ══════════════════════════════════════════════════════════════════

function _qa_scanAll(allData, lastRow, eventsFileIds, fileIdRowMap, rNotesAll) {
  const findings = [];
  for (let i = 0; i < allData.length; i++) {
    const row     = i + QA_DATA_START;
    const rowData = allData[i];
    if (!rowData[0]) continue; // דלג שורות ריקות (אין File_ID)
    const myNote = (rNotesAll[i] && rNotesAll[i][0]) || "";
    const rowFindings = _qa_checkRow(rowData, row, allData, lastRow, eventsFileIds, fileIdRowMap, myNote);

    // [v1.22.0] תיקון שורש (חקירת עמודה Q) — תיוג fileId על כל ממצא, לפי
    // השורה שאליה הממצא באמת מצביע (f.row) — לא בהכרח row הנוכחית שבלולאה
    // (E11 למשל מצביע על שורת-התאום). allData כבר מכיל את כל הגליון,
    // כך שהשליפה תקינה גם עבור שורת-תאום. משמש את ה-guard ב-_qa_applyFixes.
    rowFindings.forEach(function(f) {
      const srcRow = allData[f.row - QA_DATA_START];
      f.fileId = srcRow ? (srcRow[0] || "").toString().trim() : "";
      findings.push(f);
    });
  }
  return findings;
}

// ══════════════════════════════════════════════════════════════════
// [v1.9.0] Task 102 — דה-דופ ממצאי E11 (חלופה A: מנצח יחיד לכל יעד)
// ══════════════════════════════════════════════════════════════════

function _qa_dedupeE11Findings(findings) {
  // כשכמה שורות מקור שונות (למשל 20/34/52) יוצרות ממצא E11 עבור אותה
  // שורת-יעד (למשל 11) — נשמר רק הראשון שנסרק (מספר השורה הנמוך ביותר,
  // בזכות סדר הסריקה העולה ב-_qa_scanAll). שאר הממצאים לאותו יעד מוסרים,
  // כדי למנוע דריסה שקטה של אחד ע"י השני ב-_qa_applyFixes.
  var seenTargets = {};
  return findings.filter(function(f) {
    if (f.code !== "E11") return true;
    if (seenTargets[f.row]) return false;
    seenTargets[f.row] = true;
    return true;
  });
}

// ══════════════════════════════════════════════════════════════════
// [v1.25.0] Task 149(1) — דה-דופ ממצאי E32 (זוג כפול מזוהה משתי
// הכיוונים — סריקת A מוצאת B, וסריקת B מוצאת A בחזרה — 4 ממצאים
// גולמיים במקום 2). שומר ממצא ראשון בלבד לכל שורת-יעד, אותו עיקרון
// בדיוק כמו _qa_dedupeE11Findings.
// ══════════════════════════════════════════════════════════════════

function _qa_dedupeE32Findings(findings) {
  var seenRows32 = {};
  return findings.filter(function(f) {
    if (f.code !== "E32") return true;
    if (seenRows32[f.row]) return false;
    seenRows32[f.row] = true;
    return true;
  });
}

// ══════════════════════════════════════════════════════════════════
// בדיקת שורה אחת — מחזיר מערך ממצאים
// ══════════════════════════════════════════════════════════════════

// [v1.30.0] חילוץ כל שדות השורה במקום אחד — משותף לכל 22 פונקציות
// הבדיקה. זהה לחלוטין לחילוץ שהיה בתחילת _qa_checkRow המקורי.
function _qa_extractRowVars(rowData) {
  return {
    fileId: (rowData[0]  || "").toString().trim(),  // A=1
    l:      (rowData[11] || "").toString().trim(),  // L=12
    m:      (rowData[12] || "").toString().trim(),  // M=13
    n:      (rowData[13] || "").toString().trim(),  // N=14
    o:      (rowData[14] || "").toString().trim(),  // O=15
    q:      (rowData[16] || "").toString().trim(),  // Q=17
    r:      (rowData[17] || "").toString().trim(),  // R=18
    s:      (rowData[18] || "").toString().trim(),  // S=19
    t:      (rowData[19] || "").toString().trim(),  // T=20
    u:      (rowData[20] || "").toString().trim(),  // U=21
    txtUrl: (rowData[23] || "").toString().trim(),  // X=24
    col27:  (rowData[26] || "").toString().trim()   // AA=27
  };
}

function _qa_check_E01(v, row) {
  const findings = [];
  if (!v.m && v.o) {
    findings.push({ row: row, code: "E01", col: 13, desc: "M ריק למרות שO=" + v.o, fix: "write", value: "ממתין להמרה ל-TXT" });
  }
  return findings;
}

function _qa_check_E02(v, row) {
  const findings = [];
  if (v.m === "ממתין להמרה ל-TXT" && v.txtUrl) {
    findings.push({ row: row, code: "E02", col: 13, desc: "M=ממתין אך X קיים", fix: "write", value: "הומר ל-TXT" });
  }
  return findings;
}

function _qa_check_E03(v, row) {
  const findings = [];
  if (v.m && QA_VALID_M.indexOf(v.m) === -1) {
    findings.push({ row: row, code: "E03", col: 13, desc: "M='" + v.m + "' — ערך לא חוקי", fix: "flag", value: "⚠️ ערך M לא חוקי: " + v.m });
  }
  return findings;
}

function _qa_check_E04(v, row) {
  const findings = [];
  if (v.m === "הומר ל-TXT" && v.s) {
    findings.push({ row: row, code: "E04", col: 19, desc: "M=הומר + S='" + v.s + "' — שגיאה ישנה", fix: "clear_st" });
  }
  return findings;
}

function _qa_check_E05(v, row) {
  const findings = [];
  if (v.m === "עבר סיווג" && v.s) {
    findings.push({ row: row, code: "E05", col: 19, desc: "M=עבר סיווג + S='" + v.s + "' — שגיאה ישנה", fix: "clear_st" });
  }
  return findings;
}

function _qa_check_E06(v, row) {
  const findings = [];
  if (v.m === "מאושר" && v.s) {
    findings.push({ row: row, code: "E06", col: 19, desc: "M=מאושר + S='" + v.s + "' — שגיאה ישנה", fix: "clear_st" });
  }
  return findings;
}

function _qa_check_E07(v, row) {
  const findings = [];
  if (v.m === "עבר סיווג" && !v.n) {
    findings.push({ row: row, code: "E07", col: 14, desc: "M=עבר סיווג + N ריק", fix: "write", value: "חולץ מלא" });
  }
  return findings;
}

function _qa_check_E08(v, row) {
  const findings = [];
  if (v.n && QA_VALID_N.indexOf(v.n) === -1) {
    findings.push({ row: row, code: "E08", col: 14, desc: "N='" + v.n + "' — ערך לא חוקי", fix: "flag", value: "⚠️ ערך N לא חוקי: " + v.n });
  }
  return findings;
}

function _qa_check_E09(v, row) {
  const findings = [];
  if (v.q && QA_VALID_Q.indexOf(v.q) === -1) {
    findings.push({ row: row, code: "E09", col: 17, desc: "Q='" + v.q + "' — ערך לא חוקי", fix: "flag", value: "⚠️ ערך Q לא חוקי: " + v.q });
  }
  return findings;
}
function _qa_check_E26(v, row) {
  const findings = [];
  // [Task 161 — שלב 2] לא מציעים תרגום אם M='ממתין להמרה ל-TXT' — Q
  // במצב הזה הוא "פסולת" שתנוקה ע"י E10 בין כה, ואין טעם לתרגם ערך
  // שעומד להימחק. מונע קונפליקט 2 fix-ים סותרים על אותו תא (E26 מול E10).
  if (v.q && QA_COMPLEXITY_EN_TO_HE.hasOwnProperty(v.q) && v.m !== "ממתין להמרה ל-TXT") {
    findings.push({ row: row, code: "E26", col: 17, desc: "Q='" + v.q + "' (אנגלית) — מתורגם ל-'" + QA_COMPLEXITY_EN_TO_HE[v.q] + "'", fix: "write", value: QA_COMPLEXITY_EN_TO_HE[v.q] });
  }
  return findings;
}

function _qa_check_E10(v, row) {
  const findings = [];
  if (v.q && v.m === "ממתין להמרה ל-TXT") {
    findings.push({ row: row, code: "E10", col: 17, desc: "Q קיים לפני S06 (M=ממתין)", fix: "clear", value: "" });
  }
  return findings;
}

function _qa_check_E11_E12(v, row, allData, fileIdRowMap) {
  const findings = [];
  if (v.r && (v.r.indexOf("כפול מאושר") === 0 || v.r.indexOf("חשוד ככפול") === 0)) {
    if (!v.col27) {
      findings.push({ row: row, code: "E12", col: 18, desc: "R מסומן ככפול אך עמודה 27 ריקה — אין רפרנס לשחזר ממנו", fix: "clear", value: "" });
    } else {
      const actualRow = fileIdRowMap[v.col27];
      if (!actualRow) {
        findings.push({ row: row, code: "E12", col: 18, desc: "עמודה 27 מצביעה על File_ID שלא קיים יותר בגליון — יש לנקות R ועמודה 27", fix: "clear", value: "" });
      } else {
        const targetIdx   = actualRow - QA_DATA_START;
        const targetR     = (allData[targetIdx][17] || "").toString().trim();
        const targetCol27 = (allData[targetIdx][26] || "").toString().trim();
        if (!targetR || targetCol27 !== v.fileId) {
          findings.push({ row: actualRow, code: "E11", col: 18, desc: "שורה " + actualRow + " חסרה הפניה חזרה (R ו/או עמודה 27) לשורה " + row, fix: "write_symmetry", value: v.r, col27Value: v.fileId });
        }
      }
    }
  }
  return findings;
}

function _qa_check_E32(v, row, allData, lastRow, txtContent) {
  const findings = [];
  if (v.fileId && !v.r && v.n && v.txtUrl) {
    const dup32 = _qa_calculateDuplicates_E32(row, allData, lastRow, txtContent);
    if (dup32) {
      const dupText32 = "כפול מאושר (רשת שנייה) | ניקוד " + dup32.score + "/5";
      // [Task 161 — שלב 3] מוטציה בפועל של v.r (לא רק fix מוצע) — כדי
      // ש-_qa_check_E25_E31, שרצה מיד אחרי E32 באותה קריאה עם אותו v
      // (חלק מהשלב הממוזג E32-E25-E31-E30), תראה שהשורה כבר סומנה
      // ותדלג עליה (guard קיים שם: !v.r). חוסך קריאת Drive מיותרת על
      // שורה שכבר עומדת להיות מסומנת ככפולה. נוגע רק ב-v של השורה
      // הנוכחית — לא ב-v של שורת ה-dup32 (זו שורה אחרת, תטופל בסריקה הבאה).
      v.r = dupText32;
      findings.push({ row: row, code: "E32", col: 18, desc: "זוהתה כפילות מול שורה " + dup32.row + " (ניקוד " + dup32.score + "/5) — R היה ריק, לא נתפס ע\"י S07", fix: "write_symmetry", value: dupText32, col27Value: dup32.fileId });
      findings.push({ row: dup32.row, code: "E32", col: 18, desc: "זוהתה כפילות מול שורה " + row + " (ניקוד " + dup32.score + "/5) — נמצא ע\"י רשת ביטחון S11", fix: "write_symmetry", value: dupText32, col27Value: v.fileId });
    }
  }
  return findings;
}

function _qa_check_E13(v, row) {
  const findings = [];
  if (v.u === "✅ אושר ידנית" && v.m !== "מאושר" && v.m !== "אומת ידנית") {
    findings.push({ row: row, code: "E13", col: 21, desc: "U=אושר ידנית + M='" + v.m + "' — אי-עקביות", fix: "flag", value: "⚠️ U=אושר אך M≠מאושר" });
  }
  return findings;
}

function _qa_check_E14(v, row) {
  const findings = [];
  if (v.l && QA_VALID_L.indexOf(v.l) === -1) {
    findings.push({ row: row, code: "E14", col: 12, desc: "L='" + v.l + "' — ערך לא חוקי (צפוי: רפואי/חשבונאי/משפטי/ביטוחי/אחר)", fix: "write", value: v.l.replace("מסמך ", "") });
  }
  return findings;
}

function _qa_check_E15(v, row, eventsFileIds) {
  const findings = [];
  if ((v.m === "חולץ לגליונות" || v.m === "חולץ ליומן אירועים") && v.fileId && eventsFileIds && !eventsFileIds[v.fileId]) {
    findings.push({ row: row, code: "E15", col: 21, desc: "M=חולץ לגליונות אך File_ID לא נמצא ב-" + QA_EVENTS_SHEET, fix: "clear_u", value: "" });
  }
  return findings;
}

function _qa_check_E16(v, row) {
  const findings = [];
  if (v.fileId.indexOf("OCR_") === 0) {
    let driveState = "";
    try {
      DriveApp.getFileById(v.fileId);
      driveState = "(הקובץ עדיין קיים ב-Drive)";
    } catch (e) {
      driveState = "(הקובץ לא נגיש/נמחק ב-Drive)";
    }
    findings.push({ row: row, code: "E16", col: 18, desc: "File_ID מתחיל ב-'OCR_' — שורת ארכיון ישנה " + driveState, fix: "write", value: "מאושר למחיקה — ארכיון OCR ישן" });
  }
  return findings;
}

function _qa_check_E17_E22(v, row) {
  const findings = [];
  if (v.fileId) {
    try {
      DriveApp.getFileById(v.fileId);
    } catch (e) {
      const shortId = v.fileId.length > 10 ? (v.fileId.substring(0, 6) + "..." + v.fileId.substring(v.fileId.length - 4)) : v.fileId;
      const isUnrecoverable = (v.m === "ממתין להמרה ל-TXT") && !v.txtUrl;

      if (isUnrecoverable) {
        findings.push({ row: row, code: "E22", col: 18, desc: "מקור חסר לצמיתות מ-Drive (" + shortId + ") + אין TXT — אין עותק נתונים באף שלב, אומת ידנית ב-Task 101", fix: "write", value: "מאושר למחיקה — מקור אבד לצמיתות" });
      } else {
        const isRecurringE17 = v.u.indexOf("מקור חסר (Drive)") !== -1;
        if (isRecurringE17) {
          findings.push({ row: row, code: "E17", col: 18, desc: "מקור חסר/לא נגיש — File_ID אינו זמין ב-Drive (" + shortId + ") — חוזר בסריקה נוספת, אינה תקלה חד-פעמית", fix: "write", value: "מאושר למחיקה — מקור אבד לצמיתות (E17 חוזר)" });
        } else {
          findings.push({ row: row, code: "E17", col: 21, desc: "מקור חסר/לא נגיש — File_ID אינו זמין ב-Drive (" + shortId + ")", fix: "flag", value: "⚠️ מקור חסר (Drive)" });
        }
      }
    }
  }
  return findings;
}

function _qa_check_E25_E31(v, row, rowData, txtContent) {
  const findings = [];
  const isLegacyLogoFlag = (v.r === "חשוד כלוגו/ריק");

  if (v.fileId && !v.r && v.n) {
    const sizeStrNew   = (rowData[15] || "").toString();
    const sizeBytesNew = _qa_parseFileSizeToBytes(sizeStrNew);
    const docTitleNew  = (rowData[8]  || "").toString().trim();
    const docIssuerNew = (rowData[9]  || "").toString().trim();
    const vDismissNew  = (rowData[21] || "").toString().trim();
    const wordCountNew = _qa_fetchTxtWordCount_E25(txtContent);

    if (wordCountNew === null) {
      if (vDismissNew.indexOf("(לוגו/ריק)") === -1) {
        findings.push({ row: row, code: "E25", col: 21, desc: "לא נמצא TXT לבדיקה (כשל שליפה), נדרשת בדיקה ידנית", fix: "flag", value: "⚠️ E25 — לא ניתן לאמת (TXT לא נשלף)" });
      }
    } else if (wordCountNew === 0 && sizeBytesNew !== null && sizeBytesNew >= 10 * 1024) {
      if (vDismissNew.indexOf("(טקסט פגום)") === -1) {
        findings.push({ row: row, code: "E31", col: 21, desc: "TXT נשלף אך 0 מילים בפועל, גודל " + sizeStrNew + " (לא קטן) — חשד לכשל המרה, לא לוגו/ריק", fix: "flag", value: "⚠️ E31 — חשד לכשל המרה (0 מילים, קובץ לא קטן) — מומלץ להריץ מחדש S06+S07" });
      }
    } else if (wordCountNew < 20 || docTitleNew === "לא זוהה" || docIssuerNew === "לא זוהה") {
      if (vDismissNew.indexOf("(לוגו/ריק)") === -1) {
        var reasonParts164 = [];
        if (wordCountNew < 20)          reasonParts164.push(wordCountNew + " מילים בפועל (<20)");
        if (docTitleNew === "לא זוהה")  reasonParts164.push("כותרת לא זוהתה");
        if (docIssuerNew === "לא זוהה") reasonParts164.push("מנפיק לא זוהה");
        var reasonText164 = reasonParts164.join(" + ");
        findings.push({ row: row, code: "E25", col: 21, desc: reasonText164 + " — חשד לוגו/ריק, נדרש אישור ידני", fix: "flag", value: "⚠️ E25 — חשד לוגו/ריק (" + reasonText164 + ") — נדרש אישור ידני למחיקה" });
      }
    }
  }

  if (v.fileId && isLegacyLogoFlag) {
    const vDismissLeg = (rowData[21] || "").toString().trim();
    if (vDismissLeg.indexOf("(לוגו/ריק)") === -1) {
      const docTitleLeg  = (rowData[8] || "").toString().trim();
      const docIssuerLeg = (rowData[9] || "").toString().trim();
      const wordCountLeg = _qa_fetchTxtWordCount_E25(txtContent);
      if (wordCountLeg === null) {
        findings.push({ row: row, code: "E25", col: 18, desc: "דגל ישן 'חשוד כלוגו/ריק' — לא נמצא TXT לבדיקה (כשל שליפה), לא ניתן לאמת/לנקות אוטומטית", fix: "flag", value: "⚠️ E25 — דגל ישן, לא ניתן לאמת (TXT לא נשלף)" });
      } else if (wordCountLeg >= 20 && docTitleLeg !== "לא זוהה" && docIssuerLeg !== "לא זוהה") {
        findings.push({ row: row, code: "E25", col: 18, desc: wordCountLeg + " מילים בפועל (≥20) + I/J תקינים — חשד נשלל, מנקה דגל ישן", fix: "clear", value: "" });
      } else {
        findings.push({ row: row, code: "E25", col: 21, desc: wordCountLeg + " מילים בפועל (<20) או I/J לא תקינים — דגל ישן, נדרש אישור ידני", fix: "flag", value: "⚠️ E25 — דגל ישן, נדרש אישור ידני למחיקה (" + wordCountLeg + " מילים)" });
      }
    }
  }

  return findings;
}

function _qa_check_E27(v, row, rowData) {
  const findings = [];
  const docTitleE27 = (rowData[8] || "").toString().trim();
  if (v.fileId && v.m === "הומר ל-TXT" && docTitleE27 && (v.n === "חולץ מלא" || v.n === "חולץ חלקי")) {
    findings.push({ row: row, code: "E27", col: 13, desc: "Doc_Title מלא + Extraction_Status='" + v.n + "' (S07 הושלם) אך Pipeline_Status עדיין 'הומר ל-TXT'", fix: "write", value: "עבר סיווג" });
  }
  return findings;
}
function _qa_check_E28(v, row) {
  const findings = [];
  if (v.fileId && v.m === "מחולץ") {
    findings.push({ row: row, code: "E28", col: 13, desc: "M='מחולץ' — ערך ישן, הוחלף ל'עבר סיווג' (שינוי סמנטי בכל השירותים)", fix: "write", value: "עבר סיווג" });
  }
  return findings;
}

function _qa_check_E30(v, row, txtContent) {
  const findings = [];
  if (v.fileId && v.txtUrl) {
    const txtComplexity30 = _qa_fetchTxtComplexity_E30(txtContent);
    // [Task 161 — שלב 1] השוואה עצמאית: אם Q עדיין באנגלית (E26 טרם
    // תיקנה בפועל בגליון, או שהודלגה בזמן הריצה) — מתרגמים כאן זמנית
    // רק לצורך ההשוואה. לא נוגעים ב-v.q המקורי ולא כותבים דבר. מונע
    // דיווח E30 שגוי כתלות בסדר/בבחירת "דלג" מול E26 בזמן אמת.
    const qForCompare30 = QA_COMPLEXITY_EN_TO_HE[v.q] || v.q;
    if (txtComplexity30 && txtComplexity30 !== qForCompare30) {
      findings.push({ row: row, code: "E30", col: 17, desc: "Q='" + (v.q || "ריק") + "' לא תואם ל'מורכבות:' בכותרת ה-TXT ('" + txtComplexity30 + "') — מתקן לפי הקובץ", fix: "write", value: txtComplexity30 });
    }
  }
  return findings;
}
 

function _qa_checkRow(rowData, row, allData, lastRow, eventsFileIds, fileIdRowMap, myNote) {
  const fileId = (rowData[0] || "").toString().trim();
  if (!fileId) return [];

  const v = _qa_extractRowVars(rowData);
  let findings = [];

  // [Task 159(1)] Row-level cache — תוכן ה-TXT של השורה הנוכחית נשלף
  // פעם אחת בלבד כאן, ומועבר ל-E25/E31, E30 ו-E32 (חלק השורה העצמית).
  // 3 קריאות Drive → 1 עבור אותה שורה. אינו נוגע בקריאות מועמדים
  // אחרים בתוך E32 — מחוץ להיקף במפורש.
  const txtContent = v.txtUrl ? _qa_getTxtContent_S11(v.txtUrl) : null;

  findings = findings.concat(_qa_check_E01(v, row));
  findings = findings.concat(_qa_check_E02(v, row));
  findings = findings.concat(_qa_check_E03(v, row));
  findings = findings.concat(_qa_check_E04(v, row));
  findings = findings.concat(_qa_check_E05(v, row));
  findings = findings.concat(_qa_check_E06(v, row));
  findings = findings.concat(_qa_check_E07(v, row));
  findings = findings.concat(_qa_check_E08(v, row));
  findings = findings.concat(_qa_check_E09(v, row));
  findings = findings.concat(_qa_check_E26(v, row));
  findings = findings.concat(_qa_check_E10(v, row));
  findings = findings.concat(_qa_check_E11_E12(v, row, allData, fileIdRowMap));
  findings = findings.concat(_qa_check_E32(v, row, allData, lastRow, txtContent));
  findings = findings.concat(_qa_check_E13(v, row));
  findings = findings.concat(_qa_check_E14(v, row));
  findings = findings.concat(_qa_check_E15(v, row, eventsFileIds));
  findings = findings.concat(_qa_check_E16(v, row));
  findings = findings.concat(_qa_check_E17_E22(v, row));
  findings = findings.concat(_qa_check_E25_E31(v, row, rowData, txtContent));
  findings = findings.concat(_qa_check_E27(v, row, rowData));
  findings = findings.concat(_qa_check_E28(v, row));
  findings = findings.concat(_qa_check_E30(v, row, txtContent));
  return findings;
}
 
// ══════════════════════════════════════════════════════════════════
// [v1.23.0] תיקון שורש דחוף — פענוח גודל קובץ מודע-יחידות (KB/MB/GB)
// ══════════════════════════════════════════════════════════════════

/**
 * ממירה מחרוזת גודל קובץ (למשל "92 KB" או "1.89 MB") לבייטים.
 * מחליפה regex עיוור-ליחידות שהתעלם מ-KB מול MB (ראה @changes v1.23.0) —
 * "1.89 MB" היה נפרש כ-1.89 כאילו זה KB, ונופל בטעות מתחת לסף "<10KB".
 * @param {string} sizeStr - תוכן עמודה P (File_Size), למשל "45 KB"/"1.2 MB".
 * @returns {number|null} גודל בבייטים, או null אם לא ניתן לפענח (אין יחידה
 *          מזוהה — עדיף להחזיר null ולא לנחש, לפי COLUMN_MAP הפורמט תמיד
 *          "XX KB|XX MB").
 */
function _qa_parseFileSizeToBytes(sizeStr) {
  if (!sizeStr) return null;
  var str   = sizeStr.toString().trim();
  var match = str.match(/(\d+(?:\.\d+)?)\s*(KB|MB|GB)/i);
  if (!match) return null;

  var num        = parseFloat(match[1]);
  var unit       = match[2].toUpperCase();
  var multiplier = unit === "GB" ? 1024 * 1024 * 1024 :
                   unit === "MB" ? 1024 * 1024 :
                   1024; // KB

  return num * multiplier;
}

// ══════════════════════════════════════════════════════════════════
// [v1.9.0] Task 113 — שליפת מספר מילים מתוך תוכן קובץ ה-TXT
// אותה שיטת שליפה כמו s08_fetchTxtContent (S08_Validate.gs), לעקביות
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// [v1.36.0] Task 159(1) — Row-level cache: פונקציה משותפת אחת ששולפת
// את תוכן קובץ ה-TXT מ-Drive (במקום שכל אחת מ-E25/E30/E32 תעשה זאת
// בנפרד). נקראת פעם אחת בלבד ב-_qa_checkRow לכל שורה, והתוכן מועבר
// כפרמטר. אינה נוגעת בקריאת TXT של מועמדים אחרים בתוך E32 — מחוץ
// להיקף במפורש (Task 159, סיכון מינימלי עדיף על חיסכון מלא).
// ══════════════════════════════════════════════════════════════════
function _qa_getTxtContent_S11(txtUrl) {
  try {
    if (!txtUrl) return null;

    var fileId = null;
    var m1 = txtUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) fileId = m1[1];
    var m2 = txtUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (m2) fileId = m2[1];
    if (!fileId) return null;

    return DriveApp.getFileById(fileId).getBlob().getDataAsString("UTF-8");

  } catch (e) {
    Logger.log("[S11 QA] שגיאה בשליפת תוכן TXT (row-level cache): " + e.message);
    return null;
  }
}

function _qa_fetchTxtWordCount_E25(content) {
  try {
    if (!content) return null;
    var match = content.match(/מספר_מילים:\s*(\d+)/);
    return match ? parseInt(match[1], 10) : null;

  } catch (e) {
    Logger.log("[S11 QA] E25 — שגיאה בעיבוד תוכן TXT: " + e.message);
    return null;
  }
}
// ══════════════════════════════════════════════════════════════════
// [v1.24.0] תיקון שורש — שליפת "מורכבות:" מכותרת קובץ ה-TXT (עוגן S06)
// אותה שיטת שליפה כמו _qa_fetchTxtWordCount_E25, לעקביות
// ══════════════════════════════════════════════════════════════════

function _qa_fetchTxtComplexity_E30(content) {
  try {
    if (!content) return null;
    var match = content.match(/מורכבות:\s*(\S+)/);
    return match ? match[1].trim() : null;

  } catch (e) {
    Logger.log("[S11 QA] E30 — שגיאה בעיבוד תוכן TXT: " + e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// [v1.25.0] Task 149(1) — E32: שליפת כותרת TXT מלאה + חישוב כפילות
// עצמאי ב-S11, זהה לחלוטין ל-_calculateDuplicates_S07 (S07_Classify.gs)
// מבחינת אלגוריתם וסף — קוד עצמאי, לא שיתוף קובץ בין S07 ל-S11.
// ══════════════════════════════════════════════════════════════════
function _qa_fetchTxtHeader_E32(content) {
  try {
    if (!content) return {};

    var result  = {};
    var lines   = content.split(/\r?\n/).slice(0, 6);

    // [v1.28.0] Task 153 — עצירה לפני תווית שדה ידועה הבאה באותה שורה
    // (או סוף השורה), במקום הסתמכות על "\s{2,}". אומת מול קובץ אמיתי
    // (שורה 73): כשכותרת ארוכה, אין שום רווח לפני תווית השדה הבא —
    // "\s{2,}" לא נמצא לעולם, וה-".+?" הישן היה בולע את התווית הבאה
    // כולה לתוך הערך. הרשימה כוללת את כל 4 התוויות שעשויות להופיע
    // כ"שדה שני" באותה שורה בפורמט הכותרת הנוכחי.
    var NEXT_LABEL = "(?:סוג_מקור:|מספר_מילים:|מורכבות:|גודל_מקור:|$)";

    lines.forEach(function(line) {
      var titleMatch = line.match(new RegExp("^כותרת:\\s*(.+?)\\s*" + NEXT_LABEL));
      if (titleMatch) result.title = titleMatch[1].trim();

      var issuerMatch = line.match(new RegExp("^מנפיק:\\s*(.+?)\\s*" + NEXT_LABEL));
      if (issuerMatch) result.issuer = issuerMatch[1].trim();

      var dateMatch = line.match(/^תאריך_מסמך:\s*(\S+)/);
      if (dateMatch) result.date = dateMatch[1].trim();

      var sizeMatch = line.match(/גודל_מקור:\s*(\S+\s*\S*)/);
      if (sizeMatch) result.size = sizeMatch[1].trim();

      var wordsMatch = line.match(/מספר_מילים:\s*(\d+)/);
      if (wordsMatch) result.words = parseInt(wordsMatch[1], 10);
    });

    return result;

  } catch (e) {
    Logger.log("[S11 QA] E32 — שגיאה בשליפת כותרת TXT לזיהוי כפילות: " + e.message);
    return {};
  }
}

function _qa_calculateDuplicates_E32(currentRow, allData, lastRow, txtContent) {
  var MAX_ROWS   = 500;
  var scanLimit  = Math.min(lastRow, QA_DATA_START + MAX_ROWS - 1);
  var currentIdx = currentRow - QA_DATA_START;
  var currentRowData = allData[currentIdx];
  if (!currentRowData) return null;

  // [v1.35.0] Task 158 — DEBUG זמני ממוקד: לוג רק עבור שורות הכפילות
  // הידועות (סיכום ביקור, 8 מול 23/30) כדי לאתר איפה בדיוק הזיהוי נשבר.
  var DEBUG_ROWS_35 = [7, 8, 23, 24, 30, 61];
  var isDebugRow35  = DEBUG_ROWS_35.indexOf(currentRow) !== -1;

  // [v1.26.0] Task 155(א) — אם השורה הנוכחית סומנה ידנית "לא רלוונטי
  // (כפול)" (V, עמודה 22) — לא בודקים כלל. מונע לולאת-דגל-חוזר.
  var currentDismiss32 = (currentRowData[21] || "").toString().trim(); // V
  if (currentDismiss32.indexOf("(כפול)") !== -1) return null;

  var currentTxtUrl = (currentRowData[23] || "").toString().trim(); // X
  if (!currentTxtUrl) return null;

  // [Task 159(1)] שימוש בתוכן שכבר נשלף פעם אחת ב-_qa_checkRow —
  // לא קריאה חדשה ל-Drive עבור השורה הנוכחית עצמה.
  var currentMeta = _qa_fetchTxtHeader_E32(txtContent);
  if (isDebugRow35) {
    Logger.log("[S11 DEBUG E32] שורה " + currentRow + " | currentMeta=" + JSON.stringify(currentMeta));
  }

  if (!currentMeta.title && !currentMeta.issuer && !currentMeta.date) return null;

  // [v1.27.0] Task 152 — סינון "לא זוהה": אם כל 3 שדות = "לא זוהה"
  // → metadata לא זוהה לגמרי, אל תשווה כלל (מונע false positive)
  var isCurrentUndetected = (
    (currentMeta.title === "לא זוהה" || !currentMeta.title) &&
    (currentMeta.issuer === "לא זוהה" || !currentMeta.issuer) &&
    (currentMeta.date === "לא" || currentMeta.date === "לא זוהה" || !currentMeta.date)
  );
  if (isCurrentUndetected) return null;

  // [v1.28.0] Task 153 — עמודות הגליון של השורה הנוכחית עצמה (I/J/K),
  // לשימוש בסינון המהיר (quickScore) בלבד — כדי שההשוואה תהיה עקבית
  // מבחינת מקור הנתונים מול rowTitle/Issuer/Date של המועמד (שגם הם
  // מגיעים מעמודות הגליון, לא מכותרת ה-TXT). לפני התיקון, quickScore
  // השווה כותרת-TXT (currentMeta) מול עמודות-גליון (rowTitle וכו') —
  // שני מקורות נתונים שונים לחלוטין. השוואת ה-score הסופית (למטה)
  // ממשיכה להשתמש בכותרת TXT מול כותרת TXT של שני הצדדים, ללא שינוי.
  var currentSheetTitle  = (currentRowData[8]  || "").toString().trim(); // I
  var currentSheetIssuer = (currentRowData[9]  || "").toString().trim(); // J
  var currentSheetDate   = (currentRowData[10] || "").toString().trim(); // K

  if (isDebugRow35) {
    Logger.log("[S11 DEBUG E32] שורה " + currentRow + " | sheetTitle=" + currentSheetTitle +
      " | sheetIssuer=" + currentSheetIssuer + " | sheetDate=" + currentSheetDate);
  }

  var candidates = [];
  for (var idx = 0; idx < allData.length; idx++) {
    var candRow = idx + QA_DATA_START;
    if (candRow === currentRow || candRow > scanLimit) continue;

    var rd = allData[idx];
    var rowFileId = (rd[0] || "").toString().trim();
    if (!rowFileId) continue;

    var rowTxtUrl = (rd[23] || "").toString().trim(); // X
    if (!rowTxtUrl) continue;

    var rowCol27 = (rd[26] || "").toString().trim(); // AA
    if (rowCol27) continue; // כבר משויך — רשת שנייה לא דורסת שיוך קיים

    // [v1.26.0] Task 155(א) — מדלג על מועמד שסומן ידנית "לא רלוונטי (כפול)"
    var rowDismiss32 = (rd[21] || "").toString().trim(); // V
    if (rowDismiss32.indexOf("(כפול)") !== -1) continue;

    var rowTitle  = (rd[8]  || "").toString().trim(); // I
    var rowIssuer = (rd[9]  || "").toString().trim(); // J
    var rowDate   = (rd[10] || "").toString().trim(); // K

    // [v1.28.0] Task 153 — quickScore כעת עקבי: עמודות-גליון (נוכחי) מול
    // עמודות-גליון (מועמד), במקום כותרת-TXT (נוכחי) מול עמודות-גליון (מועמד).
    var quickScore = 0;
    if (currentSheetTitle && rowTitle) {
      var a1 = currentSheetTitle.toLowerCase();
      var b1 = rowTitle.toLowerCase();
      if (a1.indexOf(b1) !== -1 || b1.indexOf(a1) !== -1) quickScore++;
    }
    if (currentSheetIssuer && rowIssuer &&
        currentSheetIssuer.toLowerCase() === rowIssuer.toLowerCase()) {
      quickScore++;
    }
    if (currentSheetDate && rowDate && currentSheetDate === rowDate) quickScore++;

    if (isDebugRow35 && DEBUG_ROWS_35.indexOf(candRow) !== -1) {
      Logger.log("[S11 DEBUG E32] שורה " + currentRow + " מול מועמד " + candRow +
        " | rowTitle=" + rowTitle + " | rowIssuer=" + rowIssuer + " | rowDate=" + rowDate +
        " | quickScore=" + quickScore);
    }

    if (quickScore >= 2) {
      candidates.push({ row: candRow, fileId: rowFileId, txtUrl: rowTxtUrl });
    }
  }

  if (isDebugRow35) {
    Logger.log("[S11 DEBUG E32] שורה " + currentRow + " | candidates.length=" + candidates.length +
      " | rows=" + JSON.stringify(candidates.map(function(c){ return c.row; })));
  }

  if (candidates.length === 0) return null;

  for (var c = 0; c < candidates.length; c++) {
    var cand = candidates[c];
    var otherContent = _qa_getTxtContent_S11(cand.txtUrl);
    var otherMeta = _qa_fetchTxtHeader_E32(otherContent);
    if (!otherMeta.title && !otherMeta.issuer) continue;

    // [v1.27.0] Task 152 — סינון "לא זוהה": דלג אם המועמד גם לא זוהה לגמרי
    var isOtherUndetected = (
      (otherMeta.title === "לא זוהה" || !otherMeta.title) &&
      (otherMeta.issuer === "לא זוהה" || !otherMeta.issuer) &&
      (otherMeta.date === "לא" || otherMeta.date === "לא זוהה" || !otherMeta.date)
    );
    if (isOtherUndetected) continue;

    var score = 0;
    if (currentMeta.title && otherMeta.title) {
      var a2 = currentMeta.title.toLowerCase();
      var b2 = otherMeta.title.toLowerCase();
      if (a2.indexOf(b2) !== -1 || b2.indexOf(a2) !== -1) score++;
    }
    if (currentMeta.issuer && otherMeta.issuer &&
        currentMeta.issuer.toLowerCase() === otherMeta.issuer.toLowerCase()) {
      score++;
    }
    if (currentMeta.date && otherMeta.date && currentMeta.date === otherMeta.date) score++;
    if (currentMeta.size && otherMeta.size && currentMeta.size === otherMeta.size) score++;
    if (currentMeta.words && otherMeta.words) {
      var diff = Math.abs(currentMeta.words - otherMeta.words);
      var pct  = diff / Math.max(currentMeta.words, otherMeta.words);
      if (pct <= 0.10) score++;
    }

    if (isDebugRow35) {
      Logger.log("[S11 DEBUG E32] שורה " + currentRow + " מול מועמד " + cand.row +
        " | otherMeta=" + JSON.stringify(otherMeta) + " | score=" + score);
    }

    if (score >= 3) {
      return { row: cand.row, fileId: cand.fileId, score: score };
    }
  }

  return null;
}

// ══════════════════════════════════════════════════════════════════
// בניית טקסט ה-dialog
// ══════════════════════════════════════════════════════════════════

function _qa_buildSummary(findings) {
  const MAX_DISPLAY = 10;
  let lines = [];

  const displayed = findings.slice(0, MAX_DISPLAY);
  displayed.forEach(function(f) {
    const fixLabel =
      f.fix === "write"      ? "→ תיקון אוטומטי" :
      f.fix === "clear"      ? "→ ניקוי עמודה"   :
      f.fix === "clear_st"   ? "→ ניקוי S+T"      :
      f.fix === "flag"       ? "→ דגל U"          :
      f.fix === "clear_u"    ? "→ ניקוי U"        :
      f.fix === "set_note"   ? "→ עדכון Note"     :
      f.fix === "delete_row" ? "→ מחיקת שורה"     : "";
    lines.push("שורה " + f.row + " | " + f.code + " | " + f.desc + " " + fixLabel);
  });

  if (findings.length > MAX_DISPLAY) {
    lines.push("... ועוד " + (findings.length - MAX_DISPLAY) + " ממצאים נוספים");
  }

  return lines.join("\n");
}

// ══════════════════════════════════════════════════════════════════
// בדיקת עמודה לפני כתיבה
// ══════════════════════════════════════════════════════════════════

function _qa_validateCol(sheet, col, expectedName) {try {
    const actual = sheet.getRange(4, col).getValue().toString().trim();
    if (actual !== expectedName) {
      Logger.log("[S11 QA] ⛔ עמודה " + col + " — צפוי: " + expectedName + " | בפועל: " + actual);
      return false;
    }
    return true;
  } catch(e) {
    Logger.log("[S11 QA] שגיאה בבדיקת עמודה: " + e.message);
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════
// [v1.37.0] Task 163 — ניקוי דגל U ישן (E25/E31) כש-R מקבל ערך (כפילות/
// מחיקה) שמייתר את הבדיקה הישנה. נקראת רק מ-_qa_applyFixes, משני
// המקומות שכותבים ל-col 18 ("write" ו-"write_symmetry"). לא נוגעת
// בשום דגל U אחר (E13/E15 וכו') — בדיקת prefix מדויקת בלבד.
// ══════════════════════════════════════════════════════════════════
function _qa_clearStaleUFlag_Task163(sheet, row) {
  try {
    const uCell = sheet.getRange(row, 21);
    const uVal  = (uCell.getValue() || "").toString().trim();
    if (uVal.indexOf("⚠️ E25") === 0 || uVal.indexOf("⚠️ E31") === 0) {
      uCell.clearContent();
      Logger.log("[S11 QA] Task163 — נוקה דגל U ישן בשורה " + row + " (\"" + uVal + "\")");
    }
  } catch (e) {
    Logger.log("[S11 QA] Task163 — שגיאה בניקוי U בשורה " + row + ": " + e.message);
  }
}
// ══════════════════════════════════════════════════════════════════
// ביצוע תיקונים — כתיבה לגליון
// ══════════════════════════════════════════════════════════════════
function _qa_applyFixes(sheet, findings) {
  // [v1.9.0] Task 112 — הוסר מנגנון האיסוף-והמחיקה-בסוף (deleteRows): S11
  // אינו מבצע sheet.deleteRow יותר בשום מקרה. כל fix הוא כעת אחד מתוך
  // write/write_symmetry/clear/clear_st/flag/clear_u. המחיקה בפועל (שורה +
  // קבצי Drive) מבוצעת ע"י S08 (s08_deleteApproved, Task 114).
  // [v1.16.0] Task (עמוס, "תקן נבחרים" לא כתב בפועל) — הפונקציה לא החזירה
  // דיווח אמיתי על מה שבאמת נכתב; ה-UI הציג "הצלחה" תמיד. כעת סופרת
  // ומחזירה כמה תיקונים באמת עברו (לא נבלעו ב-catch/עמודה לא תואמת).
  // [v1.17.0] בקשת עמוס — S11 עדיין לא מוחק שורות בעצמו (הכלל לא השתנה),
  // אבל כעת אוספת בנפרד אילו שורות E17 קיבלו בפועל fix="write" ל-R
  // (הסלמה אמיתית, לא רק "flag" ראשוני) — כדי שה-Dialog יוכל להציע
  // מחיקה מיד אחרי, מאחורי אישור נפרד. שורה E17 נכנסת לרשימה רק אם
  // הכתיבה עצמה הצליחה בפועל (בתוך ה-try, לא נבלעה ב-catch).
  // [v1.20.0] Task 132 — case "write" על עמודה 18 איבד את לוגיקת ה-regex/
  // Note הישנה (S07 כבר לא כותב Note מ-Task 131). case "clear" על עמודה 18
  // מנקה כעת גם עמודה 27 במקום Note. case חדש "write_symmetry" — לתיקון
  // E11: כותב גם ל-R (טקסט הכפילות) וגם לעמודה 27 (File_ID) יחד, לתיקון
  // סימטריה חסרה בשורת התאום.
  // [v1.21.0] Task 137 — case "write_symmetry": מוסיף ניקוי "— שורה X"
  // מהטקסט לפני כתיבה, כדי למנוע טקסט עצמי-מתייחס בשורת התאום.
  // [v1.22.0] תיקון שורש (בקשת עמוס, חקירת עמודה Q) — guard זהות File_ID
  // חדש: לפני כל כתיבה בפועל, משווה את f.fileId (שנקבע בזמן הסריקה,
  // ראה _qa_scanRow/_qa_scanAll) מול ה-File_ID האמיתי שנמצא כעת בשורה.
  // אם התבצעה מחיקת שורה (S08/S11) בין הסריקה לרגע "תקן נבחרים" — השורה
  // "זזה" והכתיבה הייתה נוחתת על רשומה אחרת. אי-התאמה → הכתיבה מדולגת
  // לגמרי (לא מבוצעת), הממצא נספר כ"לא הוחל", ולוג ברור מוצג. אם f.fileId
  // חסר (ממצא ישן, לפני v1.22.0) — רק אזהרה בלוג, הכתיבה ממשיכה כרגיל
  // (fail-open לנתונים חסרים, fail-closed רק לאי-התאמה בפועל).

  let appliedCount = 0;
  const e17DeletionCandidates = [];

  findings.forEach(function(f) {

    try {

      // בדיקת עמודה לפני כל כתיבה
      if (f.col && QA_ALLOWED_COLS[f.col]) {
        if (!_qa_validateCol(sheet, f.col, QA_ALLOWED_COLS[f.col])) {
          Logger.log("[S11 QA] ⛔ כתיבה בוטלה — עמודה " + f.col + " לא תואמת");
          return;
        }
      }

      // [v1.22.0] guard זהות File_ID — לפני כל כתיבה בפועל
      if (f.fileId) {
        const actualFileId = (sheet.getRange(f.row, 1).getValue() || "").toString().trim();
        if (actualFileId !== f.fileId) {
          Logger.log(
            "[S11 QA] ⛔ דולג — File_ID לא תואם בשורה " + f.row +
            " (צפוי: " + f.fileId + " | בפועל: " + actualFileId + ") — " +
            "כנראה שהשורה זזה בעקבות מחיקה. ממצא " + f.code + " לא הוחל."
          );
          return;
        }
      } else {
        Logger.log("[S11 QA] ⚠️ ממצא " + f.code + " בשורה " + f.row + " ללא fileId שמור — guard לא בדק זהות.");
      }

      switch (f.fix) {
     case "write":
   sheet.getRange(f.row, f.col).setValue(f.value);
        // [Task 163] R (col 18) מקבל ערך → מנקה דגל U ישן (E25/E31)
        // שהתייתר, כי R תופס עדיפות סמנטית (מחיקה/כפילות).
        if (f.col === 18 && f.value) {
          _qa_clearStaleUFlag_Task163(sheet, f.row);
        }
        break;

      case "write_symmetry":
        // [v1.21.0] Task 137 — מסיר "— שורה X" מהטקסט לפני כתיבה לשורת
        // התאום. הרפרנס האמיתי היחיד הוא עמודה 27 — R הוא תווית סטטוס
        // בלבד, ואסור שיכיל מספר שורה (במיוחד כשהוא נכתב על שורה אחרת
        // מזו שממנה הועתק, מה שהופך אותו לעצמי-מתייחס ושגוי).
        var symmetryText = String(f.value || "")
          .replace(/\s*—\s*שורה\s+\d+\s*/g, " ")
          .replace(/\s{2,}/g, " ")
          .trim();
        sheet.getRange(f.row, 18).setValue(symmetryText);
        sheet.getRange(f.row, 27).setValue(f.col27Value);
        // [Task 163] write_symmetry תמיד כותב ל-R (col 18) — אותו ניקוי.
        if (symmetryText) {
          _qa_clearStaleUFlag_Task163(sheet, f.row);
        }
        break;
        case "set_note":
          // [v1.7.0] Task 98 — כתיבת Note בלבד, ללא שינוי ערך התא עצמו
          sheet.getRange(f.row, f.col).setNote(f.value);
          break;

        case "clear":
          sheet.getRange(f.row, f.col).clearContent();
          // [v1.20.0] Task 132 — ניקוי R מנקה כעת גם עמודה 27 (במקום Note),
          // אחרת נשאר רפרנס יתום שאינו נראה בתא אך עדיין קיים.
          if (f.col === 18) { sheet.getRange(f.row, 27).setValue(""); }
          break;

        case "clear_st":
          sheet.getRange(f.row, 19).clearContent();
          sheet.getRange(f.row, 20).clearContent();
          break;

        case "flag":
          sheet.getRange(f.row, 21).setValue(f.value);
          break;

        case "clear_u":
          sheet.getRange(f.row, 21).clearContent();
          break;
      }
      appliedCount++;
      Logger.log("[S11 QA] תוקן: שורה " + f.row + " | " + f.code + " | " + f.fix);

      // [v1.17.0] בקשת עמוס — E17 בלבד, ורק אם זו הייתה כתיבת הסלמה
      // אמיתית (fix="write" לעמודה R, לא "flag" ראשוני לעמודה U).
      if (f.code === "E17" && f.fix === "write" && f.col === 18) {
        e17DeletionCandidates.push({ row: f.row, reason: f.value });
      }

    } catch (e) {
      Logger.log("[S11 QA] שגיאה בתיקון שורה " + f.row + ": " + e.message);
    }
  });

  SpreadsheetApp.flush();
  return { appliedCount: appliedCount, e17Rows: e17DeletionCandidates };
}
// ══════════════════════════════════════════════════════════════════
// findAnchorRowAndAuditVerified — Task 77 + Task 82
// סריקה אחת לשתי הבדיקות: איתור שורת-עוגן (L=רפואי, M=עבר סיווג)
// וריכוז שורות עם M=אומת ידנית לחקירת מקור
// ══════════════════════════════════════════════════════════════════

function findAnchorRowAndAuditVerified() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(QA_SHEET_NAME);
  if (!sheet) {
    Logger.log("❌ גליון '" + QA_SHEET_NAME + "' לא נמצא.");
    return;
  }

  const COL_FILE_ID         = 1;  // A
  const COL_SOURCE          = 3;  // C
  const COL_SOURCE_TITLE    = 5;  // E
  const COL_DOC_CATEGORY    = 12; // L
  const COL_PIPELINE_STATUS = 13; // M

  const lastRow = sheet.getLastRow();
  if (lastRow < QA_DATA_START) {
    Logger.log("⚠️ אין שורות נתונים בגליון.");
    return;
  }

  const numRows = lastRow - QA_DATA_START + 1;
  const data = sheet.getRange(QA_DATA_START, 1, numRows, COL_PIPELINE_STATUS).getValues();

  const anchorCandidates = [];
  const verifiedRows = [];

  data.forEach(function(row, idx) {
    const sheetRow = QA_DATA_START + idx;
    const fileId   = row[COL_FILE_ID - 1];
    const source   = row[COL_SOURCE - 1];
    const title    = row[COL_SOURCE_TITLE - 1];
    const category = (row[COL_DOC_CATEGORY - 1]    || "").toString().trim(); // [v1.5.0] trim
    const status   = (row[COL_PIPELINE_STATUS - 1] || "").toString().trim(); // [v1.5.0] trim

    // Task 77 — מועמד לשורת עוגן
    if (category === "רפואי" && status === "עבר סיווג") {
      anchorCandidates.push({ row: sheetRow, fileId: fileId, title: title });
    }

    // Task 82 — חקר מקור "אומת ידנית"
    if (status === "אומת ידנית") {
      verifiedRows.push({ row: sheetRow, fileId: fileId, source: source, title: title });
    }
  });

  let report77 = "Task 77 — מועמדים לשורת עוגן (L=רפואי, M=עבר סיווג)\n";
  report77 += "═".repeat(50) + "\n";
  if (anchorCandidates.length === 0) {
    report77 += "❌ לא נמצאה אף שורה תואמת.\n";
  } else {
    report77 += "✅ נמצאו " + anchorCandidates.length + " מועמדים:\n\n";
    anchorCandidates.forEach(function(c) {
      report77 += "שורה " + c.row + " | File_ID: " + c.fileId + " | כותרת: " + c.title + "\n";
    });
  }

  let report82 = "\n\nTask 82 — שורות עם M=אומת ידנית (חקר מקור)\n";
  report82 += "═".repeat(50) + "\n";
  if (verifiedRows.length === 0) {
    report82 += "❌ לא נמצאה אף שורה עם הערך הזה.\n";
  } else {
    report82 += "⚠️ נמצאו " + verifiedRows.length + " שורות:\n\n";
    verifiedRows.forEach(function(v) {
      report82 += "שורה " + v.row + " | File_ID: " + v.fileId + " | מקור: " + v.source + " | כותרת: " + v.title + "\n";
    });
  }

  const fullReport = report77 + report82;
  Logger.log(fullReport);

  const ui = SpreadsheetApp.getUi();
  ui.alert(
    "תוצאות סריקה — Task 77 + 82",
    fullReport.length > 4000 ? fullReport.substring(0, 4000) + "\n\n... (ראה Logger.log לתוכן מלא)" : fullReport,
    ui.ButtonSet.OK
  );
}

// ══════════════════════════════════════════════════════════════════
// [v1.6.0] Task 93 — מיגרציה חד-פעמית: File_ID מעמודה A → Note בעמודה R
// ══════════════════════════════════════════════════════════════════

function qa_migrateNotesFromR_Task93() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(QA_SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("שגיאה", "גליון '" + QA_SHEET_NAME + "' לא נמצא.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < QA_DATA_START) {
    ss.toast("אין נתונים למיגרציה", "S11 QA — Task 93", 3);
    return;
  }

  const numRows      = lastRow - QA_DATA_START + 1;
  const fileIdRange  = sheet.getRange(QA_DATA_START, 1, numRows, 1);
  const rRange       = sheet.getRange(QA_DATA_START, 18, numRows, 1);

  const fileIdVals = fileIdRange.getValues();
  const rVals       = rRange.getValues();
  const rNotes       = rRange.getNotes();

  let migrated   = 0;
  let alreadySet = 0;
  let notFound   = 0;
  let skipped    = 0;

  for (let i = 0; i < numRows; i++) {
    const rVal = (rVals[i][0] || "").toString().trim();
    if (!rVal) { skipped++; continue; }

    const existingNote = (rNotes[i][0] || "").toString().trim();
    if (existingNote) { alreadySet++; continue; }

    const match = rVal.match(/שורה\s+(\d+)/);
    if (!match) { skipped++; continue; }

    const targetRow = parseInt(match[1], 10);
    if (targetRow < QA_DATA_START) { skipped++; continue; }

    const targetIdx = targetRow - QA_DATA_START;
    if (targetIdx < 0 || targetIdx >= numRows) { notFound++; continue; }

    const targetFileId = (fileIdVals[targetIdx][0] || "").toString().trim();
    if (!targetFileId) { notFound++; continue; }

    sheet.getRange(QA_DATA_START + i, 18).setNote(targetFileId);
    migrated++;
  }

  const msg =
    "מיגרציית Notes הושלמה:\n\n" +
    "✅ הושלמה כתיבת Note: " + migrated + "\n" +
    "⏭️ כבר היה Note קיים: " + alreadySet + "\n" +
    "⚠️ לא נמצא File_ID יעד: " + notFound + "\n" +
    "➖ דולגו (R ריק / לא בתבנית 'שורה X'): " + skipped;

  Logger.log("[S11 QA Task93] " + msg.replace(/\n/g, " | "));
  SpreadsheetApp.getUi().alert("מיגרציה חד-פעמית — Task 93", msg, SpreadsheetApp.getUi().ButtonSet.OK);
}
// ══════════════════════════════════════════════════════════════════
// [v1.19.0] Task 130 — מיגרציה חד-פעמית: File_ID → עמודה 27 (Duplicate_Target_FileID)
// ══════════════════════════════════════════════════════════════════

function qa_migrateNoteColToColumn27_Task130() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(QA_SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("שגיאה", "גליון '" + QA_SHEET_NAME + "' לא נמצא.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < QA_DATA_START) {
    ss.toast("אין נתונים למיגרציה", "S11 QA — Task 130", 3);
    return;
  }

  const numRows      = lastRow - QA_DATA_START + 1;
  const fileIdRange  = sheet.getRange(QA_DATA_START, 1, numRows, 1);
  const rRange       = sheet.getRange(QA_DATA_START, 18, numRows, 1);
  const col27Range   = sheet.getRange(QA_DATA_START, 27, numRows, 1);

  const fileIdVals = fileIdRange.getValues();
  const rVals      = rRange.getValues();
  const rNotes     = rRange.getNotes();
  const col27Vals  = col27Range.getValues();

  let migrated     = 0;
  let alreadySet   = 0;
  let fromNote     = 0;
  let fromRegex    = 0;
  let notFound     = 0;
  let skipped      = 0;

  for (let i = 0; i < numRows; i++) {
    const rVal = (rVals[i][0] || "").toString().trim();
    if (!rVal) { skipped++; continue; }

    const existingCol27 = (col27Vals[i][0] || "").toString().trim();
    if (existingCol27) { alreadySet++; continue; }

    const existingNote = (rNotes[i][0] || "").toString().trim();
    if (existingNote) {
      sheet.getRange(QA_DATA_START + i, 27).setValue(existingNote);
      migrated++;
      fromNote++;
      continue;
    }

    const match = rVal.match(/שורה\s+(\d+)/);
    if (!match) { skipped++; continue; }

    const targetRow = parseInt(match[1], 10);
    if (targetRow < QA_DATA_START) { skipped++; continue; }

    const targetIdx = targetRow - QA_DATA_START;
    if (targetIdx < 0 || targetIdx >= numRows) { notFound++; continue; }

    const targetFileId = (fileIdVals[targetIdx][0] || "").toString().trim();
    if (!targetFileId) { notFound++; continue; }

    sheet.getRange(QA_DATA_START + i, 27).setValue(targetFileId);
    migrated++;
    fromRegex++;
  }

  const msg =
    "מיגרציית עמודה 27 הושלמה:\n\n" +
    "✅ סה\"כ נכתב לעמודה 27: " + migrated + "\n" +
    "   מתוכם — מ-Note קיים: " + fromNote + "\n" +
    "   מתוכם — מפענוח טקסט R: " + fromRegex + "\n" +
    "⏭️ כבר היה ערך קיים בעמודה 27: " + alreadySet + "\n" +
    "⚠️ לא נמצא File_ID יעד: " + notFound + "\n" +
    "➖ דולגו (R ריק / לא בתבנית 'שורה X'): " + skipped;

  Logger.log("[S11 QA Task130] " + msg.replace(/\n/g, " | "));
  SpreadsheetApp.getUi().alert("מיגרציה חד-פעמית — Task 130", msg, SpreadsheetApp.getUi().ButtonSet.OK);
}
// ══════════════════════════════════════════════════════════════════
// [v1.6.1] Task 93 — אבחון: איתור שורה יתומה שהמיגרציה לא הצליחה למלא
// ══════════════════════════════════════════════════════════════════

function qa_findOrphanDuplicateRef_Task93() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(QA_SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("שגיאה", "גליון '" + QA_SHEET_NAME + "' לא נמצא.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < QA_DATA_START) {
    ss.toast("אין נתונים לאבחון", "S11 QA — אבחון Task 93", 3);
    return;
  }

  const numRows      = lastRow - QA_DATA_START + 1;
  const fileIdRange  = sheet.getRange(QA_DATA_START, 1, numRows, 1);
  const rRange       = sheet.getRange(QA_DATA_START, 18, numRows, 1);
  const titleRange   = sheet.getRange(QA_DATA_START, 9, numRows, 1);

  const fileIdVals = fileIdRange.getValues();
  const rVals       = rRange.getValues();
  const rNotes       = rRange.getNotes();
  const titleVals   = titleRange.getValues();

  const orphans = [];

  for (let i = 0; i < numRows; i++) {
    const rVal = (rVals[i][0] || "").toString().trim();
    if (!rVal) continue;

    const existingNote = (rNotes[i][0] || "").toString().trim();
    if (existingNote) continue; // כבר תוקן במיגרציה — לא רלוונטי לאבחון

    const match = rVal.match(/שורה\s+(\d+)/);
    if (!match) continue; // אין תבנית "שורה X" — לא רלוונטי (לוגו/ריק וכו')

    const currentRow = QA_DATA_START + i;
    const targetRow   = parseInt(match[1], 10);
    const currentFileId = (fileIdVals[i][0] || "").toString().trim();
    const currentTitle  = (titleVals[i][0]  || "").toString().trim();

    let targetStatus;
    let targetFileId = "";
    let targetTitle  = "";

    if (targetRow < QA_DATA_START || (targetRow - QA_DATA_START) >= numRows) {
      targetStatus = "שורה " + targetRow + " מחוץ לטווח הנתונים (מחוקה / לא קיימת)";
    } else {
      const targetIdx = targetRow - QA_DATA_START;
      targetFileId = (fileIdVals[targetIdx][0] || "").toString().trim();
      targetTitle  = (titleVals[targetIdx][0]  || "").toString().trim();
      targetStatus = targetFileId
        ? "שורה קיימת אך File_ID לא זוהה כתקין (בדוק תוכן תא A" + targetRow + ")"
        : "שורה קיימת אך עמודה A (File_ID) ריקה בה";
    }

    orphans.push({
      row:         currentRow,
      fileId:      currentFileId,
      title:       currentTitle,
      rText:       rVal,
      targetRow:   targetRow,
      targetFileId: targetFileId,
      targetTitle: targetTitle,
      status:      targetStatus
    });
  }

  if (orphans.length === 0) {
    SpreadsheetApp.getUi().alert(
      "אבחון Task 93",
      "✅ לא נמצאו שורות יתומות — כל ההפניות תקינות.",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  let msg = "נמצאו " + orphans.length + " שורות יתומות:\n\n";
  orphans.forEach(function(o) {
    msg += "── שורה " + o.row + " ──\n";
    msg += "File_ID: " + (o.fileId || "—") + "\n";
    msg += "כותרת: " + (o.title || "—") + "\n";
    msg += "R (Duplicate_Flag): " + o.rText + "\n";
    msg += "מצביע לשורה: " + o.targetRow + "\n";
    msg += "מצב שורת היעד: " + o.status + "\n";
    if (o.targetTitle) msg += "כותרת שורת היעד: " + o.targetTitle + "\n";
    msg += "\n";
  });

  Logger.log("[S11 QA Task93 אבחון] " + msg.replace(/\n/g, " | "));
  SpreadsheetApp.getUi().alert("אבחון שורות יתומות — Task 93", msg, SpreadsheetApp.getUi().ButtonSet.OK);
}