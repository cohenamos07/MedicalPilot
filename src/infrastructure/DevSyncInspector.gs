/**
 * MedicalPilot — DevSyncInspector.gs
 * @version 3.1 | @updated 31/05/2026 16:40 | @service DEV_SYNC
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/DevSyncInspector.gs
 * @impacts מנוע סנכרון ודיווח בין עורך GAS לגיטהאב — 15 עמודות + אזור מרחבי.
 *          אחריות: נתוני דוח בלבד (שורות 5+) + כותרות N+ בשורה 4.
 *          ViewEngine אחראי לשורות 1-3, עמודות A-O בשורה 4, רוחב עמודות והקפאות.
 *          תלויות: GITHUB_PAT ב-Script Properties, Apps Script API, GitHub Contents API.
 * שינוי: [v3.1] הוספת שורה 47 באזור המרחבי — רשימת פונקציות חשופות לכל ספרייה.
 *               נוספה devSync_extractFunctions לחילוץ פונקציות חשופות מקוד מקור.
 *         [v3.0] הוספת Editor_Lines (E) ו-Git_Lines (F) — ספירת שורות קוד להשוואה.
 *               הזזת Version_Editor→G, Version_Git→H, Service_Editor→I, Service_Git→J,
 *               Sync_Status→K, System_Notes→L, System_Path→M, Git_Raw_Link→N, Git_Web_Link→O.
 *         [v2.9] גרסה קודמת
 */

// ════════════════════════════════════════════════════════════════════
// קבועי מערכת
// ════════════════════════════════════════════════════════════════════

const DEV_SYNC_SHEET_NAME          = "מסנכרן_קבצים";
const DEV_SYNC_GIT_FOLDER          = "src/infrastructure";
const DEV_SYNC_SCRIPT_ID           = "1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf";
const DEV_SYNC_EXCLUDED            = ["TestLab", "עותק של TestLab.gs"];
const DEV_SYNC_GITHUB_API_BASE     = "https://api.github.com/repos/cohenamos07/MedicalPilot/contents/";
const DEV_SYNC_GITHUB_WEB_BASE     = "https://github.com/cohenamos07/MedicalPilot/blob/main/";

// צבעים
const DEV_SYNC_COLOR_HEADER        = "#1a3a5c";
const DEV_SYNC_COLOR_HEADER_TXT    = "#FFFFFF";
const DEV_SYNC_COLOR_GREEN         = "#B7E1CD";
const DEV_SYNC_COLOR_YELLOW        = "#FCE8B2";
const DEV_SYNC_COLOR_RED           = "#F4CCCC";

// מבנה שורות ועמודות
const DEV_SYNC_HEADER_ROW          = 4;
const DEV_SYNC_DATA_START_ROW      = 5;
const DEV_SYNC_IMPACTS_HEADER_ROW  = 45;
const DEV_SYNC_IMPACTS_CONTENT_ROW = 46;
const DEV_SYNC_FUNCTIONS_ROW       = 47;
const DEV_SYNC_SPATIAL_COL_START   = 16;
const DEV_SYNC_SPATIAL_COL_WIDTH   = 250;
const DEV_SYNC_CONTENT_ROW_HEIGHT  = 300;
const DEV_SYNC_FUNCTIONS_ROW_HEIGHT = 200;
const DEV_SYNC_PREVIEW_MAX_CHARS   = 80;

// ════════════════════════════════════════════════════════════════════
// SCAN — אחראי על שורות 5+ ו-N+ בשורה 4 בלבד
// ════════════════════════════════════════════════════════════════════

