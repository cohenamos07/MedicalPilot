/**
 * MedicalPilot — S09_ExtractMedical.gs
 * @version 1.2.2 | @updated 26/06/2026 12:00 | @service S09
 * @git https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S09_ExtractMedical.gs
 * @impacts חילוץ אירועים רפואיים ממסמכים מאומתים לגליונות יעד — מנגנון דואלי (שורה בודדת / אצווה).
 *          תנאי סף: עמודה M = "אומת ידנית" + עמודה L = רפואי + עמודה X לא ריקה.
 *          קריאה: ניהול_מיילים עמודות A,I,J,K,L,M,W,X + גליון S10_למידה_רפואי (few-shot).
 *          כתיבה: ניהול_מיילים עמודות M,S,T + 6 גליונות יעד:
 *          יומן_אירועים_רפואי, תרופות_קבועות, יומן_מצב_רפואי,
 *          בדיקות_דם, בדיקות_גנטיות, הנחיות_רפואיות_ומשימות.
 *          תלויות: GEMINI_API_KEY (gemini-2.0-flash), Drive API, COLUMN_MAP.gs.
 *          מופעל מהתפריט ומאייקון עמודה O בגליון ניהול_מיילים.
 * @changes [v1.2.2] [Task 65] תיקון קריטי — בלוק כתיבת "יומן_אירועים_רפואי":
 *                   הוסר sourceUrl מהמערך (לא קיים במפת 7 העמודות) — היה דורס
 *                   את עמודה F (Routing_Category) עם לינק Drive, ודוחף את
 *                   docData.fileId לעמודה H הלא-מוגדרת. כעת 7 ערכים מתואמים
 *                   בדיוק ל-COLUMN_MAP: Event_Date, Event_Type, Medical_System,
 *                   Issuer, Summary, Routing_Category, File_ID.
 *          [v1.2.1] תיקון Task 71 — שינוי S09_STATUS_TRIGGER מ-"אומת ידנית" ל-"מאושר" (13:00)
 *                   והזרקתן לפרומפט Gemini לשיפור חילוץ
 *          [v1.0.0] גרסה ראשונה
 */
// ══════════════════════════════════════════════════════════════════
// קבועים
// ══════════════════════════════════════════════════════════════════

