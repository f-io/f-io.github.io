async function main() {
  const grid = document.getElementById('grid');
  const err = document.getElementById('err');

  try {
    const res = await fetch('./projects.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load projects.json (${res.status})`);
    const projects = await res.json();

    grid.innerHTML = projects
      .map((p) => {
        const stars = (p.stargazers_count ?? 0).toLocaleString('en-US');
        const desc = (p.description ?? '').replace(/</g, '&lt;');

        const language = typeof p.language === 'string' ? p.language.trim() : '';
        const types = Array.isArray(p.types) ? p.types.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim()) : [];

        const typeBadges = types.map((t) => `<span class="badge">${t}</span>`).join('');

        return `
          <a class="card" href="${p.html_url}" target="_blank" rel="noopener">
            <div class="name">${p.name}</div>
            <div class="desc">${desc}</div>
            <div class="meta">
              <span class="badge">★ ${stars}</span>
              ${language ? `<span class="badge">${language}</span>` : ''}
              ${typeBadges}
              ${p.homepage ? `<span class="badge">site</span>` : ''}
            </div>
          </a>
        `;
      })
      .join('');
  } catch (e) {
    err.hidden = false;
    err.textContent = String(e?.message ?? e);
  }
}

main();