function devSync_RunScanButton() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(DEV_SYNC_SHEET_NAME);
  if (!sheet) { SpreadsheetApp.getUi().alert("גיליון לא נמצא."); return; }

  // מחיקת שורות 5+ בלבד
  const lastRow = sheet.getLastRow();
  if (lastRow >= DEV_SYNC_DATA_START_ROW) {
    sheet.getRange(
      DEV_SYNC_DATA_START_ROW, 1,
      lastRow - DEV_SYNC_DATA_START_ROW + 1,
      sheet.getLastColumn()
    ).clearContent().clearFormat();
  }

  // מחיקת כותרות N+ בשורה 4
  const lastCol = sheet.getLastColumn();
  if (lastCol >= DEV_SYNC_SPATIAL_COL_START) {
    sheet.getRange(DEV_SYNC_HEADER_ROW, DEV_SYNC_SPATIAL_COL_START, 1,
      lastCol - DEV_SYNC_SPATIAL_COL_START + 1
    ).clearContent().clearFormat();
  }

  const editorMap = devSync_getEditorFilesMap();
  const gitMap    = devSync_getGitFilesMap();

  const allNames = Array.from(new Set([
    ...Object.keys(editorMap),
    ...Object.keys(gitMap)
  ])).sort();

  // וידוא מספיק עמודות
  const neededCols  = DEV_SYNC_SPATIAL_COL_START + allNames.length + 10;
  const currentCols = sheet.getMaxColumns();
  if (currentCols < neededCols) {
    sheet.insertColumnsAfter(currentCols, neededCols - currentCols);
    SpreadsheetApp.flush();
  }

  // בניית שורות נתונים
  const rows = [];
  allNames.forEach(function(name) {
    if (DEV_SYNC_EXCLUDED.indexOf(name) !== -1) return;

    const editorInfo        = editorMap[name] || null;
    const gitInfo           = gitMap[name]    || null;
    const versionLineEditor = editorInfo ? editorInfo.versionLine : "";
    const versionLineGit    = gitInfo    ? gitInfo.versionLine    : "";
    const partsEditor       = devSync_parseVersionParts(versionLineEditor);
    const partsGit          = devSync_parseVersionParts(versionLineGit);
    const editorLines       = editorInfo ? devSync_countLines(editorInfo.source) : "";
    const gitLines          = gitInfo    ? devSync_countLines(gitInfo.source)    : "";
    const status            = devSync_calcStatus(!!editorInfo, !!gitInfo, versionLineEditor, versionLineGit);
    const notes             = devSync_calcNotes(!!editorInfo, !!gitInfo);
    const gitPath           = gitInfo ? gitInfo.path : (DEV_SYNC_GIT_FOLDER + "/" + name + ".gs");

    rows.push([
      name,                                                    // A — File_Name
      "[ צפה בטקסט 👁️ ]",                                     // B — View_Summary
      "'" + partsEditor.updated,                               // C — Updated_Editor
      "'" + partsGit.updated,                                  // D — Updated_Git
      editorLines,                                             // E — Editor_Lines
      gitLines,                                                // F — Git_Lines
      partsEditor.version,                                     // G — Version_Editor
      partsGit.version,                                        // H — Version_Git
      partsEditor.service,                                     // I — Service_Editor
      partsGit.service,                                        // J — Service_Git
      status,                                                  // K — Sync_Status
      notes,                                                   // L — System_Notes
      gitPath,                                                 // M — System_Path
      "'" + DEV_SYNC_GITHUB_API_BASE + gitPath,               // N — Git_Raw_Link
      "'" + DEV_SYNC_GITHUB_WEB_BASE + gitPath                // O — Git_Web_Link
    ]);
  });

  if (rows.length > 0) {
    sheet.getRange(DEV_SYNC_DATA_START_ROW, 3,  rows.length, 1).setNumberFormat("@");
    sheet.getRange(DEV_SYNC_DATA_START_ROW, 4,  rows.length, 1).setNumberFormat("@");
    sheet.getRange(DEV_SYNC_DATA_START_ROW, 14, rows.length, 1).setNumberFormat("@");
    sheet.getRange(DEV_SYNC_DATA_START_ROW, 15, rows.length, 1).setNumberFormat("@");
    sheet.getRange(DEV_SYNC_DATA_START_ROW, 1, rows.length, 15).setValues(rows);
  }

  devSync_ApplyConditionalFormatting(sheet, rows.length);

  const colMapping = devSync_buildSpatialArea(sheet, allNames, editorMap, gitMap);
  PropertiesService.getScriptProperties().setProperty(
    'DEV_SYNC_COL_MAP', JSON.stringify(colMapping)
  );

  const indexOk = devSync_generateAndPushIndex(gitMap);
  const purgeOk = indexOk ? devSync_purgeJsDelivr() : false;

  SpreadsheetApp.getUi().alert(
    "סנכרון הושלם — " + rows.length + " קבצים.\n" +
    (indexOk && purgeOk ? "✅ INDEX.md + jsDelivr" :
     indexOk            ? "✅ INDEX.md | ⚠️ jsDelivr" :
                          "❌ INDEX.md נכשל")
  );
}

