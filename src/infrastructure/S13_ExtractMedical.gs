/**
 * @file        S13_ExtractMedical.gs
 * @version     1.1.0 | @updated 17/08/2026 21:18 | @service S13
 * @git         https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S13_ExtractMedical.gs
 * @description שירות חילוץ עמוק — קורא שורות מאומתות (Validation_Status="מאומת",
 *              Extraction_Status ריק) מיומן_אירועים_רפואי, מקבץ לפי File_ID
 *              (כל השורות המאומתות של אותו מסמך בקריאת Gemini אחת), ומפצל
 *              ל-5 גליונות היעד לפי Routing_Category. חלופה א' — מבוסס קודם
 *              על תוכן שורות היומן בלבד; נופל חזרה לטקסט TXT מלא (S06) רק
 *              אם Gemini מחזיר תשובה חלקית/ריקה. כולל מיפוי מערכות גוף
 *              (Enum SYS00-SYS14, היררכי) לתמיכה עתידית באווטאר/אינפוגרפיקה:
 *              בדיקת דם/בדיקה גנטית/מרשם תרופה מקבלים קוד מערכת קבוע
 *              (SYS06/SYS14/SYS00 בהתאמה, ללא שאילתת Gemini); מצב רפואי
 *              והנחיה מקבלים קוד דינמי שנקבע ע"י Gemini לכל שורה.
 * @impacts     יומן_אירועים_רפואי: קורא בלבד (A-I), כותב Extraction_Status (I).
 *              בדיקות_דם/בדיקות_גנטיות/תרופות_קבועות/הנחיות_רפואיות_ומשימות/
 *              יומן_מצב_רפואי: כותב שורות חדשות (appendRow) בלבד, לא דורס.
 *              ניהול_מיילים: קורא בלבד (TXT_URL, fallback).
 * @callers     runS13ViewIconEvents (ViewEngine.gs, עמודה F ביומן_אירועים_רפואי)
 * @functions   runS13 | _s13_checkRow | _s13_getEligibleGroups | _s13_processSingleRow |
 *              _s13_processBatch | _s13_getSchemaBlock | _s13_fetchTxtUrlByFileId |
 *              _s13_fetchTxtContent | _s13_buildPrompt | _s13_normalizeDate |
 *              _s13_callGemini | _s13_buildRowValues | _s13_writeExtractedRow |
 *              _s13_processGroup
 * @changes     [v1.1.0] Task #188 הושלם במלואו — חיבור נקודת הכניסה בפועל
 *          (runS13 קורא ל-_s13_processGroup), הוספת מיפוי מערכות גוף
 *          (S13_BODY_SYSTEMS, SYS00-SYS14) עם קוד קבוע לבדיקת דם/גנטית/תרופה
 *          וקוד דינמי (Gemini) למצב רפואי/הנחיה. עמודת Medical_System נוספה
 *          בפועל ל-4 גליונות יעד (COLUMN_MAP.gs + הגליונות עצמם, סוף כל
 *          גליון) — יומן_מצב_רפואי לא נגע, כבר קיים לו Medical_System מקורי.
 */
const S13_SOURCE_SHEET = "יומן_אירועים_רפואי";

// מיפוי Routing_Category (מהאנום הסגור בן 7 הערכים) → גליון יעד
const S13_TARGET_SHEETS = {
  "בדיקת דם":              "בדיקות_דם",
  "בדיקה גנטית":           "בדיקות_גנטיות",
  "מרשם תרופה":            "תרופות_קבועות",
  "מצב רפואי":             "יומן_מצב_רפואי",
  "ניתוח/פעולה רפואית":    "יומן_מצב_רפואי",
  "הנחיה":                 "הנחיות_רפואיות_ומשימות",
  "כללי":                  "יומן_מצב_רפואי"
};

