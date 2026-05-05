/**
 * MedicalPilot — S07_Classify.gs
 * סיווג מסמכים רפואיים בעזרת Gemini — כותרת, מנפיק, תאריך, קטגוריה
 * @version 2.3.4 | @updated 04/05/2026 13:15 | @service S07
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/S07_Classify.gs
 * שינוי: [FIX-6] טריגר אצווה עבר מעמודה A לעמודה M
 *         [FIX-7] גודל אצווה הוקטן מ-5 ל-3
 * עמודות: I=9 Doc_Title | J=10 Doc_Issuer | K=11 Doc_Date | L=12 Doc_Category |
 *          M=13 Pipeline_Status | N=14 Extraction_Status | Q=17 Complexity |
 *          R=18 Duplicate_Flag | S=19 Error_Code | T=20 Error_Detail
 */

// ══════════════════════════════════════════════════════════════════
// גשר לתפריט
// ══════════════════════════════════════════════════════════════════

function classifyDocument() {
  const sheet       = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ניהול_מיילים");
  const activeRange = sheet.getActiveRange();
  const activeRow   = sheet.getActiveCell().getRow();
  const activeCol   = sheet.getActiveCell().getColumn();

  // שורה שלמה נבחרה → ריצה בודדת
  if (activeRange.getNumColumns() >= sheet.getMaxColumns()) {
    if (activeRow < 2) {
      SpreadsheetApp.getUi().alert("⚠️ שורת כותרת — לא ניתן לסווג.");
      return;
    }
    executeS07Classification(activeRow);
    return;
  }

  // [FIX-6] סמן על עמודה M → אצווה
  if (activeCol === 13) {
    _processS07Batch(sheet, 3);
    return;
  }

  // כל תא אחר → ריצה בודדת על אותה שורה
  if (activeRow < 2) {
    SpreadsheetApp.getUi().alert("⚠️ שורת כותרת — לא ניתן לסווג.");
    return;
  }
  executeS07Classification(activeRow);
}

// ══════════════════════════════════════════════════════════════════
// עיבוד אצווה — דולג בכישלון, לא עוצר
// ══════════════════════════════════════════════════════════════════