// ════════════════════════════════════════════════════════════════════
// ספירת שורות קוד
// ════════════════════════════════════════════════════════════════════

function devSync_countLines(source) {
  if (!source) return 0;
  return source.split(/\r?\n/).length;
}

// ════════════════════════════════════════════════════════════════════
// חילוץ רשימת פונקציות חשופות — ללא פונקציות פנימיות (_prefix)
// ════════════════════════════════════════════════════════════════════

function devSync_extractFunctions(source, isHtml) {
  if (!source || isHtml) return "(HTML — אין פונקציות GAS)";
  const regex   = /^function\s+([a-zA-Z0-9_]+)\s*\(/gm;
  const results = [];
  let match;
  while ((match = regex.exec(source)) !== null) {
    const name = match[1];
    if (!name.startsWith("_")) results.push(name);
  }
  if (results.length === 0) return "(לא נמצאו פונקציות חשופות)";
  return results.join("\n");
}

// ════════════════════════════════════════════════════════════════════
// ניווט לתא @impacts — מוקצה לאיקון
// ════════════════════════════════════════════════════════════════════

function devSync_NavigateToImpacts() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(DEV_SYNC_SHEET_NAME);
  if (!sheet) return;

  const row = sheet.getActiveCell().getRow();
  if (row < DEV_SYNC_DATA_START_ROW || row >= DEV_SYNC_IMPACTS_HEADER_ROW) {
    SpreadsheetApp.getUi().alert("יש לבחור שורת קובץ תחילה.");
    return;
  }

  const fileName = sheet.getRange(row, 1).getValue();
  if (!fileName) { SpreadsheetApp.getUi().alert("לא נמצא שם קובץ."); return; }

  const props       = PropertiesService.getScriptProperties();
  const mappingJson = props.getProperty('DEV_SYNC_COL_MAP');
  if (!mappingJson) { SpreadsheetApp.getUi().alert("הרץ דוח תחילה."); return; }

  const targetCol = JSON.parse(mappingJson)[String(fileName)];
  if (!targetCol) { SpreadsheetApp.getUi().alert("לא נמצאה עמודה עבור: " + fileName); return; }

  sheet.setActiveRange(sheet.getRange(DEV_SYNC_IMPACTS_CONTENT_ROW, targetCol));
}

// ════════════════════════════════════════════════════════════════════
// סנכרון עורך > גיט
// ════════════════════════════════════════════════════════════════════