// [Task #188] מיפוי מערכות גוף — Enum סגור, קוד היררכי (SYS00-SYS14),
// מסודר לפי שכבות (מבנה→תנועה→כיסוי→בקרה→הובלה/הגנה→מערכות איבר→מולקולרי).
// הקוד הוא הערך שנכתב בפועל לתא Medical_System (לא הטקסט) — אמין יותר
// למיפוי ויזואלי עתידי (אווטאר/אינפוגרפיקה). nameHe/nameEn לתצוגה בלבד.
const S13_BODY_SYSTEMS = {
  "SYS00": { nameHe: "מערכת כללית",         nameEn: "General System"        },
  "SYS01": { nameHe: "מערכת השלד",          nameEn: "Skeletal System"       },
  "SYS02": { nameHe: "מערכת השרירים",       nameEn: "Muscular System"       },
  "SYS03": { nameHe: "מערכת הכסות",         nameEn: "Integumentary System"  },
  "SYS04": { nameHe: "מערכת העצבים",        nameEn: "Nervous System"        },
  "SYS05": { nameHe: "המערכת האנדוקרינית",  nameEn: "Endocrine System"      },
  "SYS06": { nameHe: "מערכת הדם וכלי הדם",  nameEn: "Cardiovascular System" },
  "SYS07": { nameHe: "מערכת הלימפה",        nameEn: "Lymphatic System"      },
  "SYS08": { nameHe: "מערכת החיסון",        nameEn: "Immune System"         },
  "SYS09": { nameHe: "מערכת הנשימה",        nameEn: "Respiratory System"    },
  "SYS10": { nameHe: "מערכת העיכול",        nameEn: "Digestive System"      },
  "SYS11": { nameHe: "מערכת השתן",          nameEn: "Urinary System"        },
  "SYS12": { nameHe: "מערכת הרבייה",        nameEn: "Reproductive System"   },
  "SYS13": { nameHe: "מערכות החישה",        nameEn: "Sensory Systems"       },
  "SYS14": { nameHe: "מערכת הגנים",         nameEn: "Genetic System"        }
};

// ══════════════════════════════════════════════════════════════════
// נקודת כניסה — מנגנון דואלי (שורה בודדת / אצווה), בדומה ל-runS09
// ══════════════════════════════════════════════════════════════════

function runS13() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(S13_SOURCE_SHEET);

  if (!sheet) {
    SpreadsheetApp.getUi().alert("❌ גליון '" + S13_SOURCE_SHEET + "' לא נמצא.");
    return;
  }

  const activeRow = sheet.getActiveCell().getRow();
  const firstDataRow = (SHEET_CONFIG[S13_SOURCE_SHEET] && SHEET_CONFIG[S13_SOURCE_SHEET].FIRST_DATA_ROW) || 5;

  if (activeRow >= firstDataRow) {
    _s13_processSingleRow(ss, sheet, activeRow);
  } else {
    _s13_processBatch(ss, sheet);
  }
}

// ══════════════════════════════════════════════════════════════════
// בדיקת תנאי סף לשורה בודדת ביומן_אירועים_רפואי
// ══════════════════════════════════════════════════════════════════

function _s13_checkRow(sheet, row) {
  const validationStatus  = sheet.getRange(row, 8).getValue(); // H = Validation_Status
  const extractionStatus  = sheet.getRange(row, 9).getValue(); // I = Extraction_Status

  if (validationStatus !== "מאומת") {
    return { valid: false, reason: "עמודה H (Validation_Status) אינה 'מאומת'" };
  }
  if (extractionStatus) {
    return { valid: false, reason: "עמודה I (Extraction_Status) כבר מכילה '" + extractionStatus + "'" };
  }
  return { valid: true };
}

// ══════════════════════════════════════════════════════════════════
// סריקת כל הגליון, בחירת שורות זכאיות, קיבוץ לפי File_ID
// מחזיר: [{ fileId: "...", rows: [{ row: 6, routingCategory: "...", ... }, ...] }, ...]
// ══════════════════════════════════════════════════════════════════

