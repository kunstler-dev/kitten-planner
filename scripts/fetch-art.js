// Downloads the painting-of-the-day images from Wikipedia (free images only) into
// src/renderer/assets/art/<id>.jpg so they ship inside the .exe and work offline.
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

async function main() {
  const { PAINTINGS } = await import('../src/renderer/js/data/art/index.js');
  fs.mkdirSync(outDir, { recursive: true });
  const missing = [];
  const toDownload = [];
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
      if (!src) missing.push(`${p.id}  ←  "${p.wiki}"${page?.missing ? ' (no such article)' : ' (no free image)'}`);
      else toDownload.push({ id: p.id, src });
    }
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
