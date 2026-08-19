function attachRupiahInput(input) {
  if (!input) return;
  input.addEventListener('input', function () {
    const digits = input.value.replace(/\D/g, '');
    input.value = digits ? Number(digits).toLocaleString('id-ID') : '';
  });
}

function formatRupiah(amount) {
  const n = Number(amount) || 0;
  const abs = Math.abs(n);
  function trim(x) {
    return (Math.round(x * 10) / 10).toString().replace(/\.0$/, '');
  }
  if (abs >= 1000000000) return trim(n / 1000000000) + 'M';
  if (abs >= 1000000) return trim(n / 1000000) + 'jt';
  if (abs >= 1000) return trim(n / 1000) + 'rb';
  return n.toLocaleString('id-ID');
}
