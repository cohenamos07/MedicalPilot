# MedicalPilot — CONTEXT
עדכון אחרון: 24/04/2026 17:15

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
- אינדקס: https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/INDEX.md

## מצב המערכת
- גרסה: v98.0
- פלטפורמה: Google Apps Script + Google Sheets + Google Drive + Gemini API

## 15 שירותים
| מזהה | שם שירות | קובץ | סטטוס | הערה |
| :--- | :--- | :--- | :--- | :--- |
| S01 | בדיקת בוקר טוב | System_HealthCheck.gs | פעיל |  |
| S02 | הרשאות גישה | S02_Auth.gs | אזהרה | לא מחובר לתפריט |
| S03 | סריקת Gmail | Mod_Ingestion.gs | פעיל חלקית |  |
| S04 | סריקת Drive | Service_Folders.gs | פעיל חלקית |  |
| S05 | חילוץ מטא-דאטה | AI_Parser_Utility.gs | אזהרה | נכשל בקבצים כבדים |
| S06 | הכנה ל-OCR | Mod_Brain_OCR.gs | מעבדה | Prompt מתבלבל |
| S07 | סיווג מסמכים | AI_Header_Extractor.gs | שגיאה | לא שומר תיקונים |
| S08 | אימות ידני | Sidebar.html | אזהרה |  |
| S09 | חילוץ שדות | Lab_Extractor.gs | פעיל |  |
| S10 | סנכרון GitHub | GitHubSync.gs | פעיל |  |
| S11 | ניהול לוגים | System_Logger.gs | תוקן | פורק לפונקציות מינימליות |
| S12 | משימות פיתוח | DevManagement.gs | פעיל |  |
| S13 | אבחון AI | Check_Models.gs | פעיל |  |
| S14 | הגדרות תשתית | appsscript.json | פעיל |  |
| S15 | בדיקות QA | טסטים_ניסוייה.gs | חלקי | מכסה 30% בלבד |

## בעיות קריטיות
- System_Logger.gs תלוי שורה 6 — אסור לגעת במבנה הגיליון

## משימה הבאה
בניית INDEX.md בגיטהאב + המשך תיעוד 15 שירותים

## כלל הזהב
- לפני כל שינוי — גיבוי ידני ב-Apps Script
- אף פונקציה לא נמחקת — רק מוסיפים
- Claude = ארכיטקט, Gemini = כותב קוד, עמוס = מאשר ומפרס

## איך לפתוח שיחה חדשה
כתוב: "אני עמוס. ממשיכים MedicalPilot."
קישור אינדקס: https://raw.githubusercontent.com/cohenamos07/MedicalPilot/main/INDEX.md
