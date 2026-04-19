/**
 * Module: S07_Classify
 * Version: 1.3.1
 * Updated: 19/04/2026
 * Service: S07
 */

// גשר לתפריט — התפריט קורא classifyDocument
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

    const docText = _getDocTextViaRestApi(docId);

    let examplesText = "";
    const learningSheet = ss.getSheetByName("דוגמאות_למידה");
    if (learningSheet) {
      const lastRow = learningSheet.getLastRow();
      if (lastRow > 1) {
        const learnData = learningSheet.getRange(2, 1, Math.min(lastRow - 1, 10), 3).getValues();
        examplesText = learnData.map(r => `כותרת: ${r[0]} | מנפיק: ${r[1]} | סיווג: ${r[2]}`).join("\n");
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
 * מחלצת טקסט ממסמך Google Docs באמצעות Google Docs REST API.
 * @param {string} docId מזהה המסמך.
 * @return {string} טקסט המסמך (עד 3000 תווים).
 */
function _getDocTextViaRestApi(docId) {
  const url = "https://docs.googleapis.com/v1/documents/" + docId;
  const options = {
    method: "get",
    headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();

  if (responseCode !== 200) {
    throw new Error("שגיאת API בגישה למסמך: " + responseCode);
  }

  const responseData = JSON.parse(response.getContentText());
  let fullText = "";
  const content = responseData.body.content;

  if (content) {
    content.forEach(function(element) {
      if (element.paragraph) {
        element.paragraph.elements.forEach(function(subElement) {
          if (subElement.textRun && subElement.textRun.content) {
            fullText += subElement.textRun.content;
          }
        });
      }
    });
  }

  const resultText = fullText.substring(0, 3000);
  Logger.log("טקסט חולץ בהצלחה. אורך: " + resultText.length + " תווים.");
  return resultText;
}

function _callGemini_S07(text, examples) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error("מפתח GEMINI_API_KEY לא נמצא ב-Properties.");

  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey;

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

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseData = JSON.parse(response.getContentText());

  if (response.getResponseCode() !== 200) {
    throw new Error("שגיאת API: " + (responseData.error ? responseData.error.message : "לא ידוע"));
  }

  try {
    const aiText = responseData.candidates[0].content.parts[0].text;
    return JSON.parse(aiText);
  } catch (e) {
    throw new Error("נכשלה קריאת ה-JSON מה-AI.");
  }
}