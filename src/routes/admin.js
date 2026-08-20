const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const store = require('../lib/store');
const { generateBarcodePng, generateCode } = require('../lib/barcode');
const { requireAdmin } = require('../lib/auth');
const { parseRupiah } = require('../lib/format');
const push = require('../lib/push');
const notifications = require('../lib/notifications');

const router = express.Router();

router.use(requireAdmin);
router.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `qris${path.extname(file.originalname) || '.png'}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

function withProduct(codeItem) {
  const product = store.findById('products', codeItem.productId) || { label: 'Produk tidak ditemukan', price: 0 };
  return { ...codeItem, label: product.label, price: product.price };
}

router.get('/', (req, res) => {
  const codes = store
    .readAll('codes')
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(withProduct);
  const products = store.readAll('products').sort((a, b) => a.label.localeCompare(b.label));
  res.render('admin/dashboard', { codes, products });
});

router.post('/codes', (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.redirect('/admin');
  store.insert('codes', {
    code: generateCode(),
    productId,
    createdAt: Date.now(),
  });
  res.redirect('/admin');
});

router.post('/codes/:id/edit', (req, res) => {
  const { productId } = req.body;
  store.update('codes', req.params.id, { productId });
  res.redirect('/admin');
});

router.post('/codes/:id/delete', (req, res) => {
  store.remove('codes', req.params.id);
  res.redirect('/admin');
});

function confirmLink(req, code) {
  return `${req.protocol}://${req.get('host')}/confirm/${code}`;
}

router.get('/codes/:id/barcode.png', async (req, res, next) => {
  try {
    const codeItem = store.findById('codes', req.params.id);
    if (!codeItem) return res.status(404).end();
    const png = await generateBarcodePng(confirmLink(req, codeItem.code));
    res.type('png').send(png);
  } catch (err) {
    next(err);
  }
});

router.get('/codes/:id/print', (req, res) => {
  const codeItem = store.findById('codes', req.params.id);
  if (!codeItem) return res.redirect('/admin');
  res.render('admin/print', { codeItem: withProduct(codeItem), link: confirmLink(req, codeItem.code) });
});

router.get('/products', (req, res) => {
  const products = store.readAll('products').sort((a, b) => b.createdAt - a.createdAt);
  res.render('admin/products', { products });
});

router.post('/products', (req, res) => {
  const { label, price } = req.body;
  if (label && label.trim()) {
    store.insert('products', { label: label.trim(), price: parseRupiah(price), createdAt: Date.now() });
  }
  res.redirect('/admin/products');
});

router.post('/products/:id/edit', (req, res) => {
  const { label, price } = req.body;
  store.update('products', req.params.id, { label, price: parseRupiah(price) });
  res.redirect('/admin/products');
});

router.post('/products/:id/delete', (req, res) => {
  store.remove('products', req.params.id);
  res.redirect('/admin/products');
});

router.post('/products/:id/duplicate', (req, res) => {
  const product = store.findById('products', req.params.id);
  if (product) {
    store.insert('products', { label: `${product.label} (Copy)`, price: product.price, createdAt: Date.now() });
  }
  res.redirect('/admin/products');
});

router.get('/contacts', (req, res) => {
  const contacts = store.readAll('contacts').sort((a, b) => a.name.localeCompare(b.name));
  res.render('admin/contacts', { contacts });
});

router.post('/contacts', (req, res) => {
  const { name } = req.body;
  if (name && name.trim()) {
    store.insert('contacts', { name: name.trim() });
  }
  res.redirect('/admin/contacts');
});

router.post('/contacts/:id/edit', (req, res) => {
  const { name } = req.body;
  if (name && name.trim()) {
    store.update('contacts', req.params.id, { name: name.trim() });
  }
  res.redirect('/admin/contacts');
});

router.post('/contacts/:id/delete', (req, res) => {
  store.remove('contacts', req.params.id);
  res.redirect('/admin/contacts');
});

router.get('/settings', (req, res) => {
  const settings = store.readObject('settings');
  res.render('admin/settings', { settings });
});

router.post('/settings', upload.single('qrisImage'), (req, res) => {
  const { waNumber, bankName, bankAccountNumber, bankAccountName, removeQris } = req.body;
  const current = store.readObject('settings');
  let qrisImage = current.qrisImage || '';

  if (req.file) {
    qrisImage = `/uploads/${req.file.filename}`;
  } else if (removeQris) {
    if (qrisImage) {
      const filePath = path.join(UPLOAD_DIR, path.basename(qrisImage));
      fs.rm(filePath, () => {});
    }
    qrisImage = '';
  }

  store.writeObject('settings', {
    waNumber: (waNumber || '').trim(),
    bankName: (bankName || '').trim(),
    bankAccountNumber: (bankAccountNumber || '').trim(),
    bankAccountName: (bankAccountName || '').trim(),
    qrisImage,
  });
  res.redirect('/admin/settings');
});

