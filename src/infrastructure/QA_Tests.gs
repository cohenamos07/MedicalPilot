/**
 * MedicalPilot — QA_Tests.gs
 * בדיקת תאימות נתונים, כותרות ותיקון עמודות
 * @version 1.3.0 | @updated 27/04/2026 12:00 | @service QA
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/QA_Tests.gs
 * שינוי: validateTxtLinks — לוגיקה חדשה עם חיפוש בDrive + קודי שגיאה מדויקים
 */

const SHEET_NAME = "ניהול_מיילים";
const TOTAL_COLS = 26;

const EXPECTED_HEADERS = [
  "File_ID","Capture_Date","Source","Source_Reference","Source_Title",
  "Source_Author","Source_Date","Attachment_Name","Doc_Title","Doc_Issuer",
  "Doc_Date","Doc_Category","Pipeline_Status","Extraction_Status","File_Type",
  "File_Size","Complexity","Duplicate_Flag","Error_Code","Error_Detail",
  "QA_Status","","Source_URL","TXT_URL","Temp_URL","Raw_Text"
];

const COL_CONTENT_RULES = [
  { col: 1,  name: "File_ID",         type: "fileid"   },
  { col: 2,  name: "Capture_Date",    type: "date"     },
  { col: 3,  name: "Source",          type: "source"   },
  { col: 13, name: "Pipeline_Status", type: "pipeline" },
  { col: 15, name: "File_Type",       type: "filetype" },
  { col: 16, name: "File_Size",       type: "size"     },
  { col: 23, name: "Source_URL",      type: "url"      },
  { col: 24, name: "TXT_URL",         type: "url"      },
];

const VALID_PIPELINE = ["ממתין להמרה ל-TXT","הומר ל-TXT","מחולץ","ממתין לאימות","מאושר",""];
const VALID_FILETYPE = ["SYSTEM_PDF","SYSTEM_IMG","SYSTEM_GDOC","SYSTEM_DOCX","SYSTEM_TXT","SYSTEM_SHEET",""];
const VALID_SOURCE   = ["Gmail","Drive_Manual",""];

// ── זיהוי מצב — שורה בודדת או כל הגיליון ────────────────────────────────────

function _getTargetRows(sheet) {
  const activeRange = sheet.getActiveRange();
  const activeRow   = activeRange.getRow();
  const numRows     = activeRange.getNumRows();
  const lastRow     = sheet.getLastRow();

  if (activeRow === 1 || lastRow < 2) {
    return { mode: "all", rows: _range(2, lastRow) };
  }
  if (numRows > 2) {
    return { mode: "all", rows: _range(2, lastRow) };
  }
  return { mode: "single", rows: [activeRow] };
}

function _range(from, to) {
  const arr = [];
  for (let i = from; i <= to; i++) arr.push(i);
  return arr;
}

function _jumpTo(sheet, rowNum, success) {
  const col = success ? 13 : 18;
  sheet.getRange(rowNum, col).activate();
}

// ── פונקציה ראשית ─────────────────────────────────────────────────────────────

function runAllTests() {
  const ui    = SpreadsheetApp.getUi();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) { ui.alert("שגיאה: גיליון לא נמצא."); return; }

  let report = "═══════════════════════════════\n";
  report    += "   דוח QA — MedicalPilot\n";
  report    += "═══════════════════════════════\n\n";

  const headerResult  = checkHeaders(sheet);
  const contentResult = checkColumnContent(sheet);
  report += headerResult.report;
  report += contentResult.report;

  const hasIssues = !headerResult.ok || !contentResult.ok;
  if (!hasIssues) {
    report += "\n✅ הכל תקין — אין צורך בתיקון.";
    ui.alert("תוצאות QA", report, ui.ButtonSet.OK);
    sheet.getRange(2, 13).activate();
    return;
  }

  report += "\n\nהאם לבצע תיקון אוטומטי?";
  const answer = ui.alert("תוצאות QA", report, ui.ButtonSet.YES_NO);
  if (answer === ui.Button.YES) {
    fixColumnPlacement(sheet, headerResult, contentResult, ui);
  }
}

// ── שלב א — בדיקת כותרות ──────────────────────────────────────────────────────

