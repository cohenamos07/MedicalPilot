/**
 * MedicalPilot — EditorToGitHub.gs
 * @version 100.2 | @updated 08/05/2026 | @service S10
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/EditorToGitHub.gs
 * שינוי: [v100.2] הוספת S08_Validate, S08_Sidebar, COLUMN_MAP, S06, S07, QA_Tests,
 *                  DevSyncInspector, S_Scheduler לרשימת הסנכרון
 *         [v100.2] pushVersionsFile — יצירת VERSIONS.md אוטומטית אחרי כל סנכרון
 *         [v100.2] updateIndexFile — עדכון INDEX.md אוטומטי אחרי כל סנכרון
 *         [v100.1] עדכונים קודמים
 */

// ══════════════════════════════════════════════════════════════════
// קריאת קובץ מהעורך
// ══════════════════════════════════════════════════════════════════

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
    if (file) return file.source;
    Logger.log("File " + fileName + " not found in editor.");
    return null;
  } catch (e) {
    Logger.log("Error in getFileContentFromEditor: " + e.toString());
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// דחיפת קובץ לגיטהאב
// ══════════════════════════════════════════════════════════════════

function pushFileToGitHub(fileName, filePath, content) {
  try {
    const token = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
    if (!token) { Logger.log("Error: GITHUB_PAT not found."); return false; }

    const url = "https://api.github.com/repos/cohenamos07/MedicalPilot/contents/" + filePath;
    const headers = {
      "Authorization": "token " + token,
      "Accept": "application/vnd.github.v3+json"
    };

    let sha = null;
    const getResponse = UrlFetchApp.fetch(url, {
      method: "get", headers: headers, muteHttpExceptions: true
    });
    if (getResponse.getResponseCode() === 200) {
      sha = JSON.parse(getResponse.getContentText()).sha;
    }

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

    if (putResponse.getResponseCode() === 200 || putResponse.getResponseCode() === 201) {
      return true;
    }
    Logger.log("GitHub Push Failed [" + fileName + "]: " + putResponse.getContentText());
    return false;
  } catch (e) {
    Logger.log("Error in pushFileToGitHub: " + e.toString());
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════
// סנכרון קובץ בודד
// ══════════════════════════════════════════════════════════════════

function syncEditorFileToGitHub(fileName, githubPath) {
  try {
    const content = getFileContentFromEditor(fileName);
    if (content === null) {
      SpreadsheetApp.getUi().alert("שגיאה: לא ניתן לקרוא את הקובץ [" + fileName + "] מהעורך.");
      return;
    }
    const success = pushFileToGitHub(fileName, githubPath, content);
    if (success) {
      SpreadsheetApp.getUi().alert("✅ הקובץ [" + fileName + "] עודכן בגיטהאב בהצלחה");
    } else {
      SpreadsheetApp.getUi().alert("❌ שגיאה בעדכון [" + fileName + "] בגיטהאב");
    }
  } catch (e) {
    Logger.log("Error in syncEditorFileToGitHub: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה קריטית: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// [v100.2] רשימת קבצים מלאה לסנכרון
// ══════════════════════════════════════════════════════════════════

function _getFilesList() {
  return [
    { name: "Auth_Check",         path: "src/infrastructure/Auth_Check.gs" },
    { name: "COLUMN_MAP",         path: "src/infrastructure/COLUMN_MAP.gs" },
    { name: "DevSyncInspector",   path: "src/infrastructure/DevSyncInspector.gs" },
    { name: "EditorToGitHub",     path: "src/infrastructure/EditorToGitHub.gs" },
    { name: "GitHubSync",         path: "src/infrastructure/GitHubSync.gs" },
    { name: "GitToEditor",        path: "src/infrastructure/GitToEditor.gs" },
    { name: "Main",               path: "src/infrastructure/Main.gs" },
    { name: "Menu_LAB",           path: "src/infrastructure/Menu_LAB.gs" },
    { name: "Menu_PROD",          path: "src/infrastructure/Menu_PROD.gs" },
    { name: "Mod_Brain_OCR",      path: "src/infrastructure/Mod_Brain_OCR.gs" },
    { name: "Mod_Ingestion",      path: "src/infrastructure/Mod_Ingestion.gs" },
    { name: "NetworkDiagnostics", path: "src/infrastructure/NetworkDiagnostics.gs" },
    { name: "QA_Tests",           path: "src/infrastructure/QA_Tests.gs" },
    { name: "S04_DriveSync",      path: "src/infrastructure/S04_DriveSync.gs" },
    { name: "S05_MetaExtract",    path: "src/infrastructure/S05_MetaExtract.gs" },
    { name: "S06_ConvertTXT",     path: "src/infrastructure/S06_ConvertTXT.gs" },
    { name: "S07_Classify",       path: "src/infrastructure/S07_Classify.gs" },
    { name: "S08_Validate",       path: "src/infrastructure/S08_Validate.gs" },
    { name: "S_Scheduler",        path: "src/infrastructure/S_Scheduler.gs" },
    { name: "Service_Folders",    path: "src/infrastructure/Service_Folders.gs" },
    { name: "System_Doc_Builder", path: "src/infrastructure/System_Doc_Builder.gs" },
    { name: "System_HealthCheck", path: "src/infrastructure/System_HealthCheck.gs" },
    { name: "System_Logger",      path: "src/infrastructure/System_Logger.gs" }
  ];
}

// ══════════════════════════════════════════════════════════════════
// סנכרון כל הקבצים לגיטהאב
// ══════════════════════════════════════════════════════════════════

function syncAllFilesToGitHub() {
  try {
    const files = _getFilesList();
    let success = 0;
    let failed  = 0;
    const results = [];

    files.forEach(function(file) {
      const content = getFileContentFromEditor(file.name);
      if (content) {
        const ok = pushFileToGitHub(file.name, file.path, content);
        if (ok) {
          success++;
          results.push({ name: file.name, path: file.path, ok: true, content: content });
        } else {
          failed++;
          results.push({ name: file.name, path: file.path, ok: false, content: null });
        }
      } else {
        failed++;
        results.push({ name: file.name, path: file.path, ok: false, content: null });
      }
    });

    // [v100.2] עדכון VERSIONS.md ו-INDEX.md אחרי סנכרון
    pushVersionsFile(results);
    updateIndexFile();

    SpreadsheetApp.getUi().alert(
      "✅ סנכרון הושלם:\n" +
      success + " קבצים עודכנו בהצלחה\n" +
      failed  + " נכשלו\n\n" +
      "VERSIONS.md ו-INDEX.md עודכנו אוטומטית."
    );
  } catch (e) {
    Logger.log("Error in syncAllFilesToGitHub: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה קריטית: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// [v100.2] יצירת VERSIONS.md — קריא לי בתחילת כל סשן
// ══════════════════════════════════════════════════════════════════

function pushVersionsFile(results) {
  try {
    const now = new Date();
    const timestamp = Utilities.formatDate(now, "Asia/Jerusalem", "dd/MM/yyyy HH:mm");

    let md = "# MedicalPilot — VERSIONS\n";
    md    += "עדכון אחרון: " + timestamp + "\n\n";
    md    += "| קובץ | גרסה | נתיב |\n";
    md    += "|---|---|---|\n";

    results.forEach(function(r) {
      if (r.ok && r.content) {
        const version = _extractVersionLine(r.content);
        const rawUrl  = "https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/" + r.path;
        md += "| " + r.name + " | " + version + " | [קישור](" + rawUrl + ") |\n";
      } else {
        md += "| " + r.name + " | ❌ שגיאה בסנכרון | — |\n";
      }
    });

    pushFileToGitHub("VERSIONS", "VERSIONS.md", md);
    Logger.log("[EditorToGitHub] VERSIONS.md עודכן");
  } catch (e) {
    Logger.log("pushVersionsFile: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// [v100.2] עדכון INDEX.md — כולל כל הקבצים
// ══════════════════════════════════════════════════════════════════

function updateIndexFile() {
  try {
    const now = new Date();
    const timestamp = Utilities.formatDate(now, "Asia/Jerusalem", "dd/MM/yyyy HH:mm");
    const files = _getFilesList();

    let md = "# MedicalPilot — INDEX\n";
    md    += "עדכון אחרון: " + timestamp + "\n\n";
    md    += "## תיקיית src/infrastructure\n";

    files.forEach(function(file) {
      const rawUrl = "https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/" + file.path;
      md += "- [" + file.name + ".gs](" + rawUrl + ")\n";
    });

    // קבצי HTML
    md += "- [S08_Sidebar.html](https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/S08_Sidebar.html)\n";

    md += "\n## שורש הריפוזיטורי\n";
    md += "- [VERSIONS.md](https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/VERSIONS.md)\n";
    md += "- [CONTEXT.md](https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/CONTEXT.md)\n";
    md += "- [INDEX.md](https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/INDEX.md)\n";
    md += "- [README.md](https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/README.md)\n";

    md += "\n## פרטי ריפוזיטורי\n";
    md += "- בעלים: cohenamos07\n";
    md += "- שם: MedicalPilot\n";
    md += "- ענף: main\n";

    pushFileToGitHub("INDEX", "INDEX.md", md);
    Logger.log("[EditorToGitHub] INDEX.md עודכן");
  } catch (e) {
    Logger.log("updateIndexFile: " + e.toString());
  }
}

// ══════════════════════════════════════════════════════════════════
// חילוץ שורת גרסה מתוכן קובץ
// ══════════════════════════════════════════════════════════════════

function _extractVersionLine(source) {
  if (!source) return "—";
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("@version")) return lines[i].trim().replace(/^\*\s*/, "");
  }
  return "—";
}

// ══════════════════════════════════════════════════════════════════
// פונקציות סנכרון קובץ בודד — קיצורי דרך
// ══════════════════════════════════════════════════════════════════

function testSyncIngestion()      { syncEditorFileToGitHub("Mod_Ingestion",      "src/infrastructure/Mod_Ingestion.gs"); }
function testSyncMenuLab()        { syncEditorFileToGitHub("Menu_LAB",            "src/infrastructure/Menu_LAB.gs"); }
function testSyncMenuProd()       { syncEditorFileToGitHub("Menu_PROD",           "src/infrastructure/Menu_PROD.gs"); }
function testSyncMain()           { syncEditorFileToGitHub("Main",                "src/infrastructure/Main.gs"); }
function testSyncGitHubSync()     { syncEditorFileToGitHub("GitHubSync",          "src/infrastructure/GitHubSync.gs"); }
function testSyncEditorToGitHub() { syncEditorFileToGitHub("EditorToGitHub",      "src/infrastructure/EditorToGitHub.gs"); }
function testSyncServiceFolders() { syncEditorFileToGitHub("Service_Folders",     "src/infrastructure/Service_Folders.gs"); }
function testSyncAuthCheck()      { syncEditorFileToGitHub("Auth_Check",          "src/infrastructure/Auth_Check.gs"); }
function testSyncS08Validate()    { syncEditorFileToGitHub("S08_Validate",        "src/infrastructure/S08_Validate.gs"); }
function testSyncColumnMap()      { syncEditorFileToGitHub("COLUMN_MAP",          "src/infrastructure/COLUMN_MAP.gs"); }
function testSyncS06()            { syncEditorFileToGitHub("S06_ConvertTXT",      "src/infrastructure/S06_ConvertTXT.gs"); }
function testSyncS07()            { syncEditorFileToGitHub("S07_Classify",        "src/infrastructure/S07_Classify.gs"); }

// ══════════════════════════════════════════════════════════════════
// סנכרון S08_Sidebar.html — קובץ HTML בנפרד
// ══════════════════════════════════════════════════════════════════

function testSyncS08Sidebar() {
  try {
    const scriptId = "1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf";
    const url = "https://script.googleapis.com/v1/projects/" + scriptId + "/content";
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      SpreadsheetApp.getUi().alert("שגיאה בקריאת העורך");
      return;
    }

    const data = JSON.parse(response.getContentText());
    const file = data.files.find(f => f.name === "S08_Sidebar");
    if (!file) {
      SpreadsheetApp.getUi().alert("קובץ S08_Sidebar לא נמצא בעורך");
      return;
    }

    const ok = pushFileToGitHub("S08_Sidebar", "src/infrastructure/S08_Sidebar.html", file.source);
    if (ok) {
      SpreadsheetApp.getUi().alert("✅ S08_Sidebar.html עודכן בגיטהאב");
    } else {
      SpreadsheetApp.getUi().alert("❌ שגיאה בדחיפת S08_Sidebar.html");
    }
  } catch (e) {
    Logger.log("testSyncS08Sidebar: " + e.toString());
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}