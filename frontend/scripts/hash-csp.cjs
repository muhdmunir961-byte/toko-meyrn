// Compute SHA-256 hash of the inline theme bootstrap script in index.html
// for a strict (hash-based) Content-Security-Policy.
const fs = require('fs');
const crypto = require('crypto');

const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) {
  console.log('NO_INLINE_SCRIPT');
  process.exit(1);
}
const script = m[1];
const hash = crypto.createHash('sha256').update(script).digest('base64');
console.log('sha256-' + hash);
