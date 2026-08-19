const express = require('express');

const router = express.Router();

router.get('/login', (req, res) => {
  res.render('login', { error: null, next: req.query.next || '/admin' });
});

router.post('/login', (req, res) => {
  const { password, next } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect(next || '/admin');
  }
  res.render('login', { error: 'Password salah', next: next || '/admin' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
