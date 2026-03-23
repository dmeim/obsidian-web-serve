import { INTERNAL_CSS_ENPOINT, INTERNAL_LOGIN_ENPOINT, INTERNAL_FILES_ENDPOINT, INTERNAL_ICONS_ENDPOINT, INTERNAL_LINKS_ENDPOINT, INTERNAL_FORCE_GRAPH_ENDPOINT } from './pathResolver';
import HtmlServerPlugin from 'plugin/main';
import { CustomMarkdownRenderer } from 'plugin/markdownRenderer/customMarkdownRenderer';
import mime from 'mime-types';
import { ReplaceableVariables } from 'plugin/settings/settings';
import { App, TFile, TFolder, getIcon, normalizePath } from 'obsidian';
import * as fs from 'fs';
import * as nodePath from 'path';
import LZString from 'lz-string';

export const contentResolver = async (
  path: string,
  referer: string,
  plugin: HtmlServerPlugin,
  markdownRenderer: CustomMarkdownRenderer,
  extraVars: ReplaceableVariables[] = []
) => {
  if (path == INTERNAL_CSS_ENPOINT) {
    let fullCssText =
      Array.from(document.styleSheets)
        .flatMap((styleSheet) =>
          Array.from(styleSheet.cssRules).map((cssRule) => cssRule.cssText)
        )
        .join('\n') +
      `\n.markdown-preview-view, .markdown-embed-content {height: unset !important;}`;

    // Inline Obsidian's internal asset URLs (e.g. external-link icon SVG)
    // that reference relative paths only valid inside the Obsidian app bundle
    fullCssText = fullCssText.replace(
      /url\(public\/images\/[a-f0-9]+\.svg\)/g,
      `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='14' height='14' fill='none' stroke='%23888888' stroke-linecap='round' stroke-linejoin='round' stroke-width='9.38%25'><path d='M14 9 L3 9 3 29 23 29 23 18 M18 4 L28 4 28 14 M28 4 L14 18'/></svg>`)}")`
    );

    return {
      contentType: 'text/css',
      payload: fullCssText,
    };
  }
  if (path == INTERNAL_LOGIN_ENPOINT) {
    const loginForm = parseHtmlVariables(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>#VAR{HTML_TITLE}</title>
  <link rel="shortcut icon" href="#VAR{FAVICON_URL}">
  <link href="#VAR{CSS_FILE_URL}" type="text/css" rel="stylesheet">
</head>
<body
  class="#VAR{THEME_MODE} mod-windows is-frameless is-maximized is-hidden-frameless obsidian-app show-inline-title show-view-header"
  style="--zoom-factor:1; --font-text-size:16px;">
  <div class="app-container">
    <div class="horizontal-main-container">
      <div class="workspace">
        <div class="workspace-split mod-vertical mod-root">
          <div class="workspace-tabs mod-top mod-top-left-space mod-top-right-space">
            <div class="workspace-tab-container">
              <div class="workspace-leaf">
                <div class="workspace-leaf-content" data-type="markdown" data-mode="preview">
                  <div class="view-content">
                    <div class="markdown-reading-view" style="width: 100%; height: 100%;">
                      <div
                        class="markdown-preview-view markdown-rendered node-insert-event is-readable-line-width allow-fold-headings show-indentation-guide allow-fold-lists"
                        tabindex="-1" style="tab-size: 4; height: 100% !important;">
                        <div class="markdown-preview-sizer markdown-preview-section" style="min-height: calc(100% - var(--file-margins) - var(--file-margins));">
                          <div class="markdown-preview-pusher" style="width: 1px; height: 0.1px; margin-bottom: 0px;"></div>
                          <div class="mod-header"></div>
                          <div class="prompt">
                            <div class="html-form-container">
                              <h1>#VAR{HTML_TITLE}</h1>
                              <div class="html-login-form">
                                <div class="html-login-form-label"><label for="username">Username:</label></div>
                                <div class="setting-item-control">
                                  <input placeholder="Username" id="username" type="text" name="username" spellcheck="false">
                                </div>
                                <br>
                                <div class="html-login-form-label"><label for="password">Password:</label></div>
                                <div class="setting-item-control">
                                <input placeholder="Password" id="password" type="password" name="password" spellcheck="false">
                                </div>
                                <input style="display: none;" id="redirectUrl" type="text" name="redirectUrl" spellcheck="false">
                                <br>
                                <span class="settings-error-element" hidden id="error"></span>
                                <div class="html-form-button">
                                  <button class="mod-cta" id="loginBtn">Login</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script nonce="#VAR{NONCE}" type="text/javascript">
    function test() {
      try {

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        if(!username || !password) {
          error.innerText = 'You need to fill the Username and Password fields.';
          error.hidden = false;
          return;
        }
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
          if (this.readyState == 4 && this.status == 200) {
            window.location = redirectUrl.value;
          } else {
            error.innerText = 'Worng credentials.';
            error.hidden = false;
          }
        };
        xhttp.open("POST", "/login", true);
        xhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        
        xhttp.send(\`username=\${encodeURIComponent(username)}&password=\${encodeURIComponent(password)}\`);
      }
      catch (err){
        error.innerText = 'Something went wrong.';
        error.hidden = false;
        console.error(err);
      }
    }

    loginBtn.addEventListener('click',test);

  </script>
</body>
</html>
`,
      [
        {
          varName: 'THEME_MODE',
          varValue: document.body.classList.contains('theme-dark')
            ? 'theme-dark'
            : 'theme-light',
        },
        ...plugin.settings.htmlReplaceableVariables,
        ...extraVars,
      ]
    );

    return {
      contentType: 'text/html',
      payload: loginForm,
    };
  }

  if (path == INTERNAL_FILES_ENDPOINT) {
    const { filterMode, filterDirectories } = plugin.settings;
    const normalizedDirs = filterDirectories.map((d: string) => d.replace(/\/+$/, ''));

    const isPathAllowed = (filePath: string): boolean => {
      if (filterMode === 'none' || normalizedDirs.length === 0) return true;
      const inDir = (dir: string) => filePath === dir || filePath.startsWith(dir + '/');
      if (filterMode === 'whitelist') return normalizedDirs.some(inDir);
      if (filterMode === 'blacklist') return !normalizedDirs.some(inDir);
      return true;
    };

    const allFiles = plugin.app.vault.getFiles();
    const filteredFiles = allFiles.filter((f: TFile) => {
      if (f.path.startsWith('.obsidian')) return false;
      return isPathAllowed(f.path);
    });
    return {
      contentType: 'application/json',
      payload: JSON.stringify({
        files: filteredFiles.map((f: TFile) => {
          const isExcalidraw = f.name.endsWith('.excalidraw.md') ||
            (f.extension === 'md' && plugin.app.metadataCache.getFileCache(f)?.frontmatter?.['excalidraw-plugin'] != null);
          return { path: f.path, name: f.name, extension: f.extension, ...(isExcalidraw ? { excalidraw: true } : {}) };
        })
      }),
    };
  }

  if (path == INTERNAL_ICONS_ENDPOINT) {
    const iconMap = plugin.settings.useIconize
      ? await resolveIconizeIcons(plugin)
      : {};
    // @ts-ignore - adapter.basePath is available at runtime
    const vaultBase: string = plugin.app.vault.adapter.basePath;
    const readIconFile = (relPath: string): string => {
      try {
        const abs = nodePath.join(vaultBase, relPath);
        if (fs.existsSync(abs)) return fs.readFileSync(abs, 'utf8');
      } catch {}
      return '';
    };
    const response = {
      iconMap,
      defaults: {
        folder: readIconFile(plugin.settings.folderIconPath),
        markdown: readIconFile(plugin.settings.markdownIconPath),
        file: readIconFile(plugin.settings.fileIconPath),
        canvas: readIconFile(plugin.settings.canvasIconPath),
      },
    };
    return {
      contentType: 'application/json',
      payload: JSON.stringify(response),
    };
  }

  if (path == INTERNAL_FORCE_GRAPH_ENDPOINT) {
    // @ts-ignore - adapter.basePath is available at runtime
    const vaultBase: string = plugin.app.vault.adapter.basePath;
    const vendorPath = nodePath.join(vaultBase, '.obsidian/plugins/web-serve/vendor/force-graph.min.js');
    const jsContent = fs.existsSync(vendorPath) ? fs.readFileSync(vendorPath, 'utf8') : '';
    return {
      contentType: 'application/javascript',
      payload: jsContent,
    };
  }

  if (path == INTERNAL_LINKS_ENDPOINT) {
    const { filterMode, filterDirectories } = plugin.settings;
    const normalizedDirs = filterDirectories.map((d: string) => d.replace(/\/+$/, ''));

    const isLinkPathAllowed = (filePath: string): boolean => {
      if (filterMode === 'none' || normalizedDirs.length === 0) return true;
      const inDir = (dir: string) => filePath === dir || filePath.startsWith(dir + '/');
      if (filterMode === 'whitelist') return normalizedDirs.some(inDir);
      if (filterMode === 'blacklist') return !normalizedDirs.some(inDir);
      return true;
    };

    const allFiles = plugin.app.vault.getFiles();
    const mdFiles = allFiles.filter((f: TFile) =>
      f.extension === 'md' && !f.path.startsWith('.obsidian') && isLinkPathAllowed(f.path)
    );

    const allowedPaths = new Set(mdFiles.map((f: TFile) => f.path));
    const nodes: { id: string; name: string }[] = [];
    const edges: { source: string; target: string }[] = [];

    for (const f of mdFiles) {
      nodes.push({ id: f.path, name: f.basename });
      const cache = plugin.app.metadataCache.getFileCache(f);
      if (!cache?.links) continue;
      for (const link of cache.links) {
        const dest = plugin.app.metadataCache.getFirstLinkpathDest(link.link, f.path);
        if (dest && allowedPaths.has(dest.path) && dest.path !== f.path) {
          edges.push({ source: f.path, target: dest.path });
        }
      }
    }

    return {
      contentType: 'application/json',
      payload: JSON.stringify({ nodes, edges }),
    };
  }

  const file = plugin.app.metadataCache.getFirstLinkpathDest(path, referer);
  if (!file) return null;
  console.log(file.path, file.name);

  // --- Excalidraw handler (detect by filename .excalidraw.md OR frontmatter excalidraw-plugin) ---
  const isExcalidraw = file.name.endsWith('.excalidraw.md') ||
    (file.extension === 'md' && plugin.app.metadataCache.getFileCache(file)?.frontmatter?.['excalidraw-plugin'] != null);

  if (isExcalidraw) {
    const raw = await file.vault.read(file);
    let sceneJson = '{}';
    const match = raw.match(/```compressed-json\n([\s\S]*?)```/);
    if (match) {
      try {
        const compressed = match[1].replace(/\s+/g, '');
        const decompressed = LZString.decompressFromBase64(compressed);
        if (decompressed) sceneJson = decompressed;
      } catch (e) {
        console.error('web-serve: failed to decompress excalidraw data', e);
      }
    }

    const displayName = file.basename.replace(/\.excalidraw$/, '');
    const content = `<div id="ws-excalidraw-viewer"><div id="ws-excalidraw-loading" style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);gap:8px"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></path></svg>Loading Excalidraw viewer...</div><div id="ws-excalidraw-world"></div></div>`;
    let htmlOutput = buildPage(content, displayName, plugin);
    htmlOutput = applyShellChrome(htmlOutput, plugin);

    // Viewer-mode styles: absolute-position the viewer over the main content area
    htmlOutput = htmlOutput.replace('</head>',
      `<style>
.ws-main-content{position:relative!important}
.ws-main-content .markdown-preview-pusher,.ws-main-content .inline-title,.ws-main-content .mod-header>:not(#ws-excalidraw-viewer){display:none!important}
#ws-excalidraw-viewer{position:absolute!important;top:0;left:0;width:100%;height:100%;background:var(--background-primary);z-index:5;overflow:hidden;cursor:grab}
#ws-excalidraw-viewer.ws-panning{cursor:grabbing}
#ws-excalidraw-world{position:absolute;top:0;left:0;transform-origin:0 0}
</style></head>`);

    // Load @excalidraw/utils UMD from CDN + render with pan/zoom
    htmlOutput = htmlOutput.replace('</body>',
      `<script>
window.__wsExcalidrawScene = ${JSON.stringify(sceneJson)};
</script>
<script src="https://unpkg.com/@excalidraw/utils@0.1.2/dist/excalidraw-utils.min.js" onerror="document.getElementById('ws-excalidraw-viewer').innerHTML='<div style=\\'padding:20px;color:var(--text-error,#e93147)\\'>Failed to load Excalidraw library from CDN. Check your internet connection.</div>'"></script>
<script>
(function(){
var viewer = document.getElementById('ws-excalidraw-viewer');
var world = document.getElementById('ws-excalidraw-world');
var loading = document.getElementById('ws-excalidraw-loading');

if (typeof ExcalidrawUtils === 'undefined') {
  viewer.innerHTML = '<div style="padding:20px;color:var(--text-error,#e93147)">ExcalidrawUtils library not available</div>';
  return;
}

var scene;
try { scene = JSON.parse(window.__wsExcalidrawScene); } catch(e) {
  viewer.innerHTML = '<div style="padding:20px;color:var(--text-error,#e93147)">Failed to parse drawing data</div>';
  return;
}
var elements = (scene.elements || []).filter(function(el) { return !el.isDeleted; });

if (!elements.length) {
  viewer.innerHTML = '<div style="padding:20px;color:var(--text-muted)">No drawing data found</div>';
  return;
}

var isDark = document.body.classList.contains('theme-dark');

if (loading) loading.textContent = 'Rendering drawing...';

ExcalidrawUtils.exportToSvg({
  elements: elements,
  appState: {
    exportBackground: false,
    viewBackgroundColor: 'transparent',
    exportWithDarkMode: isDark,
  },
  files: scene.files || null,
}).then(function(svgEl) {
  if (loading) loading.remove();
  world.appendChild(svgEl);

  /* Get SVG intrinsic dimensions for fit-to-view */
  var svgW = svgEl.width.baseVal.value || svgEl.viewBox.baseVal.width || 800;
  var svgH = svgEl.height.baseVal.value || svgEl.viewBox.baseVal.height || 600;

  /* Pan & zoom state */
  var panX = 0, panY = 0, scale = 1;
  var isPanning = false, startMX = 0, startMY = 0, startPX = 0, startPY = 0;

  function applyTransform() {
    world.style.transform = 'translate(' + panX + 'px,' + panY + 'px) scale(' + scale + ')';
  }

  /* Fit to view initially */
  var vw = viewer.clientWidth, vh = viewer.clientHeight;
  var fitScale = Math.min(vw / svgW, vh / svgH, 1.5) * 0.9;
  scale = fitScale;
  panX = (vw - svgW * scale) / 2;
  panY = (vh - svgH * scale) / 2;
  applyTransform();

  /* Mouse pan */
  viewer.addEventListener('mousedown', function(ev) {
    if (ev.button !== 0) return;
    isPanning = true; startMX = ev.clientX; startMY = ev.clientY;
    startPX = panX; startPY = panY;
    viewer.classList.add('ws-panning');
  });
  document.addEventListener('mousemove', function(ev) {
    if (!isPanning) return;
    panX = startPX + (ev.clientX - startMX);
    panY = startPY + (ev.clientY - startMY);
    applyTransform();
  });
  document.addEventListener('mouseup', function() {
    isPanning = false; viewer.classList.remove('ws-panning');
  });

  /* Wheel zoom (zoom toward cursor) */
  viewer.addEventListener('wheel', function(ev) {
    ev.preventDefault();
    var rect = viewer.getBoundingClientRect();
    var mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
    var delta = ev.deltaY > 0 ? 0.9 : 1.1;
    var newScale = scale * delta;
    newScale = Math.min(Math.max(newScale, 0.05), 10);
    var ratio = newScale / scale;
    panX = mx - (mx - panX) * ratio;
    panY = my - (my - panY) * ratio;
    scale = newScale;
    applyTransform();
  }, {passive: false});

  /* Touch support: single-finger pan, pinch zoom */
  var lastTouchDist = 0, lastTouchX = 0, lastTouchY = 0;
  viewer.addEventListener('touchstart', function(ev) {
    if (ev.touches.length === 1) {
      isPanning = true; startMX = ev.touches[0].clientX; startMY = ev.touches[0].clientY;
      startPX = panX; startPY = panY;
    } else if (ev.touches.length === 2) {
      isPanning = false;
      var dx = ev.touches[0].clientX - ev.touches[1].clientX;
      var dy = ev.touches[0].clientY - ev.touches[1].clientY;
      lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      lastTouchX = (ev.touches[0].clientX + ev.touches[1].clientX) / 2;
      lastTouchY = (ev.touches[0].clientY + ev.touches[1].clientY) / 2;
    }
  }, {passive: true});
  viewer.addEventListener('touchmove', function(ev) {
    ev.preventDefault();
    if (ev.touches.length === 1 && isPanning) {
      panX = startPX + (ev.touches[0].clientX - startMX);
      panY = startPY + (ev.touches[0].clientY - startMY);
      applyTransform();
    } else if (ev.touches.length === 2) {
      var dx = ev.touches[0].clientX - ev.touches[1].clientX;
      var dy = ev.touches[0].clientY - ev.touches[1].clientY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (lastTouchDist > 0) {
        var ratio = dist / lastTouchDist;
        var rect = viewer.getBoundingClientRect();
        var mx = lastTouchX - rect.left, my = lastTouchY - rect.top;
        panX = mx - (mx - panX) * ratio;
        panY = my - (my - panY) * ratio;
        scale *= ratio;
        scale = Math.min(Math.max(scale, 0.05), 10);
        applyTransform();
      }
      lastTouchDist = dist;
      lastTouchX = (ev.touches[0].clientX + ev.touches[1].clientX) / 2;
      lastTouchY = (ev.touches[0].clientY + ev.touches[1].clientY) / 2;
    }
  }, {passive: false});
  viewer.addEventListener('touchend', function() { isPanning = false; lastTouchDist = 0; });

}).catch(function(err) {
  console.error('web-serve: excalidraw export failed', err);
  viewer.innerHTML = '<div style="padding:20px;color:var(--text-error,#e93147)">Failed to render drawing: ' + (err.message || err) + '</div>';
});
})();
</script></body>`);

    return { contentType: 'text/html', payload: htmlOutput };
  }

  // --- Canvas handler (.canvas files) ---
  if (file.extension === 'canvas') {
    const canvasRaw = await file.vault.read(file);
    const content = `<div id="ws-canvas-viewer"><div id="ws-canvas-world"><svg id="ws-canvas-edges"></svg></div></div>`;
    let htmlOutput = buildPage(content, file.basename, plugin);
    htmlOutput = applyShellChrome(htmlOutput, plugin);

    // Viewer-mode styles: absolute-position the canvas viewer
    htmlOutput = htmlOutput.replace('</head>',
      `<style>
.ws-main-content{position:relative!important}
.ws-main-content .markdown-preview-pusher,.ws-main-content .inline-title,.ws-main-content .mod-header>:not(#ws-canvas-viewer){display:none!important}
#ws-canvas-viewer{position:absolute!important;top:0;left:0;width:100%;height:100%;overflow:hidden;cursor:grab;background:var(--background-primary);z-index:5}
#ws-canvas-viewer.ws-panning{cursor:grabbing}
#ws-canvas-world{position:absolute;top:0;left:0;transform-origin:0 0}
#ws-canvas-edges{position:absolute;top:0;left:0;overflow:visible;pointer-events:none}
.ws-cv-node{position:absolute;box-sizing:border-box;border:2px solid var(--background-modifier-border);border-radius:8px;background:var(--background-primary);overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.12)}
.ws-cv-node-group{border-style:dashed;background:transparent;border-color:var(--text-muted);box-shadow:none}
.ws-cv-node-group .ws-cv-group-label{position:absolute;top:-22px;left:8px;font-size:12px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.03em}
.ws-cv-node-content{padding:12px;color:var(--text-normal);font-size:14px;line-height:1.6;overflow:auto;height:100%;box-sizing:border-box}
.ws-cv-node-content h1{font-size:1.4em;margin:0 0 8px} .ws-cv-node-content h2{font-size:1.2em;margin:0 0 6px} .ws-cv-node-content h3{font-size:1.1em;margin:0 0 4px}
.ws-cv-node-content a{color:var(--text-accent);text-decoration:none} .ws-cv-node-content a:hover{text-decoration:underline}
.ws-cv-node-content ul,.ws-cv-node-content ol{margin:4px 0;padding-left:20px}
.ws-cv-node-content code{background:var(--background-modifier-code);padding:1px 4px;border-radius:3px;font-size:0.9em}
.ws-cv-node-content blockquote{border-left:3px solid var(--text-accent);margin:4px 0;padding-left:10px;color:var(--text-muted)}
.ws-cv-file-link{display:flex;align-items:center;gap:6px;padding:12px;height:100%;box-sizing:border-box}
.ws-cv-file-link a{color:var(--text-accent);text-decoration:none;font-weight:500} .ws-cv-file-link a:hover{text-decoration:underline}
.ws-cv-link-card{padding:12px;display:flex;flex-direction:column;gap:4px;height:100%;box-sizing:border-box}
.ws-cv-link-card .ws-cv-link-url{color:var(--text-accent);font-size:12px;word-break:break-all}
</style></head>`);

    // Canvas renderer script
    htmlOutput = htmlOutput.replace('</body>',
      `<script>
(function(){
var canvasData;
try { canvasData = JSON.parse(${JSON.stringify(canvasRaw)}); } catch(e) { canvasData = { nodes: [], edges: [] }; }
var nodes = canvasData.nodes || [];
var edges = canvasData.edges || [];
var viewer = document.getElementById('ws-canvas-viewer');
var world = document.getElementById('ws-canvas-world');
var svgEl = document.getElementById('ws-canvas-edges');

if (!nodes.length) {
  viewer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted)">Empty canvas</div>';
  return;
}

/* Obsidian canvas color palette */
var palette = {'1':'#fb464c','2':'#e9973f','3':'#e0de71','4':'#44cf6e','5':'#53dfdd','6':'#a882ff'};
function resolveColor(c) { return c ? (palette[c] || c) : null; }

/* Simple markdown renderer */
function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function simpleMd(text) {
  if (!text) return '';
  var lines = text.split('\\n');
  var html = '';
  var inList = false, inOl = false;
  lines.forEach(function(line) {
    /* Headings */
    var hm = line.match(/^(#{1,6})\\s+(.+)/);
    if (hm) { if (inList) { html += '</ul>'; inList = false; } if (inOl) { html += '</ol>'; inOl = false; }
      html += '<h' + hm[1].length + '>' + inlineMd(hm[2]) + '</h' + hm[1].length + '>'; return; }
    /* Unordered list */
    var ulm = line.match(/^[\\-\\*]\\s+(.+)/);
    if (ulm) { if (!inList) { html += '<ul>'; inList = true; } html += '<li>' + inlineMd(ulm[1]) + '</li>'; return; }
    if (inList && !ulm) { html += '</ul>'; inList = false; }
    /* Ordered list */
    var olm = line.match(/^\\d+\\.\\s+(.+)/);
    if (olm) { if (!inOl) { html += '<ol>'; inOl = true; } html += '<li>' + inlineMd(olm[1]) + '</li>'; return; }
    if (inOl && !olm) { html += '</ol>'; inOl = false; }
    /* Blockquote */
    var bq = line.match(/^>\\s*(.*)/);
    if (bq) { html += '<blockquote>' + inlineMd(bq[1]) + '</blockquote>'; return; }
    /* Paragraph */
    if (line.trim()) html += '<p>' + inlineMd(line) + '</p>';
  });
  if (inList) html += '</ul>';
  if (inOl) html += '</ol>';
  return html;
}
function inlineMd(t) {
  return esc(t)
    .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
    .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
    .replace(/\`(.+?)\`/g, '<code>$1</code>')
    .replace(/\\[\\[([^\\]]+)\\]\\]/g, function(m, link) {
      var parts = link.split('|'); var target = parts[0]; var label = parts[1] || parts[0];
      return '<a href="/' + encodeURI(target) + '.md">' + esc(label) + '</a>';
    })
    .replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank">$1</a>');
}

/* Calculate bounds */
var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
nodes.forEach(function(n) {
  minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
  maxX = Math.max(maxX, n.x + n.width); maxY = Math.max(maxY, n.y + n.height);
});

/* Render nodes — groups first (back), then others (front) */
var sorted = nodes.slice().sort(function(a, b) { return (a.type === 'group' ? 0 : 1) - (b.type === 'group' ? 0 : 1); });
sorted.forEach(function(node) {
  var el = document.createElement('div');
  el.className = 'ws-cv-node' + (node.type === 'group' ? ' ws-cv-node-group' : '');
  el.style.left = node.x + 'px'; el.style.top = node.y + 'px';
  el.style.width = node.width + 'px'; el.style.height = node.height + 'px';
  var color = resolveColor(node.color);
  if (color && node.type !== 'group') {
    el.style.borderColor = color;
    el.style.borderTopWidth = '4px';
  } else if (color) {
    el.style.borderColor = color;
  }

  if (node.type === 'text') {
    el.innerHTML = '<div class="ws-cv-node-content">' + simpleMd(node.text || '') + '</div>';
  } else if (node.type === 'file') {
    var fname = (node.file || '').split('/').pop();
    el.innerHTML = '<div class="ws-cv-file-link"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><a href="/' + encodeURI(node.file || '') + '">' + esc(fname) + '</a></div>';
  } else if (node.type === 'link') {
    var url = node.url || '';
    var domain = ''; try { domain = new URL(url).hostname; } catch(e) { domain = url; }
    el.innerHTML = '<div class="ws-cv-link-card"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg><a href="' + esc(url) + '" target="_blank">' + esc(domain) + '</a><div class="ws-cv-link-url">' + esc(url) + '</div></div>';
  } else if (node.type === 'group') {
    if (node.label) el.innerHTML = '<div class="ws-cv-group-label">' + esc(node.label) + '</div>';
  }

  world.appendChild(el);
});

/* Render edges as SVG */
var edgePad = 1000;
svgEl.setAttribute('width', (maxX - minX + edgePad * 2) + '');
svgEl.setAttribute('height', (maxY - minY + edgePad * 2) + '');
svgEl.setAttribute('viewBox', (minX - edgePad) + ' ' + (minY - edgePad) + ' ' + (maxX - minX + edgePad * 2) + ' ' + (maxY - minY + edgePad * 2));
svgEl.style.left = (minX - edgePad) + 'px'; svgEl.style.top = (minY - edgePad) + 'px';

/* Arrow marker */
var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
var mkr = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
mkr.setAttribute('id','ws-cv-arrow'); mkr.setAttribute('viewBox','0 0 10 10');
mkr.setAttribute('refX','9'); mkr.setAttribute('refY','5');
mkr.setAttribute('markerWidth','8'); mkr.setAttribute('markerHeight','8');
mkr.setAttribute('orient','auto-start-reverse');
var mkrp = document.createElementNS('http://www.w3.org/2000/svg','path');
mkrp.setAttribute('d','M 0 0 L 10 5 L 0 10 z'); mkrp.setAttribute('fill','context-stroke');
mkr.appendChild(mkrp); defs.appendChild(mkr); svgEl.appendChild(defs);

var nodeMap = {};
nodes.forEach(function(n) { nodeMap[n.id] = n; });

function edgePoint(node, side) {
  switch (side) {
    case 'top': return { x: node.x + node.width / 2, y: node.y };
    case 'bottom': return { x: node.x + node.width / 2, y: node.y + node.height };
    case 'left': return { x: node.x, y: node.y + node.height / 2 };
    case 'right': return { x: node.x + node.width, y: node.y + node.height / 2 };
    default: return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
  }
}

edges.forEach(function(edge) {
  var from = nodeMap[edge.fromNode], to = nodeMap[edge.toNode];
  if (!from || !to) return;
  var p1 = edgePoint(from, edge.fromSide), p2 = edgePoint(to, edge.toSide);
  var color = resolveColor(edge.color) || 'var(--text-muted, #888)';

  /* Curved path using control points */
  var dx = p2.x - p1.x, dy = p2.y - p1.y;
  var cx1 = p1.x, cy1 = p1.y, cx2 = p2.x, cy2 = p2.y;
  if (edge.fromSide === 'right' || edge.fromSide === 'left') { cx1 += (edge.fromSide === 'right' ? 1 : -1) * Math.abs(dx) * 0.4; }
  else { cy1 += (edge.fromSide === 'bottom' ? 1 : -1) * Math.abs(dy) * 0.4; }
  if (edge.toSide === 'right' || edge.toSide === 'left') { cx2 += (edge.toSide === 'right' ? 1 : -1) * Math.abs(dx) * 0.4; }
  else { cy2 += (edge.toSide === 'bottom' ? 1 : -1) * Math.abs(dy) * 0.4; }

  var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M ' + p1.x + ' ' + p1.y + ' C ' + cx1 + ' ' + cy1 + ' ' + cx2 + ' ' + cy2 + ' ' + p2.x + ' ' + p2.y);
  path.setAttribute('stroke', color); path.setAttribute('stroke-width', '2');
  path.setAttribute('fill', 'none');
  /* Arrow ends: fromEnd defaults to "none", toEnd defaults to "arrow" */
  if (edge.fromEnd === 'arrow') path.setAttribute('marker-start', 'url(#ws-cv-arrow)');
  if (edge.toEnd !== 'none') path.setAttribute('marker-end', 'url(#ws-cv-arrow)');
  svgEl.appendChild(path);

  /* Edge label */
  if (edge.label) {
    var mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    var lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    lbl.setAttribute('x', '' + mid.x); lbl.setAttribute('y', '' + (mid.y - 6));
    lbl.setAttribute('text-anchor', 'middle'); lbl.setAttribute('fill', color);
    lbl.setAttribute('font-size', '12'); lbl.setAttribute('font-family', '-apple-system, sans-serif');
    lbl.textContent = edge.label;
    svgEl.appendChild(lbl);
  }
});

/* Pan & zoom */
var panX = 0, panY = 0, scale = 1;
var isPanning = false, startMX = 0, startMY = 0, startPX = 0, startPY = 0;

/* Fit to view initially */
var vw = viewer.clientWidth, vh = viewer.clientHeight;
var cw = maxX - minX + 100, ch = maxY - minY + 100;
var fitScale = Math.min(vw / cw, vh / ch, 1.5) * 0.85;
scale = fitScale;
var centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
panX = vw / 2 - centerX * scale;
panY = vh / 2 - centerY * scale;

function applyTransform() {
  world.style.transform = 'translate(' + panX + 'px,' + panY + 'px) scale(' + scale + ')';
}
applyTransform();

viewer.addEventListener('mousedown', function(ev) {
  if (ev.target.tagName === 'A') return;
  isPanning = true; startMX = ev.clientX; startMY = ev.clientY;
  startPX = panX; startPY = panY;
  viewer.classList.add('ws-panning');
});
document.addEventListener('mousemove', function(ev) {
  if (!isPanning) return;
  panX = startPX + (ev.clientX - startMX);
  panY = startPY + (ev.clientY - startMY);
  applyTransform();
});
document.addEventListener('mouseup', function() {
  isPanning = false; viewer.classList.remove('ws-panning');
});
viewer.addEventListener('wheel', function(ev) {
  ev.preventDefault();
  var rect = viewer.getBoundingClientRect();
  var mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
  var delta = ev.deltaY > 0 ? 0.9 : 1.1;
  panX = mx - (mx - panX) * delta;
  panY = my - (my - panY) * delta;
  scale *= delta;
  scale = Math.min(Math.max(scale, 0.05), 10);
  applyTransform();
}, {passive: false});

/* Touch support for mobile */
var lastTouchDist = 0, lastTouchX = 0, lastTouchY = 0;
viewer.addEventListener('touchstart', function(ev) {
  if (ev.touches.length === 1) {
    isPanning = true; startMX = ev.touches[0].clientX; startMY = ev.touches[0].clientY;
    startPX = panX; startPY = panY;
  } else if (ev.touches.length === 2) {
    isPanning = false;
    var dx = ev.touches[0].clientX - ev.touches[1].clientX;
    var dy = ev.touches[0].clientY - ev.touches[1].clientY;
    lastTouchDist = Math.sqrt(dx * dx + dy * dy);
    lastTouchX = (ev.touches[0].clientX + ev.touches[1].clientX) / 2;
    lastTouchY = (ev.touches[0].clientY + ev.touches[1].clientY) / 2;
  }
}, {passive: true});
viewer.addEventListener('touchmove', function(ev) {
  ev.preventDefault();
  if (ev.touches.length === 1 && isPanning) {
    panX = startPX + (ev.touches[0].clientX - startMX);
    panY = startPY + (ev.touches[0].clientY - startMY);
    applyTransform();
  } else if (ev.touches.length === 2) {
    var dx = ev.touches[0].clientX - ev.touches[1].clientX;
    var dy = ev.touches[0].clientY - ev.touches[1].clientY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (lastTouchDist > 0) {
      var delta = dist / lastTouchDist;
      var rect = viewer.getBoundingClientRect();
      var mx = lastTouchX - rect.left, my = lastTouchY - rect.top;
      panX = mx - (mx - panX) * delta;
      panY = my - (my - panY) * delta;
      scale *= delta;
      scale = Math.min(Math.max(scale, 0.05), 10);
      applyTransform();
    }
    lastTouchDist = dist;
    lastTouchX = (ev.touches[0].clientX + ev.touches[1].clientX) / 2;
    lastTouchY = (ev.touches[0].clientY + ev.touches[1].clientY) / 2;
  }
}, {passive: false});
viewer.addEventListener('touchend', function() { isPanning = false; lastTouchDist = 0; });
})();
</script></body>`);

    return { contentType: 'text/html', payload: htmlOutput };
  }

  // --- Markdown handler ---
  if (file.extension === 'md') {
    const frontmatterVariables = await readFrontmatter(file, plugin.app);
    const markdown = await file.vault.read(file);
    const renderedMarkdown = await markdownRenderer.renderHtmlFromMarkdown(
      markdown
    );

    let htmlOutput = buildPage(renderedMarkdown, file.basename, plugin, frontmatterVariables);
    htmlOutput = applyShellChrome(htmlOutput, plugin);

    // Hide title if setting is off
    if (!plugin.settings.showTitle) {
      htmlOutput = htmlOutput.replace(
        '</head>',
        '<style>.inline-title{display:none!important}</style></head>'
      );
    }

    // Apply title alignment and padding
    const titleAlign = plugin.settings.titleAlignment || 'left';
    htmlOutput = htmlOutput.replace(
      '</head>',
      `<style>.inline-title{text-align:${titleAlign};padding-left:16px;padding-right:16px;}</style></head>`
    );

    return {
      contentType: 'text/html',
      payload: htmlOutput,
    };
  }
  const payload = await plugin.app.vault.readBinary(file);

  return {
    contentType: mime.lookup(file.extension) || 'text',
    payload: Buffer.from(payload),
  };
};

/** Build an HTML page from the template with content injected */
function buildPage(
  content: string,
  fileName: string,
  plugin: HtmlServerPlugin,
  extraVars: { varName: string; varValue: string }[] = []
): string {
  return parseHtmlVariables(
    plugin.settings.indexHtml || '<html></html>',
    [
      { varName: 'VAULT_NAME', varValue: plugin.app.vault.getName() },
      { varName: 'RENDERED_CONTENT_FILE_NAME', varValue: fileName },
      {
        varName: 'THEME_MODE',
        varValue: document.body.classList.contains('theme-dark') ? 'theme-dark' : 'theme-light',
      },
      { varName: 'RENDERED_CONTENT', varValue: content },
      ...plugin.settings.htmlReplaceableVariables,
      ...extraVars,
    ]
  );
}

/** Apply shared shell chrome: theme toggle, graph button, resize handle, sidebar controls */
function applyShellChrome(htmlOutput: string, plugin: HtmlServerPlugin): string {
  // Early theme restore from localStorage (prevents flash of wrong theme)
  htmlOutput = htmlOutput.replace(
    '</head>',
    `<script>(function(){var s=localStorage.getItem('ws-theme');if(s){document.documentElement.className=s;document.addEventListener('DOMContentLoaded',function(){document.body.classList.remove('theme-dark','theme-light');document.body.classList.add(s)})}})()</script></head>`
  );

  // Resize handle styles
  htmlOutput = htmlOutput.replace(
    '</head>',
    `<style>
.ws-resize-handle{width:5px;cursor:col-resize;flex-shrink:0;background:transparent;position:relative;z-index:10}
.ws-resize-handle:hover,.ws-resize-handle.ws-dragging{background:var(--interactive-accent);opacity:.5}
.ws-sidebar.ws-collapsed+.ws-resize-handle{display:none}
.ws-tree-item,.ws-tree-folder-label{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;word-break:break-word}
</style></head>`
  );

  // Theme toggle + graph button in sidebar footer
  htmlOutput = htmlOutput.replace(
    '</nav>',
    `<div style="padding:8px;border-top:1px solid var(--background-modifier-border);flex-shrink:0;display:flex;flex-direction:column;gap:4px">` +
    `<button id="ws-theme-btn" style="display:flex;align-items:center;gap:6px;width:100%;padding:6px 8px;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);color:var(--text-muted);font-size:12px;cursor:pointer" onmouseover="this.style.background='var(--background-modifier-hover)';this.style.color='var(--text-normal)'" onmouseout="this.style.background='var(--background-primary)';this.style.color='var(--text-muted)'" onclick="toggleTheme()">` +
    `<svg id="ws-theme-icon-sun" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>` +
    `<svg id="ws-theme-icon-moon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>` +
    `<span id="ws-theme-label">Toggle theme</span>` +
    `</button>` +
    `<button id="ws-graph-btn" style="display:flex;align-items:center;gap:6px;width:100%;padding:6px 8px;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);color:var(--text-muted);font-size:12px;cursor:pointer" onmouseover="this.style.background='var(--background-modifier-hover)';this.style.color='var(--text-normal)'" onmouseout="this.style.background='var(--background-primary)';this.style.color='var(--text-muted)'" onclick="openGraph()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="8.5" y1="7.5" x2="15.5" y2="16.5"/><line x1="15.5" y1="7.5" x2="8.5" y2="16.5"/></svg>Graph view</button>` +
    `</div></nav>`
  );
  htmlOutput = htmlOutput.replace(
    '</nav>',
    '</nav><div class="ws-resize-handle" id="ws-resize-handle"></div>'
  );

  // Theme toggle script
  htmlOutput = htmlOutput.replace(
    '</body>',
    `<script>
function updateThemeUI(){
  var isDark=document.body.classList.contains('theme-dark');
  var sun=document.getElementById('ws-theme-icon-sun');
  var moon=document.getElementById('ws-theme-icon-moon');
  var label=document.getElementById('ws-theme-label');
  if(sun)sun.style.display=isDark?'none':'block';
  if(moon)moon.style.display=isDark?'block':'none';
  if(label)label.textContent=isDark?'Light mode':'Dark mode';
}
function toggleTheme(){
  var body=document.body;
  var isDark=body.classList.contains('theme-dark');
  body.classList.remove('theme-dark','theme-light');
  var newTheme=isDark?'theme-light':'theme-dark';
  body.classList.add(newTheme);
  localStorage.setItem('ws-theme',newTheme);
  updateThemeUI();
}
document.addEventListener('DOMContentLoaded',updateThemeUI);
</script></body>`
  );

  // Graph overlay + force-graph + resize handle scripts
  htmlOutput = htmlOutput.replace(
    '</body>',
    `<div id="ws-graph-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:200;display:none;flex-direction:column">
<div style="position:absolute;top:12px;right:12px;z-index:210">
<button onclick="closeGraph()" style="cursor:pointer;color:var(--text-muted);font-size:14px;line-height:1;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.1);border-radius:4px;background:rgba(30,30,30,0.8);flex-shrink:0;backdrop-filter:blur(8px)" title="Close graph (Esc)"><svg width="12" height="12" viewBox="0 0 10 10" stroke="currentColor" stroke-width="1.5"><line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/></svg></button>
</div>
<div id="ws-graph-container" style="width:100%;height:100%"></div>
</div>
<script src="/.api/vendor/force-graph.min.js"></script>
<script>
(function(){var h=document.getElementById('ws-resize-handle'),s=document.getElementById('ws-sidebar');if(!h||!s)return;var d=false;h.addEventListener('mousedown',function(e){e.preventDefault();d=true;s.style.transition='none';h.classList.add('ws-dragging');document.body.style.cursor='col-resize';document.body.style.userSelect='none';});document.addEventListener('mousemove',function(e){if(!d)return;var w=Math.min(Math.max(e.clientX,120),600);s.style.width=w+'px';});document.addEventListener('mouseup',function(){if(!d)return;d=false;s.style.transition='';h.classList.remove('ws-dragging');document.body.style.cursor='';document.body.style.userSelect='';});})();

var wsGraphInstance = null;
var wsHoverNode = null;
var wsNeighbors = new Set();
var wsLinksOf = new Set();

function openGraph() {
  var overlay = document.getElementById('ws-graph-overlay');
  overlay.style.display = 'flex';
  var container = document.getElementById('ws-graph-container');
  container.innerHTML = '';

  fetch('/.api/links').then(function(r) { return r.json(); }).then(function(data) {
    var currentPath = decodeURI(window.location.pathname).substring(1);
    var isDark = document.body.classList.contains('theme-dark');
    var bgColor = isDark ? '#1a1a2e' : '#f0f0f4';
    var nodeBaseColor = isDark ? 'rgba(168,162,200,0.6)' : 'rgba(108,102,140,0.5)';
    var nodeHoverColor = isDark ? 'rgba(210,205,240,0.9)' : 'rgba(80,75,120,0.9)';
    var accentColor = getComputedStyle(document.body).getPropertyValue('--interactive-accent').trim() || '#7f6df2';
    var linkBaseColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
    var linkHighlight = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)';
    var labelColor = isDark ? 'rgba(220,220,235,0.9)' : 'rgba(40,40,50,0.9)';
    var labelDim = isDark ? 'rgba(180,178,200,0.6)' : 'rgba(80,78,100,0.5)';

    var adj = {};
    data.edges.forEach(function(e) {
      if (!adj[e.source]) adj[e.source] = [];
      if (!adj[e.target]) adj[e.target] = [];
      adj[e.source].push(e.target);
      adj[e.target].push(e.source);
    });

    var deg = {};
    data.edges.forEach(function(e) {
      deg[e.source] = (deg[e.source] || 0) + 1;
      deg[e.target] = (deg[e.target] || 0) + 1;
    });
    data.nodes.forEach(function(n) { n.deg = deg[n.id] || 0; });

    wsGraphInstance = ForceGraph()(container)
      .graphData({ nodes: data.nodes, links: data.edges.map(function(e) { return { source: e.source, target: e.target }; }) })
      .backgroundColor(bgColor)
      .nodeId('id')
      .nodeVal(function(n) { return 1 + Math.sqrt(n.deg || 0) * 1.5; })
      .nodeRelSize(4)
      .nodeCanvasObject(function(node, ctx, globalScale) {
        var r = 3 + Math.sqrt(node.deg || 0) * 1.8;
        var isCurrent = node.id === currentPath;
        var isHover = wsHoverNode === node;
        var isNeighbor = wsNeighbors.has(node.id);
        var dimmed = wsHoverNode && !isHover && !isNeighbor && !isCurrent;

        if (isCurrent || isHover) {
          var glowColor = isCurrent ? accentColor : nodeHoverColor;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r * 2.5, 0, 2 * Math.PI);
          var grad = ctx.createRadialGradient(node.x, node.y, r * 0.5, node.x, node.y, r * 2.5);
          grad.addColorStop(0, glowColor.replace(')', ',0.3)').replace('rgb', 'rgba').replace('rgba(', 'rgba('));
          var glowOuter = isCurrent ? accentColor + '00' : 'rgba(210,205,240,0)';
          grad.addColorStop(1, glowOuter);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
        if (isCurrent) { ctx.fillStyle = accentColor; ctx.globalAlpha = 1; }
        else if (isHover) { ctx.fillStyle = nodeHoverColor; ctx.globalAlpha = 1; }
        else if (isNeighbor) { ctx.fillStyle = nodeHoverColor; ctx.globalAlpha = 0.8; }
        else { ctx.fillStyle = nodeBaseColor; ctx.globalAlpha = dimmed ? 0.15 : 0.6; }
        ctx.fill();
        ctx.globalAlpha = 1;

        var showLabel = isCurrent || isHover || isNeighbor || globalScale > 2.5;
        if (showLabel) {
          var fontSize = Math.max(10 / globalScale, 2);
          ctx.font = (isCurrent || isHover ? 'bold ' : '') + fontSize + 'px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = (isCurrent || isHover) ? labelColor : labelDim;
          ctx.globalAlpha = dimmed ? 0.2 : 1;
          ctx.fillText(node.name, node.x, node.y + r + fontSize * 0.3);
          ctx.globalAlpha = 1;
        }
      })
      .nodeCanvasObjectMode(function() { return 'replace'; })
      .linkColor(function(link) {
        if (!wsHoverNode) return linkBaseColor;
        var s = typeof link.source === 'object' ? link.source.id : link.source;
        var t = typeof link.target === 'object' ? link.target.id : link.target;
        if (s === wsHoverNode.id || t === wsHoverNode.id) return linkHighlight;
        return isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
      })
      .linkWidth(function(link) {
        if (!wsHoverNode) return 0.5;
        var s = typeof link.source === 'object' ? link.source.id : link.source;
        var t = typeof link.target === 'object' ? link.target.id : link.target;
        if (s === wsHoverNode.id || t === wsHoverNode.id) return 1.5;
        return 0.3;
      })
      .onNodeHover(function(node) {
        wsHoverNode = node || null;
        wsNeighbors.clear();
        container.style.cursor = node ? 'pointer' : 'default';
        if (node && adj[node.id]) {
          adj[node.id].forEach(function(id) { wsNeighbors.add(id); });
        }
      })
      .onNodeClick(function(node) {
        if (node) window.location.href = '/' + node.id;
      })
      .warmupTicks(50)
      .cooldownTime(3000);

    var chargeForce = wsGraphInstance.d3Force('charge');
    if (chargeForce) chargeForce.strength(-120);
    var linkForce = wsGraphInstance.d3Force('link');
    if (linkForce) linkForce.distance(50);

    setTimeout(function() { wsGraphInstance.zoomToFit(400, 60); }, 1500);
  });
}

function closeGraph() {
  document.getElementById('ws-graph-overlay').style.display = 'none';
  if (wsGraphInstance) { wsGraphInstance.pauseAnimation(); wsGraphInstance = null; }
  document.getElementById('ws-graph-container').innerHTML = '';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && document.getElementById('ws-graph-overlay').style.display === 'flex') {
    closeGraph();
  }
});
</script></body>`
  );

  // Hide sidebar if setting is off
  if (!plugin.settings.showSidebar) {
    htmlOutput = htmlOutput.replace(
      '</head>',
      '<style>.ws-sidebar{display:none!important}.ws-toggle-btn{display:none!important}</style></head>'
    );
  }

  return htmlOutput;
}

async function readFrontmatter(file: TFile, app: App) {
  return new Promise<{ varName: string; varValue: string }[]>((resolve) => {
    app.fileManager
      .processFrontMatter(file, (frontMatter) => {
        const parsedVariables: { varName: string; varValue: string }[] = [];

        Object.entries(frontMatter || {}).forEach(([key, value]) => {
          if (typeof value === 'object') return;
          parsedVariables.push({
            varName: 'FM:' + key,
            varValue: String(value),
          });
        });

        Object.entries(frontMatter.htmlvars || {}).forEach(([key, value]) => {
          parsedVariables.push({ varName: key, varValue: String(value) });
        });
        resolve(parsedVariables);
      })
      .catch((error) => {
        console.error('Error Parsing Frontmatter');
        console.error(error);
        resolve([]);
      });
  });
}

/**
 * Icon pack prefix mappings following Iconize's naming convention.
 * Hyphenated pack names: first char of first part (upper) + first char of subsequent parts (lower).
 * Non-hyphenated: first char (upper) + second char (lower).
 */
const ICON_PACK_PREFIXES: Record<string, string> = {
  'Fas': 'font-awesome-solid',
  'Far': 'font-awesome-regular',
  'Fab': 'font-awesome-brands',
  'Li': 'lucide',
  'Ri': 'remix-icons',
  'Si': 'simple-icons',
  'Ti': 'tabler-icons',
  'Bo': 'boxicons',
  'Ib': 'icon-brew',
  'Co': 'coolicons',
  'Fe': 'feather-icons',
  'Oc': 'octicons',
  'Ra': 'rpg-awesome',
};

function parseIconReference(iconRef: string): { prefix: string; packName: string; iconName: string } | null {
  // Try longest prefix first (3-char like Fas, Far, Fab) then 2-char (Li, Ri, etc.)
  for (const len of [3, 2]) {
    const prefix = iconRef.substring(0, len);
    if (ICON_PACK_PREFIXES[prefix]) {
      return {
        prefix,
        packName: ICON_PACK_PREFIXES[prefix],
        iconName: iconRef.substring(len),
      };
    }
  }
  return null;
}

function pascalToKebab(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

async function resolveIconizeIcons(plugin: HtmlServerPlugin): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  try {
    // Get the vault's base path on disk
    // @ts-ignore - adapter.basePath is available at runtime
    const vaultBasePath: string = plugin.app.vault.adapter.basePath;

    // Read Iconize's data.json directly from disk (not indexed by vault API)
    const iconizeDataPath = nodePath.join(vaultBasePath, plugin.settings.iconizeDataPath);
    if (!fs.existsSync(iconizeDataPath)) return result;

    const raw = fs.readFileSync(iconizeDataPath, 'utf8');
    const data = JSON.parse(raw);

    // Use the icon packs path from plugin settings
    const iconPacksAbsPath = nodePath.join(vaultBasePath, plugin.settings.iconizeIconPacksPath);

    // Process each path→icon mapping (skip 'settings' key)
    for (const [vaultPath, iconRef] of Object.entries(data)) {
      if (vaultPath === 'settings' || typeof iconRef !== 'string') continue;

      const parsed = parseIconReference(iconRef);
      if (!parsed) continue;

      let svgContent: string | null = null;

      if (parsed.packName === 'lucide') {
        // Use Obsidian's native getIcon() for Lucide icons
        const kebabName = pascalToKebab(parsed.iconName);
        const iconEl = getIcon(kebabName);
        if (iconEl) {
          // getIcon returns an SVGElement — serialize it
          iconEl.setAttribute('width', '14');
          iconEl.setAttribute('height', '14');
          svgContent = iconEl.outerHTML;
        }
      } else {
        // Read SVG from extracted icon pack directory on disk
        const svgFilePath = nodePath.join(iconPacksAbsPath, parsed.packName, `${parsed.iconName}.svg`);
        if (fs.existsSync(svgFilePath)) {
          svgContent = fs.readFileSync(svgFilePath, 'utf8');
          // Normalize size to 14px for sidebar consistency
          svgContent = svgContent
            .replace(/width="[^"]*"/, 'width="14"')
            .replace(/height="[^"]*"/, 'height="14"');
        }
      }

      if (svgContent) {
        result[vaultPath] = svgContent;
      }
    }
  } catch (e) {
    console.error('web-serve: failed to resolve Iconize icons', e);
  }

  return result;
}

function parseHtmlVariables(
  html: string,
  _htmlVariables: { varName: string; varValue: string }[]
) {
  const varMap = new Map();
  _htmlVariables.forEach(({ varName, varValue }) => {
    varMap.set(varName, varValue);
  });
  return html
    .replace(/(#VAR{(\S+)})/g, (_substring, _group1, variableName) => {
      let output = variableName;
      if (varMap.has(variableName)) {
        output = varMap.get(variableName);
      }
      return output;
    });
}
