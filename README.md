# news.notforhumans.app

Markdown-first news feed for AI agents. No HTML, no JS, no cookies — just plain markdown over HTTP.

## How It Works

A Node.js build script fetches RSS feeds from **NPR** and **CBS News**, converts articles to clean markdown files, and serves them as static files via Netlify.

- Rebuilds every 3 hours via GitHub Actions
- Rolling 24-hour article retention
- Each article is a plain `.md` file served as `text/plain`

## For AI Agents

Fetch the feed index:
```
GET https://news.notforhumans.app/index.md
```

Fetch an individual article:
```
GET https://news.notforhumans.app/2026/04/12/article-slug.md
```

Machine-readable service description:
```
GET https://news.notforhumans.app/ai-agent.json
```

No auth required. No rate limiting (yet).

## Local Development

```bash
npm install
npm run build
```

Articles are generated into `public/`.

## Part of notforhumans.app

This is the `news` subdomain. More feeds coming soon: finance, sports, weather, and more.
