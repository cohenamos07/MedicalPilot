/**
 * MedicalPilot — DevSyncInspector.gs
 * @version 1.0 | @updated 01/05/2026 14:45 | @service DEV_SYNC
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/dev/DevSyncInspector.gs
 * שינוי: יצירת כלי Dev חדש — דוח סנכרון קבצים וקוד בין העורך לגיטהאב
 */

const DEV_SYNC_SHEET_NAME = "מסנכרן_קבצים";
const DEV_SYNC_GIT_FOLDER = "src/infrastructure";
const DEV_SYNC_SCRIPT_ID = "1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf";

/**
 * סריקה מלאה של העורך + גיטהאב
 * מילוי הגיליון "מסנכרן_קבצים"
 */
function devSync_ScanAndFillSheet() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(DEV_SYNC_SHEET_NAME);

  if (!sheet) {
    ui.alert("הגיליון '" + DEV_SYNC_SHEET_NAME + "' לא נמצא. יש להקים אותו דרך buildSheetFromMap.");
    return;
  }

  const editorMap = devSync_getEditorFilesMap();
  const gitMap = devSync_getGitFilesMap();

  const allNames = new Set([
    ...Object.keys(editorMap),
    ...Object.keys(gitMap)
  ]);

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 9).clearContent();
  }

  const rows = [];

  allNames.forEach(function(name) {
    const editorInfo = editorMap[name] || null;
    const gitInfo = gitMap[name] || null;

    const existsEditor = !!editorInfo;
    const existsGit = !!gitInfo;

    const versionEditor = editorInfo ? editorInfo.versionLine : "";
    const versionGit = gitInfo ? gitInfo.versionLine : "";

    let status = "";
    let action = "";

    if (existsEditor && existsGit) {
      status = (versionEditor === versionGit) ? "תואם" : "שונה";
      action = "בדוק והחליט";
    } else if (existsEditor && !existsGit) {
      status = "חסר בגיט";
      action = "דחוף לעבר גיט";
    } else if (!existsEditor && existsGit) {
      status = "חסר בעורך";
      action = "שחזר מהגיט";
    } else {
      status = "חסר בשני הצדדים";
      action = "";
    }

    const gitPath = DEV_SYNC_GIT_FOLDER + "/" + name + ".gs";

    rows.push([
      name,
      gitPath,
      existsEditor ? "כן" : "לא",
      existsGit ? "כן" : "לא",
      versionEditor,
      versionGit,
      status,
      action,
      ""
    ]);
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 9).setValues(rows);
  }

  ui.alert("דוח סנכרון עודכן בגיליון '" + DEV_SYNC_SHEET_NAME + "'.");
}

/**
 * קריאת כל הקבצים מהעורך
 */
function devSync_getEditorFilesMap() {
  const map = {};
  try {
    const url = "https://script.googleapis.com/v1/projects/" + DEV_SYNC_SCRIPT_ID + "/content";
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) return map;

    const data = JSON.parse(response.getContentText());
    (data.files || []).forEach(function(file) {
      if (file.type === "SERVER_JS" && file.name) {
        const source = file.source || "";
        const versionLine = devSync_extractVersionLine(source);
        map[file.name] = { versionLine: versionLine };
      }
    });
  } catch (e) {
    Logger.log("devSync_getEditorFilesMap: " + e.toString());
  }
  return map;
}

/**
 * קריאת כל הקבצים מגיטהאב
 */
function devSync_getGitFilesMap() {
  const map = {};
  try {
    const token = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
    if (!token) return map;

    const baseUrl = "https://api.github.com/repos/cohenamos07/MedicalPilot/contents/" + DEV_SYNC_GIT_FOLDER;
    const headers = {
      "Authorization": "token " + token,
      "Accept": "application/vnd.github.v3+json"
    };

    const listResponse = UrlFetchApp.fetch(baseUrl, {
      method: "get",
      headers: headers,
      muteHttpExceptions: true
    });

    if (listResponse.getResponseCode() !== 200) return map;

    const files = JSON.parse(listResponse.getContentText());
    files.forEach(function(item) {
      if (item.type === "file" && item.name.endsWith(".gs")) {
        const nameWithoutExt = item.name.replace(/\.gs$/i, "");
        const fileContent = devSync_fetchGitFileContent(item.path, token);
        const versionLine = devSync_extractVersionLine(fileContent);

        map[nameWithoutExt] = {
          path: item.path,
          versionLine: versionLine
        };
      }
    });
  } catch (e) {
    Logger.log("devSync_getGitFilesMap: " + e.toString());
  }
  return map;
}

/**
 * משיכת תוכן קובץ מגיטהאב
 */
function devSync_fetchGitFileContent(filePath, token) {
  try {
    const url = "https://api.github.com/repos/cohenamos07/MedicalPilot/contents/" + filePath;
    const headers = {
      "Authorization": "token " + token,
      "Accept": "application/vnd.github.v3+json"
    };
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: headers,
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      const json = JSON.parse(response.getContentText());
      return Utilities.newBlob(Utilities.base64Decode(json.content)).getDataAsString();
    }
  } catch (e) {
    Logger.log("devSync_fetchGitFileContent: " + e.toString());
  }
  return "";
}

/**
 * חילוץ שורת גרסה מלאה
 */
function devSync_extractVersionLine(source) {
  if (!source) return "";
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("@version")) return lines[i].trim();
  }
  return "";
}

/**
 * פתיחת הגיליון
 */
function devSync_OpenSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(DEV_SYNC_SHEET_NAME);
  if (sheet) ss.setActiveSheet(sheet);
}

/**
 * ביצוע פעולה על שורה מסומנת
 */
function devSync_RunActionOnSelectedRow() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(DEV_SYNC_SHEET_NAME);

  if (!sheet) {
    ui.alert("הגיליון '" + DEV_SYNC_SHEET_NAME + "' לא נמצא.");
    return;
  }

  const row = sheet.getActiveCell().getRow();
  if (row <= 1) {
    ui.alert("בחר שורה עם נתונים.");
    return;
  }

  const values = sheet.getRange(row, 1, 1, 9).getValues()[0];
  const fileName = values[0];
  const gitPath = values[1];
  const action = values[7];

  if (!fileName || !gitPath) {
    ui.alert("שם קובץ או נתיב חסרים.");
    return;
  }

  if (action.includes("שחזר מהגיט")) {
    syncFileFromGitToEditor(gitPath, fileName);
  } else if (action.includes("דחוף לעבר גיט")) {
    syncEditorFileToGitHub(fileName, gitPath);
  } else {
    ui.alert("אין פעולה מתאימה בשורה זו.");
  }
}
