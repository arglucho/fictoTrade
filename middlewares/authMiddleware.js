// middlewares/authMiddleware.js
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'Tenés que iniciar sesión para acceder a esa página.');
  res.redirect('/auth');
}

module.exports = ensureAuthenticated;
