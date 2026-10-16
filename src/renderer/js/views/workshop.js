// Workshop: faux-leather notebook configurator with live preview + cost/price calculation,
// product catalog (own products and bought-in souvenirs) and editable material prices.
import { h, icon, modal, field, confirmDialog, toast, segmented, select, numberInput, emptyState } from '../ui.js';
import { state, update, uid } from '../state.js';
import { t, money, num } from '../i18n.js';
import { FORMATS, BINDINGS, PAPERS, EXTRAS, DEFAULT_CONFIG, DEFAULT_MATERIALS, calculate } from '../calc.js';

export const LEATHER_COLORS = {
  cognac: '#a8643a',
  black: '#2b2629',
  bordeaux: '#6e2433',
  forest: '#2f4f3e',
  navy: '#25324f',
  rose: '#c98f97',
  lavender: '#a597c8',
  cream: '#e8dcc5',
  taupe: '#8a7a6d',
};

const TYPES = ['notebook', 'pocket', 'notepad', 'album', 'book', 'guestbook'];
// Sensible starting point when a product type is picked; everything stays editable.
const TYPE_PRESETS = {
  notebook: { format: 'a5', cover: 'hard', binding: 'sewn', leaves: 96 },
  pocket: { format: 'a6', cover: 'soft', binding: 'japanese', leaves: 48, ruling: 'dotted' },
  notepad: { format: 'a5', cover: 'soft', binding: 'rings', leaves: 60, ruling: 'lined' },
  album: { format: 'sq', cover: 'hard', binding: 'coptic', leaves: 30, paper: 'kraft', ruling: 'blank' },
  book: { format: 'a5', cover: 'hard', binding: 'sewn', leaves: 160, ruling: 'blank' },
  guestbook: { format: 'sq', cover: 'hard', binding: 'sewn', leaves: 60, ruling: 'blank' },
};
const RULINGS = ['blank', 'dotted', 'lined', 'grid'];

let tab = 'config';
let config = structuredClone(DEFAULT_CONFIG);
let editingProductId = null;

export function ensureMaterials() {
  const mats = state.data.materials;
  const missing = DEFAULT_MATERIALS.filter((m) => !mats.some((x) => x.id === m.id));
  if (missing.length) update((d) => d.materials.push(...missing.map((m) => ({ ...m }))), { silent: true });
}

export function materialName(m) {
  return m.name || t(`mat.${m.id}`);
}

export function vatRate() {
  return state.data.business.kleinunternehmer ? 0 : 19;
}

/** CSS notebook preview: proportions, color, binding, extras, embossing. */
export function notebookPreview(cfg, size = 240) {
  const f = FORMATS[cfg.format] || FORMATS.a5;
  const scale = size / Math.max(f.w, f.h);
  const w = Math.round(f.w * scale);
  const hgt = Math.round(f.h * scale);
  const color = LEATHER_COLORS[cfg.color] || LEATHER_COLORS.cognac;
  const spine = Math.max(10, Math.min(36, Math.round(cfg.leaves * 0.13 * scale + 8)));
  const ex = cfg.extras || {};
  return h(
    'div',
    { class: 'nb-stage', style: { width: `${w + spine + 40}px`, height: `${hgt + 40}px` } },
    h(
      'div',
      {
        class: `nb nb-${cfg.binding} nb-${cfg.cover}${ex.corners ? ' nb-corners' : ''}`,
        style: { width: `${w}px`, height: `${hgt}px`, '--nb-color': color, '--nb-spine': `${spine}px` },
      },
      h('div', { class: 'nb-spine' }),
      h('div', { class: 'nb-pages' }),
      h(
        'div',
        { class: 'nb-cover' },
        cfg.embossText && ex.emboss ? h('div', { class: 'nb-emboss' }, cfg.embossText) : null,
      ),
      cfg.binding === 'coptic' ? h('div', { class: 'nb-stitches' }) : null,
      cfg.binding === 'rings' ? h('div', { class: 'nb-rings' }) : null,
      ex.elastic ? h('div', { class: 'nb-elastic' }) : null,
      ex.ribbon ? h('div', { class: 'nb-ribbon' }) : null,
      ex.penloop ? h('div', { class: 'nb-penloop' }) : null,
    ),
  );
}

