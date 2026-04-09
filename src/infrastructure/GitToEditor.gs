/**
 * MedicalPilot — GitToEditor.gs
 * שירות סנכרון — משיכת קוד מגיטהאב לעורך
 * גרסה: v97.6 | תאריך: 09/04/2026
 */

function fetchFileFromGitHub(filePath) {
  try {
    const token = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
    if (!token) { Logger.log("Error: GITHUB_PAT not found."); return null; }
    const url = "https://api.github.com/repos/cohenamos07/MedicalPilot/contents/" + filePath;
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "Authorization": "token " + token, "Accept": "application/vnd.github.v3+json" },
      muteHttpExceptions: true
    });
    if (response.getResponseCode() === 200) {
      const json = JSON.parse(response.getContentText());
      return Utilities.newBlob(Utilities.base64Decode(json.content)).getDataAsString();
    } else {
      Logger.log("GitHub Fetch Failed: Code " + response.getResponseCode());
      return null;
    }
  } catch (e) {
    Logger.log("Error in fetchFileFromGitHub: " + e.toString());
    return null;
  }
}

function updateEditorFile(scriptId, fileName, newContent) {
  try {
    const baseUrl = "https://script.googleapis.com/v1/projects/" + scriptId + "/content";
    const getResponse = UrlFetchApp.fetch(baseUrl, {
      method: "get",
      headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    if (getResponse.getResponseCode() !== 200) {
      Logger.log("Failed to fetch script content: " + getResponse.getContentText());
      return false;
    }
    let scriptContent = JSON.parse(getResponse.getContentText());
    let fileFound = false;
    for (let i = 0; i < scriptContent.files.length; i++) {
      if (scriptContent.files[i].name === fileName) {
        scriptContent.files[i].source = newContent;
        fileFound = true;
        break;
      }
    }
    if (!fileFound) { Logger.log("File " + fileName + " not found."); return false; }
    const putResponse = UrlFetchApp.fetch(baseUrl, {
      method: "put",
      headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
      contentType: "application/json",
      payload: JSON.stringify(scriptContent),
      muteHttpExceptions: true
    });
    if (putResponse.getResponseCode() === 200) { return true; }
    Logger.log("Failed to update: " + putResponse.getContentText());
    return false;
  } catch (e) {
    Logger.log("Error in updateEditorFile: " + e.toString());
    return false;
  }
}

function syncFileFromGitToEditor(filePath, fileName) {
  try {
    const scriptId = "1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf";
    const content = fetchFileFromGitHub(filePath);
    if (content !== null) {
      const success = updateEditorFile(scriptId, fileName, content);
      if (success) {
        SpreadsheetApp.getUi().alert("הקובץ [" + fileName + "] עודכן בעורך בהצלחה");
      } else {
        SpreadsheetApp.getUi().alert("שגיאה בעדכון [" + fileName + "] בעורך");
      }
    } else {
      SpreadsheetApp.getUi().alert("שגיאה במשיכת הקובץ [" + fileName + "] מגיטהאב");
    }
  } catch (e) {
    Logger.log("Error in syncFileFromGitToEditor: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה קריטית בסנכרון: " + e.message);
  }
}

function testSyncLogger() {
  syncFileFromGitToEditor(
    "src/infrastructure/System_Logger.gs",
    "System_Logger"
  );
}
