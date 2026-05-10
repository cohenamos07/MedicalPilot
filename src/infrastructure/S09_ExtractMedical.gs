/**
 * MedicalPilot — S09_ExtractMedical.gs
 * @version 1.0.0 | @updated 10/05/2026 15:30 | @service S09
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/S09_ExtractMedical.gs
 * תפקיד: חילוץ אירועים רפואיים ממסמכים מאומתים לגליונות יעד
 * קריאה:  A(1) File_ID | I(9) Doc_Title | J(10) Doc_Issuer | K(11) Doc_Date
 *          L(12) Doc_Category | M(13) Pipeline_Status | W(23) Source_URL | X(24) TXT_URL
 * כתיבה:  M(13) Pipeline_Status | S(19) Error_Code | T(20) Error_Detail
 */

// ══════════════════════════════════════════════════════════════════
// קבועים
// ══════════════════════════════════════════════════════════════════

const S09_SOURCE_SHEET   = "ניהול_מיילים";
const S09_CATEGORIES     = ["רפואי", "מסמך רפואי"];
const S09_STATUS_TRIGGER = "אומת ידנית";
const S09_GEMINI_MODEL   = "gemini-2.0-flash";

const S09_TARGET_SHEETS  = {
  events:       "יומן_אירועים_רפואי",
  medications:  "תרופות_קבועות",
  medStatus:    "יומן_מצב_רפואי",
  bloodTests:   "בדיקות_דם",
  geneticTests: "בדיקות_גנטיות",
  instructions: "הנחיות_רפואיות_ומשימות"
};

// ══════════════════════════════════════════════════════════════════
// נקודת כניסה — מנגנון דואלי
// ══════════════════════════════════════════════════════════════════

function runS09() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(S09_SOURCE_SHEET);

  if (!sheet) {
    SpreadsheetApp.getUi().alert("❌ גליון '" + S09_SOURCE_SHEET + "' לא נמצא.");
    return;
  }

  const activeRow = sheet.getActiveCell().getRow();

  if (activeRow >= 2) {
    // מצב יחיד — שורה נבחרת
    _s09_processSingleRow(ss, sheet, activeRow);
  } else {
    // מצב אצווה — כל השורות המתאימות
    _s09_processBatch(ss, sheet);
  }
}

// ══════════════════════════════════════════════════════════════════
// עיבוד שורה אחת
// ══════════════════════════════════════════════════════════════════

function _s09_processSingleRow(ss, sheet, row) {
  const check = _s09_checkRow(sheet, row);
  if (!check.valid) {
    SpreadsheetApp.getUi().alert("⚠️ שורה " + row + " לא עומדת בתנאים:\n" + check.reason);
    return;
  }
  const result = _s09_processRow(ss, sheet, row);
  SpreadsheetApp.getUi().alert(result.msg);
}

// ══════════════════════════════════════════════════════════════════
// עיבוד אצווה
// ══════════════════════════════════════════════════════════════════

function _s09_processBatch(ss, sheet) {
  const lastRow = sheet.getLastRow();
  let processed = 0;
  let skipped   = 0;
  let errors    = 0;

  for (let row = 2; row <= lastRow; row++) {
    const check = _s09_checkRow(sheet, row);
    if (!check.valid) { skipped++; continue; }

    const result = _s09_processRow(ss, sheet, row);
    if (result.success) processed++;
    else errors++;

    Utilities.sleep(1500); // הגנה על מכסת Gemini
  }

  SpreadsheetApp.getUi().alert(
    "✅ S09 הסתיים\n" +
    "עובדו: " + processed + "\n" +
    "דולגו: " + skipped   + "\n" +
    "שגיאות: " + errors
  );
}

// ══════════════════════════════════════════════════════════════════
// בדיקת תנאי סף לשורה
// ══════════════════════════════════════════════════════════════════

