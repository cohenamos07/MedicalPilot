/**
 * MedicalPilot — EditorToGitHub.gs
 * שירות סנכרון — דחיפת קוד מהעורך לגיטהאב
 * @version 98.0 | @updated 19/04/2026 | @service S10
 * שינוי: הוספת syncToGitByChoice — דחיפת קובץ בודד לפי בחירה
 */

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY — רשימת קבצי הפרויקט (מסונכרן עם GitToEditor.gs)
// ─────────────────────────────────────────────────────────────────────────────
const EDITOR_REGISTRY = [
  { num: 1,  name: "EditorToGitHub",     path: "src/infrastructure/EditorToGitHub.gs" },
  { num: 2,  name: "GitHubSync",         path: "src/infrastructure/GitHubSync.gs" },
  { num: 3,  name: "GitToEditor",        path: "src/infrastructure/GitToEditor.gs" },
  { num: 4,  name: "Auth_Check",         path: "src/infrastructure/Auth_Check.gs" },
  { num: 5,  name: "Main",               path: "src/infrastructure/Main.gs" },
  { num: 6,  name: "Menu_LAB",           path: "src/infrastructure/Menu_LAB.gs" },
  { num: 7,  name: "Menu_PROD",          path: "src/infrastructure/Menu_PROD.gs" },
  { num: 8,  name: "Mod_Brain_OCR",      path: "src/infrastructure/Mod_Brain_OCR.gs" },
  { num: 9,  name: "Mod_Ingestion",      path: "src/infrastructure/Mod_Ingestion.gs" },
  { num: 10, name: "NetworkDiagnostics", path: "src/infrastructure/NetworkDiagnostics.gs" },
  { num: 11, name: "S04_DriveSync",      path: "src/infrastructure/S04_DriveSync.gs" },
  { num: 12, name: "S05_MetaExtract",    path: "src/infrastructure/S05_MetaExtract.gs" },
  { num: 13, name: "S07_Classify",       path: "src/infrastructure/S07_Classify.gs" },
  { num: 14, name: "Service_Folders",    path: "src/infrastructure/Service_Folders.gs" },
  { num: 15, name: "System_Doc_Builder", path: "src/infrastructure/System_Doc_Builder.gs" },
  { num: 16, name: "System_HealthCheck", path: "src/infrastructure/System_HealthCheck.gs" },
  { num: 17, name: "System_Logger",      path: "src/infrastructure/System_Logger.gs" }
];

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC — דחיפת קובץ בודד לגיט לפי בחירה
// ─────────────────────────────────────────────────────────────────────────────

/**
 * syncToGitByChoice
 * מציגה רשימת קבצים ← המשתמש מקליד שם ← דוחפת מהעורך לגיט.
 */
