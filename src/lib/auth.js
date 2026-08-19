function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
}

module.exports = { requireAdmin };
