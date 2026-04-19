/**
 * MedicalPilot — GitToEditor.gs
 * שירות סנכרון — משיכת קוד מגיטהאב לעורך
 * גרסה: v98.2 | תאריך: 19/04/2026
 * תיקון: יצירת קובץ חדש בעורך אם לא קיים
 */

const REGISTRY = [
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

const SCRIPT_ID = "1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf";

/**
 * מציגה תפריט בחירה לסנכרון קובץ ספציפי מגיטהאב לעורך לפי שם.
 */
function syncFromGitByChoice() {
  const ui = SpreadsheetApp.getUi();
  try {
    let listText = "בחר קובץ לעדכון מגיטהאב לעורך:\n\n";
    REGISTRY.forEach(item => {
      listText += item.num + ". " + item.name + "\n";
    });
    listText += "\nהכנס שם קובץ מדויק מהרשימה (לדוגמה: S07_Classify)";

    const response = ui.prompt("סנכרון קובץ לפי שם", listText, ui.ButtonSet.OK_CANCEL);

    if (response.getSelectedButton() !== ui.Button.OK) {
      Logger.log("הפעולה בוטלה.");
      return;
    }

    const inputName = response.getResponseText().trim();
    if (!inputName) {
      ui.alert("לא הוזן שם קובץ. הפעולה בוטלה.");
      return;
    }

    const selectedFile = REGISTRY.find(f =>
      f.name.toLowerCase() === inputName.toLowerCase()
    );

    if (!selectedFile) {
      ui.alert("שגיאה: הקובץ '" + inputName + "' לא נמצא ב-Registry.\nנא לבדוק את השם ולנסות שוב.");
      Logger.log("חיפוש נכשל: '" + inputName + "' לא נמצא.");
      return;
    }

    Logger.log("נמצא: " + selectedFile.name + " — מתחיל סנכרון.");
    syncFileFromGitToEditor(selectedFile.path, selectedFile.name);

  } catch (e) {
    Logger.log("Error in syncFromGitByChoice: " + e.toString());
    ui.alert("שגיאה: " + e.message);
  }
}

/**
 * מסנכרנת את כל הקבצים מגיטהאב לעורך.
 */
function syncAllFromGit() {
  const ui = SpreadsheetApp.getUi();
  let successCount = 0;
  let failCount = 0;
  let failedFiles = [];

  REGISTRY.forEach(function(file) {
    try {
      Logger.log("מסנכרן: " + file.name);
      const content = fetchFileFromGitHub(file.path);
      if (content !== null) {
        const success = updateEditorFile(SCRIPT_ID, file.name, content);
        if (success) { successCount++; }
        else { failCount++; failedFiles.push(file.name + " (Update Fail)"); }
      } else {
        failCount++;
        failedFiles.push(file.name + " (Fetch Fail)");
      }
    } catch (e) {
      failCount++;
      failedFiles.push(file.name + " (Error)");
      Logger.log("שגיאה: " + file.name + " — " + e.message);
    }
  });

  let summary = "הסנכרון הסתיים.\nהצלחות: " + successCount + "\nכישלונות: " + failCount;
  if (failedFiles.length > 0) {
    summary += "\n\nקבצים שנכשלו:\n" + failedFiles.join("\n");
  }
  ui.alert("סיכום סנכרון מלא", summary, ui.ButtonSet.OK);
}

/**
 * מושכת תוכן קובץ מ-GitHub.
 */
function fetchFileFromGitHub(filePath) {
  try {
    const token = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
    if (!token) { Logger.log("GITHUB_PAT לא נמצא."); return null; }
    const url = "https://api.github.com/repos/cohenamos07/MedicalPilot/contents/" + filePath;
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "Authorization": "token " + token, "Accept": "application/vnd.github.v3+json" },
      muteHttpExceptions: true
    });
    if (response.getResponseCode() === 200) {
      const json = JSON.parse(response.getContentText());
      return Utilities.newBlob(Utilities.base64Decode(json.content)).getDataAsString();
    }
    Logger.log("Fetch נכשל עבור " + filePath + ": קוד " + response.getResponseCode());
    return null;
  } catch (e) {
    Logger.log("Error in fetchFileFromGitHub: " + e.toString());
    return null;
  }
}

/**
 * מעדכנת קובץ קיים בעורך — או יוצרת אותו חדש אם לא קיים.
 * זהו התיקון המרכזי — פותר את בעיית "לא נמצא בעורך".
 */
function updateEditorFile(scriptId, fileName, newContent) {
  try {
    const baseUrl = "https://script.googleapis.com/v1/projects/" + scriptId + "/content";
    const headers = { "Authorization": "Bearer " + ScriptApp.getOAuthToken() };

    const getResponse = UrlFetchApp.fetch(baseUrl, {
      method: "get", headers: headers, muteHttpExceptions: true
    });

    if (getResponse.getResponseCode() !== 200) {
      Logger.log("נכשל לקרוא את העורך: " + getResponse.getContentText());
      return false;
    }

    let scriptContent = JSON.parse(getResponse.getContentText());
    let fileFound = false;

    for (let i = 0; i < scriptContent.files.length; i++) {
      if (scriptContent.files[i].name === fileName) {
        scriptContent.files[i].source = newContent;
        fileFound = true;
        Logger.log("קובץ קיים — מעדכן: " + fileName);
        break;
      }
    }

    // תיקון — אם הקובץ לא קיים בעורך, יוצרים אותו
    if (!fileFound) {
      Logger.log("קובץ לא קיים בעורך — יוצר חדש: " + fileName);
      scriptContent.files.push({
        name: fileName,
        type: "SERVER_JS",
        source: newContent
      });
    }

    const putResponse = UrlFetchApp.fetch(baseUrl, {
      method: "put",
      headers: headers,
      contentType: "application/json",
      payload: JSON.stringify(scriptContent),
      muteHttpExceptions: true
    });

    if (putResponse.getResponseCode() === 200) {
      Logger.log((fileFound ? "עודכן" : "נוצר") + " בהצלחה: " + fileName);
      return true;
    }

    Logger.log("נכשל לעדכן/ליצור " + fileName + ": " + putResponse.getContentText());
    return false;

  } catch (e) {
    Logger.log("Error in updateEditorFile: " + e.toString());
    return false;
  }
}

/**
 * מסנכרנת קובץ בודד מגיט לעורך עם התראה.
 */
function syncFileFromGitToEditor(filePath, fileName) {
  try {
    const content = fetchFileFromGitHub(filePath);
    if (content !== null) {
      const success = updateEditorFile(SCRIPT_ID, fileName, content);
      if (success) {
        SpreadsheetApp.getUi().alert("הקובץ [" + fileName + "] עודכן בעורך בהצלחה ✅");
      } else {
        SpreadsheetApp.getUi().alert("שגיאה בעדכון [" + fileName + "] בעורך ❌");
      }
    } else {
      SpreadsheetApp.getUi().alert("שגיאה במשיכת [" + fileName + "] מגיטהאב ❌");
    }
  } catch (e) {
    Logger.log("Error in syncFileFromGitToEditor: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה קריטית: " + e.message);
  }
}

/**
 * בדיקה מהירה לסנכרון Logger.
 */
function testSyncLogger() {
  syncFileFromGitToEditor("src/infrastructure/System_Logger.gs", "System_Logger");
}