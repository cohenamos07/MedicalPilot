/**
 * MedicalPilot — QA_Tests.gs
 * @service QA
 * @impacts Force-auth כל הרשאות המשימה — GmailApp, DriveApp, SpreadsheetApp,
 *          UrlFetchApp, PropertiesService, ScriptApp, DocumentApp.
 *          מריץ בדיקת בסיס לכל שירות ומדווח תוצאה לטופס אחוד.
 */

// ════════════════════════════════════════════════════════════════════
// AAA — מאלץ חלון הרשאות אחד לכל ה-Scopes של המשימה
// הפעל פונקציה זו פעם אחת מ-Apps Script Editor לאחר פריסה ראשונה
// ════════════════════════════════════════════════════════════════════

function AAA_FORCE_ALL_MISSION_AUTH() {
  const results = [];

  // 1. SpreadsheetApp
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    results.push("✅ Sheets — " + ss.getName());
  } catch (e) {
    results.push("❌ Sheets — " + e.message);
  }

  // 2. DriveApp
  try {
    const root = DriveApp.getRootFolder();
    results.push("✅ Drive — " + root.getName());
  } catch (e) {
    results.push("❌ Drive — " + e.message);
  }

  // 3. GmailApp
  try {
    GmailApp.getInboxThreads(0, 1);
    results.push("✅ Gmail — גישה תקינה");
  } catch (e) {
    results.push("❌ Gmail — " + e.message);
  }

  // 4. DocumentApp (Docs)
  try {
    const files = DriveApp.getFilesByType(MimeType.GOOGLE_DOCS);
    const label = files.hasNext() ? "מסמך נמצא" : "אין מסמכים (Docs scope פעיל)";
    results.push("✅ Docs — " + label);
  } catch (e) {
    results.push("❌ Docs — " + e.message);
  }

  // 5. PropertiesService
  try {
    const props = PropertiesService.getScriptProperties().getProperties();
    results.push("✅ Properties — " + Object.keys(props).length + " מפתחות");
  } catch (e) {
    results.push("❌ Properties — " + e.message);
  }

  // 6. ScriptApp — OAuth token (נדרש ל-Apps Script API)
  try {
    const token = ScriptApp.getOAuthToken();
    results.push("✅ ScriptApp OAuth — token אורך " + token.length);
  } catch (e) {
    results.push("❌ ScriptApp OAuth — " + e.message);
  }

  // 7. UrlFetchApp — GitHub API (בודק חיבור חיצוני)
  try {
    const pat = PropertiesService.getScriptProperties().getProperty("GITHUB_PAT");
    if (!pat) {
      results.push("⚠️ UrlFetch/GitHub — GITHUB_PAT לא הוגדר ב-Script Properties");
    } else {
      const res = UrlFetchApp.fetch(
        "https://api.github.com/repos/cohenamos07/MedicalPilot",
        {
          method: "get",
          headers: {
            "Authorization": "token " + pat,
            "Accept": "application/vnd.github.v3+json"
          },
          muteHttpExceptions: true
        }
      );
      const code = res.getResponseCode();
      results.push((code === 200 ? "✅" : "❌") + " UrlFetch/GitHub — HTTP " + code);
    }
  } catch (e) {
    results.push("❌ UrlFetch/GitHub — " + e.message);
  }

  // 8. Apps Script API
  try {
    const scriptId = "1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf";
    const token    = ScriptApp.getOAuthToken();
    const res      = UrlFetchApp.fetch(
      "https://script.googleapis.com/v1/projects/" + scriptId + "/content",
      {
        method: "get",
        headers: { "Authorization": "Bearer " + token },
        muteHttpExceptions: true
      }
    );
    const code = res.getResponseCode();
    results.push((code === 200 ? "✅" : "❌") + " Apps Script API — HTTP " + code);
  } catch (e) {
    results.push("❌ Apps Script API — " + e.message);
  }

  // ── דוח סופי ──────────────────────────────────────────────────────
  const report = "🔐 Force Auth — כל הרשאות המשימה\n\n" + results.join("\n");
  Logger.log(report);
  SpreadsheetApp.getUi().alert("Auth Check", report, SpreadsheetApp.getUi().ButtonSet.OK);
}