function checkHeaders(sheet) {
  const currentHeaders = sheet.getRange(1, 1, 1, TOTAL_COLS).getValues()[0];
  let report = "── שלב א: בדיקת כותרות ──\n";
  let ok = true;
  const issues = [];

  for (let i = 0; i < TOTAL_COLS; i++) {
    const expected  = EXPECTED_HEADERS[i];
    const actual    = (currentHeaders[i] || "").toString().trim();
    const colLetter = colToLetter(i + 1);
    if (actual !== expected) {
      ok = false;
      issues.push({ col: i + 1, expected, actual });
      report += "⚠️ " + colLetter + ": נמצא \"" + actual + "\" במקום \"" + expected + "\"\n";
    }
  }

  if (ok) { report += "✅ כל הכותרות תקינות\n"; }
  else { report += "סה\"כ " + issues.length + " כותרות שגויות\n"; }
  report += "\n";
  return { ok, issues, report };
}

// ── שלב ב — בדיקת תוכן עמודות ────────────────────────────────────────────────

function checkColumnContent(sheet) {
  const lastRow  = sheet.getLastRow();
  const dataRows = lastRow - 1;
  let report = "── שלב ב: בדיקת תוכן עמודות ──\n";
  let ok = true;
  const issues = [];

  if (dataRows < 1) {
    report += "אין שורות נתונים לבדיקה.\n\n";
    return { ok: true, issues: [], report };
  }

  const allData = sheet.getRange(2, 1, dataRows, TOTAL_COLS).getValues();

  COL_CONTENT_RULES.forEach(function(rule) {
    const colIndex  = rule.col - 1;
    const colLetter = colToLetter(rule.col);
    const badRows   = [];

    for (let r = 0; r < allData.length; r++) {
      const val = (allData[r][colIndex] || "").toString().trim();
      if (val === "") continue;
      let valid = true;

      if (rule.type === "pipeline") {
        valid = VALID_PIPELINE.indexOf(val) !== -1;
        if (val.includes("KB") || val.includes("MB") || val.includes("http") || val.includes("SYSTEM_")) valid = false;
      } else if (rule.type === "filetype") {
        valid = VALID_FILETYPE.indexOf(val) !== -1;
        if (val.includes("http") || val.includes("KB") || val.includes("MB")) valid = false;
      } else if (rule.type === "size") {
        valid = val.includes("KB") || val.includes("MB");
        if (val.includes("http") || val.includes("SYSTEM_")) valid = false;
      } else if (rule.type === "url") {
        valid = val.startsWith("http");
      } else if (rule.type === "source") {
        valid = VALID_SOURCE.indexOf(val) !== -1;
      } else if (rule.type === "fileid") {
        valid = !val.includes("http") && !val.includes("KB") && !val.includes("SYSTEM_");
      }

      if (!valid) badRows.push({ row: r + 2, val: val.substring(0, 40) });
    }

    if (badRows.length > 0) {
      ok = false;
      issues.push({ col: rule.col, name: rule.name, type: rule.type, badRows });
      report += "⚠️ " + colLetter + " (" + rule.name + "): " + badRows.length + " שורות עם תוכן שגוי\n";
      badRows.slice(0, 3).forEach(function(b) {
        report += "   שורה " + b.row + ": \"" + b.val + "\"\n";
      });
    }
  });

  if (ok) { report += "✅ תוכן כל העמודות תקין\n"; }
  report += "\n";
  return { ok, issues, report };
}

// ── שלב ג — תיקון הזזת נתונים ────────────────────────────────────────────────

