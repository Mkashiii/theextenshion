// 7th Club SEO Analyzer Pro — Content Script v5
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'getSEOData') {
    try { sendResponse({ success: true, data: collectAll() }); }
    catch(e) { sendResponse({ success: false, error: e.message }); }
  }
  return true;
});

function collectAll() {
  const d = {};
  const metas = {};
  document.querySelectorAll('meta').forEach(m => {
    const n = m.getAttribute('name') || m.getAttribute('property') || m.getAttribute('http-equiv');
    const c = m.getAttribute('content');
    if (n && c !== null) metas[n.toLowerCase()] = c;
  });

  d.url = location.href; d.host = location.hostname; d.protocol = location.protocol;
  d.isHttps = location.protocol === 'https:';
  d.metas = metas;
  d.titleTag = (document.querySelector('title')||{}).textContent?.trim()||'';
  d.description = metas['description']||''; d.keywords = metas['keywords']||'';
  d.robots = metas['robots']||metas['googlebot']||'';
  d.viewport = metas['viewport']||''; d.author = metas['author']||'';
  d.canonical = (document.querySelector('link[rel="canonical"]')||{}).href||'';
  d.lang = document.documentElement.lang||'';
  d.charset = document.characterSet||'UTF-8';
  d.doctype = document.doctype?.name?.toUpperCase()||'Missing';

  const og={}, tw={};
  Object.entries(metas).forEach(([k,v])=>{ if(k.startsWith('og:'))og[k]=v; if(k.startsWith('twitter:'))tw[k]=v; });
  d.openGraph=og; d.twitter=tw;

  const headings=[];
  document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h=>{ headings.push({level:+h.tagName[1],text:h.textContent.trim().slice(0,150)}); });
  d.headings=headings; d.h1Count=headings.filter(h=>h.level===1).length;

  const origin=location.origin, links=[];
  document.querySelectorAll('a[href]').forEach(a=>{
    const href=a.href||'';
    if(!href||href.startsWith('javascript:')||href.startsWith('mailto:')||href.startsWith('tel:'))return;
    const rel=a.getAttribute('rel')||'', isExt=href.startsWith('http')&&!href.startsWith(origin);
    links.push({href,text:a.textContent.trim().slice(0,80),rel,isExternal:isExt,nofollow:rel.includes('nofollow'),sponsored:rel.includes('sponsored'),ugc:rel.includes('ugc'),newTab:a.target==='_blank',hasTitle:!!a.title});
  });
  d.links=links; d.internalLinks=links.filter(l=>!l.isExternal); d.externalLinks=links.filter(l=>l.isExternal);
  d.nofollowLinks=links.filter(l=>l.nofollow); d.brokenAnchors=links.filter(l=>l.href==='#'||l.href===location.href+'#').length;

  const images=[];
  document.querySelectorAll('img').forEach(img=>{ images.push({src:img.src,alt:img.getAttribute('alt'),hasAlt:img.hasAttribute('alt'),altEmpty:img.getAttribute('alt')==='',width:img.naturalWidth,height:img.naturalHeight,loading:img.getAttribute('loading'),decoding:img.getAttribute('decoding'),srcset:!!img.getAttribute('srcset'),title:img.getAttribute('title')||''}); });
  d.images=images; d.imagesWithAlt=images.filter(i=>i.hasAlt&&!i.altEmpty).length;
  d.imagesMissing=images.filter(i=>!i.hasAlt||i.altEmpty).length;
  d.imagesLazy=images.filter(i=>i.loading==='lazy').length;
  d.imagesResponsive=images.filter(i=>i.srcset).length;

  const schemas=[];
  document.querySelectorAll('script[type="application/ld+json"]').forEach(s=>{ try{ const p=JSON.parse(s.textContent); if(Array.isArray(p))p.forEach(i=>schemas.push(i)); else schemas.push(p); }catch(e){} });
  d.structuredData=schemas;

  const bodyText=document.body?.innerText||'';
  d.wordCount=bodyText.trim().split(/\s+/).filter(Boolean).length;
  d.hasLazyImgs=d.imagesLazy>0;
  d.scriptCount=document.querySelectorAll('script').length;
  d.styleCount=document.querySelectorAll('link[rel="stylesheet"]').length;
  d.inlineStyles=document.querySelectorAll('[style]').length;
  d.hasFacebook=!!(metas['og:type']||og['og:url']); d.hasTwitterCard=!!(tw['twitter:card']);
  const favicon=document.querySelector('link[rel~="icon"]'); d.favicon=favicon?favicon.href:'';
  const hreflangs=[]; document.querySelectorAll('link[hreflang]').forEach(l=>hreflangs.push({lang:l.hreflang,href:l.href})); d.hreflangs=hreflangs;
  const rc=(d.robots||'').toLowerCase(); d.isNoindex=rc.includes('noindex'); d.isNofollow=rc.includes('nofollow');
  if(window.performance?.getEntriesByType){ const nav=performance.getEntriesByType('navigation')[0]; if(nav){ d.domContentLoaded=Math.round(nav.domContentLoadedEventEnd); d.loadTime=Math.round(nav.loadEventEnd); d.ttfb=Math.round(nav.responseStart-nav.requestStart); } }

  // Safe tech signals collection — won't crash collectAll if something fails
  try { d.techSignals = collectTechSignals(metas, d); } catch(e) { d.techSignals = { _error: e.message }; }
  return d;
}

function sv(val) {
  try { return val ? String(val).trim() : ''; } catch(e) { return ''; }
}

