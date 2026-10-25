<!--
  MedicalPilot — LAB_Infographic.html
  @version     1.3.0 | @updated 25/10/2026 21:20 | @service VIEWENGINE
  @description כרטיס אינפוגרפי לאירוע בודד ביומן_מצב_רפואי (וגם בגליון הניסוי):
               תצוגה גרפית — דמות גוף עם סמן האיבר (או מערכת הגוף) במיקום
               האנטומי, צבע הסמן לפי חומרה וסגנון המסגרת לפי ודאות. מתחת
               לדמות: שורת מערכת→איבר, שורת אבחנה→ודאות (כולל דירוג, למשל
               PIRADS 4)→חומרה, שורת סוג האירוע, שורת המלצה, ומידע מנהלי
               (מוסד/רופא) בתחתית. ללא קודים טכניים בתצוגה.
               [v1.3.0] שתי לשוניות: "אירוע" (הכרטיס הבודד) ו"היסטוריה" — כל
               האירועים על הדמות בסמנים מקובצים לפי מיקום, סינון לפי מערכת
               גוף או התמחות רופא, ציר זמן ופס מחלות רקע.
  @impacts     תצוגה בלבד — אינו כותב לשום גליון. מקבל recordJson מ-
               runInfographicIconMedicalStatus_LAB (ViewEngine.gs).
               [v1.3.0] מקבל dataJson (במקום recordJson) — רשומות כל הגליון,
               מפת אייקונים, אינדקס השורה הפעילה, מצב פתיחה, שמות מערכות,
               רשימת התמחויות ומיפוי התמחות→מערכות/אבחנות.
  @callers     ViewEngine.gs (runInfographicIconMedicalStatus_LAB, template.evaluate)
  @functions   esc, severityStyle, certaintyStyle, iconImg (JS פנימי בעמוד)
               isVerified, renderEvent, severityRank, matchesFilter,
               filteredIndexes, renderFilterButtons, buildGroups, groupMarker,
               renderRecordList, renderTimeline, xOf, renderHistory, openEvent,
               setMode (JS פנימי בעמוד, v1.3.0)
  @changes     [v1.3.0] Task #211 — מצב היסטוריה על הכרטיס הקיים. לשוניות
               אירוע|היסטוריה; מצב אירוע זהה ויזואלית ל-v1.2.0 (אייקונים מתוך
               מפת ICONS משותפת). היסטוריה: לחצן בחירה "מערכות גוף"/"התמחות"
               וכפתורי סינון (רק ערכים שיש להם רשומות); סמנים מקובצים לפי
               מיקום עם מספר רשומות, צבע = החומרה החמורה בקבוצה, "!" כשיש רשומה
               שטרם אומתה, שקיפות כשכל הקבוצה לא מאומתת; אזור "מערכתי" לסמנים
               ללא מיקום; לחיצה על סמן → רשימת הרשומות → לחיצה → כרטיס בודד עם
               "→ חזרה להיסטוריה". ציר זמן (SVG, ימין לשמאל) עם נקודה לכל
               אירוע לפי חומרה, ערימה לאותו יום, לחיצה → כרטיס; פס "מחלות רקע
               (N)" לרשומות CRT4 → רשימה. מקרא צבעים. פתיחה ללא שורה פעילה →
               ישירות להיסטוריה, לשונית אירוע מושבתת. אומת מול הקוד החי ובבדיקה
               פונקציונלית בגליון (5 תרחישים, צילומי מסך).
  @changes     [v1.2.0] Task #214 + Task #219 — מעבר מכרטיס טקסט לתצוגה
               גרפית לפי סימולציות שאושרו לשורות 5-6: כותרת = שם האירוע,
               ומתחתיה תאריך · התמחות. סמן על דמות הגוף = אייקון האיבר
               (record.organ, מ-Organ_Code) או המערכת, במיקום האיבר/המערכת;
               צבע לפי Severity_Code (SEV0 ירוק, SEV1 צהוב, SEV2 כתום, SEV3
               אדום, SEV4/ריק אפור), מסגרת לפי Diagnosis_Certainty (CRT0
               מקווקוות, CRT1 מנוקדת, CRT2 מלאה, CRT3 עמומה). מערכות ללא
               מיקום אחד (כללית/עור/לימפה/חיסון/גנים) — סמן במרכז עם התווית
               "מערכתי — לא ממוקם". שלוש שורות תגים: מערכת→איבר, אבחנה→
               ודאות (+ certainty.detail מודגש)→סולם חומרה, סוג האירוע. שורת
               המלצה (record.recommendation + אייקון RECO) רק כשיש תוכן. מוסד/
               רופא בתחתית מתחת לקו מפריד. הוסרו הקודים הטכניים מהתצוגה.
  @changes     [v1.1.0] Task #214 — כרטיס אירוע מורחב: נוספו תאריך, מנפיק, קוד
               מערכת גוף, התמחות/חומרה/אבחנה/ודאות (שם + קוד) ותג "טרם אומת"
               כש-Record_Status≠"מאומת". צבע מסגרת סמן האיבר + פס הכרטיס + תג
               הוודאות לפי Diagnosis_Certainty: CRT0 כתום, CRT1 ענבר, CRT2
               אדום, CRT3 אפור, ריק — טורקיז (כמו קודם). כל הטקסט עובר
               escape לפני הצגה (קודם הוזרק כ-HTML גולמי). נוספה כותרת זו
               (לא הייתה לקובץ כותרת עד כה).
