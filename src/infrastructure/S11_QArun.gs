/**
 * MedicalPilot — S11_QArun.gs
 * @version 1.6.2 | @updated 03/07/2026 12:54 | @service S11
 * @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S11_QArun.gs
 * @description בדיקת תקינות Pipeline — סריקת גליון ניהול_מיילים לפי 15 חוקי QA.
 * @impacts בודק עקביות עמודות L, M, N, Q, R, S, T, U לפי ציר התקדמות S03→S09.
 *          שורה בודדת: סריקת השורה הנבחרת בלבד.
 *          כל הגליון: סריקה מלאה + Dialog HTML + תיקון נבחר באישור.
 *          כותב לעמודות: M (תיקון סטטוס), N (תיקון Extraction), Q (ניקוי),
 *          R (השלמת סימטריה כפולים / ניקוי הפניות יתומות), S+T (ניקוי שגיאות ישנות), U (דגל/ניקוי).
 *          תלויות: COLUMN_MAP.gs (SHEET_CONFIG), S11_QADialog.html, גליון ניהול_מיילים.
 *          שורות 1-4 מוגנות — הלולאה מתחילה תמיד מ-SHEET_CONFIG.FIRST_DATA_ROW (5).
 * @callers ViewEngine.gs (runQAView), Menu_PROD.gs, Menu_LAB.gs
 *          (qa_migrateNotesFromR_Task93, qa_findOrphanDuplicateRef_Task93)
 * @functions runQAViewMain, qa_getFindings, qa_applySelectedFixes,
 *            _qa_scanRow, _qa_scanAll, _qa_checkRow,
 *            _qa_buildSummary, _qa_applyFixes, _qa_validateCol,
 *            _qa_loadEventsFileIds, findAnchorRowAndAuditVerified,
 *            qa_migrateNotesFromR_Task93, qa_findOrphanDuplicateRef_Task93
 * @changes [v1.6.2] Task 93 — הרחבת כלל E12 הקיים בתוך _qa_checkRow: כעת מזהה גם R
 *                   המצביע לשורה מתחת ל-QA_DATA_START (שורה מוגנת/לא קיימת), לא רק
 *                   הפניות מעבר לטווח הנתונים. שונה ה-fix של E12 מ-"flag" (סימון U
 *                   בלבד) ל-"clear" על עמודה 18 — מנקה את R עצמו דרך הדיאלוג הרגיל
 *                   (S11 QA), ללא צורך בכלי חד-פעמי נפרד. מייתר את הצורך בהרצת
 *                   qa_clearOrphanDuplicateFlags_Task93 שהוצע ולא הוחל.
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

  const activeRow   = sheet.getActiveCell().getRow();
  const activeRange = sheet.getActiveRange();
  const isSingleRow = activeRange.getNumColumns() >= sheet.getMaxColumns();

  const findings = isSingleRow && activeRow >= QA_DATA_START
    ? _qa_scanRow(allData, activeRow, lastRow, eventsFileIds)
    : _qa_scanAll(allData, lastRow, eventsFileIds);

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

function _qa_scanRow(allData, activeRow, lastRow, eventsFileIds) {
  const i       = activeRow - QA_DATA_START;
  const rowData = allData[i];
  if (!rowData) return [];
  return _qa_checkRow(rowData, activeRow, allData, lastRow, eventsFileIds);
}

// ══════════════════════════════════════════════════════════════════
// סריקת כל הגליון
// ══════════════════════════════════════════════════════════════════

function _qa_scanAll(allData, lastRow, eventsFileIds) {
  const findings = [];
  for (let i = 0; i < allData.length; i++) {
    const row     = i + QA_DATA_START;
    const rowData = allData[i];
    if (!rowData[0]) continue; // דלג שורות ריקות (אין File_ID)
    const rowFindings = _qa_checkRow(rowData, row, allData, lastRow, eventsFileIds);
    rowFindings.forEach(function(f) { findings.push(f); });
  }
  return findings;
}

// ══════════════════════════════════════════════════════════════════
// בדיקת שורה אחת — מחזיר מערך ממצאים
// ══════════════════════════════════════════════════════════════════

function _qa_checkRow(rowData, row, allData, lastRow, eventsFileIds) {
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

  // ── E11 / E12: R — סימטריה + הפניה לשורה שלא קיימת ──────────
  // [v1.6.2] Task 93 — E12 הורחב לכסות גם targetRow < QA_DATA_START
  //          (הפניה לשורה מוגנת/מחוקה מתחת לשורת הנתונים הראשונה).
  //          ה-fix של E12 שונה מ-"flag" (סימון U בלבד) ל-"clear" —
  //          מנקה את R עצמו דרך כפתור "תקן נבחרים" בדיאלוג הרגיל.
  if (r && r.includes("חשוד ככפול — שורה")) {
    const match = r.match(/שורה\s+(\d+)/);
    if (match) {
      const targetRow    = parseInt(match[1], 10);
      const targetIdx    = targetRow - QA_DATA_START;
      const targetExists = (targetRow >= QA_DATA_START) && (targetIdx >= 0) && (targetIdx < allData.length);

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
      } else {
        // [v1.6.2] E12 — שורת הכפול לא קיימת בטווח הנתונים (נמחקה / מתחת ל-QA_DATA_START)
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
      f.fix === "write"    ? "→ תיקון אוטומטי" :
      f.fix === "clear"    ? "→ ניקוי עמודה"   :
      f.fix === "clear_st" ? "→ ניקוי S+T"      :
      f.fix === "flag"     ? "→ דגל U"          :
      f.fix === "clear_u"  ? "→ ניקוי U"        : "";
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
  findings.forEach(function(f) {
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
          if (f.col === 18) {
            const _srcId = sheet.getRange(f.row, 1).getValue().toString().trim();
            if (_srcId) { sheet.getRange(f.row, 18).setNote(_srcId); }
          }
          break;

        case "clear":
          sheet.getRange(f.row, f.col).clearContent();
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