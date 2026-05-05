/**
 * MedicalPilot — EditorToGitHub.gs
 * שירות סנכרון — דחיפת קוד מהעורך לגיטהאב
 * @version 100.0 | @updated 01/05/2026 | @service S10
 * שינוי: יישור מלא למערכת DevSync + שיפור טיפול בשגיאות
 */

// ─────────────────────────────────────────────────────────────
// קריאה מהעורך
// ─────────────────────────────────────────────────────────────

function getFileContentFromEditor(fileName) {
  if (!fileName || typeof fileName !== "string" || fileName.trim() === "") {
    Logger.log("[EditorToGitHub] getFileContentFromEditor: שם קובץ ריק או לא תקין.");
    return null;
  }
  try {
    const scriptId = "1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf";
    const url = "https://script.googleapis.com/v1/projects/" + scriptId + "/content";
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    if (response.getResponseCode() !== 200) {
      Logger.log("[EditorToGitHub] getFileContentFromEditor: שגיאה בקריאה מ-Apps Script API. קוד: " + response.getResponseCode() + " | " + response.getContentText());
      return null;
    }
    const scriptContent = JSON.parse(response.getContentText());
    if (!scriptContent || !Array.isArray(scriptContent.files)) {
      Logger.log("[EditorToGitHub] getFileContentFromEditor: תגובה לא תקינה מ-API.");
      return null;
    }
    const file = scriptContent.files.find(f => f.name === fileName.trim());
    if (!file) {
      Logger.log("[EditorToGitHub] getFileContentFromEditor: הקובץ [" + fileName + "] לא נמצא בעורך.");
      return null;
    }
    if (!file.source || file.source.trim() === "") {
      Logger.log("[EditorToGitHub] getFileContentFromEditor: הקובץ [" + fileName + "] קיים אך תוכנו ריק.");
      return null;
    }
    Logger.log("[EditorToGitHub] getFileContentFromEditor: הקובץ [" + fileName + "] נקרא בהצלחה (" + file.source.length + " תווים).");
    return file.source;
  } catch (e) {
    Logger.log("[EditorToGitHub] getFileContentFromEditor: חריגה — " + e.toString());
    return null;
  }
}

