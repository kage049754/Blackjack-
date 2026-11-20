#!/usr/bin/env node
/**
 * Assemble the web bundle Capacitor packages into the APK.
 *
 * The game is authored at the repo root so it can be opened directly in a
 * browser. Capacitor needs a single self-contained directory, so we copy the
 * runtime files into www/ and verify nothing external slipped in.
 *
 *   node scripts/build-www.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'www');

const FILES = ['index.html', 'manifest.webmanifest', 'sw.js'];
const DIRS = ['css', 'js', 'assets'];

function build() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  for (const f of FILES) {
    const src = path.join(ROOT, f);
    if (!fs.existsSync(src)) {
      console.error(`  ✗ missing required file: ${f}`);
      process.exit(1);
    }
    fs.copyFileSync(src, path.join(OUT, f));
  }

  for (const d of DIRS) {
    const src = path.join(ROOT, d);
    if (!fs.existsSync(src)) continue;
    fs.cpSync(src, path.join(OUT, d), { recursive: true });
  }
}

/** Fail loudly if anything would hit the network at runtime. */
function verifyOffline() {
  const offenders = [];
  const TEXT = /\.(html|css|js|webmanifest)$/i;

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(p); continue; }
      if (!TEXT.test(entry.name)) continue;

      const body = fs.readFileSync(p, 'utf8');
      const hits = body.match(/https?:\/\/[^\s"'`)<>]+/g) || [];
      for (const h of hits) {
        // XML namespaces and documentation links are not fetched.
        if (/^https?:\/\/www\.w3\.org/.test(h)) continue;
        if (/^https?:\/\/schemas\.android\.com/.test(h)) continue;
        offenders.push(`${path.relative(OUT, p)}  →  ${h}`);
      }
    }
  }

  walk(OUT);

  if (offenders.length) {
    console.error('\n  ✗ External references found — this build would need the network:');
    offenders.forEach((o) => console.error('      ' + o));
    process.exit(1);
  }
}

function report() {
  let bytes = 0;
  let count = 0;
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(p); continue; }
      bytes += fs.statSync(p).size;
      count++;
    }
  }
  walk(OUT);
  return { bytes, count };
}

/**
 * Every file the service worker precaches must actually exist, or the offline
 * install silently fails on a device.
 */
function verifyPrecache() {
  const sw = fs.readFileSync(path.join(OUT, 'sw.js'), 'utf8');
  const block = sw.slice(sw.indexOf('const PRECACHE'), sw.indexOf('];', sw.indexOf('const PRECACHE')));
  const entries = [...block.matchAll(/'(\.\/[^']*)'/g)].map((m) => m[1]);

  const missing = entries.filter((e) => {
    const rel = e.replace(/^\.\//, '');
    if (rel === '') return !fs.existsSync(path.join(OUT, 'index.html'));
    return !fs.existsSync(path.join(OUT, rel));
  });

  if (missing.length) {
    console.error('\n  \u2717 service worker precaches files that do not exist:');
    missing.forEach((m) => console.error('      ' + m));
    process.exit(1);
  }
  console.log(`  \u2713 precache manifest valid \u2014 ${entries.length} entries`);
}

build();
verifyOffline();
verifyPrecache();
const { bytes, count } = report();

console.log(`  ✓ www/ built — ${count} files, ${(bytes / 1024).toFixed(0)} KB`);
console.log('  ✓ offline check passed — zero external references');
