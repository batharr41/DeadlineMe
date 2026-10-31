#!/usr/bin/env node
/**
 * Guards GHSA-hqq3-7jhf-c5jx, GHSA-5x38-2vff-x55p, GHSA-jc66-7q78-782g,
 * GHSA-7wch-p9px-956x and GHSA-8hrf-8g6f-7xwp: node-forge < 1.4.1 is
 * vulnerable to several signature/validation bypass issues. The fixed version
 * is 1.4.1, and this repository pins that version.
 *
 * This test reads the committed lockfile (the source of truth for installs) and
 * fails if it resolves a vulnerable node-forge. It runs with plain Node and no
 * external dependencies, so it works in any environment.
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
  const [major, minor, patch] = parseVersion(v);
  // Vulnerable: < 1.4.1.
  return major > 1 || (major === 1 && (minor > 4 || (minor === 4 && patch >= 1)));
}

function main() {
  const lockfilePath = path.join(__dirname, '..', 'package-lock.json');
  const lockfile = JSON.parse(fs.readFileSync(lockfilePath, 'utf8'));
  const entry = lockfile.packages && lockfile.packages['node_modules/node-forge'];

  if (!entry || !entry.version) {
    console.error('FAIL: node-forge entry missing from package-lock.json');
    process.exit(1);
  }

  const version = entry.version;
  if (isFixedVersion(version)) {
    console.log(`OK: node-forge resolves to ${version} (>= 1.4.1, not vulnerable)`);
    return;
  }

  console.error(
    `FAIL: node-forge resolves to ${version}, which is vulnerable to ` +
      'signature/validation bypass (GHSA-hqq3-7jhf-c5jx, ' +
      'GHSA-5x38-2vff-x55p, GHSA-jc66-7q78-782g, GHSA-7wch-p9px-956x, ' +
      'GHSA-8hrf-8g6f-7xwp). Bump it to >= 1.4.1.'
  );
  process.exit(1);
}

main();