function syncToGitByChoice() {
  const ui = SpreadsheetApp.getUi();
  try {
    let listText = "בחר קובץ לדחיפה מהעורך לגיטהאב:\n\n";
    EDITOR_REGISTRY.forEach(function(item) {
      listText += item.num + ". " + item.name + "\n";
    });
    listText += "\nהכנס שם קובץ מדויק מהרשימה (לדוגמה: S07_Classify)";

    const response = ui.prompt("דחיפת קובץ לגיט", listText, ui.ButtonSet.OK_CANCEL);

    if (response.getSelectedButton() !== ui.Button.OK) {
      Logger.log("הפעולה בוטלה.");
      return;
    }

    const inputName = response.getResponseText().trim();
    if (!inputName) {
      ui.alert("לא הוזן שם קובץ. הפעולה בוטלה.");
      return;
    }

    const selectedFile = EDITOR_REGISTRY.find(function(f) {
      return f.name.toLowerCase() === inputName.toLowerCase();
    });

    if (!selectedFile) {
      ui.alert("שגיאה: הקובץ '" + inputName + "' לא נמצא ב-Registry.\nנא לבדוק את השם ולנסות שוב.");
      Logger.log("חיפוש נכשל: '" + inputName + "' לא נמצא.");
      return;
    }

    Logger.log("נמצא: " + selectedFile.name + " — מתחיל דחיפה לגיט.");
    syncEditorFileToGitHub(selectedFile.name, selectedFile.path);

  } catch (e) {
    Logger.log("Error in syncToGitByChoice: " + e.toString());
    ui.alert("שגיאה: " + e.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE — פונקציות עזר
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getFileContentFromEditor
 * קוראת את תוכן קובץ מהעורך דרך Apps Script API.
 */
function getFileContentFromEditor(fileName) {
  try {
    const scriptId = "1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf";
    const url = "https://script.googleapis.com/v1/projects/" + scriptId + "/content";
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    if (response.getResponseCode() !== 200) {
      Logger.log("Failed to fetch script content: " + response.getContentText());
      return null;
    }
    const scriptContent = JSON.parse(response.getContentText());
    const file = scriptContent.files.find(function(f) { return f.name === fileName; });
    if (file) { return file.source; }
    Logger.log("File " + fileName + " not found in editor.");
    return null;
  } catch (e) {
    Logger.log("Error in getFileContentFromEditor: " + e.toString());
    return null;
  }
}

/**
 * pushFileToGitHub
 * דוחפת קובץ לגיטהאב עם טיפול ב-SHA וב-409.
 */
function pushFileToGitHub(fileName, filePath, content) {
  try {
    const token = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
    if (!token) { Logger.log("Error: GITHUB_PAT not found."); return false; }
    const url = "https://api.github.com/repos/cohenamos07/MedicalPilot/contents/" + filePath;
    const headers = { "Authorization": "token " + token, "Accept": "application/vnd.github.v3+json" };
    let sha = null;
    const getResponse = UrlFetchApp.fetch(url, { method: "get", headers: headers, muteHttpExceptions: true });
    if (getResponse.getResponseCode() === 200) { sha = JSON.parse(getResponse.getContentText()).sha; }
    const payload = {
      message: "Auto-update [" + fileName + "] from Editor",
      content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
      branch: "main"
    };
    if (sha) payload.sha = sha;
    const putResponse = UrlFetchApp.fetch(url, {
      method: "put", headers: headers,
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const putCode = putResponse.getResponseCode();
    if (putCode === 200 || putCode === 201) {
      Logger.log("✅ עודכן בהצלחה: " + fileName);
      return true;
    }
    // טיפול ב-409 — retry עם SHA מרוענן
    if (putCode === 409) {
      Logger.log("409 — מנסה retry עם SHA מרוענן עבור: " + fileName);
      const retryGet = UrlFetchApp.fetch(url, { method: "get", headers: headers, muteHttpExceptions: true });
      if (retryGet.getResponseCode() === 200) {
        payload.sha = JSON.parse(retryGet.getContentText()).sha;
        const retryPut = UrlFetchApp.fetch(url, {
          method: "put", headers: headers,
          contentType: "application/json",
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        });
        if (retryPut.getResponseCode() === 200 || retryPut.getResponseCode() === 201) {
          Logger.log("✅ עודכן אחרי retry: " + fileName);
          return true;
        }
      }
    }
    Logger.log("❌ נכשל: " + fileName + " | קוד: " + putCode);
    return false;
  } catch (e) {
    Logger.log("Error in pushFileToGitHub: " + e.toString());
    return false;
  }
}

/**
 * syncEditorFileToGitHub
 * מסנכרנת קובץ בודד מהעורך לגיט עם התראה.
 */
function syncEditorFileToGitHub(fileName, githubPath) {
  try {
    const content = getFileContentFromEditor(fileName);
    if (content === null) {
      SpreadsheetApp.getUi().alert("שגיאה: לא ניתן לקרוא את הקובץ [" + fileName + "] מהעורך.");
      return;
    }
    const success = pushFileToGitHub(fileName, githubPath, content);
    if (success) {
      SpreadsheetApp.getUi().alert("הקובץ [" + fileName + "] עודכן בגיטהאב בהצלחה ✅");
    } else {
      SpreadsheetApp.getUi().alert("שגיאה בעדכון [" + fileName + "] בגיטהאב ❌");
    }
  } catch (e) {
    Logger.log("Error in syncEditorFileToGitHub: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה קריטית: " + e.message);
  }
}

/**
 * syncAllFilesToGitHub
 * דוחפת את כל הקבצים מהעורך לגיט.
 */
function syncAllFilesToGitHub() {
  try {
    let success = 0;
    let failed = 0;
    const failedFiles = [];
    EDITOR_REGISTRY.forEach(function(file) {
      const content = getFileContentFromEditor(file.name);
      if (content) {
        const ok = pushFileToGitHub(file.name, file.path, content);
        if (ok) { success++; } else { failed++; failedFiles.push(file.name); }
      } else {
        failed++;
        failedFiles.push(file.name + " (לא נמצא בעורך)");
      }
    });
    const failMsg = failedFiles.length > 0 ? "\n\nנכשלו:\n" + failedFiles.join("\n") : "";
    SpreadsheetApp.getUi().alert("סנכרון הושלם ✅\n" + success + " קבצים עודכנו\n" + failed + " נכשלו" + failMsg);
  } catch (e) {
    Logger.log("Error in syncAllFilesToGitHub: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה קריטית: " + e.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// פונקציות בדיקה מהירה לקבצים בודדים
// ─────────────────────────────────────────────────────────────────────────────
function testSyncIngestion()      { syncEditorFileToGitHub("Mod_Ingestion",      "src/infrastructure/Mod_Ingestion.gs"); }
function testSyncMenuLab()        { syncEditorFileToGitHub("Menu_LAB",           "src/infrastructure/Menu_LAB.gs"); }
function testSyncMenuProd()       { syncEditorFileToGitHub("Menu_PROD",          "src/infrastructure/Menu_PROD.gs"); }
function testSyncMain()           { syncEditorFileToGitHub("Main",               "src/infrastructure/Main.gs"); }
function testSyncGitHubSync()     { syncEditorFileToGitHub("GitHubSync",         "src/infrastructure/GitHubSync.gs"); }
function testSyncEditorToGitHub() { syncEditorFileToGitHub("EditorToGitHub",     "src/infrastructure/EditorToGitHub.gs"); }
function testSyncServiceFolders() { syncEditorFileToGitHub("Service_Folders",    "src/infrastructure/Service_Folders.gs"); }
function testSyncAuthCheck()      { syncEditorFileToGitHub("Auth_Check",         "src/infrastructure/Auth_Check.gs"); }
function testSyncS04()            { syncEditorFileToGitHub("S04_DriveSync",      "src/infrastructure/S04_DriveSync.gs"); }
function testSyncS05()            { syncEditorFileToGitHub("S05_MetaExtract",    "src/infrastructure/S05_MetaExtract.gs"); }
function testSyncS07()            { syncEditorFileToGitHub("S07_Classify",       "src/infrastructure/S07_Classify.gs"); } 