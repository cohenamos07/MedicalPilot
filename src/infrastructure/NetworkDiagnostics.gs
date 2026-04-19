/**
 * MedicalPilot — NetworkDiagnostics.gs
 * שירות S01 — בדיקות רשת ונגישות
 * @version v98.0 | @updated 19/04/2026 | @service S01
 * שינוי: הוספת testAiResponse ו-listGeminiModels לאבחון AI מלא
 */

/**
 * אבחון AI מלא — בודק חיבור, הרשאה, מודלים ותקשורת חיה.
 * מחובר לתפריט: LA ← כלי פיתוח ← אבחון AI
 */
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
    // שלב 1 — חיבור לשרת
    results.connectivity = _checkAiConnectivity();

    // שלב 2 — תקינות מפתח
    results.authorization = _checkAiAuthorization();

    if (!apiKey) throw new Error("מפתח API חסר ב-Script Properties.");

    // שלב 3 — ספירת מודלים זמינים
    const modelsUrl = "https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey;
    const modelsResponse = UrlFetchApp.fetch(modelsUrl, { method: "get", muteHttpExceptions: true });
    if (modelsResponse.getResponseCode() === 200) {
      const modelsData = JSON.parse(modelsResponse.getContentText());
      results.modelCount = (modelsData.models || []).length;
    }

    // שלב 4 — בדיקת תקשורת אמיתית עם המודלים הנכונים
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
          results.modelUsed = modelName;
          results.isReady = true;
          break;
        } else if (code === 429) {
          lastError = "429 (מכסה מוצתה)";
          Logger.log("מכסה מוצתה ל-" + modelName + " — עובר לבא");
        } else {
          lastError = "קוד " + code + " עבור " + modelName;
          Logger.log(lastError);
        }
      } catch (e) {
        lastError = e.message;
        Logger.log("שגיאה ב-" + modelName + ": " + e.message);
      }
    }

    if (!results.isReady) {
      results.aiResponse = "שגיאה: " + lastError;
    }

    // בניית Alert סופי
    const conclusion = results.isReady ? "S07 מוכן לעבוד ✅" : "בעיה בתקשורת AI ❌";
    const message =
      "חיבור לשרת:      " + results.connectivity    + "\n" +
      "תקינות מפתח:     " + results.authorization   + "\n" +
      "מודלים זמינים:   " + results.modelCount + " מודלים\n" +
      "──────────────\n" +
      "בדיקת תקשורת:\n" +
      "מודל: "            + results.modelUsed        + "\n" +
      "שאלה: ענה במילה אחת בעברית: מה צבע השמיים?\n" +
      "תשובה: "           + results.aiResponse       + "\n" +
      "──────────────\n" +
      "מסקנה: "           + conclusion;

    ui.alert("🔍 אבחון AI — MedicalPilot", message, ui.ButtonSet.OK);

  } catch (e) {
    Logger.log("שגיאה ב-testAiResponse: " + e.message);
    ui.alert("שגיאה בתהליך האבחון: " + e.message);
  }
}

/**
 * מציגה את כל מודלי Flash הזמינים תחת המפתח הנוכחי.
 */
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

/**
 * בדיקת רשת חיצונית.
 */
function checkExternalNetwork() {
  const url = "https://www.google.com";
  try {
    const response = UrlFetchApp.fetch(url, { method: "get", muteHttpExceptions: true });
    const code = response.getResponseCode();
    if (code === 200) { Logger.log("רשת חיצונית תקינה"); return true; }
    Logger.log("רשת חיצונית נכשלה — קוד: " + code); return false;
  } catch (e) { Logger.log("שגיאת רשת: " + e.message); return false; }
}

/**
 * בדיקת נגישות GitHub.
 */
function checkGitHubConnectivity() {
  const url = "https://api.github.com";
  try {
    const response = UrlFetchApp.fetch(url, { method: "get", muteHttpExceptions: true });
    const code = response.getResponseCode();
    if (code === 200 || code === 403) { Logger.log("גיטהאב נגיש"); return true; }
    Logger.log("גיטהאב לא נגיש — קוד: " + code); return false;
  } catch (e) { Logger.log("שגיאת גיטהאב: " + e.message); return false; }
}

/**
 * בדיקת תקינות מלאה — רשת + AI.
 */
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
    const aiConnStatus = _checkAiConnectivity();
    const aiAuthStatus = _checkAiAuthorization();
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
      "חיבור שירות AI: "     + aiConnStatus + "\n" +
      "הרשאת שירות AI: "     + aiAuthStatus;
    SpreadsheetApp.getUi().alert("בדיקת תקינות מערכת — v98.0", message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log("שגיאה ב-runSystemHealthCheck: " + e.message);
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}

/**
 * בדיקת חיבור לשרתי Gemini ללא מפתח.
 */
function _checkAiConnectivity() {
  try {
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models?key=PING_TEST_ONLY";
    const response = UrlFetchApp.fetch(endpoint, { method: "get", muteHttpExceptions: true });
    const code = response.getResponseCode();
    if (code === 200 || code === 400 || code === 401 || code === 403) return "תקין ✓";
    return "נכשל ✗ (קוד: " + code + ")";
  } catch (e) { return "נכשל ✗ (" + e.message + ")"; }
}

/**
 * בדיקת תקינות מפתח GEMINI_API_KEY.
 */
function _checkAiAuthorization() {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (!apiKey || apiKey.trim() === "") return "לא מורשה ✗ (מפתח חסר)";
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey;
    const response = UrlFetchApp.fetch(endpoint, { method: "get", muteHttpExceptions: true });
    const code = response.getResponseCode();
    if (code === 200) return "מורשה ✓";
    if (code === 401) return "לא מורשה ✗ (401)";
    if (code === 403) return "לא מורשה ✗ (403)";
    if (code === 429) return "מורשה ✓ (429 — מכסה מוצתה)";
    return "לא מורשה ✗ (קוד: " + code + ")";
  } catch (e) { return "לא מורשה ✗ (" + e.message + ")"; }
}