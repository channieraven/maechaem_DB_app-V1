import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

import jwt from 'jsonwebtoken';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Database Setup (Simple JSON file) ---
const DB_FILE = path.join(__dirname, 'users.json');

// Helper to read/write DB
const getUsers = () => {
  if (!fs.existsSync(DB_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {
    return [];
  }
};

const saveUser = (user) => {
  const users = getUsers();
  const existingIndex = users.findIndex(u => u.email === user.email);
  if (existingIndex >= 0) {
    users[existingIndex] = { ...users[existingIndex], ...user };
  } else {
    users.push(user);
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
  return user;
};

const findUser = (email) => getUsers().find(u => u.email === email);

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
  secure: IS_PRODUCTION,       // false on localhost (http), true on production (https)
  sameSite: IS_PRODUCTION ? 'none' : 'lax',
  maxAge: 730 * 24 * 60 * 60 * 1000
};

// --- Auth Routes ---

// Helper: check if an email is in the ADMIN_EMAIL env var (comma-separated list)
const isAdminEmail = (email) => {
  const list = (process.env.ADMIN_EMAIL || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
};

// 1. Get Current User
app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.json({ user: null });

  try {
    const decoded = jwt.verify(token, SESSION_SECRET);
    // Refresh user data from DB to get latest role
    let user = findUser(decoded.email);
    
    if (!user) {
      // If user is missing from DB (e.g. server restart), restore from token
      console.log(`Restoring user ${decoded.email} from token after server restart`);
      user = {
        email: decoded.email,
        role: (decoded.role === 'admin' || isAdminEmail(decoded.email)) ? 'admin' : (decoded.role || 'pending'),
        name: decoded.name,
        picture: decoded.picture,
        fullName: decoded.fullName || '',
        position: decoded.position || '',
        affiliation: decoded.affiliation || '',
        createdAt: new Date().toISOString(), // Approximate
        lastLogin: new Date().toISOString()
      };
      saveUser(user);
    } else if (isAdminEmail(user.email) && user.role !== 'admin') {
      // Promote to admin if ADMIN_EMAIL is set and role hasn't been updated yet
      user = { ...user, role: 'admin' };
      saveUser(user);
    }

    res.json({ user });
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

// 4.5 Update Profile
app.put('/api/auth/profile', (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, SESSION_SECRET);
    const { fullName, position, affiliation } = req.body;
    
    const users = getUsers();
    const userIndex = users.findIndex(u => u.email === decoded.email);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update fields
    users[userIndex] = {
      ...users[userIndex],
      fullName: fullName || users[userIndex].fullName,
      position: position || users[userIndex].position,
      affiliation: affiliation || users[userIndex].affiliation
    };
    
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));

    // Update Token with new info
    const updatedUser = users[userIndex];
    const newToken = jwt.sign(
      { 
        email: updatedUser.email, 
        role: updatedUser.role, 
        name: updatedUser.name, 
        picture: updatedUser.picture,
        fullName: updatedUser.fullName,
        position: updatedUser.position,
        affiliation: updatedUser.affiliation
      },
      SESSION_SECRET,
      { expiresIn: '730d' }
    );

    res.cookie('auth_token', newToken, COOKIE_OPTIONS);

    res.json({ success: true, user: updatedUser });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. Admin: Get All Users
app.get('/api/admin/users', (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, SESSION_SECRET);
    const currentUser = findUser(decoded.email);
    
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const users = getUsers();
    // Return users without sensitive info if any (currently none, but good practice)
    res.json({ users });
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// 6. Admin: Update User Role
app.put('/api/admin/users/:email/role', (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, SESSION_SECRET);
    const currentUser = findUser(decoded.email);
    
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { email } = req.params;
    const { role } = req.body;

    if (!['pending', 'researcher', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prevent admin from demoting themselves
    if (email === decoded.email && role !== 'admin') {
      return res.status(400).json({ error: 'Admins cannot demote themselves' });
    }

    const users = getUsers();
    const userIndex = users.findIndex(u => u.email === email);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    users[userIndex].role = role;
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));

    res.json({ success: true, user: users[userIndex] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Vite Middleware (Dev) or Static Files (Prod) ---
if (process.env.NODE_ENV !== 'production') {
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
