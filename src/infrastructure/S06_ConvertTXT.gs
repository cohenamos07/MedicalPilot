/**
 * MedicalPilot — S06_ConvertTXT.gs
 * @version 1.7.0 | @updated 11/08/2026 17:38 | @service S06
 * @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S06_ConvertTXT.gs
 * @description המרת קבצים לפורמט TXT מובנה — 6 מסלולים לפי סוג קובץ.
 *              PDF→Visual, DOCX→Direct, GDoc→Doc, IMG→Image, TXT→Text, Sheet→Sheet.
 *              כותב לעמודות M, O, P, Q, S, T, X. שומר קובץ TXT בתיקיית Converted_TXT.
 *              מופעל מהתפריט (שורה / עמודה M לאצווה) ומטריגר לילי.
 * @impacts     ניהול_מיילים: כותב לעמודות M(13), O(15), P(16), Q(17), S(19), T(20), X(24), U(21).
 *              תלויות: GEMINI_API_KEY, מנהל_משאבים, Drive API, גליון ניהול_מיילים.
 * @callers     runS06Icon (ViewEngine עמודה K) | Menu_LAB | Menu_PROD
 *              nightlyConvertBatch (S_Scheduler — טריגר לילי)
 * @functions   run_MedicalPilot_V2_6_2, _processBatch, _processRow,
 *              execute_Visual_Path, execute_Direct_Path, execute_Doc_Path,
 *              execute_Image_Path, execute_Text_Path, execute_Sheet_Path,
 *              finalize_And_Save_To_Drive, nightlyConvertBatch,
 *              createNightlyTrigger, deleteNightlyTrigger, checkTxtUrlIntegrity, 
 *              _extractDriveId_TxtCheck, _writeTxtCheckResults
 *              _callGemini, _safeParseJson, _writeError, _clearErrors
 *              _visualPathFallbackFreeText_S06
 * @changes     [v1.7.0] Task #175/#176 — execute_Visual_Path: JSON_PARSE_FAIL נבדל מכשל AI אמיתי
 *              (_safeParseJson זורקת שגיאה, לא מחזירה {words:"",...} בשקט — משפיע על כל 6 המסלולים);
 *              maxOutputTokens:16384; fallback טקסט-חופשי חדש (_visualPathFallbackFreeText_S06) כשה-JSON
 *              נכשל — פענוח סלחני שלא תלוי ב-===META===/===END=== (שומר תוכן חלקי בתשובה שנחתכה);
 *              frequencyPenalty/presencePenalty ב-generationConfig להפחתת סיכון ללולאות חזרה של Gemini.
 */
// ══════════════════════════════════════════════════════════════════
// פונקציית ליבה — קריאת Gemini דרך מנהל מחלצים
// ══════════════════════════════════════════════════════════════════

