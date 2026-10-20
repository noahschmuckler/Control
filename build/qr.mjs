// Fixed, always-visible QR code pointing at the published page.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const QRCode = require('qrcode');

export const PAGES_URL = 'https://noahschmuckler.github.io/Control/';

function qrSvg(text) {
  const { size, data } = QRCode.create(text, { errorCorrectionLevel: 'M' }).modules;
  const q = 2; // quiet zone, in modules
  let d = '';
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (data[y * size + x]) d += `M${x + q} ${y + q}h1v1h-1z`;
  const n = size + q * 2;
  return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" aria-hidden="true"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#111"/></svg>`;
}

export function qrWidget(url) {
  return `<aside class="qr" id="qr" aria-label="QR code linking to this page">
  <button type="button" class="qr-toggle" aria-expanded="true" aria-controls="qr" title="Shrink QR code">–</button>
  <a href="${url}" class="qr-code">${qrSvg(url)}</a>
  <span class="qr-label">Scan to follow along</span>
</aside>`;
}

// Lets the presenter shrink the code to a corner tab (it never disappears).
export const QR_SCRIPT = `<script>
(function () {
  var qr = document.getElementById('qr'); if (!qr) return;
  var btn = qr.querySelector('.qr-toggle');
  function set(small) {
    qr.classList.toggle('small', small);
    btn.textContent = small ? '+' : '–';
    btn.title = small ? 'Enlarge QR code' : 'Shrink QR code';
    btn.setAttribute('aria-expanded', String(!small));
  }
  // Phone viewers usually arrived by scanning it: start small there.
  if (window.matchMedia('(max-width: 720px)').matches) set(true);
  btn.addEventListener('click', function () { set(!qr.classList.contains('small')); });
})();
</script>`;
