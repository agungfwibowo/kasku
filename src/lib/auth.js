const crypto = require('crypto');
const store = require('./store');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const check = crypto.scryptSync(password || '', salt, 64).toString('hex');
  const a = Buffer.from(check, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function findAdminByUsername(username) {
  return store.readAll('admins').find((a) => a.username === username);
}

function requireAdmin(req, res, next) {
  const adminId = req.session && req.session.adminId;
  const admin = adminId && store.findById('admins', adminId);
  if (admin) {
    req.ownerId = admin.id;
    res.locals.currentAdmin = admin;
    return next();
  }
  return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
}

module.exports = { requireAdmin, hashPassword, verifyPassword, findAdminByUsername };
