/**
 * MedicalPilot — DevSyncInspector.gs
 * @version 1.8 | @updated 14/05/2026 13:50 | @service DEV_SYNC
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/DevSyncInspector.gs
 * שינוי: [FIX-6] הוספת devSync_generateAndPushIndex — עדכון אוטומטי של INDEX.md בסוף כל הפקת דוח
 */

const DEV_SYNC_SHEET_NAME = "מסנכרן_קבצים";
const DEV_SYNC_GIT_FOLDER = "src/infrastructure";
const DEV_SYNC_SCRIPT_ID  = "1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf";

// קבצים שיודרו מהדוח
const DEV_SYNC_EXCLUDED   = ["TestLab", "עותק של TestLab.gs"];

// ══════════════════════════════════════════════════════════════════
// כפתור גרפי — הפקת דוח סנכרון
// ══════════════════════════════════════════════════════════════════

function devSync_RunScanButton() {
  devSync_ScanAndFillSheet();
}

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

    // [FIX-5] דילוג על קבצי TestLab וגיבויים
    if (DEV_SYNC_EXCLUDED.indexOf(name) !== -1) return;

    const editorInfo = editorMap[name] || null;
    const gitInfo    = gitMap[name]    || null;

    const existsEditor = !!editorInfo;
    const existsGit    = !!gitInfo;

    const versionEditor = editorInfo ? editorInfo.versionLine : "";
    const versionGit    = gitInfo    ? gitInfo.versionLine    : "";

    let status = "";
    let action = "";

    if (existsEditor && existsGit) {
      if (!versionEditor && !versionGit) {
        status = "ללא גרסה";
        action = "בדוק והחליט";
      } else if (versionEditor === versionGit) {
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
            status = "שונה";
            action = "↑ דחוף לגיט";
          }
        } else if (dateEditor && !dateGit) {
          status = "שונה";
          action = "↑ דחוף לגיט";
        } else if (!dateEditor && dateGit) {
          status = "שונה";
          action = "↓ משוך מגיט";
        } else {
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

  // [FIX-6] עדכון INDEX.md אוטומטי בסוף כל דוח
  devSync_generateAndPushIndex(gitMap);

  ui.alert("דוח סנכרון עודכן — " + rows.length + " קבצים.\nINDEX.md עודכן בגיטהאב.");
}

// ══════════════════════════════════════════════════════════════════
// יצירת INDEX.md ודחיפה לגיטהאב — [FIX-6]
// ══════════════════════════════════════════════════════════════════