function devSync_SyncToGit() {
  const ui    = SpreadsheetApp.getUi();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(DEV_SYNC_SHEET_NAME);
  if (!sheet) return;

  const row = sheet.getActiveCell().getRow();
  if (row < DEV_SYNC_DATA_START_ROW || row >= DEV_SYNC_IMPACTS_HEADER_ROW) {
    ui.alert("יש לבחור שורת קובץ תחילה."); return;
  }

  const values   = sheet.getRange(row, 1, 1, 15).getValues()[0];
  const fileName = values[0];
  const status   = values[10];
  const gitPath  = values[12];

  if (!fileName || !gitPath) { ui.alert("נתונים חסרים."); return; }
  if (status === "תואם")     { ui.alert("'" + fileName + "' כבר תואם."); return; }

  syncEditorFileToGitHub(fileName, gitPath);
  Utilities.sleep(1500);
  sheet.getRange(row, 11).setValue("תואם").setBackground(DEV_SYNC_COLOR_GREEN);
  sheet.getRange(row, 12).setValue("");
}

// ════════════════════════════════════════════════════════════════════
// סנכרון גיט > עורך
// ════════════════════════════════════════════════════════════════════

function devSync_SyncToEditor() {
  const ui    = SpreadsheetApp.getUi();
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(DEV_SYNC_SHEET_NAME);
  if (!sheet) return;

  const row = sheet.getActiveCell().getRow();
  if (row < DEV_SYNC_DATA_START_ROW || row >= DEV_SYNC_IMPACTS_HEADER_ROW) {
    ui.alert("יש לבחור שורת קובץ תחילה."); return;
  }

  const values   = sheet.getRange(row, 1, 1, 15).getValues()[0];
  const fileName = values[0];
  const status   = values[10];
  const gitPath  = values[12];

  if (!fileName || !gitPath) { ui.alert("נתונים חסרים."); return; }
  if (status === "תואם")     { ui.alert("'" + fileName + "' כבר תואם."); return; }

  syncFileFromGitToEditor(gitPath, fileName);
  Utilities.sleep(1500);
  sheet.getRange(row, 11).setValue("תואם").setBackground(DEV_SYNC_COLOR_GREEN);
  sheet.getRange(row, 12).setValue("");
}

// ════════════════════════════════════════════════════════════════════
// שמירת שורה נבחרת — Simple Trigger
// ════════════════════════════════════════════════════════════════════

function onSelectionChange(e) {
  try {
    const range = e.range;
    const sheet = range.getSheet();
    if (sheet.getName() !== DEV_SYNC_SHEET_NAME) return;
    const col = range.getColumn();
    const row = range.getRow();
    if (row >= DEV_SYNC_DATA_START_ROW && row < DEV_SYNC_IMPACTS_HEADER_ROW && col !== 2) {
      PropertiesService.getScriptProperties().setProperty('DEV_SYNC_LAST_ROW', String(row));
    }
  } catch (err) {
    Logger.log("[DevSyncInspector] onSelectionChange: " + err.toString());
  }
}

// ════════════════════════════════════════════════════════════════════
// עיצוב מותנה — עמודה K בלבד
// ════════════════════════════════════════════════════════════════════

function devSync_ApplyConditionalFormatting(sheet, rowCount) {
  try {
    if (rowCount === 0) return;
    const statusRange = sheet.getRange(DEV_SYNC_DATA_START_ROW, 11, rowCount, 1);

    const filtered = sheet.getConditionalFormatRules().filter(rule =>
      !rule.getRanges().some(r => r.getColumn() === 11)
    );
    sheet.setConditionalFormatRules(filtered);

    const rules = [
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo("תואם")
        .setBackground(DEV_SYNC_COLOR_GREEN).setFontColor("#000000")
        .setRanges([statusRange]).build(),
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextContains("⬆")
        .setBackground(DEV_SYNC_COLOR_YELLOW).setFontColor("#000000")
        .setRanges([statusRange]).build(),
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextContains("⬇")
        .setBackground(DEV_SYNC_COLOR_RED).setFontColor("#000000")
        .setRanges([statusRange]).build()
    ];

    const updated = sheet.getConditionalFormatRules();
    rules.forEach(function(r) { updated.push(r); });
    sheet.setConditionalFormatRules(updated);

  } catch (e) {
    Logger.log("[DevSyncInspector] devSync_ApplyConditionalFormatting: " + e.toString());
  }
}

