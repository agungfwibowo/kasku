const webpush = require('web-push');
const store = require('./store');
const notifications = require('./notifications');

const publicKey = process.env.VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';
const enabled = Boolean(publicKey && privateKey);

if (enabled) {
  webpush.setVapidDetails('mailto:admin@kasku.local', publicKey, privateKey);
}

function subscribe(subscription) {
  const subs = store.readAll('push-subscriptions');
  const exists = subs.some((s) => s.endpoint === subscription.endpoint);
  if (!exists) {
    store.insert('push-subscriptions', subscription);
  }
}

function unsubscribe(endpoint) {
  const subs = store.readAll('push-subscriptions');
  store.writeAll('push-subscriptions', subs.filter((s) => s.endpoint !== endpoint));
}

async function notifyAdmins(payload) {
  notifications.record(payload);

  if (!enabled) return;
  const subs = store.readAll('push-subscriptions');
  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map((sub) =>
      webpush.sendNotification(sub, body).catch((err) => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          unsubscribe(sub.endpoint);
        } else {
          console.error('Push error:', err.message);
        }
      })
    )
  );
}

module.exports = { enabled, publicKey, subscribe, unsubscribe, notifyAdmins };
