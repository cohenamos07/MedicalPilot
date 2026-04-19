/**
 * Module: S07_Classify
 * Version: 1.4.0
 * Updated: 19/04/2026
 * Service: S07
 * שינויים: תמיכה בטווח שורות, זיהוי PDF/IMG/OFFICE, מצב השלמה, חישוב כפולים נפרד
 */

/**
 * נקודת הכניסה הראשית.
 * תומכת בעיבוד שורה בודדת או טווח שורות שנבחר.
 * מציגה הודעת סיכום בסיום.
 */
function classifyDocument() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ניהול_מיילים");
  if (!sheet) return;

  const range = sheet.getActiveRange();
  const startRow = range.getRow();
  const numRows = range.getNumRows();
  const ui = SpreadsheetApp.getUi();

  if (startRow < 2) {
    ui.alert("נא לבחור שורות בטווח הנתונים (החל משורה 2).");
    return;
  }

  let processedCount = 0;
  let conversionCount = 0;
  let failedCount = 0;

  Logger.log("מתחיל עיבוד: שורה " + startRow + " עד " + (startRow + numRows - 1));

  for (let i = 0; i < numRows; i++) {
    const currentRow = startRow + i;
    try {
      const result = classifyActiveRow(currentRow, sheet, ss);
      if (result === "needs_conversion") conversionCount++;
      else processedCount++;
    } catch (e) {
      Logger.log("שגיאה בשורה " + currentRow + ": " + e.message);
      failedCount++;
    }
  }

  ui.alert(
    "סיום עיבוד:\n" +
    "סווגו: "          + processedCount  + " שורות\n" +
    "נדרשת המרה: "     + conversionCount + " שורות\n" +
    "נכשלו: "          + failedCount     + " שורות"
  );
}

/**
 * מעבד שורה ספציפית בגיליון.
 * @param {number} row מספר השורה לעיבוד
 * @param {Sheet} sheet הגיליון
 * @param {Spreadsheet} ss הספרדשיט
 * @return {string} "completed" | "needs_conversion" | "success" | "error"
 */
