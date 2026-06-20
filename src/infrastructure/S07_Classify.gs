/**
 * @file        S07_Classify.gs
 * @version     2.5.1 | @updated 20/06/2026 22:08 | @service S07
 * @git         src/infrastructure/S07_Classify.gs
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
 *              קורא: X(24)=TXT_URL | Z(26)=Raw_Text
 *              תלויות: GEMINI_API_KEY, COLUMN_MAP.SHEETS_MAP,
 *                      מנהל_משאבים (getAvailableExtractor),
 *                      דוגמאות_למידה (גליון)
 * @callers     runS07Icon (ViewEngine) | classifyDocument (תפריט)
 *              nightlyConvertBatch (S_Scheduler — אצווה לילית)
 * @functions   classifyDocument | run_S07_ActiveRow | executeS07Classification
 *              _processS07Batch | _getS07ColumnMap | _getColDefByName
 *              _safeWrite | _safeClear | _callAiWithFullPrompt_S07
 *              _validateAiResult_S07 | _isFilled_S07 | _countFilledFields_S07
 *              _fetchTextFromUrl_S07 | _getLearningExamples_S07
 *              _calculateDuplicates_S07 | _extractTxtHeader_S07
 *              S07_ValidateWritePermissions
 * @changes     [v2.5.1] תיקון קריטי — classifyDocument, _processS07Batch,
 *                       executeS07Classification התחילו משורה 2 — עכשיו
 *                       SHEET_CONFIG.FIRST_DATA_ROW (5), כמו S06 ו-S05
 *              [v2.5.0] תיקון Duplicate_Flag — פורמט: "כפול מאושר — שורה X | ניקוד Y/5"
 *                       סימטריה: כתיבת Duplicate_Flag גם בשורת הכפול
 *                       _calculateDuplicates_S07 מחזירה { sheetRow, score } במקום מספר בלבד
 *              [v2.4.0] תיקון Complexity — דינמי מ-Gemini בעברית במקום 'SIMPLE' קשיח
 *                       הוספת complexity לפרומפט AI — ערכים: פשוט / בינוני / מורכב
 *                       כותרת מורחבת לפי סטנדרט
 *              [v2.3.6] שיפור _calculateDuplicates_S07 — 5 קריטריונים, סף 3/5
 *              [v2.3.5] תיקון _calculateDuplicates_S07 — מחזיר מספר שורה
 *              [v2.3.4] טריגר אצווה עבר לעמודה M | גודל אצווה 3
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
  executeS07Classification(activeRow);
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
    if (pipeline === "מחולץ") continue;

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

    // [v2.5.0] כפולים — { sheetRow, score } + סימטריה
    const dupResult = _calculateDuplicates_S07(row, sheet, fullText);
    if (dupResult) {
      const dupFlag = "כפול מאושר — שורה " + dupResult.sheetRow + " | ניקוד " + dupResult.score + "/5";
      _safeWrite(sheet, row, "Duplicate_Flag", dupFlag);
      try {
        const mirrorFlag = "כפול מאושר — שורה " + row + " | ניקוד " + dupResult.score + "/5";
        _safeWrite(sheet, dupResult.sheetRow, "Duplicate_Flag", mirrorFlag);
      } catch (mirrorErr) {
        Logger.log("[S07] סימטריה — לא הצליח לכתוב לשורה " + dupResult.sheetRow + ": " + mirrorErr.message);
      }
    }

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

    _safeWrite(sheet, row, "Doc_Title",         aiResult.title      || "");
    _safeWrite(sheet, row, "Doc_Issuer",         aiResult.issuer     || "");
    _safeWrite(sheet, row, "Doc_Date",           aiResult.date       || "");
    _safeWrite(sheet, row, "Doc_Category",       aiResult.category   || "");
    _safeWrite(sheet, row, "Complexity",         aiResult.complexity || "בינוני");

    const extractionStatus = filled === 4 ? "חולץ מלא" : "חולץ חלקי";
    _safeWrite(sheet, row, "Extraction_Status", extractionStatus);
    _safeWrite(sheet, row, "Pipeline_Status",   "מחולץ");

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
// [v2.5.0] בדיקת כפולים — מחזירה { sheetRow, score } או null
// ══════════════════════════════════════════════════════════════════

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
  });
  return result;
}

function _calculateDuplicates_S07(currentRow, sheet, currentTxtContent) {
  const MAX_ROWS = 500;
  const lastRow  = Math.min(sheet.getLastRow(), MAX_ROWS);
  if (lastRow < 2) return null;

  const currentMeta = _extractTxtHeader_S07(currentTxtContent);
  if (!currentMeta.title && !currentMeta.issuer && !currentMeta.date) return null;

  // ── שלב 1: קריאה אחת של עמודות I, J, K, X לזיכרון ──────────────
  const rangeData = sheet.getRange(2, 9, lastRow - 1, 16).getValues();
  // col 9=I(0), 10=J(1), 11=K(2) ... 24=X(15)

  const candidates = [];

  // ── שלב 2: סינון ראשוני לפי נתוני גליון בלבד ────────────────────
  for (var i = 0; i < rangeData.length; i++) {
    const sheetRow = i + 2;
    if (sheetRow === currentRow) continue;

    const rowTitle  = String(rangeData[i][0]  || "").trim(); // I
    const rowIssuer = String(rangeData[i][1]  || "").trim(); // J
    const rowDate   = String(rangeData[i][2]  || "").trim(); // K
    const rowTxtUrl = String(rangeData[i][15] || "").trim(); // X(24)

    if (!rowTxtUrl) continue;

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
    "{ \"title\": \"\", \"issuer\": \"\", \"date\": \"\", \"category\": \"\", \"complexity\": \"\" }\n" +
    "ערכי category חוקיים: רפואי / חשבונאי / משפטי / ביטוחי / אחר\n" +
    "ערכי complexity חוקיים: פשוט / בינוני / מורכב\n" +
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