function fixColumnPlacement(sheet, headerResult, contentResult, ui) {
  let fixReport = "── תיקונים שבוצעו ──\n";

  if (!headerResult.ok) {
    sheet.getRange(1, 1, 1, TOTAL_COLS).setValues([EXPECTED_HEADERS]);
    sheet.getRange(1, 1, 1, TOTAL_COLS).setFontWeight("bold");
    fixReport += "✅ כותרות תוקנו\n";
  }

  if (!contentResult.ok) {
    const lastRow  = sheet.getLastRow();
    const dataRows = lastRow - 1;
    if (dataRows > 0) {
      const allData   = sheet.getRange(2, 1, dataRows, TOTAL_COLS).getValues();
      const fixedData = allData.map(function(row) {
        const newRow      = row.slice();
        const pipelineVal = (newRow[12] || "").toString();
        if (pipelineVal.includes("KB") || pipelineVal.includes("MB")) {
          const old_I = newRow[8];  const old_J = newRow[9];
          const old_K = newRow[10]; const old_L = newRow[11];
          const old_M = newRow[12]; const old_N = newRow[13];
          const old_O = newRow[14]; const old_P = newRow[15];
          const old_Q = newRow[16]; const old_R = newRow[17];
          const old_S = newRow[18]; const old_T = newRow[19];
          const old_U = newRow[20];
          newRow[8]  = old_I;  newRow[9]  = old_J;
          newRow[10] = old_K;  newRow[11] = old_L;
          newRow[12] = old_M;  newRow[13] = old_N;
          newRow[14] = old_P;  newRow[15] = old_R;
          newRow[16] = old_T;  newRow[17] = old_U;
          newRow[18] = "";     newRow[19] = "";
          newRow[20] = old_S;  newRow[21] = "";
          newRow[22] = old_O;  newRow[23] = old_Q;
          newRow[24] = "";     newRow[25] = "";
        }
        return newRow;
      });
      sheet.getRange(2, 1, dataRows, TOTAL_COLS).setValues(fixedData);
      fixReport += "✅ נתונים הוזזו למיקומים הנכונים\n";
    }
  }

  SpreadsheetApp.flush();
  ui.alert("תיקון הושלם", fixReport + "\nמומלץ להריץ runAllTests שוב לאימות.", ui.ButtonSet.OK);
  sheet.getRange(2, 13).activate();
}

// ── שלב ד — בדיקת לוגיקה ברמת שורה ──────────────────────────────────────────

function checkRowLogic() {
  const ui    = SpreadsheetApp.getUi();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) { ui.alert("שגיאה: גיליון לא נמצא."); return; }

  const target   = _getTargetRows(sheet);
  const rows     = target.rows;
  const allData  = sheet.getRange(2, 1, sheet.getLastRow() - 1, TOTAL_COLS).getValues();
  let firstBadRow = null;
  let issues = 0;

  rows.forEach(function(rowNum) {
    const row      = allData[rowNum - 2];
    if (!row) return;
    const problems = [];

    const fileId    = (row[0]  || "").toString().trim();
    const source    = (row[2]  || "").toString().trim();
    const fileName  = (row[4]  || "").toString().trim();
    const pipeline  = (row[12] || "").toString().trim();
    const fileType  = (row[14] || "").toString().trim();
    const fileSize  = (row[15] || "").toString().trim();
    const errorCode = (row[18] || "").toString().trim();
    const sourceUrl = (row[22] || "").toString().trim();
    const txtUrl    = (row[23] || "").toString().trim();

    if (!fileId)    problems.push("A ריק — חסר File_ID");
    if (!source)    problems.push("C ריק — חסר Source");
    if (!fileName)  problems.push("E ריק — חסר Source_Title");
    if (!sourceUrl) problems.push("W ריק — חסר Source_URL");

    if (pipeline === "ממתין להמרה ל-TXT") {
      if (!fileType) problems.push("O ריק — חסר File_Type");
      if (!fileSize) problems.push("P ריק — חסר File_Size");
      if (txtUrl)    problems.push("X אמור להיות ריק");
    } else if (pipeline === "הומר ל-TXT") {
      if (!fileType) problems.push("O ריק — חסר File_Type");
      if (!fileSize) problems.push("P ריק — חסר File_Size");
      if (!txtUrl)   problems.push("X ריק — חסר TXT_URL");
    } else if (pipeline === "") {
      problems.push("M ריק — חסר Pipeline_Status");
    }

    if (errorCode) problems.push("S מלא — שגיאה פתוחה: " + errorCode);

    const qaVal = problems.length === 0 ? "✅ תקין" : "⚠️ " + problems.join(" | ");
    sheet.getRange(rowNum, 21).setValue(qaVal);

    if (problems.length > 0) {
      issues++;
      if (!firstBadRow) firstBadRow = rowNum;
    }
  });

  SpreadsheetApp.flush();

  if (target.mode === "single") {
    _jumpTo(sheet, rows[0], issues === 0);
    if (issues > 0) {
      ui.alert("שורה " + rows[0], "⚠️ נמצאו בעיות — ראה עמודה U ו-S/T", ui.ButtonSet.OK);
    }
  } else {
    if (issues === 0) {
      ui.alert("בדיקת לוגיקה", "✅ כל " + rows.length + " השורות תקינות", ui.ButtonSet.OK);
      sheet.getRange(2, 13).activate();
    } else {
      ui.alert("בדיקת לוגיקה", "⚠️ " + issues + " שורות עם בעיות\nמקפיץ לשורה הראשונה השגויה", ui.ButtonSet.OK);
      sheet.getRange(firstBadRow, 19).activate(); // S = Error_Code
    }
  }
}