-->
<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <meta charset="utf-8">
    <style>
      body {
        font-family: Arial, sans-serif;
        direction: rtl;
        margin: 0;
        padding: 10px 6px;
        background: #f5f7fa;
        color: #263238;
      }
      /* ═══ [Task #211] מעבר מצבים ═══ */
      .tabs {
        display: flex;
        gap: 4px;
        margin-bottom: 10px;
        background: #e3e8ec;
        border-radius: 10px;
        padding: 3px;
      }
      .tab {
        flex: 1;
        text-align: center;
        font-size: 12px;
        font-weight: bold;
        padding: 6px 0;
        border-radius: 8px;
        cursor: pointer;
        color: #546e7a;
        user-select: none;
      }
      .tab.active {
        background: #fff;
        color: #00838f;
        box-shadow: 0 1px 3px rgba(0,0,0,0.12);
      }
      .tab.disabled {
        opacity: 0.4;
        cursor: default;
      }
      .back-link {
        font-size: 11px;
        color: #00838f;
        cursor: pointer;
        margin-bottom: 6px;
        display: inline-block;
      }
      /* ═══ כרטיס אירוע בודד (ללא שינוי חזותי מגרסה 1.2.0) ═══ */
      .head {
        text-align: center;
        margin-bottom: 6px;
      }
      .head .event {
        font-size: 16px;
        font-weight: bold;
      }
      .head .meta {
        font-size: 11px;
        color: #78909c;
        margin-top: 2px;
      }
      .warn {
        display: inline-block;
        margin-top: 6px;
        font-size: 11px;
        font-weight: bold;
        color: #e65100;
        background: #fff3e0;
        border: 1px solid #ffb74d;
        border-radius: 10px;
        padding: 1px 8px;
      }
      .stage {
        position: relative;
        width: 260px;
        height: 300px;
        margin: 0 auto;
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      }
      .stage img.body-base {
        position: absolute;
        top: 10px;
        left: 20px;
        width: 220px;
        height: 280px;
        opacity: 0.35;
      }
      .marker {
        position: absolute;
        width: 58px;
        height: 58px;
        border-radius: 50%;
        background: #fff;
        border: 4px solid #90a4ae;
        transform: translate(-50%, -50%);
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 0 6px rgba(144,164,174,0.18);
      }
      .marker img.main {
        width: 36px;
        height: 36px;
      }
      .systemic-label {
        position: absolute;
        top: 8px;
        right: 10px;
        font-size: 10px;
        color: #90a4ae;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 6px;
        margin-top: 12px;
      }
      .chip {
        display: flex;
        align-items: center;
        gap: 5px;
        background: #fff;
        border: 1px solid #e0e6ea;
        border-radius: 14px;
        padding: 3px 7px 3px 5px;
        font-size: 11px;
      }
      .chip img {
        width: 18px;
        height: 18px;
      }
      .ring {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        display: inline-block;
        box-sizing: border-box;
        border: 2px solid #546e7a;
      }
      .scale {
        display: flex;
        gap: 2px;
      }
      .scale span {
        width: 6px;
        height: 12px;
        border-radius: 2px;
        background: #eceff1;
        display: inline-block;
      }
      .chip-row {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 4px;
        width: 100%;
      }
      .admin {
        text-align: center;
        font-size: 10px;
        color: #90a4ae;
        margin-top: 12px;
        padding-top: 6px;
        border-top: 1px solid #e0e6ea;
      }
      .reco {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin: 12px auto 0;
        max-width: 260px;
        background: #e8f4f8;
        border: 1px solid #b2dbe6;
        border-radius: 10px;
        padding: 7px 10px;
        font-size: 12px;
        line-height: 1.4;
      }
      .reco img {
        width: 22px;
        height: 22px;
        flex-shrink: 0;
      }
      /* ═══ [Task #211] מצב היסטוריה ═══ */
      .filter-type {
        display: flex;
        justify-content: center;
        gap: 12px;
        font-size: 11px;
        margin-bottom: 6px;
      }
      .filter-type label {
        cursor: pointer;
      }
      .filter-btns {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 4px;
        margin-bottom: 8px;
      }
      .fbtn {
        font-size: 10.5px;
        background: #fff;
        border: 1px solid #cfd8dc;
        border-radius: 12px;
        padding: 3px 8px;
        cursor: pointer;
        color: #37474f;
        user-select: none;
      }
      .fbtn.active {
        background: #00838f;
        border-color: #00838f;
        color: #fff;
      }
      .hmarker {
        position: absolute;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: #fff;
        border: 4px solid #90a4ae;
        transform: translate(-50%, -50%);
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .hmarker img {
        width: 24px;
        height: 24px;
      }
      .hmarker.selected {
        outline: 3px solid #263238;
        outline-offset: 2px;
      }
      .badge-count {
        position: absolute;
        top: -7px;
        right: -7px;
        min-width: 16px;
        height: 16px;
        border-radius: 8px;
        background: #263238;
        color: #fff;
        font-size: 10px;
        font-weight: bold;
        line-height: 16px;
        text-align: center;
        padding: 0 3px;
        box-sizing: border-box;
      }
      .badge-unverified {
        position: absolute;
        bottom: -6px;
        left: -6px;
        width: 15px;
        height: 15px;
        border-radius: 50%;
        background: #ef6c00;
        color: #fff;
        font-size: 11px;
        font-weight: bold;
        line-height: 15px;
        text-align: center;
      }
      .systemic-zone {
        width: 260px;
        margin: 8px auto 0;
        background: #fff;
        border-radius: 10px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        padding: 6px 8px 8px;
        box-sizing: border-box;
      }
      .systemic-zone .title {
        font-size: 10px;
        color: #90a4ae;
        margin-bottom: 6px;
      }
      .systemic-row {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        padding: 4px 6px;
      }
      .systemic-row .hmarker {
        position: relative;
        transform: none;
      }
      .group-list {
        width: 260px;
        margin: 8px auto 0;
        background: #fff;
        border-radius: 10px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        padding: 6px 8px;
        box-sizing: border-box;
      }
      .group-list .title {
        font-size: 11px;
        font-weight: bold;
        margin-bottom: 4px;
      }
      .rec-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        padding: 4px 2px;
        border-top: 1px solid #eef1f3;
        cursor: pointer;
      }
      .rec-item:hover {
        background: #f1f8f9;
      }
      .rec-item .date {
        color: #78909c;
        white-space: nowrap;
      }
      .rec-item .text {
        flex: 1;
      }
      .rec-item.unverified {
        opacity: 0.55;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
        flex-shrink: 0;
      }
      .timeline {
        width: 260px;
        margin: 8px auto 0;
        background: #fff;
        border-radius: 10px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        padding: 6px 8px 4px;
        box-sizing: border-box;
      }
      .timeline .title {
        font-size: 10px;
        color: #90a4ae;
        margin-bottom: 2px;
      }
      .timeline svg circle,
      .timeline svg rect.bg-lane {
        cursor: pointer;
      }
      .empty-note {
        text-align: center;
        font-size: 11px;
        color: #90a4ae;
        padding: 10px 0;
      }
      .legend {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 9.5px;
        color: #78909c;
        margin-top: 8px;
      }
      .legend span {
        display: flex;
        align-items: center;
        gap: 3px;
      }
    </style>
  </head>
  <body>
    <div class="tabs">
      <div class="tab" id="tab-event">אירוע</div>
      <div class="tab" id="tab-history">היסטוריה</div>
    </div>

    <!-- ═══ מצב אירוע בודד ═══ -->
    <div id="view-event">
      <div id="event-back"></div>
      <div class="head" id="head"></div>
      <div class="stage" id="stage">
        <img class="body-base" src="<?!= bodyImageData ?>" alt="דמות גוף כללית">
      </div>
      <div class="chips" id="chips"></div>
      <div id="reco"></div>
      <div class="admin" id="admin"></div>
    </div>

    <!-- ═══ [Task #211] מצב היסטוריה ═══ -->
    <div id="view-history" style="display:none">
      <div class="filter-type">
        <label><input type="radio" name="ftype" value="system" checked> מערכות גוף</label>
        <label><input type="radio" name="ftype" value="specialty"> התמחות</label>
      </div>
      <div class="filter-btns" id="filter-btns"></div>
      <div class="stage" id="h-stage">
        <img class="body-base" src="<?!= bodyImageData ?>" alt="דמות גוף כללית">
      </div>
      <div id="h-systemic"></div>
      <div id="h-list"></div>
      <div class="timeline" id="h-timeline"></div>
      <div class="legend">
        <span><i class="dot" style="background:#E53935"></i>חמור</span>
        <span><i class="dot" style="background:#FB8C00"></i>בינוני</span>
        <span><i class="dot" style="background:#FDD835"></i>קל</span>
        <span><i class="dot" style="background:#43A047"></i>תקין</span>
        <span><i class="dot" style="background:#ef6c00;opacity:.5"></i>טרם אומת</span>
      </div>
    </div>

    <script>
      var DATA    = <?!= dataJson ?>;
      var RECORDS = DATA.records || [];
      var ICONS   = DATA.icons || {};

      // [Task #214] צבע לפי חומרה (Severity_Code)
      var SEVERITY = {
        SEV0: { color: '#43A047', level: 1 },
        SEV1: { color: '#FDD835', level: 2 },
        SEV2: { color: '#FB8C00', level: 3 },
        SEV3: { color: '#E53935', level: 4 },
        SEV4: { color: '#90A4AE', level: 0 }
      };
      // [Task #214] סגנון מסגרת לפי ודאות (Diagnosis_Certainty)
      var CERTAINTY = {
        CRT0: { border: 'dashed', opacity: 1 },
        CRT1: { border: 'dotted', opacity: 1 },
        CRT2: { border: 'solid',  opacity: 1 },
        CRT3: { border: 'solid',  opacity: 0.4 }
      };
      // [Task #211] ודאות "רקע" — מחלות רקע מוצגות בפס נפרד בציר הזמן
      var BACKGROUND_CERTAINTY = 'CRT4';

      function esc(s) {
        return String(s === null || s === undefined ? '' : s)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }

      function severityStyle(code) {
        return SEVERITY[code] || { color: '#90A4AE', level: 0 };
      }

      function certaintyStyle(code) {
        return CERTAINTY[code] || { border: 'solid', opacity: 1 };
      }

      function iconImg(key, cls) {
        var data = key ? ICONS[key] : '';
        return data ? '<img class="' + (cls || '') + '" src="' + data + '">' : '';
      }

      function isVerified(r) {
        return r.recordStatus === 'מאומת';
      }

      // ═══ מצב ═══
      var state = {
        mode:          DATA.startMode || 'history',
        eventIndex:    DATA.currentIndex,
        cameFromHistory: false,
        filterType:    'system',
        filterValue:   'ALL',
        selectedGroup: null
      };

      // ══════════════════════════════════════════════════════════════
      // מצב "אירוע" — כרטיס בודד (תצוגה זהה לגרסה 1.2.0)
      // ══════════════════════════════════════════════════════════════
      function renderEvent(record) {
        var sev  = severityStyle(record.severity.code);
        var cert = certaintyStyle(record.certainty.code);

        document.getElementById('event-back').innerHTML = state.cameFromHistory
          ? '<span class="back-link" id="back-link">→ חזרה להיסטוריה</span>' : '';
        var back = document.getElementById('back-link');
        if (back) back.onclick = function() { setMode('history'); };

        // כותרת — אירוע, ומתחתיו תאריך · התמחות
        var meta = [];
        if (record.eventDate) meta.push(esc(record.eventDate));
        if (record.specialty.name) meta.push(esc(record.specialty.name));
        document.getElementById('head').innerHTML =
          '<div class="event">' + esc(record.eventDesc) + '</div>' +
          '<div class="meta">' + meta.join(' · ') + '</div>' +
          (!isVerified(record) ? '<div class="warn">⚠️ טרם אומת</div>' : '');

        // סמן על דמות הגוף — אייקון האיבר (או המערכת), צבע חומרה, מסגרת ודאות
        var stage = document.getElementById('stage');
        Array.prototype.slice.call(stage.querySelectorAll('.marker, .systemic-label')).forEach(function(el) {
          el.parentNode.removeChild(el);
        });
        var marker = document.createElement('div');
        marker.className = 'marker';
        var pos = record.markerPos;
        if (pos) {
          marker.style.top  = pos.top;
          marker.style.left = pos.left;
        } else {
          marker.style.top  = '50%';
          marker.style.left = '50%';
          var lbl = document.createElement('div');
          lbl.className = 'systemic-label';
          lbl.textContent = 'מערכתי — לא ממוקם';
          stage.appendChild(lbl);
        }
        marker.style.borderColor = sev.color;
        marker.style.borderStyle = cert.border;
        marker.style.opacity     = cert.opacity;
        marker.style.boxShadow   = '0 0 0 7px ' + sev.color + '33';
        marker.innerHTML = iconImg(record.markerIconKey, 'main');
        stage.appendChild(marker);

        // שורה 1: מערכת ← איבר
        var row1 = ['<div class="chip">' + iconImg(record.systemIconKey) + esc(record.system) + '</div>'];
        if (record.organ && record.organ.code) {
          row1.push('<div class="chip">' + iconImg(record.organ.iconKey) + esc(record.organ.name) + '</div>');
        }
        // שורה 2: אבחנה ← ודאות ← חומרה
        var row2 = [];
        if (record.diagnosis.name) row2.push('<div class="chip">' + esc(record.diagnosis.name) + '</div>');
        if (record.certainty.code) {
          row2.push('<div class="chip"><span class="ring" style="border-style:' + cert.border + ';opacity:' + cert.opacity + '"></span>' + esc(record.certainty.name || record.certainty.code) + (record.certainty.detail ? ' · <b>' + esc(record.certainty.detail) + '</b>' : '') + '</div>');
        }
        var bars = '';
        for (var i = 1; i <= 4; i++) bars += '<span style="background:' + (i <= sev.level ? sev.color : '#eceff1') + '"></span>';
        row2.push('<div class="chip"><span class="scale">' + bars + '</span>' + esc(record.severity.name || 'חומרה לא צוינה') + '</div>');
        // שורה 3: סוג האירוע
        var row3 = [];
        if (record.eventIconKey || record.eventCode) {
          row3.push('<div class="chip">' + iconImg(record.eventIconKey) + esc(record.eventCategory || record.eventCode) + '</div>');
        }
        document.getElementById('chips').innerHTML =
          '<div class="chip-row">' + row1.join('') + '</div>' +
          '<div class="chip-row">' + row2.join('') + '</div>' +
          (row3.length ? '<div class="chip-row">' + row3.join('') + '</div>' : '');

        // המלצה — טקסט קצר מעמודת Recommendations
        document.getElementById('reco').innerHTML = record.recommendation
          ? '<div class="reco">' + iconImg(record.recoIconKey) + '<div>' + esc(record.recommendation) + '</div></div>'
          : '';

        // מידע מנהלי — למטה
        document.getElementById('admin').textContent = record.docIssuer || '';
      }

      // ══════════════════════════════════════════════════════════════
      // [Task #211] מצב "היסטוריה" — כל הרשומות על דמות הגוף
      // ══════════════════════════════════════════════════════════════

      // דירוג חומרה לבחירת הצבע "החמור ביותר" בקבוצה
      function severityRank(code) {
        return severityStyle(code).level;
      }

      function matchesFilter(r) {
        if (state.filterValue === 'ALL') return true;
        if (state.filterType === 'system') return r.systemCode === state.filterValue;
        var rule = (DATA.specialtyFilter || {})[state.filterValue];
        if (!rule) return false;
        if (rule.all) return true;
        return (rule.systems || []).indexOf(r.systemCode) !== -1 ||
               (rule.dx || []).indexOf(r.diagnosis.code) !== -1;
      }

      function filteredIndexes() {
        var out = [];
        RECORDS.forEach(function(r, i) { if (matchesFilter(r)) out.push(i); });
        return out;
      }

      // כפתורי הסינון — רק ערכים שיש להם לפחות רשומה אחת
      function renderFilterButtons() {
        var btns = [{ code: 'ALL', name: 'הכל' }];
        if (state.filterType === 'system') {
          var seen = {};
          RECORDS.forEach(function(r) { if (r.systemCode) seen[r.systemCode] = true; });
          Object.keys(seen).sort().forEach(function(code) {
            btns.push({ code: code, name: (DATA.systemNames || {})[code] || code });
          });
        } else {
          (DATA.specialties || []).forEach(function(s) {
            var rule = (DATA.specialtyFilter || {})[s.code];
            if (!rule || rule.all) return;
            var saved = state.filterValue;
            state.filterValue = s.code;
            var has = RECORDS.some(matchesFilter);
            state.filterValue = saved;
            if (has) btns.push({ code: s.code, name: s.name });
          });
        }
        var box = document.getElementById('filter-btns');
        box.innerHTML = btns.map(function(b) {
          return '<span class="fbtn' + (b.code === state.filterValue ? ' active' : '') + '" data-code="' + esc(b.code) + '">' + esc(b.name) + '</span>';
        }).join('');
        Array.prototype.slice.call(box.querySelectorAll('.fbtn')).forEach(function(el) {
          el.onclick = function() {
            state.filterValue   = el.getAttribute('data-code');
            state.selectedGroup = null;
            renderHistory();
          };
        });
      }

      // קיבוץ לפי מיקום: positionKey (איבר/מערכת עם מיקום) או מערכת (מערכתי)
      function buildGroups(indexes) {
        var groups = {};
        var order  = [];
        indexes.forEach(function(i) {
          var r   = RECORDS[i];
          var key = r.positionKey ? 'P:' + r.positionKey : 'S:' + (r.systemCode || '?');
          if (!groups[key]) {
            groups[key] = { key: key, placed: !!r.positionKey, pos: r.markerPos, items: [] };
            order.push(key);
          }
          groups[key].items.push(i);
        });
        return order.map(function(k) { return groups[k]; });
      }

      function groupMarker(g, placed) {
        var worst = null;
        var allUnverified = true;
        var anyUnverified = false;
        g.items.forEach(function(i) {
          var r = RECORDS[i];
          if (!worst || severityRank(r.severity.code) > severityRank(worst.severity.code)) worst = r;
          if (isVerified(r)) allUnverified = false; else anyUnverified = true;
        });
        var sev = severityStyle(worst.severity.code);
        var el  = document.createElement('div');
        el.className = 'hmarker' + (state.selectedGroup === g.key ? ' selected' : '');
        if (placed && g.pos) {
          el.style.top  = g.pos.top;
          el.style.left = g.pos.left;
        }
        el.style.borderColor = sev.color;
        el.style.boxShadow   = '0 0 0 5px ' + sev.color + '33';
        if (allUnverified) el.style.opacity = 0.5;
        var iconKey = worst.markerIconKey;
        el.innerHTML = (iconImg(iconKey) || '<span style="font-size:10px">' + esc((worst.organ && worst.organ.name) || worst.system) + '</span>') +
          (g.items.length > 1 ? '<span class="badge-count">' + g.items.length + '</span>' : '') +
          (anyUnverified ? '<span class="badge-unverified">!</span>' : '');
        el.title = (worst.organ && worst.organ.code ? worst.organ.name : worst.system) + ' — ' + g.items.length + ' רשומות';
        el.onclick = function() {
          state.selectedGroup = (state.selectedGroup === g.key) ? null : g.key;
          renderHistory();
        };
        return el;
      }

      function renderRecordList(title, indexes) {
        var box = document.getElementById('h-list');
        if (!indexes || !indexes.length) { box.innerHTML = ''; return; }
        var sorted = indexes.slice().sort(function(a, b) {
          return (RECORDS[b].eventTs || 0) - (RECORDS[a].eventTs || 0);
        });
        box.innerHTML = '<div class="group-list"><div class="title">' + esc(title) + '</div>' +
          sorted.map(function(i) {
            var r = RECORDS[i];
            var text = r.diagnosis.name ? r.eventDesc + ' — ' + r.diagnosis.name : r.eventDesc;
            return '<div class="rec-item' + (isVerified(r) ? '' : ' unverified') + '" data-i="' + i + '">' +
              '<i class="dot" style="background:' + severityStyle(r.severity.code).color + '"></i>' +
              '<span class="date">' + esc(r.eventDate || '—') + '</span>' +
              '<span class="text">' + esc(text) + (isVerified(r) ? '' : ' ⚠️') + '</span></div>';
          }).join('') + '</div>';
        Array.prototype.slice.call(box.querySelectorAll('.rec-item')).forEach(function(el) {
          el.onclick = function() { openEvent(Number(el.getAttribute('data-i'))); };
        });
      }

      // ציר זמן — נקודה לכל אירוע; מחלות רקע (CRT4) בפס נפרד
      function renderTimeline(indexes) {
        var box = document.getElementById('h-timeline');
        var events = indexes.filter(function(i) {
          return RECORDS[i].eventTs && RECORDS[i].certainty.code !== BACKGROUND_CERTAINTY;
        });
        var background = indexes.filter(function(i) {
          return RECORDS[i].certainty.code === BACKGROUND_CERTAINTY;
        });
        if (!events.length && !background.length) {
          box.innerHTML = '<div class="title">ציר זמן</div><div class="empty-note">אין אירועים מתוארכים</div>';
          return;
        }
        var W = 244, X0 = 10, X1 = W - 10;
        var tsList = events.map(function(i) { return RECORDS[i].eventTs; });
        var minTs = tsList.length ? Math.min.apply(null, tsList) : Date.now();
        var maxTs = tsList.length ? Math.max.apply(null, tsList) : Date.now();
        var minY = new Date(minTs).getFullYear();
        var maxY = new Date(maxTs).getFullYear() + 1;
        var t0 = new Date(minY, 0, 1).getTime();
        var t1 = new Date(maxY, 0, 1).getTime();
        // ציר מימין לשמאל (עברית) — המוקדם בימין
        function xOf(ts) { return X1 - (ts - t0) / (t1 - t0) * (X1 - X0); }

        var svg = '<svg width="' + W + '" height="74" xmlns="http://www.w3.org/2000/svg">';
        svg += '<line x1="' + X0 + '" y1="26" x2="' + X1 + '" y2="26" stroke="#b0bec5" stroke-width="1"/>';
        for (var y = minY; y <= maxY; y++) {
          var x = xOf(new Date(y, 0, 1).getTime());
          svg += '<line x1="' + x + '" y1="22" x2="' + x + '" y2="30" stroke="#b0bec5"/>';
          svg += '<text x="' + x + '" y="42" font-size="9" fill="#90a4ae" text-anchor="middle">' + y + '</text>';
        }
        // נקודות — אירועים באותו יום מוערמים כלפי מעלה
        var stackByDay = {};
        events.forEach(function(i) {
          var r = RECORDS[i];
          var day = r.eventDate;
          var level = stackByDay[day] || 0;
          stackByDay[day] = level + 1;
          var cy = 26 - level * 7;
          svg += '<circle data-i="' + i + '" cx="' + xOf(r.eventTs) + '" cy="' + cy + '" r="5" fill="' +
            severityStyle(r.severity.code).color + '" stroke="#fff" stroke-width="1" opacity="' +
            (isVerified(r) ? 1 : 0.45) + '"><title>' + esc(r.eventDate + ' — ' + r.eventDesc) + '</title></circle>';
        });
        // פס רקע
        if (background.length) {
          svg += '<rect class="bg-lane" x="' + X0 + '" y="54" width="' + (X1 - X0) + '" height="12" rx="6" fill="#cfd8dc"/>';
          svg += '<text class="bg-lane-text" x="' + (W / 2) + '" y="63" font-size="9" fill="#37474f" text-anchor="middle" style="pointer-events:none">מחלות רקע (' + background.length + ')</text>';
        }
        svg += '</svg>';
        box.innerHTML = '<div class="title">ציר זמן</div>' + svg;

        Array.prototype.slice.call(box.querySelectorAll('circle')).forEach(function(el) {
          el.onclick = function() { openEvent(Number(el.getAttribute('data-i'))); };
        });
        var lane = box.querySelector('rect.bg-lane');
        if (lane) lane.onclick = function() {
          state.selectedGroup = null;
          renderHistory();
          renderRecordList('מחלות רקע', background);
        };
      }

      function renderHistory() {
        renderFilterButtons();
        var indexes = filteredIndexes();

        // ניקוי סמנים קודמים
        var stage = document.getElementById('h-stage');
        Array.prototype.slice.call(stage.querySelectorAll('.hmarker, .empty-note')).forEach(function(el) {
          el.parentNode.removeChild(el);
        });

        var groups   = buildGroups(indexes);
        var placed   = groups.filter(function(g) { return g.placed; });
        var systemic = groups.filter(function(g) { return !g.placed; });

        placed.forEach(function(g) { stage.appendChild(groupMarker(g, true)); });
        if (!indexes.length) {
          var note = document.createElement('div');
          note.className = 'empty-note';
          note.style.paddingTop = '130px';
          note.textContent = 'אין רשומות בסינון זה';
          stage.appendChild(note);
        }

        // אזור "מערכתי" — מערכות בלי מיקום על הגוף
        var sysBox = document.getElementById('h-systemic');
        sysBox.innerHTML = '';
        if (systemic.length) {
          var zone = document.createElement('div');
          zone.className = 'systemic-zone';
          zone.innerHTML = '<div class="title">מערכתי — לא ממוקם על הגוף</div>';
          var row = document.createElement('div');
          row.className = 'systemic-row';
          systemic.forEach(function(g) { row.appendChild(groupMarker(g, false)); });
          zone.appendChild(row);
          sysBox.appendChild(zone);
        }

        // רשימת הרשומות של הקבוצה שנבחרה
        var sel = groups.filter(function(g) { return g.key === state.selectedGroup; })[0];
        if (sel) {
          var first = RECORDS[sel.items[0]];
          var title = (first.organ && first.organ.code && sel.placed) ? first.organ.name : first.system;
          renderRecordList(title + ' — ' + sel.items.length + ' רשומות', sel.items);
        } else {
          renderRecordList('', []);
        }

        renderTimeline(indexes);
      }

      // ══════════════════════════════════════════════════════════════
      // ניווט בין המצבים
      // ══════════════════════════════════════════════════════════════
      function openEvent(index) {
        state.eventIndex      = index;
        state.cameFromHistory = true;
        setMode('event');
      }

      function setMode(mode) {
        if (mode === 'event' && (state.eventIndex === null || state.eventIndex < 0)) return;
        state.mode = mode;
        document.getElementById('view-event').style.display   = mode === 'event' ? '' : 'none';
        document.getElementById('view-history').style.display = mode === 'history' ? '' : 'none';
        document.getElementById('tab-event').className   = 'tab' + (mode === 'event' ? ' active' : '') +
          ((state.eventIndex === null || state.eventIndex < 0) ? ' disabled' : '');
        document.getElementById('tab-history').className = 'tab' + (mode === 'history' ? ' active' : '');
        if (mode === 'event') renderEvent(RECORDS[state.eventIndex]);
        else renderHistory();
        window.scrollTo(0, 0);
      }

      document.getElementById('tab-event').onclick   = function() { setMode('event'); };
      document.getElementById('tab-history').onclick = function() { setMode('history'); };
      Array.prototype.slice.call(document.querySelectorAll('input[name="ftype"]')).forEach(function(el) {
        el.onchange = function() {
          state.filterType    = el.value;
          state.filterValue   = 'ALL';
          state.selectedGroup = null;
          renderHistory();
        };
      });

      setMode(state.mode === 'event' && state.eventIndex >= 0 ? 'event' : 'history');
    </script>
  </body>
</html>