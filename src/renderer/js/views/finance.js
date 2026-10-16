// Finance: income/expense records (EÜR-style overview), Kleinunternehmer limits, invoices with PDF export.
import { h, icon, modal, field, confirmDialog, toast, segmented, select, emptyState } from '../ui.js';
import { state, update, uid } from '../state.js';
import { t, money } from '../i18n.js';
import { todayKey, numericDate, monthName, addDays } from '../dates.js';
import { invoiceHtml, invoiceTotals } from '../invoice-template.js';

const INCOME_CATS = ['shop', 'online', 'workshops', 'commission', 'other'];
const EXPENSE_CATS = [
  'material',
  'goods',
  'rent',
  'tools',
  'marketing',
  'insurance',
  'fees',
  'software',
  'travel',
  'other',
];
export const KU_PREV_LIMIT = 25000;
export const KU_CURRENT_LIMIT = 100000;

let tab = 'overview';
let year = new Date().getFullYear();
let monthFilter = 'all';

const netOf = (tr) => tr.gross / (1 + (tr.vatRate || 0) / 100);

export function monthTotals(ym) {
  const list = state.data.transactions.filter((x) => x.date.startsWith(ym));
  const sum = (type) => list.filter((x) => x.type === type).reduce((s, x) => s + Number(x.gross || 0), 0);
  return { income: sum('income'), expense: sum('expense') };
}

function yearTotals(y) {
  const list = state.data.transactions.filter((x) => x.date.startsWith(String(y)));
  const by = (type) => list.filter((x) => x.type === type);
  const gross = (arr) => arr.reduce((s, x) => s + Number(x.gross || 0), 0);
  const net = (arr) => arr.reduce((s, x) => s + netOf(x), 0);
  const inc = by('income');
  const exp = by('expense');
  return {
    income: gross(inc),
    expense: gross(exp),
    incomeNet: net(inc),
    expenseNet: net(exp),
    vatOut: gross(inc) - net(inc),
    vatIn: gross(exp) - net(exp),
  };
}

