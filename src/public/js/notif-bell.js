function timeAgo(ts) {
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return mins + ' menit lalu';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + ' jam lalu';
  const days = Math.floor(hours / 24);
  return days + ' hari lalu';
}

function initNotifBell() {
  const menu = document.getElementById('notifMenu');
  const bellBtn = document.getElementById('notifBellBtn');
  const dropdown = document.getElementById('notifDropdown');
  const badge = document.getElementById('notifBadge');
  const list = document.getElementById('notifList');
  const markAllBtn = document.getElementById('notifMarkAllBtn');
  const allReadLabel = document.getElementById('notifAllReadLabel');
  if (!menu || !bellBtn || !dropdown) return;

  function renderBadge(count) {
    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : String(count);
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
    markAllBtn.style.display = count > 0 ? 'flex' : 'none';
    allReadLabel.style.display = count > 0 ? 'none' : 'block';
  }

  const MAX_SHOWN = 5;

  function renderList(items) {
    if (!items.length) {
      list.innerHTML = '<div class="notif-empty"><i data-lucide="inbox"></i><p>Belum ada notifikasi</p></div>';
      if (window.lucide) lucide.createIcons();
      return;
    }
    const html = items.slice(0, MAX_SHOWN).map(function (n) {
      return '<div class="notif-item' + (n.read ? '' : ' unread') + '" data-id="' + n.id + '" data-url="' + n.url + '">' +
        '<div class="notif-item-title">' + n.title + '</div>' +
        '<div class="notif-item-body">' + n.body + '</div>' +
        '<div class="notif-item-time">' + timeAgo(n.createdAt) + '</div>' +
        '</div>';
    }).join('');
    const seeAll = '<a href="/admin/notifications/all" class="notif-see-all">Lihat semua notifikasi</a>';
    list.innerHTML = html + seeAll;
  }

  async function loadNotifications(listAlso) {
    const res = await fetch('/admin/notifications', { headers: { Accept: 'application/json' } });
    const data = await res.json();
    renderBadge(data.unreadCount);
    if (listAlso) renderList(data.items);
  }

  function toggleDropdown() {
    const isOpen = dropdown.classList.contains('open');
    if (isOpen) {
      dropdown.classList.remove('open');
    } else {
      dropdown.classList.add('open');
      loadNotifications(true);
    }
  }

  bellBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    toggleDropdown();
  });
  document.addEventListener('click', function (e) {
    if (!menu.contains(e.target)) dropdown.classList.remove('open');
  });

  list.addEventListener('click', function (e) {
    const item = e.target.closest('.notif-item');
    if (!item) return;
    const id = item.dataset.id;
    const url = item.dataset.url;
    fetch('/admin/notifications/' + id + '/read', { method: 'POST' }).finally(function () {
      window.location.href = url;
    });
  });

  markAllBtn.addEventListener('click', function () {
    fetch('/admin/notifications/read-all', { method: 'POST' }).then(function () { loadNotifications(true); });
  });

  loadNotifications();

  const POLL_INTERVAL = 20000;
  setInterval(function () {
    loadNotifications(dropdown.classList.contains('open'));
  }, POLL_INTERVAL);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') loadNotifications(dropdown.classList.contains('open'));
  });
}