function classifyActiveRow(row, sheet, ss) {
  const rowData    = sheet.getRange(row, 1, 1, 26).getValues()[0];
  const title      = rowData[8];  // עמודה I
  const issuer     = rowData[9];  // עמודה J
  const sourceType = rowData[20]; // עמודה U
  const ocrLink    = rowData[21]; // עמודה V
  const complexity = rowData[24]; // עמודה Y

  // ── זיהוי סוג קובץ לא נגיש ────────────────────────────────────────────────
  if (sourceType === "PDF/IMG") {
    sheet.getRange(row, 11).setValue("נדרשת המרה");
    sheet.getRange(row, 20).setValue("קובץ PDF/IMG — יש להריץ OCR תחילה");
    sheet.getRange(row, 11).activate();
    Logger.log("שורה " + row + ": PDF/IMG — נדרשת המרה");
    return "needs_conversion";
  }

  if (sourceType === "OFFICE") {
    sheet.getRange(row, 11).setValue("נדרשת המרה");
    sheet.getRange(row, 20).setValue("קובץ Office — יש להמיר לGoogle Doc תחילה");
    sheet.getRange(row, 11).activate();
    Logger.log("שורה " + row + ": OFFICE — נדרשת המרה");
    return "needs_conversion";
  }

  // ── מצב השלמה — כותרת קיימת אך מורכבות חסרה ─────────────────────────────
  if (title && title.toString().trim() !== "" &&
      (!complexity || complexity.toString().trim() === "")) {
    Logger.log("שורה " + row + ": מצב השלמה — חישוב כפולים ומורכבות");

    const duplicateResult      = _calculateDuplicates(row, title, issuer, sheet);
    const calculatedComplexity = title.length > 50 ? "מורכב" : "פשוט";

    sheet.getRange(row, 11).setValue("הושלם חישוב");
    sheet.getRange(row, 20).clearContent();
    sheet.getRange(row, 25).setValue(calculatedComplexity);
    sheet.getRange(row, 26).setValue(duplicateResult);
    sheet.getRange(row, 25).activate();
    return "completed";
  }

  // ── סיווג AI מלא ──────────────────────────────────────────────────────────
  if (!ocrLink || typeof ocrLink !== 'string' || !ocrLink.includes("docs.google.com")) {
    throw new Error("אין לינק OCR תקין בעמודה V");
  }

  try {
    sheet.getRange(row, 11).setValue("⏳ מעבד...");

    const docId = ocrLink.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
    if (!docId) throw new Error("לא ניתן לחלץ מזהה מסמך מהלינק");

    Logger.log("שורה " + row + " | docId: " + docId);

    const docText = _getDocText(docId);

    if (!docText || docText.trim().length === 0) {
      sheet.getRange(row, 11).setValue("אין גישה לטקסט");
      sheet.getRange(row, 20).setValue("המסמך לא נגיש לקריאה — הרשאות חסרות");
      sheet.getRange(row, 20).activate();
      return "error";
    }

    let examplesText = "";
    const learningSheet = ss.getSheetByName("דוגמאות_למידה");
    if (learningSheet) {
      const lastRow = learningSheet.getLastRow();
      if (lastRow > 1) {
        const learnData = learningSheet.getRange(2, 1, Math.min(lastRow - 1, 10), 3).getValues();
        examplesText = learnData.map(function(r) {
          return "כותרת: " + r[0] + " | מנפיק: " + r[1] + " | סיווג: " + r[2];
        }).join("\n");
      }
    }

    const aiResult     = _callGemini_S07(docText, examplesText);
    const duplicateInfo = _calculateDuplicates(row, aiResult.title, aiResult.issuer, sheet);

    sheet.getRange(row, 9).setValue(aiResult.title);
    sheet.getRange(row, 10).setValue(aiResult.issuer);
    sheet.getRange(row, 11).setValue("סווג בהצלחה");
    sheet.getRange(row, 12).setValue(aiResult.classification);
    sheet.getRange(row, 20).clearContent();
    sheet.getRange(row, 25).setValue(aiResult.complexity);
    sheet.getRange(row, 26).setValue(duplicateInfo);
    sheet.getRange(row, 9).activate();

    Logger.log("שורה " + row + ": סווג בהצלחה — " + aiResult.title);
    return "success";

  } catch (e) {
    sheet.getRange(row, 11).setValue("נכשל");
    sheet.getRange(row, 20).setValue("שגיאה: " + e.message);
    sheet.getRange(row, 20).activate();
    Logger.log("שגיאה בשורה " + row + ": " + e.message);
    throw e;
  }
}

/**
 * מחשבת שורות כפולות לפי כותרת ומנפיק.
 * @param {number} currentRow השורה הנוכחית
 * @param {string} title כותרת המסמך
 * @param {string} issuer המנפיק
 * @param {Sheet} sheet הגיליון
 * @return {string} מחרוזת כפולים או ריק
 */
function _calculateDuplicates(currentRow, title, issuer, sheet) {
  const allData     = sheet.getDataRange().getValues();
  const duplicateRows = [];
  for (let i = 1; i < allData.length; i++) {
    if (i + 1 === currentRow) continue;
    if (allData[i][8] === title && allData[i][9] === issuer) {
      duplicateRows.push(i + 1);
    }
  }
  return duplicateRows.length > 0
    ? "חשוד ככפול — שורות: " + duplicateRows.join(", ")
    : "";
}

/**
 * קוראת טקסט ממסמך — Drive Export תחילה, אחר כך DocumentApp כ-fallback.
 * @param {string} docId מזהה המסמך
 * @return {string} טקסט המסמך עד 3000 תווים, או ריק אם לא נגיש
 */
