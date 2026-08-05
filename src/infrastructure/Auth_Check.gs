/**
 * MedicalPilot — Auth_Check.gs
 * @version 97.12 | @updated 05/08/2026 21:37 | @service S02
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/Auth_Check.gs
 * @impacts בדיקת הרשאות ל-5 שירותים: Gmail, Drive, Docs, GitHub API, Apps Script API.
 *          מציגה דוח ✅/❌ אחוד למשתמש בלבד — אין כתיבה לגיליון ואין עצירת תהליכים.
 *          תלויות: GITHUB_PAT ב-Script Properties + OAuth Token של הסקריפט.
 *          נקראת ידנית מהתפריט בלבד — אינה חלק מזרימת עיבוד אוטומטי.
 * @note [FIX-1] תיקון הרשאות גישה לתהליכי המערכת
 *       [FIX-2] הוספת checkAppsScriptAccess — בדיקת גישה לתהליכי Apps Script
 * @callers runAccessCheckIcon (ViewEngine.gs) | S02_AccessDialog.html (google.script.run)
 * @functions checkUserAccess | _buildAccessReport | _recheckAccessItem | runAccessFixAndRecheck |
 *            checkGmailAccess | checkDriveAccess | checkDocsAccess | checkGitHubAccess |
 *            checkAppsScriptAccess | auth_01_Drive..auth_06_ContainerUI
 * @changes [v97.12] Task 162 — checkUserAccess הוחלפה מ-alert טקסטואלי להחזרת מבנה
 *          נתונים; נוספו _recheckAccessItem ו-runAccessFixAndRecheck לתמיכה בדיאלוג
 *          החדש S02_AccessDialog.html (כפתורי "תקן הרשאה" ל-Gmail/Drive/Docs,
 *          "בדוק שוב" ל-GitHub/Apps Script API)
 */

// ════════════════════════════════════════════════════════════════════
// בדיקת הרשאות — לב לב המערכת
// ════════════════════════════════════════════════════════════════════

function checkUserAccess() {
  return _buildAccessReport();
}

function _buildAccessReport() {
  const gmail      = checkGmailAccess();
  const drive      = checkDriveAccess();
  const docs       = checkDocsAccess();
  const github     = checkGitHubAccess();
  const appsScript = checkAppsScriptAccess();

  return [
    { key: "gmail",      label: "הרשאות Gmail",             ok: gmail,      fixable: true,  fixFn: "gmail" },
    { key: "drive",      label: "הרשאות Drive",             ok: drive,      fixable: true,  fixFn: "drive" },
    { key: "docs",       label: "הרשאות Docs",              ok: docs,       fixable: true,  fixFn: "docs"  },
    { key: "github",     label: "חיבור GitHub",             ok: github,     fixable: false, hint: "עדכן את GITHUB_PAT ב-Script Properties (Project Settings בעורך)" },
    { key: "appsScript", label: "גישה לתהליכי Apps Script", ok: appsScript, fixable: false, hint: "הפעל את Google Apps Script API בהגדרות המשתמש: script.google.com/home/usersettings" }
  ];
}
// ════════════════════════════════════════════════════════════════════
// רענון בדיקה בודדת — משמש את חלון S02 (כפתור "בדוק שוב")
// ════════════════════════════════════════════════════════════════════

function _recheckAccessItem(key) {
  const checks = {
    gmail:      checkGmailAccess,
    drive:      checkDriveAccess,
    docs:       checkDocsAccess,
    github:     checkGitHubAccess,
    appsScript: checkAppsScriptAccess
  };
  const fn = checks[key];
  if (!fn) {
    return { key: key, ok: false, error: "בדיקה לא מוכרת: " + key };
  }
  try {
    return { key: key, ok: fn() };
  } catch (e) {
    return { key: key, ok: false, error: e.message };
  }
}
// ════════════════════════════════════════════════════════════════════
// הפעלת אילוץ הרשאה בכוח + רענון מיידי — משמש את חלון S02
// (Gmail / Drive / Docs בלבד — לא GitHub/Apps Script API, שאינם ניתנים לתיקון תכנותי)
// ════════════════════════════════════════════════════════════════════

function runAccessFixAndRecheck(key) {
  const fixMap = {
    gmail: auth_04_Gmail,
    drive: auth_01_Drive,
    docs:  auth_03_Docs
  };
  const fixFn = fixMap[key];
  if (!fixFn) {
    throw new Error("לא ניתן להריץ תיקון תכנותי עבור: " + key);
  }
  try {
    fixFn();
  } catch (e) {
    // הפעלת פרומפט הסכמה עלולה לזרוק שגיאה כחלק מתהליך ההרשאה עצמו —
    // לא עוצר את הבדיקה החוזרת, כי המטרה היא לבדוק את הסטטוס בפועל אחרי הניסיון
  }
  return _recheckAccessItem(key);
}
// ════════════════════════════════════════════════════════════════════
// בדיקת גישה לתהליכי-Gmail
// ════════════════════════════════════════════════════════════════════

