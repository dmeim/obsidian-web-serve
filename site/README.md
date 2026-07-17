# Web Serve landing

Astro + React + Framer Motion marketing site for the Web Serve Obsidian plugin.

## Commands

```sh
npm install
npm run dev
npm run build
npx wrangler deploy --temporary   # workers.dev preview (no Cloudflare login)
```

Preview alias upload (authenticated accounts):

```sh
npm run build && npx wrangler versions upload --preview-alias landing
```
