<!--
  MedicalPilot — LAB_Infographic.html
  @version     1.2.0 | @updated 13/10/2026 20:03 | @service VIEWENGINE
  @description כרטיס אינפוגרפי לאירוע בודד ביומן_מצב_רפואי (וגם בגליון הניסוי):
               תצוגה גרפית — דמות גוף עם סמן האיבר (או מערכת הגוף) במיקום
               האנטומי, צבע הסמן לפי חומרה וסגנון המסגרת לפי ודאות. מתחת
               לדמות: שורת מערכת→איבר, שורת אבחנה→ודאות (כולל דירוג, למשל
               PIRADS 4)→חומרה, שורת סוג האירוע, שורת המלצה, ומידע מנהלי
               (מוסד/רופא) בתחתית. ללא קודים טכניים בתצוגה.
  @impacts     תצוגה בלבד — אינו כותב לשום גליון. מקבל recordJson מ-
               runInfographicIconMedicalStatus_LAB (ViewEngine.gs).
  @callers     ViewEngine.gs (runInfographicIconMedicalStatus_LAB, template.evaluate)
  @functions   esc, severityStyle, certaintyStyle, iconImg (JS פנימי בעמוד)
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
        padding: 12px 6px;
        background: #f5f7fa;
        color: #263238;
      }
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
      .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        display: inline-block;
      }
      .ring {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        display: inline-block;
        box-sizing: border-box;
        border: 2px solid #546e7a;
      }
      .chip .code {
        color: #90a4ae;
        font-size: 10px;
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
      .chip .sep {
        color: #b0bec5;
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
    </style>
  </head>
  <body>
    <div class="head" id="head"></div>

    <div class="stage" id="stage">
      <img class="body-base" src="<?!= bodyImageData ?>" alt="דמות גוף כללית">
    </div>

    <div class="chips" id="chips"></div>

    <div id="reco"></div>

    <div class="admin" id="admin"></div>

    <script>
      var record = <?!= recordJson ?>;

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

      function iconImg(data, cls) {
        return data ? '<img class="' + (cls || '') + '" src="' + data + '">' : '';
      }

      var sev  = severityStyle(record.severity.code);
      var cert = certaintyStyle(record.certainty.code);

      // ═══ כותרת — אירוע, ומתחתיו תאריך · התמחות ═══
      var meta = [];
      if (record.eventDate) meta.push(esc(record.eventDate));
      if (record.specialty.name) meta.push(esc(record.specialty.name));
      document.getElementById('head').innerHTML =
        '<div class="event">' + esc(record.eventDesc) + '</div>' +
        '<div class="meta">' + meta.join(' · ') + '</div>' +
        (record.recordStatus !== 'מאומת' ? '<div class="warn">⚠️ טרם אומת</div>' : '');

      // ═══ סמן על דמות הגוף — אייקון האיבר (או המערכת), צבע חומרה, מסגרת ודאות ═══
      var stage  = document.getElementById('stage');
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
      marker.innerHTML = iconImg(record.markerIcon, 'main');
      stage.appendChild(marker);

      // ═══ שורה 1: מערכת ← איבר ═══
      var row1 = ['<div class="chip">' + iconImg(record.systemIcon) + esc(record.system) + '</div>'];
      if (record.organ && record.organ.code) {
        row1.push('<div class="chip">' + iconImg(record.organ.icon) + esc(record.organ.name) + '</div>');
      }
      // ═══ שורה 2: אבחנה ← ודאות ← חומרה ═══
      var row2 = [];
      if (record.diagnosis.name) row2.push('<div class="chip">' + esc(record.diagnosis.name) + '</div>');
      if (record.certainty.code) {
        row2.push('<div class="chip"><span class="ring" style="border-style:' + cert.border + ';opacity:' + cert.opacity + '"></span>' + esc(record.certainty.name || record.certainty.code) + (record.certainty.detail ? ' · <b>' + esc(record.certainty.detail) + '</b>' : '') + '</div>');
      }
      var bars = '';
      for (var i = 1; i <= 4; i++) bars += '<span style="background:' + (i <= sev.level ? sev.color : '#eceff1') + '"></span>';
      row2.push('<div class="chip"><span class="scale">' + bars + '</span>' + esc(record.severity.name || 'חומרה לא צוינה') + '</div>');
      // ═══ שורה 3: סוג האירוע ═══
      var row3 = [];
      if (record.eventIcon || record.eventCode) {
        row3.push('<div class="chip">' + iconImg(record.eventIcon) + esc(record.eventCategory || record.eventCode) + '</div>');
      }
      document.getElementById('chips').innerHTML =
        '<div class="chip-row">' + row1.join('') + '</div>' +
        '<div class="chip-row">' + row2.join('') + '</div>' +
        (row3.length ? '<div class="chip-row">' + row3.join('') + '</div>' : '');

      // ═══ המלצה — טקסט קצר מעמודת Recommendations ═══
      if (record.recommendation) {
        document.getElementById('reco').innerHTML =
          '<div class="reco">' + iconImg(record.recoIcon) + '<div>' + esc(record.recommendation) + '</div></div>';
      }

      // ═══ מידע מנהלי — למטה ═══
      document.getElementById('admin').textContent = record.docIssuer || '';
    </script>
  </body>
</html>