function configurator(root) {
  const mats = state.data.materials;
  const rate = vatRate();
  const r = calculate(config, mats, { vatRate: rate });
  const set = (patch) => {
    config = { ...config, ...patch };
    renderWorkshop(root);
  };
  const setExtra = (id, on) => set({ extras: { ...config.extras, [id]: on } });

  const opts = h(
    'div',
    { class: 'card cfg-options' },
    h('h2', {}, t('ws.configure')),
    field(
      t('ws.type'),
      segmented(
        TYPES.map((v) => ({ value: v, label: t(`ws.type.${v}`) })),
        config.type,
        (v) => set({ type: v, ...TYPE_PRESETS[v] }),
      ),
    ),
    h('div', { class: 'muted small cfg-hint' }, t('ws.vatHint')),
    h(
      'div',
      { class: 'field-row' },
      field(
        t('ws.format'),
        select(
          Object.entries(FORMATS).map(([v, f]) => ({ value: v, label: `${f.label} · ${f.w}×${f.h}` })),
          config.format,
          (v) => set({ format: v }),
        ),
      ),
      field(
        t('ws.cover'),
        segmented(
          ['hard', 'soft'].map((v) => ({ value: v, label: t(`ws.cover.${v}`) })),
          config.cover,
          (v) => set({ cover: v }),
        ),
      ),
    ),
    field(
      t('ws.binding'),
      select(
        Object.keys(BINDINGS).map((v) => ({ value: v, label: t(`ws.binding.${v}`) })),
        config.binding,
        (v) => set({ binding: v }),
      ),
    ),
    field(
      t('ws.color'),
      h(
        'div',
        { class: 'leather-swatches' },
        Object.entries(LEATHER_COLORS).map(([id, hex]) =>
          h('button', {
            type: 'button',
            class: `leather-swatch${config.color === id ? ' active' : ''}`,
            style: { background: hex },
            title: t(`ws.color.${id}`),
            onclick: () => set({ color: id }),
          }),
        ),
      ),
    ),
    h(
      'div',
      { class: 'field-row' },
      field(
        t('ws.paper'),
        select(
          Object.keys(PAPERS).map((v) => ({ value: v, label: t(`mat.${v}`) })),
          config.paper,
          (v) => set({ paper: v }),
        ),
      ),
      field(
        t('ws.ruling'),
        select(
          RULINGS.map((v) => ({ value: v, label: t(`ws.ruling.${v}`) })),
          config.ruling,
          (v) => set({ ruling: v }),
        ),
      ),
    ),
    field(
      `${t('ws.leaves')}: ${config.leaves}`,
      h('input', {
        type: 'range',
        class: 'range',
        min: 24,
        max: 240,
        step: 8,
        value: config.leaves,
        onchange: (e) => set({ leaves: Number(e.target.value) }),
      }),
    ),
    field(
      t('ws.extras'),
      h(
        'div',
        { class: 'extras-grid' },
        Object.keys(EXTRAS).map((id) =>
          h(
            'label',
            { class: `extra-chip${config.extras[id] ? ' on' : ''}` },
            h('input', {
              type: 'checkbox',
              checked: Boolean(config.extras[id]),
              onchange: (e) => setExtra(id, e.target.checked),
            }),
            t(`ws.extra.${id}`),
          ),
        ),
      ),
    ),
    config.extras.emboss
      ? field(
          t('ws.embossText'),
          h('input', {
            class: 'input',
            value: config.embossText,
            maxlength: 24,
            placeholder: t('ws.embossPlaceholder'),
            onchange: (e) => set({ embossText: e.target.value }),
          }),
        )
      : null,
    h('h3', { class: 'sub-title' }, t('ws.costs')),
    h(
      'div',
      { class: 'field-row three' },
      field(
        t('ws.hourly'),
        numberInput(config.hourlyRate, (v) => set({ hourlyRate: v }), { min: 0, step: 1 }),
      ),
      field(
        t('ws.overhead'),
        numberInput(config.overhead, (v) => set({ overhead: v }), { min: 0, step: 0.5 }),
      ),
      field(
        t('ws.margin'),
        numberInput(config.margin, (v) => set({ margin: v }), { min: 0, step: 5 }),
      ),
    ),
    h(
      'div',
      { class: 'field-row' },
      field(
        t('ws.minutes'),
        numberInput(config.minutesOverride ?? '', (v) => set({ minutesOverride: v || null }), {
          min: 0,
          placeholder: String(r.minutes),
        }),
      ),
      field(
        t('ws.waste'),
        numberInput(config.waste, (v) => set({ waste: v }), { min: 0, step: 1 }),
      ),
    ),
  );

  const result = h(
    'div',
    { class: 'cfg-result' },
    h(
      'div',
      { class: 'card cfg-preview' },
      notebookPreview(config, 230),
      h(
        'div',
        { class: 'muted small center' },
        `${FORMATS[config.format].label} · ${t(`ws.binding.${config.binding}`)} · ${config.leaves} ${t('ws.leavesShort')} · ${t('ws.spine')} ≈ ${r.spine} mm`,
      ),
    ),
    h(
      'div',
      { class: 'card' },
      h('h2', {}, t('ws.calculation')),
      h(
        'table',
        { class: 'calc-table' },
        h(
          'tbody',
          {},
          r.lines.map((l) => {
            const m = state.data.materials.find((x) => x.id === l.id);
            return h(
              'tr',
              {},
              h('td', {}, m ? materialName(m) : l.id),
              h('td', { class: 'muted' }, `${num(l.qty, 3)} ${t(`unit.${l.unit}`)}`),
              h('td', { class: 'num' }, money(l.cost)),
            );
          }),
          h(
            'tr',
            { class: 'sum' },
            h('td', { colspan: 2 }, t('ws.materialsTotal')),
            h('td', { class: 'num' }, money(r.materials)),
          ),
          h(
            'tr',
            {},
            h('td', { colspan: 2 }, t('ws.labor', { min: r.minutes })),
            h('td', { class: 'num' }, money(r.labor)),
          ),
          h('tr', {}, h('td', { colspan: 2 }, t('ws.overheadLine')), h('td', { class: 'num' }, money(r.overhead))),
          h(
            'tr',
            { class: 'sum' },
            h('td', { colspan: 2 }, t('ws.costTotal')),
            h('td', { class: 'num' }, money(r.cost)),
          ),
          h(
            'tr',
            {},
            h('td', { colspan: 2 }, t('ws.net', { margin: config.margin })),
            h('td', { class: 'num' }, money(r.net)),
          ),
          h(
            'tr',
            {},
            h('td', { colspan: 2 }, rate ? t('ws.vat', { rate }) : t('ws.noVat')),
            h('td', { class: 'num' }, money(r.vat)),
          ),
        ),
      ),
      h(
        'div',
        { class: 'price-box' },
        h(
          'div',
          {},
          h('div', { class: 'muted small' }, t('ws.retail')),
          h('div', { class: 'price-big' }, money(r.retail)),
        ),
        h(
          'div',
          {},
          h('div', { class: 'muted small' }, t('ws.profit')),
          h('div', { class: 'price-mid' }, money(r.profit)),
        ),
      ),
      h(
        'button',
        {
          class: 'btn btn-primary full',
          onclick: () => saveProduct(r),
        },
        icon('box', 16),
        editingProductId ? t('ws.updateProduct') : t('ws.saveProduct'),
      ),
    ),
  );
  return h('div', { class: 'cfg-layout' }, opts, result);
}

