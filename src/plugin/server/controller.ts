import express, { Handler, Request } from 'express';
import expressSession from 'express-session';

import { IncomingMessage, Server, ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import HtmlServerPlugin from '../main';
import { CustomMarkdownRenderer } from '../markdownRenderer/customMarkdownRenderer';
import { ObsidianMarkdownRenderer } from '../markdownRenderer/obsidianMarkdownRenderer';
import * as passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as nodePath from 'path';
import { INTERNAL_LOGIN_ENPOINT, INTERNAL_CSS_ENPOINT, INTERNAL_FILES_ENDPOINT, INTERNAL_ICONS_ENDPOINT, INTERNAL_LINKS_ENDPOINT, INTERNAL_FORCE_GRAPH_ENDPOINT, INTERNAL_HTML2PDF_ENDPOINT, INTERNAL_EXPORT_MD_ENDPOINT, INTERNAL_EXPORT_PDF_ENDPOINT, tryResolveFilePath } from './pathResolver';
import { contentResolver } from './contentResolver';
import { TFile } from 'obsidian';

export class ServerController {
  app: express.Application;
  server?: Server<typeof IncomingMessage, typeof ServerResponse>;
  wss?: WebSocketServer;
  markdownRenderer: CustomMarkdownRenderer;

  constructor(private plugin: HtmlServerPlugin) {
    this.app = express();

    this.app.use(expressSession({ secret: randomBytes(16).toString('base64') }));
    this.app.use(passport.initialize());
    this.app.use(passport.session());

    passport.serializeUser(function (user, done) {
      done(null, user);
    });

    passport.deserializeUser(function (username, done) {
      done(null, { username });
    });

    this.markdownRenderer = new ObsidianMarkdownRenderer(plugin, plugin.app);

    passport.use(
      new LocalStrategy((username, password, done) => {
        if (username === this.plugin.settings.simpleAuthUsername && password === this.plugin.settings.simpleAuthPassword) {
          done(null, { username });
          return;
        }
        done('Wrong Credentials');
      })
    );

    this.app.use(express.urlencoded());

    this.app.post('/login', passport.authenticate('local', {}), (req, res) => {
      res.redirect(req.body.redirectUrl || '/');
    });

    // Export raw markdown endpoint
    this.app.get(INTERNAL_EXPORT_MD_ENDPOINT, this.authenticateIfNeeded, async (req, res) => {
      const filePath = typeof req.query.path === 'string' ? decodeURIComponent(req.query.path) : '';
      if (!filePath) { res.status(400).send('Missing path parameter'); return; }

      const file = plugin.app.vault.getAbstractFileByPath(filePath);
      if (!file || !(file instanceof TFile)) { res.status(404).send('File not found'); return; }
      if (!this.isPathAllowed(file.path)) { res.status(403).send('Access denied'); return; }

      const raw = await plugin.app.vault.read(file as TFile);
      const filename = file.name;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.contentType('text/markdown; charset=utf-8');
      res.send(raw);
    });

    // PDF export — diagnose + render via Electron BrowserWindow
    this.app.get(INTERNAL_EXPORT_PDF_ENDPOINT, this.authenticateIfNeeded, async (req, res) => {
      const filePath = typeof req.query.path === 'string' ? decodeURIComponent(req.query.path) : '';
      if (!filePath) { res.status(400).send('Missing path parameter'); return; }

      const file = plugin.app.vault.getAbstractFileByPath(filePath);
      if (!file || !(file instanceof TFile)) { res.status(404).send('File not found'); return; }
      if (!this.isPathAllowed(file.path)) { res.status(403).send('Access denied'); return; }

      try {
        // Render the note via the markdown renderer
        const tfile = file as TFile;
        const markdown = await plugin.app.vault.read(tfile);
        const renderedHtml = await this.markdownRenderer.renderHtmlFromMarkdown(markdown);

        // @ts-ignore – adapter.basePath is available at runtime
        const vaultBase: string = plugin.app.vault.adapter.basePath;

        // Build a clean, self-contained HTML page for PDF export
        let html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#1a1a1a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6}
body{padding:40px 50px}
h1{font-size:2em;margin:0 0 .6em;border-bottom:1px solid #e0e0e0;padding-bottom:.3em}
h2{font-size:1.5em;margin:1.2em 0 .5em;border-bottom:1px solid #eee;padding-bottom:.2em}
h3{font-size:1.25em;margin:1em 0 .4em}
h4,h5,h6{font-size:1.05em;margin:1em 0 .3em}
p{margin:.5em 0}
a{color:#4078c0;text-decoration:none}
img{max-width:100%;height:auto;border-radius:4px;margin:.5em 0}
blockquote{margin:.5em 0;padding:0 1em;border-left:3px solid #ddd;color:#555}
code{font-family:SFMono-Regular,Consolas,"Liberation Mono",Menlo,monospace;font-size:.9em;background:#f5f5f5;padding:2px 5px;border-radius:3px}
pre{background:#f5f5f5;padding:12px 16px;border-radius:6px;overflow-x:auto;margin:.8em 0}
pre code{background:none;padding:0}
table{border-collapse:collapse;width:100%;margin:.8em 0}
th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}
th{background:#f5f5f5;font-weight:600}
tr:nth-child(even){background:#fafafa}
ul,ol{padding-left:2em;margin:.5em 0}
li{margin:.2em 0}
hr{border:none;border-top:1px solid #e0e0e0;margin:1.5em 0}
.callout{border:1px solid #e0e0e0;border-radius:6px;padding:12px 16px;margin:.8em 0;background:#fafafa}
.callout-title{font-weight:600;margin-bottom:.3em}
.tag{background:#e8f0fe;color:#1967d2;padding:1px 6px;border-radius:3px;font-size:.85em}
.footnotes{font-size:.85em;color:#666;border-top:1px solid #e0e0e0;margin-top:2em;padding-top:1em}
.internal-link{color:#4078c0}
.math{font-family:serif}
</style></head>
<body>
${renderedHtml}
</body></html>`;

        // Rewrite image src paths to file:// so they load from vault
        html = html.replace(/src="\/([^"]+)"/g, (_: string, p: string) =>
          `src="file://${vaultBase}/${decodeURIComponent(p)}"`
        );

        const tmpFile = nodePath.join(os.tmpdir(), `ws-pdf-${Date.now()}.html`);
        fs.writeFileSync(tmpFile, html, 'utf-8');
        console.log('web-serve PDF: wrote HTML', tmpFile, '(' + html.length + ' bytes)');

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { BrowserWindow } = require('@electron/remote');
        const win = new BrowserWindow({
          show: false,
          width: 816,   // A4-ish at 96dpi
          height: 1056,
          webPreferences: { javascript: false, webSecurity: false, images: true },
        });

        await win.loadFile(tmpFile);
        console.log('web-serve PDF: page loaded');

        // Wait for rendering
        await new Promise(r => setTimeout(r, 1500));

        const pdfBuffer = await win.webContents.printToPDF({
          pageSize: 'A4',
          printBackground: false,
        });
        console.log('web-serve PDF: printToPDF returned', pdfBuffer.length, 'bytes');

        win.destroy();
        try { fs.unlinkSync(tmpFile); } catch (_) { /* ignore */ }

        const filename = (file as TFile).name.replace(/\.md$/, '.pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.contentType('application/pdf');
        res.send(Buffer.from(pdfBuffer));
      } catch (err: any) {
        console.error('web-serve PDF: FAILED', err);
        res.status(500).send('PDF export failed: ' + (err?.message || err));
      }
    });

    this.app.use('/', this.authenticateIfNeeded, async (req, res) => {
      let path = decodeURI(req.path);

      if (!path || path === '/') {
        path = '/' + plugin.settings.defaultFile;

        // If auto-default is enabled and the default file is empty or not allowed,
        // redirect to the first allowed file from the filter list
        if (plugin.settings.autoDefaultFromFilter) {
          const defaultResolved = plugin.settings.defaultFile
            ? tryResolveFilePath(path, '', app)
            : null;
          const defaultAllowed = defaultResolved ? this.isPathAllowed(defaultResolved) : false;

          if (!defaultResolved || !defaultAllowed) {
            const firstAllowed = this.getFirstAllowedFile();
            if (firstAllowed) {
              res.redirect('/' + firstAllowed);
              res.end();
              return;
            }
          }
        }
      }

      const resolveFromPath = getResolveFromPath(req);

      const resolvedPath = tryResolveFilePath(path, resolveFromPath, app);

      if (!resolvedPath) {
        res.status(404).write(`Couldn't resolve file at path '${req.path}'`);
        res.end();
        return;
      }

      // Enforce directory filtering on resolved files
      if (!this.isPathAllowed(resolvedPath)) {
        res.status(403).write(`Access denied: '${req.path}'`);
        res.end();
        return;
      }

      if (!('/' + resolvedPath === path || resolvedPath === path)) {
        res.redirect('/' + resolvedPath);
        res.end();
        return;
      }

      const r = await contentResolver(path, resolveFromPath, this.plugin, this.markdownRenderer);

      if (!r) {
        res.status(404).write(`Error reading file at path '${req.path}'`);
        res.end();
        return;
      }

      res.contentType(r.contentType);
      res.write(r.payload);
      res.end();
    });
  }

  /**
   * Get the first allowed .md file based on the current filter settings.
   */
  getFirstAllowedFile(): string | null {
    const allFiles = this.plugin.app.vault.getFiles()
      .filter((f: TFile) => f.extension === 'md' && !f.path.startsWith('.obsidian'))
      .sort((a: TFile, b: TFile) => a.path.localeCompare(b.path));

    for (const f of allFiles) {
      if (this.isPathAllowed(f.path)) {
        return f.path;
      }
    }
    return null;
  }

  /**
   * Check if a resolved path is allowed by the current filter settings.
   */
  isPathAllowed(filePath: string): boolean {
    const { filterMode, filterDirectories, assetDirectories } = this.plugin.settings;
    if (filterMode === 'none' || filterDirectories.length === 0) return true;

    // Internal endpoints are always allowed
    if (filePath.startsWith('/.')) return true;

    // Asset directories are always allowed regardless of filter mode
    if (assetDirectories.length > 0) {
      const normalizedAssetDirs = assetDirectories.map(d => d.replace(/\/+$/, ''));
      const inAssetDir = normalizedAssetDirs.some(dir =>
        filePath === dir || filePath.startsWith(dir + '/')
      );
      if (inAssetDir) return true;
    }

    const normalizedDirs = filterDirectories.map(d => d.replace(/\/+$/, ''));

    const pathInDir = (dir: string) => {
      return filePath === dir || filePath.startsWith(dir + '/');
    };

    if (filterMode === 'whitelist') {
      return normalizedDirs.some(pathInDir);
    }
    if (filterMode === 'blacklist') {
      return !normalizedDirs.some(pathInDir);
    }
    return true;
  }

  async start() {
    if (!this.server || !this.server.listening) {
      this.server = await new Promise<Server<typeof IncomingMessage, typeof ServerResponse> | undefined>((resolve) => {
        try {
          if (this.server?.listening) return resolve(this.server);
          const server = this.app.listen(this.plugin.settings.port, this.plugin.settings.hostname, () => {
            resolve(server);
          });
        } catch (error) {
          console.error('error trying to start the server', error);
          resolve(undefined);
        }
      });

      // Attach WebSocket server for live reload
      if (this.server && this.plugin.settings.liveReload) {
        this.wss = new WebSocketServer({ server: this.server, path: '/.ws/live-reload' });
      }
    }
  }

  /** Broadcast a live-reload message to all connected WebSocket clients */
  broadcastReload(event: string, filePath: string) {
    if (!this.wss) return;
    const msg = JSON.stringify({ type: event, path: filePath });
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  async stop() {
    // Close WebSocket server first
    if (this.wss) {
      this.wss.clients.forEach((client) => client.close());
      this.wss.close();
      this.wss = undefined;
    }

    if (this.server && this.server.listening) {
      await new Promise<void>((resolve) => {
        this.server?.close((err) => {
          err && console.error(err);
          resolve();
        });
      });
    }
  }

  async reload() {
    if (!this.isRunning()) return;
    await this.stop();
    await this.start();
  }

  isRunning() {
    return this.server?.listening;
  }

  authenticateIfNeeded: Handler = async (req, res, next) => {
    if (!this.plugin.settings.useSimpleAuth) return next();

    if (req.user) return next();

    const resolveFromPath = getResolveFromPath(req);

    const path = tryResolveFilePath(req.path, resolveFromPath, this.plugin.app);

    if (path && [`.css`, `.ico`].find((ext) => path.endsWith(ext))) return next();

    // Allow the files, icons, links, and vendor API endpoints through for sidebar/graph
    if ([INTERNAL_FILES_ENDPOINT, INTERNAL_ICONS_ENDPOINT, INTERNAL_LINKS_ENDPOINT, INTERNAL_FORCE_GRAPH_ENDPOINT, INTERNAL_HTML2PDF_ENDPOINT, INTERNAL_EXPORT_MD_ENDPOINT, INTERNAL_EXPORT_PDF_ENDPOINT].includes(req.path)) return next();

    const nonce = randomBytes(32).toString('base64');

    res.contentType('text/html; charset=UTF-8');
    res.setHeader('Content-Security-Policy', `script-src 'nonce-${nonce}'`);

    const content = await contentResolver(INTERNAL_LOGIN_ENPOINT, '/', this.plugin, this.markdownRenderer, [
      {
        varName: 'REDIRECT_URL',
        varValue: req.url,
      },
      {
        varName: 'NONCE',
        varValue: nonce,
      },
    ]);

    res.send(content?.payload);
  };
}

const getResolveFromPath = (req: Request) => {
  const url = new URL(req.headers?.referer || 'http://localhost/');
  const fromPath = decodeURIComponent(url.pathname || '/');
  return fromPath.substring(1);
};
