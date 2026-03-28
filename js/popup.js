'use strict';
const $ = id => document.getElementById(id);
const el = (tag, cls) => { const e = document.createElement(tag); if(cls) e.className=cls; return e; };
const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const clamp = (v,mn,mx) => Math.min(mx,Math.max(mn,v));

/* ── Score Calc ── */
function calcScore(d){
  let score=100; const issues=[];
  const tl=d.titleTag.length;
  if(!d.titleTag){score-=15;issues.push({sev:'error',text:'Title tag is missing'});}
  else if(tl<30){score-=6;issues.push({sev:'warn',text:`Title too short (${tl} chars, aim 30–60)`});}
  else if(tl>60){score-=4;issues.push({sev:'warn',text:`Title too long (${tl} chars, aim 30–60)`});}
  const dl=d.description.length;
  if(!d.description){score-=10;issues.push({sev:'error',text:'Meta description missing'});}
  else if(dl<70){score-=4;issues.push({sev:'warn',text:`Description too short (${dl} chars)`});}
  else if(dl>160){score-=3;issues.push({sev:'warn',text:`Description too long (${dl} chars, aim ≤160)`});}
  if(d.h1Count===0){score-=10;issues.push({sev:'error',text:'No H1 heading found'});}
  else if(d.h1Count>1){score-=5;issues.push({sev:'warn',text:`Multiple H1 tags (${d.h1Count})`});}
  if(!d.isHttps){score-=10;issues.push({sev:'error',text:'Page not served over HTTPS'});}
  if(!d.canonical){score-=5;issues.push({sev:'warn',text:'No canonical URL defined'});}
  if(!d.lang){score-=3;issues.push({sev:'warn',text:'Missing lang attribute on <html>'});}
  if(!d.viewport){score-=4;issues.push({sev:'error',text:'Missing viewport meta tag (not mobile-friendly)'});}
  if(d.isNoindex){score-=15;issues.push({sev:'error',text:'Page is set to noindex — will not rank'});}
  if(d.imagesMissing>0){score-=Math.min(8,d.imagesMissing*2);issues.push({sev:'warn',text:`${d.imagesMissing} image(s) missing alt text`});}
  const ogKeys=Object.keys(d.openGraph).length;
  if(ogKeys===0){score-=4;issues.push({sev:'warn',text:'No Open Graph tags found'});}
  else if(!d.openGraph['og:image']){score-=2;issues.push({sev:'warn',text:'Missing og:image tag'});}
  if(!d.twitter['twitter:card']){score-=2;issues.push({sev:'warn',text:'Missing Twitter Card tags'});}
  if(d.structuredData.length===0){score-=3;issues.push({sev:'warn',text:'No structured data (JSON-LD) found'});}
  if(d.wordCount<300){score-=3;issues.push({sev:'warn',text:`Low word count (${d.wordCount} words)`});}
  return {score:clamp(Math.round(score),0,100),issues};
}

function scoreColor(s){if(s>=80)return'#3B5DD4';if(s>=60)return'#FEB622';return'#ef4444';}

function animateScore(score){
  const prog=$('scProg'),num=$('scoreNum'),circ=207.3;
  const offset=circ-(score/100)*circ,color=scoreColor(score);
  prog.style.stroke=color; prog.style.strokeDashoffset=offset;
  prog.style.filter=`drop-shadow(0 0 5px ${color}66)`;
  num.textContent=score; num.style.color=color;
}



/* ── Keyword Density ── */
function calcKeywordDensity(text,wordCount){
  const stopWords=new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','was','are','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','shall','can','this','that','these','those','it','its','i','we','you','he','she','they','my','our','your','his','her','their','all','as','if','so','not','no','yet','also','more','some','any','than','then','when','where','who','which','how','what','there','here','just','only','even','about','up','out','after','before','into','over','under','through','between','while','us','them','each','both','such','much','very','too','other','new','first','last','one','two','three','like','get','make','use','go','see','know','take','come','think','look','want','give','need','find','tell','ask','seem','feel','try','leave','call']);
  const words=text.toLowerCase().replace(/[^a-z\s]/g,' ').split(/\s+/).filter(w=>w.length>3&&!stopWords.has(w));
  const freq={};
  words.forEach(w=>{freq[w]=(freq[w]||0)+1;});
  return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([word,count])=>({word,count,density:((count/wordCount)*100).toFixed(2)}));
}

/* ── Tech Health Score ── */
function calcTechHealth(d){
  let score=100;
  if(!d.isHttps)score-=20;
  if(!d.canonical)score-=10;
  if(!d.viewport)score-=15;
  if(!d.lang)score-=5;
  if(d.isNoindex)score-=20;
  if(!d.favicon)score-=5;
  if(d.doctype!=='HTML')score-=5;
  if(!d.charset)score-=5;
  if(d.structuredData.length===0)score-=10;
  if(d.hreflangs&&d.hreflangs.length===0&&d.lang)score+=0;
  return Math.max(0,Math.round(score))+'%';
}

/* ─── RENDER: Overview ─── */
let _seoData=null;
function renderOverview(d,score,issues){
  _seoData=d;
  const errors=issues.filter(i=>i.sev==='error').length;
  const warns=issues.filter(i=>i.sev==='warn').length;
  const passed=Object.keys({title:d.titleTag,desc:d.description,h1:d.h1Count===1,https:d.isHttps,canonical:d.canonical,lang:d.lang,viewport:d.viewport,noindex:!d.isNoindex,og:Object.keys(d.openGraph).length,tw:d.twitter['twitter:card'],schema:d.structuredData.length,wc:d.wordCount>=300}).filter(k=>{const v={title:!!d.titleTag,desc:!!d.description,h1:d.h1Count===1,https:d.isHttps,canonical:!!d.canonical,lang:!!d.lang,viewport:!!d.viewport,noindex:!d.isNoindex,og:Object.keys(d.openGraph).length>0,tw:!!d.twitter['twitter:card'],schema:d.structuredData.length>0,wc:d.wordCount>=300};return v[k];}).length;
  if($('errCount'))$('errCount').textContent=errors;
  if($('warnCount'))$('warnCount').textContent=warns;
  if($('passCount'))$('passCount').textContent=passed;
  if(issues.length>0){$('issuesBanner').classList.remove('hidden');$('issuesBannerText').textContent=`${errors} error${errors!==1?'s':''}, ${warns} warning${warns!==1?'s':''} found`;}
  const gradeRow=$('gradeRow'); if(gradeRow)gradeRow.innerHTML='';
  const grid=$('cardsGrid'); if(grid)grid.innerHTML='';
  const tl=d.titleTag.length,dl=d.description.length;

  // Overview rows
  const tvEl=$('titleVal'),tbEl=$('titleBadge');
  if(tvEl){tvEl.textContent=d.titleTag||'Not set';tvEl.className='seo-row-val'+((!d.titleTag)?' missing':'');}
  if(tbEl){const s=!d.titleTag?'error':(tl>=30&&tl<=60?'ok':'warn');tbEl.innerHTML=`<span class="badge-pill ${s}"><span class="badge-check">${!d.titleTag?'✗':s==='ok'?'✓':'⚠'}</span> ${!d.titleTag?'Missing':s==='ok'?`${tl} characters`:'Too '+(tl<30?'Short':'Long')}</span>`;}
  // Add color class to title row
  const titleRow=tbEl?tbEl.closest('.seo-row'):null;
  if(titleRow){const s=!d.titleTag?'error':(tl>=30&&tl<=60?'ok':'warn');titleRow.classList.remove('row-ok','row-warn','row-error');titleRow.classList.add('row-'+s);}
  const dvEl=$('descVal'),dbEl=$('descBadge');
  if(dvEl){dvEl.textContent=d.description?d.description.substring(0,80)+(dl>80?'…':''):'Not set';dvEl.className='seo-row-val'+((!d.description)?' missing':'');}
  if(dbEl){const s=!d.description?'error':(dl>=70&&dl<=160?'ok':'warn');dbEl.innerHTML=`<span class="badge-pill ${s}"><span class="badge-check">${!d.description?'✗':s==='ok'?'✓':'⚠'}</span> ${!d.description?'Missing':s==='ok'?`${dl} characters`:'Too '+(dl<70?'Short':'Long')}</span>`;}
  // Add color class to desc row
  const descRow=dbEl?dbEl.closest('.seo-row'):null;
  if(descRow){const s=!d.description?'error':(dl>=70&&dl<=160?'ok':'warn');descRow.classList.remove('row-ok','row-warn','row-error');descRow.classList.add('row-'+s);}
  if($('urlVal')){$('urlVal').textContent=d.url||'';$('urlVal').className='seo-row-val mono';}
  if($('indexBadge')){const s=d.isNoindex?'error':'ok';$('indexBadge').innerHTML=`<span class="badge-pill ${s}"><span class="badge-check">${d.isNoindex?'✗':'✓'}</span> ${d.isNoindex?'Noindex':'Indexed'}</span>`;const idxRow=$('indexBadge').closest('.seo-row');if(idxRow){idxRow.classList.remove('row-ok','row-warn','row-error');idxRow.classList.add('row-'+(d.isNoindex?'error':'ok'));}}
  if($('canonicalVal')){$('canonicalVal').textContent=d.canonical||'Not set';const canRow=$('canonicalVal').closest('.seo-row');if(canRow){canRow.classList.remove('row-ok','row-warn','row-error');canRow.classList.add('row-'+(d.canonical?'ok':'warn'));}}
  if($('robotsVal')){$('robotsVal').textContent=d.robots||'index, follow (default)';const rRow=$('robotsVal').closest('.seo-row');if(rRow){rRow.classList.remove('row-ok','row-warn','row-error');rRow.classList.add(d.isNoindex?'row-error':'row-ok');}}
  if($('kwVal')){if(d.keywords){$('kwVal').textContent=d.keywords;}else{const kwRow=document.getElementById('row-keywords');if(kwRow)kwRow.style.display='none';}}
  if($('wcVal')){$('wcVal').textContent=`${d.wordCount.toLocaleString()} words`;const wcRow=$('wcVal').closest('.seo-row');if(wcRow){wcRow.classList.remove('row-ok','row-warn','row-error');wcRow.classList.add(d.wordCount>=300?'row-ok':'row-warn');}}
  if($('langVal')){$('langVal').textContent=d.lang||'Not set';const lRow=$('langVal').closest('.seo-row');if(lRow){lRow.classList.remove('row-ok','row-warn','row-error');lRow.classList.add(d.lang?'row-ok':'row-warn');}}
  const counts={1:0,2:0,3:0,4:0};
  d.headings.forEach(h=>{if(counts[h.level]!==undefined)counts[h.level]++;});
  ['h1c','h2c','h3c','h4c'].forEach((id,i)=>{if($(id))$(id).textContent=counts[i+1];});
  if($('imgC'))$('imgC').textContent=d.images.length;
  if($('linkC'))$('linkC').textContent=d.links.length;
  const host=d.host||'';
  if($('qlRobots'))$('qlRobots').href=`https://${host}/robots.txt`;
  if($('qlSitemap'))$('qlSitemap').href=`https://${host}/sitemap.xml`;

  // Quick fixes
  if(issues.length>0){
    $('fixesBlock').classList.remove('hidden');
    const list=$('fixesList'); list.innerHTML='';
    issues.slice(0,8).forEach(issue=>{
      const li=el('li',`fb-item ${issue.sev}`);
      li.innerHTML=`<span class="fi-dot">${issue.sev==='error'?'❌':'⚠️'}</span><span>${esc(issue.text)}</span>`;
      list.appendChild(li);
    });
  }

  // Score grade
  const sg=$('scoreGrade');
  if(sg){const g=score>=90?'Excellent':score>=80?'Good':score>=60?'Needs Work':'Poor';sg.textContent=g;sg.className='score-grade '+(score>=80?'ok':score>=60?'warn':'error');}

  // Keyword Density
  renderKeywordDensity(d);

  // Tech health
  const th=calcTechHealth(d);
  if($('saTechScore'))$('saTechScore').textContent=th;
}
function renderKeywordDensity(d){
  const kd=calcKeywordDensity(d.bodyText||'',Math.max(d.wordCount,1));
  const mini=$('kdMiniList');
  if(mini){mini.innerHTML='';kd.slice(0,5).forEach(k=>{const r=el('div','kd-mini-row');r.innerHTML=`<span class="kd-mini-word">${esc(k.word)}</span><span class="kd-mini-pct">${k.density}%</span>`;mini.appendChild(r);});}
  const full=$('kdList');
  if(full){
    full.innerHTML='';
    if($('kdWordBadge'))$('kdWordBadge').textContent=`${d.wordCount.toLocaleString()} words`;
    kd.forEach((k,i)=>{
      const pct=Math.min(100,(k.count/Math.max(kd[0].count,1))*100);
      const row=el('div','kd-row');
      row.innerHTML=`<span class="kd-rank">${i+1}</span><div class="kd-word-wrap"><span class="kd-word">${esc(k.word)}</span><div class="kd-bar-wrap"><div class="kd-bar" style="width:${pct}%"></div></div></div><span class="kd-count">${k.count}×</span><span class="kd-pct ${parseFloat(k.density)>4?'high':parseFloat(k.density)>2?'mid':'low'}">${k.density}%</span>`;
      full.appendChild(row);
    });
  }
}

/* ─── RENDER: Page Speed ─── */
function renderPageSpeed(d){
  const ttfb=d.ttfb, dcl=d.domContentLoaded, lt=d.loadTime;
  let speedScore=100;
  if(ttfb!=null){if(ttfb>600)speedScore-=30;else if(ttfb>200)speedScore-=15;}
  if(dcl!=null){if(dcl>3000)speedScore-=25;else if(dcl>1500)speedScore-=12;}
  if(lt!=null){if(lt>6000)speedScore-=25;else if(lt>3000)speedScore-=12;}
  if(d.imagesMissing>5)speedScore-=5;
  if(d.imagesLazy===0&&d.images.length>3)speedScore-=5;
  speedScore=Math.max(0,Math.min(100,speedScore));

  const prog=$('psProg'),num=$('psScoreNum');
  if(prog&&num){
    const circ=207.3,offset=circ-(speedScore/100)*circ,color=speedScore>=80?'#3B5DD4':speedScore>=50?'#FEB622':'#ef4444';
    prog.style.stroke=color; prog.style.strokeDashoffset=offset;
    prog.style.filter=`drop-shadow(0 0 5px ${color}66)`;
    num.textContent=speedScore; num.style.color=color;
  }
  const lbl=$('psScoreLabel');
  if(lbl)lbl.textContent=speedScore>=80?'Fast':speedScore>=50?'Needs Improvement':'Slow';

  const metrics=$('psMetrics');
  if(metrics){
    metrics.innerHTML='';
    const rows=[
      {label:'TTFB',val:ttfb!=null?`${ttfb}ms`:null,good:200,warn:600,unit:'ms'},
      {label:'DOM Ready',val:dcl!=null?`${dcl}ms`:null,good:1500,warn:3000,unit:'ms'},
      {label:'Load Time',val:lt!=null?`${lt}ms`:null,good:3000,warn:6000,unit:'ms'},
      {label:'Scripts',val:d.scriptCount!=null?d.scriptCount:null,good:20,warn:40,unit:''},
      {label:'Stylesheets',val:d.styleCount!=null?d.styleCount:null,good:5,warn:10,unit:''},
    ];
    rows.forEach(r=>{
      const raw=r.val!=null?parseInt(r.val):null;
      const cls=raw==null?'neutral':raw<=r.good?'ok':raw<=r.warn?'warn':'error';
      const div=el('div','ps-metric-row');
      div.innerHTML=`<span class="ps-m-label">${r.label}</span><span class="ps-m-val ${cls}">${r.val!=null?r.val:'N/A'}</span>`;
      metrics.appendChild(div);
    });
  }

  // CWV
  const cwv=$('psCwvGrid');
  if(cwv){
    cwv.innerHTML='';
    const items=[
      {label:'LCP (est.)',desc:'Largest Contentful Paint',val:lt!=null?`~${lt}ms`:null,target:'< 2500ms',cls:lt!=null?lt<2500?'ok':lt<4000?'warn':'error':'neutral'},
      {label:'FID / INP',desc:'Interaction to Next Paint',val:'Browser Only',target:'< 200ms',cls:'neutral'},
      {label:'CLS',desc:'Cumulative Layout Shift',val:'Run PSI',target:'< 0.1',cls:'neutral'},
      {label:'TTFB',desc:'Time to First Byte',val:ttfb!=null?`${ttfb}ms`:null,target:'< 200ms',cls:ttfb!=null?ttfb<200?'ok':ttfb<600?'warn':'error':'neutral'},
      {label:'FCP (est.)',desc:'First Contentful Paint',val:dcl!=null?`~${dcl}ms`:null,target:'< 1800ms',cls:dcl!=null?dcl<1800?'ok':dcl<3000?'warn':'error':'neutral'},
      {label:'DOM Ready',desc:'DOM Content Loaded',val:dcl!=null?`${dcl}ms`:null,target:'< 1500ms',cls:dcl!=null?dcl<1500?'ok':dcl<3000?'warn':'error':'neutral'},
    ];
    items.forEach(item=>{
      const card=el('div',`ps-cwv-card ${item.cls}`);
      card.innerHTML=`<div class="ps-cwv-label">${item.label}</div><div class="ps-cwv-val">${item.val||'—'}</div><div class="ps-cwv-target">Target: ${item.target}</div><div class="ps-cwv-desc">${item.desc}</div>`;
      cwv.appendChild(card);
    });
  }

  // Resources
  const res=$('psResources');
  if(res){
    res.innerHTML='';
    const items=[
      {icon:'📄',label:'HTML Scripts',val:d.scriptCount,note:d.scriptCount>20?'⚠ Too many':'✓ OK'},
      {icon:'🎨',label:'Stylesheets',val:d.styleCount,note:d.styleCount>5?'⚠ Consider reducing':'✓ OK'},
      {icon:'🖼',label:'Total Images',val:d.images.length,note:''},
      {icon:'⚡',label:'Lazy Loaded',val:d.imagesLazy,note:d.imagesLazy===0&&d.images.length>3?'⚠ Add lazy loading':'✓ Using lazy load'},
      {icon:'✅',label:'Images w/ Alt',val:d.imagesWithAlt,note:d.imagesMissing>0?`⚠ ${d.imagesMissing} missing alt`:'✓ All good'},
    ];
    items.forEach(item=>{
      const row=el('div','ps-res-row');
      row.innerHTML=`<span class="ps-res-icon">${item.icon}</span><span class="ps-res-label">${item.label}</span><span class="ps-res-val">${item.val!=null?item.val:'—'}</span><span class="ps-res-note">${item.note}</span>`;
      res.appendChild(row);
    });
  }

  // CTA links
  const host=d.host||'';
  const psi=$('psiLink'); if(psi)psi.href=`https://pagespeed.web.dev/report?url=${encodeURIComponent('https://'+host)}`;
  const gtm=$('gtmetrixLinkPS'); if(gtm)gtm.href=`https://gtmetrix.com/?url=${encodeURIComponent('https://'+host)}`;
}

