/**
 * MedicalPilot — S11_QArun.gs
 * @version 1.3.2 | @updated 15/06/2026 16:35 | @service S11
 * @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S11_QArun.gs
 * @description בדיקת תקינות Pipeline — סריקת גליון ניהול_מיילים לפי 15 חוקי QA.
 * @impacts בודק עקביות עמודות L, M, N, Q, R, S, T, U לפי ציר התקדמות S03→S09.
 *          שורה בודדת: סריקת השורה הנבחרת בלבד.
 *          כל הגליון: סריקה מלאה + Dialog HTML + תיקון נבחר באישור.
 *          כותב לעמודות: M (תיקון סטטוס), N (תיקון Extraction), Q (ניקוי),
 *          R (השלמת סימטריה כפולים), S+T (ניקוי שגיאות ישנות), U (דגל/ניקוי).
 *          תלויות: COLUMN_MAP.gs (SHEET_CONFIG), S11_QADialog.html, גליון ניהול_מיילים.
 *          שורות 1-4 מוגנות — הלולאה מתחילה תמיד מ-SHEET_CONFIG.FIRST_DATA_ROW (5).
 * @callers ViewEngine.gs (runQAView), Menu_PROD.gs
 * @functions runQAViewMain, qa_getFindings, qa_applySelectedFixes,
 *            _qa_scanRow, _qa_scanAll, _qa_checkRow,
 *            _qa_buildSummary, _qa_applyFixes, _qa_validateCol,
 *            _qa_loadEventsFileIds
 * @changes [v1.3.2] תיקון באג קריטי — E15: חסרה סוגרת findings.push + return findings
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

  // ── E11: R סימטריה — בדיקת הפניה הפוכה ──────────────────────
  if (r && r.includes("חשוד ככפול — שורה")) {
    const match = r.match(/שורה\s+(\d+)/);
    if (match) {
      const targetRow = parseInt(match[1], 10);
      if (targetRow < QA_DATA_START) return findings; // דלג שורות מוגנות 1-4
      const targetIdx = targetRow - QA_DATA_START;
      if (targetIdx >= 0 && targetIdx < allData.length) {
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
        // E12 — שורת הכפול לא קיימת
        findings.push({
          row:   row,
          code:  "E12",
          col:   21,
          desc:  "R מצביע על שורה " + targetRow + " שלא קיימת",
          fix:   "flag",
          value: "⚠️ כפול מצביע לשורה שנמחקה: " + targetRow
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