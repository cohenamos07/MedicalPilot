/**
 * MedicalPilot — GitHubSync.gs
 * שירות סנכרון גיטהאב
 * @version 98.0 | @updated 26/04/2026 | @service S10
 */

function pushContextToGitHub() {
  const repoOwner = "cohenamos07";
  const repoName = "MedicalPilot";
  const path = "CONTEXT.md";
  const branch = "main";
  try {
    const token = PropertiesService.getScriptProperties().getProperty("GITHUB_PAT");
    if (!token) throw new Error("GITHUB_PAT לא נמצא.");
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("תיעוד מערכת AI");
    if (!sheet) throw new Error("גיליון תיעוד מערכת AI לא נמצא.");
    const servicesData = sheet.getRange("A5:E19").getValues();
    const nextMission = sheet.getRange("B20").getValue();
    const now = Utilities.formatDate(new Date(), "GMT+3", "dd/MM/yyyy HH:mm");
    let md = "# MedicalPilot — CONTEXT\n";
    md += "עדכון אחרון: " + now + "\n\n";
    md += "## פרטי משתמש\n";
    md += "- שם: עמוס כהן\n";
    md += "- אינו מתכנת — קוד מלא בלבד בתיבת העתקה\n";
    md += "- מוגבל ביד ימין — כל טקסט וקוד בתיבת העתקה\n";
    md += "- שפה: עברית בלבד\n";
    md += "- שיטת עדכון קוד: Ctrl+A → Delete → Ctrl+V → Ctrl+S\n";
    md += "- סוכן כתיבה: Gemini — Claude מכין פרומפט, Gemini כותב, Claude מאשר\n\n";
    md += "## קישורים קריטיים\n";
    md += "- גיליון: https://docs.google.com/spreadsheets/d/1uYnt-wleYpuk1ZrX7fTn2HDZ12PNWBEFRDGqHQN_U4I\n";
    md += "- עורך: https://script.google.com/u/0/home/projects/1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf\n";
    md += "- גיטהאב: https://github.com/cohenamos07/MedicalPilot\n";
    md += "- אינדקס: https://github.com/cohenamos07/MedicalPilot/blob/main/INDEX.md\n";
    md += "- מפת עמודות: https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/COLUMN_MAP.gs\n\n";
    md += "## מצב המערכת\n";
    md += "- גרסה: v98.0\n";
    md += "- פלטפורמה: Google Apps Script + Google Sheets + Google Drive + Gemini API\n\n";
    md += "## 15 שירותים\n";
    md += "| מזהה | שם שירות | קובץ | סטטוס | הערה |\n";
    md += "| :--- | :--- | :--- | :--- | :--- |\n";
    servicesData.forEach(function(row) { md += "| " + row.join(" | ") + " |\n"; });
    md += "\n## בעיות קריטיות\n";
    md += "- System_Logger.gs תלוי שורה 6 — אסור לגעת במבנה הגיליון\n";
    md += "- גיליונות דוגמאות_למידה ויומן_אירועים_רפואי ריקים\n\n";
    md += "## משימה הבאה\n";
    md += nextMission + "\n\n";
    md += "## כלל הזהב\n";
    md += "- לפני כל שינוי — גיבוי ידני ב-Apps Script\n";
    md += "- אף פונקציה לא נמחקת — רק מוסיפים\n";
    md += "- Claude = ארכיטקט, Gemini = כותב קוד, עמוס = מאשר ומפרס\n\n";
    md += "## איך לפתוח שיחה חדשה\n";
    md += "כתוב: \"אני עמוס. ממשיכים MedicalPilot.\"\n";
    md += "קישור אינדקס: https://github.com/cohenamos07/MedicalPilot/blob/main/INDEX.md\n";
    const apiUrl = "https://api.github.com/repos/" + repoOwner + "/" + repoName + "/contents/" + path;
    const headers = { "Authorization": "token " + token, "Accept": "application/vnd.github.v3+json" };
    let sha = null;
    try {
      const getResponse = UrlFetchApp.fetch(apiUrl, { method: "get", headers: headers, muteHttpExceptions: true });
      if (getResponse.getResponseCode() === 200) { sha = JSON.parse(getResponse.getContentText()).sha; }
    } catch (e) { Logger.log("קובץ לא קיים: " + e.message); }
    const payload = { message: "Auto-update CONTEXT.md", content: Utilities.base64Encode(md, Utilities.Charset.UTF_8), branch: branch };
    if (sha) payload.sha = sha;
    const putResponse = UrlFetchApp.fetch(apiUrl, { method: "put", headers: headers, contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true });
    const code = putResponse.getResponseCode();
    if (code === 200 || code === 201) {
      SpreadsheetApp.getUi().alert("CONTEXT.md עודכן בגיטהאב בהצלחה");
    } else {
      throw new Error("שגיאה בדחיפה: " + putResponse.getContentText());
    }
  } catch (e) {
    Logger.log("שגיאה ב-pushContextToGitHub: " + e.message);
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
  }
}