function _s13_getEligibleGroups(sheet) {
  const firstDataRow = (SHEET_CONFIG[S13_SOURCE_SHEET] && SHEET_CONFIG[S13_SOURCE_SHEET].FIRST_DATA_ROW) || 5;
  const lastRow = sheet.getLastRow();
  if (lastRow < firstDataRow) return [];

  const numRows = lastRow - firstDataRow + 1;
  const data = sheet.getRange(firstDataRow, 1, numRows, 9).getValues(); // A:I

  const groupsByFileId = {};

  data.forEach(function(rowData, idx) {
    const rowNum            = firstDataRow + idx;
    const eventDate          = rowData[0];
    const eventType          = rowData[1];
    const medicalSystem      = rowData[2];
    const issuer             = rowData[3];
    const summary            = rowData[4];
    const routingCategory    = rowData[5];
    const fileId              = rowData[6];
    const validationStatus   = rowData[7];
    const extractionStatus   = rowData[8];

    if (validationStatus !== "מאומת" || extractionStatus) return;
    if (!fileId) return;

    if (!groupsByFileId[fileId]) {
      groupsByFileId[fileId] = { fileId: fileId, rows: [] };
    }

    groupsByFileId[fileId].rows.push({
      row:             rowNum,
      eventDate:       eventDate,
      eventType:       eventType,
      medicalSystem:   medicalSystem,
      issuer:          issuer,
      summary:         summary,
      routingCategory: routingCategory
    });
  });

  return Object.keys(groupsByFileId).map(function(key) { return groupsByFileId[key]; });
}

// ══════════════════════════════════════════════════════════════════
// עיבוד שורה בודדת — מאתר את כל הקבוצה (אותו File_ID) ומעבד אותה כולה
// ══════════════════════════════════════════════════════════════════

function _s13_processSingleRow(ss, sheet, row) {
  const check = _s13_checkRow(sheet, row);
  if (!check.valid) {
    SpreadsheetApp.getUi().alert("⚠️ שורה " + row + " לא עומדת בתנאים:\n" + check.reason);
    return;
  }

  const fileId = sheet.getRange(row, 7).getValue(); // G = File_ID
  const groups = _s13_getEligibleGroups(sheet);
  const group  = groups.filter(function(g) { return g.fileId === fileId; })[0];

  if (!group) {
    SpreadsheetApp.getUi().alert("⚠️ לא נמצאה קבוצת שורות זכאיות עבור File_ID: " + fileId);
    return;
  }
Logger.log("[S13] עיבוד שורה בודדת — File_ID: " + fileId + " | " + group.rows.length + " שורות בקבוצה");
  const result = _s13_processGroup(ss, sheet, group);
  SpreadsheetApp.getUi().alert(
    result.success
      ? ("✅ הושלם — נכתבו " + result.written + " שורות לגליונות היעד" + (result.failed ? (" | נכשלו: " + result.failed) : ""))
      : ("❌ החילוץ נכשל — 0 שורות נכתבו. בדוק Logger לפירוט.")
  );
}

// ══════════════════════════════════════════════════════════════════
// עיבוד אצווה — כל הקבוצות הזכאיות בגליון
// ══════════════════════════════════════════════════════════════════

function _s13_processBatch(ss, sheet) {
  const groups = _s13_getEligibleGroups(sheet);
  Logger.log("[S13] אצווה — נמצאו " + groups.length + " קבוצות (File_ID) זכאיות לחילוץ");

  let totalWritten = 0;
  let totalFailed  = 0;

  groups.forEach(function(group) {
    Logger.log("[S13] File_ID: " + group.fileId + " | " + group.rows.length + " שורות");
    const result = _s13_processGroup(ss, sheet, group);
    totalWritten += result.written;
    totalFailed  += result.failed;
  });

  SpreadsheetApp.getUi().alert(
    "✅ אצווה הושלמה — " + groups.length + " קבוצות (File_ID) | " +
    "נכתבו: " + totalWritten + " שורות | נכשלו: " + totalFailed
  );
}
// ══════════════════════════════════════════════════════════════════
// [Task #188] קונפיגורציית Gemini — זהה ל-S09 (תיקוני #180)
// ══════════════════════════════════════════════════════════════════

const S13_GEMINI_MODEL = "gemini-2.5-flash";

// ══════════════════════════════════════════════════════════════════
// בלוק סכימה — השדות המדויקים שנדרשים מ-Gemini לכל Routing_Category,
// לפי COLUMN_MAP.gs (5 גליונות היעד). מוחזר כטקסט להטמעה בפרומפט.
// ══════════════════════════════════════════════════════════════════

