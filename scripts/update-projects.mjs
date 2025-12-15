import fs from 'node:fs/promises';

const USER = 'f-io';
const API_REPOS = `https://api.github.com/users/${USER}/repos?per_page=100&type=owner`;

function buildHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function fetchJson(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText} (${url})`);
  return res.json();
}

async function fetchRepos(headers) {
  return fetchJson(API_REPOS, headers);
}

function decodeBase64File(content) {
  const clean = String(content).replace(/\n/g, '');
  return Buffer.from(clean, 'base64').toString('utf8');
}

function normalizeTypes(value) {
  if (!Array.isArray(value)) return [];

  const out = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const t = item.trim();
    if (!t) continue;
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

async function fetchProjectTypes(owner, repo, headers) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/.project-meta.json`;
  const res = await fetch(url, { headers });

  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Failed to read .project-meta.json for ${owner}/${repo}: ${res.status} ${res.statusText}`);

  const data = await res.json();
  if (!data || data.type !== 'file' || typeof data.content !== 'string') return [];

  const raw = decodeBase64File(data.content);

  let meta;
  try {
    meta = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON in ${owner}/${repo}/.project-meta.json: ${e?.message ?? e}`);
  }

  return normalizeTypes(meta?.types);
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let index = 0;

  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (true) {
      const i = index++;
      if (i >= items.length) break;
      results[i] = await mapper(items[i], i);
    }
  });

  await Promise.all(workers);
  return results;
}

const headers = buildHeaders();

const repos = await fetchRepos(headers);

const owned = repos
  .filter((r) => !r.fork)
  .sort((a, b) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0));

const enriched = await mapWithConcurrency(owned, 6, async (r) => {
  const types = await fetchProjectTypes(USER, r.name, headers);

  return {
    name: r.name,
    full_name: r.full_name,
    html_url: r.html_url,
    homepage: r.homepage || '',
    description: r.description,
    language: r.language,
    types,
    stargazers_count: r.stargazers_count,
    updated_at: r.updated_at,
  };
});

await fs.writeFile('projects.json', JSON.stringify(enriched, null, 2) + '\n', 'utf8');
console.log(`Wrote projects.json with ${enriched.length} repos`);