/* ══════════════════════════════════════
   SEO INFO TOOLTIP POPUP SYSTEM
   Shows styled popup on hover over ? icons
══════════════════════════════════════ */
(function(){
  // Tooltip data for each row
  const TOOLTIPS = {
    'row-title': {
      icon: '📝',
      title: 'Title Tag',
      subtitle: 'Page title in search results',
      desc: 'The title tag is one of the most important on-page SEO factors. It appears as the clickable headline in Google search results.',
      best: '📏 Best: 30–60 characters',
      tips: [
        'Include your primary keyword near the start',
        'Write for humans first, search engines second',
        'Every page needs a unique title',
        'Avoid duplicate or generic titles like "Home"',
      ],
      learnMore: 'https://7thclub.com/what-are-title-tags/',
      learnLabel: 'Title Tag Guide',
    },
    'row-desc': {
      icon: '📄',
      title: 'Meta Description',
      subtitle: 'Snippet shown under your title',
      desc: 'The meta description is the short summary that appears below your title in search results. It doesn\'t directly affect rankings but greatly impacts click-through rate.',
      best: '📏 Best: 70–160 characters',
      tips: [
        'Summarize the page content accurately',
        'Include a call-to-action (e.g., "Learn more")',
        'Use your target keyword naturally',
        'Each page should have a unique description',
      ],
      learnMore: 'https://7thclub.com/the-complete-guide-to-meta-descriptions/',
      learnLabel: 'Meta Description Guide',
    },
    'row-url': {
      icon: '🔗',
      title: 'Page URL',
      subtitle: 'The current page address',
      desc: 'A clean, descriptive URL helps both users and search engines understand what a page is about before clicking.',
      best: '✅ Best: short, lowercase, hyphen-separated',
      tips: [
        'Keep URLs short and descriptive',
        'Use hyphens (-) not underscores (_)',
        'Include target keyword in the URL',
        'Avoid numbers or dates if content is evergreen',
      ],
      learnMore: 'https://7thclub.com/mastering-canonical-tags/',
      learnLabel: 'URL & Canonical Guide',
    },
    'row-canonical': {
      icon: '🔄',
      title: 'Canonical Tag',
      subtitle: 'Prevents duplicate content issues',
      desc: 'The canonical tag tells search engines which version of a URL is the "master" copy, preventing duplicate content penalties when the same content appears at multiple URLs.',
      best: '✅ Best: self-referencing canonical on every page',
      tips: [
        'Always add a self-referencing canonical',
        'Use absolute URLs (include https://)',
        'Critical for paginated pages and filters',
        'Helps consolidate link equity to one URL',
      ],
      learnMore: 'https://7thclub.com/mastering-canonical-tags/',
      learnLabel: 'Canonical Tag Guide',
    },
    'row-robots': {
      icon: '🤖',
      title: 'Meta Robots Tag',
      subtitle: 'Controls search engine indexing',
      desc: 'The meta robots tag tells search engines whether to index a page and follow its links. It is one of the most powerful on-page directives for crawl control.',
      best: '✅ Best: index, follow (default — no tag needed)',
      tips: [
        'Default behavior is index, follow',
        '"noindex" prevents Google from showing the page',
        '"nofollow" stops PageRank passing through links',
        'Never set noindex on important pages accidentally',
      ],
      learnMore: 'https://7thclub.com/mastering-the-meta-robots-tag/',
      learnLabel: 'Meta Robots Tag Guide',
    },
    'row-xrobots': {
      icon: '🔒',
      title: 'X-Robots-Tag',
      subtitle: 'HTTP header robots directive',
      desc: 'The X-Robots-Tag is an HTTP response header that works like the meta robots tag but can be applied to any file type, including PDFs and images.',
      best: '✅ Best: Not set (default index, follow)',
      tips: [
        'Works for non-HTML files such as PDFs and images',
        'Set by your server or CMS configuration',
        'Overrides meta robots in some cases',
        'Use to control indexing of downloadable files',
      ],
      learnMore: 'https://7thclub.com/the-x-robots-tag/',
      learnLabel: 'X-Robots-Tag Guide',
    },
    'row-keywords': {
      icon: '🔑',
      title: 'Meta Keywords',
      subtitle: 'Legacy keyword meta tag',
      desc: 'The meta keywords tag was once used by search engines to understand page topics, but Google has ignored it since 2009. It is now obsolete for SEO.',
      best: '⚠️ Best: Leave empty — Google ignores it',
      tips: [
        'Google has officially ignored this since 2009',
        'Filling it can tip off competitors to your keywords',
        'Bing still reads it but gives it very low weight',
        'Safe to leave blank or remove entirely',
      ],
      learnMore: 'https://7thclub.com/meta-keywords/',
      learnLabel: 'Meta Keywords Guide',
    },
  };

  // Tooltips for small rows (Word Count, Language)
  const SMALL_TOOLTIPS = {
    'Word Count': {
      icon: '📖',
      title: 'Word Count',
      subtitle: 'Content length indicator',
      desc: 'Pages with more content tend to rank better. A higher word count signals depth and expertise to search engines.',
      best: '📏 Best: 300+ words (aim for 1000+ for blog posts)',
      tips: [
        'Thin content (under 300 words) may struggle to rank',
        'Quality matters more than quantity',
        'Long-form content earns more backlinks',
        'Match content length to user intent',
      ],
      learnMore: 'https://7thclub.com/what-are-title-tags/',
      learnLabel: 'Content SEO Guide',
    },
    'Language': {
      icon: '🌐',
      title: 'Language Attribute',
      subtitle: 'HTML lang attribute',
      desc: 'The lang attribute on the html element declares the primary language of the page, helping screen readers and search engines serve content to the right audience.',
      best: '✅ Best: html lang="en" (or your language code)',
      tips: [
        'Required for accessibility compliance (WCAG)',
        'Helps Google serve results to the right country',
        'Use correct BCP 47 language codes (e.g., en, fr, ar)',
        'Critical for multilingual sites',
      ],
      learnMore: 'https://7thclub.com/the-lang-attribute/',
      learnLabel: 'Lang Attribute Guide',
    },
  };

  var popupEl = document.getElementById('seoTooltipPopup');
  if (!popupEl) return;
  var popup = popupEl;
  var POPUP_HEIGHT = 300; // estimated max tooltip height in px
  let hideTimer = null;

  // Helper to escape HTML special characters
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Build the popup HTML using the data object
  function buildPopupHTML(data) {
    return '<div class="stt-head">'
      + '<div class="stt-icon" style="font-size:20px">' + data.icon + '</div>'
      + '<div>'
      + '<div class="stt-title">' + escapeHtml(data.title) + '</div>'
      + '<div class="stt-subtitle">' + escapeHtml(data.subtitle) + '</div>'
      + '</div>'
      + '</div>'
      + '<div class="stt-body">'
      + '<div class="stt-desc">' + escapeHtml(data.desc) + '</div>'
      + '<div class="stt-best">'
      + '<span class="stt-best-icon">🎯</span>'
      + '<span class="stt-best-text">' + escapeHtml(data.best) + '</span>'
      + '</div>'
      + '<ul class="stt-tips">'
      + data.tips.map(function(t){ return '<li>' + escapeHtml(t) + '</li>'; }).join('')
      + '</ul>'
      + '</div>'
      + '<div class="stt-footer">'
      + '<a class="stt-learn-more" href="' + escapeHtml(data.learnMore) + '" target="_blank" rel="noopener noreferrer">'
      + escapeHtml(data.learnLabel)
      + '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>'
      + '</a>'
      + '</div>';
  }

  function showTooltip(icon, data) {
    clearTimeout(hideTimer);
    popup.innerHTML = buildPopupHTML(data);

    var rect = icon.getBoundingClientRect();
    var popupW = 260;
    var margin = 8;

    popup.classList.remove('arrow-right');
    var left = rect.left;
    var top = rect.bottom + 8;

    if (left + popupW > window.innerWidth - margin) {
      left = rect.right - popupW;
      popup.classList.add('arrow-right');
    }
    if (left < margin) left = margin;

    // Keep tooltip within viewport vertically
    if (top + POPUP_HEIGHT > window.innerHeight) {
      top = rect.top - 8 - POPUP_HEIGHT;
      if (top < margin) top = margin;
    }

    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
    popup.classList.add('visible');
  }

  function hideTooltip() {
    hideTimer = setTimeout(function() {
      popup.classList.remove('visible');
    }, 120);
  }

  // Keep popup visible when hovering over it
  popup.addEventListener('mouseenter', function() { clearTimeout(hideTimer); });
  popup.addEventListener('mouseleave', hideTooltip);

  // Attach tooltips to all .seo-info-icon elements
  function attachTooltips() {
    // Main rows
    Object.keys(TOOLTIPS).forEach(function(rowId) {
      var row = document.getElementById(rowId);
      if (!row) return;
      var icon = row.querySelector('.seo-info-icon');
      if (!icon) return;
      if (icon._hasTooltip) return;
      var data = TOOLTIPS[rowId];
      icon.addEventListener('mouseenter', function() { showTooltip(icon, data); });
      icon.addEventListener('mouseleave', hideTooltip);
      icon._hasTooltip = true;
    });

    // Small rows: find by title text
    document.querySelectorAll('.seo-row.small').forEach(function(row) {
      var titleEl = row.querySelector('.seo-row-title');
      if (!titleEl) return;
      var titleText = titleEl.textContent.trim();
      var data = SMALL_TOOLTIPS[titleText];
      if (!data) return;
      var icon = row.querySelector('.seo-info-icon');
      if (!icon) return;
      if (icon._hasTooltip) return;
      icon.addEventListener('mouseenter', function() { showTooltip(icon, data); });
      icon.addEventListener('mouseleave', hideTooltip);
      icon._hasTooltip = true;
    });
  }

  // Watch for dynamic DOM changes (popup.js may re-render content)
  function setupMutationObserver() {
    var observer = new MutationObserver(function(mutations) {
      var needsAttach = false;
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length) {
          for (var i = 0; i < mutation.addedNodes.length; i++) {
            var node = mutation.addedNodes[i];
            if (node.nodeType === 1) {
              if ((node.classList && node.classList.contains('seo-info-icon')) ||
                  (node.querySelector && node.querySelector('.seo-info-icon'))) {
                needsAttach = true;
                break;
              }
            }
          }
        }
      });
      if (needsAttach) {
        setTimeout(attachTooltips, 100);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return observer;
  }

  function init() {
    attachTooltips();
    setupMutationObserver();
    // Additional delays for late renders
    setTimeout(attachTooltips, 500);
    setTimeout(attachTooltips, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
