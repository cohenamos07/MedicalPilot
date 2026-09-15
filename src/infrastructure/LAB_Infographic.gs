<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <meta charset="utf-8">
    <style>
      body {
        font-family: Arial, sans-serif;
        direction: rtl;
        text-align: center;
        margin: 0;
        padding: 16px;
        background: #f5f7fa;
      }
      h3 {
        margin: 0 0 12px 0;
        color: #263238;
        font-size: 15px;
      }
      .body-wrap {
        display: inline-block;
        position: relative;
      }
      .body-wrap img.body-base {
        width: 240px;
        height: 240px;
        opacity: 0.85;
      }
      .organ-marker {
        position: absolute;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #fff;
        border: 2px solid #00ACC1;
        box-shadow: 0 1px 4px rgba(0,0,0,0.25);
        transform: translate(-50%, -50%);
        padding: 2px;
        box-sizing: border-box;
      }
      .organ-marker img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .modality-row {
        margin-top: 14px;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
        min-height: 24px;
      }
      .modality-row img {
        width: 22px;
        height: 22px;
      }
      .modality-row span {
        font-size: 11px;
        color: #37474f;
        font-weight: bold;
      }
      .preview {
        margin-top: 14px;
        border: 1px dashed #b0bec5;
        border-radius: 8px;
        padding: 12px;
        background: #fff;
      }
      .preview .desc {
        font-size: 13px;
        color: #37474f;
      }
    </style>
  </head>
  <body>
    <h3>אינפוגרפיקה רפואית — לפי אירוע</h3>
    
    <div class="body-wrap" id="bodyWrap">
      <img class="body-base" src="<?!= bodyImageData ?>" alt="דמות גוף כללית">
    </div>

    <div class="modality-row" id="modalityRow"></div>

    <div class="preview" id="preview"></div>

    <script>
      var record = <?!= recordJson ?>;

      var bodyWrap    = document.getElementById('bodyWrap');
      var modalityRow = document.getElementById('modalityRow');
      var preview     = document.getElementById('preview');

      record.icons.forEach(function(icon) {
        if (icon.type === 'ORGAN') {
          var marker = document.createElement('div');
          marker.className = 'organ-marker';
          marker.style.top  = icon.posTop;
          marker.style.left = icon.posLeft;
          var img = document.createElement('img');
          img.src = icon.iconData;
          marker.appendChild(img);
          bodyWrap.appendChild(marker);
        } else if (icon.type === 'MODALITY') {
          var img2 = document.createElement('img');
          img2.src = icon.iconData;
          var span = document.createElement('span');
          span.textContent = icon.label;
          modalityRow.appendChild(img2);
          modalityRow.appendChild(span);
        }
      });

      preview.innerHTML = '<div class="desc"><b>' + record.system + '</b> — ' + record.eventCode + '<br>' + record.eventDesc + '</div>';
    </script>
  </body>
</html>