require('dotenv').config();
const fs = require('fs');
const path = require('path');
const store = require('../src/lib/store');
const { hashPassword } = require('../src/lib/auth');

const DATA_DIR = path.join(__dirname, '..', 'data');

function ensureFile(name, def) {
  const p = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify(def, null, 2));
}

ensureFile('admins', []);

const admins = store.readAll('admins');
if (admins.length > 0) {
  console.log('Sudah ada admin, migrasi dilewati.');
  process.exit(0);
}

const password = process.env.ADMIN_PASSWORD || 'admin123';
const { salt, hash } = hashPassword(password);
const admin = store.insert('admins', {
  username: 'admin',
  name: 'Admin',
  salt,
  hash,
  createdAt: Date.now(),
});

['products', 'codes', 'contacts', 'confirmations', 'notifications', 'push-subscriptions'].forEach((name) => {
  const items = store.readAll(name).map((item) => ({ ownerId: admin.id, ...item }));
  store.writeAll(name, items);
});

const settings = store.readObject('settings');
if (!settings[admin.id]) {
  store.writeObject('settings', { [admin.id]: settings });
}

console.log(`Migrasi selesai. Login pakai username "admin" dengan password yang sama seperti ADMIN_PASSWORD sebelumnya.`);