function endSessionSync() {
  try {
    if (typeof updateSystemContext === 'function') { updateSystemContext(); }
    pushContextToGitHub();
    pushIndexToGitHub();
    if (typeof syncAllFilesToGitHub === 'function') { syncAllFilesToGitHub(); }
    SpreadsheetApp.getUi().alert("סנכרון סשן הושלם — גיליון, גיטהאב וכל הקבצים עודכנו");
  } catch (e) {
    Logger.log("שגיאה ב-endSessionSync: " + e.message);
    SpreadsheetApp.getUi().alert("שגיאה בסנכרון סשן: " + e.message);
  }
}

function testGitHubConnection() {
  const ui = SpreadsheetApp.getUi();
  try {
    const token = PropertiesService.getScriptProperties().getProperty("GITHUB_PAT");
    if (!token) { ui.alert("שגיאה: טוקן לא נמצא."); return; }
    const response = UrlFetchApp.fetch("https://api.github.com/repos/cohenamos07/MedicalPilot", {
      method: "get",
      headers: { "Authorization": "token " + token, "Accept": "application/vnd.github.v3+json" },
      muteHttpExceptions: true
    });
    if (response.getResponseCode() === 200) {
      ui.alert("חיבור לגיטהאב תקין");
    } else {
      ui.alert("שגיאת חיבור: " + response.getResponseCode());
    }
  } catch (e) { ui.alert("שגיאה: " + e.message); }
}

function testGitHubWrite() {
  const ui = SpreadsheetApp.getUi();
  try {
    const token = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
    if (!token) { ui.alert("שגיאה: טוקן לא נמצא"); return; }
    const url = "https://api.github.com/repos/cohenamos07/MedicalPilot/contents/TEST_WRITE.md";
    const headers = { "Authorization": "token " + token, "Accept": "application/vnd.github.v3+json" };
    let sha = null;
    const getResponse = UrlFetchApp.fetch(url, { method: "get", headers: headers, muteHttpExceptions: true });
    const getCode = getResponse.getResponseCode();
    ui.alert("שלב 1 — קריאה: קוד " + getCode);
    if (getCode === 200) { sha = JSON.parse(getResponse.getContentText()).sha; }
    const payload = { message: "test write from Apps Script", content: Utilities.base64Encode("test"), branch: "main" };
    if (sha) payload.sha = sha;
    const putResponse = UrlFetchApp.fetch(url, { method: "put", headers: headers, contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true });
    const putCode = putResponse.getResponseCode();
    ui.alert("שלב 2 — כתיבה: קוד " + putCode);
    if (putCode === 200 || putCode === 201) {
      ui.alert("כתיבה לגיטהאב הצליחה");
    } else {
      ui.alert("כתיבה נכשלה: " + putResponse.getContentText());
    }
  } catch (e) {
    Logger.log("Error in testGitHubWrite: " + e.toString());
    ui.alert("שגיאה: " + e.message);
  }
}