function checkGmailAccess() {
  try {
    GmailApp.getInboxThreads(0, 1);
    Logger.log("Gmail: קריאה נכונה");
    return true;
  } catch (e) {
    Logger.log("Gmail: כישלון — " + e.message);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════
// בדיקת גישה לתהליכי-Drive
// ════════════════════════════════════════════════════════════════════

function checkDriveAccess() {
  try {
    DriveApp.getRootFolder();
    Logger.log("Drive: קריאה נכונה");
    return true;
  } catch (e) {
    Logger.log("Drive: כישלון — " + e.message);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════
// בדיקת גישה לתהליכי-Google Docs
// ════════════════════════════════════════════════════════════════════

function checkDocsAccess() {
  try {
    const files = DriveApp.getFilesByType(MimeType.GOOGLE_DOCS);
    if (files.hasNext()) { files.next(); }
    Logger.log("Docs: קריאה נכונה");
    return true;
  } catch (e) {
    Logger.log("Docs: כישלון — " + e.message);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════
// בדיקת חיבור GitHub
// ════════════════════════════════════════════════════════════════════

function checkGitHubAccess() {
  try {
    const token = PropertiesService.getScriptProperties().getProperty("GITHUB_PAT");
    if (!token) {
      Logger.log("GitHub: טוקן לא נמצא");
      return false;
    }
    const response = UrlFetchApp.fetch(
      "https://api.github.com/repos/cohenamos07/MedicalPilot",
      {
        method:             "get",
        headers:            {
          "Authorization": "token " + token,
          "Accept":        "application/vnd.github.v3+json"
        },
        muteHttpExceptions: true
      }
    );
    const ok = response.getResponseCode() === 200;
    Logger.log("GitHub: " + (ok ? "קריאה נכונה" : "כישלון — קוד " + response.getResponseCode()));
    return ok;
  } catch (e) {
    Logger.log("GitHub: כישלון — " + e.message);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════
// [FIX-2] בדיקת גישה לתהליכי Apps Script API
// ════════════════════════════════════════════════════════════════════

function checkAppsScriptAccess() {
  try {
    const scriptId = "1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf";
    const url      = "https://script.googleapis.com/v1/projects/" + scriptId + "/content";

    const response = UrlFetchApp.fetch(url, {
      method:             "get",
      headers:            { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();

    if (code !== 200) {
      Logger.log("Apps Script API: כישלון — קוד " + code);
      return false;
    }

    const data  = JSON.parse(response.getContentText());
    const files = (data.files || []).filter(f => f.type === "SERVER_JS");

    if (files.length === 0) {
      Logger.log("Apps Script API: לא נמצאו קבצי סקריפט — בדוק Script ID");
      return false;
    }

    Logger.log("Apps Script API: קריאה נכונה — " + files.length + " קבצים נמצאו");
    return true;

  } catch (e) {
    Logger.log("Apps Script API: כישלון — " + e.message);
    return false;
  }
}


// ══════════════════════════════════════════════════════════════════
// בדיקת הרשאה מבודדת — שירות אחד בכל פעם
// הרץ אחת בכל פעם (לא את כולן ברצף) — כדי לבודד היכן נתקע
// ══════════════════════════════════════════════════════════════════

function auth_01_Drive() {
  var folder = DriveApp.getRootFolder();
  Logger.log("Drive: " + folder.getName());
}

function auth_02_Sheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log("Sheets: " + ss.getName());
}

function auth_03_Docs() {
  var docs = DriveApp.getFilesByType(MimeType.GOOGLE_DOCS);
  if (docs.hasNext()) { docs.next(); }
  Logger.log("Docs: גישה אושרה");
}

function auth_04_Gmail() {
  GmailApp.getInboxThreads(0, 1);
  Logger.log("Gmail: גישה אושרה");
}

function auth_05_ExternalNetwork() {
  var resp = UrlFetchApp.fetch("https://api.github.com", { muteHttpExceptions: true });
  Logger.log("רשת חיצונית: קוד " + resp.getResponseCode());
}

function auth_06_ContainerUI() {
  SpreadsheetApp.getUi().alert("בדיקת הרשאת UI — הצליח ✅");
  Logger.log("Container UI: גישה אושרה");
}
