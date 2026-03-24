# Web-Serve Plugin — Feature Roadmap

## Features

- [x] **Live reload via WebSocket** — WebSocket server + client script for auto-refresh on vault changes (modify, create, delete, rename). Includes reconnection logic.
- [ ] **Spruce up search/filter bar** — Fuzzy matching, content search via `/.api/search`, result highlighting, keyboard navigation. All results respect whitelist/blacklist filtering.
- [x] **Light/dark theme toggle** — Sun/moon toggle defaulting to Obsidian's current theme. Persists viewer preference in localStorage. Swaps without page reload.
- [ ] **Lightweight graph view** — Force-directed graph of linked notes (D3 or similar). Clickable nodes, current-note highlight. Respects whitelist/blacklist filtering.
- [x] **Canvas rendering** — Read-only `.canvas` file viewer. Parses Obsidian's JSON format, renders positioned cards with markdown content, edges/arrows, pan/zoom.
- [ ] **PDF and Markdown export** — Export buttons for current note. PDF via print stylesheet, MD via raw file download endpoint. Clean print styles hiding UI chrome.
- [x] **QR code on server start** — Generate QR code with local network IP URL. Show in Obsidian modal with copyable text. Command to re-show after initial start.
- [x] **Mermaid diagram and code block rendering** — Ensure Mermaid.js diagrams and syntax-highlighted code blocks render properly in the web view with graceful fallback.
- [x] **Excalidraw viewing** — Read-only `.excalidraw.md` file viewer. Decompresses LZ-string data, renders shapes as SVG (rectangles, ellipses, diamonds, lines, arrows, text, freedraw). Pan/zoom with mouse and touch.
- [x] **Mobile-friendly responsive design** — Hamburger menu sidebar, swipe gestures, responsive typography/images, touch-friendly targets (44px+), media queries for tablet/phone breakpoints.
