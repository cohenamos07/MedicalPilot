# MedicalPilot — CONTEXT
עדכון אחרון: 07/04/2026 14:52

## פרטי משתמש
- שם: עמוס כהן
- אינו מתכנת — קוד מלא בלבד בתיבת העתקה
- מוגבל ביד ימין — כל טקסט וקוד בתיבת העתקה
- שפה: עברית בלבד
- שיטת עדכון קוד: Ctrl+A → Delete → Ctrl+V → Ctrl+S
- סוכן כתיבה: Gemini — Claude מכין פרומפט, Gemini כותב, Claude מאשר

## קישורים קריטיים
- גיליון: https://docs.google.com/spreadsheets/d/1uYnt-wleYpuk1ZrX7fTn2HDZ12PNWBEFRDGqHQN_U4I
- עורך: https://script.google.com/u/0/home/projects/1mTd19xr7KOg71KyL33YoGZawMS1Cfh_xtvMJnbcZjyJQJIyvyuYKDqgf
- גיטהאב: https://github.com/cohenamos07/MedicalPilot

## מצב המערכת
- גרסה: v97.5
- פלטפורמה: Google Apps Script + Google Sheets + Google Drive + Gemini API

## 15 שירותים
| מזהה | שם שירות | קובץ | סטטוס | הערה |
| :--- | :--- | :--- | :--- | :--- |
| S01 | בדיקת בוקר טוב | S01_HealthCheck.gs | פעיל |  |
| S02 | הרשאות גישה | S02_Auth.gs | אזהרה | קוד קיים בגרסה ישנה, לא מחובר לתפריט |
| S03 | סריקת Gmail | S03_MailScanner.gs | פעיל |  |
| S04 | סריקת Drive | S04_DriveSync.gs | פעיל |  |
| S05 | חילוץ מטא-דאטה | S05_MetaExtract.gs | אזהרה | נכשל בקבצים כבדים |
| S06 | הכנה ל-OCR | S06_OCR.gs | מעבדה | Prompt מתבלבל |
| S07 | סיווג מסמכים | S07_Classifier.gs | שגיאה | לא שומר תיקונים ידניים |
| S08 | אימות ידני ולמידה | S08_ManualReview.gs | אזהרה |  |
| S09 | חילוץ שדות מלא | S09_FieldExtract.gs | פעיל |  |
| S10 | סנכרון GitHub | S10_GitHubSync.gs | פעיל |  |
| S11 | ניהול לוגים | S11_Logger.gs | תוקן | פורק לפונקציות מינימליות 07/04/2026 |
| S12 | משימות פיתוח | S12_TaskManager.gs | פעיל |  |
| S13 | אבחון AI | S13_AIDiag.gs | פעיל |  |
| S14 | הגדרות תשתית | S14_Config.gs | פעיל |  |
| S15 | בדיקות QA | S15_QA.gs | חלקי | מכסה 30% בלבד |

## בעיות קריטיות
- System_Logger.gs תלוי שורה 6 — אסור לגעת במבנה הגיליון
- S07 מתבלבל בין מסמכים רפואיים לחשבונאיים
- גיליונות דוגמאות_למידה ויומן_אירועים_רפואי ריקים

## משימה הבאה
בניית פונקציית סנכרון אוטומטי לגיטהאב — העלאת כל קבצי הקוד בלחיצת כפתור

## כלל הזהב
- לפני כל שינוי — גיבוי ידני ב-Apps Script
- אף פונקציה לא נמחקת — רק מוסיפים
- Claude = ארכיטקט, Gemini = כותב קוד, עמוס = מאשר ומפרס

## איך לפתוח שיחה חדשה
כתוב: "אני עמוס. ממשיכים MedicalPilot."