// ════════════════════════════════════════════════════════════════════
// בניית אזור מרחבי — כולל שורה 47 (פונקציות)
// ════════════════════════════════════════════════════════════════════

function devSync_buildSpatialArea(sheet, allNames, editorMap, gitMap) {
  const colMapping = {};
  let colIndex = DEV_SYNC_SPATIAL_COL_START;

  allNames.forEach(function(name) {
    if (DEV_SYNC_EXCLUDED.indexOf(name) !== -1) return;

    colMapping[name] = colIndex;

    const gitInfo    = gitMap[name]    || null;
    const editorInfo = editorMap[name] || null;
    const isHtml     = name.toLowerCase().endsWith(".html") ||
                       (editorInfo && editorInfo.isHtml) ||
                       (gitInfo    && gitInfo.isHtml);

    // ── @impacts ──────────────────────────────────────────────────
    let impactsText = "";
    if (gitInfo && gitInfo.impactsText)            impactsText = gitInfo.impactsText;
    else if (editorInfo && editorInfo.impactsText) impactsText = editorInfo.impactsText;

    let preview = "(אין תיאור @impacts)";
    if (impactsText) {
      const firstLine = impactsText.split("\n")[0].trim();
      preview = firstLine.length > DEV_SYNC_PREVIEW_MAX_CHARS
        ? firstLine.substring(0, DEV_SYNC_PREVIEW_MAX_CHARS) + "..."
        : firstLine;
    }

    // ── רשימת פונקציות ───────────────────────────────────────────
    let functionsText = "";
    const sourceForFunctions = (editorInfo && editorInfo.source)
      ? editorInfo.source
      : (gitInfo && gitInfo.source ? gitInfo.source : "");
    functionsText = devSync_extractFunctions(sourceForFunctions, !!isHtml);

    // שורה 4 — כותרת ספרייה
    const r4 = sheet.getRange(DEV_SYNC_HEADER_ROW, colIndex);
    r4.setValue(name);
    r4.setBackground(DEV_SYNC_COLOR_HEADER);
    r4.setFontColor(DEV_SYNC_COLOR_HEADER_TXT);
    r4.setFontWeight("bold");
    r4.setHorizontalAlignment("center");
    r4.setFontSize(9);
    r4.setWrap(false);

    // שורה 5 — תצוגה מקדימה
    const r5 = sheet.getRange(DEV_SYNC_DATA_START_ROW, colIndex);
    r5.setValue(preview);
    r5.setWrap(false);
    r5.setFontSize(9);
    r5.setFontColor("#555555");
    r5.setVerticalAlignment("middle");

    // שורה 45 — כותרת + הוראת חזרה
    const r45 = sheet.getRange(DEV_SYNC_IMPACTS_HEADER_ROW, colIndex);
    r45.setValue(name + "  [ Ctrl+Home לחזרה ]");
    r45.setBackground(DEV_SYNC_COLOR_HEADER);
    r45.setFontColor(DEV_SYNC_COLOR_HEADER_TXT);
    r45.setFontWeight("bold");
    r45.setHorizontalAlignment("center");
    r45.setVerticalAlignment("middle");
    r45.setWrap(false);

    // שורה 46 — תוכן @impacts מלא
    const r46 = sheet.getRange(DEV_SYNC_IMPACTS_CONTENT_ROW, colIndex);
    r46.setValue(impactsText || "(אין תיאור @impacts)");
    r46.setWrap(true);
    r46.setVerticalAlignment("top");
    r46.setFontSize(10);

    // שורה 47 — רשימת פונקציות חשופות ← חדש
    const r47 = sheet.getRange(DEV_SYNC_FUNCTIONS_ROW, colIndex);
    r47.setValue(functionsText);
    r47.setWrap(true);
    r47.setVerticalAlignment("top");
    r47.setFontSize(9);
    r47.setFontColor("#333333");
    r47.setBackground("#f0f4f8");

    colIndex++;
  });

  sheet.setRowHeight(DEV_SYNC_IMPACTS_HEADER_ROW,  40);
  sheet.setRowHeight(DEV_SYNC_IMPACTS_CONTENT_ROW, DEV_SYNC_CONTENT_ROW_HEIGHT);
  sheet.setRowHeight(DEV_SYNC_FUNCTIONS_ROW,        DEV_SYNC_FUNCTIONS_ROW_HEIGHT);

  return colMapping;
}

