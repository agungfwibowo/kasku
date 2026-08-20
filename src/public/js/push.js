function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function initPushButton(btn, labelEl) {
  if (!btn) return;

  async function refresh() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      btn.disabled = true;
      btn.title = 'Browser tidak mendukung notifikasi';
      if (labelEl) labelEl.textContent = 'Tidak didukung browser ini';
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    btn.classList.toggle('active', Boolean(sub));
    const text = sub ? 'Matikan Notifikasi' : 'Aktifkan Notifikasi';
    btn.title = text;
    if (labelEl) labelEl.textContent = text;
  }

  async function toggle() {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();

    if (existing) {
      await fetch('/admin/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: existing.endpoint }),
      });
      await existing.unsubscribe();
      await refresh();
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      customAlert('Izin notifikasi ditolak. Aktifkan lewat pengaturan browser jika berubah pikiran.', 'bell-off');
      return;
    }

    const res = await fetch('/admin/push/vapid-public-key');
    const { publicKey, enabled } = await res.json();
    if (!enabled) {
      customAlert('Push notif belum dikonfigurasi di server (VAPID key belum diset).', 'triangle-alert');
      return;
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await fetch('/admin/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    });
    await refresh();
  }

  btn.addEventListener('click', function () {
    btn.disabled = true;
    btn.classList.add('loading');
    const prevLabel = labelEl ? labelEl.textContent : null;
    if (labelEl) labelEl.textContent = 'Memproses...';
    toggle()
      .catch(function (err) {
        customAlert('Gagal mengatur notifikasi: ' + err.message, 'triangle-alert');
        if (labelEl && prevLabel) labelEl.textContent = prevLabel;
      })
      .finally(function () {
        btn.disabled = false;
        btn.classList.remove('loading');
      });
  });
  refresh();
}