function _s13_getSchemaBlock(routingCategory) {
  switch (routingCategory) {

    case "בדיקת דם":
      return '{"Test_Name":"","Category":"","Value":"","Normal_Range":"","Status":"תקין|גבוה|נמוך|לא תקין","Doctor_Note":""}';

    case "בדיקה גנטית":
      return '{"Panel_Name":"","Gene_Variant":"","Finding":"","Clinical_Significance":"","Recommendation":""}';

    case "מרשם תרופה":
      return '{"Drug_Name":"","Active_Ingredient":"","Dosage":"","Frequency":"","Treatment_Reason":"","Start_Date":"DD/MM/YYYY","End_Date":"DD/MM/YYYY","Status":"פעיל|הופסק"}';

    case "הנחיה":
         return '{"Task_Description":"","Task_Type":"","Due_Date":"DD/MM/YYYY","Status":"פתוח|בוצע","Medical_System":"קוד SYS00-SYS14 בלבד"}';

    case "מצב רפואי":
    case "ניתוח/פעולה רפואית":
    case "כללי":
    default:
      return '{"Medical_System":"קוד SYS00-SYS14 בלבד","Primary_Diagnosis":"","Severity_Status":"","Recommendations":""}';
  }
}
// ══════════════════════════════════════════════════════════════════
// שליפת TXT_URL מניהול_מיילים לפי File_ID — לשימוש כ-fallback בלבד
// ══════════════════════════════════════════════════════════════════

function _s13_fetchTxtUrlByFileId(fileId) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ניהול_מיילים");
  if (!sheet) return null;

  const firstDataRow = (SHEET_CONFIG["ניהול_מיילים"] && SHEET_CONFIG["ניהול_מיילים"].FIRST_DATA_ROW) || 5;
  const lastRow = sheet.getLastRow();
  if (lastRow < firstDataRow) return null;

  const data = sheet.getRange(firstDataRow, 1, lastRow - firstDataRow + 1, 24).getValues(); // A:X

  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === fileId) {
      return data[i][23] || null; // X = TXT_URL
    }
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════
// שליפת תוכן TXT בפועל — זהה ללוגיקה ב-S09 (_s09_fetchTxtContent)
// ══════════════════════════════════════════════════════════════════

