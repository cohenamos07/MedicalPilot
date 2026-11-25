/**
 * MedicalPilot — Auth_Check.gs
 * @version 98.0 | @updated 24/11/2026 20:30 | @service S02
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/Auth_Check.gs
 * @impacts בדיקת הרשאות ל-5 שירותים: Gmail, Drive, Docs, GitHub API, Apps Script API.
 *          מציגה דוח ✅/❌ אחוד למשתמש בלבד — אין כתיבה לגיליון ואין עצירת תהליכים.
 *          תלויות: GITHUB_PAT ב-Script Properties + OAuth Token של הסקריפט.
 *          נקראת ידנית מהתפריט בלבד — אינה חלק מזרימת עיבוד אוטומטי.
 *          [v98.0] S02 — "בדיקת הרשאות גוגל": 9 בדיקות — Gmail, Drive, Docs, גליון פעיל,
 *          גליון לפי מזהה (openById, S17), רשת חיצונית, חלון מעל הגליון (script.container.ui),
 *          GitHub, Apps Script API. כל בדיקת Google — ההרשאה ברשימת getAuthorizedScopes וגם
 *          בדיקה בפועל. authorizeAllScopes — requireAllScopes(FULL): חסרה הרשאה — ההרצה נעצרת
 *          ו-Google מציגה מסך הסכמה אחד ("בחירת הכול"); הכול מאושר — חלון S02
 *          (showGoogleAccessDialog). אין כתיבה לגליון. auth_01..auth_08 — אבחון ידני מהעורך.
 * @note [FIX-1] תיקון הרשאות גישה לתהליכי המערכת
 *       [FIX-2] הוספת checkAppsScriptAccess — בדיקת גישה לתהליכי Apps Script
 *       [v98.0] אסור לעטוף את requireAllScopes ב-try/catch — הלכידה מונעת את מסך ההסכמה.
 * @callers runAccessCheckIcon (ViewEngine.gs) | S02_AccessDialog.html (google.script.run)
 *          [v98.0] תפריט LA ← 🔬 כלי פיתוח ← 🔐 אישור כל ההרשאות (Menu_LAB.gs → authorizeAllScopes) |
 *          הרצה מהעורך (authorizeAllScopes, auth_01..auth_08)
 * @functions checkUserAccess | _buildAccessReport | _recheckAccessItem | runAccessFixAndRecheck |
 *            checkGmailAccess | checkDriveAccess | checkDocsAccess | checkGitHubAccess |
 *            checkAppsScriptAccess | auth_01_Drive..auth_06_ContainerUI
 *            [v98.0] runAccessFixAndRecheck הוסרה. נוספו: authorizeAllScopes | showGoogleAccessDialog |
 *            _authGrantedScopes | _accessChecks | _runAccessCheck | checkActiveSheetAccess |
 *            checkSheetByIdAccess | checkExternalNetworkAccess | auth_07_SheetsById |
 *            auth_08_ContainerUIDialog (נוספו ב-12/11/2026, Task #260, בלי עדכון כותרת)
 * @changes [v98.0] Task #255 — S02 "בדיקת הרשאות גוגל": נקודת כניסה אחת authorizeAllScopes
 *          (requireAllScopes — מסך הסכמה אחד לכל ההרשאות החסרות; מסך ההסכמה של Google מאפשר
 *          אישור חלקי מינואר 2025). 9 בדיקות במקום 5, כל אחת לפי getAuthorizedScopes + בדיקה בפועל;
 *          3 בדיקות בפועל חדשות (גליון פעיל, openById, רשת חיצונית). הוסרה runAccessFixAndRecheck —
 *          google.script.run מתוך חלון אינו יכול להציג מסך הסכמה (תועד 03/09/2026). אומת: diff מדויק,
 *          node --check, הדמיה, ובדיקה בפועל — מסך ההסכמה נפתח מהאייקון, אחרי "בחירת הכול" 9/9 ✅.
 *          [v97.12] Task 162 — checkUserAccess הוחלפה מ-alert טקסטואלי להחזרת מבנה
 *          נתונים; נוספו _recheckAccessItem ו-runAccessFixAndRecheck לתמיכה בדיאלוג
 *          החדש S02_AccessDialog.html (כפתורי "תקן הרשאה" ל-Gmail/Drive/Docs,
 *          "בדוק שוב" ל-GitHub/Apps Script API)
 */

