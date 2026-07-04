function AAA_FORCE_OAUTH_PROMPT_ONCE() {
  // קוד זמני לאילוץ חלון הרשאות Drive ו-Sheets
  var testFolder = DriveApp.getRootFolder();
  Logger.log("הגישה לדרייב אושרה בהצלחה: " + testFolder.getName());
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log("הגישה לגיליון אושרה בהצלחה: " + ss.getName());
}