function getAllEditorFiles() {
  try {
    const scriptId = "1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf";
    const url = "https://script.googleapis.com/v1/projects/" + scriptId + "/content";
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    if (response.getResponseCode() !== 200) {
      Logger.log("[EditorToGitHub] getAllEditorFiles: שגיאת API. קוד: " + response.getResponseCode());
      return [];
    }
    const scriptContent = JSON.parse(response.getContentText());
    if (!scriptContent || !Array.isArray(scriptContent.files)) {
      Logger.log("[EditorToGitHub] getAllEditorFiles: תגובה לא תקינה.");
      return [];
    }
    const names = scriptContent.files
      .filter(f => f.type === "SERVER_JS")
      .map(f => f.name)
      .sort();
    Logger.log("[EditorToGitHub] getAllEditorFiles: נמצאו " + names.length + " קבצים בעורך.");
    return names;
  } catch (e) {
    Logger.log("[EditorToGitHub] getAllEditorFiles: חריגה — " + e.toString());
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// דחיפה לגיטהאב
// ─────────────────────────────────────────────────────────────

function pushFileToGitHub(fileName, filePath, content) {
  if (!fileName || !filePath || !content) {
    Logger.log("[EditorToGitHub] pushFileToGitHub: פרמטר חסר — fileName=" + fileName + " filePath=" + filePath + " contentLength=" + (content ? content.length : "null"));
    return false;
  }
  try {
    const token = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
    if (!token) {
      Logger.log("[EditorToGitHub] pushFileToGitHub: GITHUB_PAT לא נמצא ב-ScriptProperties.");
      return false;
    }
    const url = "https://api.github.com/repos/cohenamos07/MedicalPilot/contents/" + filePath;
    const headers = {
      "Authorization": "token " + token,
      "Accept": "application/vnd.github.v3+json"
    };

    // בדיקה אם הקובץ קיים בגיטהאב — לצורך קבלת SHA
    let sha = null;
    const getResponse = UrlFetchApp.fetch(url, {
      method: "get",
      headers: headers,
      muteHttpExceptions: true
    });
    if (getResponse.getResponseCode() === 200) {
      const existing = JSON.parse(getResponse.getContentText());
      sha = existing.sha || null;
      Logger.log("[EditorToGitHub] pushFileToGitHub: קובץ קיים בגיטהאב — SHA=" + sha);
    } else if (getResponse.getResponseCode() === 404) {
      Logger.log("[EditorToGitHub] pushFileToGitHub: קובץ לא קיים בגיטהאב — ייווצר חדש.");
    } else {
      Logger.log("[EditorToGitHub] pushFileToGitHub: שגיאה בבדיקת קובץ קיים. קוד: " + getResponse.getResponseCode());
    }

    // בניית payload
    const payload = {
      message: "Auto-update [" + fileName + "] from Editor",
      content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
      branch: "main"
    };
    if (sha) payload.sha = sha;

    const putResponse = UrlFetchApp.fetch(url, {
      method: "put",
      headers: headers,
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const putCode = putResponse.getResponseCode();
    if (putCode === 200 || putCode === 201) {
      Logger.log("[EditorToGitHub] pushFileToGitHub: הקובץ [" + fileName + "] נשמר בגיטהאב בהצלחה (קוד " + putCode + ").");
      return true;
    }
    Logger.log("[EditorToGitHub] pushFileToGitHub: דחיפה נכשלה. קוד: " + putCode + " | " + putResponse.getContentText());
    return false;
  } catch (e) {
    Logger.log("[EditorToGitHub] pushFileToGitHub: חריגה — " + e.toString());
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// סנכרון קובץ בודד — נקודת הכניסה המרכזית
// נתמך גם מ-DevSync (devSync_RunActionOnSelectedRow, devSync_ScanAndFillSheet)
// ─────────────────────────────────────────────────────────────

function syncEditorFileToGitHub(fileName, githubPath) {
  // תמיכה בקריאה מ-DevSync: githubPath = "src/infrastructure/<file>.gs"
  if (!fileName || typeof fileName !== "string" || fileName.trim() === "") {
    Logger.log("[EditorToGitHub] syncEditorFileToGitHub: שם קובץ חסר.");
    try { SpreadsheetApp.getUi().alert("שגיאה: לא סופק שם קובץ לסנכרון."); } catch (_) {}
    return false;
  }
  fileName = fileName.trim();

  // אם לא סופק נתיב — בנה ברירת מחדל
  if (!githubPath || typeof githubPath !== "string" || githubPath.trim() === "") {
    githubPath = "src/infrastructure/" + fileName + ".gs";
    Logger.log("[EditorToGitHub] syncEditorFileToGitHub: githubPath לא סופק — ברירת מחדל: " + githubPath);
  } else {
    githubPath = githubPath.trim();
  }

  Logger.log("[EditorToGitHub] syncEditorFileToGitHub: מתחיל סנכרון [" + fileName + "] → " + githubPath);

  try {
    const content = getFileContentFromEditor(fileName);
    if (content === null || content === undefined) {
      Logger.log("[EditorToGitHub] syncEditorFileToGitHub: תוכן ריק עבור [" + fileName + "].");
      try { SpreadsheetApp.getUi().alert("שגיאה: לא ניתן לקרוא את הקובץ [" + fileName + "] מהעורך."); } catch (_) {}
      return false;
    }

    const success = pushFileToGitHub(fileName, githubPath, content);
    if (success) {
      Logger.log("[EditorToGitHub] syncEditorFileToGitHub: [" + fileName + "] עודכן בגיטהאב בהצלחה.");
      try { SpreadsheetApp.getUi().alert("הקובץ [" + fileName + "] עודכן בגיטהאב בהצלחה"); } catch (_) {}
      return true;
    } else {
      Logger.log("[EditorToGitHub] syncEditorFileToGitHub: [" + fileName + "] — הדחיפה נכשלה.");
      try { SpreadsheetApp.getUi().alert("שגיאה בעדכון [" + fileName + "] בגיטהאב"); } catch (_) {}
      return false;
    }
  } catch (e) {
    Logger.log("[EditorToGitHub] syncEditorFileToGitHub: חריגה קריטית — " + e.toString());
    try { SpreadsheetApp.getUi().alert("שגיאה קריטית בסנכרון: " + e.message); } catch (_) {}
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// סנכרון כל הקבצים
// ─────────────────────────────────────────────────────────────

function syncAllFilesToGitHub() {
  const files = [
    { name: "Mod_Ingestion",      path: "src/infrastructure/Mod_Ingestion.gs" },
    { name: "S04_DriveSync",      path: "src/infrastructure/S04_DriveSync.gs" },
    { name: "S05_MetaExtract",    path: "src/infrastructure/S05_MetaExtract.gs" },
    { name: "S06_ConvertTXT",     path: "src/infrastructure/S06_ConvertTXT.gs" },
    { name: "Menu_LAB",           path: "src/infrastructure/Menu_LAB.gs" },
    { name: "Menu_PROD",          path: "src/infrastructure/Menu_PROD.gs" },
    { name: "Main",               path: "src/infrastructure/Main.gs" },
    { name: "GitHubSync",         path: "src/infrastructure/GitHubSync.gs" },
    { name: "GitToEditor",        path: "src/infrastructure/GitToEditor.gs" },
    { name: "EditorToGitHub",     path: "src/infrastructure/EditorToGitHub.gs" },
    { name: "Service_Folders",    path: "src/infrastructure/Service_Folders.gs" },
    { name: "Auth_Check",         path: "src/infrastructure/Auth_Check.gs" },
    { name: "System_HealthCheck", path: "src/infrastructure/System_HealthCheck.gs" },
    { name: "NetworkDiagnostics", path: "src/infrastructure/NetworkDiagnostics.gs" },
    { name: "System_Doc_Builder", path: "src/infrastructure/System_Doc_Builder.gs" },
    { name: "System_Logger",      path: "src/infrastructure/System_Logger.gs" },
    { name: "COLUMN_MAP",         path: "src/infrastructure/COLUMN_MAP.gs" },
    { name: "QA_Tests",           path: "src/infrastructure/QA_Tests.gs" }
  ];

  let success = 0;
  let failed = 0;
  const failedNames = [];

  try {
    files.forEach(function(file) {
      Logger.log("[EditorToGitHub] syncAllFilesToGitHub: מעבד [" + file.name + "]...");
      const content = getFileContentFromEditor(file.name);
      if (!content) {
        Logger.log("[EditorToGitHub] syncAllFilesToGitHub: [" + file.name + "] — לא נקרא מהעורך.");
        failed++;
        failedNames.push(file.name);
        return;
      }
      const ok = pushFileToGitHub(file.name, file.path, content);
      if (ok) {
        success++;
        Logger.log("[EditorToGitHub] syncAllFilesToGitHub: [" + file.name + "] — הצלחה.");
      } else {
        failed++;
        failedNames.push(file.name);
        Logger.log("[EditorToGitHub] syncAllFilesToGitHub: [" + file.name + "] — נכשל.");
      }
    });

    let msg = "סנכרון הושלם: " + success + " קבצים עודכנו, " + failed + " נכשלו.";
    if (failedNames.length > 0) {
      msg += "\n\nקבצים שנכשלו:\n" + failedNames.join("\n");
    }
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    Logger.log("[EditorToGitHub] syncAllFilesToGitHub: חריגה קריטית — " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה קריטית: " + e.message);
  }
}

// ─────────────────────────────────────────────────────────────
// סנכרון לפי בחירה
// ─────────────────────────────────────────────────────────────

function syncToGitByChoice() {
  const ui = SpreadsheetApp.getUi();

  const editorFiles = getAllEditorFiles();
  if (!editorFiles || editorFiles.length === 0) {
    ui.alert("שגיאה: לא ניתן לקרוא את רשימת הקבצים מהעורך.");
    return;
  }

  const result = ui.prompt(
    "בחר קובץ לסנכרון",
    "קבצים זמינים בעורך:\n" + editorFiles.join("\n") + "\n\nהכנס שם קובץ:",
    ui.ButtonSet.OK_CANCEL
  );

  if (result.getSelectedButton() !== ui.Button.OK) return;

  const chosen = result.getResponseText().trim();
  if (!chosen) {
    ui.alert("לא הוכנס שם קובץ.");
    return;
  }

  if (!editorFiles.includes(chosen)) {
    ui.alert("שגיאה: הקובץ [" + chosen + "] לא נמצא ברשימת הקבצים בעורך.");
    return;
  }

  const githubPath = "src/infrastructure/" + chosen + ".gs";
  const confirm = ui.alert(
    "אישור סנכרון",
    "לסנכרן את [" + chosen + "] לגיטהאב?\nנתיב: " + githubPath,
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  syncEditorFileToGitHub(chosen, githubPath);
}

// ─────────────────────────────────────────────────────────────
// פונקציות בדיקה מהירה לכל קובץ
// ─────────────────────────────────────────────────────────────

function testSyncIngestion()      { syncEditorFileToGitHub("Mod_Ingestion",      "src/infrastructure/Mod_Ingestion.gs"); }
function testSyncMenuLab()        { syncEditorFileToGitHub("Menu_LAB",           "src/infrastructure/Menu_LAB.gs"); }
function testSyncMenuProd()       { syncEditorFileToGitHub("Menu_PROD",          "src/infrastructure/Menu_PROD.gs"); }
function testSyncMain()           { syncEditorFileToGitHub("Main",               "src/infrastructure/Main.gs"); }
function testSyncGitHubSync()     { syncEditorFileToGitHub("GitHubSync",         "src/infrastructure/GitHubSync.gs"); }
function testSyncEditorToGitHub() { syncEditorFileToGitHub("EditorToGitHub",     "src/infrastructure/EditorToGitHub.gs"); }
function testSyncServiceFolders() { syncEditorFileToGitHub("Service_Folders",    "src/infrastructure/Service_Folders.gs"); }
function testSyncAuthCheck()      { syncEditorFileToGitHub("Auth_Check",         "src/infrastructure/Auth_Check.gs"); }
function testSyncColumnMap()      { syncEditorFileToGitHub("COLUMN_MAP",         "src/infrastructure/COLUMN_MAP.gs"); }
function testSyncQATests()        { syncEditorFileToGitHub("QA_Tests",           "src/infrastructure/QA_Tests.gs"); }