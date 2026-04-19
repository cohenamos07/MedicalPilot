/**
 * Module: S07_Classify
 * Version: 1.3.3
 * Updated: 19/04/2026
 * Service: S07
 * תיקון: fallback אוטומטי ממודל 2.0 ל-1.5 בעת חריגת מכסה
 */

// גשר לתפריט
function classifyDocument() { classifyActiveRow(); }

function classifyActiveRow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ניהול_מיילים");
  if (!sheet) return;

  const row = sheet.getActiveCell().getRow();
  const ui = SpreadsheetApp.getUi();

  if (row < 2) {
    ui.alert("נא לעמוד על שורה בגיליון (לא על הכותרת).");
    return;
  }

  const rowData = sheet.getRange(row, 1, 1, 26).getValues()[0];
  const ocrLink = rowData[21]; // עמודה V

  if (!ocrLink || typeof ocrLink !== 'string' || !ocrLink.includes("docs.google.com")) {
    ui.alert("אין לינק OCR תקין בשורה זו (עמודה V).");
    return;
  }

  try {
    sheet.getRange(row, 11).setValue("⏳ מעבד...");

    const docId = ocrLink.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
    Logger.log("שורה: " + row);
    Logger.log("ocrLink: " + ocrLink);
    Logger.log("docId: " + docId);

    if (!docId) throw new Error("לא ניתן לחלץ מזהה מסמך מהלינק");

    const docText = _getDocTextViaDriveExport(docId);

    let examplesText = "";
    const learningSheet = ss.getSheetByName("דוגמאות_למידה");
    if (learningSheet) {
      const lastRow = learningSheet.getLastRow();
      if (lastRow > 1) {
        const learnData = learningSheet.getRange(2, 1, Math.min(lastRow - 1, 10), 3).getValues();
        examplesText = learnData.map(r => "כותרת: " + r[0] + " | מנפיק: " + r[1] + " | סיווג: " + r[2]).join("\n");
      }
    }

    const aiResult = _callGemini_S07(docText, examplesText);

    let duplicateInfo = "";
    const allData = sheet.getDataRange().getValues();
    const duplicateRows = [];
    for (let i = 1; i < allData.length; i++) {
      if (i + 1 === row) continue;
      if (allData[i][8] === aiResult.title && allData[i][9] === aiResult.issuer) {
        duplicateRows.push(i + 1);
      }
    }
    if (duplicateRows.length > 0) {
      duplicateInfo = "חשוד ככפול — שורות: " + duplicateRows.join(", ");
    }

    sheet.getRange(row, 9).setValue(aiResult.title);
    sheet.getRange(row, 10).setValue(aiResult.issuer);
    sheet.getRange(row, 11).setValue("סווג בהצלחה");
    sheet.getRange(row, 12).setValue(aiResult.classification);
    sheet.getRange(row, 20).clearContent();
    sheet.getRange(row, 25).setValue(aiResult.complexity);
    sheet.getRange(row, 26).setValue(duplicateInfo);
    sheet.getRange(row, 9).activate();

  } catch (e) {
    sheet.getRange(row, 11).setValue("נכשל");
    sheet.getRange(row, 20).setValue("שגיאה: " + e.message);
    sheet.getRange(row, 20).activate();
    Logger.log("שגיאה בשורה " + row + ": " + e.message);
  }
}

/**
 * _getDocTextViaDriveExport
 * מייצא טקסט מגוגל דוק דרך Drive Export API.
 * @param {string} docId מזהה המסמך
 * @returns {string} טקסט המסמך עד 3000 תווים
 */
function _getDocTextViaDriveExport(docId) {
  const url = "https://www.googleapis.com/drive/v3/files/" + docId + "/export?mimeType=text/plain";

  const response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  Logger.log("Drive Export קוד תגובה: " + code);

  if (code !== 200) {
    throw new Error("שגיאת Drive Export למסמך: " + code);
  }

  const text = response.getContentText().substring(0, 3000);
  Logger.log("טקסט חולץ בהצלחה. אורך: " + text.length + " תווים.");
  return text;
}

