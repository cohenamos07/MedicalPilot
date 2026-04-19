/**
 * MedicalPilot — EditorToGitHub.gs
 * שירות סנכרון — דחיפת קוד מהעורך לגיטהאב
 * @version 97.9 | @updated 19/04/2026 | @service S10
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
    const file = scriptContent.files.find(f => f.name === fileName);
    if (file) { return file.source; }
    Logger.log("File " + fileName + " not found in editor.");
    return null;
  } catch (e) {
    Logger.log("Error in getFileContentFromEditor: " + e.toString());
    return null;
  }
}

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
      method: "put",
      headers: headers,
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    if (putResponse.getResponseCode() === 200 || putResponse.getResponseCode() === 201) { return true; }
    Logger.log("GitHub Push Failed: " + putResponse.getContentText());
    return false;
  } catch (e) {
    Logger.log("Error in pushFileToGitHub: " + e.toString());
    return false;
  }
}

function syncEditorFileToGitHub(fileName, githubPath) {
  try {
    const content = getFileContentFromEditor(fileName);
    if (content === null) {
      SpreadsheetApp.getUi().alert("שגיאה: לא ניתן לקרוא את הקובץ [" + fileName + "] מהעורך.");
      return;
    }
    const success = pushFileToGitHub(fileName, githubPath, content);
    if (success) {
      SpreadsheetApp.getUi().alert("הקובץ [" + fileName + "] עודכן בגיטהאב בהצלחה");
    } else {
      SpreadsheetApp.getUi().alert("שגיאה בעדכון [" + fileName + "] בגיטהאב");
    }
  } catch (e) {
    Logger.log("Error in syncEditorFileToGitHub: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה קריטית בסנכרון: " + e.message);
  }
}

function syncAllFilesToGitHub() {
  try {
    const files = [
      { name: "Mod_Ingestion",      path: "src/infrastructure/Mod_Ingestion.gs" },
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
      { name: "S04_DriveSync",      path: "src/infrastructure/S04_DriveSync.gs" },
      { name: "S05_MetaExtract",    path: "src/infrastructure/S05_MetaExtract.gs" },
      { name: "S07_Classify",       path: "src/infrastructure/S07_Classify.gs" }
    ];
    let success = 0;
    let failed = 0;
    files.forEach(function(file) {
      const content = getFileContentFromEditor(file.name);
      if (content) {
        const ok = pushFileToGitHub(file.name, file.path, content);
        if (ok) { success++; } else { failed++; }
      } else { failed++; }
    });
    SpreadsheetApp.getUi().alert("סנכרון הושלם: " + success + " קבצים עודכנו, " + failed + " נכשלו.");
  } catch (e) {
    Logger.log("Error in syncAllFilesToGitHub: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה קריטית: " + e.message);
  }
}

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