const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const APPSCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwZhTL7sfV4KCPFUZTGOS1BsMKHKu3FaQJQzkgHg7vAghAQ6ORcmNsK46E8z2G2nCsL/exec';

app.get('/', (req, res) => {
  res.send('Proxy server is running');
});

app.post('/register', async (req, res) => {
  try {
    console.log('Register request:', req.body);
    const response = await fetch(APPSCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', ...req.body })
    });
    console.log('Apps Script response status:', response.status);
    const text = await response.text();
    console.log('Apps Script response text:', text);
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr);
      return res.status(500).json({ success: false, error: 'Invalid JSON from Apps Script', raw: text });
    }
    res.json(data);
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    console.log('Login request:', req.body);
    const response = await fetch(APPSCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', ...req.body })
    });
    console.log('Apps Script response status:', response.status);
    const text = await response.text();
    console.log('Apps Script response text:', text);
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr);
      return res.status(500).json({ success: false, error: 'Invalid JSON from Apps Script', raw: text });
    }
    res.json(data);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/updateProfile', async (req, res) => {
  try {
    // เช็ค payload
    const { username, email, fullName, position, affiliation } = req.body;
    if (!username && !email) {
      return res.status(400).json({ success: false, error: 'Missing username or email' });
    }
    if (!fullName || !position || !affiliation) {
      return res.status(400).json({ success: false, error: 'Missing profile fields' });
    }
    console.log('Update profile request:', req.body);
    const response = await fetch(APPSCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateUser', ...req.body })
    });
    console.log('Apps Script response status:', response.status);
    const text = await response.text();
    console.log('Apps Script response text:', text);
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr);
      return res.status(500).json({ success: false, error: 'Invalid JSON from Apps Script', raw: text });
    }
    res.json(data);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/getUser', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Missing email' });
    const response = await fetch(APPSCRIPT_URL + '?sheet=users', {
      method: 'GET'
    });
    const sheetData = await response.json();
    if (!sheetData.success || !sheetData.data) {
      return res.status(500).json({ success: false, error: 'Failed to fetch users from Sheets' });
    }
    const user = sheetData.data.find(u => u.email === email);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3001, () => {
  console.log('Proxy server running on http://localhost:3001');
});
