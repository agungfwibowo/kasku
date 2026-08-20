const store = require('./store');

const MAX_STORED = 50;

function record({ title, body, url }) {
  const items = store.readAll('notifications');
  items.unshift({
    id: require('crypto').randomUUID(),
    title,
    body,
    url: url || '/admin',
    read: false,
    createdAt: Date.now(),
  });
  store.writeAll('notifications', items.slice(0, MAX_STORED));
}

function list() {
  return store.readAll('notifications').sort((a, b) => b.createdAt - a.createdAt);
}

function unreadCount() {
  return store.readAll('notifications').filter((n) => !n.read).length;
}

function markRead(id) {
  store.update('notifications', id, { read: true });
}

function markAllRead() {
  const items = store.readAll('notifications').map((n) => ({ ...n, read: true }));
  store.writeAll('notifications', items);
}

module.exports = { record, list, unreadCount, markRead, markAllRead };
