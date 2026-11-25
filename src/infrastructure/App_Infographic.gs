<!DOCTYPE html>
<!--
  MedicalPilot — App_Infographic.html
  @version     1.6.0 | @updated 25/11/2026 21:42 | @service S17
  @git         https://api.github.com/repos/cohenamos07/MedicalPilot/contents/src/infrastructure/App_Infographic.html
  @description דף התצוגה של יישום האינפוגרפיקה לרופא (Task #260) — מצב אירוע:
               מסמך אחד בכל מסך. כותרת = אייקון הבדיקה + קיצור בינלאומי לפי קוד
               האירוע + תאריך (למשל CT · 11.01.2025), קישור למסמך המקור ותווית
               follow-up. רשימת ממצאים ממוספרת (מונח בינלאומי בלבד, תגי צד /
               גודל / גורם / removed / partial) לצד דמות גוף גבר עם סמנים
               ממוספרים לפי קוד איבר וצד; ממצא בלי מיקום — בפס systemic מתחת
               לרשימה. צבע מסגרת לפי חומרה (normal/mild/moderate/severe כמו ב-v5),
               מעוין = s/p (מצב איבר OST1/OST2), נקודה אפורה = שורה שלא אומתה.
               ניווט: הקודם/הבא (מהחדש לישן), רשימה נפתחת ומקשי חצים. גובה
               הדמות מותאם לגובה החלון. בחלון בתוך הגליון — כפתור "סגור וחזרה
               לגליון" והודעה כשלשורה שנבחרה אין רשומות.
               קודים בלבד — לא מוצג טקסט חופשי מהגליון.
               [v1.1.0] לשוניות אירוע | היסטוריה. היסטוריה: כל הרשומות על הדמות,
               מקובצות לפי מיקום (ספירה, צבע החומרה החמורה, "!" לשורה שלא
               אומתה, שקיפות כשאף שורה לא אומתה; ממצא דו-צדדי בשני הצדדים),
               פס systemic, סינון לפי מערכות גוף או התמחות (רק ערכים שיש להם
               רשומות), רשימת רשומות לסמן (תאריך · קיצור · מונח) ← פתיחת המסמך
               במצב אירוע עם "חזרה להיסטוריה", ציר זמן משמאל לימין עם חץ ו-t
               (דקדוק 2.2) ופס HX למחלות רקע (ודאות CRT4).
               [v1.2.0] לשונית מעבדה: שורת אריחים (פאנל לכל אריח — קיצור, אייקון
               מערכת, מספר בדיקות, חריגים) ופאנל אחד פתוח בעמודות לכל רוחב המסך;
               לכל בדיקה: שם בינלאומי, קו מגמה על רקע הטווח התקין, ערך אחרון,
               סימון H/L; לחיצה — גרף מפורט עם קישורים למקור. "חריגים בלבד" —
               מכל הפאנלים. פתיחה משורת מעבדה — הלשונית נפתחת והתוצאות של
               המסמך מודגשות. ההודעה הצהובה — רק בלשונית אירוע, כשהמסמך לא
               נמצא ביומן המצב וגם לא במעבדה.
               [v1.3.0] שש לשוניות: אירוע | היסטוריה | בדיקות | מעבדה | מצב נוכחי |
               גנטיקה. בדיקות: כל מסמכי הבדיקה לפי קוד האירוע של הכותרת — דימות
               (A0), בדיקות תפקוד (A2), אנדוסקופיה (A3), פתולוגיה (A4); אריח לכל
               קבוצה ולכל סוג בדיקה (מספר וצבע החומרה הגבוהה), רשימה מהחדשה לישנה
               (תאריך, סוג, מספר ממצאים, אייקוני איברים) ← פתיחה במצב אירוע עם
               "חזרה לבדיקות". מצב נוכחי: רצועת אלרגיות (A7*, החומר לפי ATC), לוח
               תרופות לפי אזור (כרוניות / זמניות / לפי הצורך / לא מסווגות /
               הסתיימו), הנחיות פתוחות לפי תאריך יעד (באיחור, עד 30 יום, מתמשכת).
               גנטיקה: אריח לכל פאנל PNL-G, שורה לכל תכונה — קוד GTR, סמל גן /
               וריאנט / גנוטיפ, שם התכונה מהקטלוג (עברית), פס נטייה 4 דרגות, ACMG;
               "נטייה בינונית וגבוהה בלבד" מכל הפאנלים. כל הטקסט שאינו מונח
               מקצועי — בעברית (מקרא, כותרות, תוויות); מונחים וקיצורים מקצועיים
               (MRI, CT, CBC, H/L, ATC, ACMG, s/p, post-op, R/L) — באנגלית. אייקון
               איבר ברשימות ההיסטוריה; תווית עליונה בגרף מעבדה מפורט לא נחתכת.
               [v1.4.0] פס פרופיל מטופל בתחילת הסרגל העליון, בכל הלשוניות: סמל מין
               בינלאומי (♂/♀) וגיל; אין נתון — "?" ורקע אפור; אישה — ⚠ (דמות הגוף
               מוצגת כגבר); ערך הדגמה — מסגרת מקווקוות ותג "הדגמה"; פירוט בריחוף.
               [v1.5.0] אזורי "לא תועד" בלשונית מצב נוכחי (תקן IPS): אלרגיות, תרופות
               והנחיות בלי שורות — "לא תועדו · נבדקו N מסמכים" (ולא אזור ריק שנקרא כ"אין");
               הנחיות שכולן בוצעו — "אין הנחיות פתוחות"; שורת אריחים אפורה קבועה "אין מידע
               במסמכים" לחיסונים, מכשור רפואי ושתלים, היסטוריה חברתית ומשפחתית (יחוברו
               לנתונים ב-#271 שלב ב).
               [v1.6.0] היסטוריה — שכבת "מעבדה חריגה" (מתג, כבויה כברירת מחדל): בדיקות שהתוצאה
               האחרונה שלהן חריגה, מקובצות לפי איבר המטרה לסמן אחד עם מונה (עיגול בצבע הסימון H/L/A);
               בלי מיקום — בפס "מערכתי". בחירת סמן (רשומות או מעבדה) — קו כחול מקווקו ועיגול חלול לכל
               איבר ייחוס, ותגיות מטרה/ייחוס ברשימה; לחיצה על בדיקה ברשימה — פתיחה בלשונית מעבדה.
               הסינון לפי מערכת/התמחות חל גם על השכבה. מקרא: מעבדה חריגה, ייחוס.
  @impacts     תצוגה בלבד — אינו כותב לשום גליון. מקבל dataJson מ-s17_renderPage
               (S17_InfographicApp.gs): רשומות, מסמכים, מסמך פתיחה, אייקונים,
               hostMode (web/dialog), requested (found/lab/missing), requestedKey,
               specialties, specialtyFilter, lab, [v1.3.0] now, gen, requested=gen, [v1.4.0] profile. כולל את
               App_BodyModels.html דרך s17_include.
               [v1.5.0] now.docCount — מספר המסמכים שנבדקו.
               [v1.6.0] lab.tests[].organ / secondary / linkFrom, records[].secondary.
  @callers     S17_InfographicApp.gs (s17_renderPage, template.evaluate)
  @functions   eventAbbr | dotDate | esc | iconImg | iconBox | sideChip | chipsFor |
               labelFor | itemRow | positionsFor | bodySvg | render | buildSelect |
               go (JS פנימי בעמוד) | [v1.1.0] sevColor | sevRank | layoutPoint |
               pctPos | legendHtml | renderEvent | matchesFilter | filteredIndexes |
               filterButtonsHtml | buildGroups | groupMarkHtml | recListHtml |
               timelineHtml | renderHistory | openRecord | setMode | [v1.2.0]
               panelAbbr | lastPoint | isAbnormal | fmtNum | trendSvg | hasFile |
               renderLab | [v1.3.0] todayTs | medZone | doseText | medRowHtml |
               insRowHtml | renderNow | genPanelName | genHasFile | tendBarHtml |
               genRowHtml | renderGen | testDocs | renderTests | [v1.4.0] renderProfile | [v1.5.0] NOT_DOC_DOMAINS |
               [v1.6.0] organPoint | organLabel | labMatchesFilter | labLayerTests |
               labGroups | labMarkHtml | linkOverlaySvg | secondaryHtml | labRefs | labSelHtml
  @changes     [v1.6.0] Task #269 שלב 8 — שכבת מעבדה חריגה וקישור מטרה↔ייחוס בלשונית
               היסטוריה (renderHistory, legendHtml, עיצוב .lmark/.linksvg/.refs); הפונקציות משותפות
               לחלופה ב (#250). אומת: diff מדויק מול העורך, הדמיה ובדיקה בפועל (4 צעדים).
               [v1.5.0] Task #283 — אזורי "לא תועד" (renderNow, NOT_DOC_DOMAINS, עיצוב
               .notdoc ו-.ndstrip). אומת: diff מדויק מול העורך, בדיקת תחביר, הדמיה של
               שני מקרים ובדיקה בפועל.
               [v1.4.0] Task #271 שלב א — פס פרופיל מטופל (renderProfile, אלמנט #profile
               בסרגל, עיצוב .profile). אומת: diff מדויק מול העורך, בדיקת תחביר,
               הדמיה של 4 מקרים ובדיקה בפועל.
               [v1.3.0] Task #260 שלב 4 — לשוניות בדיקות, מצב נוכחי וגנטיקה; מעבר
               לעברית בכל טקסט שאינו מונח מקצועי; קישור חזרה משותף להיסטוריה
               ולבדיקות (state.cameFrom); אייקון איבר ברשימות ההיסטוריה; תיקון
               חיתוך התווית העליונה בגרף מעבדה מפורט.
               [v1.2.0] Task #260 שלב 3 — לשונית מעבדה (אריחי פאנלים, מגמות, חריגים,
               הדגשת המסמך שנבחר) ותיקון ההודעה הצהובה.