function _callGemini(apiKey, payload, callerName, complexity) {
  const extractor = getAvailableExtractor(complexity || "SIMPLE");
  if (!extractor) {
    throw new Error("429: אין מחלץ זמין — כל המכסות מוצו. נסה מחר.");
  }

  const url = extractor.url + "?key=" + apiKey;

  const response = UrlFetchApp.fetch(url, {
    method:             "post",
    contentType:        "application/json",
    payload:            JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();

  if (code === 200) {
    console.log(callerName + " הצליח עם: " + extractor.id);
    updateExtractorUsage(extractor.id);
    return response;
  }

  if (code === 429) throw new Error("429: מכסה מוצתה ל-" + extractor.id + " — נסה מחר.");
  if (code === 503) throw new Error("503: שרת עמוס ל-" + extractor.id + " — נסה שוב.");

  throw new Error(callerName + " נכשל (" + code + "): " + response.getContentText().substring(0, 200));
}

// ══════════════════════════════════════════════════════════════════
// פענוח JSON בטוח — מטפל ב-JSON פגום
// ══════════════════════════════════════════════════════════════════

function _safeParseJson(text, callerName) {
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    Logger.log(callerName + " — JSON פגום: " + e.message + " | טקסט: " + text.substring(0, 200));
   throw new Error("JSON_PARSE_FAIL: " + callerName + " — תשובת AI לא תקינה כ-JSON (ככל הנראה נחתכה) — " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// כתיבת שגיאה לגליון
// ══════════════════════════════════════════════════════════════════

function _writeError(sheet, row, msg) {
  const isOverload  = msg.includes("503") || msg.includes("UNAVAILABLE");
  const isQuota     = msg.includes("429") || msg.includes("quota");
  const isAccess    = msg.includes("ACCESS") || msg.includes("Drive");
  const isJsonParse = msg.includes("JSON_PARSE_FAIL");

  const errorCode = isOverload  ? "503" :
                    isQuota     ? "429" :
                    isAccess    ? "ACCESS" :
                    isJsonParse ? "JSON_PARSE" : "UNKNOWN";

  const errorDetail = isOverload  ? "עומס — דולג לעכשיו" :
                      isQuota     ? "מכסה יומית מוצתה — נסה מחר" :
                      isAccess    ? "שגיאת גישה: " + msg.substring(0, 80) :
                      isJsonParse ? "תשובת AI לא תקינה — כנראה נחתכה — כדאי לנסות שוב: " + msg.substring(0, 80) :
                                   "שגיאה: " + msg.substring(0, 100);

  sheet.getRange(row, 19).setValue(errorCode);
  sheet.getRange(row, 20).setValue(errorDetail);
  sheet.getRange(row, 19).activate();
}

// ══════════════════════════════════════════════════════════════════
// ניקוי שגיאות קודמות
// ══════════════════════════════════════════════════════════════════

function _clearErrors(sheet, row) {
  sheet.getRange(row, 19).clearContent();
  sheet.getRange(row, 20).clearContent();
}

// ══════════════════════════════════════════════════════════════════
// [FIX-1] נקודת כניסה ראשית — לוגיקה כמו S07
// ══════════════════════════════════════════════════════════════════

function run_MedicalPilot_V2_6_2() {
  const sheet       = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ניהול_מיילים");
  const firstRow    = SHEET_CONFIG["ניהול_מיילים"].FIRST_DATA_ROW;
  const activeRange = sheet.getActiveRange();
  const activeRow   = sheet.getActiveCell().getRow();
  const activeCol   = sheet.getActiveCell().getColumn();

  if (activeRange.getNumColumns() >= sheet.getMaxColumns()) {
    if (activeRow < firstRow) {
      SpreadsheetApp.getUi().alert("⚠️ שורה מוגנת (1-" + (firstRow - 1) + ") — לא ניתן לעבד.");
      return;
    }
    _clearErrors(sheet, activeRow);
    _processRow(sheet, activeRow);
    return;
  }

  if (activeCol === 13) {
    _processBatch(sheet, 3);
    return;
  }

  if (activeRow < firstRow) {
    SpreadsheetApp.getUi().alert("⚠️ שורה מוגנת (1-" + (firstRow - 1) + ") — לא ניתן לעבד.");
    return;
  }
  _clearErrors(sheet, activeRow);
  _processRow(sheet, activeRow);
}

// ══════════════════════════════════════════════════════════════════
// [FIX-2][FIX-3][FIX-4] עיבוד אצווה — 3 שורות, Sleep, דילוג חכם
// ══════════════════════════════════════════════════════════════════

function _processBatch(sheet, batchSize) {
  const firstRow    = SHEET_CONFIG["ניהול_מיילים"].FIRST_DATA_ROW;
  const lastRow     = sheet.getLastRow();
  let processed     = 0;
  let lastProcessed = firstRow;

  for (let i = firstRow; i <= lastRow && processed < batchSize; i++) {

    // תנאי 1 — חייב File_ID
    const fileId = sheet.getRange(i, 1).getValue();
    if (!fileId) continue;

    // תנאי 2 — דלג אם כבר יש לינק TXT
    const existingLink = sheet.getRange(i, 24).getValue();
    if (existingLink && existingLink.toString().trim() !== "") continue;

    // תנאי 3 — דלג אם Pipeline_Status = "הומר ל-TXT"
    const pipeline = sheet.getRange(i, 13).getValue();
    if (pipeline === "הומר ל-TXT") continue;

    // [FIX-4] תנאי 4 — דילוג חכם לפי סוג שגיאה
    const errorCode = sheet.getRange(i, 19).getValue();
    if (errorCode) {
      const isTemporary = errorCode === "503" || errorCode === "429";
      if (!isTemporary) continue; // שגיאה קבועה — דלג
      // שגיאה זמנית — נסה שוב (ממשיך)
    }

    _clearErrors(sheet, i);
    _processRow(sheet, i);
    lastProcessed = i;
    processed++;
    SpreadsheetApp.flush();

    // [FIX-3] Sleep בין שורות — מניעת 503
    if (processed < batchSize) Utilities.sleep(8000);
  }

  sheet.getRange(lastProcessed, 13).activate();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    "הושלמו " + processed + " שורות", "MedicalPilot S06", 4
  );
}

// ══════════════════════════════════════════════════════════════════
// עיבוד שורה בודדת
// ══════════════════════════════════════════════════════════════════

function _processRow(sheet, row) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  console.log("--- שורה: " + row + " ---");

  try {
    const fileId = sheet.getRange(row, 1).getValue() ||
                   (sheet.getRange(row, 23).getValue() ?
                    sheet.getRange(row, 23).getValue().match(/[-\w]{25,}/) ?
                    sheet.getRange(row, 23).getValue().match(/[-\w]{25,}/)[0] : null : null);

    if (!fileId) {
      sheet.getRange(row, 19).setValue("NO_ID");
      sheet.getRange(row, 20).setValue("לא נמצא File ID — בדוק עמודה A");
      sheet.getRange(row, 19).activate();
      return;
    }

    const file              = DriveApp.getFileById(fileId);
    const mimeType          = file.getMimeType();
    const fileSizeActual    = file.getSize();
    const fileSizeFormatted = fileSizeActual < 1048576
      ? Math.round(fileSizeActual / 1024) + " KB"
      : (fileSizeActual / 1048576).toFixed(2) + " MB";

    console.log("סוג: " + mimeType);

    let systemType;
    let resultData;

    if (mimeType === MimeType.PDF) {
      systemType = "SYSTEM_PDF";
      resultData = execute_Visual_Path(file, apiKey);

    } else if (mimeType === "image/jpeg" || mimeType === "image/png" || mimeType.includes("image/")) {
      systemType = "SYSTEM_IMG";
      resultData = execute_Image_Path(file, apiKey);

    } else if (mimeType === MimeType.GOOGLE_DOCS) {
      systemType = "SYSTEM_GDOC";
      resultData = execute_Doc_Path(file, apiKey);

    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      systemType = "SYSTEM_DOCX";
      resultData = execute_Direct_Path(file, apiKey, mimeType, sheet, row);

    } else if (mimeType === "text/plain" || mimeType === "text/csv" || mimeType.includes("text/")) {
      systemType = "SYSTEM_TXT";
      resultData = execute_Text_Path(file, apiKey);

    } else if (
      mimeType === MimeType.GOOGLE_SHEETS ||
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/vnd.ms-excel"
    ) {
      systemType = "SYSTEM_SHEET";
      resultData = execute_Sheet_Path(file, apiKey, mimeType);

    } else {
      sheet.getRange(row, 19).setValue("UNSUPPORTED");
      sheet.getRange(row, 20).setValue("לא נתמך: " + mimeType);
      sheet.getRange(row, 19).activate();
      return;
    }

    finalize_And_Save_To_Drive(row, file, resultData, systemType, fileSizeFormatted, sheet);

  } catch (e) {
    console.error("שגיאה שורה " + row + ": " + e.message);
    _writeError(sheet, row, e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// מסלול 1 — PDF (MEDIUM)
// ══════════════════════════════════════════════════════════════════

function execute_Visual_Path(file, apiKey) {
  const blob       = file.getBlob();
  const base64Data = Utilities.base64Encode(blob.getBytes());
  const prompt = `You are analyzing a document image.
TASK 1: Extract every single word you can read. Separate each word with " | ".
TASK 2: Identify document metadata.
Return ONLY this JSON:
{
  "words": "word1 | word2 | word3 | ...",
  "metadata": {
    "title": "document title in Hebrew",
    "issuer": "issuing organization in Hebrew",
    "category": "one of: רפואי/חשבונאי/משפטי/ביטוחי/אחר",
    "complexity": "one of: פשוט/בינוני/מורכב",
    "docDate": "date if visible"
  }
}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: blob.getContentType(), data: base64Data } }] }],
   generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 16384, frequencyPenalty: 0.5, presencePenalty: 0.4 }
  };
  try {
    const response  = _callGemini(apiKey, payload, "מסלול 1 PDF", "MEDIUM");
    const res       = JSON.parse(response.getContentText());
    const cleanJson = _safeParseJson(res.candidates[0].content.parts[0].text, "מסלול 1");
    return { words: cleanJson.words || "", m: cleanJson.metadata || {}, isSheet: false };
  } catch (jsonErr) {
    if (jsonErr.message.indexOf("JSON_PARSE_FAIL") === -1) throw jsonErr;
    Logger.log("[S06] מסלול 1 — JSON נכשל, עובר לניסיון fallback בטקסט חופשי: " + jsonErr.message);
    return _visualPathFallbackFreeText_S06(blob, base64Data, apiKey);
  }
}

// ══════════════════════════════════════════════════════════════════
// מסלול 1 — Fallback טקסט חופשי (כש-JSON הרגיל נכשל בפענוח)
// ══════════════════════════════════════════════════════════════════

function _visualPathFallbackFreeText_S06(blob, base64Data, apiKey) {
  const prompt = `You are analyzing a document image.
Do NOT use JSON. Return plain text in EXACTLY this format, with no extra commentary:
===WORDS===
word1 | word2 | word3 | ...
===META===
TITLE: document title in Hebrew
ISSUER: issuing organization in Hebrew
CATEGORY: one of: רפואי/חשבונאי/משפטי/ביטוחי/אחר
COMPLEXITY: one of: פשוט/בינוני/מורכב
DOCDATE: date if visible
===END===`;
  const payload = {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: blob.getContentType(), data: base64Data } }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 16384, frequencyPenalty: 0.5, presencePenalty: 0.4 }
  };
  const response = _callGemini(apiKey, payload, "מסלול 1 PDF fallback", "MEDIUM");
  const res       = JSON.parse(response.getContentText());
  const rawText   = res.candidates[0].content.parts[0].text || "";

  // [H] תיעוד תמיד — לפני כל ניסיון פענוח, כדי לדעת בדיוק מה חזר גם בכישלון
  Logger.log("[S06] מסלול 1 fallback — טקסט גולמי (300 תווים ראשונים): " + rawText.substring(0, 300));

  const wordsStartIdx = rawText.indexOf("===WORDS===");
  if (wordsStartIdx === -1) {
    throw new Error("VISUAL_FALLBACK_PARSE_FAIL: מסלול 1 fallback — הסמן ===WORDS=== לא נמצא בתשובה בכלל");
  }

  const afterWords   = rawText.substring(wordsStartIdx + "===WORDS===".length);
  const metaStartIdx = afterWords.indexOf("===META===");

  // [I] פענוח סלחני — לוקח את מה שיש גם אם ===META===/===END=== חסרים (תשובה נחתכה)
  const words = (metaStartIdx === -1 ? afterWords : afterWords.substring(0, metaStartIdx)).trim();

  const m = {};
  if (metaStartIdx !== -1) {
    const afterMeta   = afterWords.substring(metaStartIdx + "===META===".length);
    const endIdx      = afterMeta.indexOf("===END===");
    const metaBlock   = endIdx === -1 ? afterMeta : afterMeta.substring(0, endIdx);
    const titleM      = metaBlock.match(/TITLE:\s*(.+)/);
    const issuerM     = metaBlock.match(/ISSUER:\s*(.+)/);
    const categoryM   = metaBlock.match(/CATEGORY:\s*(.+)/);
    const complexityM = metaBlock.match(/COMPLEXITY:\s*(.+)/);
    const docDateM    = metaBlock.match(/DOCDATE:\s*(.+)/);
    if (titleM)      m.title      = titleM[1].trim();
    if (issuerM)     m.issuer     = issuerM[1].trim();
    if (categoryM)   m.category   = categoryM[1].trim();
    if (complexityM) m.complexity = complexityM[1].trim();
    if (docDateM)    m.docDate    = docDateM[1].trim();
  } else {
    Logger.log("[S06] מסלול 1 fallback — ===META=== לא נמצא, נשמרות רק המילים ללא מטא-דאטה (תשובה כנראה נחתכה)");
  }

  if (!words) {
    throw new Error("VISUAL_FALLBACK_PARSE_FAIL: מסלול 1 fallback — נמצא ===WORDS=== אך התוכן שאחריו ריק");
  }

  Logger.log("[S06] מסלול 1 fallback הצליח — " + words.split(" | ").length + " מילים" + (metaStartIdx === -1 ? " (ללא מטא-דאטה מלאה)" : ""));
  return { words: words, m: m, isSheet: false };
}

// ══════════════════════════════════════════════════════════════════
// מסלול 2 — DOCX (MEDIUM)
// ══════════════════════════════════════════════════════════════════

function execute_Direct_Path(file, apiKey, mimeType, sheet, row) {
  const tempFile = Drive.Files.copy({title: "Temp_MP"}, file.getId(), {convert: true});
  const rawText  = DocumentApp.openById(tempFile.id).getBody().getText();
  DriveApp.getFileById(tempFile.id).setTrashed(true);
  const prompt = `You are analyzing a document.
TASK 1: Take every word from the text below and list them separated by " | ".
TASK 2: Identify document metadata.
Return ONLY this JSON:
{
  "words": "word1 | word2 | word3 | ...",
  "metadata": {
    "title": "document title in Hebrew",
    "issuer": "issuing organization in Hebrew",
    "category": "one of: רפואי/חשבונאי/משפטי/ביטוחי/אחר",
    "complexity": "one of: פשוט/בינוני/מורכב",
    "docDate": "date if visible"
  }
}
Text:
${rawText.substring(0, 15000)}`;
  const payload   = { contents: [{ parts: [{ text: prompt }] }] };
  const response  = _callGemini(apiKey, payload, "מסלול 2 DOCX", "MEDIUM");
  const res       = JSON.parse(response.getContentText());
  const cleanJson = _safeParseJson(res.candidates[0].content.parts[0].text, "מסלול 2");
  return { words: cleanJson.words || "", m: cleanJson.metadata || {}, isSheet: false };
}

// ══════════════════════════════════════════════════════════════════
// מסלול 3 — Google Docs (SIMPLE)
// ══════════════════════════════════════════════════════════════════

function execute_Doc_Path(file, apiKey) {
  const rawText = DocumentApp.openById(file.getId()).getBody().getText();
  if (!rawText || rawText.trim() === "") throw new Error("מסלול 3: המסמך ריק");
  const prompt = `You are analyzing a document.
TASK 1: Take every word from the text below and list them separated by " | ".
TASK 2: Identify document metadata.
Return ONLY this JSON:
{
  "words": "word1 | word2 | word3 | ...",
  "metadata": {
    "title": "document title in Hebrew",
    "issuer": "issuing organization in Hebrew",
    "category": "one of: רפואי/חשבונאי/משפטי/ביטוחי/אחר",
    "complexity": "one of: פשוט/בינוני/מורכב",
    "docDate": "date if visible"
  }
}
Text:
${rawText.substring(0, 15000)}`;
  const payload   = { contents: [{ parts: [{ text: prompt }] }] };
  const response  = _callGemini(apiKey, payload, "מסלול 3 GDoc", "SIMPLE");
  const res       = JSON.parse(response.getContentText());
  const cleanJson = _safeParseJson(res.candidates[0].content.parts[0].text, "מסלול 3");
  return { words: cleanJson.words || "", m: cleanJson.metadata || {}, isSheet: false };
}

// ══════════════════════════════════════════════════════════════════
// מסלול 4 — תמונה (MEDIUM)
// ══════════════════════════════════════════════════════════════════

function execute_Image_Path(file, apiKey) {
  const blob       = file.getBlob();
  const base64Data = Utilities.base64Encode(blob.getBytes());
  const prompt = `You are analyzing an image that contains text.
TASK 1: Extract every single word visible in the image. Separate each word with " | ".
TASK 2: Identify document metadata.
Return ONLY this JSON:
{
  "words": "word1 | word2 | word3 | ...",
  "metadata": {
    "title": "document title in Hebrew",
    "issuer": "issuing organization in Hebrew",
    "category": "one of: רפואי/חשבונאי/משפטי/ביטוחי/אחר",
    "complexity": "one of: פשוט/בינוני/מורכב",
    "docDate": "date if visible"
  }
}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: blob.getContentType(), data: base64Data } }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
  };
  const response  = _callGemini(apiKey, payload, "מסלול 4 IMG", "MEDIUM");
  const res       = JSON.parse(response.getContentText());
  const cleanJson = _safeParseJson(res.candidates[0].content.parts[0].text, "מסלול 4");
  return { words: cleanJson.words || "", m: cleanJson.metadata || {}, isSheet: false };
}

// ══════════════════════════════════════════════════════════════════
// מסלול 5 — טקסט (SIMPLE)
// ══════════════════════════════════════════════════════════════════

function execute_Text_Path(file, apiKey) {
  const rawText = file.getBlob().getDataAsString();
  if (!rawText || rawText.trim() === "") throw new Error("מסלול 5: הקובץ ריק");
  const prompt = `You are analyzing a text file.
TASK 1: Take every word from the text below and list them separated by " | ".
TASK 2: Identify document metadata.
Return ONLY this JSON:
{
  "words": "word1 | word2 | word3 | ...",
  "metadata": {
    "title": "document title in Hebrew",
    "issuer": "issuing organization in Hebrew",
    "category": "one of: רפואי/חשבונאי/משפטי/ביטוחי/אחר",
    "complexity": "one of: פשוט/בינוני/מורכב",
    "docDate": "date if visible"
  }
}
Text:
${rawText.substring(0, 15000)}`;
  const payload   = { contents: [{ parts: [{ text: prompt }] }] };
  const response  = _callGemini(apiKey, payload, "מסלול 5 TXT", "SIMPLE");
  const res       = JSON.parse(response.getContentText());
  const cleanJson = _safeParseJson(res.candidates[0].content.parts[0].text, "מסלול 5");
  return { words: cleanJson.words || "", m: cleanJson.metadata || {}, isSheet: false };
}

// ══════════════════════════════════════════════════════════════════
// מסלול 6 — גליון (MEDIUM)
// ══════════════════════════════════════════════════════════════════

function execute_Sheet_Path(file, apiKey, mimeType) {
  let spreadsheet;
  let tempFileId = "";
  try {
    if (mimeType === MimeType.GOOGLE_SHEETS) {
      spreadsheet = SpreadsheetApp.openById(file.getId());
    } else {
      const tempFile = Drive.Files.copy({ title: "Temp_Sheet_MP", mimeType: MimeType.GOOGLE_SHEETS }, file.getId(), { convert: true });
      tempFileId     = tempFile.id;
      spreadsheet    = SpreadsheetApp.openById(tempFileId);
    }
  } catch (e) { throw new Error("מסלול 6: לא ניתן לפתוח גליון — " + e.message); }

  const sheetsData = [];
  const allSheets  = spreadsheet.getSheets();
  allSheets.forEach(function(s) {
    const sheetName = s.getName();
    const lastRow   = s.getLastRow();
    const lastCol   = s.getLastColumn();
    if (lastRow < 1 || lastCol < 1) { sheetsData.push({ name: sheetName, rows: 0, fields: [], sums: [] }); return; }
    const headers = s.getRange(1, 1, 1, lastCol).getValues()[0]
      .map(function(h) { return h ? h.toString().trim() : ""; })
      .filter(function(h) { return h !== ""; });
    const sums = [];
    if (lastRow > 1) {
      const dataRange = s.getRange(2, 1, lastRow - 1, lastCol).getValues();
      headers.forEach(function(header, colIndex) {
        let sum = 0; let isNumeric = false;
        dataRange.forEach(function(row) {
          const val = row[colIndex];
          if (typeof val === "number") { sum += val; isNumeric = true; }
        });
        if (isNumeric) sums.push(header + "=" + Math.round(sum * 100) / 100);
      });
    }
    sheetsData.push({ name: sheetName, rows: Math.max(lastRow - 1, 0), fields: headers, sums: sums });
  });

  if (tempFileId) { try { DriveApp.getFileById(tempFileId).setTrashed(true); } catch (e) {} }

  let summary = "גליון אלקטרוני עם " + allSheets.length + " גליונות:\n";
  sheetsData.forEach(function(s, i) {
    summary += "גליון " + (i + 1) + " — " + s.name + " (" + s.rows + " שורות)\n";
    summary += "שדות: " + s.fields.join(", ") + "\n";
  });

  const prompt = `You are analyzing a spreadsheet.
Based on the sheet structure below, return ONLY this JSON:
{
  "metadata": {
    "title": "spreadsheet title in Hebrew",
    "issuer": "issuing organization in Hebrew if identifiable",
    "category": "one of: רפואי/חשבונאי/משפטי/ביטוחי/אחר",
    "complexity": "one of: פשוט/בינוני/מורכב",
    "docDate": "date if identifiable",
    "essence": "one sentence in Hebrew describing what this spreadsheet tracks or manages"
  }
}
Structure:
${summary}`;

  const payload   = { contents: [{ parts: [{ text: prompt }] }] };
  const response  = _callGemini(apiKey, payload, "מסלול 6 Sheet", "MEDIUM");
  const res       = JSON.parse(response.getContentText());
  const cleanJson = _safeParseJson(res.candidates[0].content.parts[0].text, "מסלול 6");
  return { isSheet: true, m: cleanJson.metadata || {}, sheetsData: sheetsData, sheetCount: allSheets.length };
}

// ══════════════════════════════════════════════════════════════════
// שמירה ב-Drive — כולל מחיקת קבצים ישנים
// ══════════════════════════════════════════════════════════════════

function finalize_And_Save_To_Drive(row, sourceFile, data, sysType, size, sheet) {
  const folders      = DriveApp.getFoldersByName("Converted_TXT");
  const targetFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder("Converted_TXT");

  const baseName = sourceFile.getName().replace(/\.[^/.]+$/, "");
  const allFiles = targetFolder.getFiles();
  while (allFiles.hasNext()) {
    const f     = allFiles.next();
    const fName = f.getName();
    if (fName.includes(baseName) && !fName.endsWith(".txt")) {
      f.setTrashed(true);
      Logger.log("נמחק קובץ ישן: " + fName);
    }
  }

  const m   = data.m || {};
  const col = 35;
  let textContent  = "";
  let finalWordCount  = 0;
  let finalSheetCount = 0;

  if (data.isSheet) {
    const sheetCount = data.sheetCount || 0;
    finalSheetCount   = sheetCount;
    const header = [
      "כותרת: "      + (m.title    || "לא זוהה").padEnd(col) + "סוג_מקור:       " + sysType,
      "מנפיק: "      + (m.issuer   || "לא זוהה").padEnd(col) + "מספר_גליונות:   " + sheetCount,
      "תאריך_מסמך: " + (m.docDate  || "לא זוהה").padEnd(col) + "מורכבות:        " + (m.complexity || "פשוט"),
      "קטגוריה: "    + (m.category || "אחר").padEnd(col)      + "גודל_מקור:      " + size,
    ].join("\n");
    const sheetsInfo = (data.sheetsData || []).map(function(s, i) {
      let info = "\nגליון " + (i + 1) + " — " + s.name + " (" + s.rows + " שורות)";
      info += "\nשדות: " + (s.fields.length > 0 ? s.fields.join(" | ") : "לא זוהו");
      if (s.sums.length > 0) info += "\nסכומים: " + s.sums.join(" | ");
      return info;
    }).join("\n");
    textContent = header + "\n" + "=".repeat(65) + "\n" +
                  "מהות: " + (m.essence || "לא זוהה") + "\n" +
                  "─".repeat(65) + sheetsInfo;
  } else {
    const words     = data.words || "";
    const wordCount = words ? words.split(" | ").length : 0;
    finalWordCount   = wordCount;
    textContent = [
      "כותרת: "      + (m.title    || "לא זוהה").padEnd(col) + "סוג_מקור:    " + sysType,
      "מנפיק: "      + (m.issuer   || "לא זוהה").padEnd(col) + "מספר_מילים:  " + wordCount,
      "תאריך_מסמך: " + (m.docDate  || "לא זוהה").padEnd(col) + "מורכבות:     " + (m.complexity || "פשוט"),
      "קטגוריה: "    + (m.category || "אחר").padEnd(col)      + "גודל_מקור:   " + size,
      "\n" + "=".repeat(65) + "\n",
      "פריסת מילים:",
      words
    ].join("\n");
  }

  const timeStamp = Utilities.formatDate(new Date(), "GMT+3", "HHmm");
  const fileName  = baseName + "_" + timeStamp + ".txt";
  const newFile   = targetFolder.createFile(fileName, textContent, MimeType.PLAIN_TEXT);

  sheet.getRange(row, 13).setValue("הומר ל-TXT");
  sheet.getRange(row, 15).setValue(sysType);
  sheet.getRange(row, 16).setValue(size);
  sheet.getRange(row, 17).setValue(m.complexity || "");
  sheet.getRange(row, 24).setValue(newFile.getUrl());
  sheet.getRange(row, 19).clearContent();
  sheet.getRange(row, 20).clearContent();

  const isTextRoute      = !data.isSheet;
  const sourceSizeBytes  = sourceFile.getSize();
  let   isConversionFail = false;
  let   e31FlagValue     = "";

  if (isTextRoute && finalWordCount === 0 && sourceSizeBytes >= 10 * 1024) {
    isConversionFail = true;
    e31FlagValue = "⚠️ E31 — חשד לכשל המרה (0 מילים, קובץ לא קטן) — מומלץ להריץ מחדש S06+S07";
  } else if (data.isSheet && finalSheetCount === 0) {
    isConversionFail = true;
    e31FlagValue = "⚠️ E31 — חשד לכשל המרה (0 גליונות זוהו במסמך Sheet) — מומלץ להריץ מחדש S06+S07";
  }

  if (isConversionFail) {
    sheet.getRange(row, 21).setValue(e31FlagValue);
  }

  sheet.getRange(row, 13).activate();

  console.log("finalize: הושלם — " + fileName);
}

// ══════════════════════════════════════════════════════════════════
// גוב לילי — יועבר ל-S_Scheduler.gs בגרסה הבאה
// ══════════════════════════════════════════════════════════════════

function nightlyConvertBatch() {
  const now  = new Date();
  const hour = now.getHours();
  const min  = now.getMinutes();
  const time = hour * 60 + min;

  const start = 0 * 60 + 30;
  const end   = 7 * 60 + 30;

  if (time < start || time > end) {
    Logger.log("מחוץ לחלון הזמן — " + hour + ":" + min + " — דולג");
    return;
  }

  Logger.log("=== nightlyConvertBatch התחיל — " + hour + ":" + min + " ===");

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ניהול_מיילים");
  if (!sheet) { Logger.log("גליון לא נמצא"); return; }

  const firstRow = SHEET_CONFIG["ניהול_מיילים"].FIRST_DATA_ROW;
  const lastRow  = sheet.getLastRow();
  let processed  = 0;

  for (let i = firstRow; i <= lastRow && processed < 2; i++) {
    const fileId = sheet.getRange(i, 1).getValue();
    if (!fileId) continue;

    const existingLink = sheet.getRange(i, 24).getValue();
    if (existingLink && existingLink.toString().trim() !== "") continue;

    const errorCode = sheet.getRange(i, 19).getValue();
    if (errorCode) {
      sheet.getRange(i, 19).clearContent();
      sheet.getRange(i, 20).clearContent();
    }

    try {
      _processRow(sheet, i);
      processed++;
      SpreadsheetApp.flush();
      Utilities.sleep(8000);
    } catch (e) {
      Logger.log("שגיאה שורה " + i + ": " + e.message);
    }
  }

  Logger.log("=== הושלמו " + processed + " שורות ===");
}

function createNightlyTrigger() {
  const ui = SpreadsheetApp.getUi();
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "nightlyConvertBatch") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("nightlyConvertBatch").timeBased().everyMinutes(30).create();
  ui.alert("✅ טריגר לילי נוצר!\nיריץ 2 שורות כל 30 דקות בין 00:30 ל-07:30\n14 ריצות × 2 שורות = 28 שורות ללילה");
}

function deleteNightlyTrigger() {
  const ui = SpreadsheetApp.getUi();
  let count = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "nightlyConvertBatch") { ScriptApp.deleteTrigger(t); count++; }
  });
  ui.alert("✅ נמחקו " + count + " טריגרים של nightlyConvertBatch");
}

