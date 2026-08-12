const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    req.isAdmin = !!payload.isAdmin;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Недействительный или истёкший токен' });
  }
}

function adminRequired(req, res, next) {
  if (!req.isAdmin) {
    return res.status(403).json({ error: 'Требуются права администратора' });
  }
  next();
}

module.exports = { authRequired, adminRequired };