-->
<html dir="rtl" lang="he">
<head>
<base target="_top">
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #f4f6f8; color: #1f2a30;
         font-family: "Segoe UI", Arial, "Noto Sans Hebrew", sans-serif; font-size: 15px; }
  .app { max-width: 1240px; margin: 0 auto; padding: 8px 14px; }

  /* ── ניווט ── */
  .nav { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
  .nav button { border: 1px solid #c9d3d8; background: #fff; border-radius: 8px; padding: 7px 14px;
                font-size: 15px; cursor: pointer; }
  .nav button:disabled { opacity: .4; cursor: default; }
  .nav select { flex: 1; min-width: 220px; padding: 7px 8px; border: 1px solid #c9d3d8;
                border-radius: 8px; font-size: 14px; background: #fff; }
  .nav .count { color: #5b6b73; font-size: 13px; min-width: 52px; text-align: center; }
  .nav .exit { background: #1f2a30; color: #fff; border-color: #1f2a30; }
  .notice { background: #fff9db; border: 1px solid #f2c400; border-radius: 8px; padding: 6px 12px;
            margin-bottom: 8px; font-size: 14px; color: #5b4a00; }

  /* ── כרטיס ── */
  .card { background: #fff; border-radius: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.08); padding: 12px 18px; }
  .head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 6px; }
  .head .evicon { width: 40px; height: 40px; object-fit: contain; }
  .head .title { font-size: 21px; font-weight: 700; }
  .head .spacer { flex: 1; }
  .chip { display: inline-flex; align-items: center; gap: 4px; border: 1px solid #c9d3d8;
          border-radius: 6px; padding: 1px 7px; font-size: 13px; color: #36464e; background: #fff;
          white-space: nowrap; direction: ltr; }
  .chip.side { background: #1565c0; color: #fff; border-color: #1565c0; font-weight: 700; }
  .followup { display: inline-flex; align-items: center; gap: 8px; border: 1px solid #c9d3d8;
              border-radius: 8px; padding: 6px 12px; color: #36464e; }
  .followup img { width: 28px; height: 28px; }
  .srclink { font-size: 13px; color: #00828e; text-decoration: none; }

  .main { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
  @media (max-width: 900px) { .main { grid-template-columns: 1fr; } .main .list { max-height: none; } }

  /* ── רשימת ממצאים ── */
  .list { display: flex; flex-direction: column; max-height: calc(100vh - 250px); overflow-y: auto; }
  .item { display: flex; align-items: center; gap: 10px; padding: 8px 2px; border-bottom: 1px solid #eef1f3;
          direction: ltr; }
  .num { flex: 0 0 24px; height: 24px; border-radius: 50%; background: #1f2a30; color: #fff;
         font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .label { font-weight: 700; font-size: 16px; }
  .label.muted { font-weight: 400; color: #8a979d; font-size: 14px; direction: rtl; }
  .chips { display: inline-flex; gap: 5px; flex-wrap: wrap; margin-left: 6px; }
  .txt { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }

  /* ── מסגרת אייקון לפי חומרה ── */
  .ic { flex: 0 0 48px; width: 48px; height: 48px; border: 4px solid #9aa6ab; border-radius: 6px;
        background: #f1f3f4; display: flex; align-items: center; justify-content: center; position: relative; }
  .ic img { width: 36px; height: 36px; object-fit: contain; }
  .ic .code { font-size: 10px; font-weight: 700; color: #36464e; }
  .ic.sev-normal   { border-color: #2e9d4a; background: #e9f6ec; border-radius: 50%; }
  .ic.sev-mild     { border-color: #f2c500; background: #fff8d6; }
  .ic.sev-moderate { border-color: #ea6a00; background: #ffe6d1; }
  .ic.sev-severe   { border-color: #d32f2f; background: #fde4e4; }
  .ic.sev-unknown  { border-color: #9aa6ab; background: #f1f3f4; }
  /* [1ב] שורה שלא אומתה — נקודה אפורה קטנה בפינת האייקון (במקום תג) */
  .ic .draftdot { position: absolute; bottom: -5px; left: -5px; width: 9px; height: 9px; border-radius: 50%;
                  background: #8a979d; border: 2px solid #fff; }
  .ic.sp { border-radius: 4px; transform: rotate(45deg) scale(.82); }
  .ic.sp img, .ic.sp .code { transform: rotate(-45deg); }
  .ic.removed img { opacity: .45; }

  /* ── דמות הגוף ── */
  .bodywrap { position: relative; }
  /* גובה הדמות מותאם לגובה החלון — כל המסך נכנס בלי גלילה */
  .bodybox { position: relative; height: calc(100vh - 250px); min-height: 380px;
             aspect-ratio: 650 / 930; max-width: 100%; margin: 0 auto; }
  .bodybox svg { display: block; width: 100%; height: 100%; }
  .bodybox svg path { fill: #e9edf2; stroke: #c3ccd6; stroke-width: 2; }
  .sidelbl { position: absolute; top: 4px; font-size: 22px; font-weight: 700; color: #5b6b73; }
  /* גודל הסמן יחסי לרוחב הדמות (8.4% = 55 יחידות דמות) — לא מתנגש בגובה חלון קטן */
  .marker { position: absolute; transform: translate(-50%, -50%); width: 8.4%; }
  .marker .ic { flex: none; width: 100%; height: auto; aspect-ratio: 1 / 1; border-width: 2px; }
  .marker .ic img { width: 72%; height: 72%; }
  .marker .ic .code { font-size: 8px; }
  .marker .num { position: absolute; top: -8px; right: -8px; width: 17px; height: 17px; font-size: 10px; }

  .systemic { border: 2px dashed #9aa6ab; border-radius: 10px; padding: 8px 12px; margin-top: 10px; direction: ltr; }
  .systemic .ttl { font-size: 13px; color: #5b6b73; font-weight: 700; margin-bottom: 4px; }
  .systemic .item { border-bottom: none; }

  /* ── מקרא ── */
  .legend { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; border-top: 1px solid #eef1f3;
            margin-top: 6px; padding-top: 6px; direction: ltr; font-size: 14px; color: #36464e; }
  .legend .sw { display: inline-block; width: 16px; height: 16px; border: 3px solid; border-radius: 3px;
                vertical-align: middle; margin-right: 5px; }
  .legend .sw.circle { border-radius: 50%; }
  .legend .sw.diamond { transform: rotate(45deg) scale(.8); border-color: #9aa6ab; }

  /* ── [שלב 2] לשוניות אירוע / היסטוריה ── */
  .tabs { display: inline-flex; border: 1px solid #c9d3d8; border-radius: 8px; overflow: hidden; }
  .tabs button { border: none !important; border-radius: 0 !important; background: #fff; }
  .tabs button.active { background: #00828e; color: #fff; font-weight: 700; }
  .docnav { display: contents; }
  .docnav.hidden { display: none; }
  .backlink { font-size: 13px; color: #00828e; cursor: pointer; text-decoration: underline; }

  /* ── [Task #271] פס פרופיל מטופל — מין וגיל ── */
  .profile { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #1565c0;
             border-radius: 8px; padding: 4px 10px; background: #fff; color: #1565c0;
             font-weight: 700; direction: ltr; cursor: default; }
  .profile .sex  { font-size: 20px; line-height: 1; }
  .profile .age  { font-size: 17px; }
  .profile .warn { color: #ea6a00; font-size: 16px; }
  .profile .demo { font-size: 11px; font-weight: 400; color: #8a979d; border: 1px dashed #8a979d;
                   border-radius: 4px; padding: 0 4px; direction: rtl; }
  .profile.isdemo { border-style: dashed; }
  .profile.nodata { border-color: #b0bec5; color: #90a4ae; background: #eceff1; }

  /* ── [שלב 2] היסטוריה: סינון, סמנים מקובצים, רשימה, ציר זמן ── */
  .ftype { display: flex; gap: 14px; font-size: 14px; margin-bottom: 6px; }
  .fbtns { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  .fbtn { border: 1px solid #c9d3d8; border-radius: 14px; padding: 3px 10px; font-size: 13px; cursor: pointer;
          background: #fff; }
  .fbtn.active { background: #00828e; color: #fff; border-color: #00828e; }
  .hbody { height: calc(100vh - 330px); min-height: 330px; }
  .hlist { max-height: calc(100vh - 330px); }
  .gmark { cursor: pointer; }
  .gmark.dim .ic { opacity: .5; }
  .gmark.sel .ic { box-shadow: 0 0 0 3px #1f2a30; }
  .gmark .cnt { position: absolute; top: -8px; right: -8px; min-width: 17px; height: 17px; border-radius: 9px;
                background: #1f2a30; color: #fff; font-size: 10px; font-weight: 700; display: flex;
                align-items: center; justify-content: center; padding: 0 3px; }
  .gmark .warn { position: absolute; bottom: -7px; left: -7px; width: 15px; height: 15px; border-radius: 50%;
                 background: #ea6a00; color: #fff; font-size: 11px; font-weight: 700; display: flex;
                 align-items: center; justify-content: center; }
  .srow { display: flex; flex-wrap: wrap; gap: 14px; padding: 6px 4px; }
  .srow .gmark { position: relative; transform: none; width: 44px; }
  .srow .gmark .ic { width: 44px; height: 44px; border-width: 3px; }
  .srow .gmark .ic img { width: 30px; height: 30px; }
  /* [Task #269] סמן מעבדה חריגה, קישור מטרה ↔ ייחוס, מתג השכבה */
  .lab { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px;
         border-radius: 50%; color: #fff; font-size: 12px; font-weight: 700; border: 2px solid #fff;
         box-shadow: 0 0 0 1px #90a4ae; flex: none; }
  .lmark { cursor: pointer; display: flex; justify-content: center; }
  .marker.lmark .lab { width: 62%; height: auto; aspect-ratio: 1 / 1; font-size: 11px; }
  .lmark.dim .lab { opacity: .5; }
  .lmark.sel .lab { box-shadow: 0 0 0 3px #1f2a30; }
  .srow .lmark { position: relative; transform: none; width: 44px; }
  .srow .lmark .lab { width: 30px; height: 30px; }
  .bodybox svg.linksvg { position: absolute; top: 0; left: 0; pointer-events: none; }
  .linksvg line { stroke: #1565c0; stroke-width: 3; stroke-dasharray: 10 7; }
  .linksvg circle { fill: none; stroke: #1565c0; stroke-width: 3; }
  .labtoggle { display: block; font-size: 13px; margin: 2px 0 6px; cursor: pointer; }
  .refs { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 13px; margin-top: 6px; direction: ltr; }
  .refs .ttl { font-weight: 700; color: #5b6b73; }
  .refs .ref { border: 1px dashed #1565c0; color: #1565c0; border-radius: 10px; padding: 1px 8px; }
  .refs .ref.nopos { border-color: #9aa6ab; color: #5b6b73; }
  .legend .lab { width: 18px; height: 18px; font-size: 10px; margin-right: 5px; vertical-align: middle; }
  .legend .lnk { display: inline-block; width: 26px; border-top: 3px dashed #1565c0; vertical-align: middle; margin-right: 5px; }
  .recs { border-top: 1px solid #eef1f3; margin-top: 8px; padding-top: 6px; }
  .recs .ttl { font-size: 13px; color: #5b6b73; font-weight: 700; margin-bottom: 4px; }
  .rec { display: flex; align-items: center; gap: 8px; padding: 5px 4px; cursor: pointer; direction: ltr;
         border-radius: 6px; font-size: 14px; }
  .rec:hover { background: #f1f5f6; }
  .rec .dot { width: 11px; height: 11px; border-radius: 50%; flex: none; }
  .rec .ri { width: 22px; height: 22px; flex: none; display: flex; align-items: center; justify-content: center; }
  .rec .ri img { width: 22px; height: 22px; object-fit: contain; }
  .rec .d { color: #5b6b73; min-width: 78px; }
  .rec .a { font-weight: 700; min-width: 54px; }
  .rec.unv { opacity: .6; }
  .timeline { border-top: 1px solid #eef1f3; margin-top: 6px; padding-top: 4px; }
  .timeline svg { display: block; width: 100%; height: auto; }
  .timeline circle, .timeline .lane { cursor: pointer; }
  .empty { color: #8a979d; font-size: 14px; padding: 20px 0; text-align: center; }

  /* ── [שלב 3] מעבדה: כרטיס לפאנל, שורה לבדיקה עם קו מגמה ── */
  .labbar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 8px; }
  .labbar label { font-size: 14px; margin-right: 10px; }
  /* [3ב] שורת אריחי פאנלים — תמונת מצב של כל הפאנלים במבט אחד */
  .tiles { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; direction: ltr; }
  .tile { display: flex; align-items: center; gap: 6px; border: 1px solid #c9d3d8; border-radius: 10px;
          padding: 5px 10px; cursor: pointer; background: #fff; font-size: 14px; }
  .tile img { width: 22px; height: 22px; object-fit: contain; }
  .tile b { font-size: 14px; }
  .tile .n { color: #78909c; font-size: 12px; }
  .tile .abn { background: #d32f2f; color: #fff; border-radius: 9px; padding: 0 6px; font-size: 12px; font-weight: 700; }
  .tile.active { border-color: #00828e; box-shadow: 0 0 0 2px #00828e; }
  .tile.hl { background: #fff8d6; }
  /* [3ב] בדיקות הפאנל הפתוח — עמודות לכל רוחב המסך, בלי שטח מת */
  .tgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); column-gap: 18px;
           align-content: start; max-height: calc(100vh - 290px); overflow-y: auto; direction: ltr; }
  .trow.hl { background: #fff8d6; }
  .tdetail { grid-column: 1 / -1; }
  .trow { display: grid; grid-template-columns: 128px 100px 1fr 24px; align-items: center; gap: 6px;
          padding: 1px 2px; border-top: 1px solid #f0f3f4; cursor: pointer; font-size: 14px; }
  .trow:hover { background: #f6f9fa; }
  .trow .tn { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; position: relative; }
  .trow .tv { white-space: nowrap; }
  .trow .tv small { color: #78909c; }
  .trow .tf { font-weight: 700; text-align: center; border-radius: 4px; color: #fff; font-size: 12px; }
  .tf.H, .tf.A { background: #d32f2f; } .tf.L { background: #1565c0; }
  .trow svg { display: block; width: 100px; height: 26px; }
  .tdetail { border-top: 1px dashed #c9d3d8; border-bottom: 1px dashed #c9d3d8; padding: 6px 2px; }
  .tdetail svg { display: block; width: 100%; height: auto; }
  .tdetail a { color: #00828e; font-size: 12px; }
  .ddot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #8a979d; margin-left: 4px;
          vertical-align: middle; }

  /* ── [שלב 4] עכשיו: רצועת אלרגיות, לוח תרופות, הנחיות פתוחות ── */
  .nowwrap { max-height: calc(100vh - 150px); overflow-y: auto; direction: ltr; }
  .allergy { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; background: #fde4e4;
             border: 2px solid #d32f2f; border-radius: 10px; padding: 6px 10px; margin-bottom: 10px; font-size: 14px; }
  .allergy .ttl { font-weight: 700; color: #b71c1c; }
  .allergy .al { background: #fff; border: 1px solid #d32f2f; border-radius: 12px; padding: 2px 10px; }
  .allergy.none { background: #f1f3f4; border-color: #c9d3d8; color: #5b6b73; }
  .nowgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 12px; align-items: start; }
  .nowcol { display: flex; flex-direction: column; gap: 12px; }
  .zone { border: 1px solid #dfe5e8; border-radius: 10px; padding: 6px 8px; }
  .zone .zt { font-weight: 700; font-size: 14px; color: #36464e; margin-bottom: 4px; display: flex; gap: 6px; align-items: center; }
  .zone .zt .n { color: #78909c; font-weight: 400; font-size: 12px; }
  /* [Task #283] אזורי "לא תועד" — אפור אחיד, מסגרת מקווקוות */
  .zone.notdoc { background: #f1f3f4; border: 1px dashed #c9d3d8; }
  .zone.notdoc .nd { color: #5b6b73; font-size: 13px; }
  .ndstrip { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 12px; font-size: 14px; color: #5b6b73; }
  .ndstrip .ttl { font-weight: 700; }
  .ndstrip .tile { background: #f1f3f4; border: 1px dashed #c9d3d8; border-radius: 10px; padding: 4px 12px; color: #36464e; }
  .med { display: grid; grid-template-columns: 26px 1fr auto auto; gap: 8px; align-items: center; padding: 3px 2px;
         border-top: 1px solid #f0f3f4; font-size: 14px; }
  .med img { width: 22px; height: 22px; object-fit: contain; }
  .med .inn { font-weight: 600; }
  .med .atc { color: #78909c; font-size: 12px; margin-left: 4px; }
  .med .dose { white-space: nowrap; color: #36464e; }
  .med .since { font-size: 12px; color: #78909c; white-space: nowrap; }
  .med .sub { grid-column: 2 / 5; font-size: 12px; color: #78909c; }
  .med.ended { opacity: .5; }
  .prog { display: inline-block; width: 70px; height: 6px; background: #e3e8ea; border-radius: 3px;
          vertical-align: middle; margin: 0 4px; overflow: hidden; }
  .prog i { display: block; height: 100%; background: #00828e; }
  .ins { display: grid; grid-template-columns: 26px 92px 1fr auto; gap: 6px; align-items: center; padding: 4px 2px;
         border-top: 1px solid #f0f3f4; font-size: 14px; }
  .ins img { width: 22px; height: 22px; object-fit: contain; }
  .ins .k { font-weight: 700; }
  .ins .due { white-space: nowrap; color: #36464e; }
  .due.over { color: #fff; background: #d32f2f; border-radius: 4px; padding: 0 5px; font-weight: 700; }
  .due.soon { color: #fff; background: #ea6a00; border-radius: 4px; padding: 0 5px; font-weight: 700; }
  .ins.done { opacity: .5; }
  .ins.done .k { text-decoration: line-through; }
  .kchip { font-size: 11px; border: 1px solid #c9d3d8; border-radius: 8px; padding: 0 5px; color: #5b6b73; }

  /* ── [שלב 4] גנטיקה: אריח לפאנל, שורה לתכונה עם פס נטייה ── */
  .ggrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(580px, 1fr)); column-gap: 18px;
           align-content: start; max-height: calc(100vh - 290px); overflow-y: auto; direction: ltr; }
  .grow { display: grid; grid-template-columns: 24px 64px 150px 1fr 118px 36px 74px; gap: 6px; align-items: center;
          padding: 3px 2px; border-top: 1px solid #f0f3f4; font-size: 14px; }
  .grow.hl { background: #fff8d6; }
  .grow img { width: 20px; height: 20px; object-fit: contain; }
  .grow .gc { font-weight: 700; font-size: 13px; }
  .grow .gg { display: flex; flex-wrap: wrap; gap: 3px; }
  .grow .gn { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right; }
  .grow .gd { font-size: 12px; white-space: nowrap; }
  .grow .gd a { color: #00828e; }
  .tbar { display: flex; align-items: center; gap: 2px; }
  .tbar i { display: inline-block; width: 14px; height: 9px; border-radius: 2px; background: #e3e8ea; }
  .tbar b { font-size: 11px; margin-left: 4px; min-width: 48px; }
  .acmg { font-size: 11px; font-weight: 700; border: 1px solid #9aa6ab; border-radius: 4px; text-align: center; }
  .acmg.P, .acmg.LP { background: #d32f2f; color: #fff; border-color: #d32f2f; }
  .acmg.VUS { background: #fff8d6; border-color: #f2c500; }

  /* ── [שלב 4] בדיקות: שורת אריחים לכל קבוצה, רשימת בדיקות ── */
  .tgroup { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 6px; }
  .tile .sev { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
  .stlist { max-height: calc(100vh - 330px); overflow-y: auto; border-top: 1px solid #eef1f3; margin-top: 4px; }
  .strow { display: grid; grid-template-columns: 14px 92px 90px 80px 1fr; gap: 8px; align-items: center;
           padding: 6px 4px; border-bottom: 1px solid #f0f3f4; cursor: pointer; font-size: 14px; direction: ltr; }
  .strow:hover { background: #f1f5f6; }
  .strow.unv { opacity: .6; }
  .strow .dot { width: 11px; height: 11px; border-radius: 50%; }
  .strow .d { color: #5b6b73; }
  .strow .a { font-weight: 700; }
  .strow .c { color: #5b6b73; font-size: 13px; direction: rtl; text-align: left; }
  .strow .ics { display: flex; flex-wrap: wrap; gap: 4px; }
  .strow .ics img { width: 22px; height: 22px; object-fit: contain; }

  .footer { color: #8a979d; font-size: 12px; margin-top: 4px; text-align: center; }
  .error { background: #fde4e4; color: #7f0000; padding: 16px; border-radius: 10px; }
</style>
</head>
<body>
<div class="app">
  <div class="nav">
    <span class="profile" id="profile" dir="ltr"></span>
    <span class="tabs">
      <button id="tabEvent" type="button">אירוע</button>
      <button id="tabHistory" type="button">היסטוריה</button>
      <button id="tabTests" type="button">בדיקות</button>
      <button id="tabLab" type="button">מעבדה</button>
      <button id="tabNow" type="button">מצב נוכחי</button>
      <button id="tabGen" type="button">גנטיקה</button>
    </span>
    <span class="docnav" id="docNav">
      <button id="btnPrev" type="button">› הקודם</button>
      <select id="docSelect"></select>
      <span class="count" id="docCount" dir="ltr"></span>
      <button id="btnNext" type="button">הבא ‹</button>
    </span>
    <button id="btnExit" type="button" class="exit" style="display:none">✕ סגור וחזרה לגליון</button>
  </div>
  <div class="notice" id="notice" style="display:none"></div>
  <div class="card" id="card"></div>
  <div class="footer" id="footer"></div>
</div>

<?!= s17_include('App_BodyModels'); ?>

<script>
var DATA = <?!= dataJson ?>;

// [1ב] ארבעה צבעי חומרה כמו ב-v5; קריטי (SEV3) מוצג כ-severe
var SEV_CLASS = { SEV5: "sev-normal", SEV0: "sev-mild", SEV1: "sev-moderate",
                  SEV2: "sev-severe", SEV3: "sev-severe", SEV4: "sev-unknown" };

// [1ב] קיצור בינלאומי לכותרת המסמך — לפי קוד האירוע בלבד (לא טקסט מהגליון)
var EVENT_ABBR = {
  A0: "IMAGING", A0A: "MRI", A0B: "CT", A0C: "US", A0D: "X-RAY", A0E: "PET-CT", A0F: "NM", A0G: "MMG", A0H: "DEXA",
  A1: "LAB", A2: "TEST", A2A: "ECG", A2B: "ECHO", A2C: "HOLTER", A2D: "STRESS", A2E: "PFT", A2F: "EEG", A2G: "EMG",
  A2H: "PSG", A2I: "UDS", A2J: "AUDIO", A3: "ENDO", A3A: "COLONO", A3B: "GASTRO", A3C: "CYSTO", A3D: "BRONCHO",
  A3E: "CATH", A4: "PATH", A4A: "BIOPSY", A4B: "HISTO", A4C: "CYTO", A5: "EXAM", A6: "ADMISSION", A6A: "DISCHARGE",
  A6B: "SURGERY", A7: "ALLERGY", A7A: "ALLERGY", A7B: "INTOLERANCE", A7C: "ADR", A8: "DX", A8A: "DX", A8B: "HX"
};
function eventAbbr(code) {
  if (!code) return "—";
  return EVENT_ABBR[code] || EVENT_ABBR[code.substring(0, 2)] || code;
}
// תאריך DD/MM/YYYY → DD.MM.YYYY
function dotDate(d) { return d ? d.replace(/\//g, ".") : "—"; }
var MARKER_MIN_DIST = 54;   // מרחק מינימלי בין סמנים (יחידות הדמות)
var BODY_MIDLINE_X  = 364;  // קו האמצע של הדמות
// הזזות לניסיון בהתנגשות (s = כלפי חוץ, לצד של האיבר): צד, מטה, אלכסון, מעלה, רחוק יותר.
// סמן של איבר צדדי לעולם לא עובר את קו האמצע לצד השני.
var MARKER_OFFSETS  = [[0,0],[1,0],[0,1],[1,1],[0,-1],[1,-1],[-1,0],[-1,1],[-1,-1],
                       [2,0],[0,2],[2,1],[-2,0],[2,-1],[0,-2]];
var MARKER_STEP     = 56;

// סדר המסמכים בתצוגה: מהחדש לישן — "הבא" עובר למסמך המוקדם יותר
if (DATA.docs && DATA.docs.length) {
  DATA.docs.reverse();
  DATA.startDoc = DATA.docs.length - 1 - (DATA.startDoc || 0);
}
var docIndex = DATA.startDoc || 0;

// חיתוך תצוגת הדמות: מהראש עד מתחת לברכיים (y 90-1020) — הדמות גדולה יותר בגובה החלון
var BODY_VIEW = { x: 40, y: 90, w: 650, h: 930 };

// [שלב 2] מצב התצוגה — אירוע (מסמך אחד) או היסטוריה (כל הרשומות על הדמות)
var state = { mode: "event", filterType: "system", filterValue: "ALL", selectedGroup: null,
              showBackground: false, cameFrom: "", testsSel: "",
              labPanel: "", labAbnormalOnly: false, labOpen: null, labHighlight: "",
              nowShowEnded: false, nowShowDone: false,
              genPanel: "", genElevatedOnly: false, genHighlight: "" };
var BACKGROUND_CERTAINTY = "CRT4";   // מחלת רקע — פס נפרד בציר הזמן
var SEV_COLOR = { SEV5: "#2e9d4a", SEV0: "#f2c500", SEV1: "#ea6a00", SEV2: "#d32f2f",
                  SEV3: "#d32f2f", SEV4: "#9aa6ab" };
var SEV_RANK  = { SEV5: 0, SEV4: 1, SEV0: 2, SEV1: 3, SEV2: 4, SEV3: 5 };
function sevColor(code) { return SEV_COLOR[code] || "#9aa6ab"; }
function sevRank(code) { return SEV_RANK.hasOwnProperty(code) ? SEV_RANK[code] : 1; }

// מיקום סמן בלי התנגשות — משותף לאירוע ולהיסטוריה. מחזיר [x, y] ומוסיף ל-used.
function layoutPoint(pt, used) {
  var x = pt[0], y = pt[1];
  var outward = pt[0] < BODY_MIDLINE_X ? -1 : 1;
  for (var k = 0; k < MARKER_OFFSETS.length; k++) {
    var cx = pt[0] + MARKER_OFFSETS[k][0] * MARKER_STEP * outward;
    var cy = pt[1] + MARKER_OFFSETS[k][1] * MARKER_STEP;
    if (pt[0] !== BODY_MIDLINE_X && (cx - BODY_MIDLINE_X) * (pt[0] - BODY_MIDLINE_X) <= 0) continue;
    var clash = used.some(function(u) {
      return Math.abs(u[0] - cx) < MARKER_MIN_DIST && Math.abs(u[1] - cy) < MARKER_MIN_DIST; });
    if (!clash) { x = cx; y = cy; break; }
  }
  used.push([x, y]);
  return [x, y];
}
function pctPos(xy) {
  return "left:" + ((xy[0] - BODY_VIEW.x) / BODY_VIEW.w * 100).toFixed(2) + "%;top:" +
         ((xy[1] - BODY_VIEW.y) / BODY_VIEW.h * 100).toFixed(2) + "%";
}

function esc(s) {
  return String(s === null || s === undefined ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function iconImg(key) {
  var uri = key ? DATA.icons[key] : "";
  return uri ? '<img src="' + uri + '" alt="">' : "";
}

// אייקון ממצא: איבר → מערכת → אירוע; אם אין — קוד האיבר כטקסט
function iconBox(rec, extraClass) {
  var cls = "ic " + (SEV_CLASS[rec.severity.code] || "sev-unknown");
  var isSp = rec.stateCode === "OST1" || rec.stateCode === "OST2";
  if (isSp) cls += " sp";
  if (rec.stateCode === "OST2") cls += " removed";
  if (extraClass) cls += " " + extraClass;
  var inner = iconImg(rec.markerIconKey) || iconImg(rec.eventIconKey)
    || '<span class="code">' + esc(rec.organ.code || rec.systemCode || "?") + '</span>';
  if (!rec.verified && extraClass !== "onbody") inner += '<span class="draftdot" title="שורה שעדיין לא אומתה"></span>';
  var tip = (rec.organ.name || rec.system || "") + (rec.severity.name ? " · " + rec.severity.name : "");
  return '<div class="' + cls + '" title="' + esc(tip) + '">' + inner + '</div>';
}

function sideChip(code) {
  if (code === "LAT1") return '<span class="chip side">R</span>';
  if (code === "LAT2") return '<span class="chip side">L</span>';
  if (code === "LAT3") return '<span class="chip side">R+L</span>';
  return "";
}

function chipsFor(rec) {
  var out = sideChip(rec.sideCode);
  if (rec.findingSize) out += '<span class="chip">' + esc(rec.findingSize) + '</span>';
  var cause = (rec.findingCause || "").trim();
  if (cause) {
    out += /^post-?op$/i.test(cause)
      ? '<span class="chip">&#9998; post-op</span>'
      : '<span class="chip">&#8592; ' + esc(cause) + '</span>';
  }
  if (rec.stateCode === "OST2") out += '<span class="chip">&#10005; הוסר</span>';
  if (rec.stateCode === "OST1") out += '<span class="chip">&#9680; חלקי</span>';
  return out;
}

// [1ב] קודים בלבד — המונח הבינלאומי (Finding_Term). בלי נפילה לטקסט חופשי.
function labelFor(rec) {
  return rec.findingTerm ? '<span class="label">' + esc(rec.findingTerm) + '</span>' : "";
}

function itemRow(rec, n) {
  return '<div class="item"><span class="num">' + n + '</span>' + iconBox(rec) +
         '<div class="txt">' + labelFor(rec) + '<span class="chips">' + chipsFor(rec) + '</span></div></div>';
}

// מיקומי הסמן לרשומה: רשימת נקודות (שתיים לדו-צדדי), או ריקה = מערכתי
function positionsFor(rec) {
  var pos = S17_ORGAN_POS[rec.organ.code] || S17_ORGAN_POS[rec.systemCode];
  if (!pos) return [];
  var side = rec.sideCode;
  if (side === "LAT1") return [pos.r || pos.c].filter(Boolean);
  if (side === "LAT2") return [pos.l || pos.c].filter(Boolean);
  if (side === "LAT3") return (pos.r && pos.l) ? [pos.r, pos.l] : [pos.c].filter(Boolean);
  return [pos.c].filter(Boolean);
}

function bodySvg() {
  var vb = BODY_VIEW;
  var paths = S17_BODY_MALE_FRONT.paths.map(function(d) { return '<path d="' + d + '"/>'; }).join("");
  return '<svg viewBox="' + vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h + '" xmlns="http://www.w3.org/2000/svg">' +
         paths + '</svg>';
}

// [שלב 2] מקרא משותף לשני המצבים
function legendHtml(withHistory) {
  return '<div class="legend">' +
    '<span><span class="sw circle" style="border-color:#2e9d4a"></span>תקין</span>' +
    '<span><span class="sw" style="border-color:#f2c500"></span>קל</span>' +
    '<span><span class="sw" style="border-color:#ea6a00"></span>בינוני</span>' +
    '<span><span class="sw" style="border-color:#d32f2f"></span>חמור</span>' +
    '<span><span class="sw diamond"></span>s/p</span>' +
    '<span>&#10005; הוסר</span><span>&#9998; post-op</span>' +
    (withHistory ? '<span><b>N</b> = מספר רשומות</span><span style="color:#ea6a00"><b>!</b> לא אומת</span>' : '') +
    // [Task #269] שכבת מעבדה וקישור מטרה ↔ ייחוס
    (withHistory ? '<span><span class="lab" style="background:#d32f2f">H</span>מעבדה חריגה</span>' +
                   '<span><span class="lnk"></span>ייחוס</span>' : '') +
    '</div>';
}

function render() {
  var card = document.getElementById("card");
  if (DATA.error) { card.innerHTML = '<div class="error">' + esc(DATA.error) + '</div>'; return; }
  if (!DATA.docs || !DATA.docs.length) { card.innerHTML = '<div class="error">אין רשומות להצגה.</div>'; return; }
  document.getElementById("tabEvent").className   = state.mode === "event" ? "active" : "";
  document.getElementById("tabHistory").className = state.mode === "history" ? "active" : "";
  document.getElementById("tabLab").className     = state.mode === "lab" ? "active" : "";
  document.getElementById("tabTests").className   = state.mode === "tests" ? "active" : "";
  document.getElementById("tabNow").className     = state.mode === "now" ? "active" : "";
  document.getElementById("tabGen").className     = state.mode === "gen" ? "active" : "";
  document.getElementById("docNav").className = "docnav" + (state.mode === "event" ? "" : " hidden");
  // ההודעה — רק במצב אירוע, וכשהמסמך של השורה לא נמצא ביומן המצב וגם לא במעבדה
  document.getElementById("notice").style.display =
    (DATA.requested === "missing" && state.mode === "event") ? "" : "none";
  if (state.mode === "history") renderHistory(card);
  else if (state.mode === "lab") renderLab(card);
  else if (state.mode === "now") renderNow(card);
  else if (state.mode === "gen") renderGen(card);
  else if (state.mode === "tests") renderTests(card);
  else renderEvent(card);
}

function renderEvent(card) {
  var doc  = DATA.docs[docIndex];
  var recs = doc.recordIdx.map(function(i) { return DATA.records[i]; });
  var head = DATA.records[doc.headIdx];

  // ── כותרת ──
  var reco = recs.filter(function(r) { return r.recommendation; });
  // [1ב] follow-up — אייקון בלבד; תוכן ההמלצה יוצג כקודים (משימה 280)
  var followHtml = reco.length
    ? '<span class="followup">' + iconImg("RECO") + 'המלצת המשך</span>'
    : '<span class="followup">' + iconImg("RECO") + 'אין המלצת המשך</span>';
  var html = '<div class="head">' + iconImg(head.eventIconKey).replace('<img', '<img class="evicon"') +
    '<span class="title" dir="ltr">' + esc(eventAbbr(head.eventCode)) + ' · ' + esc(dotDate(doc.date)) + '</span>' +
    (doc.sourceUrl ? '<a class="srclink" href="' + esc(doc.sourceUrl) + '" target="_blank">מסמך מקור</a>' : '') +
    (state.cameFrom ? '<span class="backlink" id="backLink">→ חזרה ' +
      (state.cameFrom === "tests" ? "לבדיקות" : "להיסטוריה") + '</span>' : '') +
    '<span class="spacer"></span>' + followHtml + '</div>';

  // ── חלוקה: על הגוף / מערכתי ──
  var placed = [], systemic = [];
  recs.forEach(function(r) {
    var pts = positionsFor(r);
    if (pts.length) placed.push({ rec: r, pts: pts }); else systemic.push(r);
  });
  // מספור: קודם הממצאים על הגוף (מלמעלה למטה), אחר כך המערכתיים
  placed.sort(function(a, b) { return a.pts[0][1] - b.pts[0][1]; });

  var listHtml = "", markersHtml = "", sysHtml = "";
  var used = [];
  var n = 0;
  placed.forEach(function(p) {
    n++;
    listHtml += itemRow(p.rec, n);
    p.pts.forEach(function(pt) {
      markersHtml += '<div class="marker" style="' + pctPos(layoutPoint(pt, used)) + '">' +
        iconBox(p.rec, "onbody") + '<span class="num">' + n + '</span></div>';
    });
  });
  systemic.forEach(function(r) {
    n++;
    sysHtml += itemRow(r, n);
  });

  // הפס המערכתי — מתחת לרשימה (ולא מתחת לדמות), כדי שהדמות תיכנס בגובה החלון
  html += '<div class="main"><div class="list">' + listHtml +
      (sysHtml ? '<div class="systemic"><div class="ttl">מערכתי</div>' + sysHtml + '</div>' : '') +
    '</div>' +
    '<div class="bodywrap"><div class="bodybox">' + bodySvg() +
      '<span class="sidelbl" style="left:4%">R</span><span class="sidelbl" style="right:4%">L</span>' +
      markersHtml + '</div>' +
    '</div></div>';

  html += legendHtml(false);

  card.innerHTML = html;
  var back = document.getElementById("backLink");
  if (back) back.onclick = function() { setMode(state.cameFrom); };

  document.getElementById("docCount").textContent = (docIndex + 1) + " / " + DATA.docs.length;
  document.getElementById("btnPrev").disabled = docIndex <= 0;
  document.getElementById("btnNext").disabled = docIndex >= DATA.docs.length - 1;
  document.getElementById("docSelect").value = String(docIndex);
}

// ══════════════════════════════════════════════════════════════════
// [שלב 2] מצב היסטוריה — כל הרשומות על הדמות, סינון, ציר זמן
// ══════════════════════════════════════════════════════════════════

function matchesFilter(r) {
  if (state.filterValue === "ALL") return true;
  if (state.filterType === "system") return r.systemCode === state.filterValue;
  var rule = (DATA.specialtyFilter || {})[state.filterValue];
  if (!rule) return false;
  if (rule.all) return true;
  return (rule.systems || []).indexOf(r.systemCode) !== -1 ||
         (rule.dx || []).indexOf(r.diagnosis.code) !== -1;
}

function filteredIndexes() {
  var out = [];
  DATA.records.forEach(function(r, i) { if (matchesFilter(r)) out.push(i); });
  return out;
}

// כפתורי הסינון — רק ערכים שיש להם לפחות רשומה אחת
function filterButtonsHtml() {
  var btns = [{ code: "ALL", name: "הכל" }];
  if (state.filterType === "system") {
    var seen = {};
    DATA.records.forEach(function(r) { if (r.systemCode) seen[r.systemCode] = true; });
    Object.keys(seen).sort().forEach(function(code) {
      btns.push({ code: code, name: (DATA.systemNames || {})[code] || code });
    });
  } else {
    (DATA.specialties || []).forEach(function(sp) {
      var rule = (DATA.specialtyFilter || {})[sp.code];
      if (!rule || rule.all) return;
      var saved = state.filterValue;
      state.filterValue = sp.code;
      var has = DATA.records.some(matchesFilter);
      state.filterValue = saved;
      if (has) btns.push({ code: sp.code, name: sp.name });
    });
  }
  return '<div class="ftype">' +
      '<label><input type="radio" name="ftype" value="system"' + (state.filterType === "system" ? " checked" : "") + '> מערכות גוף</label>' +
      '<label><input type="radio" name="ftype" value="specialty"' + (state.filterType === "specialty" ? " checked" : "") + '> התמחות</label>' +
    '</div><div class="fbtns">' + btns.map(function(b) {
      return '<span class="fbtn' + (b.code === state.filterValue ? " active" : "") + '" data-code="' + esc(b.code) + '">' + esc(b.name) + '</span>';
    }).join("") + '</div>';
}

// קיבוץ לפי מיקום על הדמות (ממצא דו-צדדי — בשתי הקבוצות); בלי מיקום — לפי מערכת
function buildGroups(indexes) {
  var groups = {}, order = [];
  function add(key, pt, i) {
    if (!groups[key]) { groups[key] = { key: key, pt: pt, items: [] }; order.push(key); }
    if (groups[key].items.indexOf(i) === -1) groups[key].items.push(i);
  }
  indexes.forEach(function(i) {
    var r = DATA.records[i];
    var pts = positionsFor(r);
    if (pts.length) pts.forEach(function(pt) { add("P:" + pt[0] + "," + pt[1], pt, i); });
    else add("S:" + (r.systemCode || "?"), null, i);
  });
  return order.map(function(k) { return groups[k]; });
}

// סמן קבוצה: אייקון הרשומה החמורה ביותר, מספר רשומות, "!" כשיש רשומה שלא אומתה
function groupMarkHtml(g, style) {
  var worst = null, allUnv = true, anyUnv = false;
  g.items.forEach(function(i) {
    var r = DATA.records[i];
    if (!worst || sevRank(r.severity.code) > sevRank(worst.severity.code)) worst = r;
    if (r.verified) allUnv = false; else anyUnv = true;
  });
  return '<div class="marker gmark' + (allUnv ? " dim" : "") + (state.selectedGroup === g.key ? " sel" : "") +
    '" data-key="' + esc(g.key) + '"' + (style ? ' style="' + style + '"' : '') + '>' +
    iconBox(worst, "onbody") +
    (g.items.length > 1 ? '<span class="cnt">' + g.items.length + '</span>' : '') +
    (anyUnv ? '<span class="warn">!</span>' : '') + '</div>';
}

// רשימת רשומות — קודים בלבד: תאריך · קיצור הבדיקה · מונח (או קוד האיבר)
function recListHtml(title, indexes) {
  if (!indexes || !indexes.length) return "";
  var sorted = indexes.slice().sort(function(a, b) {
    return (DATA.records[b].eventTs || 0) - (DATA.records[a].eventTs || 0);
  });
  return '<div class="recs"><div class="ttl">' + esc(title) + '</div>' + sorted.map(function(i) {
    var r = DATA.records[i];
    return '<div class="rec' + (r.verified ? "" : " unv") + '" data-i="' + i + '">' +
      '<span class="dot" style="background:' + sevColor(r.severity.code) + '"></span>' +
      '<span class="ri">' + (iconImg(r.organ.code) || iconImg(r.systemCode)) + '</span>' +
      '<span class="d">' + esc(dotDate(r.eventDate)) + '</span>' +
      '<span class="a">' + esc(eventAbbr(r.eventCode)) + '</span>' +
      '<span>' + esc(r.findingTerm || r.organ.code || r.systemCode || "") + '</span>' +
      sideChip(r.sideCode) + '</div>';
  }).join("") + '</div>';
}

// ציר זמן משמאל לימין (דקדוק 2.2) עם חץ ו-t; מחלות רקע (CRT4) בפס נפרד
function timelineHtml(indexes) {
  var events = indexes.filter(function(i) {
    var r = DATA.records[i];
    return r.eventTs && r.certainty.code !== BACKGROUND_CERTAINTY;
  });
  var background = indexes.filter(function(i) { return DATA.records[i].certainty.code === BACKGROUND_CERTAINTY; });
  if (!events.length && !background.length) return '<div class="timeline"><div class="empty">אין אירועים מתוארכים</div></div>';
  var W = 1000, X0 = 30, X1 = 940;
  var ts = events.map(function(i) { return DATA.records[i].eventTs; });
  var minY = new Date(ts.length ? Math.min.apply(null, ts) : Date.now()).getFullYear();
  var maxY = new Date(ts.length ? Math.max.apply(null, ts) : Date.now()).getFullYear() + 1;
  var t0 = new Date(minY, 0, 1).getTime(), t1 = new Date(maxY, 0, 1).getTime();
  function xOf(t) { return X0 + (t - t0) / (t1 - t0) * (X1 - X0); }
  var step = Math.max(1, Math.ceil((maxY - minY) / 14));
  var svg = '<svg viewBox="0 0 ' + W + ' 96" xmlns="http://www.w3.org/2000/svg">' +
    '<line x1="' + X0 + '" y1="40" x2="' + (X1 + 30) + '" y2="40" stroke="#90a4ae" stroke-width="2"/>' +
    '<path d="M' + (X1 + 30) + ' 34 L' + (X1 + 42) + ' 40 L' + (X1 + 30) + ' 46 Z" fill="#90a4ae"/>' +
    '<text x="' + (X1 + 50) + '" y="45" font-size="16" fill="#5b6b73" font-style="italic">t</text>';
  for (var y = minY; y <= maxY; y += step) {
    var x = xOf(new Date(y, 0, 1).getTime());
    svg += '<line x1="' + x + '" y1="34" x2="' + x + '" y2="46" stroke="#90a4ae"/>' +
           '<text x="' + x + '" y="62" font-size="13" fill="#78909c" text-anchor="middle">' + y + '</text>';
  }
  var stack = {};
  events.forEach(function(i) {
    var r = DATA.records[i];
    var lvl = stack[r.eventDate] || 0;
    stack[r.eventDate] = lvl + 1;
    svg += '<circle data-i="' + i + '" cx="' + xOf(r.eventTs).toFixed(1) + '" cy="' + (40 - lvl * 11) +
      '" r="7" fill="' + sevColor(r.severity.code) + '" stroke="#fff" stroke-width="1.5" opacity="' +
      (r.verified ? 1 : 0.45) + '"><title>' + esc(dotDate(r.eventDate) + " · " + eventAbbr(r.eventCode) +
      (r.findingTerm ? " · " + r.findingTerm : "")) + '</title></circle>';
  });
  if (background.length) {
    svg += '<g class="lane" id="bgLane"><rect x="' + X0 + '" y="72" width="' + (X1 - X0) + '" height="20" rx="10" fill="#cfd8dc"/>' +
      '<text x="' + ((X0 + X1) / 2) + '" y="87" font-size="13" fill="#37474f" text-anchor="middle">HX (' + background.length + ')</text></g>';
  }
  return '<div class="timeline">' + svg + '</svg></div>';
}

// ── [Task #269] שכבת מעבדה חריגה על הדמות + קישור מטרה ↔ ייחוס ──
// סמן מעבדה: בדיקה שהתוצאה האחרונה שלה חריגה (H/L/A), במיקום איבר המטרה (שיוך מהשרת:
// קוד הבדיקה ← פאנל ← מערכת). בלי מיקום — בפס "מערכתי". בחירת סמן (רשומות או מעבדה) —
// קו מקווקו לכל איבר ייחוס ועיגול חלול עליו; ייחוס בלי מיקום — ברשימה בלבד.
// בדיקות עם אותו איבר מטרה — סמן אחד עם מונה (כמו קבוצות הרשומות), כדי שלא ייערמו.
// הפונקציות משותפות — ישמשו גם לתצוגת גוף בלשונית מעבדה (#250).
function organPoint(code) {
  var p = S17_ORGAN_POS[code] || S17_ORGAN_POS[(code || "").substring(0, 5)];
  return p ? (p.c || p.r || p.l || null) : null;
}
function organLabel(code) {
  var name = (DATA.organNames || {})[code] || (DATA.systemNames || {})[(code || "").substring(0, 5)] || "";
  return code + (name ? " " + name : "");
}
function labMatchesFilter(t) {
  if (state.filterValue === "ALL") return true;
  var sys = (t.organ || t.system || "").substring(0, 5);
  if (state.filterType === "system") return sys === state.filterValue;
  var rule = (DATA.specialtyFilter || {})[state.filterValue];
  if (!rule) return false;
  if (rule.all) return true;
  return (rule.systems || []).indexOf(sys) !== -1;
}
function labLayerTests() {
  return ((DATA.lab || {}).tests || []).filter(function(t) {
    return t.points.length && isAbnormal(lastPoint(t)) && labMatchesFilter(t);
  });
}
function labGroups(tests) {
  var byOrgan = {}, out = [];
  tests.forEach(function(t) {
    var k = "L:" + (t.organ || t.system || "?");
    if (!byOrgan[k]) { byOrgan[k] = { key: k, organ: t.organ || t.system || "", pt: organPoint(t.organ), tests: [] }; out.push(byOrgan[k]); }
    byOrgan[k].tests.push(t);
  });
  return out;
}
function labMarkHtml(g, style) {
  var flags = g.tests.map(function(t) { return lastPoint(t).flag; });
  var flag = flags.indexOf("H") !== -1 ? "H" : flags.indexOf("A") !== -1 ? "A" : flags[0];
  var allUnv = g.tests.every(function(t) { return !lastPoint(t).verified; });
  return '<div class="marker gmark lmark' + (allUnv ? " dim" : "") + (state.selectedGroup === g.key ? " sel" : "") +
    '" data-key="' + esc(g.key) + '"' + (style ? ' style="' + style + '"' : '') +
    ' title="' + esc(g.tests.map(function(t) { var p = lastPoint(t);
      return t.name + " · " + fmtNum(p.v) + " " + (t.unit || ""); }).join("\n")) + '">' +
    '<span class="lab" style="background:' + (FLAG_COLOR[flag] || "#9aa6ab") + '">' + esc(flag) + '</span>' +
    (g.tests.length > 1 ? '<span class="cnt">' + g.tests.length + '</span>' : '') + '</div>';
}
function linkOverlaySvg(from, codes) {
  var vb = BODY_VIEW, out = "";
  codes.forEach(function(code) {
    var to = organPoint(code);
    if (!to || !from) return;
    out += '<line x1="' + from[0] + '" y1="' + from[1] + '" x2="' + to[0] + '" y2="' + to[1] + '"/>' +
           '<circle cx="' + to[0] + '" cy="' + to[1] + '" r="16"><title>' + esc(organLabel(code)) + '</title></circle>';
  });
  return out ? '<svg class="linksvg" viewBox="' + vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h +
               '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' + out + '</svg>' : "";
}
function secondaryHtml(codes) {
  if (!codes.length) return "";
  return '<div class="refs"><span class="ttl">ייחוס</span>' + codes.map(function(code) {
    return '<span class="ref' + (organPoint(code) ? "" : " nopos") + '">' + esc(organLabel(code)) + '</span>';
  }).join("") + '</div>';
}
function labRefs(g) {
  var refs = [];
  g.tests.forEach(function(t) {
    (t.secondary || []).forEach(function(c) { if (refs.indexOf(c) === -1) refs.push(c); }); });
  return refs;
}
function labSelHtml(g) {
  return '<div class="recs"><div class="ttl">מעבדה · ' + g.tests.length + '</div>' +
    '<div class="refs"><span class="ttl">מטרה</span><span class="ref">' + esc(organLabel(g.organ)) + '</span></div>' +
    secondaryHtml(labRefs(g)) +
    g.tests.map(function(t) {
      var p = lastPoint(t);
      return '<div class="rec labrec" data-key="' + esc(t.key) + '" title="פתח בלשונית מעבדה">' +
        '<span class="lab" style="background:' + (FLAG_COLOR[p.flag] || "#9aa6ab") + '">' + esc(p.flag) + '</span>' +
        '<span class="d">' + esc(dotDate(p.date)) + '</span>' +
        '<span><b>' + esc(t.name) + '</b> ' + esc(fmtNum(p.v)) + ' ' + esc(t.unit || "") +
        ' <small>' + esc(PANEL_ABBR[t.panel] || t.panel || "") + '</small></span>' +
        (p.verified ? '' : '<span class="ddot"></span>') +
        ((t.secondary || []).length ? '<small>→ ' + esc(t.secondary.join(", ")) + '</small>' : '') + '</div>';
    }).join("") + '<div class="refs"><span class="ttl">לחיצה על בדיקה — פתיחה בלשונית מעבדה</span></div></div>';
}

function renderHistory(card) {
  var indexes = filteredIndexes();
  var groups  = buildGroups(indexes);
  var placed  = groups.filter(function(g) { return g.pt; }).sort(function(a, b) { return a.pt[1] - b.pt[1]; });
  var sys     = groups.filter(function(g) { return !g.pt; });

  // [Task #269] שכבת מעבדה חריגה — כבויה כברירת מחדל
  var allLab  = labLayerTests();
  var labs    = state.labLayer ? labGroups(allLab) : [];
  var labPlaced = labs.filter(function(g) { return g.pt; });
  var labSys    = labs.filter(function(g) { return !g.pt; });

  var used = [], marks = "", shown = {};
  placed.forEach(function(g) {
    var xy = layoutPoint(g.pt, used); shown[g.key] = xy; marks += groupMarkHtml(g, pctPos(xy)); });
  labPlaced.forEach(function(g) {
    var xy = layoutPoint(g.pt, used); shown[g.key] = xy; marks += labMarkHtml(g, pctPos(xy)); });

  var sel = groups.filter(function(g) { return g.key === state.selectedGroup; })[0];
  var selLab = labs.filter(function(g) { return g.key === state.selectedGroup; })[0];
  var listPart = "", refs = [];
  if (sel) {
    var first = DATA.records[sel.items[0]];
    sel.items.forEach(function(i) {
      (DATA.records[i].secondary || []).forEach(function(c) { if (refs.indexOf(c) === -1) refs.push(c); }); });
    listPart = recListHtml((sel.pt ? (first.organ.code || first.systemCode) : (first.systemCode || "")) +
                           " · " + sel.items.length, sel.items) + secondaryHtml(refs);
  } else if (selLab) {
    refs = labRefs(selLab);
    listPart = labSelHtml(selLab);
  } else if (state.showBackground) {
    listPart = recListHtml("HX", indexes.filter(function(i) {
      return DATA.records[i].certainty.code === BACKGROUND_CERTAINTY; }));
  }
  var links = (sel || selLab) ? linkOverlaySvg(shown[state.selectedGroup] || null, refs) : "";

  card.innerHTML =
    '<div class="main"><div class="list hlist">' + filterButtonsHtml() +
      '<label class="labtoggle"><input type="checkbox" id="labLayer"' + (state.labLayer ? " checked" : "") +
        '> מעבדה חריגה (' + allLab.length + ')</label>' +
      (indexes.length ? '' : '<div class="empty">אין רשומות בסינון זה</div>') +
      ((sys.length || labSys.length) ? '<div class="systemic"><div class="ttl">מערכתי</div><div class="srow">' +
        sys.map(function(g) { return groupMarkHtml(g, ""); }).join("") +
        labSys.map(function(g) { return labMarkHtml(g, ""); }).join("") + '</div></div>' : '') +
      listPart +
    '</div>' +
    '<div class="bodywrap"><div class="bodybox hbody">' + bodySvg() + links +
      '<span class="sidelbl" style="left:4%">R</span><span class="sidelbl" style="right:4%">L</span>' +
      marks + '</div></div></div>' +
    timelineHtml(indexes) + legendHtml(true);

  // אירועים
  Array.prototype.forEach.call(card.querySelectorAll('input[name="ftype"]'), function(el) {
    el.onchange = function() {
      state.filterType = el.value; state.filterValue = "ALL";
      state.selectedGroup = null; state.showBackground = false; render();
    };
  });
  Array.prototype.forEach.call(card.querySelectorAll(".fbtn"), function(el) {
    el.onclick = function() {
      state.filterValue = el.getAttribute("data-code");
      state.selectedGroup = null; state.showBackground = false; render();
    };
  });
  Array.prototype.forEach.call(card.querySelectorAll(".gmark"), function(el) {
    el.onclick = function() {
      var key = el.getAttribute("data-key");
      state.selectedGroup = state.selectedGroup === key ? null : key;
      state.showBackground = false; render();
    };
  });
  Array.prototype.forEach.call(card.querySelectorAll(".rec, .timeline circle"), function(el) {
    if (el.classList.contains("labrec")) return;
    el.onclick = function() { openRecord(Number(el.getAttribute("data-i"))); };
  });
  var lane = card.querySelector("#bgLane");
  if (lane) lane.onclick = function() {
    state.selectedGroup = null; state.showBackground = !state.showBackground; render();
  };
  // [Task #269] מתג השכבה ומעבר מבדיקה מסומנת ללשונית מעבדה
  var lb = card.querySelector("#labLayer");
  if (lb) lb.onchange = function() {
    state.labLayer = lb.checked;
    if (!lb.checked && /^L:/.test(state.selectedGroup || "")) state.selectedGroup = null;
    render();
  };
  Array.prototype.forEach.call(card.querySelectorAll(".labrec"), function(el) {
    el.onclick = function() {
      var t = selLab.tests.filter(function(x) { return x.key === el.getAttribute("data-key"); })[0];
      if (!t) return;
      state.labPanel = t.panel || ""; state.labAbnormalOnly = false; state.labOpen = t.key;
      setMode("lab");
    };
  });
}

// ══════════════════════════════════════════════════════════════════
// [שלב 3] לשונית מעבדה — כרטיס לכל פאנל, שורה לכל בדיקה: שם בינלאומי, קו מגמה
// על רקע הטווח התקין, ערך אחרון + יחידה, סימון H/L/A. לחיצה — גרף מפורט.
// ══════════════════════════════════════════════════════════════════

// קיצור בינלאומי לפאנל — לפי קוד הפאנל בלבד
var PANEL_ABBR = {
  "PNL-L00": "OTHER", "PNL-L01": "CBC", "PNL-L02": "CHEM", "PNL-L03": "RENAL", "PNL-L04": "LFT",
  "PNL-L05": "LIPIDS", "PNL-L06": "GLYCEMIC", "PNL-L07": "THYROID", "PNL-L08": "IRON", "PNL-L09": "COAG",
  "PNL-L10": "INFLAM", "PNL-L11": "TUMOR MARKERS", "PNL-L12": "URINE", "PNL-L13": "STOOL",
  "PNL-L14": "SEROLOGY", "PNL-L15": "VITAMINS", "PNL-L16": "VITALS"
};
var PANEL_ORDER = ["PNL-L16", "PNL-L01", "PNL-L02", "PNL-L03", "PNL-L04", "PNL-L06", "PNL-L05", "PNL-L07",
                   "PNL-L08", "PNL-L09", "PNL-L10", "PNL-L15", "PNL-L11", "PNL-L14", "PNL-L12", "PNL-L13", "PNL-L00"];
var FLAG_COLOR = { H: "#d32f2f", A: "#d32f2f", L: "#1565c0", N: "#2e9d4a" };

function panelAbbr(code) { return PANEL_ABBR[code] || code || "OTHER"; }
function lastPoint(t) { return t.points[t.points.length - 1]; }
function isAbnormal(p) { return p && (p.flag === "H" || p.flag === "L" || p.flag === "A"); }
function fmtNum(v) { return (v === null || v === undefined) ? "" : String(Math.round(v * 100) / 100); }

// קו מגמה: נקודות הזמן לפי סדר, רקע ירוק בגובה הטווח התקין האחרון
function trendSvg(t, W, H, withAxis, hlFile) {
  var pts = t.points.filter(function(p) { return p.v !== null; });
  if (!pts.length) return '<svg viewBox="0 0 ' + W + ' ' + H + '"></svg>';
  var last = lastPoint(t);
  var vals = pts.map(function(p) { return p.v; });
  if (last.low !== null) vals.push(last.low);
  if (last.high !== null) vals.push(last.high);
  var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
  if (mx === mn) { mx += 1; mn -= 1; }
  var pad = withAxis ? 44 : 6, top = withAxis ? 26 : 4, bot = withAxis ? 22 : 4;
  function yOf(v) { return top + (mx - v) / (mx - mn) * (H - top - bot); }
  function xOf(k) { return pts.length === 1 ? W / 2 : pad + k * (W - 2 * pad) / (pts.length - 1); }
  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">';
  if (last.low !== null || last.high !== null) {
    var y1 = yOf(last.high !== null ? last.high : mx), y2 = yOf(last.low !== null ? last.low : mn);
    svg += '<rect x="0" y="' + y1.toFixed(1) + '" width="' + W + '" height="' + Math.max(1, y2 - y1).toFixed(1) +
           '" fill="#e9f6ec"/>';
  }
  svg += '<polyline fill="none" stroke="#90a4ae" stroke-width="1.5" points="' +
         pts.map(function(p, k) { return xOf(k).toFixed(1) + "," + yOf(p.v).toFixed(1); }).join(" ") + '"/>';
  pts.forEach(function(p, k) {
    var hl = hlFile && p.file === hlFile;
    svg += '<circle cx="' + xOf(k).toFixed(1) + '" cy="' + yOf(p.v).toFixed(1) + '" r="' + (withAxis ? 5 : 3.2) +
      '" fill="' + (FLAG_COLOR[p.flag] || "#9aa6ab") + '" opacity="' + (p.verified ? 1 : 0.5) + '"' +
      (hl ? ' stroke="#1f2a30" stroke-width="2"' : '') + '><title>' +
      esc(dotDate(p.date) + " · " + fmtNum(p.v) + " " + (t.unit || "")) + '</title></circle>';
    if (withAxis) {
      svg += '<text x="' + xOf(k).toFixed(1) + '" y="' + (yOf(p.v) - 9).toFixed(1) + '" font-size="11" text-anchor="middle" fill="#36464e">' +
             esc(fmtNum(p.v)) + '</text>' +
             '<text x="' + xOf(k).toFixed(1) + '" y="' + (H - 6) + '" font-size="11" text-anchor="middle" fill="#78909c">' +
             esc(dotDate(p.date)) + '</text>';
    }
  });
  return svg + '</svg>';
}

// [3ב] בדיקה ששייכת למסמך המודגש (השורה שסומנה בגליון)
function hasFile(t, file) {
  return !!file && t.points.some(function(p) { return p.file === file; });
}

// [3ב] שורת אריחים (פאנל לכל אריח: קיצור, אייקון מערכת, מספר בדיקות, חריגים) +
// בדיקות הפאנל הפתוח בעמודות לכל רוחב המסך. "חריגים בלבד" — בכל הפאנלים יחד.
function renderLab(card) {
  var lab = DATA.lab || { tests: [] };
  var present = {};
  lab.tests.forEach(function(t) { present[t.panel] = true; });
  var panels = PANEL_ORDER.filter(function(c) { return present[c]; });
  Object.keys(present).forEach(function(c) { if (panels.indexOf(c) === -1) panels.push(c); });

  function panelTests(pc) { return lab.tests.filter(function(t) { return t.panel === pc; }); }
  function abnCount(pc) { return panelTests(pc).filter(function(t) { return isAbnormal(lastPoint(t)); }).length; }

  // פאנל פתיחה: זה שמכיל את המסמך המודגש, אחרת זה עם הכי הרבה חריגים
  if (!state.labPanel) {
    var hlPanel = panels.filter(function(pc) {
      return panelTests(pc).some(function(t) { return hasFile(t, state.labHighlight); }); })[0];
    var best = panels.slice().sort(function(a, b) { return abnCount(b) - abnCount(a); })[0];
    state.labPanel = hlPanel || best || "";
  }

  var html = '<div class="labbar"><label><input type="checkbox" id="labAbn"' +
    (state.labAbnormalOnly ? " checked" : "") + '> חריגים בלבד (בתוצאה האחרונה, בכל הפאנלים)</label></div>';

  html += '<div class="tiles">' + panels.map(function(pc) {
    var pt = panelTests(pc), abn = abnCount(pc);
    var sysIcon = pt.map(function(t) { return t.system; }).filter(function(k) { return DATA.icons[k]; })[0];
    var hl = pt.some(function(t) { return hasFile(t, state.labHighlight); });
    return '<span class="tile' + (!state.labAbnormalOnly && state.labPanel === pc ? " active" : "") + (hl ? " hl" : "") +
      '" data-panel="' + esc(pc) + '">' + iconImg(sysIcon) + '<b>' + esc(panelAbbr(pc)) + '</b>' +
      '<span class="n">' + pt.length + '</span>' + (abn ? '<span class="abn">' + abn + '</span>' : '') + '</span>';
  }).join("") + '</div>';

  var tests = state.labAbnormalOnly
    ? lab.tests.filter(function(t) { return isAbnormal(lastPoint(t)); })
    : panelTests(state.labPanel);

  if (!tests.length) {
    html += '<div class="empty">אין בדיקות בסינון זה</div>';
  } else {
    html += '<div class="tgrid">';
    tests.forEach(function(t) {
      var lp = lastPoint(t);
      var valText = lp.v !== null ? fmtNum(lp.v) : (lp.value || "");
      var hl = hasFile(t, state.labHighlight);
      html += '<div class="trow' + (hl ? " hl" : "") + '" data-key="' + esc(t.key) + '">' +
        '<span class="tn" title="' + esc((t.loinc ? "LOINC " + t.loinc : "") + " · " + panelAbbr(t.panel) +
          (t.specimen ? " · " + t.specimen : "")) + '">' +
          esc(t.name) + (lp.verified ? "" : '<span class="ddot" title="שורה שעדיין לא אומתה"></span>') + '</span>' +
        trendSvg(t, 100, 26, false, state.labHighlight) +
        '<span class="tv">' + esc(valText) + ' <small>' + esc(t.unit || "") + '</small>' +
          (lp.low !== null || lp.high !== null ? ' <small>(' + esc(fmtNum(lp.low)) + '–' + esc(fmtNum(lp.high)) + ')</small>' : '') + '</span>' +
        '<span class="tf ' + esc(lp.flag) + '">' + (isAbnormal(lp) ? esc(lp.flag) : "") + '</span></div>';
      if (state.labOpen === t.key) {
        html += '<div class="tdetail">' + trendSvg(t, 900, 150, true, state.labHighlight) +
          t.points.filter(function(p) { return p.url; }).map(function(p) {
            return '<a href="' + esc(p.url) + '" target="_blank">' + esc(dotDate(p.date)) + '</a>';
          }).join(" · ") + '</div>';
      }
    });
    html += '</div>';
  }
  html += '<div class="legend"><span><span class="tf H" style="padding:0 5px">H</span> גבוה</span>' +
    '<span><span class="tf L" style="padding:0 5px">L</span> נמוך</span>' +
    '<span><span style="display:inline-block;width:22px;height:10px;background:#e9f6ec;vertical-align:middle"></span> טווח תקין</span>' +
    '<span><span class="ddot"></span> לא אומת</span>' +
    (state.labHighlight ? '<span><span style="display:inline-block;width:22px;height:10px;background:#fff8d6;vertical-align:middle"></span> המסמך שנבחר</span>' : '') +
    '</div>';
  card.innerHTML = html;

  var abnBox = card.querySelector("#labAbn");
  if (abnBox) abnBox.onchange = function() { state.labAbnormalOnly = abnBox.checked; state.labOpen = null; render(); };
  Array.prototype.forEach.call(card.querySelectorAll("[data-panel]"), function(el) {
    el.onclick = function() {
      state.labPanel = el.getAttribute("data-panel"); state.labAbnormalOnly = false; state.labOpen = null; render();
    };
  });
  Array.prototype.forEach.call(card.querySelectorAll(".trow"), function(el) {
    el.onclick = function() {
      var k = el.getAttribute("data-key");
      state.labOpen = state.labOpen === k ? null : k;
      render();
    };
  });
}

// ── [שלב 4] לשונית "מצב נוכחי" — קודים בלבד; כותרות ותוויות בעברית ──
var INS_ABBR = { INS00: "הערה", INS01: "מעקב", INS02: "הפניה", INS03: "בדיקה", INS04: "פעולה",
                 INS05: "תרופה", INS06: "תזונה", INS07: "אורח חיים", INS08: "הגבלה", INS09: "מנהלי" };
var KIND_ABBR = { "משימה": "משימה", "מתמשכת": "מתמשכת" };
var ZONE_LABEL = { CHRONIC: "כרוניות", TEMP: "זמניות", PRN: "לפי הצורך (PRN)", UNCLASSIFIED: "לא מסווגות",
                   ENDED: "הסתיימו" };
var TYPE_ZONE = { "כרוני": "CHRONIC", "לפי הצורך": "PRN" };
var ZONE_ORDER = ["CHRONIC", "TEMP", "PRN", "UNCLASSIFIED", "ENDED"];
var DAY_MS = 86400000;

function todayTs() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }

// אזור התרופה: הסתיימה (תאריך סיום עבר) / כרונית / לפי הצורך / זמנית (יש תאריך סיום) / לא מסווג
function medZone(m, today) {
  if (m.endTs && m.endTs < today) return "ENDED";
  if (TYPE_ZONE[m.type]) return TYPE_ZONE[m.type];
  if (m.endTs) return "TEMP";
  return "UNCLASSIFIED";
}

function doseText(m) {
  var parts = [];
  if (m.dose) parts.push(m.dose + (m.unit ? " " + m.unit.toLowerCase() : ""));
  if (m.perDay) parts.push("×" + m.perDay + " ביום");
  if (m.perWeek) parts.push(m.perWeek + " בשבוע");
  return parts.join(" · ");
}

function medRowHtml(m, today) {
  // טיפול עם תאריך סיום — פס התקדמות בשורה נוספת; אחרת "מאז" בעמודה צרה באותה שורה
  var sub = "", since = "";
  if (m.startTs && m.endTs && m.endTs > m.startTs) {
    var pct = Math.max(0, Math.min(100, (today - m.startTs) / (m.endTs - m.startTs) * 100));
    sub = dotDate(m.start) + '<span class="prog"><i style="width:' + pct.toFixed(0) + '%"></i></span>' + dotDate(m.end);
  } else if (m.start) {
    since = "מאז " + dotDate(m.start);
  }
  return '<div class="med' + (medZone(m, today) === "ENDED" ? " ended" : "") + '">' +
    '<span>' + iconImg(m.system) + '</span>' +
    '<span><span class="inn">' + esc(m.inn) + '</span>' + (m.atc ? '<span class="atc">' + esc(m.atc) + '</span>' : '') +
      (m.verified ? '' : '<span class="ddot" title="שורה שעדיין לא אומתה"></span>') + '</span>' +
    '<span class="dose">' + esc(doseText(m)) + '</span>' +
    '<span class="since">' + esc(since) + '</span>' +
    (sub ? '<span class="sub">' + sub + '</span>' : '') + '</div>';
}

function insRowHtml(x, today) {
  var dueCls = "", dueTxt = x.due ? dotDate(x.due) : "—";
  if (x.open && x.dueTs) {
    if (x.dueTs < today) dueCls = " over";
    else if (x.dueTs - today <= 30 * DAY_MS) dueCls = " soon";
  }
  return '<div class="ins' + (x.open ? "" : " done") + '">' +
    '<span>' + iconImg(x.system) + '</span>' +
    '<span class="k">' + esc(INS_ABBR[x.code] || x.code || "לא מקודד") + '</span>' +
    '<span>' + (KIND_ABBR[x.kind] ? '<span class="kchip">' + KIND_ABBR[x.kind] + '</span> ' : '') +
      esc(x.target || "") + ' <small style="color:#78909c">' + esc(dotDate(x.date)) + '</small>' +
      (x.verified ? '' : '<span class="ddot" title="שורה שעדיין לא אומתה"></span>') + '</span>' +
    '<span class="due' + dueCls + '">' + (x.kind === "מתמשכת" && !x.due ? "∞" : esc(dueTxt)) + '</span></div>';
}

// [Task #283] תחומי התקציר הבינלאומי (IPS) שאין להם עדיין נתונים במערכת — אריח קבוע
// "אין מידע במסמכים" (יחוברו לנתונים ב-#271 שלב ב). כל הטקסט בעברית, עיצוב אפור אחיד.
var NOT_DOC_DOMAINS = [{ name: "חיסונים" }, { name: "מכשור רפואי ושתלים" },
  { name: "היסטוריה חברתית", hint: "עישון, אלכוהול" }, { name: "היסטוריה משפחתית" }];

function renderNow(card) {
  var now = DATA.now || { meds: [], instructions: [], atcNames: {} };
  var today = todayTs();
  // [Task #283] "לא תועד" — הבחנה בין "אין" לבין "לא תועד במסמכים", עם מספר המסמכים שנבדקו
  var docs = now.docCount || 0;
  var notDoc = 'לא תועדו' + (docs ? ' · נבדקו ' + docs + ' מסמכים' : '');

  // רצועת אלרגיות — מרשומות יומן המצב עם קוד אירוע A7*, החומר לפי קוד ATC
  var seen = {};
  var allergies = DATA.records.filter(function(r) { return /^A7/.test(r.eventCode || ""); }).filter(function(r) {
    var k = (r.eventCode || "") + "|" + (r.allergenCode || r.organ.code || "");
    if (seen[k]) return false; seen[k] = true; return true;
  });
  var html = '<div class="nowwrap">';
  html += '<div class="allergy' + (allergies.length ? "" : " none") + '"><span class="ttl">⚠ אלרגיות</span>' +
    (allergies.length ? allergies.map(function(r) {
      var inn = r.allergenCode ? (now.atcNames[r.allergenCode] || "") : "";
      return '<span class="al"><b>' + esc(eventAbbr(r.eventCode)) + '</b> · ' +
        esc(inn || r.allergenCode || "—") + (r.allergenCode && inn ? ' <small>' + esc(r.allergenCode) + '</small>' : '') +
        (r.verified ? '' : '<span class="ddot"></span>') + '</span>';
    }).join("") : '<span>' + notDoc + '</span>') + '</div>';

  // לוח תרופות לפי אזורים
  var zones = {};
  now.meds.forEach(function(m) { var z = medZone(m, today); (zones[z] = zones[z] || []).push(m); });
  // שלוש עמודות: כרוניות | זמניות, לפי הצורך, לא מסווגות, הסתיימו | הנחיות — הכול במסך אחד בלי גלילה
  function zoneHtml(z) {
    var list = zones[z];
    if (!list || !list.length) return "";
    if (z === "ENDED" && !state.nowShowEnded) {
      return '<div class="zone"><div class="zt">' + ZONE_LABEL.ENDED + ' <span class="n">' + list.length +
        '</span> <span class="backlink" id="nowEnded">הצג</span></div></div>';
    }
    list.sort(function(a, b) { return (a.system || "").localeCompare(b.system || "") || a.inn.localeCompare(b.inn); });
    return '<div class="zone"><div class="zt">' + ZONE_LABEL[z] + ' <span class="n">' + list.length + '</span>' +
      (z === "ENDED" ? ' <span class="backlink" id="nowEnded">הסתר</span>' : '') + '</div>' +
      list.map(function(m) { return medRowHtml(m, today); }).join("") + '</div>';
  }
  // [Task #283] אין אף תרופה — אזור אפור "לא תועדו" (ולא אזור ריק שנקרא כ"אין")
  var medsNone = now.meds.length ? '' :
    '<div class="zone notdoc"><div class="zt">תרופות</div><div class="nd">' + notDoc + '</div></div>';
  html += '<div class="nowgrid"><div class="nowcol">' + medsNone + zoneHtml("CHRONIC") + '</div>' +
    '<div class="nowcol">' + ZONE_ORDER.slice(1).map(zoneHtml).join("") + '</div>';

  // הנחיות — פתוחות קודם, לפי תאריך יעד (באיחור ראשונים), ואז ללא יעד
  var ins = now.instructions.filter(function(x) { return x.open || state.nowShowDone; });
  ins.sort(function(a, b) {
    if (a.open !== b.open) return a.open ? -1 : 1;
    var ad = a.dueTs || Infinity, bd = b.dueTs || Infinity;
    if (ad !== bd) return ad - bd;
    return (b.dateTs || 0) - (a.dateTs || 0);
  });
  var openCnt = now.instructions.filter(function(x) { return x.open; }).length;
  html += '<div class="nowcol"><div class="zone"><div class="zt">הנחיות <span class="n">' + openCnt +
    ' פתוחות</span> <label style="font-weight:400;font-size:13px;margin-left:10px"><input type="checkbox" id="nowDone"' +
    (state.nowShowDone ? " checked" : "") + '> כולל שבוצעו</label></div>' +
    (ins.length ? ins.map(function(x) { return insRowHtml(x, today); }).join("") :
      '<div class="empty">' + (now.instructions.length ? 'אין הנחיות פתוחות' : notDoc) + '</div>') +
    '</div></div>';
  html += '</div>';

  // [Task #283] אריחים קבועים לתחומי IPS שאין עליהם נתונים במערכת
  html += '<div class="ndstrip"><span class="ttl">אין מידע במסמכים' + (docs ? ' (נבדקו ' + docs + ')' : '') + '</span>' +
    NOT_DOC_DOMAINS.map(function(d) {
      return '<span class="tile"' + (d.hint ? ' title="' + esc(d.hint) + '"' : '') + '>' + esc(d.name) + '</span>';
    }).join("") + '</div>';

  html += '<div class="legend"><span><span class="due over" style="padding:0 5px">dd.mm</span> באיחור</span>' +
    '<span><span class="due soon" style="padding:0 5px">dd.mm</span> עד 30 יום</span>' +
    '<span>∞ מתמשכת</span><span><span class="ddot"></span> לא אומת</span></div></div>';
  card.innerHTML = html;

  var en = card.querySelector("#nowEnded");
  if (en) en.onclick = function() { state.nowShowEnded = !state.nowShowEnded; render(); };
  var dn = card.querySelector("#nowDone");
  if (dn) dn.onchange = function() { state.nowShowDone = dn.checked; render(); };
}

// ── [שלב 4] לשונית "גנטיקה" — קודים בלבד: קוד תכונה, סמל גן, שם התכונה מהקטלוג ──
var TEND_LABEL = ["אין", "נמוכה", "בינונית", "גבוהה"];
var TEND_COLOR = ["#2e9d4a", "#f2c500", "#ea6a00", "#d32f2f"];

function genPanelName(code) { return ((DATA.lab || {}).panels || {})[code] || code; }
function genHasFile(t, file) { return !!file && (t.files || []).indexOf(file) !== -1; }

// פס נטייה: 4 משבצות, ממולאות עד הדרגה בצבע הדרגה; בלי דרגה — ריק עם "—"
function tendBarHtml(level) {
  var out = '<span class="tbar">';
  for (var k = 0; k < 4; k++) {
    out += '<i' + (level >= 0 && k <= level ? ' style="background:' + TEND_COLOR[level] + '"' : '') + '></i>';
  }
  return out + '<b style="color:' + (level >= 0 ? TEND_COLOR[level] : "#9aa6ab") + '">' +
    (level >= 0 ? TEND_LABEL[level] : "—") + '</b></span>';
}

function genRowHtml(t) {
  var tags = (t.gene ? '<span class="chip"><b>' + esc(t.gene) + '</b></span>' : '') +
    (t.variant ? '<span class="chip">' + esc(t.variant) + '</span>' : '') +
    (t.genotype ? '<span class="chip">' + esc(t.genotype) + '</span>' : '');
  return '<div class="grow' + (genHasFile(t, state.genHighlight) ? " hl" : "") + '">' +
    '<span>' + iconImg(t.system) + '</span>' +
    '<span class="gc">' + esc(t.code || "לא מקודד") +
      (t.verified ? '' : '<span class="ddot" title="שורה שעדיין לא אומתה"></span>') + '</span>' +
    '<span class="gg">' + tags + '</span>' +
    '<span class="gn" dir="rtl" title="' + esc(t.name) + '">' + esc(t.name) + '</span>' +
    tendBarHtml(t.level) +
    '<span class="acmg ' + esc(t.acmg) + '"' + (t.acmg ? '' : ' style="border:none"') + '>' + esc(t.acmg) + '</span>' +
    '<span class="gd">' + (t.url ? '<a href="' + esc(t.url) + '" target="_blank">' + esc(dotDate(t.date)) + '</a>'
                                 : esc(dotDate(t.date))) + '</span></div>';
}

// אריח לכל פאנל (שם מהקטלוג, מספר תכונות, מספר בנטייה בינונית/גבוהה) + תכונות הפאנל הפתוח.
// "בינונית וגבוהה בלבד" — מכל הפאנלים יחד.
function renderGen(card) {
  var traits = (DATA.gen || {}).traits || [];
  var panels = [];
  traits.forEach(function(t) { if (panels.indexOf(t.panel) === -1) panels.push(t.panel); });
  panels.sort();
  function panelTraits(pc) { return traits.filter(function(t) { return t.panel === pc; }); }
  function elevated(t) { return t.level >= 2; }

  if (!state.genPanel || panels.indexOf(state.genPanel) === -1) {
    var hlPanel = panels.filter(function(pc) {
      return panelTraits(pc).some(function(t) { return genHasFile(t, state.genHighlight); }); })[0];
    var best = panels.slice().sort(function(a, b) {
      return panelTraits(b).filter(elevated).length - panelTraits(a).filter(elevated).length; })[0];
    state.genPanel = hlPanel || best || "";
  }

  if (!traits.length) { card.innerHTML = '<div class="empty">אין בדיקות גנטיות</div>'; return; }

  var html = '<div class="labbar"><label><input type="checkbox" id="genElev"' +
    (state.genElevatedOnly ? " checked" : "") + '> נטייה בינונית וגבוהה בלבד (בכל הפאנלים)</label></div>';
  html += '<div class="tiles">' + panels.map(function(pc) {
    var pt = panelTraits(pc), elev = pt.filter(elevated).length;
    var sysIcon = pt.map(function(t) { return t.system; }).filter(function(k) { return DATA.icons[k]; })[0];
    var hl = pt.some(function(t) { return genHasFile(t, state.genHighlight); });
    return '<span class="tile' + (!state.genElevatedOnly && state.genPanel === pc ? " active" : "") + (hl ? " hl" : "") +
      '" data-gpanel="' + esc(pc) + '" title="' + esc(pc) + '">' + iconImg(sysIcon) + '<b>' + esc(genPanelName(pc)) + '</b>' +
      '<span class="n">' + pt.length + '</span>' + (elev ? '<span class="abn">' + elev + '</span>' : '') + '</span>';
  }).join("") + '</div>';

  var list = state.genElevatedOnly ? traits.filter(elevated) : panelTraits(state.genPanel);
  list = list.slice().sort(function(a, b) { return (b.level - a.level) || a.code.localeCompare(b.code); });
  html += list.length
    ? '<div class="ggrid">' + list.map(genRowHtml).join("") + '</div>'
    : '<div class="empty">אין תכונות בסינון זה</div>';

  html += '<div class="legend">' + TEND_LABEL.map(function(l, k) { return '<span>' + tendBarHtml(k) + '</span>'; }).join("") +
    '<span><span class="acmg P" style="padding:0 4px">P</span>/<span class="acmg VUS" style="padding:0 4px">VUS</span>/' +
    '<span class="acmg" style="padding:0 4px">B</span> ACMG</span>' +
    '<span><span class="ddot"></span> לא אומת</span>' +
    (state.genHighlight ? '<span><span style="display:inline-block;width:22px;height:10px;background:#fff8d6;vertical-align:middle"></span> המסמך שנבחר</span>' : '') +
    '</div>';
  card.innerHTML = html;

  var elevBox = card.querySelector("#genElev");
  if (elevBox) elevBox.onchange = function() { state.genElevatedOnly = elevBox.checked; render(); };
  Array.prototype.forEach.call(card.querySelectorAll("[data-gpanel]"), function(el) {
    el.onclick = function() { state.genPanel = el.getAttribute("data-gpanel"); state.genElevatedOnly = false; render(); };
  });
}

// ══════════════════════════════════════════════════════════════════
// [שלב 4] לשונית "בדיקות" — כל המסמכים מסוג בדיקה (דימות, תפקוד, אנדוסקופיה,
// פתולוגיה) לפי קוד האירוע של כותרת המסמך. שורת אריחים לכל קבוצה (אריח לכל סוג
// בדיקה: מספר בדיקות וצבע החומרה הגבוהה), רשימת הבדיקות של הבחירה מהחדשה לישנה;
// לחיצה — פתיחת המסמך בלשונית אירוע עם "חזרה לבדיקות". קודים בלבד.
// ══════════════════════════════════════════════════════════════════
var TEST_GROUPS = [{ fam: "A0", name: "דימות" }, { fam: "A2", name: "בדיקות תפקוד" },
                   { fam: "A3", name: "אנדוסקופיה" }, { fam: "A4", name: "פתולוגיה" }];

// מסמכי הבדיקות: [{ di: אינדקס ב-DATA.docs, fam, code, worst, organs, unv }]
function testDocs() {
  var out = [];
  DATA.docs.forEach(function(d, di) {
    var code = DATA.records[d.headIdx].eventCode || "";
    var fam = code.substring(0, 2);
    if (!TEST_GROUPS.some(function(g) { return g.fam === fam; })) return;
    var worst = null, organs = [], unv = false;
    d.recordIdx.forEach(function(i) {
      var r = DATA.records[i];
      if (worst === null || sevRank(r.severity.code) > sevRank(worst)) worst = r.severity.code;
      var k = r.organ.code || r.systemCode;
      if (k && organs.indexOf(k) === -1) organs.push(k);
      if (!r.verified) unv = true;
    });
    out.push({ di: di, fam: fam, code: code, worst: worst, organs: organs, unv: unv });
  });
  return out;
}

function renderTests(card) {
  var all = testDocs();
  if (!all.length) { card.innerHTML = '<div class="empty">אין בדיקות</div>'; return; }
  // בחירת פתיחה: הקבוצה של הבדיקה האחרונה (המסמכים מסודרים מהחדש לישן)
  if (!state.testsSel) state.testsSel = all[0].fam;

  var html = "";
  TEST_GROUPS.forEach(function(g) {
    var inGroup = all.filter(function(t) { return t.fam === g.fam; });
    if (!inGroup.length) return;
    var types = [];
    inGroup.forEach(function(t) { var a = eventAbbr(t.code); if (types.indexOf(a) === -1) types.push(a); });
    html += '<div class="tgroup"><span class="tile' + (state.testsSel === g.fam ? " active" : "") +
      '" data-tsel="' + g.fam + '"><b>' + esc(g.name) + '</b><span class="n">' + inGroup.length + '</span></span>' +
      types.map(function(a) {
        var list = inGroup.filter(function(t) { return eventAbbr(t.code) === a; });
        var worst = list.reduce(function(w, t) { return (w === null || sevRank(t.worst) > sevRank(w)) ? t.worst : w; }, null);
        return '<span class="tile' + (state.testsSel === g.fam + ":" + a ? " active" : "") +
          '" data-tsel="' + esc(g.fam + ":" + a) + '"><span class="sev" style="background:' + sevColor(worst) + '"></span>' +
          '<b>' + esc(a) + '</b><span class="n">' + list.length + '</span></span>';
      }).join("") + '</div>';
  });

  var parts = state.testsSel.split(":");
  var sel = all.filter(function(t) { return t.fam === parts[0] && (!parts[1] || eventAbbr(t.code) === parts[1]); });
  html += '<div class="stlist">' + sel.map(function(t) {
    var d = DATA.docs[t.di];
    return '<div class="strow' + (t.unv ? " unv" : "") + '" data-di="' + t.di + '">' +
      '<span class="dot" style="background:' + sevColor(t.worst) + '"></span>' +
      '<span class="d">' + esc(dotDate(d.date)) + '</span>' +
      '<span class="a">' + esc(eventAbbr(t.code)) + '</span>' +
      '<span class="c">' + (d.recordIdx.length === 1 ? "ממצא אחד" : d.recordIdx.length + " ממצאים") + '</span>' +
      '<span class="ics">' + t.organs.map(function(k) { return iconImg(k); }).join("") + '</span></div>';
  }).join("") + '</div>';

  html += '<div class="legend">' +
    '<span><span class="sw circle" style="border-color:#2e9d4a"></span>תקין</span>' +
    '<span><span class="sw" style="border-color:#f2c500"></span>קל</span>' +
    '<span><span class="sw" style="border-color:#ea6a00"></span>בינוני</span>' +
    '<span><span class="sw" style="border-color:#d32f2f"></span>חמור</span>' +
    '<span>צבע הנקודה — החומרה הגבוהה בבדיקה</span><span style="opacity:.6">שורה שקופה — יש ממצא שלא אומת</span></div>';
  card.innerHTML = html;

  Array.prototype.forEach.call(card.querySelectorAll("[data-tsel]"), function(el) {
    el.onclick = function() { state.testsSel = el.getAttribute("data-tsel"); render(); };
  });
  Array.prototype.forEach.call(card.querySelectorAll(".strow"), function(el) {
    el.onclick = function() {
      docIndex = Number(el.getAttribute("data-di"));
      state.cameFrom = "tests";
      setMode("event");
    };
  });
}

// פתיחת המסמך של רשומה במצב אירוע (מהיסטוריה)
function openRecord(i) {
  for (var d = 0; d < DATA.docs.length; d++) {
    if (DATA.docs[d].recordIdx.indexOf(i) !== -1) { docIndex = d; break; }
  }
  state.cameFrom = "history";
  setMode("event");
}

function setMode(mode) {
  state.mode = mode;
  if (mode !== "event") state.cameFrom = "";
  render();
  window.scrollTo(0, 0);
}

function buildSelect() {
  var sel = document.getElementById("docSelect");
  sel.innerHTML = (DATA.docs || []).map(function(d, i) {
    var h = DATA.records[d.headIdx];
    return '<option value="' + i + '">' + esc(dotDate(d.date) + " · " + eventAbbr(h.eventCode) +
           " (" + d.recordIdx.length + ")") + '</option>';
  }).join("");
  sel.addEventListener("change", function() { docIndex = Number(sel.value); render(); });
}

function go(delta) {
  var next = docIndex + delta;
  if (next < 0 || next >= DATA.docs.length) return;
  docIndex = next;
  render();
}

document.getElementById("btnPrev").addEventListener("click", function() { go(-1); });
document.getElementById("btnNext").addEventListener("click", function() { go(1); });
document.getElementById("tabEvent").addEventListener("click", function() { setMode("event"); });
document.getElementById("tabHistory").addEventListener("click", function() { setMode("history"); });
document.getElementById("tabLab").addEventListener("click", function() { setMode("lab"); });
document.getElementById("tabNow").addEventListener("click", function() { setMode("now"); });
document.getElementById("tabGen").addEventListener("click", function() { setMode("gen"); });
document.getElementById("tabTests").addEventListener("click", function() { setMode("tests"); });
document.addEventListener("keydown", function(e) {
  if (e.target && e.target.tagName === "SELECT") return;
  if (state.mode !== "event") return;
  if (e.key === "ArrowRight") go(-1);
  if (e.key === "ArrowLeft")  go(1);
});

// [Task #260] חלון בתוך הגליון — כפתור יציאה שסוגר את החלון וחוזר לגליון
if (DATA.hostMode === "dialog") {
  var btnExit = document.getElementById("btnExit");
  btnExit.style.display = "";
  btnExit.addEventListener("click", function() { google.script.host.close(); });
}
// המסמך של השורה שנבחרה עוד לא חולץ ליומן_מצב_רפואי — מוצג המסמך האחרון
if (DATA.requested === "missing") {
  document.getElementById("notice").textContent =
    "לשורה שנבחרה עדיין אין רשומות ביומן_מצב_רפואי, בבדיקות_דם או בבדיקות_גנטיות — מוצג המסמך האחרון.";
}
// [3ב] השורה המסומנת היא מסמך מעבדה — פתיחה בלשונית מעבדה, עם הדגשת התוצאות שלו
if (DATA.requested === "lab") {
  state.mode = "lab";
  state.labHighlight = DATA.requestedKey || "";
}
// [שלב 4] השורה המסומנת היא מסמך גנטי — פתיחה בלשונית גנטיקה, עם הדגשת התכונות שלו
if (DATA.requested === "gen") {
  state.mode = "gen";
  state.genHighlight = DATA.requestedKey || "";
}

// [Task #271] פס פרופיל מטופל — מין (סמל בינלאומי) וגיל, קבוע בכל הלשוניות.
// אין נתון — "?" ורקע אפור ("לא תועד"). אישה — אזהרה: דמות הגוף מוצגת כגבר (דמות אישה נדחתה).
// ערך הדגמה — מסגרת מקווקוות ותג "הדגמה". פירוט מלא בחלונית הריחוף.
function renderProfile() {
  var el = document.getElementById("profile");
  var p = DATA.profile || {};
  var sexSym = p.sex === "M" ? "\u2642" : (p.sex === "F" ? "\u2640" : "?");
  var sexHe  = p.sex === "M" ? "גבר" : (p.sex === "F" ? "אישה" : "מין לא תועד");
  var ageTxt = (p.age !== null && p.age !== undefined) ? String(p.age) : "?";
  var tip = sexHe + " · " + (p.birthYear ? "שנת לידה " + p.birthYear : "שנת לידה לא תועדה");
  var html = '<span class="sex">' + sexSym + '</span><span class="age">' + esc(ageTxt) + '</span>';
  if (p.sex === "F") {
    html += '<span class="warn">&#9888;</span>';
    tip += " · דמות הגוף מוצגת כגבר — דמות אישה טרם נבנתה";
  }
  if (p.demo) {
    html += '<span class="demo">הדגמה</span>';
    tip += " · ערך הדגמה";
  }
  el.innerHTML = html;
  el.title = tip;
  el.className = "profile" + ((!p.sex && ageTxt === "?") ? " nodata" : "") + (p.demo ? " isdemo" : "");
}

document.getElementById("footer").textContent = DATA.builtAt ? ("נטען: " + DATA.builtAt) : "";
renderProfile();
if (!DATA.error) buildSelect();
render();
</script>
</body>
</html>