function nextSku() {
  const nums = state.data.products.map((p) => Number(String(p.sku || '').replace(/\D/g, '')) || 0);
  return `KP-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`;
}

async function saveProduct(r) {
  const existing = state.data.products.find((p) => p.id === editingProductId);
  const res = await modal({
    title: existing ? t('ws.updateProduct') : t('ws.saveProduct'),
    build: (close) => {
      const name = h('input', {
        class: 'input',
        value:
          existing?.name ||
          `${t(`ws.type.${config.type}`)} ${FORMATS[config.format].label} ${t(`ws.color.${config.color}`)}`,
      });
      const price = h('input', { class: 'input', type: 'number', step: 0.1, value: r.retail });
      const stock = h('input', { class: 'input', type: 'number', step: 1, value: existing?.stock ?? 0 });
      return h(
        'div',
        { class: 'modal-body' },
        field(t('common.title'), name),
        h('div', { class: 'field-row' }, field(t('ws.salePrice'), price), field(t('ws.stock'), stock)),
        h(
          'div',
          { class: 'modal-actions' },
          h('button', { class: 'btn btn-ghost', onclick: () => close(null) }, t('common.cancel')),
          h(
            'button',
            {
              class: 'btn btn-primary',
              onclick: () => close({ name: name.value.trim(), price: Number(price.value), stock: Number(stock.value) }),
            },
            t('common.save'),
          ),
        ),
      );
    },
  });
  if (!res) return;
  update(
    (d) => {
      const fields = {
        name: res.name || 'Notebook',
        price: res.price,
        stock: res.stock,
        cost: r.cost,
        config: structuredClone(config),
        kind: 'own',
      };
      if (existing)
        Object.assign(
          d.products.find((p) => p.id === existing.id),
          fields,
        );
      else d.products.push({ id: uid(), sku: nextSku(), createdAt: Date.now(), ...fields });
    },
    { silent: true },
  );
  editingProductId = null;
  tab = 'catalog';
  toast(t('ws.productSaved'), 'success');
  renderWorkshop(document.getElementById('view'));
}