// ══════════════════════════════════════════════════════════════════
// [Task 72] בדיקת תקינות TXT_URL — אבחון בלבד, ללא כתיבה לסטטוסים
// ══════════════════════════════════════════════════════════════════

function checkTxtUrlIntegrity() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ניהול_מיילים");
  if (!sheet) { SpreadsheetApp.getUi().alert("גליון ניהול_מיילים לא נמצא."); return; }

  const cfg      = SHEET_CONFIG["ניהול_מיילים"];
  const startRow = cfg.FIRST_DATA_ROW;
  const lastRow  = sheet.getLastRow();
  if (lastRow < startRow) { SpreadsheetApp.getUi().alert("אין נתונים לבדיקה."); return; }

  const data    = sheet.getRange(startRow, 1, lastRow - startRow + 1, 24).getValues();
  const problems = [];
  let checked = 0;

  for (let i = 0; i < data.length; i++) {
    const rowNum   = startRow + i;
    const fileId   = data[i][0];               // A
    const pipeline = data[i][12];               // M
    const txtUrl   = String(data[i][23] || "").trim(); // X

    if (!fileId) continue;
    if (pipeline !== "הומר ל-TXT") continue;

    checked++;

    if (!txtUrl) {
      problems.push([rowNum, fileId, "", "TXT_URL ריק", ""]);
      continue;
    }

    const driveId = _extractDriveId_TxtCheck(txtUrl);
    if (!driveId) {
      problems.push([rowNum, fileId, txtUrl, "TXT_URL שגוי", "לא נמצא File ID תקין ב-URL"]);
      continue;
    }

    try {
      const content = DriveApp.getFileById(driveId).getBlob().getDataAsString();
      if (!content || content.trim() === "") {
        problems.push([rowNum, fileId, txtUrl, "TXT ריק בדרייב", "הקובץ נמצא אך ריק"]);
      }
    } catch (e) {
      problems.push([rowNum, fileId, txtUrl, "TXT_URL שגוי", String(e.message).substring(0, 100)]);
    }
  }

  _writeTxtCheckResults(ss, problems);

  const msg = problems.length === 0
    ? "✅ כל ה-TXT_URL תקינים (נבדקו " + checked + " שורות)"
    : "נבדקו " + checked + " שורות עם M='הומר ל-TXT' | נמצאו " + problems.length +
      " שורות פגומות | פירוט בגליון TXT_URL_בדיקה";

  SpreadsheetApp.getUi().alert(msg);
}

