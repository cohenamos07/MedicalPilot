/**
 * MedicalPilot — S11_QArun.gs
 * @version 1.8.0 | @updated 05/07/2026 19:26 | @service S11
 * @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S11_QArun.gs
 * @description בדיקת תקינות Pipeline — סריקת גליון ניהול_מיילים לפי 22 חוקי QA.
 * @impacts בודק עקביות עמודות L, M, N, Q, R, S, T, U לפי ציר התקדמות S03→S09.
 *          שורה בודדת: סריקת השורה הנבחרת בלבד.
 *          כל הגליון: סריקה מלאה + Dialog HTML + תיקון נבחר באישור.
 *          כותב לעמודות: M (תיקון סטטוס), N (תיקון Extraction), Q (ניקוי),
 *          R (השלמת סימטריה כפולים / אימות Note מול המציאות / ניקוי הפניות יתומות),
 *          S+T (ניקוי שגיאות ישנות), U (דגל/ניקוי). [v1.7.0] גם מחיקת שורה מלאה (E16).
 *          תלויות: COLUMN_MAP.gs (SHEET_CONFIG), S11_QADialog.html, גליון ניהול_מיילים.
 *          שורות 1-4 מוגנות — הלולאה מתחילה תמיד מ-SHEET_CONFIG.FIRST_DATA_ROW (5).
 * @callers ViewEngine.gs (runQAView), Menu_PROD.gs, Menu_LAB.gs
 *          (qa_migrateNotesFromR_Task93, qa_findOrphanDuplicateRef_Task93)
 * @functions runQAViewMain, qa_getFindings, qa_applySelectedFixes,
 *            _qa_scanRow, _qa_scanAll, _qa_checkRow,
 *            _qa_buildSummary, _qa_applyFixes, _qa_validateCol,
 *            _qa_loadEventsFileIds, findAnchorRowAndAuditVerified,
 *            qa_migrateNotesFromR_Task93, qa_findOrphanDuplicateRef_Task93
 * @changes [v1.8.0] Task 100 — הרחבת בלוק E17 (Task 99) הקיים ב-_qa_checkRow:
 *                   כאשר DriveApp.getFileById נכשל (המקור לא נגיש), נבדק כעת
 *                   תנאי כפול נוסף: Pipeline_Status === "ממתין להמרה ל-TXT"
 *                   וגם TXT_URL ריק — כלומר אין שום עותק שמור של הנתונים באף
 *                   שלב בצנרת (לא הקובץ המקורי, לא TXT). רק כששלושת התנאים
 *                   מתקיימים יחד נוצר ממצא חדש E22 (SOURCE_GONE_UNRECOVERABLE)
 *                   עם fix="delete_row" (הרסני, מוצג לאישור ידני בדיאלוג, לא
 *                   מסומן כברירת מחדל — כמו E16). בכל שאר המקרים (כולל שורות
 *                   שכבר הומרו ל-TXT כמו 107-112) ממשיך להיווצר E17 הרגיל
 *                   (fix="flag") כפי שהיה. אומת ידנית מול 10 שורות אמיתיות
 *                   (113-122) שנבדקו ידנית ואושרו כאבודות לצמיתות מ-Drive.
 *          [v1.7.0] Tasks 94+98 (פעימת קוד משולבת — אותם 2 קבצים, פעם אחת):
 *                   (1) Task 94 — הוספת כלל E16 ב-_qa_checkRow: File_ID המתחיל
 *                       ב-"OCR_" (שורות ארכיון ישנות ממקור Mod_Brain_OCR).
 *                       DriveApp.getFileById נבדק לתצוגה בלבד (לא כתנאי לזיהוי
 *                       הממצא) — רק כדי להציג לעמוס אם הקובץ עדיין קיים ב-Drive.
 *                       fix חדש "delete_row" — הרסני, מוצג לאישור ידני בדיאלוג,
 *                       לא מופעל אוטומטית.
 *                   (2) Task 98 — אימות אמיתי (לא מיגרציה עיוורת) של עמודה R
 *                       מול המציאות בפועל: ב-runQAViewMain נבנתה מפת
 *                       File_ID→שורה נוכחית (fileIdRowMap) מתוך allData, ונטענו
 *                       כל ה-Notes של עמודה R בבאץ' אחד (rNotesAll). שתי אלו
 *                       מוזרמות כעת דרך _qa_scanRow/_qa_scanAll אל _qa_checkRow.
 *                       הבלוק המשולב של E11/E12 הוחלף בבלוק מורחב שממשיך
 *                       להריץ את E11 (סימטריה) ללא שינוי, ומוסיף לוגיקת החלטה
 *                       חדשה על סמך ה-Note בפועל של השורה הנוכחית:
 *                       • E12 (ללא שינוי בתנאי) — אין Note, והשורה שהטקסט מצביע
 *                         עליה לא קיימת בטווח הנתונים כלל → "clear".
 *                       • E18 (חדש) — אין Note, אך השורה שהטקסט מצביע עליה כן
 *                         קיימת וניתן לשלוף ממנה File_ID → "set_note" (כתיבת
 *                         Note בלבד, לא נוגע בטקסט התא).
 *                       • E19 (חדש) — אין Note, השורה קיימת אך עמודה A ריקה בה
 *                         → אי אפשר לשחזר בביטחון → "clear".
 *                       • E20 (חדש) — יש Note, אך ה-File_ID השמור בו לא נמצא
 *                         יותר בשום שורה בגליון (נמחק/הועבר) → "clear".
 *                       • E21 (חדש) — יש Note תקין, אבל מספר השורה הכתוב בטקסט
 *                         התיישן (עקב מחיקת שורה שהזיזה הכול) — ה-File_ID באמת
 *                         נמצא היום בשורה אחרת → "write" מתקן את הטקסט לשורה
 *                         הנוכחית האמיתית (ה-Note עצמו כבר תקין ולא משתנה).
 *                   (3) תוקן באג קיים ב-_qa_applyFixes case "write" על עמודה 18:
 *                       הקוד הקודם קבע את ה-Note תמיד לפי File_ID של השורה
 *                       הנכתבת עצמה (f.row) — שגוי במקרים כמו E11/E21 שבהם
 *                       הטקסט הנכתב מפנה לשורה אחרת (הצד השני של הכפילות).
 *                       כעת נפרש הטקסט (value) בעזרת regex "שורה X" ונשלף
 *                       ה-File_ID של אותה שורה ממש לצורך ה-Note.
 *                   (4) case "clear" על עמודה 18 מנקה כעת גם את ה-Note עצמו
 *                       (setNote("")) — מונע השארת רפרנס יתום אחרי ניקוי טקסט.
 *                   (5) case חדש "set_note" — כתיבת Note בלבד ללא נגיעה בערך התא.
 *                   (6) _qa_applyFixes: ממצאי "delete_row" נאספים בנפרד לאורך
 *                       הלולאה, ומבוצעים רק בסוף, ממוינים יורד לפי מספר שורה —
 *                       כדי שמחיקת שורה לא תשבש את מספרי השורות של שאר התיקונים
 *                       שמבוצעים באותה אצווה.
 *          [v1.6.2] Task 93 — הרחבת כלל E12 הקיים בתוך _qa_checkRow: כעת מזהה גם R
 *                   המצביע לשורה מתחת ל-QA_DATA_START (שורה מוגנת/לא קיימת), לא רק
 *                   הפניות מעבר לטווח הנתונים. שונה ה-fix של E12 מ-"flag" (סימון U
 *                   בלבד) ל-"clear" על עמודה 18 — מנקה את R עצמו דרך כפתור "תקן נבחרים"
 *                   בדיאלוג הרגיל (S11 QA), ללא צורך בכלי חד-פעמי נפרד. מייתר את הצורך
 *                   בהרצת qa_clearOrphanDuplicateFlags_Task93 שהוצע ולא הוחל.
 *          [v1.6.3] Task 99 — הוספת כלל E17: SOURCE_GONE ב-_qa_checkRow — דגל U לא הרסני
 *                   כאשר DriveApp.getFileById(File_ID) נכשל (קובץ לא נגיש/נמחק). אין מחיקה,
 *                   תצוגה בלבד, שמרני.
 *          [v1.6.1] Task 93 — הוספת qa_findOrphanDuplicateRef_Task93: פונקציית אבחון
 *                   קריאה-בלבד. מאתרת שורות שבהן R מכיל תבנית "שורה X" אך אין להן
 *                   Note (כלומר qa_migrateNotesFromR_Task93 לא הצליחה למלא אותן),
 *                   ומציגה לכל שורה כזו את מספרה, כותרתה, שורת היעד ומצבה
 *                   (יעד לא קיים / File_ID ריק בשורת היעד).
 *          [v1.6.0] Task 93 — הוספת qa_migrateNotesFromR_Task93: מיגרציה חד-פעמית.
 *                   סורקת את כל עמודה R הקיימת, מחלצת מספר שורת-יעד מתוך התבנית
 *                   "שורה X", שולפת את File_ID של שורת היעד מעמודה A, וכותבת אותו
 *                   כ-Note בתא R של השורה הנוכחית — רק אם לא קיים כבר Note.
 *                   מיועדת להרצה חד-פעמית מהתפריט (Menu_LAB) ואז ניתנת להסרה.
 *          [v1.5.0] תיקון Task 89: (1) E11 — החלפת return findings ב-if (targetRow >= QA_DATA_START)
 *                   למניעת קטיעת הבדיקות E12-E15 באותה שורה. (2) הוספת trim() לעמודות
 *                   category/status ב-findAnchorRowAndAuditVerified למניעת פספוס שורות עוגן.
 *                   (3) הוספת setNote(File_ID) ב-_qa_applyFixes case write כשcol===18
 *                   לשמירת File_ID יציב ב-Note של תא R (תשתית לTask 91).
 *                   [v1.4.0] הוספת findAnchorRowAndAuditVerified — Task 77 (איתור שורת עוגן)
 *                   + Task 82 (חקר מקור "אומת ידנית") — קריאה בלבד, אינו כותב לגליון
 *          [v1.3.2] תיקון באג קריטי — E15: חסרה סוגרת findings.push + return findings
 *                   היה מחוץ ל-if — גרם ל-_qa_checkRow לא להחזיר ערך
 *                   תיקון סוגרת כפולה בסוף הקובץ }} שגרמה לשגיאת forEach
 *          [v1.3.1] הוספת עמודה 12 (Doc_Category) ל-QA_ALLOWED_COLS
 *          [v1.3.0] תיקון פונקציה כפולה + E14 + E15
 *          [v1.2.0] Dialog HTML + qa_getFindings + qa_applySelectedFixes
 *          [v1.1.0] תיקון באג 63 — QA_DATA_START = FIRST_DATA_ROW (5)
 *          [v1.0.0] גרסה ראשונה — 13 חוקי QA
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
  "מחולץ",
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

// מיפוי עמודות מאושרות לכתיבה — שם + מספר
const QA_ALLOWED_COLS = {
  12: "Doc_Category",
  13: "Pipeline_Status",
  14: "Extraction_Status",
  17: "Complexity",
  18: "Duplicate_Flag",
  19: "Error_Code",
  20: "Error_Detail",
  21: "QA_Status"
};

var QA_STORED_FINDINGS = [];

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

  const totalCols = 26;
  const allData   = sheet.getRange(QA_DATA_START, 1, lastRow - QA_DATA_START + 1, totalCols).getValues();

  // [v1.3.0] טעינת File_IDs מגליון יומן_אירועים_רפואי — לשימוש ב-E15
  const eventsFileIds = _qa_loadEventsFileIds(ss);

  // [v1.7.0] Task 98 — מפת File_ID → שורה נוכחית, לאימות עמודה R מול המציאות
  const fileIdRowMap = {};
  allData.forEach(function(rd, idx) {
    const fid = (rd[0] || "").toString().trim();
    if (fid) fileIdRowMap[fid] = idx + QA_DATA_START;
  });

  // [v1.7.0] Task 98 — Notes של עמודה R לכל טווח הנתונים, קריאה אחת (batch)
  const rNotesAll = sheet.getRange(QA_DATA_START, 18, lastRow - QA_DATA_START + 1, 1).getNotes();

  const activeRow   = sheet.getActiveCell().getRow();
  const activeRange = sheet.getActiveRange();
  const isSingleRow = activeRange.getNumColumns() >= sheet.getMaxColumns();

  const findings = isSingleRow && activeRow >= QA_DATA_START
    ? _qa_scanRow(allData, activeRow, lastRow, eventsFileIds, fileIdRowMap, rNotesAll)
    : _qa_scanAll(allData, lastRow, eventsFileIds, fileIdRowMap, rNotesAll);

  if (findings.length === 0) {
    ss.toast("✅ הכול תקין — אין ממצאים", "S11 QA", 4);
    return;
  }

  // הוסף origIdx לכל ממצא
  findings.forEach(function(f, i) { f.origIdx = i; });

  // שמור לשימוש qa_applySelectedFixes
  QA_STORED_FINDINGS = findings;

  // פתח Dialog HTML
  const template = HtmlService.createTemplateFromFile('S11_QADialog');
  template.findingsJson = JSON.stringify(findings);

  const html = template.evaluate()
    .setWidth(680)
    .setHeight(520);

  SpreadsheetApp.getUi().showModalDialog(html, 'S11 QA — דוח ממצאים');
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
  if (!sheet || !findingsJson) return false;

  const selectedFindings = JSON.parse(findingsJson);
  if (!selectedFindings || !selectedFindings.length) return false;

  Logger.log("[S11 QA] קיבלתי " + selectedFindings.length + " ממצאים לתיקון");
  _qa_applyFixes(sheet, selectedFindings);
  return true;
}

// ══════════════════════════════════════════════════════════════════
// סריקת שורה בודדת
// ══════════════════════════════════════════════════════════════════

function _qa_scanRow(allData, activeRow, lastRow, eventsFileIds, fileIdRowMap, rNotesAll) {
  const i       = activeRow - QA_DATA_START;
  const rowData = allData[i];
  if (!rowData) return [];
  const myNote = (rNotesAll[i] && rNotesAll[i][0]) || "";
  return _qa_checkRow(rowData, activeRow, allData, lastRow, eventsFileIds, fileIdRowMap, myNote);
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
    rowFindings.forEach(function(f) { findings.push(f); });
  }
  return findings;
}

// ══════════════════════════════════════════════════════════════════
// בדיקת שורה אחת — מחזיר מערך ממצאים
// ══════════════════════════════════════════════════════════════════

function _qa_checkRow(rowData, row, allData, lastRow, eventsFileIds, fileIdRowMap, myNote) {
  const findings = [];

  // קריאת עמודות (0-based)
  const fileId = (rowData[0]  || "").toString().trim();  // A=1
  const l      = (rowData[11] || "").toString().trim();  // L=12
  const m      = (rowData[12] || "").toString().trim();  // M=13
  const n      = (rowData[13] || "").toString().trim();  // N=14
  const o      = (rowData[14] || "").toString().trim();  // O=15
  const q      = (rowData[16] || "").toString().trim();  // Q=17
  const r      = (rowData[17] || "").toString().trim();  // R=18
  const s      = (rowData[18] || "").toString().trim();  // S=19
  const t      = (rowData[19] || "").toString().trim();  // T=20
  const u      = (rowData[20] || "").toString().trim();  // U=21
  const txtUrl = (rowData[23] || "").toString().trim();  // X=24

  if (!fileId) return findings;

  // ── E01: M ריק + O קיים → S05 רץ אך לא עדכן M ──────────────
  if (!m && o) {
    findings.push({
      row:   row,
      code:  "E01",
      col:   13,
      desc:  "M ריק למרות שO=" + o,
      fix:   "write",
      value: "ממתין להמרה ל-TXT"
    });
  }

  // ── E02: M=ממתין + TXT_URL קיים → לא עודכן אחרי S06 ─────────
  if (m === "ממתין להמרה ל-TXT" && txtUrl) {
    findings.push({
      row:   row,
      code:  "E02",
      col:   13,
      desc:  "M=ממתין אך X קיים",
      fix:   "write",
      value: "הומר ל-TXT"
    });
  }

  // ── E03: M = ערך לא חוקי ────────────────────────────────────
  if (m && QA_VALID_M.indexOf(m) === -1) {
    findings.push({
      row:   row,
      code:  "E03",
      col:   13,
      desc:  "M='" + m + "' — ערך לא חוקי",
      fix:   "flag",
      value: "⚠️ ערך M לא חוקי: " + m
    });
  }

  // ── E04: M=הומר ל-TXT + S קיים → שגיאה S06 לא נוקתה ─────────
  if (m === "הומר ל-TXT" && s) {
    findings.push({
      row:   row,
      code:  "E04",
      col:   19,
      desc:  "M=הומר + S='" + s + "' — שגיאה ישנה",
      fix:   "clear_st"
    });
  }

  // ── E05: M=מחולץ + S קיים → שגיאה S07 לא נוקתה ──────────────
  if (m === "מחולץ" && s) {
    findings.push({
      row:   row,
      code:  "E05",
      col:   19,
      desc:  "M=מחולץ + S='" + s + "' — שגיאה ישנה",
      fix:   "clear_st"
    });
  }

  // ── E06: M=מאושר + S קיים → שגיאה לא נוקתה ──────────────────
  if (m === "מאושר" && s) {
    findings.push({
      row:   row,
      code:  "E06",
      col:   19,
      desc:  "M=מאושר + S='" + s + "' — שגיאה ישנה",
      fix:   "clear_st"
    });
  }

  // ── E07: M=מחולץ + N ריק → S07 לא כתב Extraction_Status ─────
  if (m === "מחולץ" && !n) {
    findings.push({
      row:   row,
      code:  "E07",
      col:   14,
      desc:  "M=מחולץ + N ריק",
      fix:   "write",
      value: "חולץ מלא"
    });
  }

  // ── E08: N קיים + ערך לא חוקי ────────────────────────────────
  if (n && QA_VALID_N.indexOf(n) === -1) {
    findings.push({
      row:   row,
      code:  "E08",
      col:   14,
      desc:  "N='" + n + "' — ערך לא חוקי",
      fix:   "flag",
      value: "⚠️ ערך N לא חוקי: " + n
    });
  }

  // ── E09: Q קיים + ערך לא חוקי ────────────────────────────────
  if (q && QA_VALID_Q.indexOf(q) === -1) {
    findings.push({
      row:   row,
      code:  "E09",
      col:   17,
      desc:  "Q='" + q + "' — ערך לא חוקי",
      fix:   "flag",
      value: "⚠️ ערך Q לא חוקי: " + q
    });
  }

  // ── E10: Q קיים + M=ממתין להמרה → Q לפני S06 ────────────────
  if (q && m === "ממתין להמרה ל-TXT") {
    findings.push({
      row:   row,
      code:  "E10",
      col:   17,
      desc:  "Q קיים לפני S06 (M=ממתין)",
      fix:   "clear",
      value: ""
    });
  }

  // ── E11 / E12 / E18 / E19 / E20 / E21 — עמודה R: סימטריה + אימות Note מול המציאות ──
  // [v1.6.2] Task 93 — E12: הפניה לשורה שלא קיימת בטווח הנתונים כלל (ללא שינוי).
  // [v1.7.0] Task 98 — E11 נשאר ללא שינוי לוגי (סימטריה בין שתי שורות כפולות).
  //          נוסף בלוק החלטה חדש, בלתי-תלוי ב-E11, שבודק את ה-Note בפועל של
  //          השורה הנוכחית (myNote) מול המפה fileIdRowMap (המציאות העדכנית),
  //          ולא סומך על מספר השורה הכתוב בטקסט כאמת מוחלטת.
  if (r && r.includes("חשוד ככפול — שורה")) {
    const match = r.match(/שורה\s+(\d+)/);
    if (match) {
      const targetRow    = parseInt(match[1], 10);
      const targetIdx    = targetRow - QA_DATA_START;
      const targetExists = (targetRow >= QA_DATA_START) && (targetIdx >= 0) && (targetIdx < allData.length);

      // E11 — סימטריה: לשורת היעד חסרה הפניה חזרה (ללא שינוי מ-v1.5.0)
      if (targetExists) {
        const targetR = (allData[targetIdx][17] || "").toString().trim();
        if (!targetR) {
          findings.push({
            row:   targetRow,
            code:  "E11",
            col:   18,
            desc:  "שורה " + targetRow + " חסרה הפניה חזרה לשורה " + row,
            fix:   "write",
            value: "חשוד ככפול — שורה " + row
          });
        }
      }

      // [v1.7.0] Task 98 — אימות אמיתי של הטקסט מול ה-Note מול המציאות בפועל
      const noteFileId = (myNote || "").toString().trim();

      if (noteFileId) {
        const actualRow = fileIdRowMap[noteFileId];

        if (!actualRow) {
          // E20 — יש Note, אך ה-File_ID השמור בו לא נמצא יותר בשום שורה בגליון
          findings.push({
            row:   row,
            code:  "E20",
            col:   18,
            desc:  "Note מצביע ל-File_ID שלא קיים יותר בגליון — יש לנקות",
            fix:   "clear",
            value: ""
          });
        } else if (actualRow !== targetRow) {
          // E21 — יש Note תקין, אבל מספר השורה בטקסט התיישן (הזזת שורות)
          findings.push({
            row:   row,
            code:  "E21",
            col:   18,
            desc:  "R כתוב 'שורה " + targetRow + "' אך ה-File_ID (מה-Note) יושב כיום בשורה " + actualRow,
            fix:   "write",
            value: "חשוד ככפול — שורה " + actualRow
          });
        }
        // actualRow === targetRow → תקין לחלוטין, אין ממצא.

      } else if (targetExists) {
        // אין Note, אך אפשר לנסות לשחזר מהטקסט הקיים (כמו qa_migrateNotesFromR_Task93)
        const claimedFileId = (allData[targetIdx][0] || "").toString().trim();
        if (claimedFileId) {
          // E18 — ניתן לשחזר בביטחון
          findings.push({
            row:   row,
            code:  "E18",
            col:   18,
            desc:  "R ללא Note — ניתן לשחזר מהטקסט הקיים (שורה " + targetRow + ")",
            fix:   "set_note",
            value: claimedFileId
          });
        } else {
          // E19 — השורה קיימת אך עמודה A ריקה בה, אי אפשר לשחזר בביטחון
          findings.push({
            row:   row,
            code:  "E19",
            col:   18,
            desc:  "R ללא Note, ושורה " + targetRow + " קיימת אך עמודה A (File_ID) ריקה בה — לא ניתן לשחזר",
            fix:   "clear",
            value: ""
          });
        }
      } else {
        // E12 — אין Note, והשורה שהטקסט מצביע עליה לא קיימת בטווח הנתונים כלל
        findings.push({
          row:   row,
          code:  "E12",
          col:   18,
          desc:  "R מצביע על שורה " + targetRow + " שלא קיימת בטווח הנתונים — יש לנקות",
          fix:   "clear",
          value: ""
        });
      }
    }
  }

  // ── E13: U=אושר ידנית + M≠מאושר ─────────────────────────────
  if (u === "✅ אושר ידנית" && m !== "מאושר" && m !== "אומת ידנית") {
    findings.push({
      row:   row,
      code:  "E13",
      col:   21,
      desc:  "U=אושר ידנית + M='" + m + "' — אי-עקביות",
      fix:   "flag",
      value: "⚠️ U=אושר אך M≠מאושר"
    });
  }

  // ── [v1.3.0] E14: L לא חוקי — אי-אחידות קטגוריה ─────────────
  if (l && QA_VALID_L.indexOf(l) === -1) {
    findings.push({
      row:   row,
      code:  "E14",
      col:   12,
      desc:  "L='" + l + "' — ערך לא חוקי (צפוי: רפואי/חשבונאי/משפטי/ביטוחי/אחר)",
      fix:   "write",
      value: l.replace("מסמך ", "")
    });
  }

  // ── [v1.3.2] E15: M=חולץ לגליונות אך אין שורות ביומן_אירועים_רפואי ─
  // [v1.3.2] תיקון — סוגרת findings.push + return findings מחוץ ל-if
  if ((m === "חולץ לגליונות" || m === "חולץ ליומן אירועים") && fileId && eventsFileIds && !eventsFileIds[fileId]) {
    findings.push({
      row:   row,
      code:  "E15",
      col:   21,
      desc:  "M=חולץ לגליונות אך File_ID לא נמצא ב-" + QA_EVENTS_SHEET,
      fix:   "clear_u",
      value: ""
    });
  }

  // ── [v1.7.0] Task 94 — E16: OCR_ — שורת ארכיון ישנה ממקור Mod_Brain_OCR ───
  // תנאי צר בכוונה (גישה שמרנית שאושרה): רק File_ID המתחיל ב-"OCR_".
  // DriveApp.getFileById נבדק לתצוגה בלבד — לא כתנאי לזיהוי הממצא.
  // fix הרסני ("delete_row") — מוצג לאישור ידני בדיאלוג, אינו אוטומטי.
  if (fileId.indexOf("OCR_") === 0) {
    let driveState = "";
    try {
      DriveApp.getFileById(fileId);
      driveState = "(הקובץ עדיין קיים ב-Drive)";
    } catch (e) {
      driveState = "(הקובץ לא נגיש/נמחק ב-Drive)";
    }
    findings.push({
      row:   row,
      code:  "E16",
      col:   1,
      desc:  "File_ID מתחיל ב-'OCR_' — שורת ארכיון ישנה " + driveState,
      fix:   "delete_row",
      value: ""
    });
  }

  // ── [Task 99] E17 / [v1.8.0] Task 100 E22 — SOURCE_GONE ─────────────────
  // שמרני: בדיקת קיום/גישה ל-File_ID בלבד.
  // [v1.8.0] Task 100 — כאשר בנוסף לכך אין שום עותק שמור של הנתונים באף שלב
  // (M=ממתין להמרה + X ריק) — במקום דגל בלבד (E17) נוצר ממצא הרסני (E22)
  // שמאפשר מחיקת שורה מלאה, באישור ידני. בכל שאר המקרים (למשל שורות שכבר
  // הומרו ל-TXT) ממשיך להיווצר E17 הרגיל, ללא שינוי בהתנהגות הקיימת.
  if (fileId) {
    try {
      // תצוגה בלבד — אימות זמינות המקור. אין שימוש באובייקט המוחזר.
      DriveApp.getFileById(fileId);
    } catch (e) {
      var shortId = fileId.length > 10 ? (fileId.substring(0, 6) + "..." + fileId.substring(fileId.length - 4)) : fileId;

      // [v1.8.0] Task 100 — תנאי כפול: אין המרה ל-TXT וגם אין TXT_URL בכלל
      var isUnrecoverable = (m === "ממתין להמרה ל-TXT") && !txtUrl;

      if (isUnrecoverable) {
        findings.push({
          row:   row,
          code:  "E22",
          col:   1,
          desc:  "מקור חסר לצמיתות מ-Drive (" + shortId + ") + אין TXT — אין עותק נתונים באף שלב, אומת ידנית ב-Task 101",
          fix:   "delete_row",
          value: ""
        });
      } else {
        findings.push({
          row:   row,
          code:  "E17",
          col:   21, // QA_Status (U)
          desc:  "מקור חסר/לא נגיש — File_ID אינו זמין ב-Drive (" + shortId + ")",
          fix:   "flag",
          value: "⚠️ מקור חסר (Drive)"
        });
      }
    }
  }

  return findings;
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

function _qa_validateCol(sheet, col, expectedName) {
  try {
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
// ביצוע תיקונים — כתיבה לגליון
// ══════════════════════════════════════════════════════════════════

function _qa_applyFixes(sheet, findings) {
  // [v1.7.0] Task 94 — מחיקות שורה נאספות בנפרד ומבוצעות רק בסוף
  const deleteRows = [];

  findings.forEach(function(f) {

    // [v1.7.0] Task 94 — E16: לא לכתוב לתא, רק לאסוף למחיקה מאוחרת
    if (f.fix === "delete_row") {
      deleteRows.push(f.row);
      return;
    }

    try {

      // בדיקת עמודה לפני כל כתיבה
      if (f.col && QA_ALLOWED_COLS[f.col]) {
        if (!_qa_validateCol(sheet, f.col, QA_ALLOWED_COLS[f.col])) {
          Logger.log("[S11 QA] ⛔ כתיבה בוטלה — עמודה " + f.col + " לא תואמת");
          return;
        }
      }

      switch (f.fix) {

        case "write":
          sheet.getRange(f.row, f.col).setValue(f.value);
          // [v1.5.0] Task 91 — שמירת File_ID ב-Note של עמודה R לרפרנס יציב
          // [v1.7.0] Task 98 — תיקון: ה-Note חייב לשקף את ה-File_ID של השורה
          // שהטקסט הנכתב מפנה אליה בפועל (הצד השני), ולא את ה-File_ID של
          // השורה הנכתבת עצמה כפי שהיה עד כה.
          if (f.col === 18) {
            const _refMatch = (f.value || "").match(/שורה\s+(\d+)/);
            let _noteId = "";
            if (_refMatch) {
              const _refRow = parseInt(_refMatch[1], 10);
              _noteId = sheet.getRange(_refRow, 1).getValue().toString().trim();
            } else {
              _noteId = sheet.getRange(f.row, 1).getValue().toString().trim();
            }
            if (_noteId) { sheet.getRange(f.row, 18).setNote(_noteId); }
          }
          break;

        case "set_note":
          // [v1.7.0] Task 98 — כתיבת Note בלבד, ללא שינוי ערך התא עצמו
          sheet.getRange(f.row, f.col).setNote(f.value);
          break;

        case "clear":
          sheet.getRange(f.row, f.col).clearContent();
          // [v1.7.0] Task 98 — ניקוי R חייב לנקות גם את ה-Note, אחרת נשאר
          // רפרנס יתום שאינו נראה בתא אך עדיין קיים.
          if (f.col === 18) { sheet.getRange(f.row, 18).setNote(""); }
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
      Logger.log("[S11 QA] תוקן: שורה " + f.row + " | " + f.code + " | " + f.fix);
    } catch (e) {
      Logger.log("[S11 QA] שגיאה בתיקון שורה " + f.row + ": " + e.message);
    }
  });

  // [v1.7.0] Task 94 — מחיקת השורות שנאספו, תמיד אחרונה, ממוינת יורד לפי
  // מספר שורה — כדי שמחיקה לא תשבש את מספרי השורות של תיקונים אחרים
  // שכבר בוצעו למעלה באותה אצווה.
  if (deleteRows.length) {
    deleteRows.sort(function(a, b) { return b - a; });
    deleteRows.forEach(function(r) {
      try {
        sheet.deleteRow(r);
        Logger.log("[S11 QA] נמחקה שורה " + r + " (E16 delete_row)");
      } catch (e) {
        Logger.log("[S11 QA] שגיאה במחיקת שורה " + r + ": " + e.message);
      }
    });
  }

  SpreadsheetApp.flush();
}
// ══════════════════════════════════════════════════════════════════
// findAnchorRowAndAuditVerified — Task 77 + Task 82
// סריקה אחת לשתי הבדיקות: איתור שורת-עוגן (L=רפואי, M=מחולץ)
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
    if (category === "רפואי" && status === "מחולץ") {
      anchorCandidates.push({ row: sheetRow, fileId: fileId, title: title });
    }

    // Task 82 — חקר מקור "אומת ידנית"
    if (status === "אומת ידנית") {
      verifiedRows.push({ row: sheetRow, fileId: fileId, source: source, title: title });
    }
  });

  let report77 = "Task 77 — מועמדים לשורת עוגן (L=רפואי, M=מחולץ)\n";
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