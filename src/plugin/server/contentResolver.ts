import { INTERNAL_CSS_ENPOINT, INTERNAL_LOGIN_ENPOINT, INTERNAL_FILES_ENDPOINT, INTERNAL_ICONS_ENDPOINT, INTERNAL_LINKS_ENDPOINT, INTERNAL_FORCE_GRAPH_ENDPOINT } from './pathResolver';
import HtmlServerPlugin from 'plugin/main';
import { CustomMarkdownRenderer } from 'plugin/markdownRenderer/customMarkdownRenderer';
import mime from 'mime-types';
import { ReplaceableVariables } from 'plugin/settings/settings';
import { App, TFile, TFolder, getIcon, normalizePath } from 'obsidian';
import * as fs from 'fs';
import * as nodePath from 'path';

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
        files: filteredFiles.map((f: TFile) => ({ path: f.path, name: f.name, extension: f.extension }))
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

  if (file.extension === 'md') {
    const frontmatterVariables = await readFrontmatter(file, plugin.app);
    const markdown = await file.vault.read(file);
    const renderedMarkdown = await markdownRenderer.renderHtmlFromMarkdown(
      markdown
    );

    let htmlOutput = parseHtmlVariables(
      plugin.settings.indexHtml || '<html></html>',
      [
        {
          varName: 'VAULT_NAME',
          varValue: plugin.app.vault.getName(),
        },
        {
          varName: 'RENDERED_CONTENT_FILE_NAME',
          varValue: file.basename,
        },
        {
          varName: 'THEME_MODE',
          varValue: document.body.classList.contains('theme-dark')
            ? 'theme-dark'
            : 'theme-light',
        },
        {
          varName: 'RENDERED_CONTENT',
          varValue: renderedMarkdown,
        },
        ...plugin.settings.htmlReplaceableVariables,
        ...frontmatterVariables,
      ]
    );

    // Inject sidebar resize handle
    htmlOutput = htmlOutput.replace(
      '</head>',
      `<style>
.ws-resize-handle{width:5px;cursor:col-resize;flex-shrink:0;background:transparent;position:relative;z-index:10}
.ws-resize-handle:hover,.ws-resize-handle.ws-dragging{background:var(--interactive-accent);opacity:.5}
.ws-sidebar.ws-collapsed+.ws-resize-handle{display:none}
.ws-tree-item,.ws-tree-folder-label{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;word-break:break-word}
</style></head>`
    );
    // Inject graph button into sidebar footer (before </nav>)
    htmlOutput = htmlOutput.replace(
      '</nav>',
      `<div style="padding:8px;border-top:1px solid var(--background-modifier-border);flex-shrink:0"><button id="ws-graph-btn" style="display:flex;align-items:center;gap:6px;width:100%;padding:6px 8px;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);color:var(--text-muted);font-size:12px;cursor:pointer" onmouseover="this.style.background='var(--background-modifier-hover)';this.style.color='var(--text-normal)'" onmouseout="this.style.background='var(--background-primary)';this.style.color='var(--text-muted)'" onclick="openGraph()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="8.5" y1="7.5" x2="15.5" y2="16.5"/><line x1="15.5" y1="7.5" x2="8.5" y2="16.5"/></svg>Graph view</button></div></nav>`
    );
    htmlOutput = htmlOutput.replace(
      '</nav>',
      '</nav><div class="ws-resize-handle" id="ws-resize-handle"></div>'
    );
    // Inject graph overlay + force-graph library + all scripts
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

    /* Build adjacency index for neighbor highlighting */
    var adj = {};
    data.edges.forEach(function(e) {
      if (!adj[e.source]) adj[e.source] = [];
      if (!adj[e.target]) adj[e.target] = [];
      adj[e.source].push(e.target);
      adj[e.target].push(e.source);
    });

    /* Degree for node sizing */
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

        /* Glow effect for current and hovered nodes */
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

        /* Node circle */
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
        if (isCurrent) {
          ctx.fillStyle = accentColor;
          ctx.globalAlpha = 1;
        } else if (isHover) {
          ctx.fillStyle = nodeHoverColor;
          ctx.globalAlpha = 1;
        } else if (isNeighbor) {
          ctx.fillStyle = nodeHoverColor;
          ctx.globalAlpha = 0.8;
        } else {
          ctx.fillStyle = nodeBaseColor;
          ctx.globalAlpha = dimmed ? 0.15 : 0.6;
        }
        ctx.fill();
        ctx.globalAlpha = 1;

        /* Labels */
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

    /* Zoom to fit after layout settles */
    setTimeout(function() {
      wsGraphInstance.zoomToFit(400, 60);
    }, 1500);
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
