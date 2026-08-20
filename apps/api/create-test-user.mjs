import fs from 'fs';
import path from 'path';
import bcryptjs from 'bcryptjs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data', 'app.db.json');

// Ensure data dir exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Read or create DB
let db = { users: [] };
if (fs.existsSync(dbPath)) {
  db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

// Create user
const email = 'admin@localhost';
const password = 'admin1234';
const role = 'admin';

const hashedPassword = bcryptjs.hashSync(password, 10);

// Remove if exists
db.users = db.users.filter(u => u.username !== email);

// Add new user
db.users.push({
  username: email,
  passwordHash: hashedPassword,
  displayName: 'Admin',
  role: role
});

// Save
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log(`✅ User erstellt: ${email}`);
console.log(`   Passwort: ${password}`);
console.log(`   Rolle: ${role}`);
console.log(`   DB: ${dbPath}`);
