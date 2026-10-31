#!/usr/bin/env node
/**
 * Guards GHSA-qr28-fpjm-wq7f: decode-uri-component <= 0.2.2 is vulnerable to
 * Regular Expression Denial of Service (ReDoS). The fixed versions start at
 * 0.2.3, and this repository pins 0.5.1.
 *
 * This test reads the committed lockfile (the source of truth for installs) and
 * fails if it resolves a vulnerable decode-uri-component. It runs with plain
 * Node and no external dependencies, so it works in any environment.
 */
'use strict';

const fs = require('fs');
const path = require('path');

function parseVersion(v) {
  const parts = String(v).split('.').map((p) => parseInt(p, 10));
  while (parts.length < 3) parts.push(0);
  return parts;
}

function isFixedVersion(v) {
  const [major, minor] = parseVersion(v);
  // Vulnerable: < 0.2.3 (0.2.2 and below per GHSA-qr28-fpjm-wq7f).
  return major > 0 || (major === 0 && minor >= 3);
}

function main() {
  const lockfilePath = path.join(__dirname, '..', 'package-lock.json');
  const lockfile = JSON.parse(fs.readFileSync(lockfilePath, 'utf8'));
  const entry = lockfile.packages && lockfile.packages['node_modules/decode-uri-component'];

  if (!entry || !entry.version) {
    console.error('FAIL: decode-uri-component entry missing from package-lock.json');
    process.exit(1);
  }

  const version = entry.version;
  if (isFixedVersion(version)) {
    console.log(`OK: decode-uri-component resolves to ${version} (>= 0.2.3, not vulnerable)`);
    return;
  }

  console.error(
    `FAIL: decode-uri-component resolves to ${version}, which is vulnerable ` +
      'to ReDoS (GHSA-qr28-fpjm-wq7f). Bump it to >= 0.2.3.'
  );
  process.exit(1);
}

main();
