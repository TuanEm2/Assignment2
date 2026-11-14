// Local setup only. Never prints a secret or replaces a valid signing key.
const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { randomBytes } = require('node:crypto');
const { parseEnv } = require('node:util');

const valid = value => typeof value === 'string' && value.trim() && Buffer.byteLength(value, 'utf8') >= 32;
if (process.env.JWT_SECRET !== undefined) {
  if (!valid(process.env.JWT_SECRET)) throw new Error('JWT_SECRET in this terminal is invalid. Fix/remove that override before starting Auth.');
  console.log('Using JWT_SECRET supplied by the terminal; no file changed.');
} else {
  const file = resolve(__dirname, '../../../.env');
  if (!existsSync(file)) throw new Error('Create the root .env from .env.example and configure DATABASE_URL first.');
  const text = readFileSync(file, 'utf8');
  if (valid(parseEnv(text).JWT_SECRET)) {
    console.log('Existing local JWT_SECRET retained; no file changed.');
  } else {
    const lines = text.split(/\r?\n/).filter(line => !/^\s*JWT_SECRET\s*=/.test(line));
    lines.push(`JWT_SECRET=${randomBytes(32).toString('hex')}`);
    writeFileSync(file, `${lines.join('\n').replace(/\n+$/, '')}\n`, { mode: 0o600 });
    console.log('Created a local JWT_SECRET. Keep .env private and untracked.');
  }
}