function devSync_generateAndPushIndex(gitMap) {
  try {
    const token = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
    if (!token) {
      Logger.log("[DevSyncInspector] GITHUB_PAT חסר — לא ניתן לעדכן INDEX.md");
      return;
    }

    const now     = new Date();
    const dateStr = Utilities.formatDate(now, "Asia/Jerusalem", "dd/MM/yyyy HH:mm");
    const baseUrl = "https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/";

    const lines = [];
    lines.push("# MedicalPilot — INDEX");
    lines.push("עדכון אחרון: " + dateStr);
    lines.push("");
    lines.push("## תיקיית src/infrastructure");

    const sortedNames = Object.keys(gitMap).sort();
    sortedNames.forEach(function(name) {
      const info     = gitMap[name];
      const filePath = info.path;
      const fileName = name + ".gs";
      lines.push("- [" + fileName + "](" + baseUrl + filePath + ")");
    });

    lines.push("");
    lines.push("## שורש הריפוזיטורי");
    lines.push("- [CONTEXT.md](" + baseUrl + "CONTEXT.md)");
    lines.push("- [INDEX.md](" + baseUrl + "INDEX.md)");
    lines.push("- [README.md](" + baseUrl + "README.md)");
    lines.push("");
    lines.push("## פרטי ריפוזיטורי");
    lines.push("- בעלים: cohenamos07");
    lines.push("- שם: MedicalPilot");
    lines.push("- ענף: main");

    const content = lines.join("\n");
    devSync_pushRawToGitHub("INDEX.md", content, token);

  } catch (e) {
    Logger.log("[DevSyncInspector] devSync_generateAndPushIndex: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// דחיפת קובץ גולמי לגיטהאב — [FIX-6]
// ══════════════════════════════════════════════════════════════════

function devSync_pushRawToGitHub(filePath, content, token) {
  try {
    const url     = "https://api.github.com/repos/cohenamos07/MedicalPilot/contents/" + filePath;
    const headers = {
      "Authorization": "token " + token,
      "Accept":        "application/vnd.github.v3+json"
    };

    let sha = null;
    const getResponse = UrlFetchApp.fetch(url, {
      method:             "get",
      headers:            headers,
      muteHttpExceptions: true
    });
    if (getResponse.getResponseCode() === 200) {
      sha = JSON.parse(getResponse.getContentText()).sha;
    }

    const payload = {
      message: "Auto-update INDEX.md from DevSyncInspector",
      content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
      branch:  "main"
    };
    if (sha) payload.sha = sha;

    const putResponse = UrlFetchApp.fetch(url, {
      method:             "put",
      headers:            headers,
      contentType:        "application/json",
      payload:            JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (putResponse.getResponseCode() !== 200 && putResponse.getResponseCode() !== 201) {
      Logger.log("[DevSyncInspector] שגיאה בדחיפת " + filePath + ": " + putResponse.getContentText());
    } else {
      Logger.log("[DevSyncInspector] " + filePath + " עודכן בגיטהאב בהצלחה.");
    }
  } catch (e) {
    Logger.log("[DevSyncInspector] devSync_pushRawToGitHub: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// חילוץ תאריך משורת גרסה
// ══════════════════════════════════════════════════════════════════

function devSync_extractDate(versionLine) {
  if (!versionLine) return null;
  try {
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
    if (!sheet) return;

    const lastRow     = Math.max(sheet.getLastRow(), 2);
    const statusRange = sheet.getRange(2, 7, lastRow - 1, 1);

    const existingRules = sheet.getConditionalFormatRules();
    const filteredRules = existingRules.filter(rule =>
      !rule.getRanges().some(r => r.getColumn() === 7)
    );
    sheet.setConditionalFormatRules(filteredRules);

    const ruleGreen = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("תואם")
      .setBackground("#B7E1CD").setFontColor("#000000")
      .setRanges([statusRange]).build();

    const ruleYellow1 = SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains("שונה")
      .setBackground("#FCE8B2").setFontColor("#000000")
      .setRanges([statusRange]).build();

    const ruleYellow2 = SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains("חסר בגיט")
      .setBackground("#FCE8B2").setFontColor("#000000")
      .setRanges([statusRange]).build();

    const ruleRed = SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains("חסר בעורך")
      .setBackground("#F4CCCC").setFontColor("#000000")
      .setRanges([statusRange]).build();

    const ruleGray = SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains("ללא גרסה")
      .setBackground("#E8E8E8").setFontColor("#666666")
      .setRanges([statusRange]).build();

    const updatedRules = sheet.getConditionalFormatRules();
    updatedRules.push(ruleGreen, ruleYellow1, ruleYellow2, ruleRed, ruleGray);
    sheet.setConditionalFormatRules(updatedRules);
  } catch (e) {
    Logger.log("[DevSyncInspector] " + e.toString());
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

    if (response.getResponseCode() !== 200) return map;

    const data = JSON.parse(response.getContentText());
    (data.files || []).forEach(function(file) {
      if (file.type === "SERVER_JS" && file.name) {
        // [FIX-5] דילוג על קבצים מוחרגים
        if (DEV_SYNC_EXCLUDED.indexOf(file.name) !== -1) return;
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
    if (!token) return map;

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

    if (listResponse.getResponseCode() !== 200) return map;

    const files = JSON.parse(listResponse.getContentText());
    files.forEach(function(item) {
      if (item.type === "file" && item.name.endsWith(".gs")) {
        const nameWithoutExt = item.name.replace(/\.gs$/i, "");
        // [FIX-5] דילוג על קבצים מוחרגים
        if (DEV_SYNC_EXCLUDED.indexOf(nameWithoutExt) !== -1) return;
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
  } else if (action.includes("↑") || action.includes("דחוף לגיט")) {
    syncEditorFileToGitHub(fileName, gitPath);
  } else if (action.includes("תואם")) {
    ui.alert("הקובץ '" + fileName + "' תואם — אין צורך בסנכרון.");
  } else {
    ui.alert("לא ניתן להחליט אוטומטית — בדוק ידנית: " + fileName);
  }
}