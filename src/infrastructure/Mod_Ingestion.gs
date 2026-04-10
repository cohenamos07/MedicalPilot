/**
 * MedicalPilot — Mod_Ingestion.gs
 * שירות S03 — סריקת Gmail וקליטת קבצים
 * @version 97.8 | @updated 10/04/2026 | @service S03
 */

const GMAIL_INBOX_FOLDER_ID = "1ZT-C06MdkuVGSZrpAQdp7kzXD68d2VqN";

function runMedicalProcess() {
  const SHEET_NAME = 'ניהול_מיילים';
  const LABEL_NAME = "Medical_To_Process";
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const existingIds = sheet.getRange("A:A").getValues().flat();
  const threads = GmailApp.search('label:' + LABEL_NAME + ' is:unread');
  let count = 0;
  threads.forEach((thread) => {
    const lastMsg = thread.getMessages().pop();
    lastMsg.getAttachments().forEach((att) => {
      if (att.getSize() > 2500) {
        const driveFile = DriveApp.getFolderById(GMAIL_INBOX_FOLDER_ID).createFile(att);
        const fileId = driveFile.getId();
        if (existingIds.indexOf(fileId) === -1) {
          sheet.appendRow([fileId, new Date(), "Gmail", lastMsg.getId().substring(0,10), lastMsg.getSubject(), lastMsg.getFrom(), lastMsg.getDate(), att.getName(), "", "", "", "", "", "", driveFile.getUrl()]);
          count++;
        } else { driveFile.setTrashed(true); }
      }
    });
    thread.markRead();
  });
  return count;
}

function Gmail_getExistingIds(sheet) {
  try {
    const values = sheet.getRange("A:A").getValues().flat();
    return values.filter(id => id !== "" && id !== null);
  } catch (e) {
    Logger.log("Error in Gmail_getExistingIds: " + e.message);
    return [];
  }
}

function Gmail_fetchThreads(labelName) {
  try {
    const threads = GmailApp.search('label:' + labelName + ' is:unread');
    Logger.log("Gmail_fetchThreads: נמצאו " + threads.length + " שרשורים");
    return threads;
  } catch (e) {
    Logger.log("Error in Gmail_fetchThreads: " + e.message);
    return [];
  }
}

function Gmail_isValidAttachment(att) {
  try {
    return att.getSize() > 2500;
  } catch (e) {
    Logger.log("Error in Gmail_isValidAttachment: " + e.message);
    return false;
  }
}

function Gmail_saveFileToDrive(att) {
  try {
    const folder = DriveApp.getFolderById(GMAIL_INBOX_FOLDER_ID);
    const file = folder.createFile(att);
    Logger.log("Gmail_saveFileToDrive: קובץ נשמר - " + file.getId());
    return { fileId: file.getId(), fileUrl: file.getUrl(), file: file };
  } catch (e) {
    Logger.log("Error in Gmail_saveFileToDrive: " + e.message);
    return null;
  }
}

function Gmail_writeRowToSheet(sheet, rowData) {
  try {
    sheet.appendRow([rowData.fileId, rowData.date, rowData.source, rowData.msgId, rowData.subject, rowData.from, rowData.msgDate, rowData.fileName, "", "", "", "", "", "", rowData.fileUrl]);
    return true;
  } catch (e) {
    Logger.log("Error in Gmail_writeRowToSheet: " + e.message);
    return false;
  }
}

function runEmailIngestion() {
  try {
    const SHEET_NAME = 'ניהול_מיילים';
    const LABEL_NAME = "Medical_To_Process";
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    const existingIds = Gmail_getExistingIds(sheet);
    const threads = Gmail_fetchThreads(LABEL_NAME);
    let count = 0;
    threads.forEach(thread => {
      const lastMsg = thread.getMessages().pop();
      lastMsg.getAttachments().forEach(att => {
        if (Gmail_isValidAttachment(att)) {
          const driveData = Gmail_saveFileToDrive(att);
          if (driveData && existingIds.indexOf(driveData.fileId) === -1) {
            const rowData = {
              fileId: driveData.fileId, date: new Date(), source: "Gmail",
              msgId: lastMsg.getId().substring(0, 10), subject: lastMsg.getSubject(),
              from: lastMsg.getFrom(), msgDate: lastMsg.getDate(),
              fileName: att.getName(), fileUrl: driveData.fileUrl
            };
            if (Gmail_writeRowToSheet(sheet, rowData)) { count++; }
          } else if (driveData) { driveData.file.setTrashed(true); }
        }
      });
      thread.markRead();
    });
    SpreadsheetApp.getUi().alert("סריקה הושלמה: נקלטו " + count + " קבצים חדשים");
    return count;
  } catch (e) {
    Logger.log("Error in runEmailIngestion: " + e.message);
    SpreadsheetApp.getUi().alert("שגיאה: " + e.message);
    return 0;
  }
}