/* ─── RENDER: Internal Linking ─── */
let _ilData=null;
function renderInternalLinks(d){
  _ilData=d;
  const links=d.internalLinks||[];

  // Stats
  const sr=$('ilStatsRow');
  if(sr){
    sr.innerHTML='';
    const noAnchor=links.filter(l=>!l.text||l.text.trim().length<2).length;
    const nofollow=links.filter(l=>l.nofollow).length;
    // Count pages linked to
    const pageCounts={};
    links.forEach(l=>{const path=l.href.replace(/^https?:\/\/[^/]+/,'').split('?')[0];pageCounts[path]=(pageCounts[path]||0)+1;});
    const uniquePages=Object.keys(pageCounts).length;
    const stats=[
      {num:links.length,lbl:'Total Internal',cls:''},
      {num:uniquePages,lbl:'Unique Pages',cls:''},
      {num:noAnchor,lbl:'No Anchor',cls:noAnchor>0?'warn':''},
      {num:nofollow,lbl:'Nofollow',cls:''},
    ];
    stats.forEach(s=>{const t=el('div',`il-stat-tile ${s.cls}`);t.innerHTML=`<div class="il-stat-num">${s.num}</div><div class="il-stat-lbl">${s.lbl}</div>`;sr.appendChild(t);});
  }

  // Insights
  const ins=$('ilInsights');
  if(ins){
    ins.innerHTML='';
    const noAnchorLinks=links.filter(l=>!l.text||l.text.trim().length<2);
    if(noAnchorLinks.length>0){const a=el('div','il-insight warn');a.innerHTML=`⚠️ <strong>${noAnchorLinks.length}</strong> internal links have no anchor text — add descriptive anchors for better SEO.`;ins.appendChild(a);}
    const nofollowLinks=links.filter(l=>l.nofollow);
    if(nofollowLinks.length>0){const a=el('div','il-insight info');a.innerHTML=`ℹ️ <strong>${nofollowLinks.length}</strong> internal nofollow links found — these block PageRank flow.`;ins.appendChild(a);}
    if(links.length<5){const a=el('div','il-insight warn');a.innerHTML=`⚠️ Only <strong>${links.length}</strong> internal links — add more to improve crawlability and PageRank distribution.`;ins.appendChild(a);}
    else{const a=el('div','il-insight ok');a.innerHTML=`✅ <strong>${links.length}</strong> internal links detected across this page.`;ins.appendChild(a);}
  }

  renderILList('all',d);

  document.querySelectorAll('.il-filter-btn').forEach(btn=>{
    btn.addEventListener('click',function(){
      document.querySelectorAll('.il-filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderILList(btn.dataset.ilf,_ilData);
    });
  });
}

function renderILList(filter,d){
  const list=$('ilList'); if(!list)return;
  list.innerHTML='';
  let links=d.internalLinks||[];
  if(filter==='noanchor')links=links.filter(l=>!l.text||l.text.trim().length<2);
  else if(filter==='nofollow')links=links.filter(l=>l.nofollow);
  else if(filter==='top'){
    const pageCounts={};
    links.forEach(l=>{const p=l.href;pageCounts[p]=(pageCounts[p]||0)+1;});
    const sorted=Object.entries(pageCounts).sort((a,b)=>b[1]-a[1]).slice(0,30);
    sorted.forEach(([href,count])=>{
      const row=el('div','il-row');
      let path=''; try{path=new URL(href).pathname;}catch(e){path=href;}
      row.innerHTML=`<div class="il-url-wrap"><div class="il-path">${esc(path)}</div><div class="il-full">${esc(href)}</div></div><span class="il-count-badge">${count} link${count!==1?'s':''}</span>`;
      list.appendChild(row);
    });
    return;
  }
  if(!links.length){list.innerHTML='<div class="il-empty">No links in this category</div>';return;}
  links.slice(0,60).forEach(link=>{
    const row=el('div','il-row');
    let path=''; try{path=new URL(link.href).pathname;}catch(e){path=link.href;}
    const badges=[];
    if(link.nofollow)badges.push('<span class="li-badge nf">nofollow</span>');
    if(link.newTab)badges.push('<span class="li-badge nb">new tab</span>');
    if(!link.text||link.text.trim().length<2)badges.push('<span class="li-badge" style="background:#fef3c7;color:#92400e">no anchor</span>');
    row.innerHTML=`<div class="il-url-wrap"><div class="il-anchor">${esc(link.text||'(no anchor text)')}</div><div class="il-path">${esc(path)}</div></div><div class="li-badges">${badges.join('')}</div>`;
    list.appendChild(row);
  });
}

/* ─── RENDER: SERP + Schema ─── */
function renderSERP(d){
  /* --- Schema Markup Panel --- */
  // Flatten schemas: expand @graph arrays so each node is individually shown
  const rawSchemas = d.structuredData || [];
  const schemas = [];
  rawSchemas.forEach(s => {
    if(s['@graph'] && Array.isArray(s['@graph'])) {
      // Keep the parent @graph entry
      schemas.push(s);
      // Also expand each node for individual display
    } else if(Array.isArray(s)) {
      s.forEach(item => schemas.push(item));
    } else {
      schemas.push(s);
    }
  });

  const enc2 = encodeURIComponent(d.url||'https://'+d.host);

  // Update test button link — use validator.schema.org
  const testBtn = $('schemaTestBtn');
  if(testBtn) testBtn.href = 'https://validator.schema.org/#url='+encodeURIComponent(d.url||'https://'+d.host);

  // Count + quality scoring
  const countEl = $('schemaCount');
  if(countEl) countEl.textContent = schemas.length;
  // Schema quality scoring
  const schemaQuality = schemas.length === 0 ? 0 : Math.min(100, schemas.length * 20 + 20);
  if(countEl){
    countEl.style.color = schemas.length>0 ? 'var(--blue)' : 'var(--warn-col)';
    // Add quality hint to the count label
    const lbl=countEl.parentElement&&countEl.parentElement.querySelector('.schema-count-lbl');
    if(lbl) lbl.textContent='Schemas · Score: '+schemaQuality+'/100';
  }
  const countBlock = $('schemaCountBlock');
  if(countBlock) countBlock.style.borderLeftColor = schemas.length>0 ? 'var(--blue)' : 'var(--warn-col)';

  // Type pills row
  const statusBlock = $('schemaStatusBlock');
  if(statusBlock){
    statusBlock.innerHTML = '';
    if(schemas.length>0){
      schemas.forEach(s=>{
        const t = s['@type'] || (s['@graph'] ? '@graph' : 'Unknown');
        const types = Array.isArray(t) ? t : [t];
        types.forEach(type=>{
          const pill = el('span','schema-type-pill');
          pill.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>${esc(type)}`;
          statusBlock.appendChild(pill);
        });
      });
    } else {
      const none = el('span','schema-none-pill');
      none.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>No Schema Found`;
      statusBlock.appendChild(none);
    }
  }

  // Schema cards list
  const list = $('schemaList');
  if(list){
    list.innerHTML='';
    if(schemas.length===0){
      // None state
      const ns = el('div','schema-none-state');
      ns.innerHTML=`<div class="sns-icon">⚠️</div><div><div class="sns-title">No Structured Data Detected</div><div class="sns-body">Adding JSON-LD schema markup helps Google display rich results — stars, FAQs, breadcrumbs and more. Recommended schemas for this site:<div class="sns-codes"><span class="sns-code">Organization</span><span class="sns-code">WebPage</span><span class="sns-code">BreadcrumbList</span><span class="sns-code">Article</span><span class="sns-code">FAQPage</span><span class="sns-code">LocalBusiness</span><span class="sns-code">Product</span></div></div></div>`;
      list.appendChild(ns);
    } else {
      schemas.forEach((s,idx)=>{
        const rawType = s['@type'] || (s['@graph'] ? '@graph (multiple)' : 'Unknown');
        const typeStr = Array.isArray(rawType) ? rawType.join(' + ') : rawType;
        const context = s['@context'] || 'https://schema.org';
        const props = Object.keys(s).filter(k=>k!=='@context'&&k!=='@type'&&k!=='@graph');
        const abbr = typeStr.replace(/[a-z]/g,'').slice(0,2).toUpperCase() || typeStr.slice(0,2).toUpperCase();

        const card = el('div','schema-card');

        // Head
        const head = el('div','schema-card-head');
        head.innerHTML=`
          <div class="schema-card-icon" style="background:${idx===0?'var(--blue)':idx===1?'var(--orange)':'#7c3aed'}">${esc(abbr)}</div>
          <div class="schema-card-type">${esc(typeStr)}</div>
          <div class="schema-card-context">${esc(context)}</div>
          <div class="schema-card-status">✅ Valid JSON-LD</div>`;
        card.appendChild(head);

        // Body
        const body = el('div','schema-card-body');
        let bodyHtml = '';

        // Props grid
        if(props.length > 0){
          bodyHtml += '<div class="schema-props-grid">';
          props.slice(0,12).forEach(k=>{
            let v = s[k];
            if(typeof v === 'object' && v !== null) v = Array.isArray(v) ? `[array: ${v.length}]` : `{${Object.keys(v).slice(0,2).join(', ')}…}`;
            v = String(v||'').slice(0,40);
            bodyHtml += `<div class="schema-prop"><div class="sp-key">${esc(k)}</div><div class="sp-val" title="${esc(s[k]?String(s[k]).slice(0,120):'')}"> ${esc(v)}</div></div>`;
          });
          if(props.length > 12) bodyHtml += `<div class="schema-prop"><div class="sp-key">+${props.length-12} more</div><div class="sp-val">properties</div></div>`;
          bodyHtml += '</div>';
        }

        // Handle @graph
        if(s['@graph'] && Array.isArray(s['@graph'])){
          bodyHtml += `<div style="margin-top:8px;padding:8px 10px;background:var(--off);border:1px solid var(--border);border-radius:var(--radius-sm)">`;
          bodyHtml += `<div style="font-size:0.65rem;font-weight:700;color:var(--blue);margin-bottom:6px;text-transform:uppercase">@graph contains ${s['@graph'].length} node(s):</div>`;
          s['@graph'].forEach((node,ni)=>{
            const nt = node['@type'] || 'Unknown';
            bodyHtml += `<span style="display:inline-block;margin:2px;background:var(--blue-lt);color:var(--blue-dk);font-size:0.65rem;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid #c7d2fe">${esc(Array.isArray(nt)?nt.join('+'):nt)}</span>`;
          });
          bodyHtml += '</div>';
        }

        // Raw JSON toggle + Copy JSON button
        bodyHtml += `<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">`;
        bodyHtml += `<div class="schema-raw-toggle" onclick="const p=this.parentElement.nextElementSibling;p.style.display=p.style.display==='block'?'none':'block';this.textContent=p.style.display==='block'?'▲ Hide Raw JSON':'▶ View Raw JSON'">▶ View Raw JSON</div>`;
        const copyId='scp-'+idx;
        bodyHtml += `<div class="schema-raw-toggle" id="${copyId}" onclick="const raw=${JSON.stringify(JSON.stringify(s,null,2)).replace(/</g,'\\u003c')};navigator.clipboard.writeText(raw).then(()=>{const el=document.getElementById('${copyId}');el.textContent='✓ Copied!';setTimeout(()=>el.textContent='⎘ Copy JSON',1500)})">⎘ Copy JSON</div>`;
        bodyHtml += `</div>`;
        bodyHtml += `<pre class="schema-raw-pre">${esc(JSON.stringify(s,null,2))}</pre>`;

        body.innerHTML = bodyHtml;
        card.appendChild(body);
        list.appendChild(card);
      });
    }
  }

  /* --- SERP Preview --- */
  const u=d.url||'',host=d.host||'',path=u.replace(/^https?:\/\/[^/]+/,'')||'/';
  $('serpUrl').textContent=`${host}${path}`;
  $('serpTitle').textContent=d.titleTag||'(No title tag)';
  $('serpDesc').textContent=d.description||'(No meta description)';
  if(d.titleTag&&d.titleTag.length>60)$('serpTitle').classList.add('too-long');
  $('serpMUrl').textContent=host;
  $('serpMTitle').textContent=d.titleTag||'(No title tag)';
  $('serpMDesc').textContent=d.description||'(No description)';

  /* --- Char Counters --- */
  const cc=$('charCounters'); cc.innerHTML='';
  function charCounter(name,current,ideal_min,ideal_max){
    const pct=clamp(current/ideal_max*100,0,100);
    const cls=current>ideal_max?'error':current<ideal_min?'warn':'ok';
    const colors={ok:'#2B5BCD',warn:'#FEB622',error:'#ef4444'};
    const row=el('div','cc-row');
    row.innerHTML=`<div class="cc-head"><span class="cc-name">${esc(name)}</span><span class="cc-nums ${cls}">${current} / ${ideal_max} chars</span></div><div class="cc-bar"><div class="cc-fill" style="width:${pct}%;background:${colors[cls]}"></div></div><div class="cc-ideal">Ideal: ${ideal_min}–${ideal_max} chars ${current>ideal_max?'⚠ Too long':current<ideal_min?'⚠ Too short':'✓ Good'}</div>`;
    cc.appendChild(row);
  }
  charCounter('Title Tag',d.titleTag.length,30,60);
  charCounter('Meta Description',d.description.length,70,160);
  if(d.openGraph['og:title'])charCounter('OG Title',d.openGraph['og:title'].length,30,90);
  if(d.openGraph['og:description'])charCounter('OG Description',d.openGraph['og:description'].length,50,200);
}

/* ─── RENDER: Meta ─── */
function renderMeta(d){
  function makeGroup(cid,title,rows,badgeStatus){
    const c=$(cid); c.innerHTML='';
    const g=el('div','meta-group');
    const head=el('div','mg-title');
    head.innerHTML=`${esc(title)} <span class="mg-badge ${badgeStatus}">${badgeStatus==='ok'?'Good':badgeStatus==='warn'?'Partial':'Missing'}</span>`;
    g.appendChild(head);
    rows.forEach(([key,val])=>{
      const row=el('div','meta-row');
      const hasVal=val!==null&&val!==undefined&&val!=='';
      row.innerHTML=`<span class="mr-key">${esc(key)}</span><span class="mr-val ${hasVal?'':'missing'}">${hasVal?esc(String(val).length>120?String(val).substring(0,120)+'…':String(val)):'(not set)'}</span><span class="mr-status">${hasVal?'✅':'❌'}</span>`;
      g.appendChild(row);
    });
    c.appendChild(g);
  }
  const basicRows=[['title',d.titleTag],['description',d.description],['keywords',d.keywords],['robots',d.robots],['viewport',d.viewport],['canonical',d.canonical],['author',d.author],['lang (html)',d.lang],['charset',d.charset],['favicon',d.favicon]];
  makeGroup('mgBasic','Basic Meta Tags',basicRows,basicRows.filter(r=>r[1]).length>=6?'ok':basicRows.filter(r=>r[1]).length>=3?'warn':'error');
  const ogRows=[['og:title',d.openGraph['og:title']],['og:description',d.openGraph['og:description']],['og:image',d.openGraph['og:image']],['og:url',d.openGraph['og:url']],['og:type',d.openGraph['og:type']],['og:site_name',d.openGraph['og:site_name']]];
  makeGroup('mgOG','Open Graph',ogRows,ogRows.filter(r=>r[1]).length>=4?'ok':ogRows.filter(r=>r[1]).length>=2?'warn':'error');
  const twRows=[['twitter:card',d.twitter['twitter:card']],['twitter:title',d.twitter['twitter:title']],['twitter:description',d.twitter['twitter:description']],['twitter:image',d.twitter['twitter:image']],['twitter:site',d.twitter['twitter:site']]];
  makeGroup('mgTwitter','Twitter / X Card',twRows,twRows.filter(r=>r[1]).length>=3?'ok':twRows.filter(r=>r[1]).length>=1?'warn':'error');
  const otherRows=Object.entries(d.metas).filter(([k])=>!k.startsWith('og:')&&!k.startsWith('twitter:')&&!['description','keywords','robots','viewport','author'].includes(k)).slice(0,15);
  if(otherRows.length>0)makeGroup('mgOther','Other Meta Tags',otherRows,'ok');
}

/* ─── RENDER: Headings ─── */
let headingsData=[];
let headingsFilter='all';
function renderHeadings(d){
  headingsData=d;
  const counts={1:0,2:0,3:0,4:0,5:0,6:0};
  d.headings.forEach(h=>counts[h.level]++);

  // Score
  let score=100;
  if(counts[1]===0) score-=40;
  else if(counts[1]>1) score-=20;
  if(counts[2]===0&&d.headings.length>3) score-=15;
  let prevL=0;
  d.headings.forEach(h=>{if(h.level>prevL+1&&prevL>0)score-=5;prevL=h.level;});
  score=Math.max(0,score);
  const scoreEl=$('hScoreNum');
  if(scoreEl){scoreEl.textContent=score+'/100';scoreEl.style.color=score>=80?'var(--green-dk)':score>=50?'var(--warn-col)':'var(--red)';}

  // Stats
  const stats=$('hStats'); stats.innerHTML='';
  [1,2,3,4,5,6].forEach(n=>{
    if(n>4&&counts[n]===0)return;
    const state=n===1&&counts[1]===0?'error':n===1&&counts[1]>1?'warn':'';
    const pill=el('div',`h-stat ${state}`);
    pill.innerHTML=`<div class="h-stat-num">${counts[n]}</div><div class="h-stat-key">H${n}</div>`;
    pill.addEventListener('click',()=>{
      document.querySelectorAll('.h-stat').forEach(s=>s.classList.remove('active'));
      pill.classList.add('active');
      headingsFilter='h'+n;
      renderHeadingsOutline(d);
    });
    stats.appendChild(pill);
  });

  // Alerts
  const alerts=$('hAlerts'); alerts.innerHTML='';
  const mkA=(cls,html)=>{const a=el('div','h-alert '+cls);a.innerHTML=html;alerts.appendChild(a);};
  if(counts[1]===0) mkA('error','❌ No H1 heading found — every page needs exactly one H1');
  else if(counts[1]>1) mkA('warn',`⚠️ ${counts[1]} H1 tags found — use only one H1 per page`);
  else mkA('ok','✅ Exactly one H1 heading — perfect!');
  if(counts[2]===0&&d.headings.length>0) mkA('warn','⚠️ No H2 headings — add subheadings to improve content structure');
  let pv=0,skipped=false;
  d.headings.forEach(h=>{if(h.level>pv+1&&pv>0)skipped=true;pv=h.level;});
  if(skipped) mkA('warn','⚠️ Heading levels are skipped (e.g. H1→H3) — use sequential hierarchy');
  const longH=d.headings.filter(h=>h.text.length>70);
  if(longH.length>0) mkA('warn',`⚠️ ${longH.length} heading(s) over 70 chars — keep headings concise`);

  // Filter buttons
  document.querySelectorAll('.h-filter-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.h-filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.h-stat').forEach(s=>s.classList.remove('active'));
      headingsFilter=btn.dataset.hf;
      renderHeadingsOutline(d);
    });
  });

  // Copy all
  const copyAll=$('hCopyAll');
  if(copyAll){
    copyAll.onclick=()=>{
      const txt=d.headings.map(h=>'  '.repeat(h.level-1)+`H${h.level}: ${h.text}`).join('\n');
      navigator.clipboard.writeText(txt).then(()=>{
        copyAll.textContent='✓ Copied!';
        setTimeout(()=>{copyAll.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy All';},1500);
      });
    };
  }
  renderHeadingsOutline(d);
}
function renderHeadingsOutline(d){
  const outline=$('hOutline'); outline.innerHTML='';
  if(!d.headings||d.headings.length===0){outline.innerHTML='<div class="h-empty">No headings found on this page</div>';return;}
  let list=d.headings;
  if(headingsFilter==='h1') list=list.filter(h=>h.level===1);
  else if(headingsFilter==='h2') list=list.filter(h=>h.level===2);
  else if(headingsFilter==='issues') list=list.filter(h=>h.text.length>70||h.text.length<5);
  if(list.length===0){outline.innerHTML=`<div class="h-empty">No headings match this filter</div>`;return;}
  list.forEach(h=>{
    const node=el('div',`h-item h${h.level}`);
    const len=h.text.length;
    const issues=[];
    if(len>70) issues.push({cls:'warn',txt:'Too long'});
    if(len<5)  issues.push({cls:'error',txt:'Too short'});
    const issueHtml=issues.map(i=>`<span class="h-issue-badge ${i.cls}">${i.txt}</span>`).join('');
    const charColor=len>70?'color:var(--red-dk)':len>50?'color:var(--warn-col)':'';
    node.innerHTML=`
      <span class="h-tag">H${h.level}</span>
      <span class="h-text" title="${esc(h.text)}">${esc(h.text)}</span>
      ${issueHtml}
      <span class="h-char-badge" style="${charColor}">${len}</span>`;
    const copyBtn=el('button','h-copy-btn');
    copyBtn.title='Copy heading';
    copyBtn.innerHTML='<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    copyBtn.addEventListener('click',()=>{
      navigator.clipboard.writeText(h.text).then(()=>{copyBtn.textContent='✓';setTimeout(()=>{copyBtn.innerHTML='<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';},1200);});
    });
    node.appendChild(copyBtn);
    outline.appendChild(node);
  });
}

/* ─── RENDER: Links ─── */
let linksData=[];
function renderLinks(d){
  linksData=d;
  const stats=$('linksStats'); stats.innerHTML='';
  [{num:d.links.length,lbl:'Total'},{num:d.internalLinks.length,lbl:'Internal'},{num:d.externalLinks.length,lbl:'External'},{num:d.nofollowLinks.length,lbl:'Nofollow'}].forEach((s,i)=>{
    const t=el('div',`ls-tile${i===0?' highlight':''}`);
    t.innerHTML=`<div class="lt-num">${s.num}</div><div class="lt-lbl">${s.lbl}</div>`;
    stats.appendChild(t);
  });
  renderLinksList('internal',d);
  document.querySelectorAll('.lt-btn').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('.lt-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderLinksList(btn.dataset.lt,linksData);});});
}
function renderLinksList(type,d){
  const body=$('linksBody'); body.innerHTML='';
  const list=type==='internal'?d.internalLinks:type==='external'?d.externalLinks:d.nofollowLinks;
  if(!list||list.length===0){body.innerHTML=`<div style="text-align:center;padding:20px;color:#94a3b8;font-size:0.75rem">No ${type} links found</div>`;return;}
  list.slice(0,50).forEach(link=>{
    const item=el('div','link-item');
    const badges=[];
    if(link.nofollow)badges.push('<span class="li-badge nf">nofollow</span>');
    if(link.sponsored)badges.push('<span class="li-badge sp">sponsored</span>');
    if(!link.nofollow)badges.push('<span class="li-badge df">dofollow</span>');
    if(link.newTab)badges.push('<span class="li-badge nb">new tab</span>');
    item.innerHTML=`<div class="li-anchor"><div class="li-text">${esc(link.text||link.href)}</div><div class="li-href">${esc(link.href)}</div></div><div class="li-badges">${badges.join('')}</div>`;
    body.appendChild(item);
  });
}

/* ─── RENDER: Images ─── */
let imagesData=[];
function renderImages(d){
  imagesData=d;
  const stats=$('imgStats'); stats.innerHTML='';
  [{num:d.images.length,lbl:'Total'},{num:d.imagesWithAlt,lbl:'Has Alt'},{num:d.imagesMissing,lbl:'No Alt'},{num:d.imagesLazy,lbl:'Lazy'}].forEach((s,i)=>{
    const t=el('div',`ls-tile${i===0?' highlight':''}`);
    t.innerHTML=`<div class="lt-num">${s.num}</div><div class="lt-lbl">${s.lbl}</div>`;
    stats.appendChild(t);
  });
  renderImagesList('all',d);
  document.querySelectorAll('.if-btn').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('.if-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderImagesList(btn.dataset.if,imagesData);});});
  // Download all button
  const dlAll=$('btnDownloadImages');
  if(dlAll){
    dlAll.addEventListener('click',()=>{
      const imgs=d.images||[];
      if(!imgs.length){alert('No images found');return;}
      // Download as CSV with URLs
      let csv='src,alt,width,height,loading,has_alt\n';
      imgs.forEach(img=>{
        const alt=(img.alt||'').replace(/,/g,' ').replace(/\n/g,' ');
        csv+=`"${img.src}","${alt}","${img.width||''}","${img.height||''}","${img.loading||''}","${img.hasAlt?'yes':'no'}"\n`;
      });
      const blob=new Blob([csv],{type:'text/csv'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='7thclub-images-'+(d.host||'site')+'.csv';
      a.click();
    });
  }
}
function renderImagesList(filter,d){
  const list=$('imgList'); list.innerHTML='';
  let imgs=d.images||[];
  if(filter==='missing')imgs=imgs.filter(i=>!i.hasAlt||i.altEmpty);
  if(filter==='lazy')imgs=imgs.filter(i=>i.loading==='lazy');
  if(!imgs.length){list.innerHTML=`<div style="text-align:center;padding:20px;color:#94a3b8;font-size:0.75rem">No images in this category</div>`;return;}
  imgs.slice(0,40).forEach(img=>{
    const hasAlt=img.hasAlt&&!img.altEmpty;
    const item=el('div',`img-item ${hasAlt?'has-alt':'missing-alt'}`);
    const badges=[];
    if(hasAlt)badges.push('<span class="ii-badge ok">✓ Alt</span>');
    else badges.push('<span class="ii-badge error">No Alt</span>');
    if(img.loading==='lazy')badges.push('<span class="ii-badge info">Lazy</span>');
    if(img.srcset)badges.push('<span class="ii-badge info">srcset</span>');
    const fname=img.src.split('/').pop().split('?')[0].slice(0,36);
    const isAbsolute=img.src.startsWith('http')||img.src.startsWith('//');
    const dlHref=isAbsolute?img.src:'#';
    item.innerHTML=`
      <img class="ii-thumb" src="${esc(img.src)}" alt="" loading="lazy" onerror="this.style.background='#f1f5f9'" title="Click to open image" onclick="window.open('${esc(img.src)}','_blank')"/>
      <div class="ii-info">
        <div class="ii-alt">${hasAlt?esc(img.alt):'(no alt text)'}</div>
        <div class="ii-src">${esc(fname)}</div>
        ${img.width||img.height?`<div class="ii-size">${img.width||'?'}×${img.height||'?'}px</div>`:''}
      </div>
      <div class="ii-actions">
        <div class="ii-badges">${badges.join('')}</div>
        <a class="ii-dl-btn" href="${esc(isAbsolute?img.src:'#')}" download="${esc(fname)}" target="_blank" ${!isAbsolute?'onclick="return false"':''}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download
        </a>
      </div>`;
    list.appendChild(item);
  });
}

/* ─── RENDER: Technical ─── */
function renderTechnical(d){
  const sections=$('techSections'); sections.innerHTML='';
  const groups=[
    {icon:'🔒',title:'Security & Indexability',rows:[
      {icon:'🔒',label:'HTTPS',val:d.isHttps?'Secure':'Not Secure',cls:d.isHttps?'ok':'error'},
      {icon:'🤖',label:'Robots',val:d.robots||'index, follow (default)',cls:d.isNoindex?'error':'ok'},
      {icon:'🚫',label:'Noindex',val:d.isNoindex?'YES — Not indexable':'No — Indexable',cls:d.isNoindex?'error':'ok'},
      {icon:'🔗',label:'Canonical URL',val:d.canonical||'Not set',cls:d.canonical?'ok':'warn'},
    ]},
    {icon:'📱',title:'Page Basics',rows:[
      {icon:'📄',label:'Doctype',val:d.doctype||'Missing',cls:d.doctype==='HTML'?'ok':'warn'},
      {icon:'🌍',label:'Language',val:d.lang||'Not set',cls:d.lang?'ok':'warn'},
      {icon:'📱',label:'Viewport',val:d.viewport||'Missing',cls:d.viewport?'ok':'error'},
      {icon:'🔤',label:'Charset',val:d.charset||'Not declared',cls:'neutral'},
      {icon:'⭐',label:'Favicon',val:d.favicon?'Present':'Missing',cls:d.favicon?'ok':'warn'},
    ]},
    {icon:'📊',title:'Content Signals',rows:[
      {icon:'📖',label:'Word Count',val:`${d.wordCount.toLocaleString()} words`,cls:d.wordCount>=300?'ok':'warn'},
      {icon:'📊',label:'Schema Markup',val:d.structuredData.length>0?`${d.structuredData.length} schema(s)`:'None',cls:d.structuredData.length>0?'ok':'warn'},
      {icon:'🖼',label:'Images (total)',val:d.images.length,cls:'neutral'},
      {icon:'✅',label:'Images with Alt',val:`${d.imagesWithAlt} / ${d.images.length}`,cls:d.imagesMissing===0?'ok':'warn'},
      {icon:'⚡',label:'Lazy Images',val:d.imagesLazy>0?`${d.imagesLazy} lazy`:'None',cls:d.imagesLazy>0?'ok':'warn'},
    ]},
    {icon:'⚡',title:'Performance Hints',rows:[
      {icon:'🕐',label:'TTFB',val:d.ttfb!=null?`${d.ttfb}ms`:'N/A',cls:d.ttfb!=null?d.ttfb<200?'ok':d.ttfb<600?'warn':'error':'neutral'},
      {icon:'⏱',label:'DOM Ready',val:d.domContentLoaded!=null?`${d.domContentLoaded}ms`:'N/A',cls:d.domContentLoaded!=null?d.domContentLoaded<1500?'ok':d.domContentLoaded<3000?'warn':'error':'neutral'},
      {icon:'🚀',label:'Load Time',val:d.loadTime!=null?`${d.loadTime}ms`:'N/A',cls:d.loadTime!=null?d.loadTime<3000?'ok':d.loadTime<6000?'warn':'error':'neutral'},
      {icon:'📝',label:'Scripts',val:d.scriptCount,cls:d.scriptCount<20?'ok':'warn'},
      {icon:'🎨',label:'Stylesheets',val:d.styleCount,cls:d.styleCount<10?'ok':'warn'},
    ]},
    {icon:'🔵',title:'Social Media',rows:[
      {icon:'📘',label:'OG Tags',val:Object.keys(d.openGraph).length>0?`${Object.keys(d.openGraph).length} present`:'Missing',cls:Object.keys(d.openGraph).length>0?'ok':'warn'},
      {icon:'🖼',label:'OG Image',val:d.openGraph['og:image']?'Set':'Missing',cls:d.openGraph['og:image']?'ok':'warn'},
      {icon:'🐦',label:'Twitter Card',val:d.twitter['twitter:card']||'Missing',cls:d.twitter['twitter:card']?'ok':'warn'},
    ]},
  ];
  groups.forEach(group=>{
    const g=el('div','tech-group');
    const head=el('div','tg-head');
    head.innerHTML=`<span class="tg-icon">${group.icon}</span>${esc(group.title)}`;
    g.appendChild(head);
    const rows=el('div','tg-rows');
    group.rows.forEach(row=>{
      const r=el('div','tech-row');
      r.innerHTML=`<span class="tr-label"><span class="tr-icon">${row.icon}</span>${esc(row.label)}</span><span class="tr-val ${row.cls}">${esc(String(row.val))}</span>`;
      rows.appendChild(r);
    });
    g.appendChild(rows); sections.appendChild(g);
  });
}

/* ─── RENDER: Site Audit ─── */
function renderSiteAudit(d){
  if($('saTotalPages'))$('saTotalPages').textContent=d.estimatedPages||0;
  if($('saBlogPosts'))$('saBlogPosts').textContent=d.estimatedBlogPosts||0;
  if($('saExtLinks'))$('saExtLinks').textContent=d.externalLinks?d.externalLinks.length:0;
  if($('saTechScore'))$('saTechScore').textContent=calcTechHealth(d);
}

/* ─── RENDER: Indexed Pages ─── */
let _indexedData={all:[],blog:[],other:[]};
let _allPageLinks=[];
function renderIndexedPages(d){
  const blogUrls=d.blogPostUrls||[],otherUrls=d.pageUrls||[];
  const allUrls=[...new Set([...blogUrls,...otherUrls])];
  // All URLs = internal links deduplicated
  const allInternalUrls=[...new Set((d.internalLinks||[]).map(l=>l.href).filter(Boolean))];
  _allPageLinks=allInternalUrls;
  _indexedData={all:allUrls,blog:blogUrls,other:otherUrls};
  if($('idxTotalCount'))$('idxTotalCount').textContent=allUrls.length;
  if($('idxBlogCount'))$('idxBlogCount').textContent=blogUrls.length;
  if($('idxOtherCount'))$('idxOtherCount').textContent=otherUrls.length;
  if($('idxAllUrlCount'))$('idxAllUrlCount').textContent=allInternalUrls.length;
  renderIndexedList('all');
  document.querySelectorAll('.idx-filter-btn').forEach(btn=>{btn.addEventListener('click',function(){document.querySelectorAll('.idx-filter-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const q=($('idxSearchInput')||{}).value||'';renderIndexedList(btn.dataset.ifilter,q);});});
  const dlp=$('btnDownloadPages'); if(dlp)dlp.addEventListener('click',downloadPages);
  // Search
  const searchInput=$('idxSearchInput');
  const searchClear=$('idxSearchClear');
  if(searchInput){
    searchInput.addEventListener('input',function(){
      const q=this.value.trim();
      if(searchClear)searchClear.classList.toggle('hidden',!q);
      const activeFilter=document.querySelector('.idx-filter-btn.active');
      renderIndexedList(activeFilter?activeFilter.dataset.ifilter:'all',q);
    });
  }
  if(searchClear){
    searchClear.addEventListener('click',function(){
      if(searchInput)searchInput.value='';
      searchClear.classList.add('hidden');
      const activeFilter=document.querySelector('.idx-filter-btn.active');
      renderIndexedList(activeFilter?activeFilter.dataset.ifilter:'all','');
    });
  }
  // Download filtered
  const dlFiltered=$('btnDownloadFiltered');
  if(dlFiltered)dlFiltered.addEventListener('click',downloadFilteredPages);
}
function renderIndexedList(filter,searchQ){
  const list=$('idxList'); if(!list)return;
  list.innerHTML='';
  let urls;
  if(filter==='allurls'){
    urls=_allPageLinks;
  } else {
    urls=_indexedData[filter]||_indexedData.all;
  }
  const q=(searchQ||'').trim().toLowerCase();
  if(q){
    urls=urls.filter(u=>u.toLowerCase().includes(q));
    const ri=$('idxResultsInfo');
    if(ri){ri.textContent='Found '+urls.length+' result'+(urls.length!==1?'s':'')+ ' for "'+searchQ+'"';ri.classList.remove('hidden');}
  } else {
    const ri=$('idxResultsInfo');if(ri)ri.classList.add('hidden');
  }
  // Track and show/hide filtered download
  window._currentFilteredUrls=urls;
  const dlBtn=$('btnDownloadFiltered');
  if(dlBtn){if(q||filter!=='all'){dlBtn.classList.remove('hidden');}else{dlBtn.classList.add('hidden');}}
  if(!urls.length){list.innerHTML='<div class="idx-empty">'+(q?'No URLs match your search.':'No pages detected in this category')+'</div>';return;}
  urls.forEach(function(url,i){
    const isBlog=_indexedData.blog.includes(url);
    const row=el('div','idx-row');
    let path=''; try{path=new URL(url).pathname;}catch(e){path=url;}
    const displayPath=q?path.replace(new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<span class="idx-match-highlight">$1</span>'):esc(path);
    const displayUrl=q?url.replace(new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<span class="idx-match-highlight">$1</span>'):esc(url);
    row.innerHTML=`<span class="idx-num">${i+1}</span><div class="idx-url-wrap"><div class="idx-path">${displayPath}</div><div class="idx-full">${displayUrl}</div></div><span class="idx-type-badge ${isBlog?'blog':'page'}">${isBlog?'Blog':'Page'}</span>`;
    list.appendChild(row);
  });
}

/* ─── DOWNLOAD CSV ─── */
function downloadReport(){
  if(!_seoData)return;
  const d=_seoData,now=new Date().toISOString().slice(0,19).replace('T',' ');
  const rows=[['7th Club SEO Report'],['Generated',now],['URL',d.url],[],
    ['SEO Score',calcScore(d).score+'/100'],['Tech Health',calcTechHealth(d)],[],
    ['Title Tag',d.titleTag],['Title Length',d.titleTag.length+' chars'],
    ['Meta Description',d.description],['Description Length',d.description.length+' chars'],
    ['H1 Count',d.h1Count],['HTTPS',d.isHttps?'Yes':'No'],['Canonical',d.canonical||'Not set'],
    ['Language',d.lang||'Not set'],['Viewport',d.viewport||'Missing'],
    ['Noindex',d.isNoindex?'YES':'No'],['Word Count',d.wordCount],
    ['Schema Markup',d.structuredData.length+' schema(s)'],
    [],['SITE CONTENT'],['Est. Pages',d.estimatedPages],['Est. Blog Posts',d.estimatedBlogPosts],
    ['Total Links',d.links.length],['Internal Links',d.internalLinks.length],
    ['External Links',d.externalLinks.length],['Total Images',d.images.length],
    ['Images With Alt',d.imagesWithAlt],['Images Missing Alt',d.imagesMissing],
    [],['PERFORMANCE'],
    ['TTFB',d.ttfb!=null?d.ttfb+'ms':'N/A'],
    ['DOM Ready',d.domContentLoaded!=null?d.domContentLoaded+'ms':'N/A'],
    ['Load Time',d.loadTime!=null?d.loadTime+'ms':'N/A'],
    ['Scripts',d.scriptCount],['Stylesheets',d.styleCount],
  ];
  if(d.blogPostUrls&&d.blogPostUrls.length>0){rows.push([],['BLOG POST URLs']);d.blogPostUrls.forEach(u=>rows.push([u]));}
  if(d.pageUrls&&d.pageUrls.length>0){rows.push([],['PAGE URLs']);d.pageUrls.slice(0,100).forEach(u=>rows.push([u]));}
  const csv=rows.map(r=>r.map(v=>'"'+String(v||'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download='7thclub-seo-'+((d.host||'site'))+'.csv'; a.click();
}
function downloadPages(){
  const rows=[['#','Type','Path','Full URL']];
  _indexedData.all.forEach((url,i)=>{const isBlog=_indexedData.blog.includes(url);let path='';try{path=new URL(url).pathname;}catch(e){path=url;}rows.push([i+1,isBlog?'Blog Post':'Page',path,url]);});
  const csv=rows.map(r=>r.map(v=>'"'+String(v||'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download='7thclub-indexed-pages.csv'; a.click();
}

function downloadFilteredPages(){
  const urls=window._currentFilteredUrls||[];
  const rows=[["#","Type","Path","Full URL"]];
  urls.forEach((url,i)=>{const isBlog=_indexedData.blog.includes(url);let path="";try{path=new URL(url).pathname;}catch(e){path=url;}rows.push([i+1,isBlog?"Blog Post":"Page",path,url]);});
  const csv=rows.map(r=>r.map(v=>"\x22"+String(v||"").replace(/"/g,"\x22\x22")+"\x22").join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download="7thclub-filtered-urls.csv"; a.click();
}

/* ─── AUDIT REPORT — Full Detailed Professional Report ─── */
function getFixTip(text){
  const tips={
    'Title tag is missing':'Add a unique descriptive <title> tag (30–60 chars) containing your primary keyword',
    'Title too short':'Expand title to include primary keyword + brand name, aim for 50–60 characters',
    'Title too long':'Trim to under 60 characters — Google truncates longer titles in search results',
    'Meta description missing':'Write a compelling 120–155 char description with target keywords and a call-to-action',
    'Description too short':'Expand to at least 70 characters — include keywords and an action phrase',
    'Description too long':'Cut to under 160 characters to prevent truncation in SERPs',
    'No H1 heading found':'Add exactly one H1 tag that clearly states the page topic and primary keyword',
    'Multiple H1 tags':'Remove extra H1s — demote them to H2 or H3 headings instead',
    'Page not served over HTTPS':'Install an SSL certificate and force HTTPS redirects — it is a confirmed ranking factor',
    'No canonical URL defined':'Add <link rel="canonical" href="full-url"/> in your <head> section',
    'Missing lang attribute':'Add lang="en" (or correct language code) to the opening <html> tag',
    'Missing viewport meta tag':'Add <meta name="viewport" content="width=device-width, initial-scale=1">',
    'Page is set to noindex':'Remove the noindex directive unless deliberately hiding this page from search engines',
    'missing alt text':'Add descriptive alt attributes to every image — include keywords where natural',
    'No Open Graph tags found':'Add og:title, og:description, og:image and og:url tags for better social sharing',
    'Missing og:image tag':'Add a 1200×630px og:image — required for rich social previews on Facebook & LinkedIn',
    'Missing Twitter Card tags':'Add twitter:card, twitter:title, twitter:description and twitter:image meta tags',
    'No structured data':'Add JSON-LD schema — start with Organization + WebPage for instant SEO benefit',
    'Low word count':'Write at least 300 words; aim for 1 000+ on competitive topics for better rankings',
  };
  for(const[k,v]of Object.entries(tips)){if(text.toLowerCase().includes(k.toLowerCase()))return v;}
  return 'Review this element and improve it following SEO best practices';
}

function generateAuditReport(){
  if(!_seoData)return;
  const d=_seoData;
  const {score,issues}=calcScore(d);
  const errors=issues.filter(i=>i.sev==='error');
  const warns=issues.filter(i=>i.sev==='warn');
  const passedCount=Math.max(0,12-errors.length-warns.length);
  const kd=calcKeywordDensity(d.bodyText||'',Math.max(d.wordCount,1));
  const techH=calcTechHealth(d);
  const techNum=parseInt(techH)||0;
  const now=new Date().toLocaleDateString('en-GB',{year:'numeric',month:'long',day:'numeric'});
  const nowTime=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  const tl=d.titleTag.length,dl=d.description.length;
  /* Brand colors matching 7thclub.com */
  const B='#3B5DD4',BDK='#1e3a8a',ORANGE='#F97316',GOLD='#FEB622';
  const scoreCol=score>=80?B:score>=60?GOLD:'#ef4444';
  const scoreLbl=score>=90?'Excellent':score>=80?'Good':score>=60?'Needs Work':score>=40?'Poor':'Critical';
  const hdCounts={1:0,2:0,3:0,4:0,5:0,6:0};
  d.headings.forEach(h=>{if(hdCounts[h.level]!==undefined)hdCounts[h.level]++;});
  let speedScore=100;
  if(d.ttfb!=null){if(d.ttfb>600)speedScore-=30;else if(d.ttfb>200)speedScore-=15;}
  if(d.domContentLoaded!=null){if(d.domContentLoaded>3000)speedScore-=25;else if(d.domContentLoaded>1500)speedScore-=12;}
  if(d.loadTime!=null){if(d.loadTime>6000)speedScore-=25;else if(d.loadTime>3000)speedScore-=12;}
  speedScore=Math.max(0,Math.min(100,speedScore));
  const speedCol=speedScore>=80?B:speedScore>=50?GOLD:'#ef4444';
  const speedLbl=speedScore>=80?'Fast':speedScore>=50?'Needs Improvement':'Slow';

  /* ── helpers ── */
  const ring=(val,max,col,size=90)=>{
    const r=size*0.4,circ=2*Math.PI*r,offset=circ-(val/max)*circ;
    const cx=size/2,cy=size/2;
    return `<svg width="${size}" height="${size}" style="transform:rotate(-90deg)">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e8eaf6" stroke-width="${size*0.09}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="${size*0.09}"
        stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"
        style="filter:drop-shadow(0 0 6px ${col}88)"/>
    </svg>`;
  };
  const bar=(pct,col=B,h=10)=>`<div style="background:#e8eaf6;border-radius:${h}px;height:${h}px;overflow:hidden"><div style="height:100%;width:${Math.min(100,pct).toFixed(1)}%;background:${col};border-radius:${h}px;transition:width 0.8s ease"></div></div>`;
  const chip=(txt,bg,col,brd)=>`<span style="display:inline-flex;align-items:center;padding:4px 12px;border-radius:20px;font-size:0.72rem;font-weight:700;background:${bg};color:${col};border:1.5px solid ${brd}">${txt}</span>`;
  const statusChip=(cls,txt)=>{
    const map={ok:['#dcfce7','#14532d','#86efac'],warn:['#ffedd5','#7c2d12','#fb923c'],error:['#fee2e2','#7f1d1d','#f87171'],neutral:['#f1f5f9','#475569','#cbd5e1']};
    const [bg,col,brd]=map[cls]||map.neutral;
    return chip(txt,bg,col,brd);
  };
  /* Section header with orange accent bar */
  const secHead=(emoji,title,sub='')=>`
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;padding-bottom:14px;border-bottom:3px solid #3B5DD4">
      <div style="width:46px;height:46px;background:linear-gradient(135deg,#3B5DD4,#1e3a8a);
        border-radius:12px;display:flex;align-items:center;justify-content:center;
        font-size:1.4rem;flex-shrink:0;box-shadow:0 4px 14px rgba(59,93,212,0.35)">${emoji}</div>
      <div style="flex:1">
        <div style="font-size:1.15rem;font-weight:900;color:#1e3a8a;letter-spacing:-0.3px">${title}</div>
        ${sub?`<div style="font-size:0.8rem;color:#6b7280;margin-top:2px">${sub}</div>`:''}
      </div>
      <div style="width:8px;height:8px;background:#F97316;border-radius:50%"></div>
    </div>`;
  const box=(content,brdCol='#e8eaf6',bgCol='#fff')=>
    `<div style="background:${bgCol};border:2px solid ${brdCol};border-radius:14px;overflow:hidden;margin-bottom:16px">${content}</div>`;
  const infoRow=(icon,label,val,cls='neutral',tip='')=>`
    <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #eef0f8;
      ${cls==='error'?'background:#fff1f2;border-left:5px solid #ef4444;':
        cls==='warn'?'background:#fff7ed;border-left:5px solid #F97316;':
        cls==='ok'?'background:#f0fdf4;border-left:5px solid #16a34a;':
        'background:#fff;border-left:5px solid #e8eaf6;'}">
      <span style="font-size:1rem;width:24px;text-align:center;flex-shrink:0">${icon}</span>
      <span style="flex:1;font-size:0.85rem;font-weight:600;color:${cls==='error'?'#7f1d1d':cls==='warn'?'#7c2d12':'#374151'}">${label}</span>
      <span style="font-family:monospace;font-size:0.82rem;font-weight:700;color:#111827;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right">${esc(String(val).slice(0,80))}</span>
      ${statusChip(cls,cls==='ok'?'✓ Good':cls==='warn'?'⚠ Fix':cls==='error'?'✗ Error':'—')}
    </div>`;

  const html=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>SEO Audit — ${esc(d.host||'Site')} · 7th Club</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#ffffff;color:#111827;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:15px}
  .page{max-width:1000px;margin:0 auto;background:#fff;border:1px solid #3B5DD4}
  a{color:#3B5DD4;text-decoration:none}
  a:hover{color:#1e3a8a;text-decoration:underline}

  /* ── TABLES ── */
  table{width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:2px solid #3B5DD4;box-shadow:0 2px 12px rgba(59,93,212,0.10)}
  th{background:linear-gradient(90deg,#1e3a8a,#3B5DD4);color:#fff;padding:12px 16px;text-align:left;font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px}
  td{padding:11px 16px;border-bottom:1px solid #dbeafe;font-size:0.88rem;vertical-align:middle;background:#fff}
  tr:last-child td{border-bottom:none}
  tr:nth-child(even) td{background:#f7f9ff}
  tr:hover td{background:#eef2ff!important}
  .ok    {color:#15803d;font-weight:800}
  .warn  {color:#c2580a;font-weight:800}
  .error {color:#b91c1c;font-weight:800}
  .mono  {font-family:'Courier New',monospace;font-size:0.82rem}

  /* ── COLORED TABLE ROWS — red/orange/green fills ── */
  tr.row-error td{background:#ef4444!important;color:#fff!important;font-weight:700;border-bottom:2px solid #dc2626!important}
  tr.row-error td *{color:#fff!important}
  tr.row-error:hover td{background:#dc2626!important}
  tr.row-warn  td{background:#fff3e6!important;border-left:4px solid #F97316;border-bottom:1px solid #fed7aa}
  tr.row-warn:hover td{background:#ffe8cc!important}
  tr.row-ok    td{background:#f0fdf4!important;border-left:4px solid #16a34a;border-bottom:1px solid #bbf7d0}
  tr.row-ok:hover td{background:#dcfce7!important}

  /* ── SECTIONS — white with strong blue bottom rule ── */
  .section{padding:32px 44px;border-bottom:3px solid #dbeafe;background:#fff}
  .section:last-child{border-bottom:none}

  /* ── BLUE CARD BOX — white bg, blue border ── */
  .blue-box{background:#fff;border:2px solid #3B5DD4;border-radius:14px;overflow:hidden;margin-bottom:16px;box-shadow:0 2px 12px rgba(59,93,212,0.08)}
  .blue-box-header{background:linear-gradient(90deg,#1e3a8a,#3B5DD4);padding:12px 18px;color:#fff;font-size:0.82rem;font-weight:800;display:flex;align-items:center;gap:8px}
  .blue-box-body{padding:16px 18px;background:#fff}

  /* ── ORANGE ACCENT BOX ── */
  .orange-box{background:#fff;border:2px solid #F97316;border-radius:14px;overflow:hidden;margin-bottom:16px}
  .orange-box-header{background:linear-gradient(90deg,#c2580a,#F97316);padding:12px 18px;color:#fff;font-size:0.82rem;font-weight:800;display:flex;align-items:center;gap:8px}
  .orange-box-body{padding:16px 18px}

  /* ── ERROR CARD (solid red) ── */
  .error-card{background:#ef4444;border:2px solid #b91c1c;border-radius:12px;overflow:hidden;margin-bottom:10px}
  .error-card-head{background:#b91c1c;padding:11px 18px;color:#fff;font-weight:800;font-size:0.9rem;display:flex;align-items:center;gap:10px}
  .error-card-body{background:#ef4444;padding:12px 18px;color:#fff;font-size:0.8rem;line-height:1.6}
  .error-card-body strong{color:#fecaca}

  /* ── WARN CARD ── */
  .warn-card{background:#fff7ed;border:2px solid #F97316;border-radius:12px;overflow:hidden;margin-bottom:10px}
  .warn-card-head{background:linear-gradient(90deg,#c2580a,#F97316);padding:10px 18px;color:#fff;font-weight:800;font-size:0.88rem;display:flex;align-items:center;gap:10px}
  .warn-card-body{padding:12px 18px;color:#7c2d12;font-size:0.8rem;line-height:1.6}
  .warn-card-body strong{color:#9a3412}

  /* ── STAT TILES ── */
  .stat-grid{display:grid;gap:10px;margin-bottom:20px}
  .stat-tile{border-radius:12px;padding:14px 16px;text-align:center}
  .stat-tile .st-num{font-size:1.7rem;font-weight:900;line-height:1}
  .stat-tile .st-lbl{font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-top:4px;opacity:.75}
  .stat-tile.blue  {background:#fff;border:2px solid #3B5DD4;color:#1e3a8a}
  .stat-tile.green {background:#f0fdf4;border:2px solid #16a34a;color:#14532d}
  .stat-tile.red   {background:#ef4444;border:2px solid #b91c1c;color:#fff}
  .stat-tile.red .st-lbl{opacity:0.85}
  .stat-tile.orange{background:#fff7ed;border:2px solid #F97316;color:#7c2d12}
  .stat-tile.grey  {background:#fff;border:2px solid #cbd5e1;color:#374151}

  /* ── CHIP / BADGE ── */
  .chip{display:inline-flex;align-items:center;padding:4px 12px;border-radius:20px;font-size:0.72rem;font-weight:700}
  .chip-ok    {background:#dcfce7;color:#14532d;border:1.5px solid #86efac}
  .chip-warn  {background:#ffedd5;color:#7c2d12;border:1.5px solid #fb923c}
  .chip-error {background:#ef4444;color:#fff;border:1.5px solid #b91c1c}
  .chip-grey  {background:#f1f5f9;color:#475569;border:1.5px solid #cbd5e1}

  /* ── PROGRESS BAR ── */
  .prog-track{background:#e8eaf6;border-radius:8px;height:10px;overflow:hidden;margin:6px 0}
  .prog-fill {height:100%;border-radius:8px;transition:width .8s ease}
  .prog-blue  .prog-fill{background:#3B5DD4}
  .prog-green .prog-fill{background:#16a34a}
  .prog-orange.prog-fill, .prog-orange .prog-fill{background:#F97316}
  .prog-red   .prog-fill{background:#ef4444}

  @media print{body{background:#fff}.page{margin:0;box-shadow:none} .no-print{display:none!important} .pb{page-break-before:always}}
</style>
</head>
<body>
<div class="page">

<!-- ═══════════ COVER HEADER — WHITE THEME ═══════════ -->
<div style="background:#fff;border-bottom:4px solid #3B5DD4;position:relative;overflow:hidden">

  <!-- top orange accent stripe -->
  <div style="height:5px;background:linear-gradient(90deg,#3B5DD4,#F97316,#FEB622,#F97316,#3B5DD4)"></div>

  <!-- logo bar -->
  <div style="padding:28px 48px 22px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #dbeafe">
    <div style="display:flex;align-items:center;gap:16px">
      <img src="https://7thclub.com/wp-content/uploads/2025/02/Logo.png"
        style="height:60px;object-fit:contain"
        alt="7th Club"
        onerror="this.outerHTML='<span style=font-size:2rem;font-weight:900;color:#3B5DD4;letter-spacing:1px>7THCLUB</span>'"/>
      <div style="border-left:2px solid #dbeafe;padding-left:16px">
        <div style="font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:3px;color:#3B5DD4">SEO Analyzer Pro</div>
        <div style="font-size:0.72rem;color:#6b7280;margin-top:2px">by 7thclub.com</div>
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:2rem;font-weight:900;color:#1e3a8a;letter-spacing:-0.5px;line-height:1">SEO Audit Report</div>
      <div style="font-size:0.95rem;color:#3B5DD4;font-weight:600;margin-top:5px">${esc(d.host||'Website')}</div>
      <div style="display:inline-flex;align-items:center;gap:8px;background:#F97316;border-radius:8px;padding:6px 16px;margin-top:10px">
        <span style="color:#fff;font-size:0.8rem">📅</span>
        <span style="color:#fff;font-size:0.8rem;font-weight:800">${now} · ${nowTime}</span>
      </div>
    </div>
  </div>

  <!-- URL badge -->
  <div style="margin:16px 48px;background:#f0f4ff;border:2px solid #3B5DD4;border-radius:10px;padding:11px 18px;display:flex;align-items:center;gap:10px">
    <span style="background:${d.isHttps?'#16a34a':'#ef4444'};color:#fff;font-size:0.7rem;font-weight:800;padding:4px 10px;border-radius:6px;flex-shrink:0">${d.isHttps?'🔒 HTTPS':'⚠ HTTP'}</span>
    <a href="${esc(d.url||'#')}" target="_blank" style="color:#1e3a8a;font-family:monospace;font-size:0.85rem;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600">${esc(d.url||'')}</a>
    <span style="background:${d.isNoindex?'#ef4444':'#16a34a'};color:#fff;font-size:0.68rem;font-weight:800;padding:4px 10px;border-radius:6px;flex-shrink:0">${d.isNoindex?'NOINDEX':'✓ INDEXED'}</span>
  </div>

  <!-- SCORE HERO -->
  <div style="padding:24px 48px 36px;display:flex;gap:36px;align-items:center">

    <!-- score ring -->
    <div style="position:relative;width:150px;height:150px;flex-shrink:0">
      ${ring(score,100,scoreCol,150)}
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <div style="font-size:2.8rem;font-weight:900;color:${scoreCol};line-height:1">${score}</div>
        <div style="font-size:0.56rem;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:2px;margin-top:3px">SEO SCORE</div>
      </div>
    </div>

    <!-- summary -->
    <div style="flex:1">
      <div style="font-size:1.4rem;font-weight:900;color:#1e3a8a;margin-bottom:4px;line-height:1.3">${esc(d.titleTag||d.host||'Untitled Page')}</div>
      <div style="font-size:0.85rem;color:#374151;margin-bottom:18px">
        Overall Grade: <strong style="color:${scoreCol}">${scoreLbl}</strong>
        &nbsp;·&nbsp; Tech Health: <strong style="color:${techNum>=80?'#16a34a':techNum>=60?'#F97316':'#ef4444'}">${techH}</strong>
        &nbsp;·&nbsp; Words: <strong style="color:#3B5DD4">${d.wordCount.toLocaleString()}</strong>
      </div>
      <!-- stat tiles — solid fills for quick visual scan -->
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${[
          {n:errors.length,  lbl:'Critical Errors', bg:errors.length>0?'#ef4444':'#f0fdf4', brd:errors.length>0?'#b91c1c':'#86efac', col:errors.length>0?'#fff':'#16a34a', lblcol:errors.length>0?'rgba(255,255,255,0.85)':'#14532d'},
          {n:warns.length,   lbl:'Warnings',         bg:warns.length>0?'#F97316':'#f0fdf4',  brd:warns.length>0?'#c2580a':'#86efac',  col:warns.length>0?'#fff':'#16a34a',  lblcol:warns.length>0?'rgba(255,255,255,0.85)':'#14532d'},
          {n:passedCount,    lbl:'Checks Passed',    bg:'#f0fdf4',  brd:'#86efac',  col:'#16a34a', lblcol:'#14532d'},
          {n:d.links.length, lbl:'Total Links',      bg:'#eff4ff',  brd:'#3B5DD4',  col:'#1e3a8a', lblcol:'#1e3a8a'},
          {n:d.images.length,lbl:'Images Found',     bg:'#faf5ff',  brd:'#7c3aed',  col:'#5b21b6', lblcol:'#5b21b6'},
          {n:d.structuredData.length,lbl:'Schema',   bg:'#ecfeff',  brd:'#0891b2',  col:'#0e7490', lblcol:'#0e7490'},
        ].map(s=>`
        <div style="background:${s.bg};border:2px solid ${s.brd};border-radius:12px;padding:12px 16px;min-width:80px;text-align:center;flex:1;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
          <div style="font-size:1.7rem;font-weight:900;color:${s.col};line-height:1">${s.n}</div>
          <div style="font-size:0.58rem;font-weight:800;color:${s.lblcol};text-transform:uppercase;letter-spacing:.4px;margin-top:4px;opacity:0.9">${s.lbl}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>
</div>

<!-- ═══════════════════════════
     QUICK-GLANCE STATUS BAR
═══════════════════════════ -->
<div style="background:#fff;border-bottom:4px solid #3B5DD4;padding:18px 40px;display:grid;grid-template-columns:repeat(7,1fr);gap:8px">
  ${[
    {lbl:'Title',val:d.titleTag?`${tl}c`:'Missing',cls:!d.titleTag?'error':tl>=30&&tl<=60?'ok':'warn'},
    {lbl:'Description',val:d.description?`${dl}c`:'Missing',cls:!d.description?'error':dl>=70&&dl<=160?'ok':'warn'},
    {lbl:'H1 Tag',val:`${hdCounts[1]} found`,cls:hdCounts[1]===1?'ok':hdCounts[1]===0?'error':'warn'},
    {lbl:'HTTPS',val:d.isHttps?'Secure':'Insecure',cls:d.isHttps?'ok':'error'},
    {lbl:'Canonical',val:d.canonical?'Set':'Missing',cls:d.canonical?'ok':'warn'},
    {lbl:'Viewport',val:d.viewport?'Set':'Missing',cls:d.viewport?'ok':'error'},
    {lbl:'Schema',val:`${d.structuredData.length} found`,cls:d.structuredData.length>0?'ok':'warn'},
  ].map(c=>{
    if(c.cls==='error'){
      return `<div style="background:#ef4444;border:2px solid #b91c1c;border-radius:10px;padding:10px 8px;text-align:center;box-shadow:0 3px 10px rgba(239,68,68,0.3)">
        <div style="font-size:1rem;margin-bottom:3px">❌</div>
        <div style="font-size:0.58rem;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:rgba(255,255,255,0.8);margin-bottom:3px">${c.lbl}</div>
        <div style="font-size:0.8rem;font-weight:900;color:#fff">${c.val}</div>
      </div>`;
    }
    const bg={ok:'#f0fdf4',warn:'#fff7ed'};
    const brd={ok:'#86efac',warn:'#fb923c'};
    const hd={ok:'#14532d',warn:'#7c2d12'};
    const ico={ok:'✅',warn:'⚠️'};
    return `<div style="background:${bg[c.cls]};border:2px solid ${brd[c.cls]};border-radius:10px;padding:10px 8px;text-align:center">
      <div style="font-size:1rem;margin-bottom:3px">${ico[c.cls]}</div>
      <div style="font-size:0.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:${hd[c.cls]};margin-bottom:3px">${c.lbl}</div>
      <div style="font-size:0.8rem;font-weight:900;color:${hd[c.cls]}">${c.val}</div>
    </div>`;
  }).join('')}
</div>

<!-- ═══════════════════
     SECTION 1: ERRORS
═══════════════════ -->
<div class="section">
  ${secHead('❌','Critical Errors','Issues that directly prevent ranking — fix these first')}
  ${errors.length===0
    ? `<div style="background:#f0fdf4;border:2px solid #86efac;border-radius:14px;padding:22px 24px;display:flex;align-items:center;gap:16px">
        <span style="font-size:2rem">🎉</span>
        <div><div style="font-size:1rem;font-weight:800;color:#166534">Zero Critical Errors!</div>
        <div style="font-size:0.78rem;color:#15803d;margin-top:3px">Your page passes all critical SEO checks — excellent foundation</div></div>
      </div>`
    : errors.map((e,i)=>`
      <div class="error-card">
        <div class="error-card-head">
          <div style="width:26px;height:26px;background:rgba(0,0,0,0.2);border:2px solid rgba(255,255,255,0.4);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:900;color:#fff;flex-shrink:0">${i+1}</div>
          <span style="flex:1">${esc(e.text)}</span>
          <span style="background:rgba(0,0,0,0.2);color:#fff;font-size:0.62rem;font-weight:800;padding:3px 10px;border-radius:20px;white-space:nowrap">🔴 CRITICAL</span>
        </div>
        <div class="error-card-body">
          <strong>💡 How to fix:</strong> ${esc(getFixTip(e.text))}
        </div>
      </div>`).join('')}
</div>

<!-- ═══════════════════
     SECTION 2: WARNINGS
═══════════════════ -->
${warns.length>0?`
<div class="section">
  ${secHead('⚠️','Warnings','These improvements will significantly boost your rankings')}
  ${warns.map((w,i)=>`
    <div class="warn-card">
      <div class="warn-card-head">
        <div style="width:26px;height:26px;background:rgba(0,0,0,0.15);border:2px solid rgba(255,255,255,0.4);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:900;color:#fff;flex-shrink:0">${i+1}</div>
        <span style="flex:1">${esc(w.text)}</span>
        <span style="background:rgba(0,0,0,0.15);color:#fff;font-size:0.62rem;font-weight:800;padding:3px 10px;border-radius:20px;white-space:nowrap">🟠 MEDIUM</span>
      </div>
      <div class="warn-card-body">
        <strong>💡 Fix:</strong> ${esc(getFixTip(w.text))}
      </div>
    </div>`).join('')}
</div>`:''}

<!-- ═════════════════════════
     SECTION 3: ON-PAGE SEO
═════════════════════════ -->
<div class="section">
  ${secHead('📝','On-Page SEO — Full Analysis','Every on-page element inspected and graded')}

  <!-- Title Tag deep-dive -->
  <div class="blue-box" style="margin-bottom:16px">
    <div class="blue-box-header">📝 TITLE TAG &nbsp;<span style="opacity:0.7;font-weight:400">${tl} characters</span>
      <span style="margin-left:auto">${!d.titleTag?'❌ Missing':tl>=30&&tl<=60?`✅ ${tl} chars — Perfect`:`⚠ ${tl} chars — ${tl<30?'Too Short':'Too Long'}`}</span>
    </div>
    <div class="blue-box-body">
      <div style="background:#fff;border:1.5px solid #dbeafe;border-radius:8px;padding:14px;font-size:0.9rem;color:${d.titleTag?'#111827':'#9ca3af'};font-style:${d.titleTag?'normal':'italic'};line-height:1.5;margin-bottom:12px">${d.titleTag?esc(d.titleTag):'⚠ No title tag found on this page'}</div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <span style="font-size:0.65rem;color:#9ca3af;width:28px;text-align:right;flex-shrink:0">0</span>
        <div style="flex:1">${bar(tl?Math.min(100,(tl/60)*100):0, !d.titleTag?'#ef4444':tl>=30&&tl<=60?'#3B5DD4':'#F97316', 10)}</div>
        <span style="font-size:0.65rem;color:#9ca3af;width:28px;flex-shrink:0">60</span>
      </div>
      <div style="text-align:center;font-size:0.68rem;color:#6b7280">Ideal range: <strong style="color:#3B5DD4">30 – 60 characters</strong>  ·  Current: <strong>${tl}</strong> chars</div>
    </div>
  </div>

  <!-- Meta Description deep-dive -->
  <div class="blue-box" style="margin-bottom:16px">
    <div class="blue-box-header">📋 META DESCRIPTION &nbsp;<span style="opacity:0.7;font-weight:400">${dl} characters</span>
      <span style="margin-left:auto">${!d.description?'❌ Missing':dl>=70&&dl<=160?`✅ ${dl} chars — Good`:`⚠ ${dl} chars — ${dl<70?'Too Short':'Too Long'}`}</span>
    </div>
    <div class="blue-box-body">
      <div style="background:#fff;border:1.5px solid #dbeafe;border-radius:8px;padding:14px;font-size:0.88rem;color:${d.description?'#374151':'#9ca3af'};font-style:${d.description?'normal':'italic'};line-height:1.7;margin-bottom:12px">${d.description?esc(d.description):'⚠ No meta description — add one to improve search click-through rates'}</div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <span style="font-size:0.65rem;color:#9ca3af;width:28px;text-align:right;flex-shrink:0">0</span>
        <div style="flex:1">${bar(dl?Math.min(100,(dl/160)*100):0, !d.description?'#ef4444':dl>=70&&dl<=160?'#3B5DD4':'#F97316', 10)}</div>
        <span style="font-size:0.65rem;color:#9ca3af;width:28px;flex-shrink:0">160</span>
      </div>
      <div style="text-align:center;font-size:0.68rem;color:#6b7280">Ideal range: <strong style="color:#3B5DD4">70 – 160 characters</strong>  ·  Current: <strong>${dl}</strong> chars</div>
    </div>
  </div>

  <!-- Meta Details Grid -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    ${[
      {icon:'🌐',lbl:'Canonical URL',val:d.canonical||'Not set',cls:d.canonical?'ok':'warn'},
      {icon:'🤖',lbl:'Robots Directive',val:d.robots||'index, follow (default)',cls:d.isNoindex?'error':'ok'},
      {icon:'🚫',lbl:'Noindex Status',val:d.isNoindex?'NOINDEX — Hidden from Google':'Indexable — Visible in search',cls:d.isNoindex?'error':'ok'},
      {icon:'🌍',lbl:'HTML Language',val:d.lang||'Not declared',cls:d.lang?'ok':'warn'},
      {icon:'📱',lbl:'Mobile Viewport',val:d.viewport||'MISSING',cls:d.viewport?'ok':'error'},
      {icon:'🔑',lbl:'Keywords Meta',val:d.keywords||'(not set)',cls:'neutral'},
      {icon:'👤',lbl:'Author',val:d.author||'(not set)',cls:'neutral'},
      {icon:'🔤',lbl:'Charset',val:d.charset||'Not declared',cls:'neutral'},
      {icon:'⭐',lbl:'Favicon',val:d.favicon?'Present':'Missing',cls:d.favicon?'ok':'warn'},
      {icon:'📄',lbl:'Doctype',val:d.doctype||'Missing',cls:d.doctype==='HTML'?'ok':'warn'},
    ].map(r=>{
      const bcol={ok:'#f0fdf4',warn:'#fff7ed',error:'#ef4444',neutral:'#fff'};
      const tcol={ok:'#14532d',warn:'#7c2d12',error:'#fff',neutral:'#1e3a8a'};
      const brd ={ok:'#86efac',warn:'#fb923c',error:'#b91c1c',neutral:'#3B5DD4'};
      const blft={ok:'4px solid #16a34a',warn:'4px solid #F97316',error:'6px solid #b91c1c',neutral:'4px solid #3B5DD4'};
      const ico ={ok:'✅',warn:'⚠️',error:'❌',neutral:'ℹ️'};
      const valCol={ok:'#15803d',warn:'#9a3412',error:'#fff',neutral:'#374151'};
      return `<div style="background:${bcol[r.cls]};border:2px solid ${brd[r.cls]};border-left:${blft[r.cls]};border-radius:12px;padding:14px 16px;display:flex;align-items:flex-start;gap:10px;${r.cls==='error'?'box-shadow:0 3px 10px rgba(239,68,68,0.25)':''}">
        <span style="font-size:1.1rem;flex-shrink:0">${r.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.62rem;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:${tcol[r.cls]};margin-bottom:4px">${r.lbl}</div>
          <div style="font-size:0.8rem;font-weight:600;color:${valCol[r.cls]};overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(String(r.val))}">${esc(String(r.val).slice(0,55)+(String(r.val).length>55?'…':''))}</div>
        </div>
        <span style="font-size:1.1rem;flex-shrink:0">${ico[r.cls]}</span>
      </div>`;
    }).join('')}
  </div>
</div>

<!-- ═══════════════════════
     SECTION 4: HEADINGS
═══════════════════════ -->
<div class="section">
  ${secHead('📋','Heading Structure','H1–H6 hierarchy analysis for content & SEO')}

  <!-- heading count badges -->
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">
    ${[1,2,3,4,5,6].map(n=>{
      const c=hdCounts[n];
      if(n>4&&c===0)return '';
      const bg=n===1&&c===0?'#fff5f5':n===1&&c>1?'#fffbeb':n===1?'#f0fdf4':n===2?'#fffbeb':'#f8faff';
      const brd=n===1&&c===0?'#fca5a5':n===1&&c>1?'#fde68a':n===1?'#86efac':n===2?'#fde68a':'#c7d2fe';
      const hcol=n===1&&c===0?'#c62828':n===1&&c>1?'#b45309':n===1?'#166534':n===2?'#b45309':'#2B5BCD';
      return `<div style="background:${bg};border:2px solid ${brd};border-radius:12px;padding:12px 20px;text-align:center;min-width:68px">
        <div style="font-family:monospace;font-size:0.75rem;font-weight:800;color:${hcol}">H${n}</div>
        <div style="font-size:1.6rem;font-weight:900;color:${hcol};line-height:1.1">${c}</div>
        <div style="font-size:0.58rem;color:${hcol};opacity:0.7;margin-top:2px">${n===1?c===1?'Perfect':c===0?'Missing':'Too many':c===0?'None':'found'}</div>
      </div>`;
    }).join('')}
  </div>

  ${d.headings.length>0?`
  <table>
    <thead><tr><th style="width:60px">Level</th><th>Heading Text</th></tr></thead>
    <tbody>
      ${d.headings.slice(0,30).map(h=>`
      <tr>
        <td>
          <span style="background:${h.level===1?'linear-gradient(135deg,#2B5BCD,#1e3a8a)':h.level===2?'linear-gradient(135deg,#FEB622,#b45309)':'#e8eaf6'};
            color:${h.level<=2?'#fff':'#374151'};font-family:monospace;font-size:0.7rem;font-weight:800;
            padding:4px 10px;border-radius:6px;display:inline-block">H${h.level}</span>
        </td>
        <td style="font-weight:${h.level===1?'800':'500'};color:${h.level===1?'#2B5BCD':h.level===2?'#374151':'#6b7280'};padding-left:${(h.level-1)*14}px">
          ${esc(h.text)}
        </td>
      </tr>`).join('')}
      ${d.headings.length>30?`<tr><td colspan="2" style="text-align:center;color:#9ca3af;font-style:italic;padding:12px">… and ${d.headings.length-30} more headings</td></tr>`:''}
    </tbody>
  </table>`
  :'<div style="text-align:center;padding:30px;color:#9ca3af;font-size:0.85rem">No headings found on this page</div>'}
</div>

<!-- ═════════════════════════════
     SECTION 5: OPEN GRAPH & SOCIAL
═════════════════════════════ -->
<div class="section">
  ${secHead('📣','Open Graph & Social Media Tags','Controls how your page appears when shared on social platforms')}

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px">
    ${[
      ['og:title',d.openGraph['og:title'],'Facebook / LinkedIn title'],
      ['og:description',d.openGraph['og:description'],'Social sharing description'],
      ['og:image',d.openGraph['og:image'],'1200×630px recommended'],
      ['og:url',d.openGraph['og:url'],'Canonical social URL'],
      ['og:type',d.openGraph['og:type'],'website / article / product'],
      ['og:site_name',d.openGraph['og:site_name'],'Brand name for sharing'],
      ['twitter:card',d.twitter['twitter:card'],'summary / summary_large_image'],
      ['twitter:title',d.twitter['twitter:title'],'Twitter/X card title'],
      ['twitter:description',d.twitter['twitter:description'],'Twitter/X card description'],
      ['twitter:image',d.twitter['twitter:image'],'Twitter/X card image'],
    ].map(([k,v,hint])=>v
      ? `<div style="background:#fff;border:2px solid #3B5DD4;border-left:5px solid #1e3a8a;border-radius:10px;padding:12px;display:flex;gap:10px;align-items:flex-start">
          <span style="font-size:1rem;flex-shrink:0">✅</span>
          <div style="flex:1;min-width:0">
            <div style="font-family:monospace;font-size:0.67rem;font-weight:800;color:#1e3a8a;margin-bottom:3px">${esc(k)}</div>
            <div style="font-size:0.75rem;font-weight:600;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(String(v).slice(0,65)+(v.length>65?'…':''))}</div>
          </div>
        </div>`
      : `<div style="background:#fff7ed;border:2px solid #F97316;border-left:5px solid #c2580a;border-radius:10px;padding:12px;display:flex;gap:10px;align-items:flex-start">
          <span style="font-size:1rem;flex-shrink:0">⚠️</span>
          <div style="flex:1;min-width:0">
            <div style="font-family:monospace;font-size:0.67rem;font-weight:800;color:#c2580a;margin-bottom:3px">${esc(k)}</div>
            <div style="font-size:0.75rem;color:#9ca3af;font-style:italic">not set — ${hint}</div>
          </div>
        </div>`
    ).join('')}
  </div>

  <!-- OG preview mockup -->
  ${d.openGraph['og:title']?`
  <div style="background:#fff;border:2px solid #3B5DD4;border-radius:14px;padding:16px;margin-top:8px">
    <div style="font-size:0.65rem;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📱 Social Share Preview</div>
    <div style="background:#fff;border:2px solid #3B5DD4;border-radius:10px;overflow:hidden;max-width:500px">
      ${d.openGraph['og:image']?`<div style="height:50px;background:linear-gradient(135deg,#2B5BCD,#FEB622);display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:rgba(255,255,255,0.7)">[OG Image: ${esc(d.openGraph['og:image'].split('/').pop().slice(0,40))}]</div>`:''}
      <div style="padding:12px 14px">
        <div style="font-size:0.68rem;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">${esc(d.host||'')}</div>
        <div style="font-weight:800;color:#111827;font-size:0.88rem;margin-bottom:4px">${esc((d.openGraph['og:title']||'').slice(0,65))}</div>
        <div style="font-size:0.78rem;color:#6b7280;line-height:1.4">${esc((d.openGraph['og:description']||'').slice(0,120))}</div>
      </div>
    </div>
  </div>`:''}
</div>

<!-- ════════════════════
     SECTION 6: SPEED
════════════════════ -->
<div class="section">
  ${secHead('⚡','Page Speed & Core Web Vitals','Performance data from your browser session')}

  <div style="display:flex;gap:24px;align-items:center;background:#fff;border:2px solid #3B5DD4;border-radius:14px;padding:20px;margin-bottom:20px">
    <div style="position:relative;width:110px;height:110px;flex-shrink:0">
      ${ring(speedScore,100,speedCol,110)}
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <div style="font-size:1.8rem;font-weight:900;color:${speedCol}">${speedScore}</div>
        <div style="font-size:0.52rem;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px">SPEED</div>
      </div>
    </div>
    <div style="flex:1">
      <div style="font-size:1.2rem;font-weight:900;color:${speedCol};margin-bottom:6px">${speedLbl}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        ${[
          {lbl:'TTFB',v:d.ttfb,suf:'ms',good:200,bad:600},
          {lbl:'DOM Ready',v:d.domContentLoaded,suf:'ms',good:1500,bad:3000},
          {lbl:'Full Load',v:d.loadTime,suf:'ms',good:3000,bad:6000},
        ].map(m=>{
          const cls=m.v==null?'neutral':m.v<=m.good?'ok':m.v<=m.bad?'warn':'error';
          const col={ok:'#166534',warn:'#b45309',error:'#c62828',neutral:'#6b7280'};
          const bg={ok:'#f0fdf4',warn:'#fffbeb',error:'#fff5f5',neutral:'#f1f5f9'};
          return `<div style="background:${bg[cls]};border-radius:8px;padding:8px;text-align:center">
            <div style="font-size:0.58rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.4px">${m.lbl}</div>
            <div style="font-size:1.1rem;font-weight:900;color:${col[cls]}">${m.v!=null?m.v+m.suf:'N/A'}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>

  <table>
    <thead><tr><th>Performance Metric</th><th>Value</th><th>Target</th><th>Status</th><th>SEO Impact</th></tr></thead>
    <tbody>
      ${[
        {m:'TTFB (Time to First Byte)',v:d.ttfb!=null?d.ttfb+'ms':'N/A',cls:d.ttfb==null?'neutral':d.ttfb<200?'ok':d.ttfb<600?'warn':'error',tgt:'< 200ms',imp:'⭐⭐⭐ Server speed, Core Web Vital'},
        {m:'DOM Content Loaded',v:d.domContentLoaded!=null?d.domContentLoaded+'ms':'N/A',cls:d.domContentLoaded==null?'neutral':d.domContentLoaded<1500?'ok':d.domContentLoaded<3000?'warn':'error',tgt:'< 1 500ms',imp:'⭐⭐⭐ Interactivity'},
        {m:'Full Page Load Time',v:d.loadTime!=null?d.loadTime+'ms':'N/A',cls:d.loadTime==null?'neutral':d.loadTime<3000?'ok':d.loadTime<6000?'warn':'error',tgt:'< 3 000ms',imp:'⭐⭐⭐ User experience & bounce rate'},
        {m:'JavaScript Files',v:d.scriptCount!=null?d.scriptCount:0,cls:d.scriptCount<20?'ok':d.scriptCount<40?'warn':'error',tgt:'< 20',imp:'⭐⭐ Parse & execute overhead'},
        {m:'CSS Stylesheets',v:d.styleCount!=null?d.styleCount:0,cls:d.styleCount<5?'ok':d.styleCount<10?'warn':'error',tgt:'< 5',imp:'⭐⭐ Render-blocking potential'},
        {m:'Total Images',v:d.images.length,cls:'neutral',tgt:'Optimise each',imp:'⭐⭐⭐ Affects LCP (Largest Contentful Paint)'},
        {m:'Lazy Loaded Images',v:d.imagesLazy,cls:d.imagesLazy>0||d.images.length<=3?'ok':'warn',tgt:'All non-hero images',imp:'⭐⭐ Reduces initial page weight'},
        {m:'Images Missing Alt Text',v:d.imagesMissing,cls:d.imagesMissing===0?'ok':'warn',tgt:'0 missing',imp:'⭐⭐ Accessibility + image SEO'},
      ].map(r=>{
        const ico={ok:'✅',warn:'⚠️',error:'❌',neutral:'ℹ️'};
        return `<tr class="row-${r.cls}"><td style="font-weight:600">${r.m}</td><td class="${r.cls}" style="font-family:monospace;font-weight:800">${r.v}</td><td style="color:#6b7280;font-size:0.78rem">${r.tgt}</td><td style="text-align:center;font-size:1rem">${ico[r.cls]}</td><td style="font-size:0.75rem;color:#6b7280">${r.imp}</td></tr>`;
      }).join('')}
    </tbody>
  </table>

  <!-- Core Web Vitals cards -->
  <div style="margin-top:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
    ${[
      {lbl:'LCP',full:'Largest Contentful Paint',est:d.loadTime!=null?'~'+d.loadTime+'ms':'Run PSI',tgt:'< 2 500ms',cls:d.loadTime!=null?d.loadTime<2500?'ok':d.loadTime<4000?'warn':'error':'neutral'},
      {lbl:'FID / INP',full:'Interaction to Next Paint',est:'Browser only',tgt:'< 200ms',cls:'neutral'},
      {lbl:'CLS',full:'Cumulative Layout Shift',est:'Run PageSpeed Insights',tgt:'< 0.1',cls:'neutral'},
      {lbl:'FCP',full:'First Contentful Paint',est:d.domContentLoaded!=null?'~'+d.domContentLoaded+'ms':'Run PSI',tgt:'< 1 800ms',cls:d.domContentLoaded!=null?d.domContentLoaded<1800?'ok':d.domContentLoaded<3000?'warn':'error':'neutral'},
      {lbl:'TTFB',full:'Time to First Byte',est:d.ttfb!=null?d.ttfb+'ms':'N/A',tgt:'< 200ms',cls:d.ttfb!=null?d.ttfb<200?'ok':d.ttfb<600?'warn':'error':'neutral'},
      {lbl:'DOM Ready',full:'DOMContentLoaded',est:d.domContentLoaded!=null?d.domContentLoaded+'ms':'N/A',tgt:'< 1 500ms',cls:d.domContentLoaded!=null?d.domContentLoaded<1500?'ok':d.domContentLoaded<3000?'warn':'error':'neutral'},
    ].map(c=>{
      const bg={ok:'#f0fdf4',warn:'#fffbeb',error:'#fff5f5',neutral:'#f8faff'};
      const brd={ok:'#86efac',warn:'#fde68a',error:'#fca5a5',neutral:'#c7d2fe'};
      const hcol={ok:'#166534',warn:'#b45309',error:'#c62828',neutral:'#2B5BCD'};
      return `<div style="background:${bg[c.cls]};border:2px solid ${brd[c.cls]};border-top:4px solid ${brd[c.cls]};border-radius:12px;padding:14px;text-align:center">
        <div style="font-family:monospace;font-size:0.82rem;font-weight:900;color:${hcol[c.cls]};margin-bottom:2px">${c.lbl}</div>
        <div style="font-size:1.1rem;font-weight:900;color:${hcol[c.cls]};margin:6px 0">${c.est}</div>
        <div style="font-size:0.6rem;color:#9ca3af;margin-bottom:3px">Target: ${c.tgt}</div>
        <div style="font-size:0.68rem;color:#6b7280">${c.full}</div>
      </div>`;
    }).join('')}
  </div>

  <div style="margin-top:14px;display:flex;gap:10px">
    <a href="https://pagespeed.web.dev/report?url=${encodeURIComponent('https://'+d.host)}" target="_blank"
      style="flex:1;background:linear-gradient(90deg,#2B5BCD,#1e3a8a);color:#fff;padding:12px;border-radius:10px;text-align:center;font-weight:800;font-size:0.82rem;text-decoration:none">
      ⚡ Open in PageSpeed Insights →
    </a>
    <a href="https://gtmetrix.com/?url=${encodeURIComponent('https://'+d.host)}" target="_blank"
      style="flex:1;background:#fff;color:#2B5BCD;border:2px solid #2B5BCD;padding:12px;border-radius:10px;text-align:center;font-weight:800;font-size:0.82rem;text-decoration:none">
      🚀 Test on GTmetrix →
    </a>
  </div>
</div>

<!-- ════════════════════
     SECTION 7: LINKS
════════════════════ -->
<div class="section">
  ${secHead('🔗','Links Analysis','Internal linking structure, external links and anchor text audit')}

  <!-- summary tiles -->
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px">
    ${[
      {n:d.links.length,lbl:'Total Links',icon:'🔗',bg:'#eff4ff',brd:'#c7d2fe',col:'#2B5BCD'},
      {n:d.internalLinks.length,lbl:'Internal',icon:'🏠',bg:'#f0fdf4',brd:'#86efac',col:'#166534'},
      {n:d.externalLinks.length,lbl:'External',icon:'🌐',bg:'#f5f3ff',brd:'#ddd6fe',col:'#5b21b6'},
      {n:d.nofollowLinks.length,lbl:'Nofollow',icon:'🚫',bg:d.nofollowLinks.length>0?'#fffbeb':'#f0fdf4',brd:d.nofollowLinks.length>0?'#fde68a':'#86efac',col:d.nofollowLinks.length>0?'#b45309':'#166534'},
      {n:d.internalLinks.filter(l=>!l.text||l.text.trim().length<2).length,lbl:'No Anchor',icon:'⚠️',bg:'#fffbeb',brd:'#fde68a',col:'#b45309'},
    ].map(s=>`
    <div style="background:${s.bg};border:2px solid ${s.brd};border-radius:12px;padding:14px 10px;text-align:center">
      <div style="font-size:1.3rem;margin-bottom:4px">${s.icon}</div>
      <div style="font-size:1.5rem;font-weight:900;color:${s.col};line-height:1">${s.n}</div>
      <div style="font-size:0.6rem;font-weight:700;text-transform:uppercase;color:${s.col};opacity:.7;letter-spacing:.4px;margin-top:3px">${s.lbl}</div>
    </div>`).join('')}
  </div>

  ${d.internalLinks.length>0?`
  <div style="margin-bottom:8px;font-size:0.78rem;font-weight:800;color:#2B5BCD;border-bottom:2px solid #FEB622;padding-bottom:6px;display:inline-block">Internal Links (${Math.min(d.internalLinks.length,20)} of ${d.internalLinks.length})</div>
  <table style="margin-bottom:16px">
    <thead><tr><th>#</th><th>Anchor Text</th><th>URL Path</th><th>Rel</th></tr></thead>
    <tbody>
      ${d.internalLinks.slice(0,20).map((l,i)=>{
        let path='';try{path=new URL(l.href).pathname;}catch(e){path=l.href;}
        const noAnchor=!l.text||l.text.trim().length<2;
        return `<tr>
          <td style="color:#9ca3af;width:30px">${i+1}</td>
          <td style="${noAnchor?'color:#9ca3af;font-style:italic':'font-weight:600;color:#111827'}">${noAnchor?'(no anchor text)':esc(l.text.slice(0,60))}</td>
          <td class="mono" style="font-size:0.78rem;color:#2B5BCD"><a href="${esc(l.href)}" target="_blank" style="color:#2B5BCD">${esc(path.slice(0,55)+(path.length>55?'…':''))}</a></td>
          <td>${l.nofollow?statusChip('warn','nofollow'):statusChip('ok','dofollow')}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`:''}

  ${d.externalLinks.length>0?`
  <div style="margin-bottom:8px;font-size:0.78rem;font-weight:800;color:#2B5BCD;border-bottom:2px solid #FEB622;padding-bottom:6px;display:inline-block">External Links (${Math.min(d.externalLinks.length,15)} of ${d.externalLinks.length})</div>
  <table>
    <thead><tr><th>#</th><th>Anchor Text</th><th>Destination</th><th>Type</th></tr></thead>
    <tbody>
      ${d.externalLinks.slice(0,15).map((l,i)=>`
      <tr>
        <td style="color:#9ca3af;width:30px">${i+1}</td>
        <td style="font-weight:600">${esc((l.text||'no anchor').slice(0,50))}</td>
        <td class="mono" style="font-size:0.76rem;color:#2B5BCD"><a href="${esc(l.href)}" target="_blank" style="color:#2B5BCD">${esc(l.href.slice(0,60)+(l.href.length>60?'…':''))}</a></td>
        <td>${l.nofollow?statusChip('warn','nofollow'):statusChip('ok','dofollow')}</td>
      </tr>`).join('')}
    </tbody>
  </table>`:''}
</div>

<!-- ════════════════════
     SECTION 8: IMAGES
════════════════════ -->
<div class="section">
  ${secHead('🖼️','Images Audit','Alt text, lazy loading and filename optimisation')}

  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
    ${[
      {n:d.images.length,lbl:'Total Images',bg:'#eff4ff',brd:'#c7d2fe',col:'#2B5BCD'},
      {n:d.imagesWithAlt,lbl:'Have Alt Text',bg:'#f0fdf4',brd:'#86efac',col:'#166534'},
      {n:d.imagesMissing,lbl:'Missing Alt',bg:d.imagesMissing>0?'#fff5f5':'#f0fdf4',brd:d.imagesMissing>0?'#fca5a5':'#86efac',col:d.imagesMissing>0?'#c62828':'#166534'},
      {n:d.imagesLazy,lbl:'Lazy Loaded',bg:d.imagesLazy>0?'#f0fdf4':'#fffbeb',brd:d.imagesLazy>0?'#86efac':'#fde68a',col:d.imagesLazy>0?'#166534':'#b45309'},
    ].map(s=>`
    <div style="background:${s.bg};border:2px solid ${s.brd};border-radius:12px;padding:14px;text-align:center">
      <div style="font-size:1.6rem;font-weight:900;color:${s.col}">${s.n}</div>
      <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;color:${s.col};opacity:.7;letter-spacing:.4px;margin-top:3px">${s.lbl}</div>
    </div>`).join('')}
  </div>

  ${d.images.length>0?`
  <table>
    <thead><tr><th>#</th><th>File Name</th><th>Alt Text</th><th>Load</th><th>srcset</th><th>Status</th></tr></thead>
    <tbody>
      ${d.images.slice(0,20).map((img,i)=>{
        const hasAlt=img.hasAlt&&!img.altEmpty;
        const file=(img.src||'').split('/').pop().split('?')[0].slice(0,38)||'unknown';
        return `<tr class="${hasAlt?'row-ok':'row-error'}">
          <td style="color:#9ca3af;width:30px">${i+1}</td>
          <td class="mono" style="font-size:0.75rem">${esc(file)}</td>
          <td style="${hasAlt?'':'color:#b91c1c;font-weight:700;font-style:italic'}">${hasAlt?esc((img.alt||'').slice(0,55)):'❌ Missing alt text'}</td>
          <td style="font-size:0.75rem">${img.loading==='lazy'?'<span style="color:#3B5DD4;font-weight:700">⚡ lazy</span>':'<span style="color:#9ca3af">eager</span>'}</td>
          <td style="font-size:0.75rem">${img.srcset?'<span style="color:#15803d;font-weight:700">✓</span>':'<span style="color:#9ca3af">—</span>'}</td>
          <td>${hasAlt?statusChip('ok','✅ OK'):statusChip('error','❌ Fix')}</td>
        </tr>`;
      }).join('')}
      ${d.images.length>20?`<tr><td colspan="6" style="text-align:center;color:#9ca3af;font-style:italic">… and ${d.images.length-20} more images</td></tr>`:''}
    </tbody>
  </table>`:'<div style="text-align:center;padding:24px;color:#9ca3af">No images found on this page</div>'}
</div>

<!-- ═══════════════════════════
     SECTION 9: KEYWORD DENSITY
═══════════════════════════ -->
${kd.length>0?`
<div class="section">
  ${secHead('🔑','Keyword Density Analysis',`Extracted from ${d.wordCount.toLocaleString()} words of page content`)}

  <div style="background:#fff;border:2px solid #3B5DD4;border-radius:12px;padding:14px 18px;margin-bottom:16px;font-size:0.78rem;color:#374151;line-height:1.7">
    <strong style="color:#2B5BCD">📊 How to read this table:</strong>
    Density <span style="color:#166534;font-weight:700">1–3%</span> = ideal for your primary keywords.
    <span style="color:#b45309;font-weight:700">3–4%</span> = borderline — monitor carefully.
    <span style="color:#c62828;font-weight:700">&gt; 4%</span> = potential keyword stuffing — reduce usage.
  </div>

  <table>
    <thead><tr><th style="width:30px">#</th><th>Keyword</th><th>Count</th><th>Density</th><th style="width:180px">Distribution</th><th>Verdict</th><th>Recommendation</th></tr></thead>
    <tbody>
      ${kd.slice(0,15).map((k,i)=>{
        const pct=Math.min(100,(k.count/kd[0].count)*100);
        const d2=parseFloat(k.density);
        const cls=d2>4?'error':d2>2?'warn':'ok';
        const verdict=d2>4?'⚠️ Over-used':d2>1.5?'✅ Ideal':d2>0.5?'ℹ️ OK':'💡 Low';
        const rec=d2>4?'Reduce — spread synonyms throughout content':d2>1.5?'Perfect keyword frequency':d2>0.5?'Acceptable — could add more uses':'Consider using this keyword more';
        const barCol=d2>4?'#ef4444':d2>2?'#FEB622':'#2B5BCD';
        return `<tr>
          <td style="color:#9ca3af;font-weight:700">${i+1}</td>
          <td style="font-weight:900;color:#2B5BCD;font-size:0.92rem">${esc(k.word)}</td>
          <td class="mono" style="font-weight:700">${k.count}×</td>
          <td class="${cls}" style="font-family:monospace;font-size:0.9rem;font-weight:900">${k.density}%</td>
          <td><div style="background:#e8eaf6;border-radius:5px;height:12px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${barCol};border-radius:5px"></div>
          </div></td>
          <td style="font-size:0.82rem">${verdict}</td>
          <td style="font-size:0.72rem;color:#6b7280">${rec}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>`:''}

<!-- ══════════════════════════════
     SECTION 10: STRUCTURED DATA
══════════════════════════════ -->
<div class="section">
  ${secHead('📊','Structured Data (Schema Markup)','JSON-LD rich snippets that help Google understand your content')}

  ${d.structuredData.length>0?`
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
    ${d.structuredData.map(s=>`<span style="background:#f0fdf4;border:2px solid #86efac;color:#166534;font-weight:800;padding:6px 16px;border-radius:20px;font-size:0.8rem">✅ @type: ${esc(s['@type']||'Unknown')}</span>`).join('')}
  </div>
  <table>
    <thead><tr><th>Schema Type</th><th>Properties Found</th><th>Context</th><th>Status</th></tr></thead>
    <tbody>
      ${d.structuredData.map(s=>`<tr>
        <td style="font-weight:800;color:#2B5BCD">${esc(s['@type']||'Unknown')}</td>
        <td style="font-size:0.78rem;color:#374151">${Object.keys(s).filter(k=>k!=='@context'&&k!=='@type').slice(0,6).map(k=>`<code style="background:#e8eaf6;padding:1px 5px;border-radius:4px;font-size:0.7rem">${esc(k)}</code>`).join(' ')}</td>
        <td class="mono" style="font-size:0.72rem;color:#9ca3af">${esc(s['@context']||'—')}</td>
        <td>${statusChip('ok','✅ Valid JSON-LD')}</td>
      </tr>`).join('')}
    </tbody>
  </table>`
  : `<div style="background:#fffbeb;border:2px solid #fde68a;border-radius:14px;padding:20px 22px;display:flex;gap:16px;align-items:flex-start">
      <span style="font-size:1.5rem;flex-shrink:0">⚠️</span>
      <div>
        <div style="font-weight:800;color:#b45309;font-size:0.95rem;margin-bottom:6px">No Structured Data Found</div>
        <div style="font-size:0.82rem;color:#78350f;line-height:1.7">
          Adding JSON-LD schema markup helps Google show rich results (stars, FAQs, breadcrumbs) for your pages.
          <strong>Recommended schemas for this site:</strong><br/>
          <code style="background:#fef9c3;padding:2px 6px;border-radius:4px;font-size:0.75rem">Organization</code>
          <code style="background:#fef9c3;padding:2px 6px;border-radius:4px;font-size:0.75rem">WebPage</code>
          <code style="background:#fef9c3;padding:2px 6px;border-radius:4px;font-size:0.75rem">BreadcrumbList</code>
          <code style="background:#fef9c3;padding:2px 6px;border-radius:4px;font-size:0.75rem">Article</code>
          <code style="background:#fef9c3;padding:2px 6px;border-radius:4px;font-size:0.75rem">FAQPage</code>
        </div>
      </div>
    </div>`}
</div>

<!-- ══════════════════════════
     SECTION 11: TECHNICAL SEO
══════════════════════════ -->
<div class="section">
  ${secHead('🔧','Technical SEO Health Check',`Tech health score: ${techH} — complete server &amp; code audit`)}

  <!-- tech health mini-bar -->
  <div style="background:#fff;border:2px solid #3B5DD4;border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:20px">
    <div style="position:relative;width:80px;height:80px;flex-shrink:0">
      ${ring(techNum,100,techNum>=80?'#2B5BCD':techNum>=60?'#FEB622':'#ef4444',80)}
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <div style="font-size:1.1rem;font-weight:900;color:${techNum>=80?'#2B5BCD':techNum>=60?'#FEB622':'#ef4444'}">${techH}</div>
      </div>
    </div>
    <div style="flex:1">
      <div style="font-size:0.9rem;font-weight:900;color:${techNum>=80?'#2B5BCD':techNum>=60?'#b45309':'#c62828'};margin-bottom:4px">
        Technical Health: ${techNum>=80?'Excellent':techNum>=60?'Good':techNum>=40?'Needs Work':'Poor'}
      </div>
      <div style="font-size:0.75rem;color:#6b7280">Based on HTTPS, canonical, viewport, indexability, schema, charset, favicon &amp; doctype</div>
    </div>
  </div>

  <table>
    <thead><tr><th>Technical Check</th><th>Value Detected</th><th>Status</th><th>Priority</th><th>What to Do</th></tr></thead>
    <tbody>
      ${[
        {c:'HTTPS / SSL Certificate',v:d.isHttps?'🔒 Secure':'⚠ Not Secure',cls:d.isHttps?'ok':'error',pri:d.isHttps?'—':'🔴 Critical',tip:d.isHttps?'SSL is active — good':'Install SSL immediately. HTTPS is a Google ranking factor'},
        {c:'Canonical URL',v:d.canonical||'Not set',cls:d.canonical?'ok':'warn',pri:d.canonical?'—':'🟡 Medium',tip:d.canonical?'Prevents duplicate content':'Add <link rel="canonical" href="https://'+d.host+d.url.replace(/^https?:\/\/[^/]+/,'')+'"/>'},
        {c:'Robots / Indexability',v:d.robots||'index, follow (default)',cls:d.isNoindex?'error':'ok',pri:d.isNoindex?'🔴 Critical':'—',tip:d.isNoindex?'REMOVE noindex immediately — page is invisible to Google':'Page is indexable — no action needed'},
        {c:'Noindex Directive',v:d.isNoindex?'YES — BLOCKED':'No — Visible',cls:d.isNoindex?'error':'ok',pri:d.isNoindex?'🔴 Critical':'—',tip:d.isNoindex?'Find and remove noindex from meta robots or X-Robots header':'✓ Page will appear in search results'},
        {c:'Mobile Viewport',v:d.viewport?'✓ '+d.viewport.slice(0,40):'MISSING',cls:d.viewport?'ok':'error',pri:d.viewport?'—':'🔴 Critical',tip:d.viewport?'Good — mobile-friendly viewport declared':'Add <meta name="viewport" content="width=device-width, initial-scale=1">'},
        {c:'HTML Language (lang=)',v:d.lang||'Not declared',cls:d.lang?'ok':'warn',pri:d.lang?'—':'🟡 Medium',tip:d.lang?'Language declared — helps search engines target correct region':'Add lang="en" (or your language code) to the <html> opening tag'},
        {c:'HTML Doctype',v:d.doctype||'Missing',cls:d.doctype==='HTML'?'ok':'warn',pri:'—',tip:'HTML5 doctype ensures correct browser rendering'},
        {c:'Character Encoding (charset)',v:d.charset||'Not declared',cls:d.charset?'ok':'warn',pri:d.charset?'—':'🟢 Low',tip:d.charset?'Charset declared — prevents encoding issues':'Add <meta charset="UTF-8"> to prevent garbled text'},
        {c:'Favicon',v:d.favicon?'✓ Present':' Missing',cls:d.favicon?'ok':'warn',pri:d.favicon?'—':'🟢 Low',tip:d.favicon?'Brand favicon detected':'Add <link rel="icon" href="/favicon.ico"/> for professional branding'},
        {c:'Open Graph (Social)',v:Object.keys(d.openGraph).length+' tags found',cls:Object.keys(d.openGraph).length>=4?'ok':Object.keys(d.openGraph).length>0?'warn':'error',pri:Object.keys(d.openGraph).length>=4?'—':Object.keys(d.openGraph).length>0?'🟡 Medium':'🟡 Medium',tip:Object.keys(d.openGraph).length>=4?'Good OG coverage':'Add og:title, og:description, og:image and og:url'},
        {c:'OG Image',v:d.openGraph['og:image']?'✓ Set':'Missing',cls:d.openGraph['og:image']?'ok':'warn',pri:d.openGraph['og:image']?'—':'🟡 Medium',tip:d.openGraph['og:image']?'Social image set':'Add a 1200×630px og:image meta tag'},
        {c:'Twitter / X Card',v:d.twitter['twitter:card']||'Not set',cls:d.twitter['twitter:card']?'ok':'warn',pri:d.twitter['twitter:card']?'—':'🟢 Low',tip:d.twitter['twitter:card']?'Twitter card active':'Add twitter:card="summary_large_image" for rich tweet previews'},
        {c:'JSON-LD Schema',v:d.structuredData.length>0?d.structuredData.map(s=>s['@type']||'?').join(', '):'None',cls:d.structuredData.length>0?'ok':'warn',pri:d.structuredData.length>0?'—':'🟡 Medium',tip:d.structuredData.length>0?'Structured data active — eligible for rich results':'Add JSON-LD schema to unlock rich snippets in Google'},
        {c:'Hreflang Tags',v:d.hreflangs&&d.hreflangs.length>0?d.hreflangs.length+' found':'None',cls:d.hreflangs&&d.hreflangs.length>0?'ok':'neutral',pri:'—',tip:d.hreflangs&&d.hreflangs.length>0?'International targeting configured':'Add hreflang only if targeting multiple languages/regions'},
      ].map(r=>{
        const ico={ok:'✅',warn:'⚠️',error:'❌',neutral:'ℹ️'};
        return `<tr class="row-${r.cls}">
          <td style="font-weight:700">${r.c}</td>
          <td class="mono" style="font-size:0.78rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.v)}">${esc(String(r.v).slice(0,50))}</td>
          <td style="text-align:center;font-size:1.1rem">${ico[r.cls]}</td>
          <td style="font-size:0.75rem">${r.pri}</td>
          <td style="font-size:0.73rem;color:#6b7280;line-height:1.5">${r.tip}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>

<!-- ════════════════════════════
     SECTION 12: CONTENT SUMMARY
════════════════════════════ -->
<div class="section">
  ${secHead('📁','Site Content Summary','Pages, blog posts and content signals detected')}

  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
    ${[
      {n:d.estimatedPages||0,lbl:'Estimated Pages',icon:'📄',desc:'Non-blog internal links detected',bg:'#eff4ff',brd:'#c7d2fe',col:'#2B5BCD'},
      {n:d.estimatedBlogPosts||0,lbl:'Blog / Posts',icon:'✍️',desc:'URLs matching /blog/ /post/ patterns',bg:'#fffbeb',brd:'#fde68a',col:'#b45309'},
      {n:d.wordCount,lbl:'Word Count',icon:'📖',desc:d.wordCount>=1000?'Long-form — great for SEO':d.wordCount>=300?'Standard length':'Too short — add more content',bg:d.wordCount>=300?'#f0fdf4':'#fffbeb',brd:d.wordCount>=300?'#86efac':'#fde68a',col:d.wordCount>=300?'#166534':'#b45309'},
      {n:d.internalLinks.length,lbl:'Internal Links',icon:'🔗',desc:'PageRank flows through these',bg:'#f0fdf4',brd:'#86efac',col:'#166534'},
      {n:d.externalLinks.length,lbl:'External Links',icon:'🌐',desc:'Links pointing away from site',bg:'#f5f3ff',brd:'#ddd6fe',col:'#5b21b6'},
      {n:d.nofollowLinks.length,lbl:'Nofollow Links',icon:'🚫',desc:'PageRank not transferred',bg:d.nofollowLinks.length>5?'#fffbeb':'#f8faff',brd:d.nofollowLinks.length>5?'#fde68a':'#c7d2fe',col:d.nofollowLinks.length>5?'#b45309':'#2B5BCD'},
    ].map(s=>`
    <div style="background:${s.bg};border:2px solid ${s.brd};border-radius:12px;padding:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:1.2rem">${s.icon}</span>
        <span style="font-size:0.62rem;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:${s.col}">${s.lbl}</span>
      </div>
      <div style="font-size:1.8rem;font-weight:900;color:${s.col};line-height:1">${s.n.toLocaleString()}</div>
      <div style="font-size:0.72rem;color:#6b7280;margin-top:4px">${s.desc}</div>
    </div>`).join('')}
  </div>
</div>

<!-- ══════════════════════════
     SECTION 13: ACTION PLAN
══════════════════════════ -->
<div class="section">
  ${secHead('🚀','Prioritised Action Plan','Step-by-step roadmap to improve your SEO score')}

  ${[
    ...errors.map((e,i)=>({rank:i+1,pri:'🔴',level:'CRITICAL',bg:'#fff5f5',brd:'#fca5a5',hcol:'#c62828',text:e.text,tip:getFixTip(e.text)})),
    ...warns.map((w,i)=>({rank:errors.length+i+1,pri:'🟡',level:'MEDIUM',bg:'#fffbeb',brd:'#fde68a',hcol:'#b45309',text:w.text,tip:getFixTip(w.text)})),
    ...(errors.length+warns.length===0?[
      {rank:1,pri:'🟢',level:'OPTIMISE',bg:'#f0fdf4',brd:'#86efac',hcol:'#166534',text:'Add more internal links to key pages',tip:'Internal linking distributes PageRank and helps Google discover your content'},
      {rank:2,pri:'🟢',level:'OPTIMISE',bg:'#f0fdf4',brd:'#86efac',hcol:'#166534',text:'Expand content to 1 500+ words for competitive topics',tip:'Longer, comprehensive content typically outranks shorter thin content'},
      {rank:3,pri:'🟢',level:'OPTIMISE',bg:'#f0fdf4',brd:'#86efac',hcol:'#166534',text:'Add FAQ schema markup for featured snippet opportunities',tip:'FAQPage JSON-LD can unlock accordion-style rich results in Google'},
    ]:[]),
  ].slice(0,15).map(item=>`
  <div style="background:${item.bg};border:2px solid ${item.brd};border-radius:12px;padding:16px 18px;margin-bottom:10px;display:flex;gap:14px;align-items:flex-start">
    <div style="width:36px;height:36px;background:linear-gradient(135deg,#2B5BCD,#1e3a8a);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.82rem;font-weight:900;flex-shrink:0;box-shadow:0 2px 8px rgba(43,91,205,0.3)">${item.rank}</div>
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap">
        <span style="font-size:1rem">${item.pri}</span>
        <span style="font-weight:800;color:#111827;font-size:0.9rem">${esc(item.text)}</span>
        <span style="background:${item.bg};color:${item.hcol};border:1.5px solid ${item.brd};font-size:0.6rem;font-weight:800;padding:2px 9px;border-radius:20px">${item.level}</span>
      </div>
      <div style="font-size:0.78rem;color:#374151;line-height:1.6;padding-left:2px">
        <strong style="color:${item.hcol}">💡 How to fix:</strong> ${esc(item.tip)}
      </div>
    </div>
  </div>`).join('')}
</div>

<!-- ═════════════
     FOOTER
═════════════ -->
<!-- ══════ FOOTER — WHITE THEME ══════ -->
<div style="background:#fff;border-top:4px solid #3B5DD4">
  <!-- orange + blue accent stripe -->
  <div style="height:4px;background:linear-gradient(90deg,#3B5DD4,#F97316,#FEB622,#F97316,#3B5DD4)"></div>

  <div style="padding:30px 44px;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap">

    <!-- Logo + brand -->
    <div style="display:flex;align-items:center;gap:18px">
      <img src="https://7thclub.com/wp-content/uploads/2025/02/Logo.png"
        style="height:56px;object-fit:contain"
        alt="7th Club"
        onerror="this.outerHTML='<span style=font-size:1.6rem;font-weight:900;color:#3B5DD4;letter-spacing:1px>7THCLUB</span>'"/>
      <div style="border-left:2px solid #dbeafe;padding-left:16px">
        <div style="font-size:0.78rem;font-weight:800;color:#1e3a8a;text-transform:uppercase;letter-spacing:1.5px">SEO Analyzer Pro</div>
        <div style="font-size:0.68rem;color:#6b7280;margin-top:3px">Powered by 7th Club</div>
        <a href="https://7thclub.com" target="_blank"
          style="display:inline-flex;align-items:center;gap:5px;background:#F97316;color:#fff;font-size:0.68rem;font-weight:800;padding:5px 12px;border-radius:6px;text-decoration:none;margin-top:8px">
          🏆 Visit 7thclub.com
        </a>
      </div>
    </div>

    <!-- Score box -->
    <div style="background:#fff;border:2px solid #3B5DD4;border-radius:14px;padding:16px 28px;text-align:center;box-shadow:0 4px 16px rgba(59,93,212,0.1)">
      <div style="font-size:0.6rem;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Overall SEO Score</div>
      <div style="font-size:2.6rem;font-weight:900;color:${scoreCol};line-height:1">${score}</div>
      <div style="font-size:0.6rem;color:#9ca3af">out of 100</div>
      <div style="font-size:0.82rem;font-weight:800;color:${scoreCol};margin-top:5px">${scoreLbl}</div>
    </div>

    <!-- Date + URL -->
    <div style="text-align:right">
      <div style="background:#f0f4ff;border:2px solid #3B5DD4;border-radius:10px;padding:10px 18px;margin-bottom:10px;display:inline-block">
        <div style="font-size:0.6rem;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px">Report Generated</div>
        <div style="font-size:0.95rem;font-weight:900;color:#1e3a8a;margin-top:2px">${now}</div>
        <div style="font-size:0.72rem;font-weight:700;color:#3B5DD4;margin-top:1px">${nowTime}</div>
      </div>
      <div style="font-size:0.7rem;color:#6b7280;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right">
        <a href="${esc(d.url||'#')}" target="_blank" style="color:#3B5DD4;font-weight:600">${esc(d.url||'')}</a>
      </div>
      <div style="font-size:0.6rem;color:#9ca3af;margin-top:5px">Report by 7th Club SEO Analyzer Pro</div>
    </div>

  </div>
</div>

</div><!-- .page -->
</body>
</html>`;

  const blob=new Blob([html],{type:'text/html;charset=utf-8;'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='7thclub-audit-'+( d.host||'site')+'.html';
  a.click();
}

/* ─── TOOL URLs ─── */
function injectToolUrls(host){
  const enc=encodeURIComponent(host),raw=host;
  const tools={'tool-ahrefs-site':'https://ahrefs.com/site-explorer/overview/v2/subdomains/live?target='+raw,'tool-ahrefs-kw':'https://ahrefs.com/keywords-explorer/google/global?input='+enc,'tool-moz':'https://moz.com/link-explorer/overview?site='+raw,'tool-majestic':'https://majestic.com/reports/site-explorer?oq='+raw,'tool-semrush':'https://www.semrush.com/analytics/overview/?target='+raw+'&searchType=domain','tool-similarweb':'https://www.similarweb.com/website/'+raw+'/','tool-ubersuggest':'https://app.neilpatel.com/en/ubersuggest/?locator=domain_overview&domain='+raw,'tool-serpstat':'https://serpstat.com/en/links/report/'+raw+'/?se=g_us','tool-pagespeed':'https://pagespeed.web.dev/report?url=https%3A%2F%2F'+enc,'tool-gtmetrix':'https://gtmetrix.com/?url=https%3A%2F%2F'+raw,'tool-schemaval':'https://search.google.com/test/rich-results?url=https%3A%2F%2F'+enc,'tool-siteliner':'https://www.siteliner.com/link?_=https://'+raw,'tool-copyscape':'https://www.copyscape.com/?q=https://'+raw};
  Object.entries(tools).forEach(function([id,href]){const el=document.getElementById(id);if(el)el.href=href;});
}

/* ─── MAIN ANALYZE ─── */
window.analyze=async function(){
  $('loadingScreen').style.display='';
  $('errorScreen').classList.add('hidden');
  document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));
  $('scoreNum').textContent='--'; $('scoreNum').style.color='';
  $('scProg').style.strokeDashoffset='207.3';
  $('issuesBanner').classList.add('hidden');
  $('fixesBlock').classList.add('hidden');
  _seoData=null;
  // Reset Dev Tech so it re-runs on next visit
  _devtechDone=false;
  ['cms','plugins','stack','hosting'].forEach(function(s){
    const ld=$('dt-'+s+'-loading'), ct=$('dt-'+s+'-content');
    if(ld){ld.style.display='';} if(ct){ct.innerHTML='';ct.classList.add('hidden');}
  });
  if($('saTotalPages'))$('saTotalPages').textContent='—';
  if($('saBlogPosts'))$('saBlogPosts').textContent='—';
  if($('saExtLinks'))$('saExtLinks').textContent='—';
  if($('saTechScore'))$('saTechScore').textContent='—';

  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab)throw new Error('No active tab');

    try{
      const url=new URL(tab.url);
      $('urlProto').textContent=url.protocol.replace(':','');
      $('urlHost').textContent=url.hostname;
      $('urlPath').textContent=url.pathname.length>30?url.pathname.substring(0,30)+'…':url.pathname;
      $('urlProto').style.color=url.protocol==='https:'?'#2B5BCD':'#ef4444';
      $('httpsBadge').textContent=url.protocol==='https:'?'🔒':'⚠️';
    }catch(e){$('urlHost').textContent=tab.url||'';}

    let result;
    try{
      [result]=await chrome.scripting.executeScript({
        target:{tabId:tab.id},
        func:()=>{
          const d={};
          const metas={};
          document.querySelectorAll('meta').forEach(m=>{const n=m.getAttribute('name')||m.getAttribute('property')||m.getAttribute('http-equiv');const c=m.getAttribute('content');if(n&&c!==null)metas[n.toLowerCase()]=c;});
          d.url=location.href; d.host=location.hostname; d.isHttps=location.protocol==='https:';
          d.metas=metas; d.titleTag=document.querySelector('title')?.textContent?.trim()||'';
          d.description=metas['description']||''; d.keywords=metas['keywords']||'';
          d.robots=metas['robots']||metas['googlebot']||''; d.viewport=metas['viewport']||'';
          d.author=metas['author']||''; d.canonical=document.querySelector('link[rel="canonical"]')?.href||'';
          d.lang=document.documentElement.lang||''; d.charset=document.characterSet||'';
          d.doctype=document.doctype?.name?.toUpperCase()||'Missing';
          d.favicon=document.querySelector('link[rel~="icon"]')?.href||'';
          const og={},tw={};
          Object.entries(metas).forEach(([k,v])=>{if(k.startsWith('og:'))og[k]=v;if(k.startsWith('twitter:'))tw[k]=v;});
          d.openGraph=og; d.twitter=tw;
          const headings=[];
          document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h=>headings.push({level:+h.tagName[1],text:h.textContent.trim().slice(0,150)}));
          d.headings=headings; d.h1Count=headings.filter(h=>h.level===1).length;
          const origin=location.origin;
          const links=[];
          document.querySelectorAll('a[href]').forEach(a=>{
            const href=a.href||'';
            if(!href||href.startsWith('javascript:')||href.startsWith('mailto:')||href.startsWith('tel:'))return;
            const rel=a.getAttribute('rel')||'';
            const isExternal=href.startsWith('http')&&!href.startsWith(origin);
            links.push({href,text:a.textContent.trim().slice(0,80),rel,isExternal,nofollow:rel.includes('nofollow'),sponsored:rel.includes('sponsored'),ugc:rel.includes('ugc'),newTab:a.target==='_blank'});
          });
          d.links=links; d.internalLinks=links.filter(l=>!l.isExternal); d.externalLinks=links.filter(l=>l.isExternal); d.nofollowLinks=links.filter(l=>l.nofollow);
          const images=[];
          document.querySelectorAll('img').forEach(img=>{images.push({src:img.src,alt:img.getAttribute('alt'),hasAlt:img.hasAttribute('alt'),altEmpty:img.getAttribute('alt')==='',width:img.naturalWidth,height:img.naturalHeight,loading:img.getAttribute('loading'),srcset:!!img.getAttribute('srcset')});});
          d.images=images; d.imagesWithAlt=images.filter(i=>i.hasAlt&&!i.altEmpty).length; d.imagesMissing=images.filter(i=>!i.hasAlt||i.altEmpty).length; d.imagesLazy=images.filter(i=>i.loading==='lazy').length;
          const schemas=[];
          document.querySelectorAll('script[type="application/ld+json"]').forEach(s=>{try{const p=JSON.parse(s.textContent);if(Array.isArray(p)){p.forEach(i=>schemas.push(i));}else{schemas.push(p);}}catch(e){}});
          d.structuredData=schemas;
          const hreflangs=[];
          document.querySelectorAll('link[hreflang]').forEach(l=>hreflangs.push({lang:l.hreflang,href:l.href}));
          d.hreflangs=hreflangs;
          const robotsLc=(d.robots||'').toLowerCase();
          d.isNoindex=robotsLc.includes('noindex'); d.isNofollow=robotsLc.includes('nofollow');
          d.wordCount=(document.body?.innerText||'').trim().split(/\s+/).filter(Boolean).length;
          d.bodyText=(document.body?.innerText||'').trim();
          d.scriptCount=document.querySelectorAll('script').length;
          d.styleCount=document.querySelectorAll('link[rel="stylesheet"]').length;
          // Blog detection
          const blogPatterns=[/\/blog\//i,/\/post\//i,/\/article\//i,/\/news\//i,/\/\d{4}\/\d{2}\//,/\?p=\d+/,/\/stories\//i,/\/updates\//i];
          const internalHrefs=[...new Set(links.filter(l=>!l.isExternal).map(l=>l.href))];
          const blogLinks=internalHrefs.filter(h=>blogPatterns.some(p=>p.test(h)));
          const pageLinks=internalHrefs.filter(h=>!blogPatterns.some(p=>p.test(h)));
          d.estimatedBlogPosts=blogLinks.length; d.estimatedPages=pageLinks.length;
          d.blogPostUrls=blogLinks.slice(0,200); d.pageUrls=pageLinks.slice(0,200);
          // Performance
          if(window.performance?.getEntriesByType){
            const nav=performance.getEntriesByType('navigation')[0];
            if(nav){d.domContentLoaded=Math.round(nav.domContentLoadedEventEnd);d.loadTime=Math.round(nav.loadEventEnd);d.ttfb=Math.round(nav.responseStart-nav.requestStart);}
          }
          return d;
        }
      });
    }catch(e){
      $('loadingScreen').style.display='none';
      $('errorScreen').classList.remove('hidden');
      return;
    }

    const seo=result.result;

    // ── Collect tech signals via a second injection ──
    try{
      const [tsResult]=await chrome.scripting.executeScript({
        target:{tabId:tab.id},
        func:()=>{
          try{
            const metas={};
            document.querySelectorAll('meta').forEach(m=>{const n=m.getAttribute('name')||m.getAttribute('property')||m.getAttribute('http-equiv');const c=m.getAttribute('content');if(n&&c!==null)metas[n.toLowerCase()]=c;});
            const tw={};
            Object.entries(metas).forEach(([k,v])=>{if(k.startsWith('twitter:'))tw[k]=v;});
            const isHttps=location.protocol==='https:';
            const ts={};
            const sSrcs=[];
            let _ic='';
            document.querySelectorAll('script').forEach(s=>{const src=s.getAttribute('src')||'';if(src)sSrcs.push(src.toLowerCase());else _ic+=((s.textContent||'').slice(0,5000)+' ');});
            const lHrefs=[];
            document.querySelectorAll('link[href]').forEach(l=>lHrefs.push((l.getAttribute('href')||'').toLowerCase()));
            const allSrcs=[...sSrcs,...lHrefs];
            const inJS=_ic.toLowerCase();
            const html=(document.documentElement.outerHTML||'').slice(0,300000).toLowerCase();
            const bodyClass=(document.body?document.body.className:'').toLowerCase();
            const gen=(metas['generator']||'').toLowerCase();
            const W=window;
            const hasSrc=(p)=>allSrcs.some(s=>s.includes(p));
            const hasHTML=(p)=>html.includes(p);
            const hasJS=(p)=>inJS.includes(p);
            const hasDOM=(sel)=>{try{return!!document.querySelector(sel);}catch(e){return false;}};
            const hasWin=(key)=>{try{return!!W[key];}catch(e){return false;}};
            const winVer=(expr)=>{try{const v=expr();return v?String(v).trim():'';}catch(e){return'';}};
            const sv=(val)=>{try{return val?String(val).trim():'';}catch(e){return'';}};

            // CMS
            ts.isWordPress=!!(gen.includes('wordpress')||hasSrc('wp-content')||hasSrc('wp-includes')||hasHTML('/wp-content/')||hasHTML('wp-json')||hasHTML('wp-emoji')||gen.includes('elementor'));
            ts.wpVersion=winVer(()=>W.wpApiSettings?.version)||sv((metas['generator']||'').match(/WordPress\s*([\d.]+)/i)?.[1]);
            ts.isShopify=!!(gen.includes('shopify')||hasSrc('cdn.shopify')||hasHTML('myshopify.com')||hasHTML('shopify.theme')||hasHTML('cdn.shopify.com'));
            ts.isWix=!!(hasSrc('wixstatic.com')||hasSrc('wix.com')||hasHTML('wixstatic.com')||gen.includes('wix'));
            ts.isSquarespace=!!(hasSrc('squarespace.com')||hasSrc('sqspcdn.com')||gen.includes('squarespace'));
            ts.isWebflow=!!(hasDOM('[data-wf-page]')||hasHTML('webflow.com')||gen.includes('webflow')||hasSrc('webflow'));
            ts.isDrupal=!!(gen.includes('drupal')||hasSrc('drupal')||hasHTML('drupal.js')||hasHTML('/sites/default/'));
            ts.isJoomla=!!(gen.includes('joomla')||hasSrc('/media/jui/')||hasHTML('/components/com_'));
            ts.isGhost=!!(gen.includes('ghost')||hasSrc('ghost.io')||hasHTML('ghost-theme'));
            ts.isMagento=!!(hasHTML('magento')||hasHTML('mage/')||hasSrc('magento'));
            ts.isBigCommerce=!!(hasHTML('bigcommerce')||hasSrc('bigcommerce.com'));
            ts.isGatsby=!!(hasDOM('[data-gatsby]')||hasHTML('gatsby-chunk')||hasSrc('gatsby'));
            ts.isHubspotCMS=!!(hasSrc('hs-sites.com')||(hasSrc('hs-scripts.com')&&hasSrc('hs-analytics')));
            ts.isSanity=!!(hasHTML('sanity.io')||hasSrc('sanity.io')||hasHTML('cdn.sanity.io')||hasWin('sanity'));
            ts.sanityVersion=winVer(()=>W.sanity?.VERSION);
            ts.isContentful=!!(hasSrc('contentful.com')||hasHTML('ctfassets.net'));
            ts.isStrapi=!!(hasSrc('strapi.io')||hasHTML('strapi'));
            ts.cmsGenMeta=metas['generator']||'';

            // JS Frameworks
            ts.hasReact=!!(hasDOM('[data-reactroot],[data-reactid]')||hasSrc('react')||hasHTML('react.production')||hasHTML('react.development')||hasWin('React'));
            ts.reactVersion=winVer(()=>W.React?.version)||sv(html.match(/react[/@](\d+\.\d+[\.\d]*)/)?.[1]);
            ts.hasNextJs=!!(hasDOM('#__NEXT_DATA__')||hasSrc('_next/')||hasHTML('__next_data__')||hasWin('next'));
            ts.nextVersion=winVer(()=>W.next?.version)||sv(html.match(/next[/@](\d+\.\d+[\.\d]*)/)?.[1]);
            ts.hasVue=!!(hasDOM('[data-v-app]')||hasSrc('vue.js')||hasSrc('vue.min')||hasHTML('__vue_app__')||hasWin('Vue'));
            ts.vueVersion=winVer(()=>W.Vue?.version)||sv(html.match(/vue[/@](\d+\.\d+[\.\d]*)/)?.[1]);
            ts.hasAngular=!!(hasDOM('[ng-version],[ng-app]')||hasSrc('angular')||hasHTML('ng-version'));
            ts.angularVersion=sv(document.querySelector('[ng-version]')?.getAttribute('ng-version'))||sv(html.match(/angular[/@](\d+\.\d+[\.\d]*)/)?.[1]);
            ts.hasNuxt=!!(hasHTML('__nuxt__')||hasHTML('_nuxt/')||hasSrc('_nuxt'));
            ts.nuxtVersion=sv(html.match(/nuxt[/@](\d+\.\d+[\.\d]*)/)?.[1]);
            ts.hasSvelte=!!(hasSrc('svelte')||hasHTML('svelte-'));
            ts.hasAlpineJs=!!(hasSrc('alpinejs')||hasDOM('[x-data]')||hasHTML('x-data='));
            ts.alpineVersion=sv(html.match(/alpinejs[/@](\d+\.\d+[\.\d]*)/)?.[1]);
            ts.hasMeteor=!!(hasWin('Meteor')||hasHTML('meteor.js'));
            ts.hasEmber=!!(hasWin('Ember')||hasSrc('ember.js'));
            ts.hasAstro=!!(hasHTML('astro-island')||hasSrc('/_astro/')||hasHTML('astro'));

            // JS Libraries
            ts.hasJQuery=!!(hasSrc('jquery')||hasHTML('jquery')||hasWin('jQuery'));
            ts.jqueryVersion=winVer(()=>W.jQuery?.fn?.jquery)||sv(html.match(/jquery[/@v](\d+\.\d+[\.\d]*)/i)?.[1]);
            ts.hasLodash=!!(hasSrc('lodash')||hasHTML('lodash')||hasJS('lodash'));
            ts.lodashVersion=winVer(()=>W._?.VERSION)||sv(html.match(/lodash[/@](\d+\.\d+[\.\d]*)/)?.[1]);
            ts.hasFramerMotion=!!(hasSrc('framer-motion')||hasHTML('framer-motion'));
            ts.framerVersion=sv(html.match(/framer-motion[/@](\d+\.\d+[\.\d]*)/)?.[1]);
            ts.hasMomentJs=!!(hasWin('moment')||hasSrc('moment.js')||hasSrc('moment.min'));
            ts.momentVersion=winVer(()=>W.moment?.version);
            ts.hasD3=!!(hasWin('d3')||hasSrc('d3.js')||hasSrc('d3.min'));
            ts.d3Version=winVer(()=>W.d3?.version);
            ts.hasAxios=!!(hasWin('axios')||hasSrc('axios'));
            ts.axiosVersion=winVer(()=>W.axios?.VERSION);
            ts.hasHighcharts=!!(hasWin('Highcharts')||hasSrc('highcharts'));
            ts.highchartsVersion=winVer(()=>W.Highcharts?.version);
            ts.hasChartJs=!!(hasWin('Chart')||hasSrc('chart.js'));
            ts.hasThreedJs=!!(hasWin('THREE')||hasSrc('three.js'));
            ts.hasGSAP=!!(hasWin('gsap')||hasSrc('gsap'));
            ts.gsapVersion=winVer(()=>W.gsap?.version);

            // CSS Frameworks
            ts.hasBootstrap=!!(hasSrc('bootstrap')||hasDOM('[class*="col-md-"],[class*="col-lg-"],[class*="container-fluid"]')||hasHTML('bootstrap.min.css'));
            ts.bootstrapVersion=sv(html.match(/bootstrap[/@](\d+\.\d+[\.\d]*)/)?.[1]);
            ts.hasTailwind=!!(hasSrc('tailwind')||hasHTML('tailwindcss'));
            ts.tailwindVersion=sv(html.match(/tailwindcss[/@](\d+\.\d+[\.\d]*)/)?.[1]);
            ts.hasFontAwesome=!!(hasSrc('font-awesome')||hasSrc('fontawesome')||hasDOM('.fa,.fas,.far,.fab'));
            ts.hasMaterialUI=!!(hasSrc('material-ui')||hasSrc('@mui')||hasHTML('muibutton'));
            ts.hasBulma=!!(hasSrc('bulma')||hasHTML('bulma.min.css'));

            // Web Frameworks
            ts.hasLaravel=!!(hasHTML('laravel_session')||hasHTML('laravel'));
            ts.hasSymfony=!!(hasHTML('symfony')||hasSrc('symfony'));
            ts.hasDjango=!!(hasDOM('input[name="csrfmiddlewaretoken"]')||hasHTML('django'));
            ts.hasRubyOnRails=!!(hasHTML('authenticity_token')||hasHTML('rails'));
            ts.hasExpress=hasJS('x-powered-by: express');
            ts.hasFlask=hasHTML('flask');

            // WordPress Plugins
            ts.hasWooCommerce=!!(hasHTML('woocommerce')||hasSrc('woocommerce')||hasDOM('.woocommerce'));
            ts.hasYoast=!!(hasHTML('yoast')||hasSrc('yoast')||hasHTML('<!-- this site is optimized with the yoast'));
            ts.hasRankMath=!!(hasHTML('rank-math')||hasHTML('rankmath')||hasSrc('rank-math'));
            ts.hasAIOSEO=!!(hasHTML('aioseo')||hasSrc('aioseo'));
            ts.hasSEOPress=!!(hasHTML('seopress')||hasSrc('seopress'));
            ts.hasElementor=!!(gen.includes('elementor')||hasDOM('[data-elementor-type],[class*="elementor-widget-"]')||hasSrc('elementor')||hasHTML('elementor-frontend'));
            ts.elementorVersion=sv((metas['generator']||'').match(/Elementor\s*([\d.]+)/i)?.[1])||sv(html.match(/elementor[/@](\d+\.\d+[\.\d]*)/)?.[1]);
            ts.hasDivi=!!(hasHTML('et_pb_')||bodyClass.includes('et-db')||hasSrc('divi'));
            ts.hasBeaverBuilder=!!(hasHTML('fl-builder')||hasSrc('fl-builder'));
            ts.hasWPBakery=!!(hasHTML('vc_row')||hasHTML('wpb_wrapper')||hasSrc('js_composer'));
            ts.hasGutenberg=!!(hasHTML('wp-block-')||hasDOM('[class*="wp-block-"]'));
            ts.hasCF7=!!(hasDOM('.wpcf7,.wpcf7-form')||hasSrc('contact-form-7'));
            ts.hasGravityForms=!!(hasDOM('.gform_wrapper,.gform_body')||hasSrc('gravityforms'));
            ts.hasWPRocket=!!(hasHTML('wp-rocket')||hasSrc('wp-rocket'));
            ts.hasW3Cache=!!(hasHTML('w3tc')||hasSrc('w3tc'));
            ts.hasACF=!!(hasSrc('acf')||hasHTML('/acf/')||hasHTML('advanced-custom-fields'));
            ts.hasPolylang=!!(hasSrc('polylang')||hasHTML('polylang'));
            ts.hasWPML=!!(hasSrc('wpml')||hasHTML('wpml'));

            // Analytics
            ts.hasGA4=!!(hasJS("gtag('config'")||hasJS('gtag("config"')||hasSrc('gtag/js'));
            ts.hasGA3=!!(hasSrc('google-analytics.com/analytics.js')||hasHTML('analytics.js'));
            ts.hasGTM=!!(hasSrc('googletagmanager.com/gtm')||hasJS('googletagmanager.com')||hasHTML('googletagmanager.com/gtm'));
            ts.hasFBPixel=!!(hasJS("fbq('init'")||hasSrc('connect.facebook.net'));
            ts.hasHotjar=!!(hasJS('hotjar')||hasSrc('hotjar.com'));
            ts.hasMixpanel=!!(hasWin('mixpanel')||hasSrc('mixpanel'));
            ts.mixpanelVersion=winVer(()=>W.mixpanel?.__SV);
            ts.hasSegment=!!(hasSrc('cdn.segment.com')||hasHTML('cdn.segment.com'));
            ts.hasDatadog=!!(hasSrc('datadoghq.com')||hasHTML('datadog'));
            ts.datadogVersion=sv(html.match(/datadog[/@](\d+\.\d+[\.\d]*)/)?.[1]);
            ts.hasClarityMS=!!(hasSrc('clarity.ms')||hasHTML('clarity.ms'));
            ts.hasFullstory=!!(hasSrc('fullstory.com')||hasHTML('fullstory.com'));
            ts.hasHeap=!!(hasWin('heap')||hasSrc('heap-analytics'));
            ts.hasAmplitude=!!(hasWin('amplitude')||hasSrc('amplitude.com'));
            ts.hasPendo=!!(hasWin('pendo')||hasSrc('pendo.io'));
            ts.hasHubspotTrack=!!(hasSrc('hs-scripts.com')||hasSrc('hubspot'));
            ts.hasLinkedInInsight=!!(hasSrc('snap.licdn.com')||hasHTML('snap.licdn.com'));
            ts.hasTiktokPixel=!!(hasHTML('analytics.tiktok.com')||hasSrc('analytics.tiktok.com'));
            ts.hasKlaviyo=!!(hasSrc('klaviyo.com')||hasHTML('klaviyo'));
            ts.hasCustomerIo=!!(hasSrc('customer.io'));
            ts.hasIntercom=!!(hasSrc('intercomcdn.com')||hasSrc('intercom.io')||hasHTML('intercomcdn.com'));
            ts.hasDrift=!!(hasSrc('drift.com')||hasHTML('drift.com'));
            ts.hasCrisp=!!(hasSrc('crisp.chat')||hasHTML('crisp.chat'));
            ts.hasTidio=!!(hasSrc('tidio')||hasHTML('tidio'));
            ts.hasZendesk=!!(hasSrc('zdassets.com')||hasSrc('zendesk.com'));
            ts.hasFreshdesk=!!(hasSrc('freshdesk.com')||hasHTML('freshdesk'));
            ts.hasLiveChat=!!(hasSrc('livechatinc.com')||hasHTML('livechatinc.com'));
            ts.hasTawkTo=!!(hasSrc('tawk.to')||hasHTML('tawk.to'));
            ts.hasOlark=!!(hasSrc('olark.com'));
            ts.hasHubspotChat=!!(hasSrc('js.usemessages.com'));

            // Issue Trackers
            ts.hasSentry=!!(hasSrc('sentry.io')||hasSrc('browser.sentry-cdn.com')||hasWin('Sentry'));
            ts.sentryVersion=winVer(()=>W.Sentry?.SDK_VERSION)||sv(html.match(/sentry[/@](\d+\.\d+[\.\d]*)/i)?.[1]);
            ts.hasBugsnag=!!(hasSrc('bugsnag.com')||hasWin('Bugsnag'));
            ts.hasRollbar=!!(hasSrc('rollbar.com')||hasWin('Rollbar'));
            ts.hasLogRocket=!!(hasSrc('logrocket.com')||hasHTML('logrocket'));
            ts.hasNewRelic=!!(hasSrc('newrelic.com')||hasHTML('NREUM')||hasWin('NREUM'));

            // Security
            ts.hasSift=!!(hasSrc('sift.com')||hasSrc('siftscience.com')||hasSrc('cdn.sift.com'));
            ts.hasHCaptcha=!!(hasSrc('hcaptcha.com')||hasDOM('.h-captcha'));
            ts.hasRecaptcha=!!(hasSrc('recaptcha')||hasDOM('.g-recaptcha,[data-sitekey]'));
            ts.hasTurnstile=!!(hasSrc('challenges.cloudflare.com')||hasDOM('.cf-turnstile'));
            ts.hasCloudflareBot=!!(hasHTML('__cf_bm')||hasHTML('cf-challenge'));
            ts.hasHSTS=isHttps;
            ts.hasCSP=!!(hasDOM('meta[http-equiv="Content-Security-Policy"]'));
            ts.hasSubresourceIntegrity=!!(hasDOM('script[integrity],link[integrity]'));

            // CDN & Infrastructure
            ts.hasCloudflare=!!(hasHTML('cf-ray')||hasHTML('__cf_')||hasSrc('cloudflare.com')||hasHTML('cloudflareinsights'));
            ts.hasCloudFront=!!(hasSrc('cloudfront.net')||hasHTML('cloudfront.net'));
            ts.hasFastly=!!(hasSrc('fastly.net'));
            ts.hasAkamaiCDN=!!(hasSrc('akamai')||hasSrc('akamaihd.net'));
            ts.hasjsDelivr=!!(hasSrc('jsdelivr.net'));
            ts.hasCDNjs=!!(hasSrc('cdnjs.cloudflare.com'));
            ts.hasGoogleFonts=!!(hasSrc('fonts.googleapis.com')||hasHTML('fonts.googleapis.com'));
            ts.hasGoogleAPIs=!!(hasSrc('googleapis.com'));
            ts.hasGoogleMaps=!!(hasSrc('maps.googleapis.com'));
            ts.hasAWS=!!(hasSrc('amazonaws.com')||hasHTML('amazonaws.com'));
            ts.hasAzure=!!(hasSrc('azure.com')||hasSrc('azurewebsites.net')||hasSrc('azureedge.net'));
            ts.hasGCP=!!(hasSrc('storage.googleapis.com')||hasSrc('appspot.com'));
            ts.hasVercel=!!(hasSrc('vercel.app')||hasHTML('_next/')&&hasHTML('vercel'));
            ts.hasNetlify=!!(hasHTML('netlify')||hasSrc('netlify.com'));
            ts.hasEnvoy=!!(hasHTML('x-envoy'));
            ts.hasHeroku=!!(hasHTML('herokuapp.com')||hasSrc('herokuapp.com'));

            // Payments
            ts.hasStripe=!!(hasSrc('js.stripe.com')||hasHTML('stripe.com')||hasWin('Stripe'));
            ts.stripeVersion=sv(html.match(/stripe\.js\/v(\d+)/i)?.[1]?'v'+html.match(/stripe\.js\/v(\d+)/i)?.[1]:'');
            ts.hasPaypal=!!(hasSrc('paypal.com')||hasSrc('paypalobjects.com'));
            ts.hasVerifone2co=!!(hasSrc('2checkout')||hasHTML('2checkout'));
            ts.hasKlarna=!!(hasSrc('klarna.com')||hasHTML('klarna'));
            ts.hasAffirm=!!(hasSrc('affirm.com'));
            ts.hasShopPay=!!(hasHTML('shop-pay')||hasSrc('shop.app'));
            ts.hasMailchimp=!!(hasSrc('mailchimp')||hasHTML('mailchimp.com'));

            // Modern Web / Misc
            ts.hasPriorityHints=!!(hasDOM('[fetchpriority],[importance]'));
            ts.hasPWA=!!(hasDOM('link[rel="manifest"]'));
            ts.hasServiceWorker=!!(hasHTML('serviceworker')||hasHTML('service-worker'));
            ts.hasAMP=!!(hasDOM('link[rel="amphtml"]'));
            ts.hasHTTP3=!!(hasHTML('alt-svc')&&hasHTML('h3='));
            ts.hasOpenGraph=!!(Object.keys(metas).some(k=>k.startsWith('og:')));
            ts.hasTwitterCard=!!(tw['twitter:card']);
            ts.hasJSONLD=!!(hasDOM('script[type="application/ld+json"]'));
            ts.hasWebP=!!(hasDOM('img[src$=".webp"]')||hasHTML('.webp'));
            ts.hasLazyLoad=!!(hasDOM('img[loading="lazy"]'));
            ts.hasPrefetch=!!(hasDOM('link[rel="prefetch"],link[rel="preload"],link[rel="dns-prefetch"]'));
            ts.hasHreflang=!!(hasDOM('link[hreflang]'));
            ts.hasPHP=!!(hasHTML('phpsessid')||sSrcs.some(s=>s.endsWith('.php')));
            ts.cookieCount=document.cookie?document.cookie.split(';').filter(c=>c.trim()).length:0;

            // Programming Languages
            ts.langJavaScript=true;
            ts.langTypeScript=!!(hasHTML('typescript')||hasSrc('tslib'));
            ts.langPHP=!!(hasHTML('phpsessid')||sSrcs.some(s=>s.endsWith('.php'))||hasHTML('wp-content')||hasHTML('wp-includes')||gen.includes('wordpress')||gen.includes('drupal')||gen.includes('joomla')||hasHTML('laravel'));
            ts.phpVersion=sv(html.match(/x-powered-by:\s*php\/([\d.]+)/i)?.[1]);
            ts.langPython=!!(hasHTML('django')||hasHTML('flask')||hasHTML('csrfmiddlewaretoken'));
            ts.langRuby=!!(hasHTML('authenticity_token')||hasHTML('turbolinks')||hasHTML('turbo-frame'));
            ts.langJava=!!(hasHTML('jsessionid')||hasHTML('.jsp'));
            ts.langGo=!!(hasHTML('golang'));
            ts.langRust=!!(hasSrc('.wasm'));
            ts.langNode=!!(hasHTML('x-powered-by: express')||ts.hasNextJs||ts.hasNuxt||ts.hasAstro||ts.isGhost||hasSrc('_next/'));
            ts.langCSharp=!!(hasHTML('asp.net')||hasHTML('__viewstate')||hasHTML('.aspx'));
            ts.aspnetVersion=sv(html.match(/x-aspnet-version:\s*([\d.]+)/i)?.[1]);

            // WordPress Theme
            ts.wpThemeName='';ts.wpThemeUri='';ts.wpParentTheme='';ts.wpChildTheme='';
            if(ts.isWordPress){
              const tm=html.match(/wp-content\/themes\/([a-z0-9_-]+)\//i);
              if(tm)ts.wpThemeName=tm[1];
              ts.wpThemeUri=ts.wpThemeName?'/wp-content/themes/'+ts.wpThemeName+'/':'';
              const pm=html.match(/wp-content\/themes\/([a-z0-9_-]+)\/.*?wp-content\/themes\/([a-z0-9_-]+)\//i);
              ts.wpParentTheme=pm?pm[2]:'';
              ts.wpChildTheme=(pm&&pm[1]!==pm[2])?pm[1]:'';
            }
            // Shopify Theme
            ts.shopifyThemeName='';
            if(ts.isShopify){
              const st=html.match(/shopify\.theme\s*=\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i)||html.match(/theme_name['"]\s*:\s*['"]([^'"]+)/i);
              if(st)ts.shopifyThemeName=st[1];
            }

            // Ecommerce
            ts.hasPrestaShop=!!(gen.includes('prestashop')||hasHTML('prestashop'));
            ts.hasOpenCart=!!(hasHTML('opencart')||gen.includes('opencart'));
            ts.hasEcwid=!!(hasSrc('ecwid.com'));
            ts.hasSnipcart=!!(hasSrc('snipcart'));

            // Tag Managers
            ts.hasAdobeLaunch=!!(hasSrc('launch-')&&hasSrc('adoberesources.net'))||hasSrc('adobedtm.com');
            ts.hasTealium=!!(hasSrc('tealiumiq.com')||hasSrc('tealium'));
            ts.hasEnsighten=!!(hasSrc('ensighten.com'));

            // A/B Testing
            ts.hasOptimizely=!!(hasSrc('optimizely.com')||hasWin('optimizely'));
            ts.hasGoogleOptimize=!!(hasSrc('optimize.google.com'));
            ts.hasVWO=!!(hasSrc('visualwebsiteoptimizer.com')||hasSrc('vwo.com'));
            ts.hasLaunchDarkly=!!(hasSrc('launchdarkly'));
            ts.hasABTasty=!!(hasSrc('abtasty.com'));
            ts.hasUnbounce=!!(hasSrc('unbounce.com'));

            // Video Players
            ts.hasYouTubeEmbed=!!(hasSrc('youtube.com/embed')||hasHTML('youtube.com/embed')||hasDOM('iframe[src*="youtube"]'));
            ts.hasVimeoEmbed=!!(hasSrc('player.vimeo.com')||hasDOM('iframe[src*="vimeo"]'));
            ts.hasWistia=!!(hasSrc('wistia.com')||hasSrc('wistia.net'));
            ts.hasVideoJs=!!(hasSrc('video.js')||hasSrc('videojs'));
            ts.hasPlyr=!!(hasSrc('plyr'));
            ts.hasJWPlayer=!!(hasSrc('jwplayer')||hasWin('jwplayer'));

            // Cookie Consent
            ts.hasCookiebot=!!(hasSrc('cookiebot.com')||hasDOM('#CybotCookiebotDialog'));
            ts.hasOneTrust=!!(hasSrc('onetrust.com')||hasSrc('cookielaw.org')||hasDOM('#onetrust-banner-sdk'));
            ts.hasCookieYes=!!(hasSrc('cookieyes.com'));
            ts.hasOsano=!!(hasSrc('osano.com'));
            ts.hasTrustArc=!!(hasSrc('trustarc.com'));
            ts.hasQuantcast=!!(hasSrc('quantcast.com'));

            // Accessibility
            ts.hasAccessiBe=!!(hasSrc('accessibe.com')||hasSrc('acsbapp.com'));
            ts.hasUserWay=!!(hasSrc('userway.org'));
            ts.hasAudioEye=!!(hasSrc('audioeye.com'));

            // Advertising
            ts.hasGoogleAdsense=!!(hasSrc('pagead2.googlesyndication.com')||hasDOM('ins.adsbygoogle'));
            ts.hasGoogleAds=!!(hasSrc('googleadservices.com'));
            ts.hasDoubleClick=!!(hasSrc('doubleclick.net'));
            ts.hasAdRoll=!!(hasSrc('adroll.com'));
            ts.hasCriteo=!!(hasSrc('criteo.com')||hasSrc('criteo.net'));
            ts.hasTaboola=!!(hasSrc('taboola.com'));
            ts.hasOutbrain=!!(hasSrc('outbrain.com'));

            // Search
            ts.hasAlgolia=!!(hasSrc('algolia')||hasWin('algoliasearch'));
            ts.hasElasticSearch=!!(hasSrc('elastic')&&hasHTML('elasticsearch'));
            ts.hasMeiliSearch=!!(hasSrc('meilisearch'));
            ts.hasTypesense=!!(hasSrc('typesense'));

            // UI Libraries
            ts.hasSwiper=!!(hasSrc('swiper')||hasDOM('.swiper'));
            ts.swiperVersion=sv(html.match(/swiper[/@](\d+\.\d+[\.\d]*)/)?.[1]);
            ts.hasSlick=!!(hasSrc('slick')||hasDOM('.slick-slider'));
            ts.hasOwlCarousel=!!(hasSrc('owl.carousel')||hasDOM('.owl-carousel'));
            ts.hasLightbox=!!(hasSrc('lightbox')||hasSrc('fancybox')||hasDOM('[data-fancybox]'));

            // Web Servers
            ts.hasNginx=!!(hasHTML('nginx'));
            ts.hasApache=!!(hasHTML('apache'));
            ts.hasIIS=!!(hasHTML('x-aspnet')||hasHTML('.aspx'));
            ts.hasLiteSpeed=!!(hasHTML('litespeed'));

            // Fonts
            ts.hasAdobeFonts=!!(hasSrc('use.typekit.net')||hasSrc('typekit.com'));

            ts.generatorMeta=metas['generator']||'';

            return ts;
          }catch(err){return{_error:err.message};}
        }
      });
      if(tsResult&&tsResult.result&&!tsResult.result._error){
        seo.techSignals=tsResult.result;
      }
    }catch(e){/* tech signals collection failed silently */}

    const {score,issues}=calcScore(seo);

    $('loadingScreen').style.display='none';
    $('tab-overview').classList.remove('hidden');

    setTimeout(()=>animateScore(score),150);
    renderOverview(seo,score,issues);
    renderSERP(seo);
    renderMeta(seo);
    renderHeadings(seo);
    renderLinks(seo);
    renderImages(seo);
    renderTechnical(seo);
    renderSiteAudit(seo);
    renderIndexedPages(seo);
    renderPageSpeed(seo);
    renderInternalLinks(seo);

  }catch(err){
    $('loadingScreen').style.display='none';
    $('errorScreen').classList.remove('hidden');
    console.error('[7th Club SEO Pro]',err);
  }
};

/* ─── INIT ─── */
document.addEventListener('DOMContentLoaded',function(){
  // Tab switching
  const tabNav=document.getElementById('tabNav');
  if(tabNav){
    tabNav.addEventListener('click',function(e){
      const btn=e.target.closest('.hn-btn');
      if(!btn)return;
      document.querySelectorAll('.hn-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));
      const panel=document.getElementById('tab-'+btn.dataset.tab);
      if(panel)panel.classList.remove('hidden');
      if(btn.dataset.tab==='devtech') initDevTech();
    });
  }

  function runAnalyze(){
    window.analyze().then(function(){
      try{
        chrome.tabs.query({active:true,currentWindow:true},function(tabs){
          if(tabs&&tabs[0]&&tabs[0].url){
            try{injectToolUrls(new URL(tabs[0].url).hostname);}catch(e){}
          }
        });
      }catch(e){}
    }).catch(function(){});
  }

  // Auto-analyze on open
  runAnalyze();

  const dlBtn=$('btnDownload'); if(dlBtn)dlBtn.addEventListener('click',downloadReport);
  const auditBtn=$('btnAuditReport'); if(auditBtn)auditBtn.addEventListener('click',generateAuditReport);
  document.getElementById('btnAnalyze').addEventListener('click',runAnalyze);
});

/* ══════════════════════════════════════════════
   DEV TECH — Wappalyzer-style Technology Detector
   All signals come from content.js (real page DOM)
══════════════════════════════════════════════ */
let _devtechDone=false;
let _dtTabsWired=false;
function initDevTech(){
  if(_devtechDone)return;
  _devtechDone=true;
  // Wire sub-tabs only once
  if(!_dtTabsWired){
    _dtTabsWired=true;
    document.querySelectorAll('.dt-tab').forEach(function(tab){
      tab.addEventListener('click',function(){
        document.querySelectorAll('.dt-tab').forEach(t=>t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.dt-panel').forEach(p=>p.classList.add('hidden'));
        const panel=document.getElementById('dtab-'+tab.dataset.dtab);
        if(panel)panel.classList.remove('hidden');
      });
    });
  }
  // Wait up to 5s for _seoData to be available then render
  let attempts=0;
  function tryRender(){
    attempts++;
    if(_seoData && _seoData.techSignals){
      const ts=_seoData.techSignals;
      renderWappalyzer(_seoData,ts);
    } else if(attempts<25){
      setTimeout(tryRender,200);
    } else {
      // Show error state in all content divs
      ['cms','plugins','stack','hosting'].forEach(function(s){
        const ld=$('dt-'+s+'-loading'), ct=$('dt-'+s+'-content');
        if(ld)ld.style.display='none';
        if(ct){ct.innerHTML='<div class="dt-no-data"><div class="dt-no-data-icon">⚠️</div><div>Could not collect tech signals. Try re-analyzing.</div></div>';ct.classList.remove('hidden');}
      });
    }
  }
  tryRender();
}

function showDtContent(section){
  const loading=document.getElementById('dt-'+section+'-loading');
  const content=document.getElementById('dt-'+section+'-content');
  if(loading)loading.style.display='none';
  if(content)content.classList.remove('hidden');
}

/* ── Build the full Wappalyzer-style category list ── */
function buildCategories(d,ts){
  const cats=[];

  // helper: push only if detected
  function cat(name,icon,items){
    const active=items.filter(i=>i.detected);
    if(active.length) cats.push({name,icon,items:active});
  }

  cat('CMS','🗂️',[
    {name:'WordPress',detected:ts.isWordPress,version:ts.wpVersion,url:'https://wordpress.org',desc:'Open-source CMS powering 43% of the web'},
    {name:'Shopify',detected:ts.isShopify,url:'https://shopify.com',desc:'Hosted e-commerce platform'},
    {name:'Wix',detected:ts.isWix,url:'https://wix.com',desc:'Drag-and-drop website builder'},
    {name:'Squarespace',detected:ts.isSquarespace,url:'https://squarespace.com',desc:'Design-forward website builder'},
    {name:'Webflow',detected:ts.isWebflow,url:'https://webflow.com',desc:'Visual web design & CMS platform'},
    {name:'Drupal',detected:ts.isDrupal,url:'https://drupal.org',desc:'Enterprise open-source CMS'},
    {name:'Joomla',detected:ts.isJoomla,url:'https://joomla.org',desc:'Open-source CMS'},
    {name:'Ghost',detected:ts.isGhost,url:'https://ghost.org',desc:'Node.js publishing platform'},
    {name:'Magento',detected:ts.isMagento,url:'https://magento.com',desc:'Adobe e-commerce platform'},
    {name:'BigCommerce',detected:ts.isBigCommerce,url:'https://bigcommerce.com',desc:'SaaS e-commerce platform'},
    {name:'Sanity',detected:ts.isSanity,version:ts.sanityVersion,url:'https://sanity.io',desc:'Headless CMS with real-time collaboration'},
    {name:'Contentful',detected:ts.isContentful,url:'https://contentful.com',desc:'API-first headless CMS'},
    {name:'Strapi',detected:ts.isStrapi,url:'https://strapi.io',desc:'Open-source headless CMS'},
    {name:'HubSpot CMS',detected:ts.isHubspotCMS,url:'https://hubspot.com',desc:'Integrated CMS + CRM platform'},
    {name:'Gatsby',detected:ts.isGatsby,url:'https://gatsbyjs.com',desc:'React static site generator'},
  ]);

  cat('JavaScript Frameworks','⚛️',[
    {name:'React',detected:ts.hasReact,version:ts.reactVersion,url:'https://react.dev',desc:'UI library by Meta'},
    {name:'Vue.js',detected:ts.hasVue,version:ts.vueVersion,url:'https://vuejs.org',desc:'Progressive JavaScript framework'},
    {name:'Angular',detected:ts.hasAngular,version:ts.angularVersion,url:'https://angular.io',desc:'TypeScript framework by Google'},
    {name:'Next.js',detected:ts.hasNextJs,version:ts.nextVersion,url:'https://nextjs.org',desc:'React framework for production'},
    {name:'Nuxt.js',detected:ts.hasNuxt,version:ts.nuxtVersion,url:'https://nuxt.com',desc:'Vue-based meta-framework'},
    {name:'Svelte',detected:ts.hasSvelte,url:'https://svelte.dev',desc:'Compiler-based UI framework'},
    {name:'Alpine.js',detected:ts.hasAlpineJs,version:ts.alpineVersion,url:'https://alpinejs.dev',desc:'Lightweight reactive JS'},
    {name:'Meteor',detected:ts.hasMeteor,url:'https://meteor.com',desc:'Full-stack JavaScript platform'},
    {name:'Ember.js',detected:ts.hasEmber,url:'https://emberjs.com',desc:'Opinionated web framework'},
    {name:'Astro',detected:ts.hasAstro,url:'https://astro.build',desc:'Content-focused web framework'},
  ]);

  cat('Static Site Generators','📄',[
    {name:'Next.js',detected:ts.hasNextJs,version:ts.nextVersion,url:'https://nextjs.org',desc:'Can be used as SSG'},
    {name:'Gatsby',detected:ts.isGatsby,url:'https://gatsbyjs.com',desc:'React-based SSG'},
    {name:'Astro',detected:ts.hasAstro,url:'https://astro.build',desc:'Island architecture SSG'},
  ]);

  cat('Web Frameworks','🔧',[
    {name:'Next.js',detected:ts.hasNextJs,version:ts.nextVersion,url:'https://nextjs.org',desc:'Full-stack React framework'},
    {name:'Laravel',detected:ts.hasLaravel,url:'https://laravel.com',desc:'PHP web framework'},
    {name:'Symfony',detected:ts.hasSymfony,url:'https://symfony.com',desc:'PHP framework'},
    {name:'Django',detected:ts.hasDjango,url:'https://djangoproject.com',desc:'Python web framework'},
    {name:'Ruby on Rails',detected:ts.hasRubyOnRails,url:'https://rubyonrails.org',desc:'Ruby web framework'},
    {name:'Express',detected:ts.hasExpress,url:'https://expressjs.com',desc:'Node.js web framework'},
  ]);

  cat('JavaScript Libraries','📦',[
    {name:'jQuery',detected:ts.hasJQuery,version:ts.jqueryVersion,url:'https://jquery.com',desc:'DOM manipulation library'},
    {name:'Lodash',detected:ts.hasLodash,version:ts.lodashVersion,url:'https://lodash.com',desc:'Utility library for JS'},
    {name:'Framer Motion',detected:ts.hasFramerMotion,version:ts.framerVersion,url:'https://framer.com/motion',desc:'Animation library for React'},
    {name:'GSAP',detected:ts.hasGSAP,version:ts.gsapVersion,url:'https://greensock.com/gsap',desc:'Professional animation library'},
    {name:'Moment.js',detected:ts.hasMomentJs,version:ts.momentVersion,url:'https://momentjs.com',desc:'Date/time library'},
    {name:'D3.js',detected:ts.hasD3,version:ts.d3Version,url:'https://d3js.org',desc:'Data visualisation library'},
    {name:'Axios',detected:ts.hasAxios,version:ts.axiosVersion,url:'https://axios-http.com',desc:'HTTP client library'},
    {name:'Three.js',detected:ts.hasThreedJs,url:'https://threejs.org',desc:'3D graphics library'},
    {name:'Chart.js',detected:ts.hasChartJs,url:'https://chartjs.org',desc:'Canvas-based chart library'},
    {name:'Highcharts',detected:ts.hasHighcharts,version:ts.highchartsVersion,url:'https://highcharts.com',desc:'Interactive chart library'},
  ]);

  cat('CSS & UI Frameworks','🎨',[
    {name:'Bootstrap',detected:ts.hasBootstrap,version:ts.bootstrapVersion,url:'https://getbootstrap.com',desc:'Popular responsive CSS framework'},
    {name:'Tailwind CSS',detected:ts.hasTailwind,version:ts.tailwindVersion,url:'https://tailwindcss.com',desc:'Utility-first CSS framework'},
    {name:'Font Awesome',detected:ts.hasFontAwesome,url:'https://fontawesome.com',desc:'Icon font & SVG toolkit'},
    {name:'Material UI',detected:ts.hasMaterialUI,url:'https://mui.com',desc:'React UI component library'},
    {name:'Bulma',detected:ts.hasBulma,url:'https://bulma.io',desc:'Modern CSS framework'},
  ]);

  cat('Programming Languages','💻',[
    {name:'JavaScript',detected:ts.langJavaScript,url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript',desc:'Core web programming language'},
    {name:'TypeScript',detected:ts.langTypeScript,url:'https://typescriptlang.org',desc:'Typed superset of JavaScript'},
    {name:'PHP',detected:ts.langPHP,version:ts.phpVersion,url:'https://php.net',desc:'Server-side scripting language'},
    {name:'Python',detected:ts.langPython,url:'https://python.org',desc:'Server-side programming language'},
    {name:'Ruby',detected:ts.langRuby,url:'https://ruby-lang.org',desc:'Dynamic programming language'},
    {name:'Java',detected:ts.langJava,url:'https://java.com',desc:'Enterprise programming language'},
    {name:'Node.js',detected:ts.langNode,url:'https://nodejs.org',desc:'JavaScript runtime for server-side'},
    {name:'Go',detected:ts.langGo,url:'https://go.dev',desc:'Compiled server-side language by Google'},
    {name:'C# / ASP.NET',detected:ts.langCSharp,version:ts.aspnetVersion,url:'https://dotnet.microsoft.com',desc:'Microsoft .NET framework language'},
    {name:'Rust / WebAssembly',detected:ts.langRust,url:'https://www.rust-lang.org',desc:'Systems language with WASM support'},
  ]);

  cat('Ecommerce','🛒',[
    {name:'WooCommerce',detected:ts.hasWooCommerce,url:'https://woocommerce.com',desc:'WordPress e-commerce plugin'},
    {name:'Shopify',detected:ts.isShopify,url:'https://shopify.com',desc:'Hosted e-commerce platform'},
    {name:'Magento',detected:ts.isMagento,url:'https://magento.com',desc:'Adobe e-commerce platform'},
    {name:'BigCommerce',detected:ts.isBigCommerce,url:'https://bigcommerce.com',desc:'SaaS e-commerce platform'},
    {name:'PrestaShop',detected:ts.hasPrestaShop,url:'https://prestashop.com',desc:'Open-source e-commerce'},
    {name:'OpenCart',detected:ts.hasOpenCart,url:'https://opencart.com',desc:'Open-source shopping cart'},
    {name:'Ecwid',detected:ts.hasEcwid,url:'https://ecwid.com',desc:'Embeddable online store'},
    {name:'Snipcart',detected:ts.hasSnipcart,url:'https://snipcart.com',desc:'Developer-first cart'},
    {name:'Stripe',detected:ts.hasStripe,version:ts.stripeVersion,url:'https://stripe.com',desc:'Payment processing API'},
    {name:'PayPal',detected:ts.hasPaypal,url:'https://paypal.com',desc:'Digital payments'},
    {name:'Klarna',detected:ts.hasKlarna,url:'https://klarna.com',desc:'Buy Now Pay Later'},
    {name:'Shop Pay',detected:ts.hasShopPay,url:'https://shop.app',desc:'Shopify accelerated checkout'},
  ]);

  cat('Tag Managers','🏷️',[
    {name:'Google Tag Manager',detected:ts.hasGTM,url:'https://tagmanager.google.com',desc:'Tag management system by Google'},
    {name:'Adobe Launch',detected:ts.hasAdobeLaunch,url:'https://business.adobe.com',desc:'Adobe tag manager'},
    {name:'Tealium',detected:ts.hasTealium,url:'https://tealium.com',desc:'Enterprise tag management'},
    {name:'Ensighten',detected:ts.hasEnsighten,url:'https://ensighten.com',desc:'Tag management platform'},
  ]);

  cat('A/B Testing','🧪',[
    {name:'Optimizely',detected:ts.hasOptimizely,url:'https://optimizely.com',desc:'Experimentation platform'},
    {name:'Google Optimize',detected:ts.hasGoogleOptimize,url:'https://optimize.google.com',desc:'Website testing by Google'},
    {name:'VWO',detected:ts.hasVWO,url:'https://vwo.com',desc:'Visual Website Optimizer'},
    {name:'LaunchDarkly',detected:ts.hasLaunchDarkly,url:'https://launchdarkly.com',desc:'Feature flag management'},
    {name:'AB Tasty',detected:ts.hasABTasty,url:'https://abtasty.com',desc:'Experience optimization'},
    {name:'Unbounce',detected:ts.hasUnbounce,url:'https://unbounce.com',desc:'Landing page & testing'},
  ]);

  cat('Video Players','🎥',[
    {name:'YouTube Embed',detected:ts.hasYouTubeEmbed,url:'https://youtube.com',desc:'YouTube video embeds'},
    {name:'Vimeo Embed',detected:ts.hasVimeoEmbed,url:'https://vimeo.com',desc:'Vimeo video player'},
    {name:'Wistia',detected:ts.hasWistia,url:'https://wistia.com',desc:'Business video hosting'},
    {name:'Video.js',detected:ts.hasVideoJs,url:'https://videojs.com',desc:'Open-source HTML5 player'},
    {name:'Plyr',detected:ts.hasPlyr,url:'https://plyr.io',desc:'Lightweight media player'},
    {name:'JW Player',detected:ts.hasJWPlayer,url:'https://jwplayer.com',desc:'Enterprise video player'},
  ]);

  cat('Cookie Consent','🍪',[
    {name:'Cookiebot',detected:ts.hasCookiebot,url:'https://cookiebot.com',desc:'Cookie consent management'},
    {name:'OneTrust',detected:ts.hasOneTrust,url:'https://onetrust.com',desc:'Privacy management platform'},
    {name:'CookieYes',detected:ts.hasCookieYes,url:'https://cookieyes.com',desc:'Cookie consent solution'},
    {name:'Osano',detected:ts.hasOsano,url:'https://osano.com',desc:'Data privacy platform'},
    {name:'TrustArc',detected:ts.hasTrustArc,url:'https://trustarc.com',desc:'Privacy compliance platform'},
    {name:'Quantcast',detected:ts.hasQuantcast,url:'https://quantcast.com',desc:'Consent management'},
  ]);

  cat('Accessibility','♿',[
    {name:'accessiBe',detected:ts.hasAccessiBe,url:'https://accessibe.com',desc:'Web accessibility solution'},
    {name:'UserWay',detected:ts.hasUserWay,url:'https://userway.org',desc:'Accessibility widget'},
    {name:'AudioEye',detected:ts.hasAudioEye,url:'https://audioeye.com',desc:'Digital accessibility platform'},
  ]);

  cat('Advertising','📢',[
    {name:'Google AdSense',detected:ts.hasGoogleAdsense,url:'https://adsense.google.com',desc:'Display ads by Google'},
    {name:'Google Ads',detected:ts.hasGoogleAds,url:'https://ads.google.com',desc:'Google advertising platform'},
    {name:'DoubleClick',detected:ts.hasDoubleClick,url:'https://marketingplatform.google.com',desc:'Google ad serving'},
    {name:'AdRoll',detected:ts.hasAdRoll,url:'https://adroll.com',desc:'Retargeting & advertising'},
    {name:'Criteo',detected:ts.hasCriteo,url:'https://criteo.com',desc:'Performance advertising'},
    {name:'Taboola',detected:ts.hasTaboola,url:'https://taboola.com',desc:'Content discovery platform'},
    {name:'Outbrain',detected:ts.hasOutbrain,url:'https://outbrain.com',desc:'Content recommendation'},
  ]);

  cat('Search','🔍',[
    {name:'Algolia',detected:ts.hasAlgolia,url:'https://algolia.com',desc:'Search & discovery API'},
    {name:'Elasticsearch',detected:ts.hasElasticSearch,url:'https://elastic.co',desc:'Distributed search engine'},
    {name:'Meilisearch',detected:ts.hasMeiliSearch,url:'https://meilisearch.com',desc:'Lightning fast search API'},
    {name:'Typesense',detected:ts.hasTypesense,url:'https://typesense.org',desc:'Open-source search engine'},
  ]);

  cat('UI Components','🎠',[
    {name:'Swiper',detected:ts.hasSwiper,version:ts.swiperVersion,url:'https://swiperjs.com',desc:'Touch slider library'},
    {name:'Slick Carousel',detected:ts.hasSlick,url:'https://kenwheeler.github.io/slick',desc:'Responsive carousel'},
    {name:'Owl Carousel',detected:ts.hasOwlCarousel,url:'https://owlcarousel2.github.io',desc:'Touch enabled carousel'},
    {name:'Lightbox/Fancybox',detected:ts.hasLightbox,url:'https://fancyapps.com',desc:'Image lightbox overlay'},
  ]);

  cat('Web Servers','🖧',[
    {name:'Nginx',detected:ts.hasNginx,url:'https://nginx.org',desc:'High-performance web server'},
    {name:'Apache',detected:ts.hasApache,url:'https://httpd.apache.org',desc:'Open-source web server'},
    {name:'IIS',detected:ts.hasIIS,url:'https://iis.net',desc:'Microsoft web server'},
    {name:'LiteSpeed',detected:ts.hasLiteSpeed,url:'https://litespeedtech.com',desc:'High-performance web server'},
  ]);

  cat('Font Scripts','🔤',[
    {name:'Google Fonts',detected:ts.hasGoogleFonts,url:'https://fonts.google.com',desc:'Free web fonts by Google'},
    {name:'Adobe Fonts (Typekit)',detected:ts.hasAdobeFonts,url:'https://fonts.adobe.com',desc:'Premium fonts by Adobe'},
    {name:'Font Awesome',detected:ts.hasFontAwesome,url:'https://fontawesome.com',desc:'Icon font library'},
  ]);

  cat('Analytics','📊',[
    {name:'Google Analytics 4',detected:ts.hasGA4,url:'https://analytics.google.com',desc:'Web analytics by Google'},
    {name:'Google Analytics (UA)',detected:ts.hasGA3,url:'https://analytics.google.com',desc:'Universal Analytics (legacy)'},
    {name:'Google Tag Manager',detected:ts.hasGTM,url:'https://tagmanager.google.com',desc:'Tag management system'},
    {name:'Segment',detected:ts.hasSegment,url:'https://segment.com',desc:'Customer data platform'},
    {name:'Mixpanel',detected:ts.hasMixpanel,version:ts.mixpanelVersion,url:'https://mixpanel.com',desc:'Product analytics'},
    {name:'Amplitude',detected:ts.hasAmplitude,url:'https://amplitude.com',desc:'Digital analytics platform'},
    {name:'Heap',detected:ts.hasHeap,url:'https://heap.io',desc:'Auto-capture analytics'},
    {name:'Pendo',detected:ts.hasPendo,url:'https://pendo.io',desc:'Product analytics & guidance'},
    {name:'Hotjar',detected:ts.hasHotjar,url:'https://hotjar.com',desc:'Heatmaps & session recordings'},
    {name:'Microsoft Clarity',detected:ts.hasClarityMS,url:'https://clarity.microsoft.com',desc:'Free heatmap & session tool'},
    {name:'FullStory',detected:ts.hasFullstory,url:'https://fullstory.com',desc:'Digital experience analytics'},
    {name:'HubSpot Analytics',detected:ts.hasHubspotTrack,url:'https://hubspot.com',desc:'Marketing analytics'},
    {name:'Klaviyo',detected:ts.hasKlaviyo,url:'https://klaviyo.com',desc:'Email & SMS marketing'},
    {name:'Customer.io',detected:ts.hasCustomerIo,url:'https://customer.io',desc:'Marketing automation'},
  ]);

  cat('RUM','⏱️',[
    {name:'Datadog',detected:ts.hasDatadog,version:ts.datadogVersion,url:'https://datadoghq.com',desc:'Real user monitoring & APM'},
    {name:'New Relic',detected:ts.hasNewRelic,url:'https://newrelic.com',desc:'Observability platform'},
    {name:'LogRocket',detected:ts.hasLogRocket,url:'https://logrocket.com',desc:'Session replay & monitoring'},
  ]);

  cat('Issue Trackers','🐛',[
    {name:'Sentry',detected:ts.hasSentry,version:ts.sentryVersion,url:'https://sentry.io',desc:'Error tracking & performance monitoring'},
    {name:'Bugsnag',detected:ts.hasBugsnag,url:'https://bugsnag.com',desc:'Application stability monitoring'},
    {name:'Rollbar',detected:ts.hasRollbar,url:'https://rollbar.com',desc:'Real-time error tracking'},
    {name:'New Relic',detected:ts.hasNewRelic,url:'https://newrelic.com',desc:'Observability & error tracking'},
  ]);

  cat('Security','🛡️',[
    {name:'Cloudflare Bot Management',detected:ts.hasCloudflareBot,url:'https://cloudflare.com',desc:'Bot detection & mitigation'},
    {name:'hCaptcha',detected:ts.hasHCaptcha,url:'https://hcaptcha.com',desc:'Privacy-focused CAPTCHA'},
    {name:'Google reCAPTCHA',detected:ts.hasRecaptcha,url:'https://google.com/recaptcha',desc:'Bot protection by Google'},
    {name:'Cloudflare Turnstile',detected:ts.hasTurnstile,url:'https://cloudflare.com',desc:'Privacy-friendly CAPTCHA alternative'},
    {name:'Sift',detected:ts.hasSift,url:'https://sift.com',desc:'Fraud detection & prevention'},
    {name:'HSTS',detected:ts.hasHSTS,url:'https://developer.mozilla.org',desc:'HTTP Strict Transport Security'},
    {name:'Content Security Policy',detected:ts.hasCSP,url:'https://developer.mozilla.org',desc:'XSS protection header'},
    {name:'Subresource Integrity',detected:ts.hasSubresourceIntegrity,url:'https://developer.mozilla.org',desc:'Script/style integrity checks'},
  ]);

  cat('CDN','☁️',[
    {name:'Cloudflare',detected:ts.hasCloudflare,url:'https://cloudflare.com',desc:'CDN, DNS & security proxy'},
    {name:'AWS CloudFront',detected:ts.hasCloudFront,url:'https://aws.amazon.com/cloudfront',desc:'Amazon CDN'},
    {name:'Fastly',detected:ts.hasFastly,url:'https://fastly.com',desc:'Edge cloud platform'},
    {name:'Akamai',detected:ts.hasAkamaiCDN,url:'https://akamai.com',desc:'Enterprise CDN'},
    {name:'jsDelivr',detected:ts.hasjsDelivr,url:'https://jsdelivr.com',desc:'Free open-source CDN'},
    {name:'cdnjs',detected:ts.hasCDNjs,url:'https://cdnjs.com',desc:'Cloudflare-backed open-source CDN'},
    {name:'Google APIs',detected:ts.hasGoogleAPIs,url:'https://developers.google.com',desc:'Google hosted APIs & SDKs'},
  ]);

  cat('PaaS','🖥️',[
    {name:'Amazon Web Services',detected:ts.hasAWS,url:'https://aws.amazon.com',desc:'Cloud computing by Amazon'},
    {name:'Microsoft Azure',detected:ts.hasAzure,url:'https://azure.microsoft.com',desc:'Microsoft cloud platform'},
    {name:'Google Cloud',detected:ts.hasGCP,url:'https://cloud.google.com',desc:'Google cloud services'},
    {name:'Vercel',detected:ts.hasVercel,url:'https://vercel.com',desc:'Frontend cloud platform'},
    {name:'Netlify',detected:ts.hasNetlify,url:'https://netlify.com',desc:'Web hosting & automation'},
    {name:'Heroku',detected:ts.hasHeroku,url:'https://heroku.com',desc:'Cloud application platform'},
  ]);

  cat('Reverse Proxies','🔄',[
    {name:'Cloudflare',detected:ts.hasCloudflare,url:'https://cloudflare.com',desc:'Reverse proxy & CDN'},
    {name:'Envoy',detected:ts.hasEnvoy,url:'https://envoyproxy.io',desc:'Cloud-native proxy by CNCF'},
    {name:'Fastly',detected:ts.hasFastly,url:'https://fastly.com',desc:'Edge proxy & CDN'},
  ]);

  cat('Live Chat','💬',[
    {name:'Intercom',detected:ts.hasIntercom,url:'https://intercom.com',desc:'Customer messaging platform'},
    {name:'Drift',detected:ts.hasDrift,url:'https://drift.com',desc:'Conversational marketing'},
    {name:'Crisp',detected:ts.hasCrisp,url:'https://crisp.chat',desc:'Customer messaging'},
    {name:'Tidio',detected:ts.hasTidio,url:'https://tidio.com',desc:'Live chat + chatbot'},
    {name:'Zendesk',detected:ts.hasZendesk,url:'https://zendesk.com',desc:'Customer support platform'},
    {name:'LiveChat',detected:ts.hasLiveChat,url:'https://livechat.com',desc:'Live chat software'},
    {name:'Olark',detected:ts.hasOlark,url:'https://olark.com',desc:'Live chat widget'},
    {name:'Tawk.to',detected:ts.hasTawkTo,url:'https://tawk.to',desc:'Free live chat'},
  ]);

  cat('CRM','🤝',[
    {name:'Intercom',detected:ts.hasIntercom,url:'https://intercom.com',desc:'Customer relationship platform'},
    {name:'HubSpot',detected:ts.hasHubspotTrack,url:'https://hubspot.com',desc:'CRM + marketing suite'},
    {name:'Zendesk',detected:ts.hasZendesk,url:'https://zendesk.com',desc:'Customer service CRM'},
  ]);

  cat('Customer Data Platform','🔮',[
    {name:'Segment',detected:ts.hasSegment,url:'https://segment.com',desc:'CDP — collects & routes customer data'},
    {name:'Pendo',detected:ts.hasPendo,url:'https://pendo.io',desc:'Product analytics & user guidance'},
  ]);

  cat('Payment Processors','💳',[
    {name:'Stripe',detected:ts.hasStripe,version:ts.stripeVersion,url:'https://stripe.com',desc:'Online payment processing'},
    {name:'PayPal',detected:ts.hasPaypal,url:'https://paypal.com',desc:'Digital payments'},
    {name:'Verifone 2Checkout',detected:ts.hasVerifone2co,url:'https://2checkout.com',desc:'Global payment platform'},
    {name:'Klarna',detected:ts.hasKlarna,url:'https://klarna.com',desc:'Buy Now Pay Later'},
    {name:'Affirm',detected:ts.hasAffirm,url:'https://affirm.com',desc:'Buy Now Pay Later'},
    {name:'Shop Pay',detected:ts.hasShopPay,url:'https://shop.app',desc:'Shopify checkout'},
  ]);

  cat('Marketing','📣',[
    {name:'Meta (Facebook) Pixel',detected:ts.hasFBPixel,url:'https://developers.facebook.com',desc:'Meta conversion tracking'},
    {name:'LinkedIn Insight Tag',detected:ts.hasLinkedInInsight,url:'https://linkedin.com',desc:'LinkedIn conversion tracking'},
    {name:'TikTok Pixel',detected:ts.hasTiktokPixel,url:'https://tiktok.com',desc:'TikTok ads tracking'},
    {name:'Mailchimp',detected:ts.hasMailchimp,url:'https://mailchimp.com',desc:'Email marketing platform'},
    {name:'Klaviyo',detected:ts.hasKlaviyo,url:'https://klaviyo.com',desc:'Email & SMS marketing'},
    {name:'HubSpot',detected:ts.hasHubspotTrack,url:'https://hubspot.com',desc:'Inbound marketing suite'},
  ]);

  cat('Miscellaneous','✨',[
    {name:'Open Graph',detected:ts.hasOpenGraph,url:'https://ogp.me',desc:'Social sharing meta protocol'},
    {name:'PWA',detected:ts.hasPWA,url:'https://web.dev/progressive-web-apps',desc:'Progressive Web App manifest'},
    {name:'Service Worker',detected:ts.hasServiceWorker,url:'https://developer.mozilla.org',desc:'Offline & background processing'},
    {name:'AMP',detected:ts.hasAMP,url:'https://amp.dev',desc:'Accelerated Mobile Pages'},
    {name:'HTTP/3',detected:ts.hasHTTP3,url:'https://developer.mozilla.org',desc:'QUIC-based transport protocol'},
    {name:'Twitter Card',detected:ts.hasTwitterCard,url:'https://developer.twitter.com',desc:'Twitter rich preview meta'},
    {name:'JSON-LD Schema',detected:ts.hasJSONLD,url:'https://schema.org',desc:'Structured data markup'},
    {name:'Google Fonts',detected:ts.hasGoogleFonts,url:'https://fonts.google.com',desc:'Web fonts by Google'},
    {name:'Google Maps',detected:ts.hasGoogleMaps,url:'https://maps.google.com',desc:'Mapping & geolocation'},
    {name:'Priority Hints',detected:ts.hasPriorityHints,url:'https://developer.mozilla.org',desc:'fetchpriority resource hints'},
    {name:'Lazy Loading',detected:ts.hasLazyLoad,url:'https://developer.mozilla.org',desc:'Native browser lazy loading'},
    {name:'WebP Images',detected:ts.hasWebP,url:'https://developers.google.com/speed/webp',desc:'Modern image format'},
    {name:'Link Prefetch/Preload',detected:ts.hasPrefetch,url:'https://developer.mozilla.org',desc:'Resource hints for performance'},
    {name:'Hreflang',detected:ts.hasHreflang,url:'https://developers.google.com',desc:'Multilingual SEO signals'},
  ]);

  cat('Performance','⚡',[
    {name:'Priority Hints',detected:ts.hasPriorityHints,url:'https://developer.mozilla.org',desc:'Fetch priority resource hints'},
    {name:'Lazy Loading',detected:ts.hasLazyLoad,url:'https://developer.mozilla.org',desc:'Native img lazy loading'},
    {name:'Prefetch / Preload',detected:ts.hasPrefetch,url:'https://developer.mozilla.org',desc:'Resource hint tags'},
    {name:'WebP Images',detected:ts.hasWebP,url:'https://developers.google.com',desc:'Next-gen image format'},
    {name:'WP Rocket',detected:ts.hasWPRocket,url:'https://wp-rocket.me',desc:'WordPress caching & optimisation'},
    {name:'W3 Total Cache',detected:ts.hasW3Cache,url:'https://wordpress.org/plugins/w3-total-cache',desc:'WordPress performance plugin'},
    {name:'Service Worker',detected:ts.hasServiceWorker,url:'https://developer.mozilla.org',desc:'PWA & offline caching'},
  ]);

  cat('WordPress Plugins','🔌',[
    {name:'WooCommerce',detected:ts.hasWooCommerce,url:'https://woocommerce.com',desc:'WordPress e-commerce'},
    {name:'Yoast SEO',detected:ts.hasYoast,url:'https://yoast.com',desc:'WordPress SEO plugin'},
    {name:'Rank Math SEO',detected:ts.hasRankMath,url:'https://rankmath.com',desc:'SEO plugin for WordPress'},
    {name:'All In One SEO',detected:ts.hasAIOSEO,url:'https://aioseo.com',desc:'SEO plugin for WordPress'},
    {name:'Elementor',detected:ts.hasElementor,version:ts.elementorVersion,url:'https://elementor.com',desc:'WordPress page builder'},
    {name:'Divi Builder',detected:ts.hasDivi,url:'https://elegantthemes.com',desc:'WordPress theme & builder'},
    {name:'Beaver Builder',detected:ts.hasBeaverBuilder,url:'https://wpbeaverbuilder.com',desc:'WordPress page builder'},
    {name:'WPBakery',detected:ts.hasWPBakery,url:'https://wpbakery.com',desc:'WordPress page builder'},
    {name:'Gutenberg',detected:ts.hasGutenberg,url:'https://wordpress.org/gutenberg',desc:'WordPress block editor'},
    {name:'Contact Form 7',detected:ts.hasCF7,url:'https://contactform7.com',desc:'WordPress form plugin'},
    {name:'Gravity Forms',detected:ts.hasGravityForms,url:'https://gravityforms.com',desc:'Advanced WordPress forms'},
  ]);

  return cats;
}

function renderWappalyzer(d,ts){
  const cats=buildCategories(d,ts);
  const totalTechs=cats.reduce((a,c)=>a+c.items.length,0);

  // Summary in CMS tab
  const cmsTab=document.getElementById('dt-cms-content');
  if(cmsTab){
    const cmsData=cats.find(c=>c.name==='CMS');
    const cmsItem=cmsData?.items[0];
    let cmsHtml='';
    if(cmsItem){
      cmsHtml=`<div class="dt-cms-card">
        <div class="dt-cms-logo">${getCatIcon('CMS','🗂️')}</div>
        <div class="dt-cms-body">
          <div class="dt-cms-name">${esc(cmsItem.name)} ${cmsItem.version?`<span class="dt-version-badge">v${esc(cmsItem.version)}</span>`:''}</div>
          <div class="dt-cms-desc">${esc(cmsItem.desc||'')}</div>
        </div>
        <span class="dt-tech-badge detected">Detected</span>
      </div>`;
      // WordPress Theme Name
      if(ts.isWordPress && ts.wpThemeName){
        cmsHtml+=`<div class="dt-theme-card">
          <div class="dt-theme-icon">🎨</div>
          <div class="dt-theme-body">
            <div class="dt-theme-label">WordPress Theme</div>
            <div class="dt-theme-name">${esc(ts.wpThemeName)}</div>
            ${ts.wpChildTheme?`<div class="dt-theme-sub">Child theme of: <strong>${esc(ts.wpParentTheme)}</strong></div>`:''}
          </div>
        </div>`;
      }
      // Shopify Theme Name
      if(ts.isShopify && ts.shopifyThemeName){
        cmsHtml+=`<div class="dt-theme-card">
          <div class="dt-theme-icon">🎨</div>
          <div class="dt-theme-body">
            <div class="dt-theme-label">Shopify Theme</div>
            <div class="dt-theme-name">${esc(ts.shopifyThemeName)}</div>
          </div>
        </div>`;
      }
      // Generator Meta
      if(ts.generatorMeta || ts.cmsGenMeta){
        cmsHtml+=`<div class="dt-meta-row"><span class="dt-meta-label">Generator Meta:</span> <span class="dt-meta-val">${esc(ts.generatorMeta || ts.cmsGenMeta)}</span></div>`;
      }
    } else {
      cmsHtml=`<div class="dt-no-data"><div class="dt-no-data-icon">🌐</div><div>No common CMS detected. Site may use a custom stack, headless architecture, or a less common platform.</div></div>`;
    }
    cmsHtml+=`<div class="dt-wap-summary"><span class="dt-wap-total">${totalTechs}</span><span class="dt-wap-total-lbl"> technologies detected across ${cats.length} categories</span></div>`;
    cmsHtml+=`<div class="dt-section-title" style="margin-top:8px">All Detected Technologies</div>`;
    cmsHtml+=cats.map(c=>renderCategoryMini(c)).join('');
    cmsTab.innerHTML=cmsHtml;
  }
  showDtContent('cms');

  // Plugins tab
  const plugTab=document.getElementById('dt-plugins-content');
  if(plugTab){
    const plugCats=['WordPress Plugins','Ecommerce','CRM','Live Chat','Marketing','Advertising','Video Players','Search'];
    const filtered=cats.filter(c=>plugCats.includes(c.name));
    if(!filtered.length){
      plugTab.innerHTML=`<div class="dt-no-data"><div class="dt-no-data-icon">🔍</div><div>No plugins, CRM or chat tools detected.</div></div>`;
    } else {
      plugTab.innerHTML=filtered.map(c=>renderCategoryFull(c)).join('');
    }
  }
  showDtContent('plugins');

  // Stack tab
  const stackTab=document.getElementById('dt-stack-content');
  if(stackTab){
    const stackCats=['Programming Languages','JavaScript Frameworks','JavaScript Libraries','CSS & UI Frameworks','Web Frameworks','Static Site Generators','Analytics','RUM','Issue Trackers','Tag Managers','A/B Testing','UI Components'];
    const filtered=cats.filter(c=>stackCats.includes(c.name));
    if(!filtered.length){
      stackTab.innerHTML=`<div class="dt-no-data"><div class="dt-no-data-icon">🔍</div><div>No JS frameworks or libraries detected.</div></div>`;
    } else {
      stackTab.innerHTML=filtered.map(c=>renderCategoryFull(c)).join('');
    }
  }
  showDtContent('stack');

  // Hosting tab
  const hostTab=document.getElementById('dt-hosting-content');
  if(hostTab){
    const hostCats=['CDN','PaaS','Web Servers','Reverse Proxies','Security','Cookie Consent','Accessibility','Performance','Miscellaneous','Payment Processors','Customer Data Platform','Font Scripts'];
    const filtered=cats.filter(c=>hostCats.includes(c.name));
    const infraHtml=`<div class="dt-section-title">Site Infrastructure</div><div class="dt-tech-grid">
      <div class="dt-tech-item"><div class="dt-tech-icon">🌐</div><div class="dt-tech-body"><div class="dt-tech-name">Domain</div><div class="dt-tech-val">${esc(d.host||'—')}</div></div></div>
      <div class="dt-tech-item"><div class="dt-tech-icon">🔒</div><div class="dt-tech-body"><div class="dt-tech-name">HTTPS</div><div class="dt-tech-val">${d.isHttps?'✅ Active':'⚠️ Not active'}</div></div></div>
      <div class="dt-tech-item"><div class="dt-tech-icon">📜</div><div class="dt-tech-body"><div class="dt-tech-name">Scripts</div><div class="dt-tech-val">${d.scriptCount||0} loaded</div></div></div>
      <div class="dt-tech-item"><div class="dt-tech-icon">🎨</div><div class="dt-tech-body"><div class="dt-tech-name">Stylesheets</div><div class="dt-tech-val">${d.styleCount||0} loaded</div></div></div>
      <div class="dt-tech-item"><div class="dt-tech-icon">🔤</div><div class="dt-tech-body"><div class="dt-tech-name">Charset</div><div class="dt-tech-val">${esc(d.charset||'UTF-8')}</div></div></div>
      <div class="dt-tech-item"><div class="dt-tech-icon">🌍</div><div class="dt-tech-body"><div class="dt-tech-name">Language</div><div class="dt-tech-val">${esc(d.lang||'Not set')}</div></div></div>
      <div class="dt-tech-item"><div class="dt-tech-icon">🍪</div><div class="dt-tech-body"><div class="dt-tech-name">Cookies</div><div class="dt-tech-val">${ts.cookieCount||0} accessible</div></div></div>
      <div class="dt-tech-item"><div class="dt-tech-icon">📌</div><div class="dt-tech-body"><div class="dt-tech-name">Hreflang</div><div class="dt-tech-val">${d.hreflangs?.length?d.hreflangs.length+' tags':'Not set'}</div></div></div>
    </div>`;
    hostTab.innerHTML=infraHtml+filtered.map(c=>renderCategoryFull(c)).join('');
  }
  showDtContent('hosting');
}

function getCatIcon(name,fallback){
  const map={'CMS':'🗂️','JavaScript Frameworks':'⚛️','JavaScript Libraries':'📦','Analytics':'📊','CDN':'☁️','Security':'🛡️','Live Chat':'💬','CRM':'🤝','Payment Processors':'💳','WordPress Plugins':'🔌','Marketing':'📣','PaaS':'🖥️','RUM':'⏱️','Issue Trackers':'🐛','Performance':'⚡','Miscellaneous':'✨','Reverse Proxies':'🔄','Static Site Generators':'📄','Web Frameworks':'🔧','Customer Data Platform':'🔮','CSS & UI Frameworks':'🎨','Programming Languages':'💻','Ecommerce':'🛒','Tag Managers':'🏷️','A/B Testing':'🧪','Video Players':'🎥','Cookie Consent':'🍪','Accessibility':'♿','Advertising':'📢','Search':'🔍','UI Components':'🎠','Web Servers':'🖧','Font Scripts':'🔤'};
  return map[name]||fallback||'🔧';
}

function renderCategoryMini(cat){
  return `<div class="dt-cat-mini">
    <div class="dt-cat-mini-head"><span class="dt-cat-mini-icon">${getCatIcon(cat.name,'🔧')}</span><span class="dt-cat-mini-name">${esc(cat.name)}</span><span class="dt-cat-mini-count">${cat.items.length}</span></div>
    <div class="dt-cat-mini-chips">${cat.items.map(i=>`<span class="dt-chip">${esc(i.name)}${i.version?` <span class="dt-chip-ver">${esc(i.version)}</span>`:''}</span>`).join('')}</div>
  </div>`;
}

function renderCategoryFull(cat){
  return `<div class="dt-cat-block">
    <div class="dt-cat-head"><span class="dt-cat-icon">${getCatIcon(cat.name,'🔧')}</span><span class="dt-cat-name">${esc(cat.name)}</span><span class="dt-cat-count">${cat.items.length} detected</span></div>
    <div class="dt-cat-items">${cat.items.map(i=>renderTechItem(i)).join('')}</div>
  </div>`;
}

function renderTechItem(item){
  return `<a class="dt-wap-item" href="${esc(item.url||'#')}" target="_blank" title="${esc(item.desc||'')}">
    <div class="dt-wap-icon">${getTechIcon(item.name)}</div>
    <div class="dt-wap-body">
      <div class="dt-wap-name">${esc(item.name)}</div>
      <div class="dt-wap-desc">${esc(item.desc||'')}</div>
    </div>
    ${item.version?`<span class="dt-version-badge">${esc(item.version)}</span>`:''}
    <span class="dt-wap-arrow">↗</span>
  </a>`;
}

function getTechIcon(name){
  const icons={
    'WordPress':'🔵','Shopify':'🟢','Wix':'🟠','Squarespace':'⬛','Webflow':'💠','Drupal':'🔷','Joomla':'🟡','Ghost':'👻','Magento':'🛍️','BigCommerce':'🏪','Sanity':'⬜','Contentful':'🟦','Strapi':'🟣','HubSpot CMS':'🟠',
    'React':'⚛️','Vue.js':'💚','Angular':'🔴','Next.js':'⬛','Nuxt.js':'🟢','Svelte':'🔴','Alpine.js':'🏔️','Meteor':'☄️','Ember.js':'🐹','Astro':'🚀','Gatsby':'💜',
    'jQuery':'🎯','Lodash':'🔮','Framer Motion':'🎬','GSAP':'🌀','Moment.js':'🕐','D3.js':'📈','Axios':'📡','Three.js':'🔷','Chart.js':'📊',
    'Google Analytics 4':'📈','Google Analytics (UA)':'📉','Google Tag Manager':'🏷️','Segment':'🟦','Mixpanel':'🔮','Amplitude':'🎯','Heap':'🗂️','Pendo':'🎪','Hotjar':'🔥','Microsoft Clarity':'🪟','FullStory':'🎬','Datadog':'🐕','Sentry':'🔍','New Relic':'🟢','LogRocket':'🎥',
    'Meta (Facebook) Pixel':'📘','LinkedIn Insight Tag':'💼','TikTok Pixel':'🎵','Mailchimp':'🐒','Klaviyo':'📧','HubSpot':'🟠',
    'Cloudflare':'🟠','AWS CloudFront':'🟡','Fastly':'⚡','Akamai':'🔵','Amazon Web Services':'🟡','Microsoft Azure':'🔵','Google Cloud':'🔵','Vercel':'⬛','Netlify':'🟢','Heroku':'🟣',
    'Stripe':'💜','PayPal':'💙','Verifone 2Checkout':'💳','Klarna':'🩷','Affirm':'🔵',
    'Intercom':'💬','Drift':'🌊','Crisp':'🔔','Tidio':'💙','Zendesk':'🟢',
    'hCaptcha':'🟡','Google reCAPTCHA':'🛡️','Sift':'🔒','HSTS':'🔐','Cloudflare Bot Management':'🤖','Cloudflare Turnstile':'🔄',
    'WooCommerce':'🛒','Yoast SEO':'🟢','Rank Math SEO':'📊','Elementor':'🧩','Divi Builder':'✳️','Contact Form 7':'📬','Gravity Forms':'📋','WP Rocket':'🚀','W3 Total Cache':'⚡','Gutenberg':'📦',
    'Open Graph':'📸','PWA':'📲','HTTP/3':'⚡','Priority Hints':'🚦','Service Worker':'⚙️','JSON-LD Schema':'📋','Google Fonts':'🔤','Google Maps':'🗺️',
    'Envoy':'🔄','Laravel':'🔴','Symfony':'🟣','Django':'🟢','Ruby on Rails':'🔴','Express':'🟡',
    // Programming Languages
    'JavaScript':'🟨','TypeScript':'🔷','PHP':'🐘','Python':'🐍','Ruby':'💎','Java':'☕','Node.js':'🟩','Go':'🐹','C# / ASP.NET':'🟪','Rust / WebAssembly':'🦀',
    // New categories
    'Bootstrap':'🅱️','Tailwind CSS':'🌊','Material UI':'Ⓜ️','Bulma':'🟢','Font Awesome':'🏴',
    'PrestaShop':'🛍️','OpenCart':'🛒','Ecwid':'🏪','Snipcart':'🛒','Shop Pay':'🟢',
    'Adobe Launch':'🔴','Tealium':'🔵','Ensighten':'🟡',
    'Optimizely':'🟦','Google Optimize':'📊','VWO':'🔴','LaunchDarkly':'⬛','AB Tasty':'🟣','Unbounce':'🟡',
    'YouTube Embed':'🔴','Vimeo Embed':'🔵','Wistia':'🟢','Video.js':'📹','Plyr':'▶️','JW Player':'🟠',
    'Cookiebot':'🍪','OneTrust':'🔒','CookieYes':'🍪','Osano':'🟢','TrustArc':'🔵','Quantcast':'📊',
    'accessiBe':'♿','UserWay':'♿','AudioEye':'♿',
    'Google AdSense':'📢','Google Ads':'📣','DoubleClick':'🔀','AdRoll':'🔄','Criteo':'🟠','Taboola':'📰','Outbrain':'📰',
    'Algolia':'🔍','Elasticsearch':'🔎','Meilisearch':'🔍','Typesense':'🔍',
    'Swiper':'🎠','Slick Carousel':'🎠','Owl Carousel':'🦉','Lightbox/Fancybox':'🖼️',
    'Nginx':'🟢','Apache':'🪶','IIS':'🔵','LiteSpeed':'⚡',
    'Adobe Fonts (Typekit)':'🅰️',
    'Highcharts':'📊',
  };
  return icons[name]||'🔧';
}
