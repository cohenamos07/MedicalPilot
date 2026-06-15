/**
 * @file        Mod_Ingestion.gs
 * @version     97.10.1 | @updated 14/06/2026 22:07 | @service S03
 * @git         https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/Mod_Ingestion.gs
 * @description סריקת Gmail וקליטת קבצים מצורפים לגליון ניהול_מיילים.
 *              מסנן קבצי .gif ופורמטים לא נתמכים (גודל < 2500 בייט).
 *              שומר קובץ ל-Drive, כותב שורה לגליון, מסמן שרשור כנקרא.
 *              מופעל מאייקון Gmail בעמודה D או מתפריט — אינו אוטומטי.
 * @impacts     ניהול_מיילים:
 *              A=File_ID | B=Capture_Date | C=Source | D=Msg_ID | E=Subject
 *              F=From | G=Msg_Date | H=File_Name | W(23)=Source_URL
 *              קורא: Gmail API (label:Medical_To_Process, is:unread)
 *              כותב: Drive (GMAIL_INBOX_FOLDER_ID) + גליון ניהול_מיילים
 * @callers     runGmailIcon (ViewEngine עמודה D) | Menu_LAB | Menu_PROD
 * @functions   runMedicalProcess | runEmailIngestion
 *              Gmail_getExistingIds | Gmail_fetchThreads
 *              Gmail_isValidAttachment | Gmail_saveFileToDrive
 *              Gmail_writeRowToSheet
 * @changes     [v97.10.1] תיקון Tasks 6,7,8 — עדכון @git ל-GitHub API URL + הוספת @changes מלא
 *              [v97.10.0] תיקון Source_URL — כתיבה לעמודה 23 (W) במקום 15 (O)
 *                         תיקון בשתי פונקציות: Gmail_writeRowToSheet + runMedicalProcess
 *                         כותרת מורחבת לפי סטנדרט
 *              [v97.9.3]  הוספת @impacts וכותרת מלאה
 *              [v97.9.2]  סינון קבצי .gif
 */

const GMAIL_INBOX_FOLDER_ID = "1HSzOwL7YIzC8FvgGtuxCKYzfKk0RsHO5";

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
      const _name = att.getName().toLowerCase();
      const _isGif = _name.endsWith('.gif') || att.getContentType() === 'image/gif';
      if (!_isGif && att.getSize() > 2500) {
        const driveFile = DriveApp.getFolderById(GMAIL_INBOX_FOLDER_ID).createFile(att);
        const fileId = driveFile.getId();
        if (existingIds.indexOf(fileId) === -1) {
          sheet.appendRow([
            fileId, new Date(), "Gmail",
            lastMsg.getId().substring(0,10), lastMsg.getSubject(),
            lastMsg.getFrom(), lastMsg.getDate(), att.getName(),
            "", "", "", "", "", "", "", "", "", "", "", "", "", "",
            driveFile.getUrl()
          ]);
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
    const name = att.getName().toLowerCase();
    if (name.endsWith('.gif') || att.getContentType() === 'image/gif') return false;
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
    sheet.appendRow([
      rowData.fileId, rowData.date, rowData.source,
      rowData.msgId, rowData.subject, rowData.from,
      rowData.msgDate, rowData.fileName,
      "", "", "", "", "", "", "", "", "", "", "", "", "", "",
      rowData.fileUrl
    ]);
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