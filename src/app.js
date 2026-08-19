require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const confirmRoutes = require('./routes/confirm');
const legalRoutes = require('./routes/legal');
const { formatRupiah } = require('./lib/format');

const app = express();
const assetVersion = String(Date.now());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  res.locals.formatRupiah = formatRupiah;
  res.locals.assetVersion = assetVersion;
  next();
});
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'kasku-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 12 },
  })
);

app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/confirm', confirmRoutes);
app.use('/legal', legalRoutes);

app.get('/', (req, res) => res.redirect('/admin'));

app.use((req, res) => {
  res.status(404).render('error', { message: 'Halaman tidak ditemukan.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { message: 'Terjadi kesalahan. Silakan coba lagi atau hubungi admin.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Kasku berjalan di http://localhost:${PORT}`);
});
