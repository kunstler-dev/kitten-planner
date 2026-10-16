// Downloads the painting-of-the-day images into src/renderer/assets/art/<id>.jpg so they ship
// inside the .exe and work offline. First choice is the lead image of the English Wikipedia article
// (`wiki`, free images only); otherwise the best Wikimedia Commons search hit for the title + artist
// (or the entry's own `q` query) is used. Every fallback is printed so it can be reviewed.
// Usage: node scripts/fetch-art.js [--check] [--strict]
//   --check   only resolve titles, don't download
//   --strict  exit 1 if any painting has no free image
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'src', 'renderer', 'assets', 'art');
const UA = 'KittenPlanner/1.0 (https://github.com/kunstler-dev/kitten-planner; build script)';
const args = new Set(process.argv.slice(2));

async function api(titles) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=pageimages&piprop=thumbnail&pithumbsize=900&redirects=1&titles=${encodeURIComponent(titles.join('|'))}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  throw new Error(`Wikipedia API failed for ${titles[0]}…`);
}

async function getJson(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  throw new Error(`request failed: ${url}`);
}

const SKIP_FILE =
  /detail|ausschnitt|crop|frame[ds]?\b|museum|gallery|room|exhibition|signature|x-?ray|sketch|study|photo/i;

/** Best bitmap on Wikimedia Commons for a free-text query, or null. */
async function commonsSearch(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch=${encodeURIComponent(`${query} filetype:bitmap`)}&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=900`;
  const data = await getJson(url);
  const pages = (data.query?.pages || []).sort((a, b) => a.index - b.index);
  const ok = pages.filter((pg) => {
    const ii = pg.imageinfo?.[0];
    return ii && /jpeg|png/.test(ii.mime) && ii.width >= 500 && ii.height >= 300;
  });
  const best = ok.find((pg) => !SKIP_FILE.test(pg.title)) || ok[0];
  return best ? { src: best.imageinfo[0].thumburl, file: best.title } : null;
}

async function main() {
  const { PAINTINGS, ARTISTS } = await import('../src/renderer/js/data/art/index.js');
  fs.mkdirSync(outDir, { recursive: true });
  const missing = [];
  const toDownload = [];
  const fallback = [];
  for (let i = 0; i < PAINTINGS.length; i += 40) {
    const batch = PAINTINGS.slice(i, i + 40);
    const data = await api(batch.map((p) => p.wiki));
    // Map requested title -> final page title through normalisation and redirects.
    const alias = new Map();
    for (const n of [...(data.query.normalized || []), ...(data.query.redirects || [])]) alias.set(n.from, n.to);
    const resolve = (title) => {
      let cur = title;
      for (let k = 0; k < 4 && alias.has(cur); k++) cur = alias.get(cur);
      return cur;
    };
    const pages = new Map(data.query.pages.map((p) => [p.title, p]));
    for (const p of batch) {
      const page = pages.get(resolve(p.wiki));
      const src = page?.thumbnail?.source;
      if (src && !p.q) toDownload.push({ id: p.id, src });
      else fallback.push({ p, why: p.q ? 'query' : page?.missing ? 'no such article' : 'no free image' });
    }
  }
  for (const { p, why } of fallback) {
    const title = p.wiki.replace(/\s*\(.*\)$/, '');
    const queries = [p.q, `${title} ${ARTISTS[p.a].name.de}`, `${title} ${ARTISTS[p.a].name.de.split(' ').pop()}`];
    let hit = null;
    let query = '';
    for (const q of queries.filter(Boolean)) {
      query = q;
      hit = await commonsSearch(q);
      if (hit) break;
    }
    if (hit) {
      toDownload.push({ id: p.id, src: hit.src });
      console.log(`  COMMONS ${p.id}  ←  ${hit.file}   [${why}; query "${query}"]`);
    } else missing.push(`${p.id}  ←  "${query}" (${why}, nothing on Commons)`);
  }
  console.log(`paintings: ${PAINTINGS.length}, with image: ${toDownload.length}, missing: ${missing.length}`);
  for (const m of missing) console.log(`  MISSING ${m}`);

  if (!args.has('--check')) {
    let done = 0;
    const work = toDownload.filter((d) => !fs.existsSync(path.join(outDir, `${d.id}.jpg`)));
    const worker = async () => {
      while (work.length) {
        const d = work.shift();
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await fetch(d.src, { headers: { 'User-Agent': UA } });
            if (!res.ok) throw new Error(String(res.status));
            fs.writeFileSync(path.join(outDir, `${d.id}.jpg`), Buffer.from(await res.arrayBuffer()));
            done++;
            break;
          } catch (err) {
            if (attempt === 2) console.log(`  DOWNLOAD FAILED ${d.id}: ${err.message}`);
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    console.log(`downloaded: ${done}`);
  }
  if (args.has('--strict') && missing.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