// ════════════════════════════════════════════════════════════════════
// חישוב סטטוס
// ════════════════════════════════════════════════════════════════════

function devSync_calcStatus(existsEditor, existsGit, versionLineEditor, versionLineGit) {
  if (!existsEditor) return "⬇ סנכרן לעורך";
  if (!existsGit)    return "⬆ סנכרן לגיטהאב";

  if (versionLineEditor && versionLineGit && versionLineEditor === versionLineGit) {
    return "תואם";
  }

  if (!versionLineEditor && !versionLineGit) return "⬆ סנכרן לגיטהאב";

  const dateEditor = devSync_extractDate(versionLineEditor);
  const dateGit    = devSync_extractDate(versionLineGit);

  if (dateEditor && dateGit) {
    if (dateEditor > dateGit) return "⬆ סנכרן לגיטהאב";
    if (dateGit > dateEditor) return "⬇ סנכרן לעורך";
    return "⬆ סנכרן לגיטהאב";
  }
  if (dateEditor && !dateGit)  return "⬆ סנכרן לגיטהאב";
  if (!dateEditor && dateGit)  return "⬇ סנכרן לעורך";
  return "⬆ סנכרן לגיטהאב";
}

function devSync_calcNotes(existsEditor, existsGit) {
  if (!existsEditor && !existsGit) return "חסר בשני הצדדים";
  if (!existsEditor)               return "חסר בעורך";
  if (!existsGit)                  return "חסר בגיטהאב";
  return "";
}

// ════════════════════════════════════════════════════════════════════
// INDEX.md
// ════════════════════════════════════════════════════════════════════