router.get('/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: push.publicKey, enabled: push.enabled });
});

router.post('/push/subscribe', express.json(), (req, res) => {
  push.subscribe(req.body);
  res.status(201).end();
});

router.post('/push/unsubscribe', express.json(), (req, res) => {
  push.unsubscribe(req.body.endpoint);
  res.status(204).end();
});

router.get('/notifications', (req, res) => {
  if (req.accepts(['json', 'html']) === 'html') {
    return res.redirect('/admin/notifications/all');
  }
  res.json({ items: notifications.list(), unreadCount: notifications.unreadCount() });
});

router.get('/notifications/all', (req, res) => {
  const items = notifications.list();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const todayStart = startOfDay(new Date());
  const groups = [];

  items.forEach((n) => {
    const diffDays = Math.round((todayStart - startOfDay(new Date(n.createdAt))) / 86400000);
    let label;
    if (diffDays === 0) label = 'Hari ini';
    else if (diffDays === 1) label = 'Kemarin';
    else label = new Date(n.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    let group = groups.find((g) => g.label === label);
    if (!group) {
      group = { label, items: [] };
      groups.push(group);
    }
    group.items.push(n);
  });

  res.render('admin/notifications', { groups, unreadCount: items.filter((n) => !n.read).length });
});

router.post('/notifications/:id/read', (req, res) => {
  notifications.markRead(req.params.id);
  res.status(204).end();
});

router.post('/notifications/read-all', (req, res) => {
  notifications.markAllRead();
  res.status(204).end();
});

router.get('/history', (req, res) => {
  const { from, to, label, method, status, validated, q } = req.query;
  let confirmations = store.readAll('confirmations').sort((a, b) => b.createdAt - a.createdAt);

  if (from) {
    const fromTs = new Date(from).setHours(0, 0, 0, 0);
    confirmations = confirmations.filter((c) => c.createdAt >= fromTs);
  }
  if (to) {
    const toTs = new Date(to).setHours(23, 59, 59, 999);
    confirmations = confirmations.filter((c) => c.createdAt <= toTs);
  }
  if (label) {
    confirmations = confirmations.filter((c) => c.label === label);
  }
  if (method) {
    confirmations = confirmations.filter((c) => c.method === method);
  }
  if (status) {
    confirmations = confirmations.filter((c) => (c.status || 'lunas') === status);
  }
  if (validated) {
    confirmations = confirmations.filter((c) => String(!!c.validated) === validated);
  }
  if (q) {
    const needle = q.trim().toLowerCase();
    confirmations = confirmations.filter((c) => (c.contactName || '').toLowerCase().includes(needle));
  }

  const labels = [...new Set(store.readAll('confirmations').map((c) => c.label))].sort();

  const groupsMap = new Map();
  confirmations.forEach((c) => {
    if (!groupsMap.has(c.label)) groupsMap.set(c.label, []);
    groupsMap.get(c.label).push(c);
  });
  const groups = [...groupsMap.entries()].map(([groupLabel, items]) => ({ label: groupLabel, items }));

  const activeFilterCount = [from, to, label, method, status, validated, q].filter(Boolean).length;

  res.render('admin/history', {
    groups,
    labels,
    activeFilterCount,
    filters: {
      from: from || '',
      to: to || '',
      label: label || '',
      method: method || '',
      status: status || '',
      validated: validated || '',
      q: q || '',
    },
  });
});

router.post('/history/:id/validate', (req, res) => {
  const item = store.findById('confirmations', req.params.id);
  if (item) {
    store.update('confirmations', req.params.id, { validated: !item.validated });
  }
  res.redirect(req.get('Referer') || '/admin/history');
});

router.post('/history/:id/delete', (req, res) => {
  store.remove('confirmations', req.params.id);
  res.redirect(req.get('Referer') || '/admin/history');
});

router.post('/history/bulk-validate', (req, res) => {
  const ids = [].concat(req.body.ids || []);
  ids.forEach((id) => store.update('confirmations', id, { validated: true }));
  res.redirect(req.get('Referer') || '/admin/history');
});

router.post('/history/bulk-delete', (req, res) => {
  const ids = [].concat(req.body.ids || []);
  ids.forEach((id) => store.remove('confirmations', id));
  res.redirect(req.get('Referer') || '/admin/history');
});

router.post('/history/:id/update', (req, res) => {
  const { method, status } = req.body;
  const item = store.findById('confirmations', req.params.id);
  if (item) {
    store.update('confirmations', req.params.id, {
      method: method === 'tf' || method === 'qris' ? method : 'cash',
      status: status === 'later' ? 'later' : 'lunas',
    });
  }
  res.redirect(req.get('Referer') || '/admin/history');
});

module.exports = router;
