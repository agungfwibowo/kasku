const express = require('express');
const { verifyPassword, findAdminByUsername } = require('../lib/auth');

const router = express.Router();

router.get('/login', (req, res) => {
  res.render('login', { error: null, next: req.query.next || '/admin' });
});

router.post('/login', (req, res) => {
  const { username, password, next } = req.body;
  const admin = findAdminByUsername((username || '').trim());
  if (admin && verifyPassword(password, admin.salt, admin.hash)) {
    req.session.adminId = admin.id;
    return res.redirect(next || '/admin');
  }
  res.render('login', { error: 'Username atau password salah', next: next || '/admin' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