// ════════════════════════════════════════════════════════════════════
// [Task #255] S02 — בדיקת הרשאות גוגל
// נקודת כניסה אחת לאישור ולבדיקה: authorizeAllScopes. נקראת מאייקון S02
// (runAccessCheckIcon, ViewEngine.gs), מתפריט כלי הפיתוח (Menu_LAB.gs) ומהעורך.
// מסך ההסכמה של Google מאפשר אישור חלקי (מינואר 2025) — סקריפט רץ גם בלי
// חלק מההרשאות ונכשל רק בשורה שצריכה אותן. requireAllScopes בודקת את כל
// ההרשאות שבקובץ ההגדרות: חסרה הרשאה כלשהי — ההרצה נעצרת ו-Google מציגה
// מסך הסכמה אחד ("בחירת הכול"); הכול מאושר — נפתח חלון הבדיקה.
// אסור לעטוף את requireAllScopes ב-try/catch — הלכידה מונעת את מסך ההסכמה.
// ════════════════════════════════════════════════════════════════════

const AUTH_SCOPE_BASE = "https://www.googleapis.com/auth/";

// הוראה לשורה שנכשלה בהרשאת Google
const AUTH_HINT_GOOGLE =
  "לחץ שוב על אייקון S02 ובחר \"בחירת הכול\" במסך של Google. " +
  "אם המסך לא נפתח: תפריט LA ← 🔬 כלי פיתוח ← 🔐 אישור כל ההרשאות.";

function authorizeAllScopes() {
  ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);
  showGoogleAccessDialog();
}

function showGoogleAccessDialog() {
  const html = HtmlService.createHtmlOutputFromFile('S02_AccessDialog')
    .setWidth(520)
    .setHeight(560);
  SpreadsheetApp.getUi().showModalDialog(html, 'S02 — בדיקת הרשאות גוגל');
}

// רשימת ההרשאות שאושרו בפועל (null = לא ניתן לקרוא — לא חוסם את הבדיקה בפועל)
function _authGrantedScopes() {
  try {
    return ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL).getAuthorizedScopes();
  } catch (e) {
    Logger.log("S02: קריאת ההרשאות שאושרו נכשלה — " + e.message);
    return null;
  }
}

// 9 הבדיקות. scope — ההרשאה ברשימת getAuthorizedScopes; test — בדיקה בפועל.
// שורה תקינה = ההרשאה ברשימה וגם הבדיקה בפועל עברה.
function _accessChecks() {
  return [
    { key: "gmail",       label: "Gmail",                    scope: "gmail.modify",            test: checkGmailAccess },
    { key: "drive",       label: "Drive",                    scope: "drive",                   test: checkDriveAccess },
    { key: "docs",        label: "Docs",                     scope: "documents",               test: checkDocsAccess },
    { key: "sheetActive", label: "גליון פעיל",               scope: "spreadsheets",            test: checkActiveSheetAccess },
    { key: "sheetById",   label: "גליון לפי מזהה (S17)",     scope: "spreadsheets",            test: checkSheetByIdAccess },
    { key: "network",     label: "רשת חיצונית",              scope: "script.external_request", test: checkExternalNetworkAccess },
    { key: "dialog",      label: "חלון מעל הגליון",          scope: "script.container.ui",     test: null },
    { key: "github",      label: "חיבור GitHub",             scope: null,                      test: checkGitHubAccess,
      hint: "עדכן את GITHUB_PAT ב-Script Properties (הגדרות הפרויקט בעורך). אם גם \"רשת חיצונית\" נכשל — קודם לאשר את הרשאות גוגל." },
    { key: "appsScript",  label: "Apps Script API",          scope: null,                      test: checkAppsScriptAccess,
      hint: "הפעל את Google Apps Script API בהגדרות המשתמש: script.google.com/home/usersettings. אם גם \"רשת חיצונית\" נכשל — קודם לאשר את הרשאות גוגל." }
  ];
}