function _processS07Batch(sheet, batchSize) {
  const lastRow     = sheet.getLastRow();
  let processed     = 0;
  let lastProcessed = 2;

  for (let i = 2; i <= lastRow && processed < batchSize; i++) {

    // תנאי 1 — חייבת להיות File_ID
    const fileId = sheet.getRange(i, 1).getValue();
    if (!fileId) continue;

    // תנאי 2 — דלג אם כבר מחולץ לפי Pipeline_Status
    const pipeline = sheet.getRange(i, 13).getValue();
    if (pipeline === "מחולץ") continue;

    // תנאי 3 — [FIX-5] דלג אם Doc_Title כבר מלא
    const docTitle = sheet.getRange(i, 9).getValue();
    if (docTitle) continue;

    // תנאי 4 — שגיאות זמניות ינסו שוב, קבועות ידולגו
    const errorCode   = sheet.getRange(i, 19).getValue();
    if (errorCode === "S07_ERR") {
      const errorDetail = sheet.getRange(i, 20).getValue();
      const isTemporary = errorDetail && (
        errorDetail.includes("429") ||
        errorDetail.includes("503")
      );
      if (!isTemporary) continue;
    }

    // תנאי 5 — חייב להיות TXT_URL
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
// פונקציית ליבה — מחזירה true בהצלחה, false בכישלון
// ══════════════════════════════════════════════════════════════════

function executeS07Classification(row) {

  if (row < 2) {
    Logger.log("[S07] דולג — שורה " + row + " היא כותרת.");
    return false;
  }

  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = ss.getSheetByName("ניהול_מיילים") || ss.getActiveSheet();
  const COL     = _getS07ColumnMap();
  const lastCol = sheet.getLastColumn();
  const data    = sheet.getRange(row, 1, 1, lastCol).getValues()[0];

  // [FIX-4] ניקוי S, T, M, N בתחילת כל ניסיון
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

    if (_calculateDuplicates_S07(row, sheet, COL["TXT_URL"]))
      _safeWrite(sheet, row, "Duplicate_Flag", "חשוד ככפול");

    const extractor = getAvailableExtractor("SIMPLE");
    if (!extractor) throw new Error("NO_FREE_EXTRACTOR: Flash מוצה — נסה מחר");
    console.log("[S07] מחלץ: " + extractor.id);

    const examples = _getLearningExamples_S07(ss);

    const aiResult = _callAiWithFullPrompt_S07(
      fullText.substring(0, 3800), extractor, examples
    );

    if (!aiResult || Object.keys(aiResult).length === 0)
      throw new Error("AI_EMPTY_RESPONSE: AI החזיר תשובה ריקה");

    _validateAiResult_S07(aiResult);

    const filled = _countFilledFields_S07(aiResult);
    if (filled < 2)
      throw new Error("AI_RESULT_TOO_WEAK: רק " + filled + " שדות — לא מספיק");

    _safeWrite(sheet, row, "Doc_Title",    aiResult.title    || "");
    _safeWrite(sheet, row, "Doc_Issuer",   aiResult.issuer   || "");
    _safeWrite(sheet, row, "Doc_Date",     aiResult.date     || "");
    _safeWrite(sheet, row, "Doc_Category", aiResult.category || "");
    _safeWrite(sheet, row, "Complexity", "SIMPLE");

    const extractionStatus = filled === 4 ? "חולץ מלא" : "חולץ חלקי";
    _safeWrite(sheet, row, "Extraction_Status", extractionStatus);
    _safeWrite(sheet, row, "Pipeline_Status", "מחולץ");

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
// בדיקת כפולים לפי TXT_URL
// ══════════════════════════════════════════════════════════════════

function _calculateDuplicates_S07(currentRow, sheet, txtUrlColIndex) {
  const MAX_ROWS = 500;
  const lastRow  = Math.min(sheet.getLastRow(), MAX_ROWS);
  if (lastRow < 2) return false;

  const currentUrl = (sheet.getRange(currentRow, txtUrlColIndex).getValue() || "").toLowerCase();
  if (!currentUrl) return false;

  const allUrls = sheet.getRange(2, txtUrlColIndex, lastRow - 1).getValues();
  for (var i = 0; i < allUrls.length; i++) {
    const rowIndex = i + 2;
    if (rowIndex === currentRow) continue;
    const cell = (allUrls[i][0] || "").toLowerCase();
    if (cell && cell === currentUrl) return true;
  }
  return false;
}

// ══════════════════════════════════════════════════════════════════
// דוגמאות למידה
// ══════════════════════════════════════════════════════════════════

function _getLearningExamples_S07(ss) {
  try {
    const exSheet = ss.getSheetByName("דוגמאות_למידה");
    if (!exSheet) return "";
    const lastRow = exSheet.getLastRow();
    if (lastRow < 2) return "";
    const data = exSheet.getRange(2, 1, Math.min(lastRow - 1, 3), 3).getValues();
    let out = "\n--- דוגמאות לסיווג נכון ---\n";
    data.forEach(function(r) {
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
    "{ \"title\": \"\", \"issuer\": \"\", \"date\": \"\", \"category\": \"\" }\n" +
    "ערכי category חוקיים: רפואי / חשבונאי / משפטי / ביטוחי / אחר\n" +
    "חובה למלא לפחות title ו-category.\n" +
    examples +
    "\nהטקסט:\n" + text;

  const url = extractor.url + "?key=" + apiKey;

  const response = UrlFetchApp.fetch(url, {
    method:             "post",
    contentType:        "application/json",
    payload:            JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }),
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
// ולידציה מחמירה
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

  const allowed = ["רפואי", "חשבונאי", "משפטי", "ביטוחי", "אחר"];
  if (allowed.indexOf(ai.category.trim()) === -1)
    throw new Error("VALIDATION_FAIL_CATEGORY: לא חוקית — " + ai.category);

  if (_isFilled_S07(ai.issuer) && ai.issuer.trim().length < 3)
    throw new Error("VALIDATION_FAIL_ISSUER: מנפיק קצר מדי");

  if (_isFilled_S07(ai.date) && ai.date.trim().length < 4)
    throw new Error("VALIDATION_FAIL_DATE: תאריך קצר מדי");
}

// ══════════════════════════════════════════════════════════════════
// קריאת טקסט מ-TXT_URL — זורק שגיאה אמיתית
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