function _getDocText(docId) {
  // שיטה 1 — Drive Export API
  try {
    const url = "https://www.googleapis.com/drive/v3/files/" + docId + "/export?mimeType=text/plain";
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    const code = response.getResponseCode();
    Logger.log("Drive Export קוד: " + code);
    if (code === 200) {
      const text = response.getContentText().substring(0, 3000);
      Logger.log("שיטה 1 הצליחה. אורך: " + text.length + " תווים.");
      return text;
    }
    Logger.log("Drive Export נכשל (" + code + ") — מנסה DocumentApp");
  } catch (e) {
    Logger.log("שגיאה בDrive Export: " + e.message);
  }

  // שיטה 2 — DocumentApp fallback
  try {
    const doc  = DocumentApp.openById(docId);
    const text = doc.getBody().getText().substring(0, 3000);
    Logger.log("שיטה 2 הצליחה. אורך: " + text.length + " תווים.");
    return text;
  } catch (e) {
    Logger.log("DocumentApp נכשל: " + e.message);
  }

  Logger.log("שתי השיטות נכשלו — מחזיר ריק");
  return "";
}

/**
 * מחלצת JSON מתוך טקסט חופשי.
 */
function _extractJsonFromText(rawText) {
  try { return JSON.parse(rawText); } catch (e) {}
  const match = rawText.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch (e) {} }
  throw new Error("לא ניתן לחלץ JSON. תשובה: " + rawText.substring(0, 200));
}

/**
 * שולחת בקשה למודל Gemini ספציפי.
 */
function _callGeminiWithModel(model, prompt, apiKey) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
              model + ":generateContent?key=" + apiKey;
  const payload = { contents: [{ parts: [{ text: prompt }] }] };
  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const code    = response.getResponseCode();
  const rawText = response.getContentText();
  Logger.log("מודל: " + model + " | קוד: " + code);
  Logger.log("תשובה: " + rawText.substring(0, 200));
  if (code === 429) return { ok: false, quotaExceeded: true };
  if (code !== 200) return { ok: false, quotaExceeded: false,
    errorMsg: "קוד " + code + ": " + rawText.substring(0, 150) };
  try {
    const aiText = JSON.parse(rawText).candidates[0].content.parts[0].text;
    return { ok: true, data: _extractJsonFromText(aiText) };
  } catch (e) {
    return { ok: false, quotaExceeded: false, errorMsg: "פירוש JSON נכשל: " + e.message };
  }
}

/**
 * מנהלת קריאה ל-Gemini עם fallback אוטומטי.
 * מודל ראשי: gemini-2.5-flash
 * מודל fallback: gemini-2.0-flash
 */
function _callGemini_S07(text, examples) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error("מפתח GEMINI_API_KEY לא נמצא.");

  const prompt =
    "אתה מנתח מסמכים רפואיים ופיננסיים בעברית.\n" +
    (examples ? "דוגמאות:\n" + examples + "\n" : "") +
    "החזר JSON בלבד, ללא טקסט נוסף:\n" +
    "{\"title\":\"סוג המסמך\",\"issuer\":\"שם המנפיק\"," +
    "\"classification\":\"מסמך רפואי או מסמך חשבונאי או ביטוח או אחר\"," +
    "\"complexity\":\"פשוט או מורכב\"}\n\n" +
    "מסמך רפואי: בדיקות/ביקור/מרשם/הפניה | חשבונאי: חשבונית/תשלום/חשבון | ביטוח: פוליסה/תביעה | אחר: כל השאר\n" +
    "פשוט: שדות סטנדרטיים | מורכב: טבלאות/ערכים רבים/רב עמודי\n\n" +
    "טקסט:\n" + text;

  Logger.log("מנסה gemini-2.5-flash...");
  const r25 = _callGeminiWithModel("gemini-2.5-flash", prompt, apiKey);
  if (r25.ok) { Logger.log("✅ הצליח gemini-2.5-flash"); return r25.data; }

  Logger.log("עובר ל-gemini-2.0-flash...");
  const r20 = _callGeminiWithModel("gemini-2.0-flash", prompt, apiKey);
  if (r20.ok) { Logger.log("✅ הצליח gemini-2.0-flash"); return r20.data; }

  if (r25.quotaExceeded && r20.quotaExceeded) throw new Error("מכסה מוצתה בשני המודלים");
  throw new Error("שגיאת AI: " + (r20.errorMsg || r25.errorMsg || "לא ידוע"));
}