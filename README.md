# Web Serve

An Obsidian plugin that serves your vault as a read-only website on your local network. Browse notes from any device — phone, tablet, or another computer — using just a web browser.

**Desktop only** | Obsidian 0.15.0+ | License: GPL 3.0

## Features

- **Local HTTP server** — starts an Express server inside Obsidian, accessible from any device on the same network
- **File sidebar** — navigable tree view with search/filter, drag-to-resize, and collapsible folders
- **Live reload** — WebSocket-based auto-refresh when notes are created, modified, deleted, or renamed
- **Excalidraw viewer** — read-only rendering of `.excalidraw.md` files with pan, zoom, and clickable links
- **Canvas viewer** — read-only rendering of `.canvas` files with positioned cards, edges, and pan/zoom
- **PDF export** — export any note as a PDF (images included, respects sizing)
- **Markdown export** — download the raw `.md` file for any note
- **Light/dark theme** — mirrors your active Obsidian theme; viewers can toggle independently
- **Mobile-responsive** — hamburger menu, swipe gestures, responsive layout for phones and tablets
- **QR code** — shown on server start for quick access from a mobile device
- **Authentication** — optional username/password login via Passport.js
- **Directory filtering** — whitelist or blacklist specific directories from the web view
- **Iconize integration** — pulls custom folder/file icons from the Iconize plugin
- **Obsidian-native rendering** — uses Obsidian's own markdown renderer, so callouts, embeds, Mermaid diagrams, and syntax highlighting all work correctly
- **Theme passthrough** — dumps your active Obsidian CSS (including community themes) so the web view looks identical to your vault

## Installation

### From source

```sh
git clone <repo-url>
cd web-serve
npm install
npm run build
```

Copy the built files (`main.js`, `manifest.json`, `styles.css`) into your vault at `.obsidian/plugins/web-serve/`, then enable the plugin in Obsidian's Community Plugins settings.

### Development

```sh
npm run dev       # watch mode — rebuilds on file changes
npm run test      # run tests in watch mode
npm run test:once # single test run
```

After building, reload the plugin in Obsidian:

```sh
obsidian plugin:reload id=web-serve
```

## Usage

1. Enable the plugin in Obsidian settings
2. Click the **Start** ribbon button (or use the command palette: "Web Serve: Start server")
3. A QR code modal appears with the local URL (e.g., `http://192.168.1.x:8080`)
4. Open that URL on any device on the same network

To stop the server, click the **Stop** ribbon button or use the command palette.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| **Port** | `8080` | HTTP listen port |
| **Hostname** | `0.0.0.0` | Bind address (all interfaces by default) |
| **Start on load** | `false` | Auto-start the server when Obsidian opens |
| **Live reload** | `true` | Auto-refresh connected browsers on vault changes |
| **Show QR on start** | `true` | Display QR code modal when the server starts |
| **Ribbon buttons** | `true` | Show start/stop buttons in the left ribbon |
| **Default file** | _(none)_ | File to serve at `/`; leave blank for file listing |
| **Show sidebar** | `true` | Show the file navigation sidebar |
| **Show title** | `true` | Show the note title inline above content |
| **Title alignment** | `left` | Note title alignment: `left`, `center`, or `right` |

### Directory filtering

| Setting | Default | Description |
|---------|---------|-------------|
| **Filter mode** | `none` | `none`, `whitelist`, or `blacklist` |
| **Filter directories** | `[]` | Directories to include or exclude |
| **Asset directories** | `[]` | Directories always served regardless of filter (for images, etc.) |
| **Auto-default from filter** | `false` | Redirect `/` to the first allowed file |

### Authentication

| Setting | Default | Description |
|---------|---------|-------------|
| **Enable auth** | `false` | Require login to access the web view |
| **Username** | `obsidian` | Login username |
| **Password** | _(random)_ | Auto-generated 16-character hex string on first install |

### Iconize integration

| Setting | Default | Description |
|---------|---------|-------------|
| **Use Iconize** | `false` | Pull custom icons from the Iconize plugin |
| **Iconize data path** | `.obsidian/plugins/obsidian-icon-folder/data.json` | Path to Iconize's data file |

### Advanced

The HTML shell template is fully customizable via the settings tab. It uses `#VAR{...}` placeholders for dynamic values (title, favicon, CSS URL). Edit with caution — a broken template will break the web view.

## API endpoints

The server exposes several internal endpoints used by the web frontend:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/.api/files` | GET | JSON list of all allowed vault files |
| `/.api/icons` | GET | JSON icon map (Iconize + built-in SVGs) |
| `/.api/links` | GET | JSON node/edge graph data |
| `/.api/export/md?path=...` | GET | Download raw markdown file |
| `/.api/export/pdf?path=...` | GET | Export note as PDF |
| `/.ws/live-reload` | WS | WebSocket for live reload notifications |

## Project structure

```
web-serve/
├── src/plugin/
│   ├── main.ts                    # Plugin entry point
│   ├── uiSetup.ts                 # Ribbon button wiring
│   ├── qrModal.ts                 # QR code modal
│   ├── markdownRenderer/
│   │   └── obsidianMarkdownRenderer.ts  # Server-side markdown rendering via Obsidian's API
│   ├── server/
│   │   ├── controller.ts          # Express app, routes, auth, WebSocket server
│   │   ├── contentResolver.ts     # Response payloads for all file types
│   │   └── pathResolver.ts        # URL-to-vault-file resolution
│   └── settings/
│       ├── settings.ts            # Settings type definitions and defaults
│       └── settingsTab.ts         # Settings UI panel
├── icons/                         # Default SVG icons (folder, file, markdown, canvas)
├── vendor/                        # Bundled libraries (force-graph, html2pdf)
├── rollup.config.mjs              # Build configuration
├── manifest.json                  # Obsidian plugin metadata
└── package.json
```

## Known limitations

- **Desktop only** — PDF export relies on Electron's `BrowserWindow.printToPDF()`, so this plugin cannot run on Obsidian Mobile.
- **Excalidraw CDN dependency** — the Excalidraw viewer loads `@excalidraw/utils` from unpkg.com at runtime, so rendering `.excalidraw.md` files requires an internet connection.
- **Same network only** — the server binds to your local network. It is not exposed to the internet unless you configure port forwarding (not recommended without authentication enabled).