// ── שלב ה — בדיקת תקינות לינקי TXT ──────────────────────────────────────────

function validateTxtLinks() {
  const ui    = SpreadsheetApp.getUi();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) { ui.alert("שגיאה: גיליון לא נמצא."); return; }

  const target  = _getTargetRows(sheet);
  const rows    = target.rows;
  const lastRow = sheet.getLastRow();
  const allData = sheet.getRange(2, 1, lastRow - 1, TOTAL_COLS).getValues();

  let valid       = 0;
  let waiting     = 0;
  let linked      = 0;
  let fixed       = 0;
  let errors      = 0;
  let firstBadRow = null;

  // מציאת תיקיית Converted_TXT
  const folders = DriveApp.getFoldersByName("Converted_TXT");
  const convertedFolder = folders.hasNext() ? folders.next() : null;

  rows.forEach(function(rowNum) {
    const row        = allData[rowNum - 2];
    if (!row) return;

    const attachName = (row[7]  || "").toString().trim(); // H = Attachment_Name
    const pipeline   = (row[12] || "").toString().trim(); // M = Pipeline_Status
    const fileType   = (row[14] || "").toString().trim(); // O = File_Type
    const fileSize   = (row[15] || "").toString().trim(); // P = File_Size
    const txtUrl     = (row[23] || "").toString().trim(); // X = TXT_URL

    // ── מקרה א — X ריק ───────────────────────────────────────────────────────
    if (!txtUrl) {

      // בדוק שO ו-P מלאים
      if (!fileType) {
        sheet.getRange(rowNum, 19).setValue("MISSING_TYPE");
        sheet.getRange(rowNum, 20).setValue("עמודה O ריקה — סוג קובץ חסר, הרץ S05 קודם");
        if (!firstBadRow) firstBadRow = rowNum;
        errors++;
        return;
      }
      if (!fileSize) {
        sheet.getRange(rowNum, 19).setValue("MISSING_SIZE");
        sheet.getRange(rowNum, 20).setValue("עמודה P ריקה — גודל קובץ חסר, הרץ S05 קודם");
        if (!firstBadRow) firstBadRow = rowNum;
        errors++;
        return;
      }

      // חפש קובץ TXT ב-Converted_TXT לפי שם קובץ מקורי (עמודה H)
      if (convertedFolder && attachName) {
        const baseName = attachName.replace(/\.[^/.]+$/, ""); // ללא סיומת
        const files    = convertedFolder.getFiles();
        let foundFile  = null;

        while (files.hasNext()) {
          const f = files.next();
          if (f.getName().indexOf(baseName) === 0 && f.getMimeType() === "text/plain") {
            foundFile = f;
            break;
          }
        }

        if (foundFile) {
          // נמצא קובץ TXT — חבר אותו
          sheet.getRange(rowNum, 24).setValue(foundFile.getUrl());
          sheet.getRange(rowNum, 13).setValue("הומר ל-TXT");
          sheet.getRange(rowNum, 19).clearContent();
          sheet.getRange(rowNum, 20).clearContent();
          if (!firstBadRow) firstBadRow = rowNum;
          linked++;
          return;
        }
      }

      // לא נמצא קובץ — ממתין בצדק
      if (pipeline !== "ממתין להמרה ל-TXT") {
        sheet.getRange(rowNum, 13).setValue("ממתין להמרה ל-TXT");
      }
      waiting++;
      return;
    }

    // ── מקרה ב — X מלא ───────────────────────────────────────────────────────
    try {
      const match = txtUrl.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
      if (!match) {
        sheet.getRange(rowNum, 24).clearContent();
        sheet.getRange(rowNum, 13).setValue("ממתין להמרה ל-TXT");
        sheet.getRange(rowNum, 19).setValue("LINK_ERROR");
        sheet.getRange(rowNum, 20).setValue("לינק לא תקין — נוקה");
        if (!firstBadRow) firstBadRow = rowNum;
        fixed++;
        return;
      }

      const txtFileId = match[1];
      let txtFile;
      try {
        txtFile = DriveApp.getFileById(txtFileId);
      } catch (e) {
        sheet.getRange(rowNum, 24).clearContent();
        sheet.getRange(rowNum, 13).setValue("ממתין להמרה ל-TXT");
        sheet.getRange(rowNum, 19).setValue("FILE_NOT_FOUND");
        sheet.getRange(rowNum, 20).setValue("קובץ לא נמצא ב-Drive — לינק נוקה");
        if (!firstBadRow) firstBadRow = rowNum;
        fixed++;
        return;
      }

      // בדוק MIME
      if (txtFile.getMimeType() !== "text/plain") {
        sheet.getRange(rowNum, 24).clearContent();
        sheet.getRange(rowNum, 13).setValue("ממתין להמרה ל-TXT");
        sheet.getRange(rowNum, 19).setValue("WRONG_TYPE");
        sheet.getRange(rowNum, 20).setValue("קובץ לא מסוג TXT — MIME: " + txtFile.getMimeType());
        if (!firstBadRow) firstBadRow = rowNum;
        fixed++;
        return;
      }

      // בדוק תיקייה
      const parents = txtFile.getParents();
      let inCorrectFolder = false;
      while (parents.hasNext()) {
        if (parents.next().getName() === "Converted_TXT") {
          inCorrectFolder = true;
          break;
        }
      }

      if (!inCorrectFolder) {
        sheet.getRange(rowNum, 24).clearContent();
        sheet.getRange(rowNum, 13).setValue("ממתין להמרה ל-TXT");
        sheet.getRange(rowNum, 19).setValue("WRONG_FOLDER");
        sheet.getRange(rowNum, 20).setValue("קובץ לא נמצא בתיקיית Converted_TXT");
        if (!firstBadRow) firstBadRow = rowNum;
        fixed++;
        return;
      }

      // הכל תקין
      sheet.getRange(rowNum, 13).setValue("הומר ל-TXT");
      sheet.getRange(rowNum, 19).clearContent();
      sheet.getRange(rowNum, 20).clearContent();
      valid++;

    } catch (e) {
      Logger.log("שגיאה בשורה " + rowNum + ": " + e.message);
      sheet.getRange(rowNum, 19).setValue("UNKNOWN");
      sheet.getRange(rowNum, 20).setValue("שגיאה: " + e.message.substring(0, 80));
      if (!firstBadRow) firstBadRow = rowNum;
      errors++;
    }

    SpreadsheetApp.flush();
    Utilities.sleep(100);
  });

  ui.alert(
    "בדיקת לינקי TXT",
    "✅ תקינים: "         + valid   + "\n" +
    "🔗 חוברו מחדש: "    + linked  + "\n" +
    "🔄 ממתינים להמרה: " + waiting + "\n" +
    "🗑️ לינקים שגויים: " + fixed   + "\n" +
    "❌ שגיאות: "         + errors,
    ui.ButtonSet.OK
  );

  if (firstBadRow) {
    sheet.getRange(firstBadRow, 13).activate();
  } else {
    sheet.getRange(2, 13).activate();
  }
}

// ── פונקציית עזר ─────────────────────────────────────────────────────────────

function colToLetter(num) {
  let letter = "";
  while (num > 0) {
    const mod = (num - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    num = Math.floor((num - 1) / 26);
  }
  return letter;
}
