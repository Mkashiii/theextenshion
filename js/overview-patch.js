// Patch popup.js to fill the new Detailed-style overview rows
(function() {
  window.addEventListener('load', () => {
    const ro = window.renderOverview;
    if (!ro) return;
    window.renderOverview = function(d, score, issues) {
      ro(d, score, issues);
      patchOverview(d, score, issues);
    };
  });

  function setRowStatus(elId, status) {
    const el = document.getElementById(elId);
    if (!el) return;
    const row = el.closest('.seo-row');
    if (!row) return;
    row.classList.remove('row-ok', 'row-warn', 'row-error');
    if (status) row.classList.add('row-' + status);
  }

  function patchOverview(d, score, issues) {
    const $ = id => document.getElementById(id);
    const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    // Score grade
    const grade = score >= 80 ? 'Good' : score >= 60 ? 'Fair' : 'Poor';
    const gradeEl = $('scoreGrade');
    if (gradeEl) { gradeEl.textContent = grade; gradeEl.className = 'score-grade ' + (score>=80?'ok':score>=60?'warn':'error'); }

    // Issues summary
    const errors = issues.filter(i=>i.sev==='error').length;
    const warns  = issues.filter(i=>i.sev==='warn').length;
    const passed = Math.max(0, 8 - errors - warns);
    const isE = $('isErrors'), isW = $('isWarns'), isP = $('isPassed');
    if (isE) isE.querySelector('.is-num').textContent = errors;
    if (isW) isW.querySelector('.is-num').textContent = warns;
    if (isP) isP.querySelector('.is-num').textContent = passed;

    // URL
    const urlV = $('urlVal');
    if (urlV) { urlV.textContent = d.url || '—'; setRowStatus('urlVal', 'ok'); }

    // Index status
    const idxB = $('indexBadge');
    if (idxB) {
      const s = d.isNoindex ? 'error' : 'ok';
      idxB.innerHTML = d.isNoindex
        ? '<span class="badge-pill error">✗ Noindex</span>'
        : '<span class="badge-pill ok">✓ Indexable</span>';
      setRowStatus('indexBadge', s);
    }

    // Title
    const tl = d.titleTag ? d.titleTag.length : 0;
    const tV = $('titleVal'), tB = $('titleBadge');
    if (tV) { tV.textContent = d.titleTag || 'Missing'; tV.className = 'seo-row-val' + (!d.titleTag?' missing':''); }
    const tStatus = !d.titleTag ? 'error' : (tl>=30&&tl<=60 ? 'ok' : 'warn');
    if (tB) tB.innerHTML = `<span class="badge-pill ${tStatus}">${!d.titleTag?'✗ Missing':tl>=30&&tl<=60?'✓ '+tl+' chars':'⚠ '+tl+' chars'}</span>`;
    setRowStatus('titleBadge', tStatus);

    // Description
    const dl = d.description ? d.description.length : 0;
    const dV = $('descVal'), dB = $('descBadge');
    if (dV) { dV.textContent = d.description || 'Missing'; dV.className = 'seo-row-val' + (!d.description?' missing':''); }
    const dStatus = !d.description ? 'error' : (dl>=70&&dl<=160 ? 'ok' : 'warn');
    if (dB) dB.innerHTML = `<span class="badge-pill ${dStatus}">${!d.description?'✗ Missing':dl>=70&&dl<=160?'✓ '+dl+' chars':'⚠ '+dl+' chars'}</span>`;
    setRowStatus('descBadge', dStatus);

    // Canonical
    const canV = $('canonicalVal');
    if (canV) { canV.textContent = d.canonical || 'Not set'; canV.className = 'seo-row-val mono' + (!d.canonical?' missing':''); }
    setRowStatus('canonicalVal', d.canonical ? 'ok' : 'warn');

    // Robots / noindex
    const robV = $('robotsVal');
    if (robV) { robV.textContent = d.robots || 'index, follow (default)'; }
    setRowStatus('robotsVal', d.isNoindex ? 'error' : 'ok');

    const xrobV = $('xrobotVal');
    if (xrobV) { xrobV.textContent = 'Not set'; xrobV.className = 'seo-row-val missing'; }

    // Keywords meta
    const kwV = $('kwVal');
    if (kwV) { kwV.textContent = d.keywords || 'Not set'; kwV.className = 'seo-row-val' + (!d.keywords?' missing':''); }

    // Word count
    const wcV = $('wcVal');
    if (wcV) { wcV.textContent = (d.wordCount||0) + ' words'; setRowStatus('wcVal', d.wordCount>=300?'ok':'warn'); }

    // Publisher/author
    const pubV = $('publisherVal');
    if (pubV) { pubV.textContent = d.author || 'Not set'; pubV.className = 'seo-row-val' + (!d.author?' missing':''); }
    setRowStatus('publisherVal', d.author ? 'ok' : 'warn');

    // Lang
    const langV = $('langVal');
    if (langV) { langV.textContent = d.lang || 'Not set'; langV.className = 'seo-row-val' + (!d.lang?' missing':''); }
    setRowStatus('langVal', d.lang ? 'ok' : 'warn');

    // HTTPS row
    setRowStatus('urlVal', d.isHttps ? 'ok' : 'error');

    // Viewport
    const vpEl = document.querySelector('[data-seorow="viewport"]');
    if (vpEl) { vpEl.classList.remove('row-ok','row-warn','row-error'); vpEl.classList.add('row-'+(d.viewport?'ok':'error')); }

    // H tag counts
    const hCount = lvl => d.headings.filter(h=>h.level===lvl).length;
    ['h1c','h2c','h3c','h4c','h5c','h6c'].forEach((id, i) => {
      const el = $(id); if (el) el.textContent = hCount(i+1);
    });
    // H1 row status
    const h1 = hCount(1);
    setRowStatus('h1c', h1===1?'ok':h1===0?'error':'warn');

    // Images / Links counts
    const imgC = $('imgC'); if (imgC) imgC.textContent = d.images.length;
    const linkC = $('linkC'); if (linkC) linkC.textContent = d.links.length;

    // OG / Twitter row status
    const hasOG = Object.keys(d.openGraph).length > 0;
    const ogRow = document.querySelector('[data-seorow="og"]');
    if (ogRow) { ogRow.classList.remove('row-ok','row-warn','row-error'); ogRow.classList.add('row-'+(hasOG?'ok':'warn')); }

    // Quick links
    const base = 'https://' + d.host;
    const qlR = $('qlRobots'); if (qlR) qlR.href = base + '/robots.txt';
    const qlS = $('qlSitemap'); if (qlS) qlS.href = base + '/sitemap.xml';
  }
})();