function _s13_fetchTxtContent(txtUrl) {
  let fileId = null;
  try {
    if (!txtUrl) return null;
    if (txtUrl.includes("/d/")) fileId = txtUrl.split("/d/")[1].split("/")[0];
    if (txtUrl.includes("id=")) fileId = txtUrl.split("id=")[1].split("&")[0];
    if (!fileId) {
      Logger.log("[S13] לא ניתן לחלץ fileId מ-txtUrl: " + txtUrl);
      return null;
    }
    const file = DriveApp.getFileById(fileId);
    return file.getBlob().getDataAsString("UTF-8");
  } catch (e) {
    Logger.log("[S13] שגיאת קריאת TXT — fileId: " + fileId + " | txtUrl: " + txtUrl + " | שגיאה: " + e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// בניית הפרומפט המלא לקבוצת שורות (אותו File_ID) — חלופה א':
// תוכן שורות היומן בלבד. fallbackTxt מוזרק רק אם קיים (מוחלט בשלב הקריאה).
// ══════════════════════════════════════════════════════════════════

function _s13_buildPrompt(group, fallbackTxt) {
  const bodySystemsListStr = Object.keys(S13_BODY_SYSTEMS)
    .map(function(code) { return code + "=" + S13_BODY_SYSTEMS[code].nameHe; })
    .join(", ");

  let rowsBlock = "";
  group.rows.forEach(function(r, idx) {
    rowsBlock += "\n--- שורה " + (idx + 1) + " (rowIndex=" + idx + ") ---\n";
    rowsBlock += "Routing_Category: " + r.routingCategory + "\n";
    rowsBlock += "Event_Date: " + r.eventDate + "\n";
    rowsBlock += "Event_Type: " + r.eventType + "\n";
    rowsBlock += "Medical_System (חופשי, מ-S09): " + r.medicalSystem + "\n";
    rowsBlock += "Issuer: " + r.issuer + "\n";
    rowsBlock += "Summary: " + r.summary + "\n";
    rowsBlock += "סכימת JSON נדרשת לשורה זו: " + _s13_getSchemaBlock(r.routingCategory) + "\n";
  });

  let prompt =
    "אתה מומחה לחילוץ מידע רפואי מובנה. קיבלת " + group.rows.length + " שורות אירוע " +
    "שכבר סווגו וסוכמו (מסמך אחד, File_ID: " + group.fileId + "). לכל שורה — החזר אובייקט JSON " +
    "יחיד לפי הסכימה המצוינת עבורה. בסיס החילוץ הוא תוכן השורה עצמה (Summary ושאר השדות). " +
    "אם שדה נדרש חסר/לא ברור מתוך השורה בלבד — ואם סופק טקסט מסמך מלא בהמשך, חפש בו את הפרט החסר.\n" +
    "כללים: (1) תאריכים תמיד בפורמט DD/MM/YYYY בלבד, לעולם לא נקודות. " +
    "(2) עבור שורות עם סכימת Medical_System — Medical_System חייב להיות אחד מהקודים הבאים בלבד: " +
    bodySystemsListStr + ". אם לא ברור — קוד SYS00.\n" +
    rowsBlock;

  if (fallbackTxt) {
    prompt += "\n--- טקסט מסמך מלא (הקשר נוסף, רק אם שדה חסר מהשורות לעיל) ---\n" +
      fallbackTxt.substring(0, 15000) + "\n";
  }

  prompt +=
    "\nהחזר אך ורק JSON תקין (ללא טקסט נוסף) במבנה: " +
    '{"results":[{"rowIndex":0,"fields":{...לפי הסכימה...}},...]}' +
    " — מערך אחד עם " + group.rows.length + " איברים, לפי סדר השורות לעיל.";

  return prompt;
}
// ══════════════════════════════════════════════════════════════════
// נורמליזציית תאריכים — זהה ל-_s09_normalizeDate (רשת ביטחון)
// ══════════════════════════════════════════════════════════════════

function _s13_normalizeDate(dateStr) {
  if (!dateStr) return dateStr;
  const m = String(dateStr).trim().match(/^(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})$/);
  if (!m) return dateStr;
  return m[1].padStart(2, "0") + "/" + m[2].padStart(2, "0") + "/" + m[3];
}

// ══════════════════════════════════════════════════════════════════
// קריאת Gemini בפועל — מקבלת פרומפט מוכן (מ-_s13_buildPrompt), מחזירה
// אובייקט מפוענח {results:[{rowIndex,fields},...]} או null בכשל.
// טיפול שגיאות זהה ל-_s09_callGemini (HTTP/finishReason/JSON parse).
// ══════════════════════════════════════════════════════════════════

let _s13_lastFailReason = "";

function _s13_callGemini(prompt) {
  let raw = null;
  _s13_lastFailReason = "";
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    const url    = "https://generativelanguage.googleapis.com/v1beta/models/" +
                   S13_GEMINI_MODEL + ":generateContent?key=" + apiKey;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 32768, thinkingConfig: { thinkingBudget: 0 } }
    };

    const response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();
    const bodyText      = response.getContentText();

    if (responseCode !== 200) {
      _s13_lastFailReason = "HTTP_" + responseCode;
      Logger.log("[S13] שגיאת HTTP מ-Gemini — קוד: " + responseCode +
        " | גוף תשובה (1000 תווים ראשונים): " + bodyText.substring(0, 1000));
      return null;
    }

    const json      = JSON.parse(bodyText);
    const candidate = json.candidates && json.candidates[0];

    if (!candidate) {
      _s13_lastFailReason = "NO_CANDIDATE";
      Logger.log("[S13] Gemini לא החזיר candidates — promptFeedback: " +
        JSON.stringify(json.promptFeedback || {}));
      return null;
    }

    if (candidate.finishReason && candidate.finishReason !== "STOP") {
      _s13_lastFailReason = candidate.finishReason;
      Logger.log("[S13] Gemini הסתיים עם finishReason לא תקין: " + candidate.finishReason +
        " | candidate (1000 תווים ראשונים): " + JSON.stringify(candidate).substring(0, 1000));
      return null;
    }

    const textPart = candidate.content && candidate.content.parts &&
                     candidate.content.parts[0] && candidate.content.parts[0].text;

    if (!textPart) {
      _s13_lastFailReason = "NO_TEXT_PART";
      Logger.log("[S13] Gemini החזיר candidate בלי content.parts[0].text — candidate " +
        "(1000 תווים ראשונים): " + JSON.stringify(candidate).substring(0, 1000));
      return null;
    }

    raw = textPart.trim();
    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      return JSON.parse(raw);
    } catch (parseErr) {
      const firstBrace = raw.indexOf("{");
      const lastBrace   = raw.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          return JSON.parse(raw.substring(firstBrace, lastBrace + 1));
        } catch (innerErr) {
          _s13_lastFailReason = "JSON_PARSE";
          Logger.log("[S13] חילוץ תת-מחרוזת JSON נכשל גם הוא — raw (1000 תווים ראשונים): " +
            raw.substring(0, 1000));
          return null;
        }
      }
      _s13_lastFailReason = "JSON_PARSE";
      Logger.log("[S13] JSON.parse נכשל ולא נמצאו סוגריים מסולסלים תואמים — raw " +
        "(1000 תווים ראשונים): " + raw.substring(0, 1000));
      return null;
    }

  } catch (e) {
    _s13_lastFailReason = "EXCEPTION";
    Logger.log("[S13] שגיאת Gemini: " + e.message +
      (raw ? " | raw (1000 תווים ראשונים): " + raw.substring(0, 1000) : ""));
    return null;
  }
}
// ══════════════════════════════════════════════════════════════════
// בניית מערך הערכים לשורה בגליון היעד, לפי סדר העמודות המדויק
// ב-COLUMN_MAP.gs (SHEETS_MAP) לכל אחד מ-5 הגליונות.
// ctx = { fileId, issuer, eventDate } — נתונים משותפים מהאירוע המקורי.
// ══════════════════════════════════════════════════════════════════

