import { randomBytes } from 'crypto';

export type ReplaceableVariables = { varName: string; varValue: string };

export type FilterMode = 'none' | 'whitelist' | 'blacklist';

export type TitleAlignment = 'left' | 'center' | 'right';

export type PluginSettings = {
  port: number;
  defaultFile: string;
  hostname: string;
  startOnLoad: boolean;
  useRibbonButons: boolean;
  indexHtml: string;
  htmlReplaceableVariables: ReplaceableVariables[];
  showAdvancedOptions: boolean;
  useSimpleAuth: boolean;
  simpleAuthUsername: string;
  simpleAuthPassword: string;
  filterMode: FilterMode;
  filterDirectories: string[];
  autoDefaultFromFilter: boolean;
  assetDirectories: string[];
  showSidebar: boolean;
  titleAlignment: TitleAlignment;
  showTitle: boolean;
  useIconize: boolean;
  iconizeDataPath: string;
  iconizeIconPacksPath: string;
  folderIconPath: string;
  markdownIconPath: string;
  fileIconPath: string;
  canvasIconPath: string;
};

export const DEFAULT_SETTINGS: PluginSettings = {
  port: 8080,
  hostname: '0.0.0.0',
  defaultFile: '',
  startOnLoad: false,
  useRibbonButons: true,
  filterMode: 'none',
  filterDirectories: [],
  autoDefaultFromFilter: false,
  assetDirectories: [],
  showSidebar: true,
  titleAlignment: 'left',
  showTitle: true,
  useIconize: false,
  iconizeDataPath: '.obsidian/plugins/obsidian-icon-folder/data.json',
  iconizeIconPacksPath: '.obsidian/icons',
  folderIconPath: '.obsidian/plugins/web-serve/icons/folder.svg',
  markdownIconPath: '.obsidian/plugins/web-serve/icons/markdown.svg',
  fileIconPath: '.obsidian/plugins/web-serve/icons/file.svg',
  canvasIconPath: '.obsidian/plugins/web-serve/icons/canvas.svg',
  indexHtml: `<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>#VAR{HTML_TITLE}</title>
  <link rel="shortcut icon" href="#VAR{FAVICON_URL}">
  <link href="#VAR{CSS_FILE_URL}" type="text/css" rel="stylesheet">
  <base href="/">
  <style>
    .ws-layout { display: flex; height: 100vh; overflow: hidden; }
    .ws-sidebar {
      width: 260px; min-width: 200px; max-width: 400px;
      background: var(--background-secondary);
      border-right: 1px solid var(--background-modifier-border);
      overflow-y: auto; overflow-x: hidden;
      flex-shrink: 0; display: flex; flex-direction: column;
      font-size: 13px; transition: width 0.2s, min-width 0.2s, padding 0.2s;
    }
    .ws-sidebar.ws-collapsed {
      width: 0; min-width: 0; padding: 0; border-right: none; overflow: hidden;
    }
    .ws-sidebar-header {
      padding: 10px 12px 6px; font-weight: 600; font-size: 12px;
      text-transform: uppercase; letter-spacing: 0.05em;
      color: var(--text-muted); border-bottom: 1px solid var(--background-modifier-border);
      display: flex; justify-content: space-between; align-items: center;
    }
    .ws-sidebar-tree { padding: 4px 0; flex: 1; overflow-y: auto; }
    .ws-tree-item {
      display: flex; align-items: center; padding: 3px 8px 3px calc(8px + var(--indent, 0) * 16px);
      cursor: pointer; color: var(--text-normal); text-decoration: none;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      border-radius: 4px; margin: 1px 4px;
    }
    .ws-tree-item:hover { background: var(--background-modifier-hover); }
    .ws-tree-item.ws-active { background: var(--background-modifier-active-hover); color: var(--text-accent); }
    .ws-tree-folder-label {
      display: flex; align-items: center; padding: 3px 8px 3px calc(8px + var(--indent, 0) * 16px);
      cursor: pointer; color: var(--text-muted); font-weight: 500;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      border-radius: 4px; margin: 1px 4px; user-select: none;
    }
    .ws-tree-folder-label:hover { background: var(--background-modifier-hover); }
    .ws-tree-chevron {
      display: inline-flex; width: 16px; height: 16px; margin-right: 4px;
      align-items: center; justify-content: center; flex-shrink: 0;
      transition: transform 0.15s;
    }
    .ws-tree-chevron.ws-open { transform: rotate(90deg); }
    .ws-tree-children { display: none; }
    .ws-tree-children.ws-open { display: block; }
    .ws-tree-icon { margin-right: 5px; flex-shrink: 0; display: inline-flex; align-items: center; }
    .ws-main-content { flex: 1; overflow-y: auto; }
    .ws-toggle-btn {
      position: fixed; top: 8px; left: 8px; z-index: 100;
      background: var(--background-secondary); border: 1px solid var(--background-modifier-border);
      border-radius: 4px; padding: 4px 8px; cursor: pointer;
      color: var(--text-muted); font-size: 18px; line-height: 1;
      display: none;
    }
    .ws-toggle-btn:hover { background: var(--background-modifier-hover); color: var(--text-normal); }
    .ws-sidebar.ws-collapsed ~ .ws-main-content .ws-toggle-btn { display: block; }
    .ws-close-btn {
      cursor: pointer; color: var(--text-muted); font-size: 14px; line-height: 1;
      width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center;
      border: 1px solid var(--background-modifier-border); border-radius: 4px;
      background: var(--background-primary); flex-shrink: 0;
    }
    .ws-close-btn:hover { color: var(--text-normal); background: var(--background-modifier-hover); }
    .ws-search-box {
      padding: 6px 8px; border-bottom: 1px solid var(--background-modifier-border);
    }
    .ws-search-box input {
      width: 100%; padding: 4px 8px; border: 1px solid var(--background-modifier-border);
      border-radius: 4px; background: var(--background-primary);
      color: var(--text-normal); font-size: 12px; outline: none;
    }
    .ws-search-box input:focus { border-color: var(--interactive-accent); }
    .ws-tree-item.ws-hidden, .ws-tree-folder.ws-hidden { display: none; }
  </style>
</head>
<body
  class="#VAR{THEME_MODE} mod-windows is-frameless is-maximized is-hidden-frameless obsidian-app show-inline-title show-view-header"
  style="--zoom-factor:1; --font-text-size:16px;">
  <div class="ws-layout">
    <nav class="ws-sidebar" id="ws-sidebar">
      <div class="ws-sidebar-header">
        <span>Files</span>
        <button class="ws-close-btn" onclick="toggleSidebar()" title="Close sidebar"><svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" stroke-width="1.5"><line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/></svg></button>
      </div>
      <div class="ws-search-box">
        <input type="text" id="ws-search" placeholder="Filter files..." oninput="filterTree(this.value)">
      </div>
      <div class="ws-sidebar-tree" id="ws-file-tree">
        <div style="padding:12px;color:var(--text-muted);">Loading...</div>
      </div>
    </nav>
    <div class="ws-main-content">
      <button class="ws-toggle-btn" onclick="toggleSidebar()" title="Open sidebar">&#9776;</button>
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
                            tabindex="-1" style="tab-size: 4;">
                            <div class="markdown-preview-sizer markdown-preview-section" style="padding-bottom: 369px; min-height: 1158px;">
                              <div class="markdown-preview-pusher" style="width: 1px; height: 0.1px; margin-bottom: 0px;"></div>
                              <div class="mod-header">
                                <div class="inline-title" contenteditable="true" spellcheck="false" tabindex="-1" enterkeyhint="done">#VAR{RENDERED_CONTENT_FILE_NAME}
                                </div>
                                #VAR{RENDERED_CONTENT}
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
  <script>
    function toggleSidebar() {
      document.getElementById('ws-sidebar').classList.toggle('ws-collapsed');
    }

    function filterTree(query) {
      query = query.toLowerCase().trim();
      const tree = document.getElementById('ws-file-tree');
      const items = tree.querySelectorAll('.ws-tree-item');
      const folders = tree.querySelectorAll('.ws-tree-folder');
      if (!query) {
        items.forEach(function(el) { el.classList.remove('ws-hidden'); });
        folders.forEach(function(el) { el.classList.remove('ws-hidden'); });
        return;
      }
      items.forEach(function(el) {
        var name = (el.getAttribute('data-name') || el.textContent).toLowerCase();
        el.classList.toggle('ws-hidden', name.indexOf(query) === -1);
      });
      folders.forEach(function(folder) {
        var hasVisible = folder.querySelector('.ws-tree-item:not(.ws-hidden)');
        folder.classList.toggle('ws-hidden', !hasVisible);
        if (hasVisible) {
          var children = folder.querySelector('.ws-tree-children');
          if (children) children.classList.add('ws-open');
          var chev = folder.querySelector('.ws-tree-chevron');
          if (chev) chev.classList.add('ws-open');
        }
      });
    }

    function _g(obj, key) { return obj[key]; }
    function _s(obj, key, val) { obj[key] = val; }

    function buildTree(files) {
      var root = {};
      files.forEach(function(f) {
        var parts = f.path.split('/');
        var node = root;
        for (var i = 0; i < parts.length - 1; i++) {
          var seg = _g(parts, i);
          if (!_g(node, seg)) _s(node, seg, { __files: [] });
          node = _g(node, seg);
        }
        if (!node.__files) node.__files = [];
        node.__files.push({ name: _g(parts, parts.length - 1), path: f.path });
      });
      return root;
    }

    var wsIconMap = {};
    var wsDefaults = {};

    function renderNode(node, container, depth, ancestors) {
      ancestors = ancestors || [];
      var keys = Object.keys(node).filter(function(k) { return k !== '__files'; }).sort();
      keys.forEach(function(folderName) {
        var folderDiv = document.createElement('div');
        folderDiv.className = 'ws-tree-folder';
        var label = document.createElement('div');
        label.className = 'ws-tree-folder-label';
        label.style.setProperty('--indent', depth);
        var chevron = document.createElement('span');
        chevron.className = 'ws-tree-chevron';
        chevron.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
        label.appendChild(chevron);
        var icon = document.createElement('span');
        icon.className = 'ws-tree-icon';
        var folderPath = ancestors.concat(folderName).join('/');
        if (wsIconMap[folderPath]) {
          icon.innerHTML = wsIconMap[folderPath];
        } else {
          icon.innerHTML = wsDefaults.folder || '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>';
        }
        label.appendChild(icon);
        var nameSpan = document.createElement('span');
        nameSpan.textContent = folderName;
        label.appendChild(nameSpan);
        folderDiv.appendChild(label);
        var childrenDiv = document.createElement('div');
        childrenDiv.className = 'ws-tree-children';
        renderNode(_g(node, folderName), childrenDiv, depth + 1, ancestors.concat(folderName));
        folderDiv.appendChild(childrenDiv);
        label.addEventListener('click', function() {
          chevron.classList.toggle('ws-open');
          childrenDiv.classList.toggle('ws-open');
        });
        container.appendChild(folderDiv);
      });
      var files = (node.__files || []).sort(function(a, b) { return a.name.localeCompare(b.name); });
      files.forEach(function(file) {
        var a = document.createElement('a');
        a.className = 'ws-tree-item';
        a.href = '/' + file.path;
        a.style.setProperty('--indent', depth);
        a.setAttribute('data-name', file.name);
        var icon = document.createElement('span');
        icon.className = 'ws-tree-icon';
        var filePathNoExt = file.path.replace(/\\.[^.]+$/, '');
        if (wsIconMap[file.path]) {
          icon.innerHTML = wsIconMap[file.path];
        } else if (wsIconMap[filePathNoExt]) {
          icon.innerHTML = wsIconMap[filePathNoExt];
        } else if (file.name.match(/\\.canvas$/i)) {
          icon.innerHTML = wsDefaults.canvas || '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
        } else if (file.name.match(/\\.md$/i)) {
          icon.innerHTML = wsDefaults.markdown || '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
        } else {
          icon.innerHTML = wsDefaults.file || '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
        }
        a.appendChild(icon);
        var nameSpan = document.createElement('span');
        nameSpan.textContent = file.name.replace(/\\.(md|canvas)$/i, '');
        a.appendChild(nameSpan);
        if ('/' + file.path === decodeURI(window.location.pathname)) {
          a.classList.add('ws-active');
        }
        container.appendChild(a);
      });
    }

    Promise.all([
      fetch('/.api/files').then(function(r) { return r.json(); }),
      fetch('/.api/icons').then(function(r) { return r.json(); }).catch(function() { return { iconMap: {}, defaults: {} }; })
    ]).then(function(results) {
      var data = results[0];
      var iconsData = results[1] || {};
      wsIconMap = iconsData.iconMap || {};
      wsDefaults = iconsData.defaults || {};
      var tree = buildTree(data.files);
      var container = document.getElementById('ws-file-tree');
      container.innerHTML = '';
      renderNode(tree, container, 0, []);
      var active = container.querySelector('.ws-active');
      if (active) {
        var parent = active.parentElement;
        while (parent && parent !== container) {
          if (parent.classList.contains('ws-tree-children')) {
            parent.classList.add('ws-open');
            var chev = parent.previousElementSibling ? parent.previousElementSibling.querySelector('.ws-tree-chevron') : null;
            if (chev) chev.classList.add('ws-open');
          }
          parent = parent.parentElement;
        }
        active.scrollIntoView({ block: 'center' });
      }
    }).catch(function(err) {
      document.getElementById('ws-file-tree').innerHTML = '<div style="padding:12px;color:var(--text-error);">Failed to load files</div>';
      console.error(err);
    });
  </script>
</body>
</html>`,
  htmlReplaceableVariables: [
    {
      varName: 'HTML_TITLE',
      varValue: 'Web Serve',
    },
    {
      varName: 'FAVICON_URL',
      varValue: '//obsidian.md/favicon.ico',
    },
    {
      varName: 'CSS_FILE_URL',
      varValue: '/.obsidian/plugins/web-serve/app.css',
    },
  ],
  showAdvancedOptions: false,
  useSimpleAuth: false,
  simpleAuthUsername: 'obsidian',
  simpleAuthPassword: randomBytes(8).toString('hex'),
};