function pushIndexToGitHub() {
  try {
    const token = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
    if (!token) { Logger.log("Error: GITHUB_PAT not found"); return; }
    const owner = "cohenamos07";
    const repo = "MedicalPilot";
    const path = "INDEX.md";
    const branch = "main";
    const url = "https://api.github.com/repos/" + owner + "/" + repo + "/contents/" + path;
    const now = Utilities.formatDate(new Date(), "GMT+3", "dd/MM/yyyy HH:mm");
    const contentString =
      "# MedicalPilot — INDEX\n" +
      "עדכון אחרון: " + now + "\n\n" +
      "## תיקיית src/infrastructure\n" +
      "- [appsscript.json](https://github.com/cohenamos07/MedicalPilot/blob/main/src/infrastructure/appsscript.json)\n" +
      "- [System_Logger.gs](https://github.com/cohenamos07/MedicalPilot/blob/main/src/infrastructure/System_Logger.gs)\n" +
      "- [System_Doc_Builder.gs](https://github.com/cohenamos07/MedicalPilot/blob/main/src/infrastructure/System_Doc_Builder.gs)\n" +
      "- [System_HealthCheck.gs](https://github.com/cohenamos07/MedicalPilot/blob/main/src/infrastructure/System_HealthCheck.gs)\n" +
      "- [NetworkDiagnostics.gs](https://github.com/cohenamos07/MedicalPilot/blob/main/src/infrastructure/NetworkDiagnostics.gs)\n" +
      "- [Auth_Check.gs](https://github.com/cohenamos07/MedicalPilot/blob/main/src/infrastructure/Auth_Check.gs)\n" +
      "- [GitHubSync.gs](https://github.com/cohenamos07/MedicalPilot/blob/main/src/infrastructure/GitHubSync.gs)\n" +
      "- [GitToEditor.gs](https://github.com/cohenamos07/MedicalPilot/blob/main/src/infrastructure/GitToEditor.gs)\n" +
      "- [EditorToGitHub.gs](https://github.com/cohenamos07/MedicalPilot/blob/main/src/infrastructure/EditorToGitHub.gs)\n" +
      "- [Menu_PROD.gs](https://github.com/cohenamos07/MedicalPilot/blob/main/src/infrastructure/Menu_PROD.gs)\n" +
      "- [Menu_LAB.gs](https://github.com/cohenamos07/MedicalPilot/blob/main/src/infrastructure/Menu_LAB.gs)\n" +
      "- [Main.gs](https://github.com/cohenamos07/MedicalPilot/blob/main/src/infrastructure/Main.gs)\n" +
      "- [Mod_Ingestion.gs](https://github.com/cohenamos07/MedicalPilot/blob/main/src/infrastructure/Mod_Ingestion.gs)\n" +
      "- [S04_DriveSync.gs](https://github.com/cohenamos07/MedicalPilot/blob/main/src/infrastructure/S04_DriveSync.gs)\n" +
      "- [S05_MetaExtract.gs](https://github.com/cohenamos07/MedicalPilot/blob/main/src/infrastructure/S05_MetaExtract.gs)\n" +
      "- [S06_ConvertTXT.gs](https://github.com/cohenamos07/MedicalPilot/blob/main/src/infrastructure/S06_ConvertTXT.gs)\n" +
      "- [Service_Folders.gs](https://github.com/cohenamos07/MedicalPilot/blob/main/src/infrastructure/Service_Folders.gs)\n" +
      "- [COLUMN_MAP.gs](https://github.com/cohenamos07/MedicalPilot/blob/main/src/infrastructure/COLUMN_MAP.gs)\n\n" +
      "## שורש הריפוזיטורי\n" +
      "- [CONTEXT.md](https://github.com/cohenamos07/MedicalPilot/blob/main/CONTEXT.md)\n" +
      "- [INDEX.md](https://github.com/cohenamos07/MedicalPilot/blob/main/INDEX.md)\n" +
      "- [README.md](https://github.com/cohenamos07/MedicalPilot/blob/main/README.md)\n\n" +
      "## פרטי ריפוזיטורי\n" +
      "- בעלים: " + owner + "\n" +
      "- שם: " + repo + "\n" +
      "- ענף: " + branch + "\n";
    const headers = { "Authorization": "token " + token, "Accept": "application/vnd.github.v3+json" };
    let sha = null;
    const getResponse = UrlFetchApp.fetch(url, { method: "get", headers: headers, muteHttpExceptions: true });
    if (getResponse.getResponseCode() === 200) { sha = JSON.parse(getResponse.getContentText()).sha; }
    const payload = { message: "Auto-update INDEX.md", content: Utilities.base64Encode(contentString, Utilities.Charset.UTF_8), branch: branch };
    if (sha) payload.sha = sha;
    const putResponse = UrlFetchApp.fetch(url, { method: "put", headers: headers, contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true });
    if (putResponse.getResponseCode() === 200 || putResponse.getResponseCode() === 201) {
      Logger.log("INDEX.md עודכן בהצלחה");
    } else {
      Logger.log("נכשל: " + putResponse.getContentText());
    }
  } catch (e) { Logger.log("שגיאה ב-pushIndexToGitHub: " + e.toString()); }
}