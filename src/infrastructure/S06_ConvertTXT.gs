/**
 * MedicalPilot — S06_ConvertTXT.gs
 * המרת קבצים לפורמט TXT מובנה — 6 מסלולים
 * @version 1.1.0 | @updated 24/04/2026 | @service S06
 * תיקון: 429 ידידותי, 503 מנסה gemini-2.0-flash כגיבוי
 */

function _callGemini(apiKey, payload, callerName) {
  const models = [
    "gemini-2.5-flash",
    "gemini-2.0-flash"
  ];

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
    const response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const code = response.getResponseCode();
    if (code === 200) {
      console.log(callerName + " הצליח עם מודל: " + model);
      return response;
    }
    if (code === 503 && i < models.length - 1) {
      console.log(callerName + ": " + model + " עמוס — מנסה " + models[i + 1]);
      Utilities.sleep(2000);
      continue;
    }
    // כל שגיאה אחרת — זרוק
    throw new Error(callerName + " נכשל (" + code + "): " + response.getContentText());
  }
}

function _writeError(sheet, row, msg) {
  const isOverload = msg.includes("503") || msg.includes("UNAVAILABLE");
  const isQuota   = msg.includes("429") || msg.includes("quota");
  sheet.getRange(row, 20).setValue(
    isOverload ? "עומס — דולג" :
    isQuota    ? "מכסה יומית מוצתה — נסה מחר" :
                 "שגיאה: " + msg.substring(0, 100)
  );
}

function run_MedicalPilot_V2_6_2() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ניהול_מיילים");
  const activeRow = sheet.getActiveCell().getRow();

  if (activeRow > 1) {
    const existingLink = sheet.getRange(activeRow, 22).getValue();
    if (existingLink && existingLink.toString().trim() !== "") {
      sheet.getRange(activeRow, 20).setValue("כבר טופלה — יש לינק ב-V");
      return;
    }
    _processRow(sheet, activeRow);
    return;
  }

  _processBatch(sheet, 5);
}

function _processBatch(sheet, batchSize) {
  const lastRow = sheet.getLastRow();
  let processed = 0;

  for (let i = 2; i <= lastRow && processed < batchSize; i++) {
    const fileId = sheet.getRange(i, 1).getValue();
    if (!fileId) continue;
    const existingLink = sheet.getRange(i, 22).getValue();
    if (existingLink && existingLink.toString().trim() !== "") continue;
    _processRow(sheet, i);
    processed++;
    SpreadsheetApp.flush();
  }

  SpreadsheetApp.getActiveSpreadsheet().toast(
    "הושלמו " + processed + " שורות", "MedicalPilot S06", 4
  );
}

function _processRow(sheet, row) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  console.log("--- שורה: " + row + " ---");

  try {
    const fileId = sheet.getRange(row, 1).getValue() ||
                   (sheet.getRange(row, 15).getValue() ? sheet.getRange(row, 15).getValue().match(/[-\w]{25,}/)[0] : null);
    if (!fileId) { sheet.getRange(row, 20).setValue("לא נמצא ID"); return; }

    const file = DriveApp.getFileById(fileId);
    const mimeType = file.getMimeType();
    const fileSizeActual = file.getSize();
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
      sheet.getRange(row, 20).setValue("לא נתמך: " + mimeType);
      return;
    }

    finalize_And_Save_To_Drive(row, file, resultData, systemType, fileSizeFormatted, sheet);

  } catch (e) {
    console.error("שגיאה שורה " + row + ": " + e.message);
    _writeError(sheet, row, e.message);
  }
}

function execute_Visual_Path(file, apiKey) {
  const blob = file.getBlob();
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
    generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
  };
  const response = _callGemini(apiKey, payload, "מסלול 1");
  const res = JSON.parse(response.getContentText());
  const cleanJson = JSON.parse(res.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim());
  return { words: cleanJson.words || "", m: cleanJson.metadata || {}, isSheet: false };
}

