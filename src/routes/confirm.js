const express = require('express');
const store = require('../lib/store');
const push = require('../lib/push');

const router = express.Router();

function findCodeWithProduct(code) {
  const codeItem = store.readAll('codes').find((c) => c.code === code);
  if (!codeItem) return null;
  const product = store.findById('products', codeItem.productId) || { label: 'Produk tidak ditemukan', price: 0 };
  return { ...codeItem, label: product.label, price: product.price };
}

function normalizeWaNumber(raw) {
  let waNumber = (raw || '').replace(/\D/g, '');
  if (waNumber.startsWith('0')) waNumber = `62${waNumber.slice(1)}`;
  return waNumber;
}

function normalizeMethod(method) {
  if (method === 'tf' || method === 'qris') return method;
  return 'cash';
}

function methodLabel(method) {
  if (method === 'tf') return 'Transfer';
  if (method === 'qris') return 'QRIS';
  return 'Cash';
}

router.get('/:code/unpaid', (req, res) => {
  const codeItem = findCodeWithProduct(req.params.code);
  const contactId = req.query.contactId;
  if (!codeItem || !contactId) return res.json({ amount: 0 });

  const amount = store
    .readAll('confirmations')
    .filter((c) => c.ownerId === codeItem.ownerId && c.label === codeItem.label && c.contactId === contactId && c.status === 'later')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  res.json({ amount });
});

router.get('/:code', (req, res) => {
  const codeItem = findCodeWithProduct(req.params.code);
  if (!codeItem) return res.status(404).render('public/not-found');
  const contacts = store.readAll('contacts').filter((c) => c.ownerId === codeItem.ownerId).sort((a, b) => a.name.localeCompare(b.name));
  const allSettings = store.readObject('settings');
  const settings = allSettings[codeItem.ownerId] || {};
  res.render('public/confirm', { codeItem, contacts, error: null, qty: 1, settings });
});

router.post('/:code', (req, res) => {
  const codeItem = findCodeWithProduct(req.params.code);
  if (!codeItem) return res.status(404).render('public/not-found');

  const { contactId, newContactName, qty, method, status, payOffUnpaid } = req.body;
  const contacts = store.readAll('contacts').filter((c) => c.ownerId === codeItem.ownerId).sort((a, b) => a.name.localeCompare(b.name));
  const allSettings = store.readObject('settings');
  const settings = allSettings[codeItem.ownerId] || {};

  let contactName = '';
  let finalContactId = contactId || null;

  if (contactId) {
    const contact = store.findById('contacts', contactId);
    contactName = contact && contact.ownerId === codeItem.ownerId ? contact.name : '';
  } else if (newContactName && newContactName.trim()) {
    const created = store.insert('contacts', { ownerId: codeItem.ownerId, name: newContactName.trim() });
    contactName = created.name;
    finalContactId = created.id;
  }

  const qtyValue = parseInt(qty, 10);

  if (!contactName) {
    return res.render('public/confirm', { codeItem, contacts, error: 'Nama wajib diisi', qty, settings });
  }
  if (!qtyValue || qtyValue < 1) {
    return res.render('public/confirm', { codeItem, contacts, error: 'Jumlah wajib diisi (angka bulat)', qty, settings });
  }

  const price = Number(codeItem.price) || 0;
  const amountValue = price * qtyValue;

  const methodValue = normalizeMethod(method);
  const statusValue = status === 'later' ? 'later' : 'lunas';

  const DUPLICATE_WINDOW_MS = 10000;
  const now = Date.now();
  const duplicate = store.readAll('confirmations').find((c) =>
    c.ownerId === codeItem.ownerId &&
    c.codeId === codeItem.id &&
    c.contactId === finalContactId &&
    c.contactName === contactName &&
    c.qty === qtyValue &&
    c.method === methodValue &&
    c.status === statusValue &&
    now - c.createdAt < DUPLICATE_WINDOW_MS
  );

  let newConfirmation = duplicate;
  let unpaidSettled = 0;

  if (!duplicate) {
    newConfirmation = store.insert('confirmations', {
      ownerId: codeItem.ownerId,
      codeId: codeItem.id,
      code: codeItem.code,
      label: codeItem.label,
      contactId: finalContactId,
      contactName,
      price,
      qty: qtyValue,
      amount: amountValue,
      method: methodValue,
      status: statusValue,
      validated: false,
      createdAt: now,
    });

    if (payOffUnpaid === '1' && finalContactId && statusValue === 'lunas') {
      store.readAll('confirmations').forEach((c) => {
        if (c.ownerId === codeItem.ownerId && c.label === codeItem.label && c.contactId === finalContactId && c.status === 'later') {
          unpaidSettled += Number(c.amount) || 0;
          store.update('confirmations', c.id, { status: 'lunas' });
        }
      });
    }
  }

  const grandTotal = amountValue + unpaidSettled;

  if (!duplicate) {
    const statusLabel = statusValue === 'later' ? 'Nanti' : 'Lunas';
    push.notifyAdmins(codeItem.ownerId, {
      title: 'Konfirmasi Bayar Baru',
      body: `${contactName} • ${codeItem.label} • Rp${grandTotal.toLocaleString('id-ID')} (${methodLabel(methodValue)}, ${statusLabel})`,
      url: `/admin/history?highlight=${newConfirmation.id}`,
    }).catch(() => {});
  }

  const waNumber = normalizeWaNumber(settings.waNumber || process.env.WA_NUMBER);
  let waUrl = null;
  if (waNumber) {
    const message = [
      'Konfirmasi Bayar',
      codeItem.label,
      `Nama: ${contactName}`,
      `Jumlah: ${qtyValue} x Rp${price.toLocaleString('id-ID')} = Rp${amountValue.toLocaleString('id-ID')}`,
      unpaidSettled > 0 ? `Tunggakan dilunasi: Rp${unpaidSettled.toLocaleString('id-ID')}` : null,
      unpaidSettled > 0 ? `Total dibayar: Rp${grandTotal.toLocaleString('id-ID')}` : null,
      `Metode: ${methodLabel(methodValue)}`,
      `Status: ${statusValue === 'later' ? 'Bayar Nanti' : 'Lunas'}`,
    ].filter(Boolean).join('\n');
    waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
  }

  res.render('public/confirm-success', {
    codeItem,
    contactName,
    qty: qtyValue,
    amount: amountValue,
    unpaidSettled,
    method: methodValue,
    status: statusValue,
    waUrl,
  });
});

module.exports = router;
