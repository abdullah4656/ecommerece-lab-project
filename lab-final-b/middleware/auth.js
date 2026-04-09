function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/auth/signin');
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/admin/signin');
  }

  if (req.session.userRole !== 'Admin' && req.session.userRole !== 'Manager') {
    return res.status(403).render('404', {
      title: 'Access Denied | ScoopCraft'
    });
  }

  next();
}

function loadCurrentUser(req, res, next) {
  res.locals.currentUser = req.session.currentUser || null;
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  loadCurrentUser
};