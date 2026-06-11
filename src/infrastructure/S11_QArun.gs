/**
 * MedicalPilot — S11_QArun.gs
 * @version 1.0.0 | @updated 10/06/2026 23:00 | @service S11
 * @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S11_QArun.gs
 * @impacts בדיקת תקינות Pipeline — סריקת גליון ניהול_מיילים לפי 13 חוקי QA.
 *          בודק עקביות עמודות M, N, Q, R, S, T, U לפי ציר התקדמות S03→S09.
 *          שורה בודדת: סריקת השורה הנבחרת בלבד.
 *          כל הגליון: סריקה מלאה + dialog סיכום + תיקון אוטומטי באישור.
 *          כותב לעמודות: M (תיקון סטטוס), N (תיקון Extraction), Q (ניקוי),
 *          R (השלמת סימטריה כפולים), S+T (ניקוי שגיאות ישנות), U (דגל).
 *          תלויות: COLUMN_MAP.gs, גליון ניהול_מיילים.
 * @callers ViewEngine.gs (runQAView), Menu_PROD.gs
 * @changes [v1.0.0] גרסה ראשונה — 13 חוקי QA + סימטריית כפולים
 */

// ══════════════════════════════════════════════════════════════════
// קבועים
// ══════════════════════════════════════════════════════════════════

const QA_SHEET_NAME = "ניהול_מיילים";
const QA_DATA_START = 2;

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

// ══════════════════════════════════════════════════════════════════
// נקודת כניסה ראשית — נקראת מ-ViewEngine.runQAView
// ══════════════════════════════════════════════════════════════════

function runQAViewMain() {
  const ui    = SpreadsheetApp.getUi();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(QA_SHEET_NAME);

  if (!sheet) {
    ui.alert("שגיאה", "גליון '" + QA_SHEET_NAME + "' לא נמצא.", ui.ButtonSet.OK);
    return;
  }

  const activeRange = sheet.getActiveRange();
  const activeRow   = sheet.getActiveCell().getRow();
  const isSingleRow = activeRange.getNumColumns() >= sheet.getMaxColumns();

  // טוען את כל הנתונים לזיכרון — קריאה אחת בלבד
  const lastRow  = sheet.getLastRow();
  if (lastRow < QA_DATA_START) {
    ss.toast("אין נתונים לבדיקה", "S11 QA", 3);
    return;
  }

  const totalCols = 26;
  const allData   = sheet.getRange(QA_DATA_START, 1, lastRow - QA_DATA_START + 1, totalCols).getValues();

  // סריקה
  const findings = isSingleRow && activeRow >= QA_DATA_START
    ? _qa_scanRow(allData, activeRow, lastRow)
    : _qa_scanAll(allData, lastRow);

  // אין ממצאים
  if (findings.length === 0) {
    ss.toast("✅ הכול תקין — אין ממצאים", "S11 QA", 4);
    if (isSingleRow) {
      sheet.getRange(activeRow, 21).activate();
    }
    return;
  }

  // יש ממצאים — dialog קומפקטי
  const summary = _qa_buildSummary(findings);
  const confirm = ui.alert(
    "S11 QA — נמצאו " + findings.length + " ממצאים",
    summary + "\n\nהאם לתקן הכול?",
    ui.ButtonSet.YES_NO
  );

  if (confirm === ui.Button.YES) {
    _qa_applyFixes(sheet, findings, allData);
    ss.toast("✅ תוקנו " + findings.length + " ממצאים", "S11 QA", 4);
    sheet.getRange(findings[0].row, 21).activate();
  }
}

// ══════════════════════════════════════════════════════════════════
// סריקת שורה בודדת
// ══════════════════════════════════════════════════════════════════

function _qa_scanRow(allData, activeRow, lastRow) {
  const i        = activeRow - QA_DATA_START;
  const rowData  = allData[i];
  if (!rowData) return [];
  return _qa_checkRow(rowData, activeRow, allData, lastRow);
}

// ══════════════════════════════════════════════════════════════════
// סריקת כל הגליון
// ══════════════════════════════════════════════════════════════════

function _qa_scanAll(allData, lastRow) {
  const findings = [];
  for (let i = 0; i < allData.length; i++) {
    const row     = i + QA_DATA_START;
    const rowData = allData[i];
    if (!rowData[0]) continue; // דלג שורות ריקות (אין File_ID)
    const rowFindings = _qa_checkRow(rowData, row, allData, lastRow);
    rowFindings.forEach(function(f) { findings.push(f); });
  }
  return findings;
}

// ══════════════════════════════════════════════════════════════════
// בדיקת שורה אחת — מחזיר מערך ממצאים
// ══════════════════════════════════════════════════════════════════

function _qa_checkRow(rowData, row, allData, lastRow) {
  const findings = [];

  // קריאת עמודות (0-based)
  const fileId   = (rowData[0]  || "").toString().trim();  // A=1
  const m        = (rowData[12] || "").toString().trim();  // M=13
  const n        = (rowData[13] || "").toString().trim();  // N=14
  const o        = (rowData[14] || "").toString().trim();  // O=15
  const q        = (rowData[16] || "").toString().trim();  // Q=17
  const r        = (rowData[17] || "").toString().trim();  // R=18
  const s        = (rowData[18] || "").toString().trim();  // S=19
  const t        = (rowData[19] || "").toString().trim();  // T=20
  const u        = (rowData[20] || "").toString().trim();  // U=21
  const txtUrl   = (rowData[23] || "").toString().trim();  // X=24

  if (!fileId) return findings;

  // ── E01: M ריק + O קיים → S05 רץ אך לא עדכן M ──────────────
  if (!m && o) {
    findings.push({
      row:    row,
      code:   "E01",
      col:    13,
      desc:   "M ריק למרות שO=" + o,
      fix:    "write",
      value:  "ממתין להמרה ל-TXT"
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
    const match  = r.match(/שורה\s+(\d+)/);
    if (match) {
      const targetRow = parseInt(match[1], 10);
      const targetIdx = targetRow - QA_DATA_START;
      if (targetIdx >= 0 && targetIdx < allData.length) {
        const targetR = (allData[targetIdx][17] || "").toString().trim();
        if (!targetR) {
          findings.push({
            row:      targetRow,
            code:     "E11",
            col:      18,
            desc:     "שורה " + targetRow + " חסרה הפניה חזרה לשורה " + row,
            fix:      "write",
            value:    "חשוד ככפול — שורה " + row
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
      f.fix === "flag"     ? "→ דגל U"          : "";
    lines.push("שורה " + f.row + " | " + f.code + " | " + f.desc + " " + fixLabel);
  });

  if (findings.length > MAX_DISPLAY) {
    lines.push("... ועוד " + (findings.length - MAX_DISPLAY) + " ממצאים נוספים");
  }

  return lines.join("\n");
}

// ══════════════════════════════════════════════════════════════════
// ביצוע תיקונים — כתיבה לגליון
// ══════════════════════════════════════════════════════════════════

function _qa_applyFixes(sheet, findings, allData) {
  findings.forEach(function(f) {
    try {
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
      }
      Logger.log("[S11 QA] תוקן: שורה " + f.row + " | " + f.code + " | " + f.fix);
    } catch (e) {
      Logger.log("[S11 QA] שגיאה בתיקון שורה " + f.row + ": " + e.message);
    }
  });

  SpreadsheetApp.flush();
}