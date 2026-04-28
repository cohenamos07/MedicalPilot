 /**
 * MedicalPilot — NetworkDiagnostics.gs
 * @version 99.0 | @updated 28/04/2026 17:15 | @service S01
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/NetworkDiagnostics.gs
 * תפקיד: בדיקות רשת + אבחון AI + ניהול מאזן מחלצים
 * שינוי: הוספת ניהול מאזן מחלצים — loadExtractors, getAvailableExtractor, updateExtractorUsage, resetDailyUsage, showExtractorBalance
 */

// ══════════════════════════════════════════════════════════════════
// קבועים — מנהל מחלצים
// ══════════════════════════════════════════════════════════════════

const EXTRACTOR_SHEET_NAME = "מנהל_משאבים";

// ══════════════════════════════════════════════════════════════════
// פונקציה 1 — טעינת מחלצים מהגליון לזיכרון
// ══════════════════════════════════════════════════════════════════

/**
 * קורא את גליון מנהל_משאבים פעם אחת לזיכרון.
 * כל שירות (S06, S07) יקרא לפונקציה זו בתחילת ריצה.
 * @return {Array} מערך של אובייקטי מחלץ
 */
function loadExtractors() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(EXTRACTOR_SHEET_NAME);
  if (!sheet) throw new Error("גליון " + EXTRACTOR_SHEET_NAME + " לא נמצא — הרץ buildSheetFromMap");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();

  return data.map(function(row, i) {
    return {
      rowIndex:        i + 2,
      id:              row[0],
      url:             row[1],
      dailyQuota:      Number(row[2]),
      usedToday:       Number(row[3]),
      remaining:       Number(row[4]),
      rpmLimit:        Number(row[5]),
      status:          row[6].toString(),
      complexityMatch: row[7].toString().split(",").map(function(s) { return s.trim().toUpperCase(); }),
      resetTime:       row[8],
      lastUsed:        row[9],
      notes:           row[10]
    };
  });
}

// ══════════════════════════════════════════════════════════════════
// פונקציה 2 — מציאת מחלץ פנוי לפי מורכבות
// ══════════════════════════════════════════════════════════════════

/**
 * מחזיר את המחלץ המתאים והפנוי ביותר.
 * נקרא ע"י S06 ו-S07 לפני כל קריאת API.
 * @param {string} complexity — SIMPLE | MEDIUM | COMPLEX | DIAGNOSTICS | TABLES | ULTIMATE | HANDWRITING | MEDICAL_DEEP
 * @return {Object|null} אובייקט מחלץ או null אם הכל אזל
 */
function getAvailableExtractor(complexity) {
  const extractors = loadExtractors();
  const upper = complexity.toString().trim().toUpperCase();

  // חיפוש מחלץ מתאים עם קרדיט
  for (var i = 0; i < extractors.length; i++) {
    var e = extractors[i];
    if (!e.status.includes("ACTIVE")) continue;
    if (e.remaining <= 0)            continue;
    if (e.complexityMatch.indexOf(upper) !== -1) return e;
  }

  // Fallback — מורכבות גבוהה אבל המחלץ המתאים אזל → Flash כגיבוי
  for (var j = 0; j < extractors.length; j++) {
    var f = extractors[j];
    if (f.status.includes("ACTIVE") && f.remaining > 0) {
      Logger.log("Fallback: " + upper + " → " + f.id + " (מחלץ ראשי אזל)");
      return f;
    }
  }

  Logger.log("אין מחלץ פנוי — כל המכסות מוצו");
  return null;
}

// ══════════════════════════════════════════════════════════════════
// פונקציה 3 — עדכון שימוש אחרי קריאת API מוצלחת
// ══════════════════════════════════════════════════════════════════

/**
 * מעדכן +1 ל-Used_Today ומעדכן Last_Used.
 * נקרא ע"י S06 ו-S07 אחרי כל קריאת API מוצלחת.
 * @param {string} extractorId — ID המחלץ (למשל GEMINI_FLASH_1.5)
 */
