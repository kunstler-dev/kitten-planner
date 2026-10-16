// Invoice HTML for PDF export. Always German: it is a legal document for German customers/tax office.
// Contains the mandatory fields of § 14 Abs. 4 UStG (or the § 19 UStG note for Kleinunternehmer).

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const eur = (v) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v || 0);
const date = (k) => (k ? k.split('-').reverse().join('.') : '');

export function invoiceTotals(inv) {
  const net =
    Math.round(inv.items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0) * 100) / 100;
  const vat = Math.round(net * ((Number(inv.vatRate) || 0) / 100) * 100) / 100;
  return { net, vat, gross: Math.round((net + vat) * 100) / 100 };
}

export function invoiceHtml(inv, b) {
  const tt = invoiceTotals(inv);
  const sender = [b.company, b.owner].filter(Boolean).join(' · ');
  const lines = inv.items
    .map(
      (it, i) =>
        `<tr><td>${i + 1}</td><td>${esc(it.desc)}</td><td class="r">${esc(it.qty)}</td><td class="r">${eur(it.price)}</td><td class="r">${eur((Number(it.qty) || 0) * (Number(it.price) || 0))}</td></tr>`,
    )
    .join('');
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 18mm 18mm 22mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #2f2933; font-size: 10.5pt; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28mm; }
  .brand { font-size: 17pt; font-weight: 700; color: #7c69ad; }
  .from { font-size: 8pt; color: #777; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin-bottom: 6px; }
  .meta td { padding: 1px 0 1px 14px; }
  h1 { font-size: 15pt; margin: 0 0 8mm; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 4mm; }
  .items th { text-align: left; border-bottom: 1.5px solid #7c69ad; padding: 6px 4px; font-size: 9pt; }
  .items td { border-bottom: 1px solid #e5e0e8; padding: 6px 4px; vertical-align: top; }
  .r { text-align: right; }
  .totals { margin-left: auto; margin-top: 6mm; width: 70mm; }
  .totals td { padding: 3px 4px; } .totals .g td { font-weight: 700; border-top: 1.5px solid #2f2933; font-size: 11.5pt; }
  .note { margin-top: 10mm; white-space: pre-wrap; }
  .foot { position: fixed; bottom: 0; left: 0; right: 0; font-size: 7.5pt; color: #777; border-top: 1px solid #ddd; padding-top: 4px; display: flex; justify-content: space-between; gap: 10px; }
  </style></head><body>
  <div class="top">
    <div>
      <div class="from">${esc(sender)}${b.address ? ` · ${esc(b.address.replace(/\n/g, ', '))}` : ''}</div>
      <div><b>${esc(inv.customer.name)}</b><br>${esc(inv.customer.address).replace(/\n/g, '<br>')}</div>
    </div>
    <div style="text-align:right">
      <div class="brand">${esc(b.company || b.owner)}</div>
      <div>${esc(b.owner && b.company ? b.owner : '')}</div>
      <div>${esc(b.address).replace(/\n/g, '<br>')}</div>
      <div>${esc(b.email)}${b.phone ? ` · ${esc(b.phone)}` : ''}</div>
      <table class="meta" style="margin-left:auto;margin-top:8px">
        <tr><td>Rechnungsnr.:</td><td><b>${esc(inv.number)}</b></td></tr>
        <tr><td>Rechnungsdatum:</td><td>${date(inv.date)}</td></tr>
        <tr><td>Leistungsdatum:</td><td>${date(inv.serviceDate || inv.date)}</td></tr>
        ${b.taxNumber ? `<tr><td>Steuernummer:</td><td>${esc(b.taxNumber)}</td></tr>` : ''}
        ${b.vatId ? `<tr><td>USt-IdNr.:</td><td>${esc(b.vatId)}</td></tr>` : ''}
      </table>
    </div>
  </div>
  <h1>Rechnung ${esc(inv.number)}</h1>
  <table class="items"><thead><tr><th>Pos.</th><th>Beschreibung</th><th class="r">Menge</th><th class="r">Einzelpreis${inv.vatRate ? ' (netto)' : ''}</th><th class="r">Gesamt</th></tr></thead><tbody>${lines}</tbody></table>
  <table class="totals">
    ${inv.vatRate ? `<tr><td>Nettobetrag</td><td class="r">${eur(tt.net)}</td></tr><tr><td>zzgl. ${inv.vatRate} % USt.</td><td class="r">${eur(tt.vat)}</td></tr>` : ''}
    <tr class="g"><td>Gesamtbetrag</td><td class="r">${eur(tt.gross)}</td></tr>
  </table>
  ${inv.vatRate ? '' : '<p>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).</p>'}
  <p>Bitte überweisen Sie den Betrag${inv.dueDate ? ` bis zum <b>${date(inv.dueDate)}</b>` : ''} unter Angabe der Rechnungsnummer.</p>
  ${inv.note ? `<div class="note">${esc(inv.note)}</div>` : ''}
  <div class="foot">
    <div>${esc(sender)}<br>${esc((b.address || '').replace(/\n/g, ', '))}</div>
    <div>${b.bank ? `${esc(b.bank)}<br>` : ''}${b.iban ? `IBAN ${esc(b.iban)}` : ''}${b.bic ? ` · BIC ${esc(b.bic)}` : ''}</div>
    <div>${b.taxNumber ? `St.-Nr. ${esc(b.taxNumber)}` : ''}${b.vatId ? `<br>USt-IdNr. ${esc(b.vatId)}` : ''}</div>
  </div>
  </body></html>`;
}
