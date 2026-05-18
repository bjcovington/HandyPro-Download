const RELEASE_OWNER = 'bjcovington';
const RELEASE_REPO = 'HandyPro';
const RELEASE_API = `https://api.github.com/repos/${RELEASE_OWNER}/${RELEASE_REPO}/releases?per_page=20`;
const RELEASES_PAGE = `https://github.com/${RELEASE_OWNER}/${RELEASE_REPO}/releases`;

document.querySelector('[data-nav-toggle]')?.addEventListener('click', () => {
  document.querySelector('[data-nav]')?.classList.toggle('open');
});

function normalizeVersion(tag = '') {
  return String(tag).trim().replace(/^v/i, '');
}

function formatDate(dateString) {
  if (!dateString) return 'Not published yet';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateString));
}

function pickInstallerAsset(release) {
  const assets = release.assets || [];
  return assets.find(a => /\.exe$/i.test(a.name) && !/blockmap|yml|yaml|latest/i.test(a.name))
    || assets.find(a => /setup|installer|handypro/i.test(a.name) && /\.exe$/i.test(a.name))
    || assets.find(a => /\.(msix|appx|exe|zip)$/i.test(a.name))
    || null;
}

function summarizeBody(body = '') {
  const clean = String(body).replace(/[#*_>`-]/g, '').replace(/\s+/g, ' ').trim();
  return clean ? clean.slice(0, 280) + (clean.length > 280 ? '…' : '') : 'No release notes were provided.';
}

function releaseBadge(release) {
  if (release.draft) return '<span class="badge">Draft</span>';
  if (release.prerelease) return '<span class="badge">Prerelease / Beta</span>';
  return '<span class="badge">Stable</span>';
}

function renderAssetLinks(release) {
  if (!release.assets?.length) return `<a class="asset-link" href="${release.html_url}" target="_blank" rel="noopener">View release</a>`;
  return release.assets.map(asset => `<a class="asset-link" href="${asset.browser_download_url}" download>${asset.name}</a>`).join('');
}

function renderReleaseCard(release) {
  return `<article class="release-card">
    <div class="release-card-top">
      <div>
        <h3>${release.name || release.tag_name}</h3>
        <p>${summarizeBody(release.body)}</p>
      </div>
      <div>${releaseBadge(release)}</div>
    </div>
    <div class="release-meta">
      <span class="badge">${release.tag_name}</span>
      <span class="badge">${formatDate(release.published_at)}</span>
    </div>
    <div class="asset-list">${renderAssetLinks(release)}</div>
  </article>`;
}

async function fetchReleases() {
  const response = await fetch(RELEASE_API, { headers: { Accept: 'application/vnd.github+json' } });
  if (!response.ok) throw new Error(`GitHub API error ${response.status}`);
  return response.json();
}

function updateHomeReleasePill(stable) {
  const pill = document.querySelector('[data-stable-release] span:last-child');
  if (!pill) return;
  if (!stable) {
    pill.textContent = 'Latest release unavailable';
    return;
  }
  pill.textContent = `Latest stable release: ${stable.tag_name}`;
}

function updateDownloadsPage(releases) {
  const stablePanel = document.querySelector('[data-stable-panel]');
  const betaContent = document.querySelector('[data-beta-content]');
  const history = document.querySelector('[data-release-history]');
  const statusCard = document.querySelector('[data-download-card]');
  if (!stablePanel && !betaContent && !history) return;

  const stable = releases.find(r => !r.draft && !r.prerelease);
  const betas = releases.filter(r => !r.draft && r.prerelease);
  const installer = stable ? pickInstallerAsset(stable) : null;

  if (statusCard) {
    statusCard.innerHTML = stable ? `<p class="eyebrow">Current stable</p><h2>${stable.tag_name}</h2><p>${stable.name || 'HandyPro release'} · ${formatDate(stable.published_at)}</p>` : `<h2>No stable release found</h2><p class="muted">Check GitHub Releases.</p>`;
  }

  if (stablePanel) {
    stablePanel.innerHTML = stable ? `<p class="eyebrow">Production build</p><h2>${stable.name || stable.tag_name}</h2><p>${summarizeBody(stable.body)}</p><div class="release-meta"><span class="badge">${stable.tag_name}</span><span class="badge">Published ${formatDate(stable.published_at)}</span><span class="badge">${stable.assets?.length || 0} assets</span></div><div class="download-buttons">${installer ? `<a class="btn btn-primary" href="${installer.browser_download_url}" download>Download ${installer.name}</a>` : ''}<a class="btn btn-secondary" href="${stable.html_url}" target="_blank" rel="noopener">View release notes</a></div>` : `<h2>No production release found</h2><p>Publish a non-prerelease GitHub Release in ${RELEASE_OWNER}/${RELEASE_REPO} and it will appear here automatically.</p><a class="btn btn-secondary" href="${RELEASES_PAGE}" target="_blank" rel="noopener">Open GitHub Releases</a>`;
  }

  if (betaContent) {
    betaContent.innerHTML = betas.length ? betas.slice(0, 4).map(renderReleaseCard).join('') : '<p class="muted">No beta releases are currently published.</p>';
  }

  if (history) {
    history.innerHTML = releases.length ? releases.slice(0, 8).map(renderReleaseCard).join('') : '<p class="muted">No releases found.</p>';
  }
}

(async function initReleaseData(){
  try {
    const releases = await fetchReleases();
    const stable = releases.find(r => !r.draft && !r.prerelease);
    updateHomeReleasePill(stable);
    updateDownloadsPage(releases);
  } catch (error) {
    updateHomeReleasePill(null);
    const stablePanel = document.querySelector('[data-stable-panel]');
    const statusCard = document.querySelector('[data-download-card]');
    if (statusCard) statusCard.innerHTML = `<h2>Could not load releases</h2><p class="error">${error.message}</p>`;
    if (stablePanel) stablePanel.innerHTML = `<h2>Release data unavailable</h2><p class="muted">GitHub may be rate limiting the public API. You can still open the release page directly.</p><a class="btn btn-secondary" href="${RELEASES_PAGE}" target="_blank" rel="noopener">Open GitHub Releases</a>`;
  }
})();