function updateExtractorUsage(extractorId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(EXTRACTOR_SHEET_NAME);
  if (!sheet) { Logger.log("גליון מנהל_משאבים לא נמצא"); return; }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === extractorId) {
      const row = i + 2;
      const used = sheet.getRange(row, 4).getValue();
      sheet.getRange(row, 4).setValue(Number(used) + 1);
      sheet.getRange(row, 10).setValue(Utilities.formatDate(new Date(), "GMT+3", "dd/MM/yyyy HH:mm:ss"));
      Logger.log("עדכון שימוש: " + extractorId + " → " + (Number(used) + 1));
      return;
    }
  }
  Logger.log("מחלץ לא נמצא בגליון: " + extractorId);
}

// ══════════════════════════════════════════════════════════════════
// פונקציה 4 — איפוס שימוש יומי (טריגר לילי)
// ══════════════════════════════════════════════════════════════════

/**
 * מאפס את Used_Today לכל המחלצים.
 * מיועד לטריגר יומי בחצות.
 */
function resetDailyUsage() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(EXTRACTOR_SHEET_NAME);
  if (!sheet) { Logger.log("גליון מנהל_משאבים לא נמצא"); return; }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  for (var i = 2; i <= lastRow; i++) {
    sheet.getRange(i, 4).setValue(0);
  }

  Logger.log("✅ איפוס יומי בוצע — " + Utilities.formatDate(new Date(), "GMT+3", "dd/MM/yyyy HH:mm"));
}

// ══════════════════════════════════════════════════════════════════
// פונקציה 5 — הצגת מאזן מחלצים (מהתפריט)
// ══════════════════════════════════════════════════════════════════

/**
 * מציג alert עם מצב כל המחלצים.
 * מחובר לתפריט: ניהול מערכת ← הצג מאזן מחלצים
 */
