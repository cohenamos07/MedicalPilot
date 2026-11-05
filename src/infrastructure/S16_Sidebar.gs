<!--
  MedicalPilot — S16_Sidebar.html
  @version     2.11.0 | @updated 03/11/2026 12:44 | @service S16
  @git         https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/S16_Sidebar.html
  @description ממשק Dialog לאימות כל קודי הסיווג ביומן_מצב_רפואי (21 עמודות):
               קוד מערכת גוף (select סגור), קוד אירוע/התמחות/חומרה/אבחנה
               (קטלוג פתוח משותף — select + הוספת קוד חדש לכל שדה בנפרד),
               וודאות אבחנה (select סגור פשוט). פריסת שתי עמודות כמו
               S10_Sidebar.html: ימין — שדות אימות, שמאל — Event_Date/
               Doc_Issuer + תצוגת מסמך מקור (הוקטן על חשבון המעבר של שני
               השדות האלה לכאן, לפי החלטת 15/09/2026).
               [v2.1.0] select של שדה קטלוג מוצג בקיבוץ היררכי: קוד שקיים
               קוד ארוך ממנו שמתחיל בו (A0-A4 בבלוק אירועים) מוצג ככותרת
               קבוצה שאינה ניתנת לבחירה, וקודי-העלה שלו תחתיה.
               [v2.2.0] שדה בחירה "איבר (אופציונלי)" מתחת לקוד מערכת הגוף —
               תת-קודי איבר (Organ_Code) של המערכת הנבחרת בלבד.
               [v2.3.0] הצעות אוטומטיות מסומנות מראש (כתום, "יש לאמת"),
               שדה המלצה לעריכה בעמודה השמאלית, ותצוגה קומפקטית ללא גלילה.
               [v2.4.0] תגית "🤖 Gemini — לאמת" לקודים שנכתבו ע"י S13 בשורה
               בסטטוס "חדש" (בשורת הכותרת), ו-"+ קוד חדש" גם לוודאות אבחנה.
               [v2.5.0] שני select זה לצד זה מתחת לאיבר — "מצב האיבר" ו"צד" —
               רק בשורת ניתוח או כשכבר שמור ערך (payload.organState.show).
               [v2.6.0] מצב תרופות (payload.mode="medication", מ-S15): אותו
               חלון מציג שורה מגליון תרופות_קבועות — נתוני המסמך (תצוגה), קוד
               ATC + נתוני קטלוג (נעולים כשהקוד מאומת), מינון ותדירות, סוג
               טיפול (חובה) וסיבה; שמאל — מטא-דאטה ותצוגת מסמך מקור.
               [v2.7.0] מצב הנחיות (payload.mode="instruction", מ-S15): אותו
               חלון מציג שורה מגליון הנחיות_רפואיות_ומשימות — ההנחיה במסמך
               (תצוגה), סוג (רשימה סגורה, בלי "+ קוד חדש"), אופי, קוד יעד
               (התמחויות / תרופות), מערכת גוף, סטטוס ותאריך יעד; שמאל —
               מטא-דאטה ותצוגת מסמך מקור.
               [v2.8.0] אזור "⚠️ רגישות / אלרגיה" אחרי אזור המערכת והאיבר —
               חומר גורם (select סגור מקטלוג התרופות, קוד ATC) ותגובה (טקסט), רק
               בשורת רגישות (קוד A7) או כשכבר שמור ערך (payload.allergy.show).
               [v2.9.0] מצב מעבדה (payload.mode="lab", מ-S15): אותו חלון מציג
               שורה מגליון בדיקות_דם — הבדיקה במסמך (תצוגה), קוד LOINC ונתוני
               קטלוג (שם, תיאור, מערכת גוף, שמות במסמכים), פאנל (חובה, רשימה
               סגורה), ערך מספרי, יחידה וגבולות טווח; שמאל — מטא-דאטה ותצוגת
               מסמך מקור. התראה אדומה, לא חוסמת, כשהקוד כבר משויך לבדיקה אחרת.
               [v2.10.0] מצב גנטיקה (payload.mode="gen", מ-S15): אותו חלון מציג
               שורה מגליון בדיקות_גנטיות — התכונה במסמך (תצוגה, כולל הנטייה), קוד
               תכונה (בחירה מהקודים המוכרים בלבד; שם, תיאור ומערכת מתעדכנים לפי
               הקוד ונעולים כשהוא מאומת), פאנל (חובה, PNL-G), ומקטע גן רק כשיש
               בשורה גן/וריאנט/גנוטיפ/סיווג; שמאל — renderLabLeftCol. אחרי אישור —
               מעבר אוטומטי לשורה הבאה (במצב גנטיקה בלבד).
               [v2.11.0] שדות השמות בקטלוג (שמות במסמכים / שמות מסחריים) — תצוגה
               בלבד; ברשימת קודי הגנטיקה הסימון ✅/🤖 לפני הקוד; הודעת הסטטוס
               מתנקה במעבר ידני בין שורות.
  @impacts     כפתורים: אשר, הוסף-קוד (4, אחד לכל שדה קטלוג פתוח), ניווט
               הקודם/הבא. תלוי ב: S16_ValidateMedicalStatus.gs — כל
               הלוגיקה מתבצעת שם.
               [v2.1.0] שינוי תצוגה בלבד (renderCodeFieldHtml) — אין שינוי
               בערכים שנשלחים ל-s16_approve ואין שינוי בצד השרת.
               [v2.2.0] s16_approve מקבל פרמטר חמישי — קוד האיבר הנבחר.
               [v2.3.0] s16_approve מקבל פרמטר שישי — המלצה (null אם לא שונתה).
               [v2.4.0] כפתורי הוסף-קוד: 5 (נוספה וודאות — key="certainty").
               אין שינוי בפרמטרים של s16_approve.
               [v2.5.0] s16_approve מקבל פרמטרים 7-8 — מצב וצד איבר (null אם
               השדות לא הוצגו בחלון — לא נכתבים בצד השרת).
               [v2.6.0] במצב תרופות: ניווט וטעינה מחדש — s15_loadRowByNumber,
               אישור — s15_approve(row, v) עם 11 שדות (S15_EnrichCatalog.gs).
               מצב המצב הרפואי — ללא שינוי (s16_loadRowByNumber / s16_approve).
               [v2.7.0] במצב הנחיות: ניווט וטעינה מחדש — s15_instrLoadRowByNumber,
               אישור — s15_instrApprove(row, v) עם 6 שדות (S15_EnrichCatalog.gs).
               מצב התרופות ומצב המצב הרפואי — ללא שינוי.
               [v2.8.0] s16_approve מקבל פרמטרים 9-10 — חומר גורם ותגובה (null אם
               השדות לא הוצגו בחלון — לא נכתבים בצד השרת).
               [v2.9.0] במצב מעבדה: ניווט וטעינה מחדש — s15_labLoadRowByNumber,
               אישור — s15_labApprove(row, v) (S15_EnrichCatalog.gs). מצבי
               התרופות, ההנחיות והמצב הרפואי — ללא שינוי.
               [v2.10.0] במצב גנטיקה: ניווט — s15_genLoadRowByNumber, אישור —
               s15_genApprove(row, v) עם 8 שדות (S15_EnrichCatalog.gs); שמות
               המסמכים לא נשלחים מהחלון (לקח #266). אחרי אישור מוצלח נטענת השורה
               הבאה. מצבי התרופות, ההנחיות, המעבדה והמצב הרפואי — ללא שינוי.
               [v2.11.0] שדות labRawNames / medTradeNames נעולים (disabled) — בקוד
               מאומת מוצגים שמות הקטלוג, אחרת השם בשורה; הערכים עדיין נשלחים אך
               השרת מתעלם מהם (S15 v1.8.0). אין שינוי בפרמטרים לשרת.
  @callers     S16_ValidateMedicalStatus.gs (showS16Sidebar)
               S15_EnrichCatalog.gs (s15_showValidation — מצב תרופות)
               S15_EnrichCatalog.gs (s15_showValidation — מצב הנחיות, [v2.7.0])
               S15_EnrichCatalog.gs (s15_showValidation — מצב מעבדה, [v2.9.0])
               S15_EnrichCatalog.gs (s15_showValidation — מצב גנטיקה, [v2.10.0])
  @functions   initUI, render, renderCodeFieldHtml, esc, prevRow, nextRow,
               doApprove, doSaveCatalogCode, handleResult, handleError,
               fillOrganOptions, suggestionHintHtml, toggleNewCode, geminiHintHtml,
               organStateHtml, renderMedication, doApproveMedication,
               renderInstruction, updateInstrKindHint, doApproveInstruction, allergyHtml,
               renderLab, renderLabLeftCol, updateLabCodeHint, doApproveLab,
               renderGen, onGenCodeChange, updateGenCodeHint, doApproveGen
               clearStatusMsg
  @changes     [v2.11.0] Task #266 + Task #229 + Task #258 — (1) #266: renderLab ו-
               renderMedication — שדה השמות (labRawNames / medTradeNames) הפך לתצוגה
               בלבד: נעול תמיד, ומציג את שמות הקטלוג בקוד מאומת או את השם בשורה —
               מה שהשרת שומר בפועל בקוד חדש (S15 v1.8.0). קודם השדה נשאר עם שמות
               ההצעה של הקוד הקודם אחרי החלפת קוד, ונכתב לקטלוג. (2) #229: renderGen
               — ברשימת "קוד תכונה" הסימון ✅ (מאומת) / 🤖 (ממתין) עבר לפני הקוד,
               כדי שלא ייחתך בשם ארוך. (3) #258: פונקציה חדשה clearStatusMsg, נקראת
               בתחילת prevRow ו-nextRow — הודעת השורה הקודמת לא נשארת במעבר ידני;
               אחרי אישור עם מעבר אוטומטי (גנטיקה) ההודעה נשארת בכוונה. אומת מול
               הקוד החי (diff מדויק לכל בלוק, node --check לבלוק הסקריפט) ובבדיקה
               פונקציונלית של חמשת החלונות.
  @changes     [v2.10.0] Task #264 שלב 4 — מצב גנטיקה בחלון הקיים (בלי חלון
               חדש, תוספת בלבד). render: מעבר ל-renderGen כש-payload.mode="gen".
               renderGen (חדשה): כותרת "🧬 S15 — אימות גנטיקה", התכונה במסמך
               (תצוגה, כולל הנטייה), קוד תכונה (select מהקודים המוכרים, מאומת
               / ממתין), שם אחיד, תיאור, מערכת גוף, פאנל (חובה) ומקטע גן מותנה.
               onGenCodeChange (חדשה): מילוי ונעילה לפי הקוד שנבחר.
               updateGenCodeHint (חדשה): התראה אדומה, לא חוסמת, כשהקוד משויך
               לשמות אחרים. doApproveGen (חדשה): בדיקת קוד ופאנל ושליחה ל-
               s15_genApprove. prevRow/nextRow — טעינה דרך s15_genLoadRowByNumber;
               doApprove — מעבר ל-doApproveGen; handleResult — מעבר אוטומטי לשורה
               הבאה במצב גנטיקה. אומת מול הקוד החי (diff מדויק אחרי כל בלוק,
               בדיקת תחביר לסקריפט), בהרצה מדומה ובבדיקת שטח: שורות 5-6 אושרו
               עם מעבר אוטומטי, פאנל ריק נחסם, קוד מאומת ננעל עם התראת שם אחר;
               חלונות המעבדה, ההנחיות והמצב הרפואי ללא שינוי.
  @changes     [v2.9.0] Task #263 שלב 5 — מצב מעבדה בחלון הקיים (בלי חלון
               חדש, תוספת בלבד). render: מעבר ל-renderLab כש-payload.mode=
               "lab". renderLab (חדשה): כותרת "🧪 S15 — אימות מעבדה ומדדים",
               שורה + שם הבדיקה, תג Enrich_Status; הבדיקה במסמך (תצוגה, סוג
               דגימה — תצוגה בלבד); קוד LOINC — מאומת בקטלוג / הצעת Gemini
               (כתום) / ללא הצעה; פאנל (חובה) ומערכת גוף; ערך, יחידה וגבולות
               ניתנים לעריכה. renderLabLeftCol (חדשה): מטא-דאטה ותצוגת מסמך
               מקור. updateLabCodeHint (חדשה): התראה אדומה, לא חוסמת, כשהקוד
               כבר משויך לבדיקה אחרת בקטלוג. doApproveLab (חדשה): בדיקת פאנל
               בצד הלקוח ושליחה ל-s15_labApprove. prevRow/nextRow/handleResult —
               טעינה דרך s15_labLoadRowByNumber; doApprove — מעבר ל-doApproveLab.
               אומת מול הקוד החי (diff, בדיקת תחביר לסקריפט) ובבדיקת שטח: ניווט
               שורות 5↔6, התראת קוד כפול (777-3 → NEUT%, PLT), פאנל ריק נחסם
               ("❌ יש לבחור פאנל מהרשימה"), שורות 5 ו-6 אושרו; חלונות התרופות
               וההנחיות ללא שינוי.
  @changes     [v2.8.0] Task #262 — רגישות/אלרגיה במצב המצב הרפואי. allergyHtml
               (חדשה): אזור "⚠️ רגישות / אלרגיה" עם select סגור של חומר גורם
               (קטלוג התרופות, הצעה נבחרת מראש רק כשהשדה ריק), תיבת תגובה ותגית
               Gemini, באותה תבנית של organStateHtml. render: האזור מוצג אחרי אזור
               המערכת והאיבר. doApprove: קורא allergenSelect/reactionInput אם קיימים
               (אחרת null) ושולח כפרמטרים 9-10 ל-s16_approve. מצבי התרופות
               וההנחיות ללא שינוי. אומת מול הקוד החי (diff, בדיקת תחביר לסקריפט)
               ובבדיקת שטח: שורות 13 ו-5 ללא אזור רגישות; שורה 28 הציגה C10AA01
               ו"כאבי שרירים" ואושרה.
  @changes     [v2.7.0] Task #261 שלב 4 — מצב הנחיות בחלון הקיים (בלי חלון
               חדש). render: מעבר ל-renderInstruction כש-payload.mode=
               "instruction". renderInstruction (חדשה): כותרת "📋 S15 — אימות
               הנחיות", שורה + תיאור, תג Enrich_Status, רמז כתום "הוצע בהעשרה —
               יש לאמת", קוד יעד בקבוצות (optgroup). updateInstrKindHint (חדשה):
               ברירת המחדל של האופי לפי הסוג. doApproveInstruction (חדשה): בדיקת
               שדות חובה ושליחה ל-s15_instrApprove. prevRow/nextRow/handleResult —
               טעינה דרך s15_instrLoadRowByNumber; doApprove — מעבר
               ל-doApproveInstruction. אומת מול הקוד החי (diff, בדיקת תחביר
               לסקריפט), בהדמיה, ובבדיקת שטח: שורות 6 ו-8 אושרו, תאריך שגוי
               נדחה, חלונות התרופות והמצב הרפואי ללא שינוי.
  @changes     [v2.6.0] Task #256 שלב 4 — מצב תרופות בחלון הקיים (בלי חלון
               חדש). render: אחרי שמירת currentPayload — מעבר ל-renderMedication
               כש-payload.mode="medication". renderMedication (חדשה): כותרת
               "💊 S15 — אימות תרופות", שורה + שם התרופה, תג Enrich_Status;
               מקור הקוד — מאומת (ירוק, שדות קטלוג נעולים) / הצעת Gemini
               (כתום) / ללא הצעה; סוג טיפול — הצעה נבחרת מראש רק כשהשדה ריק.
               doApproveMedication (חדשה): בדיקת סוג טיפול בצד הלקוח ושליחה
               ל-s15_approve. prevRow/nextRow/handleResult — טעינה דרך S15
               במצב תרופות; doApprove — מעבר ל-doApproveMedication. אומת מול
               הקוד החי (diff מדויק, בדיקת תחביר לסקריפט), בהדמיית דפדפן בגובה
               700 (583/583 — ללא גלילה), ובבדיקת שטח: תרופות_קבועות שורה 5
               אושרה (D07AC13, "לפי הצורך"), מעבר לשורה 6, ומסך יומן_מצב_רפואי
               שורה 7 ללא שינוי.
  @changes     [v2.5.0] Task #224 (שלב 3) — מצב וצד איבר אחרי ניתוח.
               organStateHtml (חדשה): שני select סגורים ("— לא צוין —" +
               אפשרויות הקטלוג) בשורה אחת (flex) מתחת ל-organHint, בתוך מקטע
               קוד מערכת הגוף — בלי תוספת גלילה. הצעה נבחרת מראש רק כשהשדה ריק
               (suggestionHintHtml הקיימת); סתירת צד (sideConflict) — אזהרה
               אדומה "בטקסט מופיעים גם X וגם Y — יש לבדוק במסמך המקור", בלי
               הצעה. render: קריאה אחת ל-organStateHtml. doApprove: קורא את
               organStateSelect/organSideSelect אם קיימים (אחרת null) ושולח
               כפרמטרים 7-8. אומת מול הקוד החי (diff מדויק לכל בלוק, node
               --check על בלוק הסקריפט), בסימולציה של מקרה סתירת צד, ובבדיקת
               שטח: שורה 8 — ללא שדות; שורה 12 (ניתוח) — השדות הוצגו, באישור
               נכתבו OST1/LAT2.
  @changes     [v2.4.0] Task #220 שלב ב — סימון קודים מ-Gemini + קוד חדש לוודאות.
               geminiHintHtml (חדשה): תגית כתומה "🤖 Gemini — לאמת" (span
               בשורת הכותרת, בלי תוספת גובה) לכל שדה שיש בו קוד כשהרשומה
               בסטטוס "חדש" (payload.recordStatus) — מערכת, קוד אירוע,
               התמחות, חומרה, אבחנה, ודאות; באיבר — בתווית (organGemini)
               רק כל עוד האיבר השמור נבחר ושייך למערכת. רמזי ההצעה הקיימים
               (suggestionHintHtml) נשמרו כחוות דעת שנייה. ודאות: מבנה זהה
               לשדות הקטלוג — section-head עם "+ קוד חדש" ושורת הזנה
               מקופלת (newBox_certainty); doSaveCatalogCode — ברירת מחדל
               לוודאות (תווית קבועה, rawText ריק). אומת מול הקוד החי (diff
               מדויק), בהדמיית דפדפן בגובה 700 (585/585 — ללא גלילה, 6
               תגיות ב"חדש", 0 ב"מאומת"), ובבדיקת שטח: שורה 9 ביומן_מצב_
               רפואי וקוד ניסיון CRT9 שנכתב לקטלוג ונמחק.
  @changes     [v2.3.0] Task #220 שלב א' — הצעות אוטומטיות + המלצה + תצוגה
               קומפקטית. renderCodeFieldHtml: בחירה מראש של field.suggestion
               רק כשאין קוד שמור (selectedCode), כולל קוד כותרת-קטגוריה.
               suggestionHintHtml (חדשה): רמז כתום מודגש "🤖 הוצע אוטומטית —
               יש לאמת (לפי "מילה")" כשנבחר מראש, אחרת רמז אפור "הצעה
               מהקטלוג" (+ טקסט נוסף, למשל איבר ששייך למערכת אחרת). ודאות:
               בחירה מראש של certaintySuggestion כשהשדה ריק. איבר:
               fillOrganOptions מציג organHint; הצעה נבחרת מראש רק כשהיא
               שייכת למערכת הנבחרת (גם אחרי החלפת מערכת). המלצה: textarea
               (recoInput) בעמודה השמאלית מעל תצוגת המסמך — doApprove שולח
               אותה כפרמטר שישי רק אם שונתה (אחרת null). תצוגה: ריווח מצומצם
               (col/section/title/field-row/select), הוסרה התווית "בחירה
               מהקטלוג", שורת "קוד חדש" מוסתרת ונפתחת בקישור "+ קוד חדש"
               ליד כותרת השדה (toggleNewCode, חדשה). גובה העמודה הימנית ירד
               מ-1,133 ל-549 פיקסלים — ללא גלילה. אומת מול הקוד החי (diff
               מדויק), בסימולציית דפדפן, ובבדיקת שטח על שורות 7-8 ביומן_מצב_
               רפואי (בחירה מראש של איבר, רמז מערכת אחרת, כתיבת המלצה, תצוגה
               ללא גלילה).
  @changes     [v2.2.0] Task #219 — קוד איבר: render מוסיף select
               organSelect מתחת ל-sysCodeSelect, ממולא ע"י fillOrganOptions
               (חדשה) מתוך payload.organOptions — רק איברים שה-systemCode
               שלהם = המערכת הנבחרת, עם "— ללא איבר —" כברירת מחדל, ובחירה
               מוקדמת לפי currentOrganCode. שינוי מערכת (onchange) ממלא מחדש
               את הרשימה; איבר שלא שייך למערכת החדשה מתאפס. doApprove שולח
               organCode כפרמטר חמישי ל-s16_approve. אומת מול הקוד החי (diff
               מדויק) ובסימולציית דפדפן (סינון, איפוס, שליחה), ובבדיקת שטח:
               שורה 6 → V6 = SYS12A.
  @changes     [v2.1.0] Task #216 — renderCodeFieldHtml: ה-select של "קוד
               אירוע" הציג 41 שורות מעורבבות (5 כותרות קטגוריה A0-A4 לצד
               קודי-העלה) בלי הבחנה, עם סיכון לבחירת קטגוריה כקוד. כעת: קוד
               שקיים קוד ארוך ממנו שמתחיל בו = כותרת קטגוריה → optgroup
               (לא ניתן לבחירה), קודי-העלה שלו מוצגים תחתיו. קוד עצמאי (A5)
               ובלוקים שטוחים (התמחות/חומרה/אבחנה) — אפשרויות רגילות, ללא
               שינוי. כלל הזיהוי לפי קידומת ולא לפי Raw_Value ריק (רוב
               קודי-העלה בקטלוג ללא Raw_Value). מקרה קצה: קוד כותרת שכבר
               שמור בשורה מוצג גם כאפשרות רגילה, כדי שלא יימחק בשקט באישור.
               אומת מול הקוד החי (diff מדויק, node --check) ובבדיקת שטח על
               שורות 5-6 ביומן_מצב_רפואי (אישור וכתיבת קודים תקינים).
  @changes     [v2.0.0] Task #214 — שכתוב מלא: הוחלף select+input בודד של
               "קוד אירוע" ב-4 שדות קטלוג פתוח זהים במבנה (eventCode/
               specialty/severity/diagnosis), כל אחד עם select של האפשרויות
               הקיימות + מיני-טופס "קוד חדש" נפרד (renderCodeFieldHtml,
               לולאה אחת במקום קוד כפול). נוסף select לוודאות אבחנה (לא
               היה קיים בגרסה הקודמת בכלל). Event_Date/Doc_Issuer עברו
               לעמודה השמאלית + נוספה תצוגת מסמך מקור (iframe) — לא היו
               מוצגים בגרסה הקודמת מעבר לקישור טקסטואלי בודד. הוסרו שדות
               etCodeInput/etNormInput/suggestionHint הישנים (מבנה 15
               עמודות). אומת מול הקוד החי (diff מדויק).
