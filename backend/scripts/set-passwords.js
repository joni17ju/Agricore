/**
 * Give the seeded demo accounts real bcrypt password hashes.
 *
 * The seed data carries DEV_SEED_PLACEHOLDER_HASH_NOT_REAL, which login
 * deliberately refuses. This replaces those placeholders with a real hash so
 * the existing demo accounts work against real authentication.
 *
 * Usage:
 *   node scripts/set-passwords.js                       all placeholder accounts → default password
 *   node scripts/set-passwords.js --password "secret1234"
 *   node scripts/set-passwords.js --email juan.delacruz@dorsu.edu.ph --password "secret1234"
 *   node scripts/set-passwords.js --all                 rehash every account, not only placeholders
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/index.js';

const PLACEHOLDER_HASH = 'DEV_SEED_PLACEHOLDER_HASH_NOT_REAL';
const DEFAULT_PASSWORD = 'agricore123';
const SALT_ROUNDS = 10;

const arg = (name, fallback = null) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
};

const password = arg('password', DEFAULT_PASSWORD);
const email = arg('email');
const rehashAll = process.argv.includes('--all');

if (String(password).length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

const filter = email
  ? { email: String(email).trim().toLowerCase() }
  : rehashAll
    ? {}
    : { passwordHash: PLACEHOLDER_HASH };

const users = await User.find(filter).select('email role passwordHash');
if (users.length === 0) {
  console.log('No matching accounts — nothing to do.');
  await mongoose.disconnect();
  process.exit(0);
}

// One hash reused across accounts: this is demo data, and bcrypt is slow by design.
const hash = await bcrypt.hash(String(password), SALT_ROUNDS);
const result = await User.updateMany(filter, { $set: { passwordHash: hash } });

console.log(`Set password for ${result.modifiedCount} account(s):`);
for (const user of users.slice(0, 10)) console.log(`  ${user.role.padEnd(11)} ${user.email}`);
if (users.length > 10) console.log(`  …and ${users.length - 10} more`);
console.log(`\nPassword: ${password}`);

const remaining = await User.countDocuments({ passwordHash: PLACEHOLDER_HASH });
console.log(`Accounts still on the placeholder hash: ${remaining}`);

await mongoose.disconnect();