function collectTechSignals(metas, d) {
  const ts = {};

  // Reconstruct twitter meta from metas (tw is only in collectAll scope)
  const tw = {};
  Object.entries(metas).forEach(([k,v])=>{ if(k.startsWith('twitter:')) tw[k]=v; });

  // ── Collect all script[src] and link[href] values ──
  const sSrcs = [];
  document.querySelectorAll('script').forEach(s => {
    const src = s.getAttribute('src') || '';
    if (src) sSrcs.push(src.toLowerCase());
    // Also capture inline script text for pattern matching (first 5kb each)
    else ts._inlineCache = (ts._inlineCache||'') + (s.textContent||'').slice(0,5000) + ' ';
  });
  const lHrefs = [];
  document.querySelectorAll('link[href]').forEach(l => lHrefs.push((l.getAttribute('href')||'').toLowerCase()));
  const allSrcs = [...sSrcs, ...lHrefs];

  // Inline JS (all inline scripts combined, lowercased)
  const inJS = (ts._inlineCache||'').toLowerCase();
  delete ts._inlineCache;

  // Full HTML of the page (first 300kb) — catches everything in head + body
  const html = (document.documentElement.outerHTML||'').slice(0, 300000).toLowerCase();

  // Body and HTML class attributes
  const bodyClass = (document.body ? document.body.className : '').toLowerCase();
  const htmlClass = document.documentElement.className.toLowerCase();

  // Generator meta (the single most reliable CMS signal)
  const gen = (metas['generator']||'').toLowerCase();

  // Window globals
  const W = window;

  // Helper functions
  const hasSrc  = (p) => allSrcs.some(s => s.includes(p));
  const hasHTML = (p) => html.includes(p);
  const hasJS   = (p) => inJS.includes(p);
  const hasDOM  = (sel) => { try { return !!document.querySelector(sel); } catch(e) { return false; } };
  const hasWin  = (key) => { try { return !!W[key]; } catch(e) { return false; } };
  const winVer  = (expr) => { try { const v = expr(); return v ? String(v).trim() : ''; } catch(e) { return ''; } };

  // ── CMS ──
  ts.isWordPress    = !!(gen.includes('wordpress') || hasSrc('wp-content') || hasSrc('wp-includes') || hasHTML('/wp-content/') || hasHTML('wp-json') || hasHTML('wp-emoji') || gen.includes('elementor') /* Elementor only runs on WP */);
  ts.wpVersion      = winVer(()=>W.wpApiSettings?.version) || sv((metas['generator']||'').match(/WordPress\s*([\d.]+)/i)?.[1]);
  ts.isShopify      = !!(gen.includes('shopify') || hasSrc('cdn.shopify') || hasHTML('myshopify.com') || hasHTML('shopify.theme') || hasHTML('cdn.shopify.com'));
  ts.isWix          = !!(hasSrc('wixstatic.com') || hasSrc('wix.com') || hasHTML('wixstatic.com') || gen.includes('wix'));
  ts.isSquarespace  = !!(hasSrc('squarespace.com') || hasSrc('sqspcdn.com') || gen.includes('squarespace'));
  ts.isWebflow      = !!(hasDOM('[data-wf-page]') || hasHTML('webflow.com') || gen.includes('webflow') || hasSrc('webflow'));
  ts.isDrupal       = !!(gen.includes('drupal') || hasSrc('drupal') || hasHTML('drupal.js') || hasHTML('/sites/default/'));
  ts.isJoomla       = !!(gen.includes('joomla') || hasSrc('/media/jui/') || hasHTML('/components/com_'));
  ts.isGhost        = !!(gen.includes('ghost') || hasSrc('ghost.io') || hasHTML('ghost-theme'));
  ts.isMagento      = !!(hasHTML('magento') || hasHTML('mage/') || hasSrc('magento'));
  ts.isBigCommerce  = !!(hasHTML('bigcommerce') || hasSrc('bigcommerce.com'));
  ts.isGatsby       = !!(hasDOM('[data-gatsby]') || hasHTML('gatsby-chunk') || hasSrc('gatsby'));
  ts.isHubspotCMS   = !!(hasSrc('hs-sites.com') || (hasSrc('hs-scripts.com') && hasSrc('hs-analytics')));
  ts.isSanity       = !!(hasHTML('sanity.io') || hasSrc('sanity.io') || hasHTML('cdn.sanity.io') || hasWin('sanity'));
  ts.sanityVersion  = winVer(()=>W.sanity?.VERSION);
  ts.isContentful   = !!(hasSrc('contentful.com') || hasHTML('ctfassets.net'));
  ts.isStrapi       = !!(hasSrc('strapi.io') || hasHTML('strapi'));
  ts.cmsGenMeta     = metas['generator'] || '';

  // ── JS Frameworks ──
  ts.hasReact       = !!(hasDOM('[data-reactroot],[data-reactid]') || hasSrc('react') || hasHTML('react.production') || hasHTML('react.development') || hasWin('React') || hasWin('__REACT_VERSION'));
  ts.reactVersion   = winVer(()=>W.React?.version) || sv(html.match(/react[/@](\d+\.\d+[\.\d]*)/)?.[1]);

  ts.hasNextJs      = !!(hasDOM('#__NEXT_DATA__') || hasSrc('_next/') || hasHTML('__next_data__') || hasHTML('_nextjs') || hasWin('next'));
  ts.nextVersion    = winVer(()=>W.next?.version) || (() => { try { const d2=document.querySelector('#__NEXT_DATA__'); if(d2){ const j=JSON.parse(d2.textContent||'{}'); return j.nextExport||''; } } catch(e){} return ''; })() || sv(html.match(/next[/@](\d+\.\d+[\.\d]*)/)?.[1]);

  ts.hasVue         = !!(hasDOM('[data-v-app],[__vue__]') || hasSrc('vue.js') || hasSrc('vue.min') || hasHTML('__vue_app__') || hasWin('Vue') || hasWin('__VUE__'));
  ts.vueVersion     = winVer(()=>W.Vue?.version) || sv(html.match(/vue[/@](\d+\.\d+[\.\d]*)/)?.[1]);

  ts.hasAngular     = !!(hasDOM('[ng-version],[ng-app]') || hasSrc('angular') || hasHTML('ng-version'));
  ts.angularVersion = sv(document.querySelector('[ng-version]')?.getAttribute('ng-version')) || sv(html.match(/angular[/@](\d+\.\d+[\.\d]*)/)?.[1]);

  ts.hasNuxt        = !!(hasHTML('__nuxt__') || hasHTML('_nuxt/') || hasSrc('_nuxt'));
  ts.nuxtVersion    = winVer(()=>W.__nuxt__?.config?.nuxtVersion) || sv(html.match(/nuxt[/@](\d+\.\d+[\.\d]*)/)?.[1]);

  ts.hasSvelte      = !!(hasSrc('svelte') || hasHTML('svelte-'));
  ts.hasAlpineJs    = !!(hasSrc('alpinejs') || hasDOM('[x-data]') || hasHTML('x-data='));
  ts.alpineVersion  = winVer(()=>W.Alpine?.version) || sv(html.match(/alpinejs[/@](\d+\.\d+[\.\d]*)/)?.[1]);

  ts.hasMeteor      = !!(hasWin('Meteor') || hasHTML('meteor.js'));
  ts.hasEmber       = !!(hasWin('Ember') || hasSrc('ember.js'));
  ts.hasAstro       = !!(hasHTML('astro-island') || hasSrc('/_astro/') || hasHTML('astro'));

  // ── JS Libraries ──
  ts.hasJQuery      = !!(hasSrc('jquery') || hasHTML('jquery') || hasWin('jQuery'));
  ts.jqueryVersion  = winVer(()=>W.jQuery?.fn?.jquery) || winVer(()=>W.$?.fn?.jquery) || sv(html.match(/jquery[/@v](\d+\.\d+[\.\d]*)/i)?.[1]);

  ts.hasLodash      = !!(hasSrc('lodash') || hasHTML('lodash') || hasJS('lodash') || (hasWin('_') && W._?.VERSION));
  ts.lodashVersion  = winVer(()=>W._?.VERSION) || sv(html.match(/lodash[/@](\d+\.\d+[\.\d]*)/)?.[1]);

  ts.hasFramerMotion= !!(hasSrc('framer-motion') || hasHTML('framer-motion') || hasWin('FramerMotion'));
  ts.framerVersion  = winVer(()=>W.FramerMotion?.version) || sv(html.match(/framer-motion[/@](\d+\.\d+[\.\d]*)/)?.[1]);

  ts.hasMomentJs    = !!(hasWin('moment') || hasSrc('moment.js') || hasSrc('moment.min'));
  ts.momentVersion  = winVer(()=>W.moment?.version);

  ts.hasD3          = !!(hasWin('d3') || hasSrc('d3.js') || hasSrc('d3.min'));
  ts.d3Version      = winVer(()=>W.d3?.version);

  ts.hasAxios       = !!(hasWin('axios') || hasSrc('axios'));
  ts.axiosVersion   = winVer(()=>W.axios?.VERSION);

  ts.hasHighcharts  = !!(hasWin('Highcharts') || hasSrc('highcharts'));
  ts.highchartsVersion = winVer(()=>W.Highcharts?.version);

  ts.hasChartJs     = !!(hasWin('Chart') || hasSrc('chart.js'));
  ts.hasThreedJs    = !!(hasWin('THREE') || hasSrc('three.js') || hasSrc('three.min'));
  ts.hasGSAP        = !!(hasWin('gsap') || hasSrc('gsap'));
  ts.gsapVersion    = winVer(()=>W.gsap?.version);

  // ── CSS Frameworks ──
  ts.hasBootstrap   = !!(hasSrc('bootstrap') || hasDOM('[class*="col-md-"],[class*="col-sm-"],[class*="col-lg-"],[class*="container-fluid"]') || hasHTML('bootstrap.min.css'));
  ts.bootstrapVersion = sv(html.match(/bootstrap[/@](\d+\.\d+[\.\d]*)/)?.[1]);
  ts.hasTailwind    = !!(hasSrc('tailwind') || hasHTML('tailwindcss') || hasDOM('[class*="text-sm"][class*="font-"]'));
  ts.tailwindVersion= sv(html.match(/tailwindcss[/@](\d+\.\d+[\.\d]*)/)?.[1]);
  ts.hasFontAwesome = !!(hasSrc('font-awesome') || hasSrc('fontawesome') || hasDOM('.fa,.fas,.far,.fab') || hasHTML('font-awesome'));
  ts.hasMaterialUI  = !!(hasSrc('material-ui') || hasSrc('@mui') || hasHTML('muibutton') || hasHTML('makeStyles'));
  ts.hasBulma       = !!(hasSrc('bulma') || hasHTML('bulma.min.css'));

  // ── Web Frameworks ──
  ts.hasLaravel     = !!(hasHTML('laravel_session') || hasHTML('laravel') || hasSrc('laravel'));
  ts.hasSymfony     = !!(hasHTML('symfony') || hasSrc('symfony'));
  ts.hasDjango      = !!(hasDOM('input[name="csrfmiddlewaretoken"]') || hasHTML('django'));
  ts.hasRubyOnRails = !!(hasHTML('authenticity_token') || hasHTML('rails') || hasSrc('rails'));
  ts.hasExpress     = hasJS('x-powered-by: express');
  ts.hasFlask       = hasHTML('flask');

  // ── WordPress Plugins ── (KEY FIX: check HTML broadly, not just script srcs)
  ts.hasWooCommerce   = !!(hasHTML('woocommerce') || hasSrc('woocommerce') || hasDOM('.woocommerce') || hasHTML('/woocommerce/'));
  ts.hasYoast         = !!(hasHTML('yoast') || hasSrc('yoast') || hasHTML('yoast seo') || hasHTML('<!-- this site is optimized with the yoast'));
  ts.hasRankMath      = !!(hasHTML('rank-math') || hasHTML('rankmath') || hasSrc('rank-math') || hasHTML('rank_math'));
  ts.hasAIOSEO        = !!(hasHTML('aioseo') || hasSrc('aioseo') || hasHTML('all-in-one-seo'));
  ts.hasSEOPress      = !!(hasHTML('seopress') || hasSrc('seopress'));
  // CRITICAL: Also check generator meta for Elementor
  ts.hasElementor     = !!(gen.includes('elementor') || hasDOM('[data-elementor-type],[class*="elementor-widget-"],[class*="elementor-section"]') || hasSrc('elementor') || hasHTML('/elementor/') || hasHTML('elementor-frontend') || hasHTML('elementor/assets'));
  ts.elementorVersion = winVer(()=>W.elementorFrontend?.config?.version) || sv((metas['generator']||'').match(/Elementor\s*([\d.]+)/i)?.[1]) || sv(html.match(/elementor[/@](\d+\.\d+[\.\d]*)/)?.[1]);
  ts.hasDivi          = !!(hasHTML('et_pb_') || bodyClass.includes('et-db') || hasSrc('divi') || hasHTML('elegant-themes'));
  ts.hasBeaverBuilder = !!(hasHTML('fl-builder') || hasSrc('fl-builder') || hasDOM('[class*="fl-builder"]'));
  ts.hasWPBakery      = !!(hasHTML('vc_row') || hasHTML('wpb_wrapper') || hasSrc('js_composer') || hasDOM('[class*="vc_row"]'));
  ts.hasGutenberg     = !!(hasHTML('wp-block-') || hasDOM('[class*="wp-block-"]') || hasHTML('gutenberg'));
  ts.hasCF7           = !!(hasDOM('.wpcf7,.wpcf7-form') || hasSrc('contact-form-7') || hasHTML('contact-form-7'));
  ts.hasGravityForms  = !!(hasDOM('.gform_wrapper,.gform_body') || hasSrc('gravityforms') || hasHTML('gform_'));
  ts.hasWPRocket      = !!(hasHTML('wp-rocket') || hasSrc('wp-rocket') || hasHTML('<!-- This website is like a Rocket'));
  ts.hasW3Cache       = !!(hasHTML('w3tc') || hasSrc('w3tc') || hasHTML('w3 total cache'));
  ts.hasWPSuperCache  = !!(hasHTML('wp super cache') || hasHTML('supercache'));
  ts.hasACF           = !!(hasSrc('acf') || hasHTML('/acf/') || hasHTML('advanced-custom-fields') || hasWin('acf'));
  ts.hasPolylang      = !!(hasSrc('polylang') || hasHTML('polylang'));
  ts.hasWPML          = !!(hasSrc('wpml') || hasHTML('wpml') || hasHTML('/sitepress-multilingual-cms/'));
  ts.hasWPForms       = !!(hasSrc('wpforms') || hasHTML('wpforms') || hasDOM('.wpforms-form'));
  ts.hasMailPoet      = !!(hasSrc('mailpoet') || hasHTML('mailpoet'));
  ts.hasMonsterInsights = !!(hasSrc('google-analytics-for-wordpress') || hasHTML('monsterinsights') || hasHTML('monster-insights'));

  // ── Analytics & Tracking ──
  ts.hasGA4           = !!(hasJS("gtag('config'") || hasJS('gtag("config"') || hasHTML("gtag('config'") || hasHTML('gtag("config"') || hasSrc('gtag/js'));
  ts.hasGA3           = !!(hasSrc('google-analytics.com/analytics.js') || hasJS("'ua-") || hasJS('"ua-') || hasHTML('analytics.js'));
  ts.hasGTM           = !!(hasSrc('googletagmanager.com/gtm') || hasJS('googletagmanager.com') || hasHTML('googletagmanager.com/gtm'));
  ts.hasFBPixel       = !!(hasJS("fbq('init'") || hasJS("fbq('track'") || hasHTML("fbq('init'") || hasSrc('connect.facebook.net') || hasHTML('facebook-jssdk'));
  ts.hasHotjar        = !!(hasJS('hotjar') || hasSrc('hotjar.com') || hasHTML('hotjar'));
  ts.hasMixpanel      = !!(hasWin('mixpanel') || hasSrc('mixpanel') || hasHTML('mixpanel'));
  ts.hasSegment       = !!(hasSrc('cdn.segment.com') || hasSrc('segment.com') || hasJS('analytics.identify') || hasHTML('cdn.segment.com'));
  ts.hasDatadog       = !!(hasSrc('datadoghq.com') || hasSrc('browser-sdk') || hasHTML('datadog'));
  ts.datadogVersion   = sv(html.match(/datadog[/@](\d+\.\d+[\.\d]*)/)?.[1]);
  ts.hasClarityMS     = !!(hasJS('clarity') || hasSrc('clarity.ms') || hasHTML('clarity.ms'));
  ts.hasFullstory     = !!(hasJS('fullstory') || hasSrc('fullstory.com') || hasHTML('fullstory.com'));
  ts.hasHeap          = !!(hasWin('heap') || hasSrc('heap-analytics') || hasHTML('heap.load') || hasJS('heap.load'));
  ts.hasAmplitude     = !!(hasWin('amplitude') || hasSrc('amplitude.com') || hasSrc('amplitude-js') || hasHTML('amplitude.com'));
  ts.hasPendo         = !!(hasWin('pendo') || hasSrc('pendo.io') || hasSrc('cdn.pendo.io'));
  ts.hasHubspotTrack  = !!(hasSrc('hs-scripts.com') || hasSrc('js.hs-analytics.net') || hasSrc('hubspot') || hasHTML('hs-scripts.com'));
  ts.hasLinkedInInsight= !!(hasJS('linkedin.com/px') || hasSrc('snap.licdn.com') || hasHTML('snap.licdn.com'));
  ts.hasTiktokPixel   = !!(hasHTML('analytics.tiktok.com') || hasSrc('analytics.tiktok.com') || hasHTML('ttq.track'));
  ts.hasKlaviyo       = !!(hasSrc('klaviyo.com') || hasHTML('klaviyo') || hasJS('klaviyo'));
  ts.hasCustomerIo    = !!(hasSrc('customer.io') || hasSrc('track.customer.io'));
  ts.hasIntercom      = !!(hasSrc('intercomcdn.com') || hasSrc('intercom.io') || hasJS('intercom(') || hasHTML('intercomcdn.com'));
  ts.hasHubspotChat   = !!(hasSrc('js.usemessages.com') || (hasSrc('hs-scripts.com') && hasHTML('leadin')));
  ts.hasDrift         = !!(hasSrc('drift.com') || hasJS('drift.load') || hasHTML('drift.com'));
  ts.hasCrisp         = !!(hasSrc('crisp.chat') || hasJS('$crisp') || hasHTML('crisp.chat'));
  ts.hasTidio         = !!(hasSrc('tidio') || hasJS('tidiochatcode') || hasHTML('tidio'));
  ts.hasZendesk       = !!(hasSrc('zdassets.com') || hasSrc('zendesk.com') || hasHTML('zdassets.com'));
  ts.hasFreshdesk     = !!(hasSrc('freshdesk.com') || hasSrc('freshwidget') || hasHTML('freshdesk'));
  ts.hasLiveChat      = !!(hasSrc('livechatinc.com') || hasHTML('livechatinc.com'));
  ts.hasTawkTo        = !!(hasSrc('tawk.to') || hasSrc('embed.tawk.to') || hasHTML('tawk.to'));
  ts.hasOlark         = !!(hasSrc('olark.com') || hasHTML('olark.identify'));

  // ── Issue Trackers ──
  ts.hasSentry        = !!(hasSrc('sentry.io') || hasSrc('browser.sentry-cdn.com') || hasHTML('sentry') || hasWin('Sentry'));
  ts.sentryVersion    = winVer(()=>W.Sentry?.SDK_VERSION) || sv(html.match(/sentry[/@](\d+\.\d+[\.\d]*)/i)?.[1]);
  ts.hasBugsnag       = !!(hasSrc('bugsnag.com') || hasWin('Bugsnag') || hasHTML('bugsnag'));
  ts.hasRollbar       = !!(hasSrc('rollbar.com') || hasWin('Rollbar') || hasHTML('rollbar'));
  ts.hasLogRocket     = !!(hasSrc('logrocket.com') || hasSrc('lr-ingest.io') || hasHTML('logrocket'));
  ts.hasNewRelic      = !!(hasSrc('newrelic.com') || hasHTML('NREUM') || hasWin('NREUM'));

  // ── Security ──
  ts.hasSift          = !!(hasSrc('sift.com') || hasSrc('siftscience.com') || hasSrc('cdn.sift.com') || hasHTML('sift.js') || hasHTML('siftscience') || hasJS('siftscience') || hasJS('sift.createClient'));
  ts.hasHCaptcha      = !!(hasSrc('hcaptcha.com') || hasDOM('.h-captcha,[data-hcaptcha-widget-id]') || hasHTML('hcaptcha.com'));
  ts.hasRecaptcha     = !!(hasSrc('recaptcha') || hasDOM('.g-recaptcha,[data-sitekey]') || hasHTML('recaptcha'));
  ts.hasTurnstile     = !!(hasSrc('challenges.cloudflare.com') || hasDOM('.cf-turnstile') || hasHTML('challenges.cloudflare.com'));
  ts.hasCloudflareBot = !!(hasHTML('__cf_bm') || hasHTML('cf-challenge') || document.cookie.includes('__cf_bm'));
  ts.hasHSTS          = d.isHttps;
  ts.hasCSP           = !!(hasDOM('meta[http-equiv="Content-Security-Policy"]') || hasHTML('content-security-policy'));

  // ── CDN & Infrastructure ──
  ts.hasCloudflare    = !!(hasHTML('__cfduid') || hasHTML('cf-ray') || hasHTML('__cf_') || hasSrc('cloudflare.com') || hasHTML('cloudflareinsights') || document.cookie.includes('__cflb'));
  ts.hasCloudFront    = !!(hasSrc('cloudfront.net') || hasHTML('cloudfront.net'));
  ts.hasFastly        = !!(hasSrc('fastly.net') || hasHTML('fastly.net'));
  ts.hasAkamaiCDN     = !!(hasSrc('akamai') || hasSrc('akamaihd.net') || hasHTML('akamai'));
  ts.hasjsDelivr      = !!(hasSrc('jsdelivr.net'));
  ts.hasCDNjs         = !!(hasSrc('cdnjs.cloudflare.com'));
  ts.hasGoogleFonts   = !!(hasSrc('fonts.googleapis.com') || hasHTML('fonts.googleapis.com'));
  ts.hasGoogleAPIs    = !!(hasSrc('googleapis.com'));
  ts.hasGoogleMaps    = !!(hasSrc('maps.googleapis.com') || hasHTML('maps.googleapis.com'));
  ts.hasAWS           = !!(hasSrc('amazonaws.com') || hasHTML('amazonaws.com') || hasSrc('aws.amazon.com'));
  ts.hasAzure         = !!(hasSrc('azure.com') || hasSrc('azurewebsites.net') || hasSrc('azureedge.net') || hasHTML('azure'));
  ts.hasGCP           = !!(hasSrc('storage.googleapis.com') || hasSrc('appspot.com'));
  ts.hasVercel        = !!(hasHTML('x-vercel') || hasSrc('vercel.app') || hasHTML('_next/') && hasHTML('vercel'));
  ts.hasNetlify       = !!(hasHTML('netlify') || hasSrc('netlify.com'));
  ts.hasEnvoy         = !!(hasHTML('x-envoy') || hasHTML('envoy-upstream') || hasHTML('x-envoy-upstream'));

  // ── Payments ──
  ts.hasStripe        = !!(hasSrc('js.stripe.com') || hasHTML('stripe.com') || hasWin('Stripe'));
  ts.stripeVersion    = sv(html.match(/stripe\.js\/v(\d+)/i)?.[1] ? 'v'+html.match(/stripe\.js\/v(\d+)/i)?.[1] : '');
  ts.hasPaypal        = !!(hasSrc('paypal.com') || hasSrc('paypalobjects.com') || hasHTML('paypal'));
  ts.hasVerifone2co   = !!(hasSrc('2checkout') || hasSrc('2co.com') || hasSrc('verifone') || hasHTML('2checkout') || hasHTML('2co.com'));
  ts.hasKlarna        = !!(hasSrc('klarna.com') || hasHTML('klarna'));
  ts.hasAffirm        = !!(hasSrc('affirm.com') || hasHTML('affirm'));
  ts.hasShopPay       = !!(hasHTML('shop-pay') || hasSrc('shop.app') || hasHTML('shopify_pay'));

  // ── Marketing ──
  ts.hasMailchimp     = !!(hasSrc('mailchimp') || hasHTML('mailchimp.com') || hasHTML('list-manage.com'));

  // ── Modern Web / Misc ──
  ts.hasPriorityHints = !!(hasDOM('[fetchpriority],[importance]') || hasHTML('fetchpriority'));
  ts.hasPWA           = !!(hasDOM('link[rel="manifest"]'));
  ts.hasServiceWorker = !!(hasHTML('serviceworker') || hasHTML('service-worker'));
  ts.hasAMP           = !!(hasDOM('link[rel="amphtml"]') || html.slice(0,300).includes('<html amp') || html.slice(0,300).includes('<html ⚡'));
  ts.hasHTTP3         = !!(hasHTML('alt-svc') && hasHTML('h3='));
  ts.hasOpenGraph     = !!(Object.keys(metas).some(k=>k.startsWith('og:')));
  ts.hasTwitterCard   = !!(tw['twitter:card']);
  ts.hasJSONLD        = !!(hasDOM('script[type="application/ld+json"]'));
  ts.hasWebP          = !!(hasDOM('picture source[type="image/webp"],img[src$=".webp"]') || hasHTML('.webp'));
  ts.hasLazyLoad      = !!(hasDOM('img[loading="lazy"]'));
  ts.hasPrefetch      = !!(hasDOM('link[rel="prefetch"],link[rel="preload"],link[rel="dns-prefetch"]'));
  ts.hasHreflang      = !!(hasDOM('link[hreflang]'));
  ts.hasPHP           = !!(hasHTML('phpsessid') || sSrcs.some(s=>s.endsWith('.php')));
  ts.cookieCount      = document.cookie ? document.cookie.split(';').filter(c=>c.trim()).length : 0;
  ts.hasAlternate     = !!(hasDOM('link[rel="alternate"]'));

  // ── Programming Languages ──
  ts.hasSubresourceIntegrity = !!(hasDOM('script[integrity],link[integrity]'));
  ts.hasHeroku = !!(hasHTML('herokuapp.com') || hasSrc('herokuapp.com'));
  ts.mixpanelVersion = winVer(()=>W.mixpanel?.__SV) || sv(html.match(/mixpanel[/@](\d+\.\d+[\.\d]*)/)?.[1]);

  // ── Programming Languages (detected from signals) ──
  ts.langJavaScript   = true; // Every web page uses JS effectively
  ts.langTypeScript   = !!(hasHTML('.ts') && (hasHTML('typescript') || hasSrc('tslib') || hasHTML('tslib')));
  ts.langPHP          = !!(hasHTML('phpsessid') || sSrcs.some(s=>s.endsWith('.php')) || hasHTML('x-powered-by: php') || hasHTML('wp-content') || hasHTML('wp-includes') || gen.includes('wordpress') || gen.includes('drupal') || gen.includes('joomla') || hasHTML('laravel') || hasHTML('symfony') || hasHTML('/wp-json/'));
  ts.phpVersion       = sv(html.match(/x-powered-by:\s*php\/([\d.]+)/i)?.[1]);
  ts.langPython       = !!(hasHTML('django') || hasHTML('flask') || hasHTML('csrfmiddlewaretoken') || hasHTML('python') || hasHTML('__pycache__'));
  ts.langRuby         = !!(hasHTML('authenticity_token') || hasHTML('ruby') || hasHTML('rails') || hasHTML('turbolinks') || hasHTML('turbo-frame'));
  ts.langJava         = !!(hasHTML('jsessionid') || hasHTML('java') || hasHTML('.jsp') || hasHTML('spring') || hasHTML('struts'));
  ts.langGo           = !!(hasHTML('x-powered-by: go') || hasHTML('golang'));
  ts.langRust         = !!(hasHTML('wasm') || hasSrc('.wasm'));
  ts.langNode         = !!(hasHTML('x-powered-by: express') || hasHTML('node.js') || ts.hasNextJs || ts.hasNuxt || ts.hasAstro || ts.hasGhost || hasSrc('_next/'));
  ts.langCSharp       = !!(hasHTML('asp.net') || hasHTML('__viewstate') || hasHTML('__dopostback') || hasHTML('.aspx') || hasHTML('blazor'));
  ts.aspnetVersion    = sv(html.match(/x-aspnet-version:\s*([\d.]+)/i)?.[1]);

  // ── WordPress Theme Detection ──
  ts.wpThemeName = '';
  ts.wpThemeUri  = '';
  if (ts.isWordPress) {
    // Extract theme from wp-content/themes/THEME_NAME/
    const themeMatch = html.match(/wp-content\/themes\/([a-z0-9_-]+)\//i);
    if (themeMatch) ts.wpThemeName = themeMatch[1];
    // Try style.css link
    const styleLink = html.match(/wp-content\/themes\/([a-z0-9_-]+)\/style\.css/i);
    if (styleLink && !ts.wpThemeName) ts.wpThemeName = styleLink[1];
    // Try body classes for theme name
    const themeClassMatch = bodyClass.match(/theme-([a-z0-9_-]+)/i);
    if (themeClassMatch && !ts.wpThemeName) ts.wpThemeName = themeClassMatch[1];
    ts.wpThemeUri = ts.wpThemeName ? '/wp-content/themes/' + ts.wpThemeName + '/' : '';
    // Detect child theme
    const parentThemeMatch = html.match(/wp-content\/themes\/([a-z0-9_-]+)\/.*?wp-content\/themes\/([a-z0-9_-]+)\//i);
    ts.wpParentTheme = parentThemeMatch ? parentThemeMatch[2] : '';
    ts.wpChildTheme  = (parentThemeMatch && parentThemeMatch[1] !== parentThemeMatch[2]) ? parentThemeMatch[1] : '';
  }

  // ── Shopify Theme Detection ──
  ts.shopifyThemeName = '';
  if (ts.isShopify) {
    const shopifyTheme = html.match(/shopify\.theme\s*=\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i)
      || html.match(/theme_name['"]\s*:\s*['"]([^'"]+)/i);
    if (shopifyTheme) ts.shopifyThemeName = shopifyTheme[1];
    const shopifyStore = html.match(/shopify\.com\/s\/shopify\/([^/]+)/i);
    ts.shopifyStoreId = shopifyStore ? shopifyStore[1] : '';
  }

  // ── Webflow Template Detection ──
  ts.webflowTemplateName = '';
  if (ts.isWebflow) {
    const wfTemplate = html.match(/data-wf-page="([^"]+)"/i);
    ts.webflowPageId = wfTemplate ? wfTemplate[1] : '';
  }

  // ── Server Software / Web Servers ──
  ts.hasNginx    = !!(hasHTML('nginx') || hasHTML('x-powered-by: nginx'));
  ts.hasApache   = !!(hasHTML('apache') || hasHTML('x-powered-by: apache') || hasHTML('server: apache'));
  ts.hasIIS      = !!(hasHTML('x-aspnet') || hasHTML('x-powered-by: asp.net') || hasHTML('server: microsoft-iis'));
  ts.hasLiteSpeed= !!(hasHTML('litespeed') || hasHTML('x-litespeed') || hasHTML('server: litespeed'));
  ts.hasCaddy    = !!(hasHTML('server: caddy'));

  // ── Ecommerce (expanded) ──
  ts.hasWooCommerce  = !!(hasHTML('woocommerce') || hasSrc('woocommerce') || hasDOM('.woocommerce') || hasHTML('/woocommerce/'));
  ts.hasPrestaShop   = !!(gen.includes('prestashop') || hasHTML('prestashop') || hasSrc('prestashop'));
  ts.hasOpenCart      = !!(hasHTML('opencart') || hasSrc('opencart') || gen.includes('opencart'));
  ts.hasBigCartel     = !!(hasHTML('bigcartel') || hasSrc('bigcartel'));
  ts.hasEcwid         = !!(hasSrc('ecwid.com') || hasHTML('ecwid'));
  ts.hasSnipcart      = !!(hasSrc('snipcart') || hasHTML('snipcart'));
  ts.hasMedusa        = !!(hasHTML('medusajs') || hasSrc('medusa'));
  ts.hasCommerceJs    = !!(hasSrc('commercejs') || hasSrc('chec.io') || hasHTML('commercejs'));

  // ── Tag Managers ──
  ts.hasGTM2          = ts.hasGTM; // alias
  ts.hasAdobeLaunch   = !!(hasSrc('launch-') && hasSrc('adoberesources.net')) || hasSrc('adobedtm.com');
  ts.hasTealium       = !!(hasSrc('tealiumiq.com') || hasSrc('tealium') || hasHTML('tealium'));
  ts.hasEnsighten     = !!(hasSrc('ensighten.com') || hasHTML('ensighten'));

  // ── A/B Testing ──
  ts.hasOptimizely    = !!(hasSrc('optimizely.com') || hasSrc('cdn.optimizely') || hasWin('optimizely') || hasHTML('optimizely'));
  ts.hasGoogleOptimize= !!(hasSrc('optimize.google.com') || hasHTML('google-optimize') || hasHTML('optimize.js'));
  ts.hasVWO           = !!(hasSrc('visualwebsiteoptimizer.com') || hasSrc('vwo.com') || hasHTML('vwo_'));
  ts.hasLaunchDarkly  = !!(hasSrc('launchdarkly') || hasHTML('launchdarkly'));
  ts.hasABTasty       = !!(hasSrc('abtasty.com') || hasHTML('abtasty'));
  ts.hasUnbounce      = !!(hasSrc('unbounce.com') || hasHTML('unbounce'));

  // ── Video Players ──
  ts.hasYouTubeEmbed  = !!(hasSrc('youtube.com/embed') || hasHTML('youtube.com/embed') || hasDOM('iframe[src*="youtube"]'));
  ts.hasVimeoEmbed    = !!(hasSrc('player.vimeo.com') || hasHTML('player.vimeo.com') || hasDOM('iframe[src*="vimeo"]'));
  ts.hasWistia        = !!(hasSrc('wistia.com') || hasSrc('wistia.net') || hasHTML('wistia') || hasWin('Wistia'));
  ts.hasVideoJs       = !!(hasSrc('video.js') || hasSrc('videojs') || hasDOM('.video-js') || hasHTML('vjs-'));
  ts.hasPlyr          = !!(hasSrc('plyr') || hasDOM('.plyr') || hasHTML('plyr'));
  ts.hasJWPlayer      = !!(hasSrc('jwplayer') || hasWin('jwplayer') || hasHTML('jwplayer'));

  // ── Consent / Cookie Banners ──
  ts.hasCookiebot     = !!(hasSrc('cookiebot.com') || hasHTML('cookiebot') || hasDOM('#CybotCookiebotDialog'));
  ts.hasOneTrust      = !!(hasSrc('onetrust.com') || hasSrc('cookielaw.org') || hasHTML('onetrust') || hasDOM('#onetrust-banner-sdk'));
  ts.hasCookieYes     = !!(hasSrc('cookieyes.com') || hasHTML('cookieyes'));
  ts.hasOsano         = !!(hasSrc('osano.com') || hasHTML('osano'));
  ts.hasTrustArc      = !!(hasSrc('trustarc.com') || hasHTML('trustarc') || hasSrc('consent.trustarc'));
  ts.hasQuantcast     = !!(hasSrc('quantcast.com') || hasHTML('quantcast'));

  // ── Accessibility ──
  ts.hasAccessiBe     = !!(hasSrc('accessibe.com') || hasSrc('acsbapp.com') || hasHTML('accessibe'));
  ts.hasUserWay       = !!(hasSrc('userway.org') || hasHTML('userway'));
  ts.hasAudioEye      = !!(hasSrc('audioeye.com') || hasHTML('audioeye'));

  // ── Fonts & Typography ──
  ts.hasGoogleFonts2  = ts.hasGoogleFonts;
  ts.hasAdobeFonts    = !!(hasSrc('use.typekit.net') || hasSrc('typekit.com') || hasHTML('typekit'));
  ts.hasFontAwesome2  = ts.hasFontAwesome;
  ts.hasCustomFonts   = !!(hasDOM('@font-face') || hasHTML('@font-face'));

  // ── Advertising ──
  ts.hasGoogleAdsense = !!(hasSrc('pagead2.googlesyndication.com') || hasHTML('adsbygoogle') || hasDOM('ins.adsbygoogle'));
  ts.hasGoogleAds     = !!(hasSrc('googleadservices.com') || hasSrc('googlesyndication.com') || hasHTML('google_ads') || hasHTML('gads'));
  ts.hasDoubleClick   = !!(hasSrc('doubleclick.net') || hasHTML('doubleclick'));
  ts.hasAdRoll        = !!(hasSrc('adroll.com') || hasHTML('adroll'));
  ts.hasCriteo        = !!(hasSrc('criteo.com') || hasSrc('criteo.net') || hasHTML('criteo'));
  ts.hasTaboola       = !!(hasSrc('taboola.com') || hasHTML('taboola'));
  ts.hasOutbrain      = !!(hasSrc('outbrain.com') || hasHTML('outbrain'));

  // ── Search ──
  ts.hasAlgolia       = !!(hasSrc('algolia') || hasSrc('algoliasearch') || hasWin('algoliasearch') || hasHTML('algolia'));
  ts.hasElasticSearch = !!(hasSrc('elastic') || hasHTML('elasticsearch'));
  ts.hasMeiliSearch   = !!(hasSrc('meilisearch') || hasHTML('meilisearch'));
  ts.hasTypesense     = !!(hasSrc('typesense') || hasHTML('typesense'));

  // ── Hosting Panels ──
  ts.hasCPanel        = !!(hasHTML('cpanel') || hasHTML('cPanel'));
  ts.hasPlesk         = !!(hasHTML('plesk') || hasSrc('plesk'));

  // ── Miscellaneous Libraries ──
  ts.hasSwiper        = !!(hasSrc('swiper') || hasHTML('swiper-container') || hasDOM('.swiper'));
  ts.swiperVersion    = sv(html.match(/swiper[/@](\d+\.\d+[\.\d]*)/)?.[1]);
  ts.hasSlick         = !!(hasSrc('slick') || hasDOM('.slick-slider') || hasHTML('slick-carousel'));
  ts.hasOwlCarousel   = !!(hasSrc('owl.carousel') || hasDOM('.owl-carousel'));
  ts.hasLightbox      = !!(hasSrc('lightbox') || hasSrc('fancybox') || hasSrc('magnific-popup') || hasDOM('[data-fancybox]'));
  ts.hasIsotope       = !!(hasSrc('isotope') || hasHTML('isotope') || hasSrc('masonry'));
  ts.hasScrollMagic   = !!(hasSrc('scrollmagic') || hasHTML('scrollmagic'));
  ts.hasLenis         = !!(hasSrc('lenis') || hasHTML('lenis'));
  ts.hasBarba         = !!(hasSrc('barba') || hasHTML('barba'));
  ts.hasWebSocket     = !!(hasHTML('websocket') || hasHTML('wss://') || hasHTML('socket.io') || hasSrc('socket.io'));
  ts.hasGraphQL       = !!(hasHTML('graphql') || hasSrc('graphql'));
  ts.hasWebGL         = !!(hasHTML('webgl') || hasHTML('getcontext') && hasHTML('webgl'));

  // ── Collect meta generator as-is for display ──
  ts.generatorMeta    = metas['generator'] || '';

  return ts;
}