-->
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<base target="_top">
<title>S16 — אימות מצב רפואי</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
    direction: rtl;
    font-size: 14px;
    background: #fff;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .dialog-header {
    background: #7E57C2;
    color: #fff;
    padding: 8px 14px;
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .header-title { font-size: 13px; font-weight: 700; }
  .header-meta  { font-size: 11px; opacity: 0.85; }

  .status-badge {
    background: rgba(255,255,255,0.18);
    border: 1px solid rgba(255,255,255,0.35);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 11px;
  }

  /* ════ גוף — שתי עמודות, כמו S10_Sidebar ════ */
  .dialog-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    flex: 1; overflow: hidden; min-height: 0;
  }

  .col {
    padding: 6px 10px;
    overflow-y: auto;
    display: flex; flex-direction: column;
    gap: 6px; min-height: 0;
  }

  .col-right { border-left: 1px solid #e0e0e0; }

  .section {
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 6px 10px;
    flex-shrink: 0;
  }

  .section-title {
    font-size: 12px;
    font-weight: 700;
    color: #7E57C2;
    margin-bottom: 4px;
  }

  /* [Task #220] כותרת שדה + קישור "+ קוד חדש" באותה שורה */
  .section-head { display: flex; justify-content: space-between; align-items: baseline; }
  .link-new {
    background: none; border: none; color: #1976d2;
    font-size: 11px; cursor: pointer; padding: 0;
  }

  .field-row { display: flex; gap: 10px; margin-bottom: 3px; }

  .field-label {
    font-size: 11px;
    color: #666;
    min-width: 80px;
    flex-shrink: 0;
    padding-top: 2px;
  }

  .field-value {
    font-size: 13px;
    color: #222;
    white-space: pre-wrap;
    word-break: break-word;
  }

  label.edit-label {
    display: block;
    font-size: 11px;
    color: #666;
    margin-bottom: 4px;
  }

  select, input[type="text"] {
    width: 100%;
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 13px;
    font-family: inherit;
  }

  .hint { font-size: 11px; color: #888; margin-top: 4px; }

  .new-code-box {
    display: none;
    gap: 6px;
    margin-top: 6px;
    align-items: flex-end;
  }
  .new-code-box.open { display: flex; }

  .new-code-box input { flex: 1; min-width: 0; }

  .btn-add {
    background: #1976d2; color: #fff;
    border: none; border-radius: 5px;
    padding: 6px 10px; font-size: 12px; font-weight: 600;
    cursor: pointer; white-space: nowrap; flex-shrink: 0;
  }

  .source-link {
    display: inline-block;
    margin-top: 6px;
    font-size: 12px;
    color: #7E57C2;
    text-decoration: none;
  }

  .file-preview {
    flex: 1; min-height: 260px;
    border: 1px solid #d1c4e9;
    border-radius: 4px;
    background: #f5f5f5;
    width: 100%;
  }

  .btn-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    padding: 10px 14px;
    border-top: 1px solid #e0e0e0;
    flex-shrink: 0;
    align-items: center;
  }

  button {
    padding: 8px 16px;
    border: none;
    border-radius: 5px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
  }

  .btn-approve { background: #43A047; color: #fff; }
  .btn-nav     { background: #eceff1; color: #333; }
  .btn-row .spacer { flex: 1; }

  #statusMsg {
    font-size: 12px;
    padding: 0 14px 8px 14px;
    min-height: 16px;
  }

  #statusMsg.ok    { color: #2e7d32; }
  #statusMsg.error { color: #c62828; }
</style>
</head>
<body>

  <div class="dialog-header">
    <div>
      <div class="header-title">🩺 S16 — אימות מצב רפואי</div>
      <div class="header-meta" id="rowMeta">טוען…</div>
    </div>
    <div class="status-badge" id="statusBadge">—</div>
  </div>

  <div class="dialog-body">
    <div class="col col-right" id="rightCol">טוען נתוני שורה…</div>
    <div class="col col-left" id="leftCol"></div>
  </div>

  <div id="statusMsg"></div>

  <div class="btn-row">
    <button class="btn-nav" onclick="prevRow()">◀ הקודם</button>
    <button class="btn-nav" onclick="nextRow()">הבא ▶</button>
    <div class="spacer"></div>
    <button class="btn-approve" onclick="doApprove()">✅ אשר</button>
  </div>

<script>
  let currentPayload = null;

  function initUI() {
    google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s16_loadRowData();
  }

  function esc(s) {
    return (s || '').toString()
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

    // ════ בניית HTML לשדה קטלוג פתוח בודד (eventCode/specialty/severity/diagnosis) ════
  // [Task #216] קיבוץ היררכי: קוד שקיים קוד ארוך ממנו שמתחיל בו (למשל A0 מול
  // A0A) הוא כותרת קטגוריה — מוצג ככותרת קבוצה שאי אפשר לבחור בה, והקודים
  // שמתחילים בו מוצגים תחתיה. קוד בלי קבוצה (למשל A5, וכל הבלוקים השטוחים —
  // התמחות/חומרה/אבחנה) מוצג כאפשרות רגילה. אם בשורה כבר שמור קוד של כותרת —
  // הוא מוצג גם כאפשרות רגילה, כדי שלא יימחק בשקט באישור.
  function renderCodeFieldHtml(field) {
    const allCodes = field.options.map(function(o) { return o.code; });

    const isCategory = {};
    allCodes.forEach(function(code) {
      isCategory[code] = allCodes.some(function(other) {
        return other.length > code.length && other.indexOf(code) === 0;
      });
    });

    const parentOf = {};
    allCodes.forEach(function(code) {
      let parent = '';
      allCodes.forEach(function(cand) {
        if (isCategory[cand] && cand !== code && code.indexOf(cand) === 0 && cand.length > parent.length) {
          parent = cand;
        }
      });
      if (parent) parentOf[code] = parent;
    });

    // [Task #220] בחירה מראש של ההצעה רק כשאין קוד שמור בשורה
    const preselect    = !field.currentCode && !!field.suggestion;
    const selectedCode = field.currentCode || (preselect ? field.suggestion.code : '');

    function optionHtml(opt) {
      const sel = (opt.code === selectedCode) ? ' selected' : '';
      return '<option value="' + esc(opt.code) + '" data-name="' + esc(opt.name) + '"' + sel + '>' +
        esc(opt.code) + ' — ' + esc(opt.name) + '</option>';
    }

    let optionsHtml = '<option value="">— בחר —</option>';
    field.options.forEach(function(opt) {
      if (parentOf[opt.code]) return;
      if (isCategory[opt.code]) {
        if (opt.code === selectedCode) optionsHtml += optionHtml(opt);
        let groupHtml = '';
        field.options.forEach(function(child) {
          if (parentOf[child.code] === opt.code) groupHtml += optionHtml(child);
        });
        optionsHtml += '<optgroup label="' + esc(opt.code) + ' — ' + esc(opt.name) + '">' + groupHtml + '</optgroup>';
        return;
      }
      optionsHtml += optionHtml(opt);
    });

    const hintHtml = suggestionHintHtml(field.suggestion, preselect);

    return (
      '<div class="section" data-field-key="' + field.key + '">' +
        '<div class="section-head">' +
          // [Task #220 שלב ב] קוד שנכתב ע"י S13 בשורה "חדש" — תגית כתומה בשורת הכותרת (בלי גובה נוסף)
          '<div class="section-title">' + esc(field.label) + geminiHintHtml(!!field.currentCode) + '</div>' +
          '<button type="button" class="link-new" onclick="toggleNewCode(\'' + field.key + '\')">+ קוד חדש</button>' +
        '</div>' +
        '<select id="sel_' + field.key + '">' + optionsHtml + '</select>' +
        hintHtml +
        '<div class="new-code-box" id="newBox_' + field.key + '">' +
          '<div><label class="edit-label">קוד חדש</label><input type="text" id="newCode_' + field.key + '"></div>' +
          '<div><label class="edit-label">שם מנורמל</label><input type="text" id="newName_' + field.key + '"></div>' +
          '<button type="button" class="btn-add" onclick="doSaveCatalogCode(\'' + field.key + '\')">+ הוסף</button>' +
        '</div>' +
      '</div>'
    );
  }

  // ════ [Task #220] פתיחה/סגירה של שורת "קוד חדש" בשדה קטלוג ════
  function toggleNewCode(key) {
    document.getElementById('newBox_' + key).classList.toggle('open');
  }

  // ════ [Task #220] רמז הצעה: מסומנת מראש (כתום) או הצעה לשדה עם קוד קיים ════
  function suggestionHintHtml(sugg, preselected, extraText) {
    if (!sugg) return '';
    const byKeyword = sugg.keyword ? ' (לפי "' + esc(sugg.keyword) + '")' : '';
    if (preselected) {
      return '<div class="hint" style="color:#e65100; font-weight:bold;">🤖 הוצע אוטומטית — יש לאמת' + byKeyword + '</div>';
    }
    return '<div class="hint">הצעה מהקטלוג: ' + esc(sugg.code) + (sugg.name ? ' — ' + esc(sugg.name) : '') +
      byKeyword + (extraText ? ' — ' + esc(extraText) : '') + '</div>';
  }

  // ════ [Task #220 שלב ב] תגית לקוד שהוצע ע"י Gemini (S13) — רק בשורה בסטטוס "חדש" ════
  // מוצגת באותה שורה עם כותרת השדה (span) — לא מוסיפה גובה לחלון
  function geminiHintHtml(hasCode) {
    if (!hasCode || !currentPayload || currentPayload.recordStatus !== 'חדש') return '';
    return '<span style="color:#e65100; font-weight:bold; font-size:11px; margin-right:8px;">🤖 Gemini — לאמת</span>';
  }

    // ════ [Task #224] מצב וצד איבר — רק בשורת ניתוח או כשכבר שמור ערך ════
  // שני select סגורים זה לצד זה (שורה אחת — בלי גלילה נוספת). הצעה נבחרת
  // מראש רק כשהשדה ריק. סתירת צד בטקסט — בלי הצעה, אזהרה אדומה.
    function organStateHtml(os) {
    if (!os || !os.show) return '';
    function selectHtml(id, options, current, sugg) {
      const pre      = !current && !!sugg;
      const selected = current || (pre ? sugg.code : '');
      let h = '<select id="' + id + '"><option value="">— לא צוין —</option>';
      (options || []).forEach(function(opt) {
        const sel = (opt.code === selected) ? ' selected' : '';
        h += '<option value="' + esc(opt.code) + '"' + sel + '>' + esc(opt.code) + ' — ' + esc(opt.name) + '</option>';
      });
      return { html: h + '</select>', pre: pre };
    }
    const st = selectHtml('organStateSelect', os.stateOptions, os.currentState, os.stateSuggestion);
    const sd = selectHtml('organSideSelect',  os.sideOptions,  os.currentSide,  os.sideSuggestion);
    const sideNote = os.sideConflict
      ? '<div class="hint" style="color:#c62828; font-weight:bold;">⚠️ בטקסט מופיעים גם ' + esc(os.sideConflict.join(' וגם ')) + ' — יש לבדוק במסמך המקור</div>'
      : suggestionHintHtml(os.sideSuggestion, sd.pre);
    return '<div style="display:flex; gap:8px;">' +
        '<div style="flex:1; min-width:0;"><label class="edit-label">מצב האיבר</label>' + st.html +
          suggestionHintHtml(os.stateSuggestion, st.pre) + '</div>' +
        '<div style="flex:1; min-width:0;"><label class="edit-label">צד</label>' + sd.html + sideNote + '</div>' +
      '</div>';
  }

  // ════ [Task #262] רגישות / אלרגיה — רק בשורת רגישות (A7) או כשכבר שמור ערך ════
  // select סגור של חומר גורם מבלוק התרופות (קוד ATC) ותיבת טקסט לתגובה.
  // הצעת חומר נבחרת מראש רק כשהשדה ריק. חומר שאינו בקטלוג — להשאיר ריק
  // (שמו נשאר באבחנה העיקרית) או להוסיף קודם שורה לבלוק התרופות במיפוי_קודים.
  function allergyHtml(al) {
    if (!al || !al.show) return '';
    const pre      = !al.currentAllergen && !!al.allergenSuggestion;
    const selected = al.currentAllergen || (pre ? al.allergenSuggestion.code : '');
    let opts = '<option value="">— לא בקטלוג / לא צוין —</option>';
    (al.allergenOptions || []).forEach(function(opt) {
      const sel = (opt.code === selected) ? ' selected' : '';
      opts += '<option value="' + esc(opt.code) + '"' + sel + '>' + esc(opt.code) + ' — ' + esc(opt.name) + '</option>';
    });
    return '<div class="section">' +
        '<div class="section-title">⚠️ רגישות / אלרגיה' + geminiHintHtml(!!al.currentAllergen || !!al.currentReaction) + '</div>' +
        '<label class="edit-label">חומר גורם (קטלוג התרופות)</label>' +
        '<select id="allergenSelect">' + opts + '</select>' +
        suggestionHintHtml(al.allergenSuggestion, pre) +
        '<label class="edit-label">תגובה</label>' +
        '<input type="text" id="reactionInput" value="' + esc(al.currentReaction) + '">' +
      '</div>';
  }

        function render(payload) {
    if (!payload || payload.error) {
      handleError(payload || { msg: "שגיאה בטעינה" });
      return;
    }
    currentPayload = payload;
    // [Task #256 שלב 4] מצב תרופות — payload מ-S15 (s15_showValidation / s15_loadRowByNumber)
    if (payload.mode === 'medication') { renderMedication(payload); return; }
    // [Task #261 שלב 4] מצב הנחיות — payload מ-S15 (s15_showValidation / s15_instrLoadRowByNumber)
    if (payload.mode === 'instruction') { renderInstruction(payload); return; }

    // [Task #263 שלב 5] מצב מעבדה — payload מ-S15 (s15_showValidation / s15_labLoadRowByNumber)
    if (payload.mode === 'lab') { renderLab(payload); return; }
    // [Task #264 שלב 4] מצב גנטיקה — payload מ-S15 (s15_showValidation / s15_genLoadRowByNumber)
    if (payload.mode === 'gen') { renderGen(payload); return; }

    document.getElementById('rowMeta').textContent =
      'שורה ' + payload.row + ' מתוך ' + payload.lastRow;
    document.getElementById('statusBadge').textContent = payload.recordStatus || '—';

    // ═══ עמודה ימנית — שדות אימות ═══
    let sysOptionsHtml = '';
    payload.bodySystemOptions.forEach(function(opt) {
      const sel = (opt.code === payload.currentSysCode) ? ' selected' : '';
      sysOptionsHtml += '<option value="' + esc(opt.code) + '"' + sel + '>' + esc(opt.code) + ' — ' + esc(opt.nameHe) + '</option>';
    });

    // [Task #220] ודאות — בחירה מראש של ההצעה רק כשהשדה ריק
    const certPreselect = !payload.currentCertainty && !!payload.certaintySuggestion;
    const certSelected  = payload.currentCertainty || (certPreselect ? payload.certaintySuggestion.code : '');
    let certOptionsHtml = '<option value="">— בחר —</option>';
    payload.certaintyOptions.forEach(function(opt) {
      const sel = (opt.code === certSelected) ? ' selected' : '';
      certOptionsHtml += '<option value="' + esc(opt.code) + '"' + sel + '>' + esc(opt.code) + ' — ' + esc(opt.name) + '</option>';
    });

    let codeFieldsHtml = '';
    ['eventCode', 'specialty', 'severity', 'diagnosis'].forEach(function(key) {
      codeFieldsHtml += renderCodeFieldHtml(payload.fields[key]);
    });

    document.getElementById('rightCol').innerHTML =
      '<div class="section">' +
        '<div class="section-title">תוכן האירוע (תצוגה בלבד)</div>' +
        '<div class="field-row"><div class="field-label">אבחנה עיקרית</div><div class="field-value">' + esc(payload.primaryDiagnosis) + '</div></div>' +
        '<div class="field-row"><div class="field-label">חומרה</div><div class="field-value">' + esc(payload.severityStatus) + '</div></div>' +
      '</div>' +
      '<div class="section">' +
        '<div class="section-title">קוד מערכת גוף' + geminiHintHtml(!!payload.currentSysCode) + '</div>' +
        '<select id="sysCodeSelect">' + sysOptionsHtml + '</select>' +
        '<label class="edit-label">איבר (אופציונלי)<span id="organGemini"></span></label>' +
        '<select id="organSelect"></select>' +
        '<div id="organHint"></div>' +
        organStateHtml(payload.organState) + // [Task #224]
      '</div>' +
      allergyHtml(payload.allergy) + // [Task #262]
      codeFieldsHtml +
      // [Task #220 שלב ב] וודאות — "+ קוד חדש" בשורת הכותרת, שורת ההזנה מקופלת (כמו שדות הקטלוג)
      '<div class="section" data-field-key="certainty">' +
        '<div class="section-head">' +
          '<div class="section-title">וודאות אבחנה' + geminiHintHtml(!!payload.currentCertainty) + '</div>' +
          '<button type="button" class="link-new" onclick="toggleNewCode(\'certainty\')">+ קוד חדש</button>' +
        '</div>' +
        '<select id="certaintySelect">' + certOptionsHtml + '</select>' +
        suggestionHintHtml(payload.certaintySuggestion, certPreselect) +
        '<div class="new-code-box" id="newBox_certainty">' +
          '<div><label class="edit-label">קוד חדש</label><input type="text" id="newCode_certainty"></div>' +
          '<div><label class="edit-label">שם מנורמל</label><input type="text" id="newName_certainty"></div>' +
          '<button type="button" class="btn-add" onclick="doSaveCatalogCode(\'certainty\')">+ הוסף</button>' +
        '</div>' +
      '</div>';

    // [Task #219] רשימת האיברים מסוננת לפי המערכת שנבחרה, ומתעדכנת בכל
    // שינוי מערכת (איבר שלא שייך למערכת החדשה מתאפס ל"ללא איבר").
    // [Task #220] הצעת איבר נבחרת מראש רק כשאין איבר שמור והיא שייכת למערכת
    const organSugg = payload.organSuggestion;
    fillOrganOptions(payload.currentSysCode, payload.currentOrganCode ||
      (organSugg && organSugg.systemCode === payload.currentSysCode ? organSugg.code : ''));
    document.getElementById('sysCodeSelect').onchange = function() {
      const keep = document.getElementById('organSelect').value;
      fillOrganOptions(this.value, keep ||
        (organSugg && !payload.currentOrganCode && organSugg.systemCode === this.value ? organSugg.code : ''));
    };

    // ═══ עמודה שמאלית — Event_Date/Doc_Issuer + תצוגת מסמך מקור ═══
    const previewUrl = payload.sourceUrl ? payload.sourceUrl.replace('/view', '/preview') : '';
    const sourceLink = payload.sourceUrl
      ? '<a class="source-link" href="' + payload.sourceUrl + '" target="_blank">פתח בלשונית חדשה ↗</a>'
      : '';

    document.getElementById('leftCol').innerHTML =
      '<div class="section">' +
        '<div class="section-title">מטא-דאטה</div>' +
        '<div class="field-row"><div class="field-label">תאריך</div><div class="field-value">' + esc(payload.eventDate) + '</div></div>' +
        '<div class="field-row"><div class="field-label">מוסד / רופא</div><div class="field-value">' + esc(payload.docIssuer) + '</div></div>' +
      '</div>' +
      // [Task #220] המלצה — בעמודה השמאלית, מעל תצוגת המסמך (נשמרת ב"אשר" רק אם שונתה)
      '<div class="section">' +
        '<div class="section-title">המלצה <span style="font-weight:normal; color:#888; font-size:11px;">— נשמרת באישור רק אם שונתה</span></div>' +
        '<textarea id="recoInput" rows="3" style="width:100%; padding:4px 8px; border:1px solid #ccc; border-radius:4px; font-size:13px; font-family:inherit; resize:vertical;">' +
          esc(payload.recommendations) + '</textarea>' +
      '</div>' +
      '<div class="section" style="flex:1; display:flex; flex-direction:column; min-height:0;">' +
        '<div class="section-title">📄 מסמך מקור</div>' +
        (previewUrl
          ? '<iframe class="file-preview" src="' + previewUrl + '" frameborder="0" allowfullscreen></iframe>'
          : '<div class="hint">אין מסמך מקור לשורה זו</div>') +
        sourceLink +
      '</div>';
  }

  // ════ [Task #219] מילוי רשימת האיברים של המערכת הנבחרת ════
  function fillOrganOptions(systemCode, selectedCode) {
    let html = '<option value="">— ללא איבר —</option>';
    (currentPayload.organOptions || []).forEach(function(opt) {
      if (opt.systemCode !== systemCode) return;
      const sel = (opt.code === selectedCode) ? ' selected' : '';
      html += '<option value="' + esc(opt.code) + '"' + sel + '>' + esc(opt.code) + ' — ' + esc(opt.name) + '</option>';
    });
    document.getElementById('organSelect').innerHTML = html;

    // [Task #220] רמז הצעת איבר — מסומן מראש / הצעה / שייך למערכת אחרת
    const sugg = currentPayload.organSuggestion;
    // [Task #220 שלב ב] איבר שנכתב ע"י S13 — תגית כתומה בתווית האיבר, כל עוד הוא האיבר הנבחר
    const savedOrgan = currentPayload.currentOrganCode;
    document.getElementById('organGemini').innerHTML =
      (savedOrgan && selectedCode === savedOrgan && savedOrgan.indexOf(systemCode) === 0) ? geminiHintHtml(true) : '';
    let hint = '';
    if (sugg) {
      if (sugg.systemCode !== systemCode) {
        hint += suggestionHintHtml(sugg, false, 'שייך למערכת ' + sugg.systemCode + ', יש לבחור אותה קודם');
      } else {
        hint += suggestionHintHtml(sugg, !currentPayload.currentOrganCode && selectedCode === sugg.code);
      }
    }
    document.getElementById('organHint').innerHTML = hint;
  }

  function prevRow() {
    if (!currentPayload) return;
    clearStatusMsg(); // [Task #258] הודעת השורה הקודמת לא נשארת במעבר ידני
    const target = currentPayload.row - 1;
    if (target < currentPayload.firstDataRow) return;
    // [Task #256 שלב 4] מצב תרופות — טעינה דרך S15
    if (currentPayload.mode === 'medication') {
      google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s15_loadRowByNumber(target);
      return;
    }
    // [Task #261 שלב 4] מצב הנחיות — טעינה דרך S15
    if (currentPayload.mode === 'instruction') {
      google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s15_instrLoadRowByNumber(target);
      return;
    }
    // [Task #263 שלב 5] מצב מעבדה — טעינה דרך S15
    if (currentPayload.mode === 'lab') {
      google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s15_labLoadRowByNumber(target);
      return;
    }
    // [Task #264 שלב 4] מצב גנטיקה — טעינה דרך S15
    if (currentPayload.mode === 'gen') {
      google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s15_genLoadRowByNumber(target);
      return;
    }
    google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s16_loadRowByNumber(target);
  }

  function nextRow() {
    if (!currentPayload) return;
    clearStatusMsg(); // [Task #258] הודעת השורה הקודמת לא נשארת במעבר ידני
    const target = currentPayload.row + 1;
    if (target > currentPayload.lastRow) return;
    // [Task #256 שלב 4] מצב תרופות — טעינה דרך S15
    if (currentPayload.mode === 'medication') {
      google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s15_loadRowByNumber(target);
      return;
    }
    // [Task #261 שלב 4] מצב הנחיות — טעינה דרך S15
    if (currentPayload.mode === 'instruction') {
      google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s15_instrLoadRowByNumber(target);
      return;
    }
    // [Task #263 שלב 5] מצב מעבדה — טעינה דרך S15
    if (currentPayload.mode === 'lab') {
      google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s15_labLoadRowByNumber(target);
      return;
    }
    // [Task #264 שלב 4] מצב גנטיקה — טעינה דרך S15
    if (currentPayload.mode === 'gen') {
      google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s15_genLoadRowByNumber(target);
      return;
    }
    google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s16_loadRowByNumber(target);
  }

  // [Task #258] ניקוי הודעת הסטטוס — במעבר ידני בין שורות בלבד (אחרי אישור עם מעבר אוטומטי ההודעה נשארת)
  function clearStatusMsg() {
    const el = document.getElementById('statusMsg');
    el.className = '';
    el.textContent = '';
  }

  function doApprove() {
    if (!currentPayload) return;
    // [Task #256 שלב 4] מצב תרופות — אישור דרך S15
    if (currentPayload.mode === 'medication') { doApproveMedication(); return; }
    // [Task #261 שלב 4] מצב הנחיות — אישור דרך S15
    if (currentPayload.mode === 'instruction') { doApproveInstruction(); return; }
    // [Task #263 שלב 5] מצב מעבדה — אישור דרך S15
    if (currentPayload.mode === 'lab') { doApproveLab(); return; }
    // [Task #264 שלב 4] מצב גנטיקה — אישור דרך S15
    if (currentPayload.mode === 'gen') { doApproveGen(); return; }
    const sysCode   = document.getElementById('sysCodeSelect').value;
    const certCode  = document.getElementById('certaintySelect').value;
    const organCode = document.getElementById('organSelect').value;
    // [Task #220] המלצה נשלחת רק אם שונתה בחלון (אחרת null — לא נכתבת)
    const recoValue = document.getElementById('recoInput').value;
    const recoToSend = (recoValue.trim() !== (currentPayload.recommendations || '').trim()) ? recoValue : null;
    // [Task #224] מצב וצד איבר — נשלחים רק אם השדות הוצגו בחלון (אחרת null — לא נכתבים)
    const stateSel   = document.getElementById('organStateSelect');
    const sideSel    = document.getElementById('organSideSelect');
    const organState = stateSel ? stateSel.value : null;
    const organSide  = sideSel  ? sideSel.value  : null;
    // [Task #262] חומר גורם ותגובה — נשלחים רק אם השדות הוצגו בחלון (אחרת null — לא נכתבים)
    const allergenSel = document.getElementById('allergenSelect');
    const reactionInp = document.getElementById('reactionInput');
    const allergen    = allergenSel ? allergenSel.value : null;
    const reaction    = reactionInp ? reactionInp.value : null;

    const fieldValues = {};
    ['eventCode', 'specialty', 'severity', 'diagnosis'].forEach(function(key) {
      const sel  = document.getElementById('sel_' + key);
      const opt  = sel.options[sel.selectedIndex];
      fieldValues[key] = {
        code: sel.value || '',
        name: (opt && opt.getAttribute('data-name')) || ''
      };
    });

    google.script.run.withSuccessHandler(handleResult).withFailureHandler(handleError)
      .s16_approve(currentPayload.row, sysCode, certCode, fieldValues, organCode, recoToSend, organState, organSide, allergen, reaction);
  }

   function doSaveCatalogCode(key) {
    if (!currentPayload) return;
    // [Task #220 שלב ב] וודאות אינה ב-fields — תווית קבועה וללא טקסט גולמי (לא נשמרות מילות מפתח)
    const field   = currentPayload.fields[key] || { label: 'וודאות אבחנה', rawText: '' };
    const newCode = document.getElementById('newCode_' + key).value.trim();
    const newName = document.getElementById('newName_' + key).value.trim();
    if (!newCode) {
      handleError({ msg: "❌ חסר קוד חדש עבור " + field.label });
      return;
    }
    google.script.run.withSuccessHandler(handleResult).withFailureHandler(handleError)
      .s16_saveCatalogCode(key, field.rawText, newCode, newName);
  }

  function handleResult(result) {
    const el = document.getElementById('statusMsg');
    if (result && result.success) {
      el.className = 'ok';
      el.textContent = result.msg || '✅ בוצע';
      if (currentPayload) {
        // [Task #256 שלב 4] מצב תרופות — טעינה מחדש דרך S15
        if (currentPayload.mode === 'medication') {
          google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s15_loadRowByNumber(currentPayload.row);
        } else if (currentPayload.mode === 'instruction') {
          // [Task #261 שלב 4] מצב הנחיות — טעינה מחדש דרך S15
          google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s15_instrLoadRowByNumber(currentPayload.row);
        } else if (currentPayload.mode === 'lab') {
          // [Task #263 שלב 5] מצב מעבדה — טעינה מחדש דרך S15
          google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s15_labLoadRowByNumber(currentPayload.row);
        } else if (currentPayload.mode === 'gen') {
          // [Task #264 שלב 4] מצב גנטיקה — מעבר אוטומטי לשורה הבאה (בשורה האחרונה — טעינה מחדש)
          const nextGen = (currentPayload.row < currentPayload.lastRow) ? currentPayload.row + 1 : currentPayload.row;
          google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s15_genLoadRowByNumber(nextGen);
        } else {
          google.script.run.withSuccessHandler(render).withFailureHandler(handleError).s16_loadRowByNumber(currentPayload.row);
        }
      }
    } else {
      el.className = 'error';
      el.textContent = (result && result.msg) || '❌ שגיאה';
    }
  }
  // ════ [Task #256 שלב 4] מצב תרופות — תצוגת שורה מגליון תרופות_קבועות ════
  // ימין: נתוני המסמך (תצוגה), קוד ATC + נתוני קטלוג, מינון ותדירות, סוג
  // טיפול, סיבה. שמאל: מטא-דאטה ותצוגת מסמך מקור. קוד מאומת בקטלוג — שדות
  // הקטלוג נעולים (בצד השרת נתוני הקטלוג גוברים בכל מקרה).
  function renderMedication(p) {
    document.querySelector('.header-title').textContent = '💊 S15 — אימות תרופות';
    document.getElementById('rowMeta').textContent =
      'שורה ' + p.row + ' מתוך ' + p.lastRow + ' — ' + p.drugName;
    document.getElementById('statusBadge').textContent = p.enrichStatus || '—';

    const verified = p.catalogSource === 'verified';
    const lock     = verified ? ' disabled' : '';
    let sourceHint;
    if (verified) {
      sourceHint = '<div class="hint" style="color:#2e7d32; font-weight:bold;">✅ קוד מאומת בקטלוג — נתוני הקטלוג נעולים</div>';
    } else if (p.catalogSource === 'suggested') {
      sourceHint = '<div class="hint" style="color:#e65100; font-weight:bold;">🤖 הצעת Gemini — יש לאמת קוד ונתוני קטלוג</div>';
    } else {
      sourceHint = '<div class="hint">אין הצעה בקטלוג — ניתן להזין קוד ידנית או להשאיר ריק</div>';
    }

    let sysOptionsHtml = '<option value="">— ללא —</option>';
    (p.bodySystemOptions || []).forEach(function(opt) {
      const sel = (opt.code === p.catalog.system) ? ' selected' : '';
      sysOptionsHtml += '<option value="' + esc(opt.code) + '"' + sel + '>' + esc(opt.code) + ' — ' + esc(opt.nameHe) + '</option>';
    });

    // סוג טיפול — הצעה נבחרת מראש רק כשהשדה ריק
    const typePre      = !p.treatmentType && !!p.treatmentTypeSuggestion;
    const typeSelected = p.treatmentType || (typePre ? p.treatmentTypeSuggestion : '');
    let typeOptionsHtml = '<option value="">— בחר —</option>';
    (p.treatmentTypes || []).forEach(function(t) {
      const sel = (t === typeSelected) ? ' selected' : '';
      typeOptionsHtml += '<option value="' + esc(t) + '"' + sel + '>' + esc(t) + '</option>';
    });
    let typeHint = '';
    if (typePre) {
      typeHint = '<div class="hint" style="color:#e65100; font-weight:bold;">🤖 הוצע אוטומטית — יש לאמת</div>';
    } else if (p.treatmentTypeSuggestion && p.treatmentTypeSuggestion !== p.treatmentType) {
      typeHint = '<div class="hint">הצעה לפי תאריך הסיום והתדירות: ' + esc(p.treatmentTypeSuggestion) + '</div>';
    }

    function inputHtml(id, label, value, extra) {
      return '<div style="flex:1; min-width:0;"><label class="edit-label">' + label + '</label>' +
        '<input type="text" id="' + id + '" value="' + esc(value) + '"' + (extra || '') + '></div>';
    }

    const dates = (p.startDate ? 'מ-' + p.startDate : '') + (p.endDate ? ' עד ' + p.endDate : '');

    document.getElementById('rightCol').innerHTML =
      '<div class="section">' +
        '<div class="section-title">התרופה במסמך (תצוגה בלבד)</div>' +
        '<div class="field-row"><div class="field-label">שם התרופה</div><div class="field-value">' + esc(p.drugName) + '</div></div>' +
        '<div class="field-row"><div class="field-label">מינון</div><div class="field-value">' + esc(p.dosageText) + '</div></div>' +
        '<div class="field-row"><div class="field-label">תדירות</div><div class="field-value">' + esc(p.frequencyText) + '</div></div>' +
        '<div class="field-row"><div class="field-label">תאריכים</div><div class="field-value">' + esc(dates) + '</div></div>' +
      '</div>' +
      '<div class="section">' +
        '<div class="section-title">קוד ATC וקטלוג</div>' +
        '<div style="display:flex; gap:8px;">' +
          inputHtml('medCode', 'קוד ATC (7 תווים)', p.code, ' maxlength="7" style="text-transform:uppercase;"') +
          inputHtml('medActive', 'חומר פעיל', p.catalog.name, lock) +
        '</div>' +
        sourceHint +
        '<div style="display:flex; gap:8px; margin-top:4px;">' +
          inputHtml('medGroup', 'קבוצה טיפולית', p.catalog.desc, lock) +
          '<div style="flex:1; min-width:0;"><label class="edit-label">מערכת גוף</label>' +
            '<select id="medSystem"' + lock + '>' + sysOptionsHtml + '</select></div>' +
        '</div>' +
        // [Task #266] תצוגה בלבד — השרת קובע את השמות: קוד מאומת — שמות הקטלוג; קוד חדש — שם התרופה בשורה
        '<div style="margin-top:4px;">' + inputHtml('medTradeNames', 'שמות מסחריים (תצוגה — בקוד חדש נשמר שם התרופה בלבד)', verified ? p.catalog.raw : p.drugName, ' disabled') + '</div>' +
      '</div>' +
      '<div class="section">' +
        '<div class="section-title">מינון ותדירות</div>' +
        '<div style="display:flex; gap:8px;">' +
          inputHtml('medDoseAmount', 'כמות', p.doseAmount) +
          inputHtml('medDoseUnit', 'יחידה', p.doseUnit) +
          inputHtml('medTimesPerDay', 'פעמים ביום', p.timesPerDay) +
          inputHtml('medDaysPerWeek', 'ימים בשבוע', p.daysPerWeek) +
        '</div>' +
      '</div>' +
      '<div class="section">' +
        '<div style="display:flex; gap:8px;">' +
          '<div style="flex:1; min-width:0;"><label class="edit-label">סוג טיפול (חובה)</label>' +
            '<select id="medTreatmentType">' + typeOptionsHtml + '</select>' + typeHint + '</div>' +
          inputHtml('medReason', 'סיבת הטיפול', p.reason) +
        '</div>' +
      '</div>';

    const previewUrl = p.sourceUrl ? p.sourceUrl.replace('/view', '/preview') : '';
    const sourceLink = p.sourceUrl
      ? '<a class="source-link" href="' + p.sourceUrl + '" target="_blank">פתח בלשונית חדשה ↗</a>'
      : '';

    document.getElementById('leftCol').innerHTML =
      '<div class="section">' +
        '<div class="section-title">מטא-דאטה</div>' +
        '<div class="field-row"><div class="field-label">מוסד / רופא</div><div class="field-value">' + esc(p.docIssuer) + '</div></div>' +
        '<div class="field-row"><div class="field-label">תאריך התחלה</div><div class="field-value">' + esc(p.startDate) + '</div></div>' +
        '<div class="field-row"><div class="field-label">תאריך סיום</div><div class="field-value">' + esc(p.endDate || '—') + '</div></div>' +
      '</div>' +
      '<div class="section" style="flex:1; display:flex; flex-direction:column; min-height:0;">' +
        '<div class="section-title">📄 מסמך מקור</div>' +
        (previewUrl
          ? '<iframe class="file-preview" src="' + previewUrl + '" frameborder="0" allowfullscreen></iframe>'
          : '<div class="hint">אין מסמך מקור לשורה זו</div>') +
        sourceLink +
      '</div>';
  }

  // ════ [Task #256 שלב 4] אישור שורת תרופה — s15_approve (S15_EnrichCatalog.gs) ════
  function doApproveMedication() {
    function val(id) { return document.getElementById(id).value.trim(); }
    const v = {
      code:             val('medCode').toUpperCase(),
      activeIngredient: val('medActive'),
      therapeuticGroup: val('medGroup'),
      medicalSystem:    document.getElementById('medSystem').value,
      tradeNames:       val('medTradeNames'),
      doseAmount:       val('medDoseAmount'),
      doseUnit:         val('medDoseUnit'),
      timesPerDay:      val('medTimesPerDay'),
      daysPerWeek:      val('medDaysPerWeek'),
      reason:           val('medReason'),
      treatmentType:    document.getElementById('medTreatmentType').value
    };
    if (!v.treatmentType) {
      handleError({ msg: "❌ יש לבחור סוג טיפול (כרוני / זמני / לפי הצורך)" });
      return;
    }
    google.script.run.withSuccessHandler(handleResult).withFailureHandler(handleError)
      .s15_approve(currentPayload.row, v);
  }

    // ════ [Task #261 שלב 4] מצב הנחיות — תצוגת שורה מגליון הנחיות_רפואיות_ומשימות ════
  // ימין: ההנחיה במסמך (תצוגה), סוג (רשימה סגורה), אופי, קוד יעד, מערכת גוף,
  // סטטוס ותאריך יעד. שמאל: מטא-דאטה ותצוגת מסמך מקור. אין "+ קוד חדש".
  function renderInstruction(p) {
    document.querySelector('.header-title').textContent = '📋 S15 — אימות הנחיות';
    document.getElementById('rowMeta').textContent =
      'שורה ' + p.row + ' מתוך ' + p.lastRow + ' — ' + p.text;
    document.getElementById('statusBadge').textContent = p.enrichStatus || '—';

    const suggested  = p.enrichStatus === 'הוצע';
    const suggHint   = suggested
      ? '<div class="hint" style="color:#e65100; font-weight:bold;">🤖 הוצע בהעשרה — יש לאמת</div>'
      : '';

    let typeOptionsHtml = '<option value="">— בחר —</option>';
    (p.typeOptions || []).forEach(function(opt) {
      const sel = (opt.code === p.code) ? ' selected' : '';
      typeOptionsHtml += '<option value="' + esc(opt.code) + '" data-kind="' + esc(opt.defaultKind) + '"' + sel + '>' +
        esc(opt.code) + ' — ' + esc(opt.name) + '</option>';
    });

    let kindOptionsHtml = '<option value="">— בחר —</option>';
    (p.kinds || []).forEach(function(k) {
      const sel = (k === p.kind) ? ' selected' : '';
      kindOptionsHtml += '<option value="' + esc(k) + '"' + sel + '>' + esc(k) + '</option>';
    });

    let targetOptionsHtml = '<option value="">— ללא יעד —</option>';
    (p.targetGroups || []).forEach(function(g) {
      targetOptionsHtml += '<optgroup label="' + esc(g.label) + '">';
      g.options.forEach(function(opt) {
        const sel = (opt.code === p.target) ? ' selected' : '';
        targetOptionsHtml += '<option value="' + esc(opt.code) + '"' + sel + '>' + esc(opt.code) + ' — ' + esc(opt.name) + '</option>';
      });
      targetOptionsHtml += '</optgroup>';
    });

    let sysOptionsHtml = '<option value="">— ללא —</option>';
    (p.bodySystemOptions || []).forEach(function(opt) {
      const sel = (opt.code === p.medicalSystem) ? ' selected' : '';
      sysOptionsHtml += '<option value="' + esc(opt.code) + '"' + sel + '>' + esc(opt.code) + ' — ' + esc(opt.nameHe) + '</option>';
    });

    let statusOptionsHtml = '<option value="">— בחר —</option>';
    (p.statuses || []).forEach(function(s) {
      const sel = (s === p.status) ? ' selected' : '';
      statusOptionsHtml += '<option value="' + esc(s) + '"' + sel + '>' + esc(s) + '</option>';
    });

    function selectBox(id, label, optionsHtml, extra) {
      return '<div style="flex:1; min-width:0;"><label class="edit-label">' + label + '</label>' +
        '<select id="' + id + '"' + (extra || '') + '>' + optionsHtml + '</select></div>';
    }

    document.getElementById('rightCol').innerHTML =
      '<div class="section">' +
        '<div class="section-title">ההנחיה במסמך (תצוגה בלבד)</div>' +
        '<div class="field-row"><div class="field-label">תיאור</div><div class="field-value">' + esc(p.text) + '</div></div>' +
        '<div class="field-row"><div class="field-label">סוג מהחילוץ</div><div class="field-value">' + esc(p.rawType) + '</div></div>' +
        '<div class="field-row"><div class="field-label">תאריך ההנחיה</div><div class="field-value">' + esc(p.instructionDate) + '</div></div>' +
      '</div>' +
      '<div class="section">' +
        '<div class="section-title">סיווג ההנחיה</div>' +
        '<div style="display:flex; gap:8px;">' +
          selectBox('instrCode', 'סוג ההנחיה (רשימה סגורה)', typeOptionsHtml, ' onchange="updateInstrKindHint()"') +
          selectBox('instrKind', 'אופי', kindOptionsHtml, ' onchange="updateInstrKindHint()"') +
        '</div>' +
        '<div id="instrKindHint"></div>' +
        suggHint +
        '<div style="display:flex; gap:8px; margin-top:4px;">' +
          selectBox('instrTarget', 'קוד יעד (אופציונלי)', targetOptionsHtml) +
          selectBox('instrSystem', 'מערכת גוף', sysOptionsHtml) +
        '</div>' +
      '</div>' +
      '<div class="section">' +
        '<div class="section-title">מחזור חיים</div>' +
        '<div style="display:flex; gap:8px;">' +
          selectBox('instrStatus', 'סטטוס (חובה)', statusOptionsHtml) +
          '<div style="flex:1; min-width:0;"><label class="edit-label">תאריך יעד (DD/MM/YYYY או ריק)</label>' +
            '<input type="text" id="instrDue" value="' + esc(p.dueDate) + '" placeholder="DD/MM/YYYY"></div>' +
        '</div>' +
      '</div>';

    updateInstrKindHint();

    const previewUrl = p.sourceUrl ? p.sourceUrl.replace('/view', '/preview') : '';
    const sourceLink = p.sourceUrl
      ? '<a class="source-link" href="' + p.sourceUrl + '" target="_blank">פתח בלשונית חדשה ↗</a>'
      : '';

    document.getElementById('leftCol').innerHTML =
      '<div class="section">' +
        '<div class="section-title">מטא-דאטה</div>' +
        '<div class="field-row"><div class="field-label">מוסד / רופא</div><div class="field-value">' + esc(p.docIssuer) + '</div></div>' +
        '<div class="field-row"><div class="field-label">תאריך ההנחיה</div><div class="field-value">' + esc(p.instructionDate) + '</div></div>' +
        '<div class="field-row"><div class="field-label">תאריך יעד</div><div class="field-value">' + esc(p.dueDate || '—') + '</div></div>' +
      '</div>' +
      '<div class="section" style="flex:1; display:flex; flex-direction:column; min-height:0;">' +
        '<div class="section-title">📄 מסמך מקור</div>' +
        (previewUrl
          ? '<iframe class="file-preview" src="' + previewUrl + '" frameborder="0" allowfullscreen></iframe>'
          : '<div class="hint">אין מסמך מקור לשורה זו</div>') +
        sourceLink +
      '</div>';
  }

  // ════ [Task #261 שלב 4] רמז ברירת המחדל של האופי לפי הסוג שנבחר ════
  function updateInstrKindHint() {
    const codeSel = document.getElementById('instrCode');
    const kindSel = document.getElementById('instrKind');
    const hintEl  = document.getElementById('instrKindHint');
    if (!codeSel || !kindSel || !hintEl) return;
    const opt = codeSel.options[codeSel.selectedIndex];
    const def = (opt && opt.getAttribute('data-kind')) || '';
    if (!def) { hintEl.innerHTML = ''; return; }
    hintEl.innerHTML = (kindSel.value && kindSel.value !== def)
      ? '<div class="hint">ברירת המחדל לסוג זה: ' + esc(def) + '</div>'
      : '';
  }

  // ════ [Task #261 שלב 4] אישור שורת הנחיה — s15_instrApprove (S15_EnrichCatalog.gs) ════
  function doApproveInstruction() {
    const v = {
      code:          document.getElementById('instrCode').value,
      kind:          document.getElementById('instrKind').value,
      target:        document.getElementById('instrTarget').value,
      medicalSystem: document.getElementById('instrSystem').value,
      status:        document.getElementById('instrStatus').value,
      dueDate:       document.getElementById('instrDue').value.trim()
    };
    if (!v.code)   { handleError({ msg: "❌ יש לבחור סוג הנחיה" }); return; }
    if (!v.kind)   { handleError({ msg: "❌ יש לבחור אופי (מתמשכת / משימה)" }); return; }
    if (!v.status) { handleError({ msg: "❌ יש לבחור סטטוס (פתוח / בוצע / בוטל)" }); return; }
    google.script.run.withSuccessHandler(handleResult).withFailureHandler(handleError)
      .s15_instrApprove(currentPayload.row, v);
  }

  // ════ [Task #263 שלב 5] מצב מעבדה — תצוגת שורה מגליון בדיקות_דם ════
  // ימין: הבדיקה במסמך (תצוגה), קוד LOINC ונתוני קטלוג, מערכת גוף, פאנל
  // (רשימה סגורה), ערך מספרי, יחידה וטווח (O-R, ניתנים לעריכה). שמאל:
  // מטא-דאטה ותצוגת מסמך מקור. קוד מאומת — שדות הקטלוג נעולים.
  function renderLab(p) {
    document.querySelector('.header-title').textContent = '🧪 S15 — אימות מעבדה ומדדים';
    document.getElementById('rowMeta').textContent =
      'שורה ' + p.row + ' מתוך ' + p.lastRow + ' — ' + p.testName;
    document.getElementById('statusBadge').textContent = p.enrichStatus || '—';

    const verified = p.catalogSource === 'verified';
    const lock     = verified ? ' disabled' : '';
    let sourceHint;
    if (verified) {
      sourceHint = '<div class="hint" style="color:#2e7d32; font-weight:bold;">✅ קוד מאומת בקטלוג — נתוני הקטלוג נעולים</div>';
    } else if (p.catalogSource === 'suggested') {
      sourceHint = '<div class="hint" style="color:#e65100; font-weight:bold;">🤖 הצעת Gemini — יש לאמת קוד ונתוני קטלוג</div>';
    } else {
      sourceHint = '<div class="hint">אין הצעה בקטלוג — ניתן להזין קוד ידנית או להשאיר ריק</div>';
    }

    let sysOptionsHtml = '<option value="">— ללא —</option>';
    (p.bodySystemOptions || []).forEach(function(opt) {
      const sel = (opt.code === p.catalog.system) ? ' selected' : '';
      sysOptionsHtml += '<option value="' + esc(opt.code) + '"' + sel + '>' + esc(opt.code) + ' — ' + esc(opt.nameHe) + '</option>';
    });

    let panelOptionsHtml = '<option value="">— בחר —</option>';
    (p.panelOptions || []).forEach(function(opt) {
      const sel = (opt.code === p.panel) ? ' selected' : '';
      panelOptionsHtml += '<option value="' + esc(opt.code) + '"' + sel + '>' + esc(opt.code) + ' — ' + esc(opt.name) + '</option>';
    });

    function inputHtml(id, label, value, extra) {
      return '<div style="flex:1; min-width:0;"><label class="edit-label">' + label + '</label>' +
        '<input type="text" id="' + id + '" value="' + esc(value) + '"' + (extra || '') + '></div>';
    }
    function rowHtml(label, value) {
      return '<div class="field-row"><div class="field-label">' + label + '</div><div class="field-value">' + esc(value) + '</div></div>';
    }

    document.getElementById('rightCol').innerHTML =
      '<div class="section">' +
        '<div class="section-title">הבדיקה במסמך (תצוגה בלבד)</div>' +
        rowHtml('שם הבדיקה', p.testName) + rowHtml('קבוצה', p.category) +
        rowHtml('ערך', p.valueText) + rowHtml('טווח נורמה', p.normalRange) +
        rowHtml('סטטוס', p.labStatus) + rowHtml('סוג דגימה', p.specimen) +
      '</div>' +
      '<div class="section">' +
        '<div class="section-title">קוד LOINC וקטלוג</div>' +
        '<div style="display:flex; gap:8px;">' +
          inputHtml('labCode', 'קוד LOINC (למשל 718-7)', p.code, ' oninput="updateLabCodeHint()"') +
          inputHtml('labComponent', 'שם המאפיין (אנגלית)', p.catalog.name, lock) +
        '</div>' +
        sourceHint + '<div id="labCodeHint"></div>' +
        '<div style="display:flex; gap:8px; margin-top:4px;">' +
          inputHtml('labDesc', 'תיאור (עברית)', p.catalog.desc, lock) +
          '<div style="flex:1; min-width:0;"><label class="edit-label">מערכת גוף</label>' +
            '<select id="labSystem"' + lock + '>' + sysOptionsHtml + '</select></div>' +
        '</div>' +
        // [Task #266] תצוגה בלבד — השרת קובע את השמות: קוד מאומת — שמות הקטלוג; קוד חדש — שם הבדיקה בשורה
        '<div style="margin-top:4px;">' + inputHtml('labRawNames', 'שמות במסמכים (תצוגה — בקוד חדש נשמר שם הבדיקה בלבד)', verified ? p.catalog.raw : p.testName, ' disabled') + '</div>' +
        '<div style="margin-top:4px;"><label class="edit-label">פאנל (חובה, רשימה סגורה)</label>' +
          '<select id="labPanel">' + panelOptionsHtml + '</select></div>' +
      '</div>' +
      '<div class="section">' +
        '<div class="section-title">ערך, יחידה וטווח</div>' +
        '<div style="display:flex; gap:8px;">' +
          inputHtml('labValueNum', 'ערך מספרי', p.valueNum) +
          inputHtml('labUnit', 'יחידה', p.unit) +
          inputHtml('labRefLow', 'גבול תחתון', p.refLow) +
          inputHtml('labRefHigh', 'גבול עליון', p.refHigh) +
        '</div>' +
      '</div>';

    updateLabCodeHint();
    renderLabLeftCol(p);
  }

    // ════ [Task #263 שלב 5] מצב מעבדה — עמודה שמאלית: מטא-דאטה ומסמך מקור ════
  function renderLabLeftCol(p) {
    const previewUrl = p.sourceUrl ? p.sourceUrl.replace('/view', '/preview') : '';
    const sourceLink = p.sourceUrl
      ? '<a class="source-link" href="' + p.sourceUrl + '" target="_blank">פתח בלשונית חדשה ↗</a>'
      : '';

    document.getElementById('leftCol').innerHTML =
      '<div class="section">' +
        '<div class="section-title">מטא-דאטה</div>' +
        '<div class="field-row"><div class="field-label">מוסד / רופא</div><div class="field-value">' + esc(p.docIssuer) + '</div></div>' +
        '<div class="field-row"><div class="field-label">תאריך הבדיקה</div><div class="field-value">' + esc(p.testDate) + '</div></div>' +
        '<div class="field-row"><div class="field-label">הערת רופא</div><div class="field-value">' + esc(p.doctorNote || '—') + '</div></div>' +
      '</div>' +
      '<div class="section" style="flex:1; display:flex; flex-direction:column; min-height:0;">' +
        '<div class="section-title">📄 מסמך מקור</div>' +
        (previewUrl
          ? '<iframe class="file-preview" src="' + previewUrl + '" frameborder="0" allowfullscreen></iframe>'
          : '<div class="hint">אין מסמך מקור לשורה זו</div>') +
        sourceLink +
      '</div>';
  }

  // ════ [Task #263 שלב 5] התראת קוד כפול (לא חוסמת) — לפי knownCodes מהשרת ════
  function updateLabCodeHint() {
    const el = document.getElementById('labCodeHint');
    if (!el || !currentPayload) return;
    const code = document.getElementById('labCode').value.trim().toUpperCase();
    function norm(t) { return String(t || '').toUpperCase().replace(/[^A-Z0-9\u0590-\u05FF]/g, ''); }
    if (!code) { el.innerHTML = '<div class="hint">ללא קוד — הקטלוג לא ישתנה באישור</div>'; return; }
    const known = (currentPayload.knownCodes || {})[code];
    if (!known) { el.innerHTML = '<div class="hint">קוד חדש — ייווסף לקטלוג באישור</div>'; return; }
    const me     = norm(currentPayload.testName);
    const others = (known.raw || []).filter(function(n) { return norm(n) !== me; });
    const label  = (known.source === 'verified' ? 'מאומת' : 'מוצע') + (known.name ? ': ' + known.name : '');
    el.innerHTML = others.length
      ? '<div class="hint" style="color:#c62828; font-weight:bold;">⚠️ הקוד כבר משויך ל: ' + esc(others.join(', ')) +
        ' (' + esc(label) + ') — יש לוודא; האישור מותר</div>'
      : '<div class="hint">קוד ' + esc(label) + '</div>';
  }

  // ════ [Task #263 שלב 5] אישור שורת מעבדה — s15_labApprove (S15_EnrichCatalog.gs) ════
  function doApproveLab() {
    function val(id) { return document.getElementById(id).value.trim(); }
    const v = {
      code:          val('labCode').toUpperCase(),
      componentName: val('labComponent'),
      description:   val('labDesc'),
      rawNames:      val('labRawNames'),
      medicalSystem: document.getElementById('labSystem').value,
      panel:         document.getElementById('labPanel').value,
      valueNum:      val('labValueNum'),
      unit:          val('labUnit'),
      refLow:        val('labRefLow'),
      refHigh:       val('labRefHigh')
    };
    if (!v.panel) { handleError({ msg: "❌ יש לבחור פאנל מהרשימה" }); return; }
    google.script.run.withSuccessHandler(handleResult).withFailureHandler(handleError)
      .s15_labApprove(currentPayload.row, v);
  }

  // ════ [Task #264 שלב 4] מצב גנטיקה — תצוגת שורה מגליון בדיקות_גנטיות ════
  // ימין: התכונה במסמך (תצוגה בלבד, כולל הנטייה), קוד תכונה (בחירה מהקודים
  // המוכרים בלבד) ונתוני קטלוג, פאנל (רשימה סגורה, PNL-G), ומקטע גן — רק
  // כשיש בשורה גן/וריאנט/גנוטיפ/סיווג. שמאל: renderLabLeftCol (ללא שינוי).
  // קוד מאומת — שדות הקטלוג נעולים. שמות המסמכים לא נשלחים מהחלון (#266).
  function renderGen(p) {
    document.querySelector('.header-title').textContent = '🧬 S15 — אימות גנטיקה';
    document.getElementById('rowMeta').textContent =
      'שורה ' + p.row + ' מתוך ' + p.lastRow + ' — ' + p.traitName;
    document.getElementById('statusBadge').textContent = p.enrichStatus || '—';

    const known = p.knownCodes || {};
    const codes = Object.keys(known).sort();
    let codeOptionsHtml = (p.code && known[p.code]) ? '' : '<option value="">— בחר —</option>';
    codes.forEach(function(code) {
      const k   = known[code];
      const sel = (code === p.code) ? ' selected' : '';
      // [Task #229] הסימון לפני הקוד — כדי שלא ייחתך בשם ארוך
      codeOptionsHtml += '<option value="' + esc(code) + '"' + sel + '>' +
        (k.source === 'verified' ? '✅ ' : '🤖 ') + esc(code) + ' — ' + esc(k.name) + '</option>';
    });

    let sysOptionsHtml = '<option value="">— ללא —</option>';
    (p.bodySystemOptions || []).forEach(function(opt) {
      sysOptionsHtml += '<option value="' + esc(opt.code) + '">' + esc(opt.code) + ' — ' + esc(opt.nameHe) + '</option>';
    });

    let panelOptionsHtml = '<option value="">— בחר —</option>';
    (p.panelOptions || []).forEach(function(opt) {
      const sel = (opt.code === p.panel) ? ' selected' : '';
      panelOptionsHtml += '<option value="' + esc(opt.code) + '"' + sel + '>' + esc(opt.code) + ' — ' + esc(opt.name) + '</option>';
    });

    function inputHtml(id, label, value, extra) {
      return '<div style="flex:1; min-width:0;"><label class="edit-label">' + label + '</label>' +
        '<input type="text" id="' + id + '" value="' + esc(value) + '"' + (extra || '') + '></div>';
    }
    function rowHtml(label, value) {
      return '<div class="field-row"><div class="field-label">' + label + '</div><div class="field-value">' + esc(value) + '</div></div>';
    }

    const hasGene = !!(p.geneSymbol || p.geneVariant || p.variantId || p.genotype || p.acmg);
    let geneHtml = '';
    if (hasGene) {
      const geneLock = (p.geneSource === 'verified') ? ' disabled' : '';
      let geneHint;
      if (p.geneSource === 'verified') {
        geneHint = '<div class="hint" style="color:#2e7d32; font-weight:bold;">✅ גן מאומת בקטלוג — נתוני הגן נעולים</div>';
      } else if (p.geneSource === 'suggested') {
        geneHint = '<div class="hint" style="color:#e65100; font-weight:bold;">🤖 הצעת Gemini — הגן ייווסף לקטלוג באישור</div>';
      } else {
        geneHint = '<div class="hint">גן תקין שאינו בקטלוג ייווסף לקטלוג באישור; ריק — ללא גן</div>';
      }
      geneHtml =
        '<div class="section">' +
          '<div class="section-title">גן</div>' +
          '<div style="display:flex; gap:8px;">' +
            inputHtml('genGeneSymbol', 'סמל הגן (למשל MTHFR)', p.geneSymbol) +
            inputHtml('genGeneName', 'שם הגן', p.gene.name, geneLock) +
          '</div>' +
          '<div style="margin-top:4px;">' + inputHtml('genGeneDesc', 'תיאור הגן (עברית)', p.gene.desc, geneLock) + '</div>' +
          geneHint +
          rowHtml('גן או וריאנט במסמך', p.geneVariant) + rowHtml('וריאנט', p.variantId) +
          rowHtml('גנוטיפ', p.genotype) + rowHtml('סיווג ACMG', p.acmg) +
        '</div>';
    }

    document.getElementById('rightCol').innerHTML =
      '<div class="section">' +
        '<div class="section-title">התכונה במסמך (תצוגה בלבד)</div>' +
        rowHtml('שם התכונה', p.traitName) + rowHtml('כותרת הקטע', p.panelName) +
        rowHtml('משמעות', p.significance) + rowHtml('נטייה', p.tendency) +
        rowHtml('המלצה', p.recommendation) +
      '</div>' +
      '<div class="section">' +
        '<div class="section-title">קוד תכונה וקטלוג</div>' +
        '<div style="display:flex; gap:8px;">' +
          '<div style="flex:1; min-width:0;"><label class="edit-label">קוד תכונה (חובה, מהרשימה)</label>' +
            '<select id="genCode" onchange="onGenCodeChange()">' + codeOptionsHtml + '</select></div>' +
          inputHtml('genTraitName', 'שם אחיד (עברית)', '') +
        '</div>' +
        '<div id="genSourceHint"></div><div id="genCodeHint"></div>' +
        '<div style="display:flex; gap:8px; margin-top:4px;">' +
          inputHtml('genDesc', 'תיאור (עברית)', '') +
          '<div style="flex:1; min-width:0;"><label class="edit-label">מערכת גוף</label>' +
            '<select id="genSystem">' + sysOptionsHtml + '</select></div>' +
        '</div>' +
        '<div style="margin-top:4px;"><label class="edit-label">פאנל (חובה, רשימה סגורה)</label>' +
          '<select id="genPanel">' + panelOptionsHtml + '</select></div>' +
      '</div>' +
      geneHtml;

    onGenCodeChange();
    renderLabLeftCol(p);
  }

  // ════ [Task #264 שלב 4] החלפת קוד תכונה — שם, תיאור ומערכת מנתוני הקוד ════
  // קוד מאומת — השדות נעולים; קוד ממתין — ניתנים לעריכה. קוד הנוכחי של
  // השורה — המערכת שבשורה גוברת על הצעת הקוד (כפי שנכתבה בהעשרה).
  function onGenCodeChange() {
    if (!currentPayload) return;
    const p      = currentPayload;
    const code   = document.getElementById('genCode').value;
    const k      = (p.knownCodes || {})[code];
    const isOwn  = (code === p.code);
    const locked = !!(k && k.source === 'verified');

    const nameEl = document.getElementById('genTraitName');
    const descEl = document.getElementById('genDesc');
    const sysEl  = document.getElementById('genSystem');
    nameEl.value = k ? k.name : '';
    descEl.value = k ? k.desc : '';
    sysEl.value  = (isOwn && !locked) ? (p.catalog.system || '') : ((k && k.system) || '');
    nameEl.disabled = locked;
    descEl.disabled = locked;
    sysEl.disabled  = locked;

    let hint;
    if (!code) {
      hint = '<div class="hint" style="color:#c62828;">יש לבחור קוד תכונה מהרשימה</div>';
    } else if (locked) {
      hint = '<div class="hint" style="color:#2e7d32; font-weight:bold;">✅ קוד מאומת בקטלוג — נתוני הקטלוג נעולים</div>';
    } else {
      hint = '<div class="hint" style="color:#e65100; font-weight:bold;">🤖 הצעת Gemini — הקוד ייווסף לקטלוג באישור</div>';
    }
    document.getElementById('genSourceHint').innerHTML = hint;
    updateGenCodeHint();
  }

  // ════ [Task #264 שלב 4] התראת קוד כפול (לא חוסמת) — שמות אחרים על אותו קוד ════
  function updateGenCodeHint() {
    const el = document.getElementById('genCodeHint');
    if (!el || !currentPayload) return;
    const code = document.getElementById('genCode').value;
    const k    = (currentPayload.knownCodes || {})[code];
    if (!k) { el.innerHTML = ''; return; }
    function norm(t) { return String(t || '').toUpperCase().replace(/[^A-Z0-9\u0590-\u05FF]/g, ''); }
    const me     = norm(currentPayload.traitName);
    const others = (k.raw || []).filter(function(n) { return norm(n) !== me; });
    el.innerHTML = others.length
      ? '<div class="hint" style="color:#c62828; font-weight:bold;">⚠️ הקוד כבר משויך ל: ' + esc(others.join(', ')) +
        ' — יש לוודא שזו אותה תכונה; האישור מותר</div>'
      : '';
  }

  // ════ [Task #264 שלב 4] אישור שורת גנטיקה — s15_genApprove (S15_EnrichCatalog.gs) ════
  // geneSymbol: null כשמקטע הגן לא הוצג — השרת לא נוגע בעמודת הגן
  function doApproveGen() {
    function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
    const geneEl = document.getElementById('genGeneSymbol');
    const v = {
      code:            document.getElementById('genCode').value,
      traitName:       val('genTraitName'),
      description:     val('genDesc'),
      medicalSystem:   document.getElementById('genSystem').value,
      panel:           document.getElementById('genPanel').value,
      geneSymbol:      geneEl ? geneEl.value.trim() : null,
      geneName:        val('genGeneName'),
      geneDescription: val('genGeneDesc')
    };
    if (!v.code)  { handleError({ msg: "❌ יש לבחור קוד תכונה מהרשימה" }); return; }
    if (!v.panel) { handleError({ msg: "❌ יש לבחור פאנל מהרשימה" }); return; }
    google.script.run.withSuccessHandler(handleResult).withFailureHandler(handleError)
      .s15_genApprove(currentPayload.row, v);
  }
  function handleError(err) {
    const el = document.getElementById('statusMsg');
    el.className = 'error';
    el.textContent = (err && err.msg) ? err.msg : '❌ שגיאה לא צפויה';
  }

  initUI();
</script>
</body>
</html>