function devSync_generateAndPushIndex(gitMap) {
  try {
    const token = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
    if (!token) { Logger.log("[DevSyncInspector] GITHUB_PAT חסר."); return false; }

    const dateStr = Utilities.formatDate(new Date(), "Asia/Jerusalem", "dd/MM/yyyy HH:mm");
    const jsdBase = "https://cdn.jsdelivr.net/gh/cohenamos07/MedicalPilot@main/";
    const lines   = [
      "# MedicalPilot — INDEX",
      "תאריך עדכון: " + dateStr, "",
      "## קבצים src/infrastructure"
    ];
    Object.keys(gitMap).sort().forEach(function(name) {
      lines.push("- [" + name + ".gs](" + jsdBase + gitMap[name].path + ")");
    });
    lines.push("", "## קישורי תשתית",
      "- [CONTEXT.md](" + jsdBase + "CONTEXT.md)",
      "- [INDEX.md]("   + jsdBase + "INDEX.md)",
      "- [README.md]("  + jsdBase + "README.md)",
      "", "## פרטי מאגר",
      "- בעלים: cohenamos07", "- מאגר: MedicalPilot", "- ענף: main"
    );

    const ok = devSync_pushRawToGitHub("INDEX.md", lines.join("\n"), token);
    if (ok) Logger.log("[DevSyncInspector] INDEX.md עודכן.");
    return ok;
  } catch (e) {
    Logger.log("[DevSyncInspector] devSync_generateAndPushIndex: " + e.toString());
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════
// ניקוי jsDelivr
// ════════════════════════════════════════════════════════════════════

function devSync_purgeJsDelivr() {
  try {
    const r = UrlFetchApp.fetch(
      "https://purge.jsdelivr.net/gh/cohenamos07/MedicalPilot@main/INDEX.md",
      { method: "get", muteHttpExceptions: true }
    );
    return r.getResponseCode() === 200;
  } catch (e) { return false; }
}

// ════════════════════════════════════════════════════════════════════
// דחיפה לגיטהאב
// ════════════════════════════════════════════════════════════════════

function devSync_pushRawToGitHub(filePath, content, token) {
  try {
    const url     = "https://api.github.com/repos/cohenamos07/MedicalPilot/contents/" + filePath;
    const headers = { "Authorization": "token " + token, "Accept": "application/vnd.github.v3+json" };
    let   sha     = null;
    const getRes  = UrlFetchApp.fetch(url, { method: "get", headers: headers, muteHttpExceptions: true });
    if (getRes.getResponseCode() === 200) sha = JSON.parse(getRes.getContentText()).sha;

    const payload = {
      message: "Auto-update from DevSyncInspector",
      content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
      branch:  "main"
    };
    if (sha) payload.sha = sha;

    const putRes = UrlFetchApp.fetch(url, {
      method: "put", headers: headers,
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const code = putRes.getResponseCode();
    return (code === 200 || code === 201);
  } catch (e) {
    Logger.log("[DevSyncInspector] devSync_pushRawToGitHub: " + e.toString());
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════
// מפת קבצי עורך — כולל HTML
// ════════════════════════════════════════════════════════════════════

function devSync_getEditorFilesMap() {
  const map = {};
  try {
    const response = UrlFetchApp.fetch(
      "https://script.googleapis.com/v1/projects/" + DEV_SYNC_SCRIPT_ID + "/content",
      { method: "get", headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() }, muteHttpExceptions: true }
    );
    if (response.getResponseCode() !== 200) return map;
    (JSON.parse(response.getContentText()).files || []).forEach(function(file) {
      const isGs   = file.type === "SERVER_JS" && file.name;
      const isHtml = file.type === "HTML"       && file.name;
      if (!isGs && !isHtml) return;
      if (DEV_SYNC_EXCLUDED.indexOf(file.name) !== -1) return;
      const source = file.source || "";
      map[file.name] = {
        versionLine: devSync_extractVersionLine(source),
        impactsText: devSync_extractImpactsText(source, !!isHtml),
        source:      source,
        isHtml:      !!isHtml
      };
    });
  } catch (e) { Logger.log("devSync_getEditorFilesMap: " + e.toString()); }
  return map;
}

// ════════════════════════════════════════════════════════════════════
// מפת קבצי גיטהאב — כולל HTML
// ════════════════════════════════════════════════════════════════════

function devSync_getGitFilesMap() {
  const map = {};
  try {
    const token   = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
    if (!token) return map;
    const headers = { "Authorization": "token " + token, "Accept": "application/vnd.github.v3+json" };
    const listRes = UrlFetchApp.fetch(
      "https://api.github.com/repos/cohenamos07/MedicalPilot/contents/" + DEV_SYNC_GIT_FOLDER,
      { method: "get", headers: headers, muteHttpExceptions: true }
    );
    if (listRes.getResponseCode() !== 200) return map;

    JSON.parse(listRes.getContentText()).forEach(function(item) {
      if (item.type !== "file") return;
      const isGs   = item.name.match(/\.gs$/i);
      const isHtml = item.name.match(/\.html$/i);
      if (!isGs && !isHtml) return;
      const nameWithoutExt = item.name.replace(/\.(gs|html)$/i, "");
      if (DEV_SYNC_EXCLUDED.indexOf(nameWithoutExt) !== -1) return;
      const content = devSync_fetchGitFileContent(item.path, token);
      map[nameWithoutExt] = {
        path:        item.path,
        versionLine: devSync_extractVersionLine(content),
        impactsText: devSync_extractImpactsText(content, !!isHtml),
        source:      content,
        isHtml:      !!isHtml
      };
    });
  } catch (e) { Logger.log("devSync_getGitFilesMap: " + e.toString()); }
  return map;
}

// ════════════════════════════════════════════════════════════════════
// שליפת תוכן קובץ מגיטהאב
// ════════════════════════════════════════════════════════════════════

function devSync_fetchGitFileContent(filePath, token) {
  try {
    const response = UrlFetchApp.fetch(
      "https://api.github.com/repos/cohenamos07/MedicalPilot/contents/" + filePath,
      { method: "get", headers: { "Authorization": "token " + token, "Accept": "application/vnd.github.v3+json" }, muteHttpExceptions: true }
    );
    if (response.getResponseCode() === 200) {
      return Utilities.newBlob(
        Utilities.base64Decode(JSON.parse(response.getContentText()).content)
      ).getDataAsString();
    }
  } catch (e) { Logger.log("devSync_fetchGitFileContent: " + e.toString()); }
  return "";
}

// ════════════════════════════════════════════════════════════════════
// חילוץ שורת @version
// ════════════════════════════════════════════════════════════════════

function devSync_extractVersionLine(source) {
  if (!source) return "";
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("@version")) return lines[i].trim();
  }
  return "";
}

// ════════════════════════════════════════════════════════════════════
// חילוץ @impacts — gs וHTML
// ════════════════════════════════════════════════════════════════════

function devSync_extractImpactsText(source, isHtml) {
  if (!source) return "";
  const lines   = source.split(/\r?\n/);
  const result  = [];
  let capturing = false;

  if (isHtml) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("@impacts")) {
        capturing = true;
        result.push(line.replace(/<!--/, "").replace(/@impacts/, "").trim());
        continue;
      }
      if (capturing) {
        if (line.includes("-->")) { const c = line.replace(/-->/, "").trim(); if (c) result.push(c); break; }
        result.push(line.trim());
      }
    }
  } else {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("@impacts")) {
        capturing = true;
        result.push(line.replace(/@impacts/, "").replace(/^\s*\*\s*/, "").trim());
        continue;
      }
      if (capturing) {
        const t = line.trim();
        if (t.startsWith("*") && !t.startsWith("*/")) result.push(t.replace(/^\*\s*/, "").trim());
        else break;
      }
    }
  }
  return result.filter(Boolean).join("\n");
}

