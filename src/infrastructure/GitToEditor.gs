/**
 * MedicalPilot — GitToEditor.gs
 * @version 97.8 | @updated 31/05/2026 20:35 | @service S10
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/GitToEditor.gs
 * @impacts סנכרון קוד מגיטהאב לעורך GAS — משיכת קבצים מהריפוזיטורי לפרויקט.
 *          כולל: fetchFileFromGitHub, updateEditorFile, syncFileFromGitToEditor.
 *          יוצר קובץ חדש בעורך אם לא קיים — FIX-1.
 *          תלויות: GITHUB_PAT ב-Script Properties, Apps Script API.
 *          נקרא מ-DevSyncInspector — אינו חלק מזרימת עיבוד אוטומטי.
 * שינוי: [v97.8] הוספת @impacts וכותרת מלאה לפי סטנדרט
 *         [v97.7] [FIX-1] updateEditorFile יוצר קובץ חדש בעורך אם לא קיים
 */
// ══════════════════════════════════════════════════════════════════
// משיכת תוכן קובץ מגיטהאב
// ══════════════════════════════════════════════════════════════════

function fetchFileFromGitHub(filePath) {
  try {
    const token = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
    if (!token) { Logger.log("Error: GITHUB_PAT not found."); return null; }

    const url = "https://api.github.com/repos/cohenamos07/MedicalPilot/contents/" + filePath;
    const response = UrlFetchApp.fetch(url, {
      method:  "get",
      headers: { "Authorization": "token " + token, "Accept": "application/vnd.github.v3+json" },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      const json = JSON.parse(response.getContentText());
      return Utilities.newBlob(Utilities.base64Decode(json.content)).getDataAsString();
    }

    Logger.log("GitHub Fetch Failed: Code " + response.getResponseCode());
    return null;
  } catch (e) {
    Logger.log("Error in fetchFileFromGitHub: " + e.toString());
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// עדכון קובץ בעורך — [FIX-1] יוצר קובץ חדש אם לא קיים
// ══════════════════════════════════════════════════════════════════

function updateEditorFile(scriptId, fileName, newContent) {
  try {
    const baseUrl = "https://script.googleapis.com/v1/projects/" + scriptId + "/content";

    const getResponse = UrlFetchApp.fetch(baseUrl, {
      method:  "get",
      headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });

    if (getResponse.getResponseCode() !== 200) {
      Logger.log("Failed to fetch script content: " + getResponse.getContentText());
      return false;
    }

    const scriptContent = JSON.parse(getResponse.getContentText());
    let fileFound = false;

    for (let i = 0; i < scriptContent.files.length; i++) {
      if (scriptContent.files[i].name === fileName) {
        scriptContent.files[i].source = newContent;
        fileFound = true;
        break;
      }
    }

    // [FIX-1] קובץ לא קיים בעורך — יוצר חדש
    if (!fileFound) {
      Logger.log("[GitToEditor] קובץ '" + fileName + "' לא נמצא — יוצר חדש בעורך.");
      scriptContent.files.push({
        name:   fileName,
        type:   "SERVER_JS",
        source: newContent
      });
    }

    const putResponse = UrlFetchApp.fetch(baseUrl, {
      method:       "put",
      headers:      { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
      contentType:  "application/json",
      payload:      JSON.stringify(scriptContent),
      muteHttpExceptions: true
    });

    if (putResponse.getResponseCode() === 200) {
      Logger.log("[GitToEditor] " + fileName + (fileFound ? " עודכן" : " נוצר") + " בהצלחה.");
      return true;
    }

    Logger.log("Failed to update: " + putResponse.getContentText());
    return false;

  } catch (e) {
    Logger.log("Error in updateEditorFile: " + e.toString());
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════
// סנכרון קובץ בודד מגיטהאב לעורך
// ══════════════════════════════════════════════════════════════════

function syncFileFromGitToEditor(filePath, fileName) {
  try {
    const scriptId = "1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf";
    const content  = fetchFileFromGitHub(filePath);

    if (content !== null) {
      const success = updateEditorFile(scriptId, fileName, content);
      if (success) {
        SpreadsheetApp.getUi().alert("✅ הקובץ [" + fileName + "] עודכן בעורך בהצלחה");
      } else {
        SpreadsheetApp.getUi().alert("❌ שגיאה בעדכון [" + fileName + "] בעורך");
      }
    } else {
      SpreadsheetApp.getUi().alert("❌ שגיאה במשיכת הקובץ [" + fileName + "] מגיטהאב");
    }
  } catch (e) {
    Logger.log("Error in syncFileFromGitToEditor: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה קריטית בסנכרון: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// פונקציות בדיקה
// ══════════════════════════════════════════════════════════════════

function testSyncLogger() {
  syncFileFromGitToEditor(
    "src/infrastructure/System_Logger.gs",
    "System_Logger"
  );
}