function execute_Direct_Path(file, apiKey, mimeType, sheet, row) {
  const tempFile = Drive.Files.copy({title: "Temp_MP"}, file.getId(), {convert: true});
  const rawText = DocumentApp.openById(tempFile.id).getBody().getText();
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
  const payload = { contents: [{ parts: [{ text: prompt }] }] };
  const response = _callGemini(apiKey, payload, "מסלול 2");
  const res = JSON.parse(response.getContentText());
  const cleanJson = JSON.parse(res.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim());
  return { words: cleanJson.words || "", m: cleanJson.metadata || {}, isSheet: false };
}

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
  const payload = { contents: [{ parts: [{ text: prompt }] }] };
  const response = _callGemini(apiKey, payload, "מסלול 3");
  const res = JSON.parse(response.getContentText());
  const cleanJson = JSON.parse(res.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim());
  return { words: cleanJson.words || "", m: cleanJson.metadata || {}, isSheet: false };
}

function execute_Image_Path(file, apiKey) {
  const blob = file.getBlob();
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
  const response = _callGemini(apiKey, payload, "מסלול 4");
  const res = JSON.parse(response.getContentText());
  const cleanJson = JSON.parse(res.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim());
  return { words: cleanJson.words || "", m: cleanJson.metadata || {}, isSheet: false };
}

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
  const payload = { contents: [{ parts: [{ text: prompt }] }] };
  const response = _callGemini(apiKey, payload, "מסלול 5");
  const res = JSON.parse(response.getContentText());
  const cleanJson = JSON.parse(res.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim());
  return { words: cleanJson.words || "", m: cleanJson.metadata || {}, isSheet: false };
}

function execute_Sheet_Path(file, apiKey, mimeType) {
  let spreadsheet;
  let tempFileId = "";
  try {
    if (mimeType === MimeType.GOOGLE_SHEETS) {
      spreadsheet = SpreadsheetApp.openById(file.getId());
    } else {
      const tempFile = Drive.Files.copy({ title: "Temp_Sheet_MP", mimeType: MimeType.GOOGLE_SHEETS }, file.getId(), { convert: true });
      tempFileId = tempFile.id;
      spreadsheet = SpreadsheetApp.openById(tempFileId);
    }
  } catch (e) { throw new Error("מסלול 6: לא ניתן לפתוח גליון — " + e.message); }

  const sheetsData = [];
  const allSheets = spreadsheet.getSheets();
  allSheets.forEach(function(s) {
    const sheetName = s.getName();
    const lastRow = s.getLastRow();
    const lastCol = s.getLastColumn();
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

  const payload = { contents: [{ parts: [{ text: prompt }] }] };
  const response = _callGemini(apiKey, payload, "מסלול 6");
  const res = JSON.parse(response.getContentText());
  const cleanJson = JSON.parse(res.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim());
  return { isSheet: true, m: cleanJson.metadata || {}, sheetsData: sheetsData, sheetCount: allSheets.length };
}

function finalize_And_Save_To_Drive(row, sourceFile, data, sysType, size, sheet) {
  const folders = DriveApp.getFoldersByName("Converted_TXT");
  const targetFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder("Converted_TXT");
  const m = data.m || {};
  const col = 35;
  let textContent = "";

  if (data.isSheet) {
    const sheetCount = data.sheetCount || 0;
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
    const words = data.words || "";
    const wordCount = words ? words.split(" | ").length : 0;
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
  const fileName = sourceFile.getName().split('.')[0] + "_" + timeStamp + ".txt";
  const newFile = targetFolder.createFile(fileName, textContent, MimeType.PLAIN_TEXT);

  sheet.getRange(row, 13).setValue("הומר ל-TXT");
  sheet.getRange(row, 21).setValue(sysType);
  sheet.getRange(row, 23).setValue(size);
  sheet.getRange(row, 22).setValue(newFile.getUrl());
  sheet.getRange(row, 20).clearContent();
  console.log("finalize: הושלם — " + fileName);
}