function editSimpleProduct(product) {
  return modal({
    title: product ? t('common.edit') : t('ws.addSouvenir'),
    build: (close) => {
      const name = h('input', { class: 'input', value: product?.name || '', placeholder: t('ws.souvenirPlaceholder') });
      const cost = h('input', { class: 'input', type: 'number', step: 0.1, value: product?.cost ?? '' });
      const price = h('input', { class: 'input', type: 'number', step: 0.1, value: product?.price ?? '' });
      const stock = h('input', { class: 'input', type: 'number', step: 1, value: product?.stock ?? 0 });
      const save = () => {
        if (!name.value.trim()) return name.focus();
        const fields = {
          name: name.value.trim(),
          cost: Number(cost.value) || 0,
          price: Number(price.value) || 0,
          stock: Number(stock.value) || 0,
        };
        update((d) => {
          if (product)
            Object.assign(
              d.products.find((p) => p.id === product.id),
              fields,
            );
          else d.products.push({ id: uid(), sku: nextSku(), kind: 'bought', createdAt: Date.now(), ...fields });
        });
        close(true);
      };
      return h(
        'div',
        { class: 'modal-body' },
        field(t('common.title'), name),
        h(
          'div',
          { class: 'field-row three' },
          field(t('ws.purchasePrice'), cost),
          field(t('ws.salePrice'), price),
          field(t('ws.stock'), stock),
        ),
        h(
          'div',
          { class: 'modal-actions' },
          h('button', { class: 'btn btn-ghost', onclick: () => close(false) }, t('common.cancel')),
          h('button', { class: 'btn btn-primary', onclick: save }, t('common.save')),
        ),
      );
    },
  });
}

function catalog(root) {
  const products = state.data.products;
  const stockValue = products.reduce((s, p) => s + (p.cost || 0) * (p.stock || 0), 0);
  const card = (p) => {
    const margin = p.price
      ? Math.round(((p.price / (1 + vatRate() / 100) - (p.cost || 0)) / (p.price / (1 + vatRate() / 100))) * 100)
      : 0;
    const setStock = (delta) =>
      update((d) => {
        const x = d.products.find((y) => y.id === p.id);
        x.stock = Math.max(0, (x.stock || 0) + delta);
      });
    return h(
      'div',
      { class: 'card product-card' },
      h(
        'div',
        { class: 'product-visual' },
        p.config ? notebookPreview(p.config, 110) : h('div', { class: 'souvenir-visual' }, icon('store', 40)),
      ),
      h('div', { class: 'product-sku muted tiny' }, p.sku, ' · ', p.kind === 'own' ? t('ws.own') : t('ws.bought')),
      h('div', { class: 'product-name' }, p.name),
      h(
        'div',
        { class: 'product-prices' },
        h('span', { class: 'price-mid' }, money(p.price)),
        h(
          'span',
          { class: 'muted small' },
          `${t('ws.costShort')} ${money(p.cost)} · ${t('ws.marginShort')} ${margin}%`,
        ),
      ),
      h(
        'div',
        { class: 'product-stock' },
        h('button', { class: 'icon-btn small', title: '−1', onclick: () => setStock(-1) }, '−'),
        h('span', {}, t('ws.inStock', { n: p.stock || 0 })),
        h('button', { class: 'icon-btn small', title: '+1', onclick: () => setStock(1) }, '+'),
        h('div', { class: 'spacer' }),
        h(
          'button',
          {
            class: 'icon-btn',
            title: t('common.edit'),
            onclick: () => {
              if (p.config) {
                config = { ...structuredClone(DEFAULT_CONFIG), ...structuredClone(p.config) };
                editingProductId = p.id;
                tab = 'config';
                renderWorkshop(root);
              } else editSimpleProduct(p);
            },
          },
          icon('edit', 16),
        ),
        h(
          'button',
          {
            class: 'icon-btn',
            title: t('common.delete'),
            onclick: async () => {
              if (await confirmDialog(t('ws.deleteProduct', { name: p.name })))
                update((d) => (d.products = d.products.filter((x) => x.id !== p.id)));
            },
          },
          icon('trash', 16),
        ),
      ),
    );
  };
  return h(
    'div',
    {},
    h(
      'div',
      { class: 'toolbar' },
      h('div', { class: 'muted' }, t('ws.catalogSummary', { n: products.length, value: money(stockValue) })),
      h('div', { class: 'spacer' }),
      h('button', { class: 'btn btn-soft', onclick: () => editSimpleProduct() }, icon('plus', 16), t('ws.addSouvenir')),
      h(
        'button',
        {
          class: 'btn btn-primary',
          onclick: () => (
            (tab = 'config'),
            (editingProductId = null),
            (config = structuredClone(DEFAULT_CONFIG)),
            renderWorkshop(root)
          ),
        },
        icon('book', 16),
        t('ws.newNotebook'),
      ),
    ),
    products.length
      ? h('div', { class: 'product-grid' }, products.map(card))
      : h('div', { class: 'card' }, emptyState(t('ws.noProducts'), t('ws.noProductsHint'))),
  );
}