// ── חילוץ File ID מתוך URL — לוקאלי לבדיקה זו ────────────────────

function _extractDriveId_TxtCheck(url) {
  if (!url) return null;
  const m1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  return null;
}

// ── כתיבת תוצאות לגליון TXT_URL_בדיקה ────────────────────────────

function _writeTxtCheckResults(ss, problems) {
  let sheet = ss.getSheetByName("TXT_URL_בדיקה");
  if (!sheet) {
    sheet = ss.insertSheet("TXT_URL_בדיקה");
    sheet.getRange(1, 1, 1, 5).setValues([
      ["Row_Number", "File_ID", "TXT_URL", "Problem", "Detail"]
    ]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else {
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      sheet.getRange(2, 1, lastRow - 1, 5).clearContent();
    }
  }

  if (problems.length > 0) {
    sheet.getRange(2, 1, problems.length, 5).setValues(problems);
  }
  sheet.autoResizeColumns(1, 5);
}

// ══════════════════════════════════════════════════════════════════
// [Task 97] Diagnostics — count pending-to-TXT rows by Error_Code
//            Read-only: scans ניהול_מיילים and returns/logs a summary
// ══════════════════════════════════════════════════════════════════

function s06_diagnostics_ErrorCodeSummary() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ניהול_מיילים");
  if (!sheet) {
    Logger.log("S06 diag: sheet ניהול_מיילים not found");
    return { total: 0, pending: 0, buckets: {} };
  }

  const cfg      = SHEET_CONFIG["ניהול_מיילים"]; // reuse existing config pattern
  const startRow = cfg.FIRST_DATA_ROW;
  const lastRow  = sheet.getLastRow();
  if (lastRow < startRow) {
    Logger.log("S06 diag: no data rows to scan");
    return { total: 0, pending: 0, buckets: {} };
  }

  // Fetch minimal needed columns once: A(File_ID), M(Pipeline_Status), S(Error_Code), X(TXT_URL)
  const widthAtoX = 24;
  const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, widthAtoX).getValues();

  const buckets = {
    EMPTY: 0,      // no error code set
    ACCESS: 0,
    UNKNOWN: 0,
    NO_ID: 0,
    UNSUPPORTED: 0,
    "429": 0,
    "503": 0,
    OTHER: 0
  };

  let total = 0;
  let pending = 0; // rows that are still candidates for TXT conversion

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const fileId   = (row[0]  || "").toString().trim();      // A
    const pipeline = (row[12] || "").toString().trim();      // M
    const errCode  = (row[18] || "").toString().trim();      // S (19)
    const txtUrl   = (row[23] || "").toString().trim();      // X (24)

    if (!fileId) continue; // skip empty rows
    total++;

    // Consider as pending-to-TXT if no TXT link yet and not already marked as converted
    const isConverted = pipeline === "הומר ל-TXT";
    const hasTxtLink  = txtUrl !== "";
    if (!isConverted && !hasTxtLink) pending++;

    // Bucketize error codes observed, regardless of pending state — gives a full picture
    if (!errCode) {
      buckets.EMPTY++;
    } else if (errCode === "ACCESS") {
      buckets.ACCESS++;
    } else if (errCode === "UNKNOWN") {
      buckets.UNKNOWN++;
    } else if (errCode === "NO_ID") {
      buckets.NO_ID++;
    } else if (errCode === "UNSUPPORTED") {
      buckets.UNSUPPORTED++;
    } else if (errCode === "429") {
      buckets["429"]++;
    } else if (errCode === "503") {
      buckets["503"]++;
    } else {
      buckets.OTHER++;
    }
  }

  const sumKnown = buckets.EMPTY + buckets.ACCESS + buckets.UNKNOWN + buckets.NO_ID + buckets.UNSUPPORTED + buckets["429"] + buckets["503"] + buckets.OTHER;
  Logger.log("S06 diagnostics — Error_Code summary");
  Logger.log("Rows scanned: " + total + ", pending-to-TXT: " + pending);
  Logger.log("EMPTY=" + buckets.EMPTY + ", ACCESS=" + buckets.ACCESS + ", UNKNOWN=" + buckets.UNKNOWN + ", NO_ID=" + buckets.NO_ID + ", UNSUPPORTED=" + buckets.UNSUPPORTED + ", 429=" + buckets["429"] + ", 503=" + buckets["503"] + ", OTHER=" + buckets.OTHER + "; totalBucketed=" + sumKnown);

  return { total: total, pending: pending, buckets: buckets };
}
