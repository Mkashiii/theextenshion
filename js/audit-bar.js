(function(){
  /* Helper: animate a number from 0 → target */
  function countUp(el, target){
    if(!el||isNaN(target)) return;
    let n=0, steps=30, inc=Math.ceil(target/steps);
    const t=setInterval(()=>{
      n=Math.min(n+inc,target);
      el.textContent=n;
      if(n>=target) clearInterval(t);
    },28);
  }

  /* Helper: set bar width & percentage label */
  function setBar(barId, pctId, value, max){
    const bar=document.getElementById(barId);
    const lbl=document.getElementById(pctId);
    if(!bar) return;
    const pct=Math.min(Math.round((value/max)*100),100);
    // slight delay so CSS transition fires
    setTimeout(()=>{ bar.style.width=pct+'%'; },180);
    if(lbl) lbl.textContent = value>0 ? pct+'% of max' : '';
  }

  /* Watch for popup.js to populate the audit tiles.
     We use a MutationObserver on each element. */
  function watchAndAnimate(){
    const ids=['saTotalPages','saBlogPosts','saExtLinks','saTechScore'];
    const bars={
      saTotalPages:  {barId:'barPages',  pctId:'pctPages',  max:500},
      saBlogPosts:   {barId:'barBlog',   pctId:'pctBlog',   max:200},
      saExtLinks:    {barId:'barExt',    pctId:'pctExt',    max:500},
      saTechScore:   {barId:'barHealth', pctId:'pctHealth', max:100},
    };

    ids.forEach(id=>{
      const el=document.getElementById(id);
      if(!el) return;
      const cfg=bars[id];
      const obs=new MutationObserver(()=>{
        const raw=parseInt(el.textContent,10);
        if(!isNaN(raw) && raw>0){
          obs.disconnect();
          countUp(el,raw);
          setBar(cfg.barId,cfg.pctId,raw,cfg.max);
        }
      });
      obs.observe(el,{childList:true,subtree:true,characterData:true});
    });
  }

  // run after DOM ready
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',watchAndAnimate);
  } else {
    watchAndAnimate();
  }
})();