function showExtractorBalance() {
  const ui = SpreadsheetApp.getUi();
  try {
    const extractors = loadExtractors();
    if (extractors.length === 0) {
      ui.alert("גליון מנהל_משאבים ריק — הרץ buildSheetFromMap");
      return;
    }

    let report = "מאזן מחלצים — " + Utilities.formatDate(new Date(), "GMT+3", "dd/MM/yyyy HH:mm") + "\n";
    report += "═".repeat(40) + "\n\n";

    extractors.forEach(function(e) {
      const pct = e.dailyQuota > 0 ? Math.round((e.remaining / e.dailyQuota) * 100) : 0;
      report += e.id + "\n";
      report += "  סטטוס: "   + e.status + "\n";
      report += "  נשאר: "    + e.remaining + " / " + e.dailyQuota + " (" + pct + "%)\n";
      report += "  קצב מקס: " + e.rpmLimit + " לדקה\n";
      report += "  מתאים ל: " + e.complexityMatch.join(", ") + "\n";
      if (e.lastUsed) report += "  שימוש אחרון: " + e.lastUsed + "\n";
      report += "\n";
    });

    ui.alert("📊 מאזן מחלצים", report, ui.ButtonSet.OK);

  } catch (e) {
    ui.alert("שגיאה: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// פונקציה 6 — בדיקת כל המחלצים (חיבור + הרשאה)
// ══════════════════════════════════════════════════════════════════

/**
 * בודק חיבור והרשאה לכל המחלצים ברשימה.
 * משתמש בפונקציות הקיימות _checkAiConnectivity ו-_checkAiAuthorization.
 * מחובר לתפריט: ניהול מערכת ← בדוק כל המחלצים
 */
function checkAllExtractors() {
  const ui = SpreadsheetApp.getUi();
  try {
    const extractors = loadExtractors();
    const connectivity  = _checkAiConnectivity();
    const authorization = _checkAiAuthorization();

    let report = "בדיקת מחלצים — " + Utilities.formatDate(new Date(), "GMT+3", "dd/MM/yyyy HH:mm") + "\n";
    report += "═".repeat(40) + "\n\n";
    report += "חיבור לשרתי Gemini: " + connectivity  + "\n";
    report += "תקינות מפתח API:    " + authorization + "\n\n";
    report += "── מחלצים מוגדרים ──\n";

    extractors.forEach(function(e) {
      report += e.id + " → " + e.status + " | נשאר: " + e.remaining + "\n";
    });

    ui.alert("🔌 בדיקת מחלצים", report, ui.ButtonSet.OK);

  } catch (e) {
    ui.alert("שגיאה: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// פונקציה 7 — הגדרת טריגר לילי לאיפוס יומי
// ══════════════════════════════════════════════════════════════════

/**
 * יוצר טריגר יומי שמריץ resetDailyUsage בחצות.
 * מריצים פעם אחת בלבד מהעורך.
 */
function createDailyResetTrigger() {
  const ui = SpreadsheetApp.getUi();

  // מחיקת טריגרים קיימים באותו שם כדי לא לשכפל
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === "resetDailyUsage") {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger("resetDailyUsage")
    .timeBased()
    .atHour(0)
    .everyDays(1)
    .create();

  ui.alert("✅ טריגר יומי נוצר — resetDailyUsage ירוץ כל לילה בחצות.");
}

// ══════════════════════════════════════════════════════════════════
// פונקציות בדיקות רשת קיימות (ללא שינוי)
// ══════════════════════════════════════════════════════════════════

function testAiResponse() {
  const ui = SpreadsheetApp.getUi();
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

  let results = {
    connectivity: "",
    authorization: "",
    modelCount: 0,
    modelUsed: "N/A",
    aiResponse: "לא התקבלה",
    isReady: false
  };

  try {
    results.connectivity  = _checkAiConnectivity();
    results.authorization = _checkAiAuthorization();

    if (!apiKey) throw new Error("מפתח API חסר ב-Script Properties.");

    const modelsUrl = "https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey;
    const modelsResponse = UrlFetchApp.fetch(modelsUrl, { method: "get", muteHttpExceptions: true });
    if (modelsResponse.getResponseCode() === 200) {
      const modelsData = JSON.parse(modelsResponse.getContentText());
      results.modelCount = (modelsData.models || []).length;
    }

    const modelsToTest = ["gemini-2.5-flash", "gemini-2.0-flash"];
    let lastError = "";

    for (let i = 0; i < modelsToTest.length; i++) {
      const modelName = modelsToTest[i];
      try {
        const generateUrl = "https://generativelanguage.googleapis.com/v1beta/models/" +
                            modelName + ":generateContent?key=" + apiKey;
        const payload = {
          contents: [{ parts: [{ text: "ענה במילה אחת בעברית: מה צבע השמיים?" }] }]
        };
        const response = UrlFetchApp.fetch(generateUrl, {
          method: "post",
          contentType: "application/json",
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        });
        const code = response.getResponseCode();
        const data = JSON.parse(response.getContentText());

        if (code === 200) {
          results.aiResponse = data.candidates[0].content.parts[0].text.trim();
          results.modelUsed  = modelName;
          results.isReady    = true;
          break;
        } else if (code === 429) {
          lastError = "429 (מכסה מוצתה)";
        } else {
          lastError = "קוד " + code + " עבור " + modelName;
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    if (!results.isReady) results.aiResponse = "שגיאה: " + lastError;

    const conclusion = results.isReady ? "S07 מוכן לעבוד ✅" : "בעיה בתקשורת AI ❌";
    const message =
      "חיבור לשרת:      " + results.connectivity  + "\n" +
      "תקינות מפתח:     " + results.authorization + "\n" +
      "מודלים זמינים:   " + results.modelCount + " מודלים\n" +
      "──────────────\n" +
      "מודל: "            + results.modelUsed   + "\n" +
      "שאלה: ענה במילה אחת בעברית: מה צבע השמיים?\n" +
      "תשובה: "           + results.aiResponse  + "\n" +
      "──────────────\n" +
      "מסקנה: "           + conclusion;

    ui.alert("🔍 אבחון AI — MedicalPilot", message, ui.ButtonSet.OK);

  } catch (e) {
    ui.alert("שגיאה בתהליך האבחון: " + e.message);
  }
}

function listGeminiModels() {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) { SpreadsheetApp.getUi().alert("מפתח GEMINI_API_KEY לא נמצא."); return; }
    const url = "https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey;
    const response = UrlFetchApp.fetch(url, { method: "get", muteHttpExceptions: true });
    const code = response.getResponseCode();
    if (code !== 200) {
      SpreadsheetApp.getUi().alert("שגיאה: קוד " + code + "\n" + response.getContentText().substring(0, 300));
      return;
    }
    const data = JSON.parse(response.getContentText());
    const models = data.models || [];
    const flashModels = models
      .map(function(m) { return m.name.replace("models/", ""); })
      .filter(function(n) { return n.includes("flash"); })
      .join("\n");
    SpreadsheetApp.getUi().alert(
      "אבחון AI — מודלי Flash זמינים",
      "סה\"כ מודלים: " + models.length + "\n\nמודלי Flash:\n\n" + flashModels,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}

function checkExternalNetwork() {
  try {
    const response = UrlFetchApp.fetch("https://www.google.com", { method: "get", muteHttpExceptions: true });
    const ok = response.getResponseCode() === 200;
    Logger.log("רשת חיצונית: " + (ok ? "תקינה" : "נכשלה"));
    return ok;
  } catch (e) { Logger.log("שגיאת רשת: " + e.message); return false; }
}

function checkGitHubConnectivity() {
  try {
    const response = UrlFetchApp.fetch("https://api.github.com", { method: "get", muteHttpExceptions: true });
    const code = response.getResponseCode();
    const ok = (code === 200 || code === 403);
    Logger.log("גיטהאב: " + (ok ? "נגיש" : "לא נגיש — קוד " + code));
    return ok;
  } catch (e) { Logger.log("שגיאת גיטהאב: " + e.message); return false; }
}

function runSystemHealthCheck() {
  try {
    const networkOk = checkExternalNetwork();
    const githubOk  = checkGitHubConnectivity();
    let gmailOk = false;
    try { GmailApp.getInboxThreads(0, 1); gmailOk = true; } catch (e) {}
    let driveOk = false;
    try { DriveApp.getRootFolder(); driveOk = true; } catch (e) {}

    const now = Utilities.formatDate(new Date(), "GMT+3", "dd/MM/yyyy HH:mm");
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ניהול_מיילים");
    const rowCount = sheet ? Math.max(sheet.getLastRow() - 1, 0) : 0;
    const lastRun = PropertiesService.getScriptProperties().getProperty("DRIVE_SYNC_LAST_RUN");
    let driveStatus = "טרם בוצעה";
    if (lastRun) {
      try { driveStatus = Utilities.formatDate(new Date(lastRun), "GMT+3", "dd/MM/yyyy HH:mm"); }
      catch (e) { driveStatus = lastRun; }
    }

    const message =
      "רשת חיצונית: "        + (networkOk ? "תקין ✓" : "נכשל ✗")    + "\n" +
      "גישה לגיטהאב: "       + (githubOk  ? "נגיש ✓" : "לא נגיש ✗") + "\n" +
      "חיבור Gmail: "        + (gmailOk   ? "תקין ✓" : "נכשל ✗")    + "\n" +
      "חיבור Drive: "        + (driveOk   ? "תקין ✓" : "נכשל ✗")    + "\n" +
      "──────────────\n" +
      "זמן: "                + now         + "\n" +
      "שורות בגליון: "       + rowCount    + "\n" +
      "סריקת Drive אחרונה: " + driveStatus + "\n" +
      "──────────────\n" +
      "חיבור שירות AI: "     + _checkAiConnectivity()  + "\n" +
      "הרשאת שירות AI: "     + _checkAiAuthorization();

    SpreadsheetApp.getUi().alert("בדיקת תקינות מערכת — v99.0", message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}

function _checkAiConnectivity() {
  try {
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models?key=PING_TEST_ONLY";
    const response = UrlFetchApp.fetch(endpoint, { method: "get", muteHttpExceptions: true });
    const code = response.getResponseCode();
    if (code === 200 || code === 400 || code === 401 || code === 403) return "תקין ✓";
    return "נכשל ✗ (קוד: " + code + ")";
  } catch (e) { return "נכשל ✗ (" + e.message + ")"; }
}

function _checkAiAuthorization() {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (!apiKey || apiKey.trim() === "") return "לא מורשה ✗ (מפתח חסר)";
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey;
    const response = UrlFetchApp.fetch(endpoint, { method: "get", muteHttpExceptions: true });
    const code = response.getResponseCode();
    if (code === 200)  return "מורשה ✓";
    if (code === 401)  return "לא מורשה ✗ (401)";
    if (code === 403)  return "לא מורשה ✗ (403)";
    if (code === 429)  return "מורשה ✓ (429 — מכסה מוצתה)";
    return "לא מורשה ✗ (קוד: " + code + ")";
  } catch (e) { return "לא מורשה ✗ (" + e.message + ")"; }
}