function _s13_buildRowValues(routingCategory, fields, ctx) {
  const sourceUrl = "https://drive.google.com/file/d/" + ctx.fileId + "/view";

  switch (routingCategory) {

    case "בדיקת דם":
      // Test_Date | Test_Name | Category | Value | Normal_Range | Status | Doctor_Note | Source_URL | File_ID | Doc_Issuer
      return [
        _s13_normalizeDate(ctx.eventDate),
        fields.Test_Name || "",
        fields.Category || "",
        fields.Value || "",
        fields.Normal_Range || "",
        fields.Status || "",
        fields.Doctor_Note || "",
        sourceUrl,
        ctx.fileId,
        ctx.issuer || "",
        "SYS06"
      ];

    case "בדיקה גנטית":
      // Test_Date | Panel_Name | Gene_Variant | Finding | Clinical_Significance | Recommendation | Source_URL | File_ID
      return [
        _s13_normalizeDate(ctx.eventDate),
        fields.Panel_Name || "",
        fields.Gene_Variant || "",
        fields.Finding || "",
        fields.Clinical_Significance || "",
        fields.Recommendation || "",
        sourceUrl,
        ctx.fileId,
        "SYS14"
      ];

    case "מרשם תרופה":

      // Drug_Name | Active_Ingredient | Dosage | Frequency | Treatment_Reason | Start_Date | End_Date | Status | Doc_Issuer | Source_URL | File_ID
      return [
        fields.Drug_Name || "",
        fields.Active_Ingredient || "",
        fields.Dosage || "",
        fields.Frequency || "",
        fields.Treatment_Reason || "",
        _s13_normalizeDate(fields.Start_Date) || "",
        _s13_normalizeDate(fields.End_Date) || "",
        fields.Status || "פעיל",
        ctx.issuer || "",
        sourceUrl,
        ctx.fileId,
        "SYS00"
      ];

    case "הנחיה":

      // Instruction_Date | Doc_Issuer | Task_Description | Task_Type | Due_Date | Status | Source_URL | File_ID
      return [
        _s13_normalizeDate(ctx.eventDate),
        ctx.issuer || "",
        fields.Task_Description || "",
        fields.Task_Type || "",
        _s13_normalizeDate(fields.Due_Date) || "",
        fields.Status || "פתוח",
        sourceUrl,
        ctx.fileId,
        fields.Medical_System || "SYS00"
      ];

    
    case "מצב רפואי":
    case "ניתוח/פעולה רפואית":
    case "כללי":
    default:
      // Event_Date | Event_Type | Medical_System | Issuer | Primary_Diagnosis | Severity_Status | Recommendations | Source_URL | File_ID | Doc_Issuer | Record_Status
      return [
        _s13_normalizeDate(ctx.eventDate),
        ctx.eventType || "",
        fields.Medical_System || "SYS00",
        ctx.issuer || "",
        fields.Primary_Diagnosis || "",
        fields.Severity_Status || "",
        fields.Recommendations || "",
        sourceUrl,
        ctx.fileId,
        ctx.issuer || "",
        "חדש"
      ];
  }
}

