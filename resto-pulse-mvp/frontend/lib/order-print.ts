import type { RestaurantOrderRead } from '@/lib/types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusText(status: RestaurantOrderRead['status']): string {
  if (status === 'accepted') return 'Onaylandi';
  if (status === 'rejected') return 'Reddedildi';
  return 'Onay bekliyor';
}

export function buildOrderPrintHtml(order: RestaurantOrderRead, restaurantName: string): string {
  const orderNo = order.order_number ?? '—';
  const linesHtml = order.lines
    .map(
      (line) => `
      <tr>
        <td>${escapeHtml(line.name)}</td>
        <td class="num">${line.quantity}</td>
        <td class="num">${line.line_total_tl.toFixed(0)} TL</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>Siparis ${escapeHtml(orderNo)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #111;
      margin: 0;
      padding: 16px;
      font-size: 13px;
      line-height: 1.4;
    }
    h1 {
      font-size: 18px;
      margin: 0 0 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .brand { font-size: 11px; color: #666; margin-bottom: 16px; }
    .meta { margin-bottom: 14px; }
    .meta p { margin: 2px 0; }
    .label { color: #555; min-width: 72px; display: inline-block; }
    .box {
      border: 1px solid #ccc;
      border-radius: 6px;
      padding: 10px;
      margin: 12px 0;
      min-height: 56px;
      white-space: pre-wrap;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border-bottom: 1px solid #ddd; padding: 6px 4px; text-align: left; vertical-align: top; }
    th { font-size: 11px; text-transform: uppercase; color: #555; }
    td.num { text-align: right; white-space: nowrap; }
    .total {
      margin-top: 10px;
      font-size: 16px;
      font-weight: bold;
      text-align: right;
    }
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px dashed #aaa;
      font-size: 11px;
      color: #666;
    }
    @media print {
      body { padding: 0; }
      @page { margin: 12mm; }
    }
  </style>
</head>
<body>
  <div class="brand">GastroSkor · Online siparis formu</div>
  <h1>${escapeHtml(restaurantName)}</h1>
  <div class="meta">
    <p><span class="label">Siparis no</span> <strong>${escapeHtml(orderNo)}</strong></p>
    <p><span class="label">Tarih</span> ${escapeHtml(formatWhen(order.created_at))}</p>
    <p><span class="label">Durum</span> ${escapeHtml(statusText(order.status))}</p>
  </div>
  <p><span class="label">Musteri</span> ${escapeHtml(order.customer_name || '—')}</p>
  <p><span class="label">Telefon</span> <strong>${escapeHtml(order.customer_phone)}</strong></p>
  <p class="label" style="margin-top:10px">Teslimat adresi</p>
  <div class="box">${escapeHtml(order.customer_address || '—')}</div>
  <table>
    <thead>
      <tr><th>Urun</th><th class="num">Adet</th><th class="num">Tutar</th></tr>
    </thead>
    <tbody>${linesHtml}</tbody>
  </table>
  <div class="total">Toplam: ${order.total_tl.toFixed(0)} TL</div>
  ${order.note ? `<p style="margin-top:12px"><span class="label">Not</span> ${escapeHtml(order.note)}</p>` : ''}
  ${order.payment_method_label ? `<p style="margin-top:12px"><span class="label">Odeme</span> <strong>${escapeHtml(order.payment_method_label)}</strong></p>` : ''}
  <div class="footer">Tahsilat restoran/kurye cihazinda · GastroSkor panelinden yazdirildi</div>
</body>
</html>`;
}

export function printRestaurantOrder(order: RestaurantOrderRead, restaurantName: string): void {
  if (typeof window === 'undefined') return;
  const html = buildOrderPrintHtml(order, restaurantName);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Siparis formu yazdir');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(iframe);

  const printWindow = iframe.contentWindow;
  const printDoc = printWindow?.document;
  if (!printWindow || !printDoc) {
    iframe.remove();
    window.alert('Yazdirma baslatilamadi. Sayfayi yenileyip tekrar deneyin.');
    return;
  }

  printDoc.open();
  printDoc.write(html);
  printDoc.close();

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 1000);
  };

  const triggerPrint = () => {
    try {
      printWindow.focus();
      printWindow.print();
    } finally {
      cleanup();
    }
  };

  // Pop-up acmadan ayni sekmede yazdir — engelleyiciye takilmaz.
  window.setTimeout(triggerPrint, 300);
}
