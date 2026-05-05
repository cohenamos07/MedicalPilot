/**
 * MedicalPilot — S04_DriveSync.gs
 * @version 1.2.0 | @updated 05/05/2026 19:30 | @service S04
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/S04_DriveSync.gs
 * שינוי: [FIX-1] כותרת תקנית לסטנדרט המערכת
 */

// ══════════════════════════════════════════════════════════════════
// ניהול תאריך ריצה אחרונה (Incremental Sync)
// ══════════════════════════════════════════════════════════════════

function getLastRunDate() {
  try {
    const lastRunStr = PropertiesService.getScriptProperties().getProperty("DRIVE_SYNC_LAST_RUN");
    return lastRunStr ? new Date(lastRunStr) : null;
  } catch (e) {
    Logger.log("Error in getLastRunDate: " + e.message);
    return null;
  }
}

function saveLastRunDate() {
  try {
    const nowStr = new Date().toISOString();
    PropertiesService.getScriptProperties().setProperty("DRIVE_SYNC_LAST_RUN", nowStr);
  } catch (e) {
    Logger.log("Error in saveLastRunDate: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// בדיקת כפולים לפי שם קובץ בעמודה E
// ══════════════════════════════════════════════════════════════════

function preventDuplicates(fileName, mimeType, fileSize) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ניהול_מיילים");
    if (!sheet) return false;

    const data                = sheet.getDataRange().getValues();
    const fileNameColumnIndex = 4; // עמודה E

    for (let i = 1; i < data.length; i++) {
      if (data[i][fileNameColumnIndex] === fileName) return true;
    }
    return false;
  } catch (e) {
    Logger.log("Error in preventDuplicates: " + e.message);
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════
// סנכרון Drive — גרסת PROD
// ══════════════════════════════════════════════════════════════════

function syncDriveFiles() {
  const folderId  = "1ZT-C06MdkuVGSZrpAQdp7kzXD68d2VqN";
  const sheetName = "ניהול_מיילים";
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const sheet     = ss.getSheetByName(sheetName);

  if (!sheet) {
    SpreadsheetApp.getUi().alert("שגיאה: הגליון '" + sheetName + "' לא נמצא.");
    return;
  }

  const lastRun = getLastRunDate();
  const folder  = DriveApp.getFolderById(folderId);
  const files   = folder.getFiles();
  let addedCount = 0;

  while (files.hasNext()) {
    const file            = files.next();
    const lastUpdatedDate = file.getLastUpdated();

    if (lastRun && lastUpdatedDate <= lastRun) continue;

    const name           = file.getName();
    const mime           = file.getMimeType();
    const size           = file.getSize();
    const lastUpdatedStr = Utilities.formatDate(lastUpdatedDate, "GMT+3", "dd/MM/yyyy");
    const id             = file.getId();
    const now            = Utilities.formatDate(new Date(), "GMT+3", "dd/MM/yyyy");

    if (!preventDuplicates(name, mime, size)) {
      sheet.appendRow([id, now, "Drive_Manual", "N/A", name, "עמוס ידני", lastUpdatedStr, name]);
      addedCount++;
    }
  }

  const currentRunTime = Utilities.formatDate(new Date(), "GMT+3", "dd/MM/yyyy HH:mm");
  saveLastRunDate();
  SpreadsheetApp.getUi().alert(
    "הסנכרון הושלם.\nנוספו " + addedCount + " קבצים חדשים.\nסריקה הבאה תתחיל מ-" + currentRunTime
  );
}

// ══════════════════════════════════════════════════════════════════
// סנכרון Drive — גרסת LAB (עם לוגים מפורטים)
// ══════════════════════════════════════════════════════════════════

function syncDriveFiles_LAB() {
  Logger.log("--- התחלת ריצת סנכרון LAB ---");

  const folderId  = "1ZT-C06MdkuVGSZrpAQdp7kzXD68d2VqN";
  const sheetName = "ניהול_מיילים";
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const sheet     = ss.getSheetByName(sheetName);

  const lastRun = getLastRunDate();
  Logger.log("תאריך סריקה אחרונה: " + (lastRun ? lastRun.toISOString() : "מעולם לא הורץ"));

  if (!sheet) {
    Logger.log("שגיאה קריטית: הגליון לא נמצא");
    return;
  }

  const folder         = DriveApp.getFolderById(folderId);
  const files          = folder.getFiles();
  let addedCount       = 0;
  let skippedCount     = 0;
  let oldFilesSkipped  = 0;

  while (files.hasNext()) {
    const file            = files.next();
    const name            = file.getName();
    const lastUpdatedDate = file.getLastUpdated();

    if (lastRun && lastUpdatedDate <= lastRun) {
      Logger.log("דולג — קובץ ישן: " + name);
      oldFilesSkipped++;
      continue;
    }

    const mime           = file.getMimeType();
    const size           = file.getSize();
    const lastUpdatedStr = Utilities.formatDate(lastUpdatedDate, "GMT+3", "dd/MM/yyyy");
    const id             = file.getId();
    const now            = Utilities.formatDate(new Date(), "GMT+3", "dd/MM/yyyy");

    Logger.log("בודק קובץ חדש/מעודכן: " + name);

    if (!preventDuplicates(name, mime, size)) {
      sheet.appendRow([id, now, "Drive_Manual", "N/A", name, "עמוס ידני", lastUpdatedStr, name]);
      addedCount++;
      Logger.log("סטטוס: חדש → נוסף לגליון");
    } else {
      skippedCount++;
      Logger.log("סטטוס: כפול → דולג");
    }
  }

  saveLastRunDate();
  Logger.log("--- סיום סנכרון LAB ---");
  Logger.log("סיכום: " + addedCount + " נוספו | " + skippedCount + " כפולים | " + oldFilesSkipped + " ישנים");

  ss.toast(
    "סנכרון LAB הסתיים. נוספו: " + addedCount + " | ישנים שדולגו: " + oldFilesSkipped,
    "סנכרון Drive"
  );
}