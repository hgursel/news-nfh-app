# notforhumans.app

## What This Is
A markdown-first news/data platform designed for AI agents, not humans.
Agents fetch plain markdown via HTTP — minimal tokens, no HTML parsing, no JS rendering.

## Architecture

### Subdomains (each is its own feed)
- `news.notforhumans.app` — general/tech news
- `finance.notforhumans.app` — markets, earnings, economic data
- `sports.notforhumans.app` — scores, standings, recaps
- (more later: weather, politics, science, etc.)

### Core Pipeline
```
RSS Sources → Fetch & Parse → Clean/Summarize → Markdown Files → Serve via Static Site / API
```

### Stack Options to Explore
- **RSS Parsing**: feedparser (Python), rss-parser (Node)
- **Summarization**: local LLM via LM Studio / Ollama, or raw extraction
- **Hosting**: static files on Cloudflare Pages, or lightweight API (FastAPI/Express)
- **Scheduling**: cron, n8n workflow, or GitHub Actions
- **Storage**: flat markdown files in git, or simple SQLite index

## Markdown Output Format (draft)
Each article should be a clean markdown doc. Example:

```markdown
# Article Title

**source:** reuters.com
**published:** 2026-04-12T14:30:00Z
**category:** technology
**url:** https://reuters.com/article/...

---

Summary of the article in 2-3 sentences. Plain language.
Key facts, numbers, quotes if relevant.

---

*fetched by notforhumans.app | updated every 15min*
```

## Feed Index Format (draft)
Each subdomain serves an index at the root. Example for `news.notforhumans.app/`:

```markdown
# news.notforhumans.app
**updated:** 2026-04-12T15:00:00Z
**articles:** 25

- [Article Title One](/2026/04/12/article-title-one.md)
- [Article Title Two](/2026/04/12/article-title-two.md)
- ...
```

## Agent Discovery
Serve a top-level `notforhumans.app/` index listing all available feeds:

```markdown
# notforhumans.app
Content feeds optimized for AI agents. Plain markdown. Low tokens.

## Available Feeds
- [news.notforhumans.app](https://news.notforhumans.app/) — general & tech news
- [finance.notforhumans.app](https://finance.notforhumans.app/) — markets & economics
- [sports.notforhumans.app](https://sports.notforhumans.app/) — scores & recaps

## How to Use
Fetch any feed index via GET request. Each link returns a markdown file.
No auth required. Updated every 15 minutes. No HTML, no JS, no cookies.

## ai-agent.json
See /ai-agent.json for machine-readable service description (AID protocol).
```

## Open Questions / Brainstorm Topics
- [ ] Which RSS sources per category? (Reuters, AP, TechCrunch, etc.)
- [ ] Summarize articles or just clean extract? (copyright implications)
- [ ] Rate limiting / fair use policy for agents?
- [ ] Should there be a JSON alternative alongside markdown?
- [ ] How to handle images? Strip them? Alt-text only?
- [ ] Versioning/caching headers — ETags, Last-Modified?
- [ ] Token budget metadata per article? (so agents know cost before fetching)
- [ ] Should articles expire / rotate out? Rolling 24h? 7 days?
- [ ] Monetization: free tier + API key for higher rate limits?
- [ ] Consider `ai-agent.json` (AID protocol) for agent discovery
- [ ] Consider pre-registering `notforhumans.agent` when .agent TLD goes live

## MVP Scope (news.notforhumans.app only)
1. Pick 5-10 RSS feeds (tech/general news)
2. Python script: fetch → parse → convert to markdown
3. Run on cron every 15 min
4. Output to a folder, serve with Caddy/nginx or Cloudflare Pages
5. Root index auto-generated from file list