// ════════════════════════════════════════════════════════════════════
// פירוק שורת גרסה
// ════════════════════════════════════════════════════════════════════

function devSync_parseVersionParts(versionLine) {
  if (!versionLine) return { version: "", updated: "", service: "" };
  const parts = versionLine.split("|");
  return {
    version: parts[0] ? parts[0].replace(/@version/i, "").replace(/[*/]/g, "").trim() : "",
    updated: parts[1] ? parts[1].replace(/@updated/i, "").replace(/[*/]/g, "").trim() : "",
    service: parts[2] ? parts[2].replace(/@service/i, "").replace(/[*/]/g, "").trim() : ""
  };
}

// ════════════════════════════════════════════════════════════════════
// חילוץ תאריך להשוואה
// ════════════════════════════════════════════════════════════════════

function devSync_extractDate(versionLine) {
  if (!versionLine) return null;
  try {
    const match = versionLine.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
    if (!match) return null;
    return new Date(
      parseInt(match[3], 10), parseInt(match[2], 10) - 1, parseInt(match[1], 10),
      match[4] ? parseInt(match[4], 10) : 0,
      match[5] ? parseInt(match[5], 10) : 0, 0
    );
  } catch (e) { return null; }
}

// ════════════════════════════════════════════════════════════════════
// פתיחת גיליון
// ════════════════════════════════════════════════════════════════════

function devSync_OpenSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(DEV_SYNC_SHEET_NAME);
  if (sheet) ss.setActiveSheet(sheet);
}