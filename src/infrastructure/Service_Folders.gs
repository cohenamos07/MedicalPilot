/**
 * MedicalPilot — Service_Folders.gs
 * @version 1.2.0 | @updated 05/05/2026 19:35 | @service INFRA
 * @git https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/src/infrastructure/Service_Folders.gs
 * שינוי: [FIX-1] כותרת תקנית לסטנדרט המערכת
 */

// ══════════════════════════════════════════════════════════════════
// שירות תיקיות — סריקת שורש Drive והחזרת רשימת תיקיות + קבצים
// ══════════════════════════════════════════════════════════════════

/**
 * פונקציה זו סורקת את ספריית השורש של Google Drive
 * ומחזירה מערך של כל הספריות + רשימת הקבצים בכל אחת.
 *
 * עקרונות מערכת:
 * ✔ עבודה בפרוסות – פונקציה עצמאית, לא תלויה בקוד אחר
 * ✔ תיעוד מלא – גרסה, תאריך, הסבר
 * ✔ מיועדת לשימוש ע"י פונקציות LAB וייצור
 * ✔ לא מבצעת לוגיקה עסקית – רק שירות
 *
 * מחזירה:
 * [{ name: "שם ספרייה", id: "מזהה", files: [File, File, ...] }, ...]
 *
 * בדיקת תקינות:
 * בעת הרצה יש לכתוב לוג עם מספר הספריות שנמצאו.
 *
 * @return {Array} מערך אובייקטי ספריות
 */
function getProjectFolders() {
  // שלב 1: קבלת ספריית השורש
  const root = DriveApp.getRootFolder();

  // שלב 2: יצירת מערך תוצאות
  const folders = [];

  // שלב 3: מעבר על כל הספריות בשורש
  const iterator = root.getFolders();
  while (iterator.hasNext()) {
    const folder = iterator.next();
    const files  = [];

    // שלב 4: איסוף כל הקבצים בתוך הספרייה
    const fileIterator = folder.getFiles();
    while (fileIterator.hasNext()) {
      files.push(fileIterator.next());
    }

    // שלב 5: הוספת הספרייה למערך התוצאות
    folders.push({
      name:  folder.getName(),
      id:    folder.getId(),
      files: files
    });
  }

  // שלב 6: לוג בדיקה
  Logger.log("נמצאו " + folders.length + " ספריות בדרייב.");

  // שלב 7: החזרת התוצאה
  return folders;
}