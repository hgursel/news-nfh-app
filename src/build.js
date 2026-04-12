const RSSParser = require('rss-parser');
const slugify = require('slugify');
const { subHours, parseISO, isAfter, format } = require('date-fns');
const fs = require('fs');
const path = require('path');

const parser = new RSSParser();

// RSS feed sources
const FEEDS = [
  { url: 'https://feeds.npr.org/1001/rss.xml', source: 'npr.org', category: 'general' },
  { url: 'https://feeds.npr.org/1004/rss.xml', source: 'npr.org', category: 'world' },
  { url: 'https://feeds.npr.org/1003/rss.xml', source: 'npr.org', category: 'national' },
  { url: 'https://www.cbsnews.com/latest/rss/main', source: 'cbsnews.com', category: 'general' },
];

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const RETENTION_HOURS = 24;

function makeSlug(title) {
  return slugify(title, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g }).slice(0, 80);
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function articleToMarkdown(article) {
  const summary = stripHtml(article.contentSnippet || article.content || article.summary || '');
  return [
    `# ${article.title}`,
    '',
    `**source:** ${article.source}`,
    `**published:** ${article.isoDate}`,
    `**category:** ${article.category}`,
    `**url:** ${article.link}`,
    '',
    '---',
    '',
    summary,
    '',
    '---',
    '',
    '*fetched by notforhumans.app | updated every 3h*',
    '',
  ].join('\n');
}

async function fetchFeed(feedConfig) {
  try {
    const feed = await parser.parseURL(feedConfig.url);
    return feed.items.map(item => ({
      title: item.title || 'Untitled',
      link: item.link || '',
      isoDate: item.isoDate || item.pubDate || new Date().toISOString(),
      contentSnippet: item.contentSnippet || '',
      content: item.content || '',
      summary: item.summary || '',
      source: feedConfig.source,
      category: feedConfig.category,
    }));
  } catch (err) {
    console.error(`Failed to fetch ${feedConfig.url}: ${err.message}`);
    return [];
  }
}

function deduplicateArticles(articles) {
  const seen = new Map();
  for (const article of articles) {
    const key = article.link || article.title;
    if (!seen.has(key)) {
      seen.set(key, article);
    }
  }
  return Array.from(seen.values());
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function cleanGeneratedFiles() {
  // Remove previously generated year directories (e.g. 2026/)
  // but preserve _headers and other static files
  const entries = fs.readdirSync(PUBLIC_DIR);
  for (const entry of entries) {
    if (/^\d{4}$/.test(entry)) {
      fs.rmSync(path.join(PUBLIC_DIR, entry), { recursive: true, force: true });
    }
  }
  // Remove generated index and ai-agent.json
  for (const file of ['index.md', 'ai-agent.json']) {
    const filePath = path.join(PUBLIC_DIR, file);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

async function build() {
  console.log('Fetching RSS feeds...');
  const cutoff = subHours(new Date(), RETENTION_HOURS);

  // Fetch all feeds in parallel
  const results = await Promise.all(FEEDS.map(fetchFeed));
  let articles = results.flat();

  console.log(`Fetched ${articles.length} total articles`);

  // Filter to last 24 hours
  articles = articles.filter(a => {
    try {
      return isAfter(parseISO(a.isoDate), cutoff);
    } catch {
      return false;
    }
  });

  // Deduplicate by link
  articles = deduplicateArticles(articles);

  // Sort newest first
  articles.sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));

  console.log(`${articles.length} articles after filtering (last ${RETENTION_HOURS}h)`);

  // Clean old generated files
  cleanGeneratedFiles();

  // Write each article as a markdown file
  const articleEntries = [];
  const usedSlugs = new Set();

  for (const article of articles) {
    const date = parseISO(article.isoDate);
    const dateDir = format(date, 'yyyy/MM/dd');
    let slug = makeSlug(article.title);

    // Handle duplicate slugs
    if (usedSlugs.has(`${dateDir}/${slug}`)) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }
    usedSlugs.add(`${dateDir}/${slug}`);

    const articleDir = path.join(PUBLIC_DIR, dateDir);
    ensureDir(articleDir);

    const filePath = path.join(articleDir, `${slug}.md`);
    const urlPath = `/${dateDir}/${slug}.md`;

    fs.writeFileSync(filePath, articleToMarkdown(article), 'utf-8');
    articleEntries.push({ title: article.title, path: urlPath });
  }

  // Generate index.md
  const now = new Date().toISOString();
  const indexLines = [
    '# news.notforhumans.app',
    `**updated:** ${now}`,
    `**articles:** ${articleEntries.length}`,
    '',
    ...articleEntries.map(e => `- [${e.title}](${e.path})`),
    '',
  ];
  fs.writeFileSync(path.join(PUBLIC_DIR, 'index.md'), indexLines.join('\n'), 'utf-8');

  // Generate ai-agent.json
  const agentJson = {
    name: 'news.notforhumans.app',
    description: 'General & tech news feed optimized for AI agents. Plain markdown. Low tokens.',
    url: 'https://news.notforhumans.app',
    index: 'https://news.notforhumans.app/index.md',
    format: 'text/plain; charset=utf-8',
    update_frequency: 'every 3 hours',
    article_count: articleEntries.length,
    retention: '24 hours rolling',
    auth_required: false,
    sources: ['NPR', 'CBS News'],
  };
  fs.writeFileSync(
    path.join(PUBLIC_DIR, 'ai-agent.json'),
    JSON.stringify(agentJson, null, 2),
    'utf-8'
  );

  console.log(`Build complete: ${articleEntries.length} articles written`);
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
