/**
 * MedicalPilot — DevSyncInspector.gs
 * @version 1.4 | @updated 05/05/2026 17:40 | @service DEV_SYNC
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/DevSyncInspector.gs
 * שינוי: [FIX-2] עמודת Action חכמה — ממליצה ↑ דחוף לגיט / ↓ משוך מגיט לפי השוואת תאריכים
 */

const DEV_SYNC_SHEET_NAME = "מסנכרן_קבצים";
const DEV_SYNC_GIT_FOLDER = "src/infrastructure";
const DEV_SYNC_SCRIPT_ID  = "1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf";

// ══════════════════════════════════════════════════════════════════
// סריקה מלאה של העורך + גיטהאב
// ══════════════════════════════════════════════════════════════════

function devSync_ScanAndFillSheet() {
  const ui    = SpreadsheetApp.getUi();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(DEV_SYNC_SHEET_NAME);

  if (!sheet) {
    ui.alert("הגיליון '" + DEV_SYNC_SHEET_NAME + "' לא נמצא.");
    return;
  }

  const editorMap = devSync_getEditorFilesMap();
  const gitMap    = devSync_getGitFilesMap();

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
    const gitInfo    = gitMap[name]    || null;

    const existsEditor = !!editorInfo;
    const existsGit    = !!gitInfo;

    const versionEditor = editorInfo ? editorInfo.versionLine : "";
    const versionGit    = gitInfo    ? gitInfo.versionLine    : "";

    // [FIX-2] חישוב status ו-action חכם לפי תאריכים
    let status = "";
    let action = "";

    if (existsEditor && existsGit) {
      if (versionEditor === versionGit) {
        status = "תואם";
        action = "תואם — אין צורך";
      } else {
        const dateEditor = devSync_extractDate(versionEditor);
        const dateGit    = devSync_extractDate(versionGit);

        if (dateEditor && dateGit) {
          if (dateEditor > dateGit) {
            status = "שונה";
            action = "↑ דחוף לגיט";
          } else if (dateGit > dateEditor) {
            status = "שונה";
            action = "↓ משוך מגיט";
          } else {
            // תאריכים שווים אבל גרסה שונה — העורך גובר
            status = "שונה";
            action = "↑ דחוף לגיט";
          }
        } else {
          // לא ניתן לחלץ תאריך — החלטה ידנית
          status = "שונה";
          action = "בדוק והחליט";
        }
      }
    } else if (existsEditor && !existsGit) {
      status = "חסר בגיט";
      action = "↑ דחוף לגיט";
    } else if (!existsEditor && existsGit) {
      status = "חסר בעורך";
      action = "↓ משוך מגיט";
    } else {
      status = "חסר בשני הצדדים";
      action = "";
    }

    const gitPath = DEV_SYNC_GIT_FOLDER + "/" + name + ".gs";

    rows.push([
      name,
      gitPath,
      existsEditor ? "כן" : "לא",
      existsGit    ? "כן" : "לא",
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

  devSync_ApplyConditionalFormatting();

  ui.alert("דוח סנכרון עודכן בגיליון '" + DEV_SYNC_SHEET_NAME + "'.");
}

// ══════════════════════════════════════════════════════════════════
// [FIX-2] חילוץ תאריך משורת גרסה — מחזיר אובייקט Date או null
// ══════════════════════════════════════════════════════════════════

function devSync_extractDate(versionLine) {
  if (!versionLine) return null;
  try {
    // מחפש תבנית DD/MM/YYYY או DD/MM/YYYY HH:MM
    const match = versionLine.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
    if (!match) return null;

    const day   = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year  = parseInt(match[3], 10);
    const hour  = match[4] ? parseInt(match[4], 10) : 0;
    const min   = match[5] ? parseInt(match[5], 10) : 0;

    return new Date(year, month, day, hour, min, 0);
  } catch (e) {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// עיצוב מותנה לעמודת Status
// ══════════════════════════════════════════════════════════════════

function devSync_ApplyConditionalFormatting() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(DEV_SYNC_SHEET_NAME);

    if (!sheet) {
      Logger.log("[DevSyncInspector] devSync_ApplyConditionalFormatting: הגיליון לא נמצא.");
      return;
    }

    const lastRow     = Math.max(sheet.getLastRow(), 2);
    const statusRange = sheet.getRange(2, 7, lastRow - 1, 1);

    const existingRules = sheet.getConditionalFormatRules();
    const filteredRules = existingRules.filter(rule =>
      !rule.getRanges().some(r => r.getColumn() === 7)
    );
    sheet.setConditionalFormatRules(filteredRules);

    const ruleGreen = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("תואם")
      .setBackground("#B7E1CD")
      .setFontColor("#000000")
      .setRanges([statusRange])
      .build();

    const ruleYellow1 = SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains("שונה")
      .setBackground("#FCE8B2")
      .setFontColor("#000000")
      .setRanges([statusRange])
      .build();

    const ruleYellow2 = SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains("חסר בגיט")
      .setBackground("#FCE8B2")
      .setFontColor("#000000")
      .setRanges([statusRange])
      .build();

    const ruleRed = SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains("חסר בעורך")
      .setBackground("#F4CCCC")
      .setFontColor("#000000")
      .setRanges([statusRange])
      .build();

    const updatedRules = sheet.getConditionalFormatRules();
    updatedRules.push(ruleGreen, ruleYellow1, ruleYellow2, ruleRed);
    sheet.setConditionalFormatRules(updatedRules);

    Logger.log("[DevSyncInspector] devSync_ApplyConditionalFormatting: עיצוב מותנה הוחל.");
  } catch (e) {
    Logger.log("[DevSyncInspector] devSync_ApplyConditionalFormatting: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// קריאת כל הקבצים מהעורך
// ══════════════════════════════════════════════════════════════════

function devSync_getEditorFilesMap() {
  const map = {};
  try {
    const url      = "https://script.googleapis.com/v1/projects/" + DEV_SYNC_SCRIPT_ID + "/content";
    const response = UrlFetchApp.fetch(url, {
      method:             "get",
      headers:            { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      Logger.log("devSync_getEditorFilesMap: קוד " + response.getResponseCode());
      return map;
    }

    const data = JSON.parse(response.getContentText());
    (data.files || []).forEach(function(file) {
      if (file.type === "SERVER_JS" && file.name) {
        const source      = file.source || "";
        const versionLine = devSync_extractVersionLine(source);
        map[file.name]    = { versionLine: versionLine };
      }
    });
  } catch (e) {
    Logger.log("devSync_getEditorFilesMap: " + e.toString());
  }
  return map;
}

// ══════════════════════════════════════════════════════════════════
// קריאת כל הקבצים מגיטהאב
// ══════════════════════════════════════════════════════════════════

function devSync_getGitFilesMap() {
  const map = {};
  try {
    const token = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
    if (!token) { Logger.log("devSync_getGitFilesMap: GITHUB_PAT חסר"); return map; }

    const baseUrl = "https://api.github.com/repos/cohenamos07/MedicalPilot/contents/" + DEV_SYNC_GIT_FOLDER;
    const headers = {
      "Authorization": "token " + token,
      "Accept":        "application/vnd.github.v3+json"
    };

    const listResponse = UrlFetchApp.fetch(baseUrl, {
      method:             "get",
      headers:            headers,
      muteHttpExceptions: true
    });

    if (listResponse.getResponseCode() !== 200) {
      Logger.log("devSync_getGitFilesMap: קוד " + listResponse.getResponseCode());
      return map;
    }

    const files = JSON.parse(listResponse.getContentText());
    files.forEach(function(item) {
      if (item.type === "file" && item.name.endsWith(".gs")) {
        const nameWithoutExt = item.name.replace(/\.gs$/i, "");
        const fileContent    = devSync_fetchGitFileContent(item.path, token);
        const versionLine    = devSync_extractVersionLine(fileContent);
        map[nameWithoutExt]  = { path: item.path, versionLine: versionLine };
      }
    });
  } catch (e) {
    Logger.log("devSync_getGitFilesMap: " + e.toString());
  }
  return map;
}

// ══════════════════════════════════════════════════════════════════
// משיכת תוכן קובץ מגיטהאב
// ══════════════════════════════════════════════════════════════════

function devSync_fetchGitFileContent(filePath, token) {
  try {
    const url     = "https://api.github.com/repos/cohenamos07/MedicalPilot/contents/" + filePath;
    const headers = {
      "Authorization": "token " + token,
      "Accept":        "application/vnd.github.v3+json"
    };
    const response = UrlFetchApp.fetch(url, {
      method:             "get",
      headers:            headers,
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

// ══════════════════════════════════════════════════════════════════
// חילוץ שורת גרסה
// ══════════════════════════════════════════════════════════════════

function devSync_extractVersionLine(source) {
  if (!source) return "";
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("@version")) return lines[i].trim();
  }
  return "";
}

// ══════════════════════════════════════════════════════════════════
// פתיחת הגיליון
// ══════════════════════════════════════════════════════════════════

function devSync_OpenSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(DEV_SYNC_SHEET_NAME);
  if (sheet) ss.setActiveSheet(sheet);
}

// ══════════════════════════════════════════════════════════════════
// ביצוע פעולה על שורה מסומנת
// ══════════════════════════════════════════════════════════════════

function devSync_RunActionOnSelectedRow() {
  const ui    = SpreadsheetApp.getUi();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
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

  const values   = sheet.getRange(row, 1, 1, 9).getValues()[0];
  const fileName = values[0];
  const gitPath  = values[1];
  const action   = values[7];

  if (!fileName || !gitPath) {
    ui.alert("שם קובץ או נתיב חסרים.");
    return;
  }

  if (action.includes("↓") || action.includes("שחזר מהגיט")) {
    syncFileFromGitToEditor(gitPath, fileName);
  } else if (action.includes("↑") || action.includes("דחוף לעבר גיט")) {
    syncEditorFileToGitHub(fileName, gitPath);
  } else if (action.includes("תואם")) {
    ui.alert("הקובץ '" + fileName + "' תואם — אין צורך בסנכרון.");
  } else {
    ui.alert("לא ניתן להחליט אוטומטית — בדוק ידנית את הקובץ: " + fileName);
  }
}