function editTransaction(tr, type = 'expense') {
  const draft = tr
    ? { ...tr }
    : {
        type,
        date: todayKey(),
        category: type === 'income' ? 'shop' : 'material',
        description: '',
        gross: '',
        vatRate: state.data.business.kleinunternehmer && type === 'income' ? 0 : 19,
        note: '',
      };
  return modal({
    title: tr ? t('fin.editEntry') : draft.type === 'income' ? t('fin.addIncome') : t('fin.addExpense'),
    build: (close) => {
      let kind = draft.type;
      const catSel = h('div');
      let category = draft.category;
      const renderCats = () =>
        catSel.replaceChildren(
          select(
            (kind === 'income' ? INCOME_CATS : EXPENSE_CATS).map((c) => ({ value: c, label: t(`fin.cat.${c}`) })),
            category,
            (v) => (category = v),
          ),
        );
      renderCats();
      const date = h('input', { class: 'input', type: 'date', value: draft.date });
      const desc = h('input', { class: 'input', value: draft.description, placeholder: t('fin.descPlaceholder') });
      const gross = h('input', { class: 'input', type: 'number', step: 0.01, value: draft.gross });
      let vat = String(draft.vatRate);
      const save = () => {
        if (!desc.value.trim()) return desc.focus();
        if (!(Number(gross.value) > 0)) return gross.focus();
        const fields = {
          type: kind,
          date: date.value || todayKey(),
          category,
          description: desc.value.trim(),
          gross: Math.round(Number(gross.value) * 100) / 100,
          vatRate: Number(vat),
        };
        update((d) => {
          if (tr)
            Object.assign(
              d.transactions.find((x) => x.id === tr.id),
              fields,
            );
          else d.transactions.push({ id: uid(), createdAt: Date.now(), ...fields });
        });
        close(true);
      };
      return h(
        'div',
        { class: 'modal-body' },
        field(
          t('fin.type'),
          segmented(
            ['income', 'expense'].map((v) => ({ value: v, label: t(`fin.${v}`) })),
            kind,
            (v) => {
              kind = v;
              category = v === 'income' ? 'shop' : 'material';
              renderCats();
            },
          ),
        ),
        h('div', { class: 'field-row' }, field(t('fin.date'), date), field(t('fin.category'), catSel)),
        field(t('common.description'), desc),
        h(
          'div',
          { class: 'field-row' },
          field(t('fin.amountGross'), gross),
          field(
            t('fin.vatRate'),
            select(
              ['19', '7', '0'].map((v) => ({ value: v, label: `${v} %` })),
              vat,
              (v) => (vat = v),
            ),
          ),
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

function overview() {
  const y = yearTotals(year);
  const prev = yearTotals(year - 1);
  const ku = state.data.business.kleinunternehmer;
  const months = Array.from({ length: 12 }, (_, m) => monthTotals(`${year}-${String(m + 1).padStart(2, '0')}`));
  const max = Math.max(1, ...months.map((m) => Math.max(m.income, m.expense)));
  const expByCat = EXPENSE_CATS.map((c) => ({
    c,
    v: state.data.transactions
      .filter((x) => x.type === 'expense' && x.category === c && x.date.startsWith(String(year)))
      .reduce((s, x) => s + x.gross, 0),
  }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);
  const expMax = Math.max(1, ...expByCat.map((x) => x.v));
  const kpi = (label, value, color, ic) =>
    h(
      'div',
      { class: `card stat c-${color}` },
      h('div', { class: 'stat-icon' }, icon(ic, 20)),
      h('div', {}, h('div', { class: 'stat-value' }, value), h('div', { class: 'stat-label' }, label)),
    );

  return h(
    'div',
    { class: 'fin-overview' },
    h(
      'div',
      { class: 'stats' },
      kpi(t('fin.income'), money(y.income), 'mint', 'arrowUp'),
      kpi(t('fin.expense'), money(y.expense), 'powder', 'arrowDown'),
      kpi(t('fin.profit'), money(ku ? y.income - y.expense : y.incomeNet - y.expenseNet), 'lavender', 'wallet'),
      ku
        ? kpi(t('fin.kuStatus'), t('fin.kuActive'), 'peach', 'lock')
        : kpi(t('fin.vatBalance'), money(y.vatOut - y.vatIn), 'peach', 'invoice'),
    ),
    h(
      'div',
      { class: 'fin-grid' },
      h(
        'section',
        { class: 'card' },
        h(
          'div',
          { class: 'card-head' },
          h('h2', {}, t('fin.byMonth', { year })),
          h(
            'div',
            { class: 'legend' },
            h('span', { class: 'lg-income' }, t('fin.income')),
            h('span', { class: 'lg-expense' }, t('fin.expense')),
          ),
        ),
        h(
          'div',
          { class: 'bars' },
          months.map((m, i) =>
            h(
              'div',
              { class: 'bar-col', title: `${monthName(i)}: +${money(m.income)} / −${money(m.expense)}` },
              h(
                'div',
                { class: 'bar-pair' },
                h('div', { class: 'bar income', style: { height: `${(m.income / max) * 100}%` } }),
                h('div', { class: 'bar expense', style: { height: `${(m.expense / max) * 100}%` } }),
              ),
              h('div', { class: 'bar-label' }, monthName(i).slice(0, 3)),
            ),
          ),
        ),
      ),
      h(
        'section',
        { class: 'card' },
        h('h2', {}, t('fin.kuTitle')),
        h('p', { class: 'muted small' }, t('fin.kuExplain')),
        h(
          'div',
          { class: 'ku-row' },
          h('span', {}, t('fin.kuThisYear', { year })),
          h('b', {}, `${money(y.incomeNet)} / ${money(KU_CURRENT_LIMIT)}`),
        ),
        h(
          'div',
          { class: `progress c-${y.incomeNet > KU_CURRENT_LIMIT * 0.8 ? 'powder' : 'mint'}` },
          h('div', {
            class: 'progress-fill',
            style: { width: `${Math.min(100, (y.incomeNet / KU_CURRENT_LIMIT) * 100)}%` },
          }),
        ),
        h(
          'div',
          { class: 'ku-row' },
          h('span', {}, t('fin.kuNextYear')),
          h('b', {}, `${money(y.incomeNet)} / ${money(KU_PREV_LIMIT)}`),
        ),
        h(
          'div',
          { class: `progress c-${y.incomeNet > KU_PREV_LIMIT * 0.8 ? 'powder' : 'lavender'}` },
          h('div', {
            class: 'progress-fill',
            style: { width: `${Math.min(100, (y.incomeNet / KU_PREV_LIMIT) * 100)}%` },
          }),
        ),
        y.incomeNet > KU_PREV_LIMIT ? h('div', { class: 'warn small' }, t('fin.kuWarn')) : null,
        prev.income
          ? h('div', { class: 'muted small' }, t('fin.prevYear', { year: year - 1, sum: money(prev.incomeNet) }))
          : null,
      ),
      h(
        'section',
        { class: 'card' },
        h('h2', {}, t('fin.expensesByCategory')),
        expByCat.length
          ? h(
              'div',
              { class: 'cat-bars' },
              expByCat.map((x) =>
                h(
                  'div',
                  { class: 'cat-bar' },
                  h('span', {}, t(`fin.cat.${x.c}`)),
                  h(
                    'div',
                    { class: 'progress c-powder' },
                    h('div', { class: 'progress-fill', style: { width: `${(x.v / expMax) * 100}%` } }),
                  ),
                  h('b', {}, money(x.v)),
                ),
              ),
            )
          : h('div', { class: 'muted soft-empty' }, t('fin.noExpenses')),
      ),
      h(
        'section',
        { class: 'card' },
        h('h2', {}, t('fin.euer', { year })),
        h(
          'table',
          { class: 'calc-table' },
          h(
            'tbody',
            {},
            h(
              'tr',
              {},
              h('td', {}, t('fin.euerIncome')),
              h('td', { class: 'num' }, money(ku ? y.income : y.incomeNet)),
            ),
            ku ? null : h('tr', {}, h('td', {}, t('fin.euerVatOut')), h('td', { class: 'num' }, money(y.vatOut))),
            h(
              'tr',
              {},
              h('td', {}, t('fin.euerExpense')),
              h('td', { class: 'num' }, `− ${money(ku ? y.expense : y.expenseNet)}`),
            ),
            ku ? null : h('tr', {}, h('td', {}, t('fin.euerVatIn')), h('td', { class: 'num' }, `− ${money(y.vatIn)}`)),
            h(
              'tr',
              { class: 'sum' },
              h('td', {}, t('fin.euerResult')),
              h('td', { class: 'num' }, money(ku ? y.income - y.expense : y.incomeNet - y.expenseNet)),
            ),
          ),
        ),
        h('div', { class: 'muted tiny' }, t('fin.euerHint')),
      ),
    ),
  );
}

function entries(root) {
  const list = state.data.transactions
    .filter((x) => x.date.startsWith(String(year)) && (monthFilter === 'all' || x.date.slice(5, 7) === monthFilter))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const exportCsv = async () => {
    const rows = [['Datum', 'Typ', 'Kategorie', 'Beschreibung', 'Brutto', 'USt-Satz', 'Netto', 'USt']];
    for (const x of list) {
      const n = netOf(x);
      rows.push([
        x.date,
        x.type === 'income' ? 'Einnahme' : 'Ausgabe',
        t(`fin.cat.${x.category}`),
        x.description,
        x.gross.toFixed(2).replace('.', ','),
        `${x.vatRate}%`,
        n.toFixed(2).replace('.', ','),
        (x.gross - n).toFixed(2).replace('.', ','),
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    if (
      await window.api.saveText({
        content: csv,
        ext: 'csv',
        defaultPath: `buchungen-${year}${monthFilter !== 'all' ? `-${monthFilter}` : ''}.csv`,
        title: t('fin.exportCsv'),
      })
    )
      toast(t('common.saved'), 'success');
  };
  return h(
    'div',
    {},
    h(
      'div',
      { class: 'toolbar' },
      select(
        [
          { value: 'all', label: t('fin.allMonths') },
          ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1).padStart(2, '0'), label: monthName(i) })),
        ],
        monthFilter,
        (v) => {
          monthFilter = v;
          renderFinance(root);
        },
        { class: 'input select-sm' },
      ),
      h('div', { class: 'spacer' }),
      h('button', { class: 'btn btn-ghost', onclick: exportCsv }, icon('download', 16), 'CSV'),
      h(
        'button',
        { class: 'btn btn-soft', onclick: () => editTransaction(null, 'expense') },
        icon('arrowDown', 16),
        t('fin.addExpense'),
      ),
      h(
        'button',
        { class: 'btn btn-primary', onclick: () => editTransaction(null, 'income') },
        icon('arrowUp', 16),
        t('fin.addIncome'),
      ),
    ),
    h(
      'div',
      { class: 'card' },
      list.length
        ? h(
            'table',
            { class: 'data-table' },
            h(
              'thead',
              {},
              h(
                'tr',
                {},
                h('th', {}, t('fin.date')),
                h('th', {}, t('common.description')),
                h('th', {}, t('fin.category')),
                h('th', { class: 'num' }, t('fin.vatRate')),
                h('th', { class: 'num' }, t('fin.amount')),
                h('th', {}),
              ),
            ),
            h(
              'tbody',
              {},
              list.map((x) =>
                h(
                  'tr',
                  { class: 'hover-row' },
                  h('td', {}, numericDate(x.date)),
                  h(
                    'td',
                    {},
                    x.description,
                    x.invoiceId
                      ? h('span', { class: 'chip', style: { marginLeft: '6px' } }, icon('invoice', 11))
                      : null,
                  ),
                  h(
                    'td',
                    {},
                    h(
                      'span',
                      { class: `chip ${x.type === 'income' ? 'chip-income' : 'chip-expense'}` },
                      t(`fin.cat.${x.category}`),
                    ),
                  ),
                  h('td', { class: 'num muted' }, `${x.vatRate}%`),
                  h('td', { class: `num amount ${x.type}` }, `${x.type === 'income' ? '+' : '−'} ${money(x.gross)}`),
                  h(
                    'td',
                    { class: 'row-actions-cell' },
                    h(
                      'button',
                      { class: 'icon-btn small', title: t('common.edit'), onclick: () => editTransaction(x) },
                      icon('edit', 14),
                    ),
                    h(
                      'button',
                      {
                        class: 'icon-btn small',
                        title: t('common.delete'),
                        onclick: async () => {
                          if (await confirmDialog(t('fin.deleteEntry')))
                            update((d) => (d.transactions = d.transactions.filter((y) => y.id !== x.id)));
                        },
                      },
                      icon('trash', 14),
                    ),
                  ),
                ),
              ),
            ),
          )
        : emptyState(t('fin.noEntries'), t('fin.noEntriesHint')),
    ),
  );
}

function nextInvoiceNumber() {
  const y = new Date().getFullYear();
  const nums = state.data.invoices
    .filter((i) => String(i.number).startsWith(`RE-${y}-`))
    .map((i) => Number(String(i.number).split('-')[2]) || 0);
  return `RE-${y}-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`;
}

function editInvoice(inv) {
  const ku = state.data.business.kleinunternehmer;
  const draft = inv
    ? structuredClone(inv)
    : {
        number: nextInvoiceNumber(),
        date: todayKey(),
        serviceDate: todayKey(),
        dueDate: addDays(todayKey(), 14),
        customer: { name: '', address: '' },
        items: [{ desc: '', qty: 1, price: 0 }],
        vatRate: ku ? 0 : 19,
        note: '',
        status: 'draft',
      };
  return modal({
    title: inv ? t('inv.edit') : t('inv.new'),
    width: 760,
    build: (close) => {
      const itemsBox = h('div', { class: 'inv-items' });
      const totalsBox = h('div', { class: 'inv-totals' });
      const renderTotals = () => {
        const tt = invoiceTotals(draft);
        totalsBox.replaceChildren(
          h('div', {}, t('inv.net'), h('b', {}, money(tt.net))),
          draft.vatRate
            ? h('div', {}, t('ws.vat', { rate: draft.vatRate }), h('b', {}, money(tt.vat)))
            : h('div', { class: 'muted small' }, t('inv.kuNote')),
          h('div', { class: 'grand' }, t('inv.total'), h('b', {}, money(tt.gross))),
        );
      };
      const renderItems = () => {
        itemsBox.replaceChildren(
          h(
            'div',
            { class: 'inv-item head' },
            h('span', {}, t('common.description')),
            h('span', {}, t('inv.qty')),
            h('span', {}, draft.vatRate ? t('inv.unitNet') : t('inv.unitPrice')),
            h('span', {}),
          ),
          ...draft.items.map((it, i) =>
            h(
              'div',
              { class: 'inv-item' },
              h('input', {
                class: 'input',
                value: it.desc,
                placeholder: t('inv.itemPlaceholder'),
                oninput: (e) => (it.desc = e.target.value),
              }),
              h('input', {
                class: 'input',
                type: 'number',
                min: 0,
                step: 1,
                value: it.qty,
                oninput: (e) => ((it.qty = Number(e.target.value)), renderTotals()),
              }),
              h('input', {
                class: 'input',
                type: 'number',
                step: 0.01,
                value: it.price,
                oninput: (e) => ((it.price = Number(e.target.value)), renderTotals()),
              }),
              h(
                'button',
                {
                  class: 'icon-btn',
                  title: t('common.delete'),
                  onclick: () => (draft.items.splice(i, 1), renderItems(), renderTotals()),
                },
                icon('trash', 15),
              ),
            ),
          ),
          h(
            'div',
            { class: 'inv-add' },
            h(
              'button',
              {
                class: 'btn btn-ghost small',
                onclick: () => (draft.items.push({ desc: '', qty: 1, price: 0 }), renderItems()),
              },
              icon('plus', 14),
              t('inv.addItem'),
            ),
            state.data.products.length
              ? select(
                  [
                    { value: '', label: t('inv.fromCatalog') },
                    ...state.data.products.map((p) => ({ value: p.id, label: `${p.name} · ${money(p.price)}` })),
                  ],
                  '',
                  (id) => {
                    const p = state.data.products.find((x) => x.id === id);
                    if (!p) return;
                    const price = draft.vatRate
                      ? Math.round((p.price / (1 + draft.vatRate / 100)) * 100) / 100
                      : p.price;
                    draft.items.push({ desc: `${p.name} (${p.sku})`, qty: 1, price });
                    renderItems();
                    renderTotals();
                  },
                  { class: 'input select-sm' },
                )
              : null,
          ),
        );
      };
      renderItems();
      renderTotals();
      const inp = (obj, key, attrs = {}) =>
        h('input', { class: 'input', value: obj[key] || '', ...attrs, oninput: (e) => (obj[key] = e.target.value) });
      const address = h('textarea', {
        class: 'input',
        rows: 3,
        oninput: (e) => (draft.customer.address = e.target.value),
      });
      address.value = draft.customer.address || '';
      const note = h('textarea', {
        class: 'input',
        rows: 2,
        placeholder: t('inv.notePlaceholder'),
        oninput: (e) => (draft.note = e.target.value),
      });
      note.value = draft.note || '';
      const save = (andPdf) => {
        if (!draft.customer.name.trim()) return toast(t('inv.needCustomer'), 'error');
        draft.items = draft.items.filter((it) => it.desc.trim());
        if (!draft.items.length) return toast(t('inv.needItem'), 'error');
        update((d) => {
          if (inv)
            Object.assign(
              d.invoices.find((x) => x.id === inv.id),
              draft,
            );
          else d.invoices.push({ id: uid(), createdAt: Date.now(), ...draft });
        });
        close(true);
        if (andPdf) exportPdf(state.data.invoices.find((x) => x.number === draft.number));
      };
      return h(
        'div',
        { class: 'modal-body' },
        h(
          'div',
          { class: 'field-row three' },
          field(t('inv.number'), inp(draft, 'number')),
          field(t('inv.date'), inp(draft, 'date', { type: 'date' })),
          field(t('inv.serviceDate'), inp(draft, 'serviceDate', { type: 'date' })),
        ),
        h(
          'div',
          { class: 'field-row' },
          field(t('inv.customer'), inp(draft.customer, 'name', { placeholder: t('inv.customerPlaceholder') })),
          field(t('inv.dueDate'), inp(draft, 'dueDate', { type: 'date' })),
        ),
        field(t('inv.address'), address),
        field(
          t('fin.vatRate'),
          segmented(
            (ku ? ['0'] : ['19', '7', '0']).map((v) => ({ value: v, label: v === '0' && ku ? t('inv.ku') : `${v} %` })),
            String(draft.vatRate),
            (v) => ((draft.vatRate = Number(v)), renderItems(), renderTotals()),
          ),
        ),
        itemsBox,
        totalsBox,
        field(t('inv.note'), note),
        h(
          'div',
          { class: 'modal-actions' },
          h('button', { class: 'btn btn-ghost', onclick: () => close(false) }, t('common.cancel')),
          h('button', { class: 'btn btn-soft', onclick: () => save(true) }, icon('download', 15), t('inv.saveAndPdf')),
          h('button', { class: 'btn btn-primary', onclick: () => save(false) }, t('common.save')),
        ),
      );
    },
  });
}

async function exportPdf(inv) {
  if (!inv) return;
  const missing = !state.data.business.company && !state.data.business.owner;
  if (missing) toast(t('inv.fillBusiness'), 'error');
  const ok = await window.api.savePdf({
    html: invoiceHtml(inv, state.data.business),
    defaultPath: `${inv.number}.pdf`,
    title: t('inv.savePdf'),
  });
  if (ok) toast(t('common.saved'), 'success');
}

function setInvoiceStatus(inv, status) {
  update((d) => {
    const x = d.invoices.find((y) => y.id === inv.id);
    x.status = status;
    const linked = d.transactions.find((tr) => tr.invoiceId === inv.id);
    if (status === 'paid' && !linked) {
      d.transactions.push({
        id: uid(),
        createdAt: Date.now(),
        type: 'income',
        date: todayKey(),
        category: 'commission',
        description: `${t('inv.invoice')} ${x.number} · ${x.customer.name}`,
        gross: invoiceTotals(x).gross,
        vatRate: x.vatRate,
        invoiceId: x.id,
      });
    }
    if (status !== 'paid' && linked) d.transactions = d.transactions.filter((tr) => tr !== linked);
  });
  if (status === 'paid') toast(t('inv.paidBooked'), 'success');
}

function invoices() {
  const list = [...state.data.invoices].sort(
    (a, b) => b.date.localeCompare(a.date) || String(b.number).localeCompare(String(a.number)),
  );
  const today = todayKey();
  return h(
    'div',
    {},
    h(
      'div',
      { class: 'toolbar' },
      h('div', { class: 'muted' }, t('inv.hint')),
      h('div', { class: 'spacer' }),
      h('button', { class: 'btn btn-primary', onclick: () => editInvoice() }, icon('plus', 16), t('inv.new')),
    ),
    h(
      'div',
      { class: 'card' },
      list.length
        ? h(
            'table',
            { class: 'data-table' },
            h(
              'thead',
              {},
              h(
                'tr',
                {},
                h('th', {}, t('inv.number')),
                h('th', {}, t('inv.date')),
                h('th', {}, t('inv.customer')),
                h('th', { class: 'num' }, t('inv.total')),
                h('th', {}, t('inv.status')),
                h('th', {}),
              ),
            ),
            h(
              'tbody',
              {},
              list.map((inv) => {
                const overdue = inv.status === 'sent' && inv.dueDate && inv.dueDate < today;
                return h(
                  'tr',
                  { class: 'hover-row' },
                  h('td', {}, h('b', {}, inv.number)),
                  h('td', {}, numericDate(inv.date)),
                  h('td', {}, inv.customer.name),
                  h('td', { class: 'num' }, money(invoiceTotals(inv).gross)),
                  h(
                    'td',
                    {},
                    select(
                      ['draft', 'sent', 'paid'].map((s) => ({ value: s, label: t(`inv.status.${s}`) })),
                      inv.status,
                      (s) => setInvoiceStatus(inv, s),
                      { class: `input slim status-select st-${overdue ? 'overdue' : inv.status}` },
                    ),
                  ),
                  h(
                    'td',
                    { class: 'row-actions-cell' },
                    h(
                      'button',
                      { class: 'icon-btn small', title: 'PDF', onclick: () => exportPdf(inv) },
                      icon('download', 14),
                    ),
                    h(
                      'button',
                      { class: 'icon-btn small', title: t('common.edit'), onclick: () => editInvoice(inv) },
                      icon('edit', 14),
                    ),
                    h(
                      'button',
                      {
                        class: 'icon-btn small',
                        title: t('common.delete'),
                        onclick: async () => {
                          if (await confirmDialog(t('inv.delete', { n: inv.number })))
                            update((d) => (d.invoices = d.invoices.filter((x) => x.id !== inv.id)));
                        },
                      },
                      icon('trash', 14),
                    ),
                  ),
                );
              }),
            ),
          )
        : emptyState(t('inv.none'), t('inv.noneHint')),
    ),
  );
}

export function renderFinance(root) {
  const years = new Set([new Date().getFullYear(), ...state.data.transactions.map((x) => Number(x.date.slice(0, 4)))]);
  root.replaceChildren(
    h(
      'div',
      { class: 'page-head' },
      h('div', {}, h('h1', {}, t('nav.finance')), h('div', { class: 'muted' }, t('fin.subtitle'))),
      h(
        'div',
        { class: 'head-actions' },
        tab !== 'invoices'
          ? select(
              [...years].sort().map((y) => ({ value: y, label: String(y) })),
              year,
              (v) => {
                year = Number(v);
                renderFinance(root);
              },
              { class: 'input select-sm' },
            )
          : null,
        segmented(
          ['overview', 'entries', 'invoices'].map((v) => ({ value: v, label: t(`fin.tab.${v}`) })),
          tab,
          (v) => {
            tab = v;
            renderFinance(root);
          },
        ),
      ),
    ),
    tab === 'overview' ? overview() : tab === 'entries' ? entries(root) : invoices(),
  );
}