function _s09_checkRow(sheet, row) {
  const status   = (sheet.getRange(row, 13).getValue() || "").toString().trim();
  const category = (sheet.getRange(row, 12).getValue() || "").toString().trim();
  const txtUrl   = (sheet.getRange(row, 24).getValue() || "").toString().trim();

  if (status !== S09_STATUS_TRIGGER)
    return { valid: false, reason: "עמודה M אינה 'אומת ידנית' (ערך: " + status + ")" };
  if (!S09_CATEGORIES.includes(category))
    return { valid: false, reason: "עמודה L אינה רפואי (ערך: " + category + ")" };
  if (!txtUrl)
    return { valid: false, reason: "עמודה X (TXT_URL) ריקה — יש להריץ S06 תחילה" };

  return { valid: true };
}

// ══════════════════════════════════════════════════════════════════
// עיבוד שורה בודדת — הזרימה המרכזית
// ══════════════════════════════════════════════════════════════════

function _s09_processRow(ss, sheet, row) {
  try {
    // שליפת נתוני השורה
    const docData = {
      fileId:    (sheet.getRange(row, 1).getValue()  || "").toString().trim(),
      docTitle:  (sheet.getRange(row, 9).getValue()  || "").toString().trim(),
      docIssuer: (sheet.getRange(row, 10).getValue() || "").toString().trim(),
      docDate:   (sheet.getRange(row, 11).getValue() || "").toString().trim(),
      sourceUrl: (sheet.getRange(row, 23).getValue() || "").toString().trim(),
      txtUrl:    (sheet.getRange(row, 24).getValue() || "").toString().trim()
    };

    // קריאת תוכן TXT
    const txtContent = _s09_fetchTxtContent(docData.txtUrl);
    if (!txtContent) {
      _s09_writeError(sheet, row, "ACCESS", "לא ניתן לקרוא קובץ TXT — בדוק הרשאות Drive");
      return { success: false, msg: "❌ שגיאת גישה לקובץ TXT" };
    }

    // קריאת Gemini
    const extracted = _s09_callGemini(txtContent, docData);
    if (!extracted) {
      _s09_writeError(sheet, row, "PARSE", "Gemini לא החזיר JSON תקין");
      return { success: false, msg: "❌ שגיאת עיבוד Gemini" };
    }

    // כתיבה לגליונות
    const sheetsWritten = _s09_writeToSheets(ss, extracted, docData);

    // עדכון Pipeline_Status
    const statusText = sheetsWritten.length === 1
      ? "חולץ ל" + sheetsWritten[0]
      : "חולץ לגליונות";

    sheet.getRange(row, 13).setValue(statusText);
    sheet.getRange(row, 19).setValue("");
    sheet.getRange(row, 20).setValue("");

    Logger.log("[S09] שורה " + row + " → " + statusText);
    return { success: true, msg: "✅ שורה " + row + " — " + statusText };

  } catch (e) {
    _s09_writeError(sheet, row, "UNKNOWN", e.message);
    Logger.log("[S09] שגיאה שורה " + row + ": " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// קריאת קובץ TXT מ-Drive
// ══════════════════════════════════════════════════════════════════

function _s09_fetchTxtContent(txtUrl) {
  try {
    let fileId = null;
    if (txtUrl.includes("/d/"))  fileId = txtUrl.split("/d/")[1].split("/")[0];
    if (txtUrl.includes("id=")) fileId = txtUrl.split("id=")[1].split("&")[0];
    if (!fileId) return null;
    return DriveApp.getFileById(fileId).getBlob().getDataAsString("UTF-8");
  } catch (e) {
    Logger.log("[S09] שגיאת קריאת TXT: " + e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// קריאת Gemini — חילוץ מובנה
// ══════════════════════════════════════════════════════════════════

function _s09_callGemini(txtContent, docData) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    const url    = "https://generativelanguage.googleapis.com/v1beta/models/" +
                   S09_GEMINI_MODEL + ":generateContent?key=" + apiKey;

    const prompt = `אתה מומחה לניתוח מסמכים רפואיים בעברית.
קרא את המסמך הבא וחלץ ממנו מידע רפואי מובנה.

פרטי המסמך:
- כותרת: ${docData.docTitle}
- מנפיק: ${docData.docIssuer}
- תאריך: ${docData.docDate}

תוכן המסמך:
${txtContent}

החזר JSON בלבד (ללא טקסט נוסף) במבנה הבא:
{
  "events": [
    {
      "תאריך_אירוע": "",
      "סוג_אירוע": "",
      "מערכת_רפואית": "",
      "מוסד_רופא": "",
      "סיכום_ממצא": "",
      "קטגוריית_ניתוב": ""
    }
  ],
  "medical_status": [
    {
      "תאריך_אירוע": "",
      "סוג_אירוע": "",
      "מערכת_איבר": "",
      "מוסד_רופא": "",
      "אבחנה_עיקרית": "",
      "חומרה_מצב": "",
      "המלצות_קצרות": "",
      "סטטוס_רשומה": "חדש"
    }
  ],
  "medications": [
    {
      "שם_תרופה": "",
      "חומר_פעיל": "",
      "מינון": "",
      "תדירות": "",
      "סיבת_טיפול": "",
      "תאריך_התחלה": "",
      "תאריך_סיום": "",
      "סטטוס": "פעיל"
    }
  ],
  "blood_tests": [
    {
      "תאריך_בדיקה": "",
      "שם_בדיקה": "",
      "קטגוריה": "",
      "ערך": "",
      "טווח_נורמה": "",
      "סטטוס": "",
      "הערת_רופא": ""
    }
  ],
  "genetic_tests": [
    {
      "תאריך_בדיקה": "",
      "שם_פאנל": "",
      "גן_וריאנט": "",
      "ממצא": "",
      "משמעות_קלינית": "",
      "המלצה": ""
    }
  ],
  "instructions": [
    {
      "תאריך_הנחיה": "",
      "מקור": "",
      "תיאור_משימה": "",
      "סוג_משימה": "",
      "תאריך_יעד": "",
      "סטטוס": "פתוח"
    }
  ]
}

כללים:
- אם אין נתונים לקטגוריה מסוימת — החזר מערך ריק []
- events תמיד יכיל לפחות רשומה אחת
- תאריכים בפורמט DD/MM/YYYY
- אל תמציא מידע שאינו במסמך`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 }
    };

    const response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const json = JSON.parse(response.getContentText());
    if (!json.candidates || !json.candidates[0]) return null;

    let raw = json.candidates[0].content.parts[0].text.trim();
    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    return JSON.parse(raw);

  } catch (e) {
    Logger.log("[S09] שגיאת Gemini: " + e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// כתיבה לגליונות היעד
// ══════════════════════════════════════════════════════════════════

function _s09_writeToSheets(ss, extracted, docData) {
  const sheetsWritten = [];
  const sourceUrl     = docData.sourceUrl ||
                        "https://drive.google.com/file/d/" + docData.fileId + "/view";

  // גליון 1 — יומן_אירועים_רפואי (תמיד)
  if (extracted.events && extracted.events.length > 0) {
    const sheet = ss.getSheetByName(S09_TARGET_SHEETS.events);
    extracted.events.forEach(e => {
      sheet.appendRow([
        e["תאריך_אירוע"]    || docData.docDate,
        e["סוג_אירוע"]      || "",
        e["מערכת_רפואית"]   || "",
        e["מוסד_רופא"]      || docData.docIssuer,
        e["סיכום_ממצא"]     || "",
        sourceUrl,
        e["קטגוריית_ניתוב"] || "",
        docData.fileId
      ]);
    });
    sheetsWritten.push("יומן אירועים");
  }

  // גליון 2 — תרופות_קבועות
  if (extracted.medications && extracted.medications.length > 0) {
    const sheet = ss.getSheetByName(S09_TARGET_SHEETS.medications);
    extracted.medications.forEach(m => {
      sheet.appendRow([
        m["שם_תרופה"]       || "",
        m["חומר_פעיל"]      || "",
        m["מינון"]           || "",
        m["תדירות"]          || "",
        m["סיבת_טיפול"]     || "",
        m["תאריך_התחלה"]    || "",
        m["תאריך_סיום"]     || "",
        m["סטטוס"]           || "פעיל",
        docData.docIssuer,
        sourceUrl,
        docData.fileId
      ]);
    });
    sheetsWritten.push("תרופות");
  }

  // גליון 3 — יומן_מצב_רפואי
  if (extracted.medical_status && extracted.medical_status.length > 0) {
    const sheet = ss.getSheetByName(S09_TARGET_SHEETS.medStatus);
    extracted.medical_status.forEach(s => {
      sheet.appendRow([
        s["תאריך_אירוע"]     || docData.docDate,
        s["סוג_אירוע"]       || "",
        s["מערכת_איבר"]      || "",
        s["מוסד_רופא"]       || docData.docIssuer,
        s["אבחנה_עיקרית"]    || "",
        s["חומרה_מצב"]       || "",
        s["המלצות_קצרות"]    || "",
        sourceUrl,
        docData.fileId,
        docData.docIssuer,
        s["סטטוס_רשומה"]     || "חדש"
      ]);
    });
    sheetsWritten.push("מצב רפואי");
  }

  // גליון 4 — בדיקות_דם
  if (extracted.blood_tests && extracted.blood_tests.length > 0) {
    const sheet = ss.getSheetByName(S09_TARGET_SHEETS.bloodTests);
    extracted.blood_tests.forEach(b => {
      sheet.appendRow([
        b["תאריך_בדיקה"]  || docData.docDate,
        b["שם_בדיקה"]     || "",
        b["קטגוריה"]       || "",
        b["ערך"]           || "",
        b["טווח_נורמה"]   || "",
        b["סטטוס"]         || "",
        b["הערת_רופא"]    || "",
        sourceUrl,
        docData.fileId,
        docData.docIssuer
      ]);
    });
    sheetsWritten.push("בדיקות דם");
  }

  // גליון 5 — בדיקות_גנטיות
  if (extracted.genetic_tests && extracted.genetic_tests.length > 0) {
    const sheet = ss.getSheetByName(S09_TARGET_SHEETS.geneticTests);
    extracted.genetic_tests.forEach(g => {
      sheet.appendRow([
        g["תאריך_בדיקה"]      || docData.docDate,
        g["שם_פאנל"]          || "",
        g["גן_וריאנט"]        || "",
        g["ממצא"]              || "",
        g["משמעות_קלינית"]    || "",
        g["המלצה"]             || "",
        sourceUrl,
        docData.fileId
      ]);
    });
    sheetsWritten.push("בדיקות גנטיות");
  }

  // גליון 6 — הנחיות_רפואיות_ומשימות
  if (extracted.instructions && extracted.instructions.length > 0) {
    const sheet = ss.getSheetByName(S09_TARGET_SHEETS.instructions);
    extracted.instructions.forEach(i => {
      sheet.appendRow([
        i["תאריך_הנחיה"]  || docData.docDate,
        i["מקור"]          || docData.docIssuer,
        i["תיאור_משימה"]  || "",
        i["סוג_משימה"]    || "",
        i["תאריך_יעד"]    || "",
        i["סטטוס"]         || "פתוח",
        sourceUrl,
        docData.fileId
      ]);
    });
    sheetsWritten.push("הנחיות");
  }

  return sheetsWritten;
}

// ══════════════════════════════════════════════════════════════════
// כתיבת שגיאה לעמודות S ו-T
// ══════════════════════════════════════════════════════════════════

function _s09_writeError(sheet, row, code, detail) {
  sheet.getRange(row, 19).setValue(code);
  sheet.getRange(row, 20).setValue(detail);
}