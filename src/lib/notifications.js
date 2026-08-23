const store = require('./store');

const MAX_STORED = 50;

function record({ title, body, url, ownerId }) {
  const items = store.readAll('notifications');
  items.unshift({
    id: require('crypto').randomUUID(),
    ownerId,
    title,
    body,
    url: url || '/admin',
    read: false,
    createdAt: Date.now(),
  });
  const kept = items.filter((n) => n.ownerId === ownerId).slice(0, MAX_STORED);
  const others = items.filter((n) => n.ownerId !== ownerId);
  store.writeAll('notifications', [...kept, ...others]);
}

function list(ownerId) {
  return store
    .readAll('notifications')
    .filter((n) => n.ownerId === ownerId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

function unreadCount(ownerId) {
  return store.readAll('notifications').filter((n) => n.ownerId === ownerId && !n.read).length;
}

function markRead(id, ownerId) {
  const item = store.findById('notifications', id);
  if (item && item.ownerId === ownerId) {
    store.update('notifications', id, { read: true });
  }
}

function markAllRead(ownerId) {
  const items = store.readAll('notifications').map((n) => (n.ownerId === ownerId ? { ...n, read: true } : n));
  store.writeAll('notifications', items);
}

function markManyRead(ids, ownerId) {
  const idSet = new Set(ids);
  const items = store.readAll('notifications').map((n) =>
    idSet.has(n.id) && n.ownerId === ownerId ? { ...n, read: true } : n
  );
  store.writeAll('notifications', items);
}

function remove(id, ownerId) {
  const item = store.findById('notifications', id);
  if (item && item.ownerId === ownerId) {
    store.remove('notifications', id);
  }
}

function removeMany(ids, ownerId) {
  const idSet = new Set(ids);
  const items = store.readAll('notifications').filter((n) => !(idSet.has(n.id) && n.ownerId === ownerId));
  store.writeAll('notifications', items);
}

module.exports = { record, list, unreadCount, markRead, markAllRead, markManyRead, remove, removeMany };