// ══════════════════════════════════════════════════════════════════
// כתיבת שורה בודדת לגליון היעד המתאים, לפי S13_TARGET_SHEETS
// ══════════════════════════════════════════════════════════════════

function _s13_writeExtractedRow(ss, routingCategory, fields, ctx) {
  const targetSheetName = S13_TARGET_SHEETS[routingCategory] || S13_TARGET_SHEETS["כללי"];
  const sheet = ss.getSheetByName(targetSheetName);

  if (!sheet) {
    Logger.log("[S13] גליון יעד לא נמצא: " + targetSheetName + " (routingCategory: " + routingCategory + ")");
    return false;
  }

  const rowValues = _s13_buildRowValues(routingCategory, fields, ctx);
  sheet.appendRow(rowValues);
  Logger.log("[S13] נכתבה שורה ל-" + targetSheetName + " | File_ID: " + ctx.fileId);
  return true;
}
// ══════════════════════════════════════════════════════════════════
// עיבוד קבוצה מלאה: פרומפט → Gemini → (fallback ל-TXT אם חלקי) →
// כתיבה לגליונות היעד → סימון Extraction_Status="חולץ" על כל שורה
// שטופלה בהצלחה. מחזירה {success, written, failed}.
// ══════════════════════════════════════════════════════════════════

function _s13_processGroup(ss, sourceSheet, group) {
  let prompt = _s13_buildPrompt(group, null);
  let response = _s13_callGemini(prompt);

  let results = response && response.results;
  const incomplete = !results || results.length < group.rows.length;

  // חלופה א' — נופל לטקסט TXT מלא רק אם התשובה חלקית/ריקה
  if (incomplete) {
    Logger.log("[S13] File_ID " + group.fileId + " — תשובה חלקית/ריקה (סיבה: " +
      (_s13_lastFailReason || "תוצאות חסרות") + "), מנסה שוב עם fallback ל-TXT");

    const txtUrl     = _s13_fetchTxtUrlByFileId(group.fileId);
    const fallbackTxt = txtUrl ? _s13_fetchTxtContent(txtUrl) : null;

    if (fallbackTxt) {
      prompt   = _s13_buildPrompt(group, fallbackTxt);
      response = _s13_callGemini(prompt);
      results  = response && response.results;
    }
  }

  if (!results || results.length === 0) {
    Logger.log("[S13] File_ID " + group.fileId + " — כשל מלא, אין תוצאות לכתיבה (סיבה: " +
      (_s13_lastFailReason || "לא ידועה") + ")");
    return { success: false, written: 0, failed: group.rows.length };
  }

  let written = 0;
  let failed  = 0;

  results.forEach(function(result) {
    const idx = result.rowIndex;
    const eventRow = group.rows[idx];
    if (!eventRow) {
      Logger.log("[S13] File_ID " + group.fileId + " — rowIndex " + idx + " בתשובת Gemini לא תואם לשום שורה בקבוצה");
      failed++;
      return;
    }

    const ctx = {
      fileId:    group.fileId,
      issuer:    eventRow.issuer,
      eventDate: eventRow.eventDate,
      eventType: eventRow.eventType
    };

    const ok = _s13_writeExtractedRow(ss, eventRow.routingCategory, result.fields || {}, ctx);

    if (ok) {
      sourceSheet.getRange(eventRow.row, 9).setValue("חולץ"); // I = Extraction_Status
      written++;
    } else {
      failed++;
    }
  });

  Logger.log("[S13] File_ID " + group.fileId + " הושלם — נכתבו: " + written + " | נכשלו: " + failed);
  return { success: written > 0, written: written, failed: failed };
}