function materialsTab() {
  const mats = state.data.materials;
  return h(
    'div',
    { class: 'card' },
    h(
      'div',
      { class: 'card-head' },
      h('div', {}, h('h2', {}, t('ws.materials')), h('div', { class: 'muted small' }, t('ws.materialsHint'))),
      h(
        'button',
        {
          class: 'btn btn-soft',
          onclick: () =>
            update((d) =>
              d.materials.push({ id: uid(), name: t('ws.newMaterial'), unit: 'pc', price: 0, custom: true }),
            ),
        },
        icon('plus', 16),
        t('ws.addMaterial'),
      ),
    ),
    h(
      'table',
      { class: 'data-table' },
      h(
        'thead',
        {},
        h(
          'tr',
          {},
          h('th', {}, t('common.title')),
          h('th', {}, t('ws.unit')),
          h('th', {}, t('ws.pricePerUnit')),
          h('th', {}, t('ws.supplier')),
          h('th', {}),
        ),
      ),
      h(
        'tbody',
        {},
        mats.map((m) =>
          h(
            'tr',
            {},
            h(
              'td',
              {},
              m.custom
                ? h('input', {
                    class: 'input slim',
                    value: m.name,
                    onchange: (e) =>
                      update((d) => (d.materials.find((x) => x.id === m.id).name = e.target.value), { silent: true }),
                  })
                : materialName(m),
            ),
            h(
              'td',
              {},
              m.custom
                ? select(
                    ['pc', 'm2', 'm'].map((u) => ({ value: u, label: t(`unit.${u}`) })),
                    m.unit,
                    (v) => update((d) => (d.materials.find((x) => x.id === m.id).unit = v), { silent: true }),
                    { class: 'input slim' },
                  )
                : t(`unit.${m.unit}`),
            ),
            h(
              'td',
              {},
              h('input', {
                class: 'input slim num',
                type: 'number',
                step: 0.05,
                value: m.price,
                onchange: (e) =>
                  update((d) => (d.materials.find((x) => x.id === m.id).price = Number(e.target.value) || 0), {
                    silent: true,
                  }),
              }),
            ),
            h(
              'td',
              {},
              h('input', {
                class: 'input slim',
                value: m.supplier || '',
                placeholder: '—',
                onchange: (e) =>
                  update((d) => (d.materials.find((x) => x.id === m.id).supplier = e.target.value), { silent: true }),
              }),
            ),
            h(
              'td',
              {},
              m.custom
                ? h(
                    'button',
                    {
                      class: 'icon-btn',
                      title: t('common.delete'),
                      onclick: () => update((d) => (d.materials = d.materials.filter((x) => x.id !== m.id))),
                    },
                    icon('trash', 15),
                  )
                : null,
            ),
          ),
        ),
      ),
    ),
  );
}

export function renderWorkshop(root) {
  ensureMaterials();
  root.replaceChildren(
    h(
      'div',
      { class: 'page-head' },
      h('div', {}, h('h1', {}, t('nav.workshop')), h('div', { class: 'muted' }, t('ws.subtitle'))),
      segmented(
        ['config', 'catalog', 'materials'].map((v) => ({ value: v, label: t(`ws.tab.${v}`) })),
        tab,
        (v) => {
          tab = v;
          renderWorkshop(root);
        },
      ),
    ),
    tab === 'config' ? configurator(root) : tab === 'catalog' ? catalog(root) : materialsTab(),
  );
}
