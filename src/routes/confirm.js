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
    .filter((c) => c.label === codeItem.label && c.contactId === contactId && c.status === 'later')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  res.json({ amount });
});

router.get('/:code', (req, res) => {
  const codeItem = findCodeWithProduct(req.params.code);
  if (!codeItem) return res.status(404).render('public/not-found');
  const contacts = store.readAll('contacts').sort((a, b) => a.name.localeCompare(b.name));
  const settings = store.readObject('settings');
  res.render('public/confirm', { codeItem, contacts, error: null, qty: 1, settings });
});

router.post('/:code', (req, res) => {
  const codeItem = findCodeWithProduct(req.params.code);
  if (!codeItem) return res.status(404).render('public/not-found');

  const { contactId, newContactName, qty, method, status, payOffUnpaid } = req.body;
  const contacts = store.readAll('contacts').sort((a, b) => a.name.localeCompare(b.name));
  const settings = store.readObject('settings');

  let contactName = '';
  let finalContactId = contactId || null;

  if (contactId) {
    const contact = store.findById('contacts', contactId);
    contactName = contact ? contact.name : '';
  } else if (newContactName && newContactName.trim()) {
    const created = store.insert('contacts', { name: newContactName.trim() });
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

  const newConfirmation = store.insert('confirmations', {
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
    createdAt: Date.now(),
  });

  let unpaidSettled = 0;
  if (payOffUnpaid === '1' && finalContactId && statusValue === 'lunas') {
    store.readAll('confirmations').forEach((c) => {
      if (c.label === codeItem.label && c.contactId === finalContactId && c.status === 'later') {
        unpaidSettled += Number(c.amount) || 0;
        store.update('confirmations', c.id, { status: 'lunas' });
      }
    });
  }

  const grandTotal = amountValue + unpaidSettled;

  push.notifyAdmins({
    title: 'Konfirmasi Bayar Baru',
    body: `${contactName} — ${codeItem.label} — Rp${grandTotal.toLocaleString('id-ID')} (${methodLabel(methodValue)})`,
    url: `/admin/history?highlight=${newConfirmation.id}`,
  }).catch(() => {});

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
