function testEditorApiCall() {
  const DEV_SYNC_SCRIPT_ID = "1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf";
  const url = "https://script.googleapis.com/v1/projects/" + DEV_SYNC_SCRIPT_ID + "/content";
  const response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  Logger.log("קוד תגובה: " + response.getResponseCode());
  Logger.log("תוכן: " + response.getContentText().substring(0, 300));
}
function testEditorFilesTypes() {
  const DEV_SYNC_SCRIPT_ID = "1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf";
  const url = "https://script.googleapis.com/v1/projects/" + DEV_SYNC_SCRIPT_ID + "/content";
  const response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  const data = JSON.parse(response.getContentText());
  const files = data.files || [];
  Logger.log("סה\"כ קבצים: " + files.length);
  files.forEach(function(f) {
    Logger.log("שם: " + f.name + " | סוג: " + f.type);
  });
}