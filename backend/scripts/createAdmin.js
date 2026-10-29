// Creates a librarian account from the command line (the only way to get an admin).
// Usage: npm run create-admin
require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
let muted = false;
rl._writeToOutput = (s) => { if (!muted) rl.output.write(s); else if (s.includes('\n')) rl.output.write('\n'); };
const ask = (q, hide) => new Promise((r) => { rl.question(q, (a) => { muted = false; r(a.trim()); }); muted = !!hide; });

(async () => {
  await connectDB();
  const name = await ask('Librarian name: ');
  const email = (await ask('Email: ')).toLowerCase();
  const pw = await ask('Password (min 10 chars, hidden): ', true);
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || pw.length < 10) { console.error('Invalid input. Password must be at least 10 characters.'); process.exit(1); }
  if (await User.exists({ email })) { console.error('That email is already registered.'); process.exit(1); }
  await User.create({ name, email, password: await bcrypt.hash(pw, 12), role: 'librarian' });
  console.log('Librarian created. Log in at /admin/login.html');
  rl.close(); await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