/**
 * _callGeminiWithModel
 * שליחה למודל גמיני ספציפי.
 * @param {string} model שם המודל
 * @param {string} prompt הפרומפט
 * @param {string} apiKey מפתח API
 * @returns {{ok: boolean, data: object|null, quotaExceeded: boolean}}
 */
function _callGeminiWithModel(model, prompt, apiKey) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
              model + ":generateContent?key=" + apiKey;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  };

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const responseData = JSON.parse(response.getContentText());

  // זיהוי חריגת מכסה — קוד 429
  if (code === 429) {
    Logger.log("מכסה מוצתה למודל: " + model);
    return { ok: false, data: null, quotaExceeded: true };
  }

  if (code !== 200) {
    const errMsg = responseData.error ? responseData.error.message : "קוד " + code;
    Logger.log("שגיאה במודל " + model + ": " + errMsg);
    return { ok: false, data: null, quotaExceeded: false };
  }

  try {
    const aiText = responseData.candidates[0].content.parts[0].text;
    return { ok: true, data: JSON.parse(aiText), quotaExceeded: false };
  } catch (e) {
    return { ok: false, data: null, quotaExceeded: false };
  }
}

/**
 * _callGemini_S07
 * שולח לגמיני עם fallback אוטומטי:
 * מנסה gemini-2.0-flash → אם מכסה מוצתה עובר ל-gemini-1.5-flash.
 * @param {string} text טקסט המסמך
 * @param {string} examples דוגמאות למידה
 * @returns {object} תוצאת ניתוח AI
 */
function _callGemini_S07(text, examples) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error("מפתח GEMINI_API_KEY לא נמצא ב-Properties.");

  const prompt =
    "אתה מנתח מסמכים רפואיים ופיננסיים בעברית.\n" +
    (examples ? "דוגמאות מהעבר:\n" + examples + "\n" : "") +
    "נתח את המסמך הבא והחזר JSON בלבד:\n" +
    "{\n" +
    "  \"title\": \"סוג המסמך בעברית\",\n" +
    "  \"issuer\": \"שם המוסד או המנפיק בעברית\",\n" +
    "  \"classification\": \"מסמך רפואי\" או \"מסמך חשבונאי\" או \"ביטוח\" או \"אחר\",\n" +
    "  \"complexity\": \"פשוט\" או \"מורכב\"\n" +
    "}\n\n" +
    "כללי סיווג:\n" +
    "מסמך רפואי: בדיקות, סיכומי ביקור, מרשמים, הפניות\n" +
    "מסמך חשבונאי: חשבוניות, אישורי תשלום, דפי חשבון\n" +
    "ביטוח: פוליסות, תביעות, אישורי ביטוח\n" +
    "אחר: כל דבר אחר\n\n" +
    "כללי מורכבות:\n" +
    "פשוט: מסמך עם שדות סטנדרטיים\n" +
    "מורכב: טבלאות, ערכים מספריים רבים, מסמך רב עמודי\n\n" +
    "טקסט המסמך:\n" + text;

  // ניסיון ראשון — gemini-2.0-flash
  Logger.log("מנסה gemini-2.0-flash...");
  const result20 = _callGeminiWithModel("gemini-2.0-flash", prompt, apiKey);
  if (result20.ok) {
    Logger.log("הצליח עם gemini-2.0-flash");
    return result20.data;
  }

  // fallback — gemini-1.5-flash
  if (result20.quotaExceeded) {
    Logger.log("עובר ל-fallback: gemini-1.5-flash");
    const result15 = _callGeminiWithModel("gemini-1.5-flash", prompt, apiKey);
    if (result15.ok) {
      Logger.log("הצליח עם gemini-1.5-flash (fallback)");
      return result15.data;
    }
    if (result15.quotaExceeded) {
      throw new Error("מכסה מוצתה גם ב-2.0 וגם ב-1.5 Flash — נסה מחר");
    }
    throw new Error("שגיאת Gemini 1.5 Flash בלתי צפויה");
  }

  throw new Error("שגיאת Gemini 2.0 Flash בלתי צפויה");
}