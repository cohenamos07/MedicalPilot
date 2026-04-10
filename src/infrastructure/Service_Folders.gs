/**
 * MedicalPilot — Service_Folders.gs
 * שירות S04 — סריקת Drive וניהול ספריות
 * @version 97.7 | @updated 10/04/2026 | @service S04
 */

/**
 * פונקציה: getProjectFolders
 * גרסה: 1.1 | תאריך: 30-03-2026
 * מחזירה מערך של כל הספריות בשורש הדרייב + קבציהן.
 */
function getProjectFolders() {
  const root = DriveApp.getRootFolder();
  const folders = [];
  const iterator = root.getFolders();

  while (iterator.hasNext()) {
    const folder = iterator.next();
    const files = [];
    const fileIterator = folder.getFiles();
    while (fileIterator.hasNext()) {
      files.push(fileIterator.next());
    }
    folders.push({
      name: folder.getName(),
      id: folder.getId(),
      files: files
    });
  }

  Logger.log("נמצאו " + folders.length + " ספריות בדרייב.");
  return folders;
}