const S09_SOURCE_SHEET    = "ניהול_מיילים";
const S09_LEARNING_SHEET  = "S10_למידה_רפואי";
const S09_CATEGORIES      = ["רפואי", "מסמך רפואי"];
const S09_STATUS_TRIGGER = "מאושר";
const S09_GEMINI_MODEL    = "gemini-2.0-flash";
const S09_MAX_EXAMPLES    = 5;

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
    _s09_processSingleRow(ss, sheet, activeRow);
  } else {
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

    Utilities.sleep(1500);
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
    const docData = {
      fileId:    (sheet.getRange(row, 1).getValue()  || "").toString().trim(),
      docTitle:  (sheet.getRange(row, 9).getValue()  || "").toString().trim(),
      docIssuer: (sheet.getRange(row, 10).getValue() || "").toString().trim(),
      docDate:   (sheet.getRange(row, 11).getValue() || "").toString().trim(),
      sourceUrl: (sheet.getRange(row, 23).getValue() || "").toString().trim(),
      txtUrl:    (sheet.getRange(row, 24).getValue() || "").toString().trim()
    };

    const txtContent = _s09_fetchTxtContent(docData.txtUrl);
    if (!txtContent) {
      _s09_writeError(sheet, row, "ACCESS", "לא ניתן לקרוא קובץ TXT — בדוק הרשאות Drive");
      return { success: false, msg: "❌ שגיאת גישה לקובץ TXT" };
    }

    // [v1.1.0] שליפת דוגמאות למידה מ-S10
    const fewShotExamples = _s09_fetchFewShotExamples(ss);

    const extracted = _s09_callGemini(txtContent, docData, fewShotExamples);
    if (!extracted) {
      _s09_writeError(sheet, row, "PARSE", "Gemini לא החזיר JSON תקין");
      return { success: false, msg: "❌ שגיאת עיבוד Gemini" };
    }

    const sheetsWritten = _s09_writeToSheets(ss, extracted, docData);

    const statusText = sheetsWritten.length === 1
      ? "חולץ ל" + sheetsWritten[0]
      : "חולץ לגליונות";

    sheet.getRange(row, 13).setValue(statusText);
    sheet.getRange(row, 19).setValue("");
    sheet.getRange(row, 20).setValue("");

    Logger.log("[S09] שורה " + row + " → " + statusText +
      (fewShotExamples.length > 0 ? " | דוגמאות: " + fewShotExamples.length : " | ללא דוגמאות"));

    return { success: true, msg: "✅ שורה " + row + " — " + statusText };

  } catch (e) {
    _s09_writeError(sheet, row, "UNKNOWN", e.message);
    Logger.log("[S09] שגיאה שורה " + row + ": " + e.message);
    return { success: false, msg: "❌ שגיאה: " + e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// [v1.1.0] שליפת דוגמאות Few-Shot מגליון S10_למידה_רפואי
// ══════════════════════════════════════════════════════════════════

function _s09_fetchFewShotExamples(ss) {
  try {
    const learnSheet = ss.getSheetByName(S09_LEARNING_SHEET);
    if (!learnSheet) {
      Logger.log("[S09] גליון למידה לא נמצא — ממשיך ללא דוגמאות");
      return [];
    }

    const lastRow = learnSheet.getLastRow();
    if (lastRow < 2) {
      Logger.log("[S09] גליון למידה ריק — ממשיך ללא דוגמאות");
      return [];
    }

    // שליפת עד S09_MAX_EXAMPLES שורות אחרונות
    const startRow  = Math.max(2, lastRow - S09_MAX_EXAMPLES + 1);
    const numRows   = lastRow - startRow + 1;
    const data      = learnSheet.getRange(startRow, 1, numRows, 7).getValues();

    const examples = [];

    data.forEach(function(row) {
      const fileId       = (row[0] || "").toString().trim();
      const splitIndex   = (row[1] || "").toString().trim();
      const targetSheet  = (row[2] || "").toString().trim();
      const jsonRaw      = (row[3] || "").toString().trim();
      const complexity   = (row[4] || "").toString().trim();
      const correction   = (row[5] || "").toString().trim();

      if (!jsonRaw || !targetSheet) return;

      try {
        const parsed = JSON.parse(jsonRaw);
        examples.push({
          targetSheet: targetSheet,
          splitIndex:  splitIndex,
          complexity:  complexity,
          correction:  correction,
          data:        parsed
        });
      } catch (e) {
        Logger.log("[S09] לא ניתן לפרסר JSON בדוגמת למידה — fileId: " + fileId);
      }
    });

    Logger.log("[S09] נטענו " + examples.length + " דוגמאות למידה מ-" + S09_LEARNING_SHEET);
    return examples;

  } catch (e) {
    Logger.log("[S09] שגיאה בשליפת דוגמאות: " + e.message);
    return [];
  }
}

// ══════════════════════════════════════════════════════════════════
// בניית בלוק Few-Shot לפרומפט
// ══════════════════════════════════════════════════════════════════

function _s09_buildFewShotBlock(examples) {
  if (!examples || examples.length === 0) return "";

  let block = "\n--- דוגמאות מאומתות מהעבר (למד מהן) ---\n";

  examples.forEach(function(ex, i) {
    block += "\nדוגמה " + (i + 1) + " | גליון: " + ex.targetSheet;
    if (ex.complexity) block += " | מורכבות: " + ex.complexity;
    block += "\n";
    block += JSON.stringify(ex.data, null, 2) + "\n";
    if (ex.correction) block += "הערת מאמת: " + ex.correction + "\n";
  });

  block += "--- סוף דוגמאות ---\n";
  return block;
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
// קריאת Gemini — חילוץ מובנה + Few-Shot
// ══════════════════════════════════════════════════════════════════

function _s09_callGemini(txtContent, docData, fewShotExamples) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    const url    = "https://generativelanguage.googleapis.com/v1beta/models/" +
                   S09_GEMINI_MODEL + ":generateContent?key=" + apiKey;

    // [v1.1.0] בניית בלוק הדוגמאות
    const fewShotBlock = _s09_buildFewShotBlock(fewShotExamples);

    const prompt = `אתה מומחה לניתוח מסמכים רפואיים בעברית.
קרא את המסמך הבא וחלץ ממנו מידע רפואי מובנה.
${fewShotBlock}
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

  // [Task 65 — v1.2.2] תוקן: 7 ערכים מדויקים לפי COLUMN_MAP של "יומן_אירועים_רפואי"
  // Event_Date | Event_Type | Medical_System | Issuer | Summary | Routing_Category | File_ID
  if (extracted.events && extracted.events.length > 0) {
    const sheet = ss.getSheetByName(S09_TARGET_SHEETS.events);
    extracted.events.forEach(e => {
      sheet.appendRow([
        e["תאריך_אירוע"]    || docData.docDate,
        e["סוג_אירוע"]      || "",
        e["מערכת_רפואית"]   || "",
        e["מוסד_רופא"]      || docData.docIssuer,
        e["סיכום_ממצא"]     || "",
        e["קטגוריית_ניתוב"] || "",
        docData.fileId
      ]);
    });
    sheetsWritten.push("יומן אירועים");
  }

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