'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// --- Password Helpers ---
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, stored) => {
  const colonIndex = stored.indexOf(':');
  if (colonIndex === -1) return false;
  const salt = stored.slice(0, colonIndex);
  const hash = stored.slice(colonIndex + 1);
  if (!salt || !hash) return false;
  try {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch {
    return false;
  }
};

// --- Google Apps Script (Sheets) Helpers ---
const APPSCRIPT_URL = process.env.VITE_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzT0rZVvpzQ-WGp9XYvuxxYZvHXe-_Omcu5nvyYn6mpe8Fo6YLpIkktu5UqJXyR0MUX/exec';

/** Fetch all rows from the given sheet via GAS */
const gasGetSheet = async (sheet) => {
  const res = await fetch(`${APPSCRIPT_URL}?sheet=${encodeURIComponent(sheet)}`);
  if (!res.ok) throw new Error(`GAS GET error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.data ?? []);
};

/** POST an action payload to GAS — uses text/plain to avoid CORS preflight */
const gasPost = async (payload) => {
  const res = await fetch(APPSCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`GAS POST error: ${res.status}`);
  return res.json();
};

/** Find a single user by email from the users sheet */
const gasFindUser = async (email) => {
  const users = await gasGetSheet('users');
  return users.find(u => u.email === email) ?? null;
};

// --- App Setup ---
const app = express();
const PORT = process.env.PORT || 8080;

app.set('trust proxy', true);
app.use(express.json());
app.use(cookieParser());

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET environment variable is not set. Server will not start.');
  process.exit(1);
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: IS_PRODUCTION ? 'none' : 'lax',
  maxAge: 730 * 24 * 60 * 60 * 1000
};

// --- Rate Limiters ---
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const apiLimiter  = rateLimit({ windowMs:  1 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

const VALID_ROLES = ['pending', 'researcher', 'admin', 'staff', 'executive', 'external'];

// --- Helpers ---
const isAdminEmail = (email) => {
  const list = (process.env.ADMIN_EMAIL || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
};

// --- Auth Routes ---

// 1. Register
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { fullname, email, password, position, organization } = req.body;

  if (!fullname || !email || !password || !position || !organization) {
    return res.status(400).json({ success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  try {
    const existing = await gasFindUser(email);
    if (existing) {
      return res.status(409).json({ success: false, error: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    const result = await gasPost({
      action: 'register',
      email,
      fullname,
      password_hash: hashPassword(password),
      position,
      organization,
      role: isAdminEmail(email) ? 'admin' : 'pending',
    });

    if (result && result.success === false) {
      return res.status(400).json({ success: false, error: result.error || 'สมัครสมาชิกไม่สำเร็จ' });
    }

    res.json({ success: true, message: 'สมัครสมาชิกสำเร็จ กรุณารอการอนุมัติ' });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
  }
});

// 2. Login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'กรุณากรอกอีเมลและรหัสผ่าน' });
  }

  try {
    const user = await gasFindUser(email);
    const storedHash = user?.password_hash || user?.password;
    if (!user || !storedHash || !verifyPassword(password, storedHash)) {
      return res.status(401).json({ success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    if (isAdminEmail(email) && user.role !== 'admin') {
      user.role = 'admin';
      await gasPost({ action: 'updateUserRole', username: email, role: 'admin' }).catch(console.error);
    }

    const token = jwt.sign(
      {
        email: user.email,
        role: user.role,
        name: user.name || user.fullname,
        picture: user.picture || '',
        fullName: user.fullName || user.fullname || '',
        position: user.position || '',
        affiliation: user.affiliation || user.organization || '',
      },
      SESSION_SECRET,
      { expiresIn: '730d' }
    );

    res.cookie('auth_token', token, COOKIE_OPTIONS);

    const { password: _p, password_hash: _ph, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
  }
});

// 3. Get Current User
app.get('/api/auth/me', apiLimiter, async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.json({ user: null });

  try {
    const decoded = jwt.verify(token, SESSION_SECRET);

    try {
      const user = await gasFindUser(decoded.email);
      if (user) {
        if (isAdminEmail(user.email) && user.role !== 'admin') {
          user.role = 'admin';
          await gasPost({ action: 'updateUserRole', username: user.email, role: 'admin' }).catch(console.error);
        }
        const { password: _p, password_hash: _ph, ...userWithoutPassword } = user;
        return res.json({ user: userWithoutPassword });
      }
    } catch (gasError) {
      console.warn('GAS unavailable for /api/auth/me, using JWT data:', gasError.message);
    }

    res.json({
      user: {
        email: decoded.email,
        role: isAdminEmail(decoded.email) ? 'admin' : (decoded.role || 'pending'),
        name: decoded.name,
        picture: decoded.picture,
        fullName: decoded.fullName || '',
        position: decoded.position || '',
        affiliation: decoded.affiliation || '',
      }
    });
  } catch (e) {
    console.error('Token verification failed:', e.message);
    res.clearCookie('auth_token');
    res.json({ user: null });
  }
});

// 4. Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

// 5. Update Profile
app.put('/api/auth/profile', apiLimiter, async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, SESSION_SECRET);
    const { fullName, position, affiliation } = req.body;

    await gasPost({
      action: 'updateUser',
      username: decoded.email,
      fullName: fullName || decoded.fullName || '',
      position: position || decoded.position || '',
      affiliation: affiliation || decoded.affiliation || '',
    });

    const newToken = jwt.sign(
      {
        email: decoded.email,
        role: decoded.role,
        name: decoded.name,
        picture: decoded.picture,
        fullName: fullName || decoded.fullName || '',
        position: position || decoded.position || '',
        affiliation: affiliation || decoded.affiliation || '',
      },
      SESSION_SECRET,
      { expiresIn: '730d' }
    );

    res.cookie('auth_token', newToken, COOKIE_OPTIONS);
    res.json({ success: true });
  } catch (e) {
    console.error('Profile update error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. Admin: Get All Users
app.get('/api/admin/users', apiLimiter, async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, SESSION_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const users = await gasGetSheet('users');
    const sanitized = users.map(({ password: _p, password_hash: _ph, ...u }) => u);
    res.json({ users: sanitized });
  } catch (e) {
    console.error('Get users error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 7. Admin: Update User Role
app.put('/api/admin/users/:email/role', apiLimiter, async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, SESSION_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { email } = req.params;
    const { role } = req.body;

    if (!['pending', 'researcher', 'admin', 'staff', 'executive', 'external'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (email === decoded.email && role !== 'admin') {
      return res.status(400).json({ error: 'Admins cannot demote themselves' });
    }

    const result = await gasPost({ action: 'updateUserRole', username: email, role });
    if (result && result.success === false) {
      return res.status(400).json({ error: result.error || 'Failed to update role' });
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Update role error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Vite Dev Middleware (Dev) or Static Files (Prod) ---
(async () => {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
})();

