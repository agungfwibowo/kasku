function trimTrailingZero(x) {
  return (Math.round(x * 10) / 10).toString().replace(/\.0$/, '');
}

function formatRupiah(amount) {
  const n = Number(amount) || 0;
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${trimTrailingZero(n / 1_000_000_000)}M`;
  if (abs >= 1_000_000) return `${trimTrailingZero(n / 1_000_000)}jt`;
  if (abs >= 1_000) return `${trimTrailingZero(n / 1_000)}rb`;
  return n.toLocaleString('id-ID');
}

function parseRupiah(value) {
  return Number(String(value || '').replace(/\D/g, '')) || 0;
}

module.exports = { formatRupiah, parseRupiah };