function _runAccessCheck(def, granted) {
  const scopeOk = (!def.scope || granted === null) ? true
                : granted.indexOf(AUTH_SCOPE_BASE + def.scope) !== -1;
  let testOk = true;
  if (def.test) {
    try { testOk = def.test() === true; } catch (e) { testOk = false; }
  }
  return {
    key:    def.key,
    label:  def.label,
    ok:     scopeOk && testOk,
    google: !!def.scope,
    hint:   def.scope ? AUTH_HINT_GOOGLE : (def.hint || "")
  };
}

function checkUserAccess() {
  return _buildAccessReport();
}

function _buildAccessReport() {
  const granted = _authGrantedScopes();
  return _accessChecks().map(function(def) { return _runAccessCheck(def, granted); });
}

// רענון בדיקה בודדת — כפתור "בדוק שוב" בחלון S02
function _recheckAccessItem(key) {
  const def = _accessChecks().filter(function(d) { return d.key === key; })[0];
  if (!def) {
    return { key: key, ok: false, error: "בדיקה לא מוכרת: " + key };
  }
  return _runAccessCheck(def, _authGrantedScopes());
}

// בדיקות בפועל שנוספו ב-Task #255 (בלי חלון — מתאימות לקריאה מתוך חלון S02)
function checkActiveSheetAccess() {
  try {
    SpreadsheetApp.getActiveSpreadsheet().getName();
    return true;
  } catch (e) {
    Logger.log("Sheets (פעיל): כישלון — " + e.message);
    return false;
  }
}

function checkSheetByIdAccess() {
  try {
    SpreadsheetApp.openById("1uYnt-wleYpuk1ZrX7fTn2HDZ12PNWBEFRDGqHQN_U4I").getName();
    return true;
  } catch (e) {
    Logger.log("Sheets (openById): כישלון — " + e.message);
    return false;
  }
}

function checkExternalNetworkAccess() {
  try {
    UrlFetchApp.fetch("https://www.google.com", { muteHttpExceptions: true });
    return true;
  } catch (e) {
    Logger.log("רשת חיצונית: כישלון — " + e.message);
    return false;
  }
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

// [Task #260] הרשאה מלאה לגליונות — פתיחת גליון לפי מזהה (openById), כמו
// ביישום האינפוגרפיקה (S17). auth_02_Sheets בודקת רק את הגליון הפעיל,
// שמסתפק בהרשאה מצומצמת — ולכן אינה מכסה את המקרה הזה.
function auth_07_SheetsById() {
  var ss = SpreadsheetApp.openById("1uYnt-wleYpuk1ZrX7fTn2HDZ12PNWBEFRDGqHQN_U4I");
  Logger.log("Sheets (openById): " + ss.getName());
}

// [Task #260] הרשאת חלון אמיתית (script.container.ui) — מציגה חלון בפועל
// (showModalDialog). auth_06_ContainerUI מציגה רק הודעה (alert), שאינה דורשת
// את ההרשאה הזו — ולכן אינה מאלצת אותה. בלי try/catch בכוונה, כדי שגוגל
// תציג חלון הסכמה. להריץ מהעורך כשהגליון פתוח בלשונית אחרת.
function auth_08_ContainerUIDialog() {
  var html = HtmlService
    .createHtmlOutput('<p style="direction:rtl;text-align:right;font-family:Arial;">הרשאת חלון תקינה ✅</p>')
    .setWidth(300)
    .setHeight(100);
  SpreadsheetApp.getUi().showModalDialog(html, "בדיקת הרשאת חלון");
  Logger.log("Container UI (showModalDialog): גישה אושרה");
}