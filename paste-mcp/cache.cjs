'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const SOURCE = 'https://devcraftxcoder.github.io/Prompt-Library/prompts.json';
const TTL_MS = 5 * 60 * 1000;
const DISK_DIR = path.join(os.homedir(), '.claude', 'cache', 'paste');
const DISK_PATH = path.join(DISK_DIR, 'prompts.json');
const META_PATH = path.join(DISK_DIR, 'meta.json');

// In-repo fallback: prompts.json lives one level up from paste-mcp/.
// This stays in sync automatically when the plugin is installed via git clone.
const REPO_PROMPTS_PATH = path.join(__dirname, '..', 'prompts.json');
// Optional bundled fallback (generated at install time, gitignored).
const LOCAL_PROMPTS_PATH = path.join(__dirname, 'prompts.local.json');

let _cache = null;
let _ts = 0;
let _etag = null;
let _lastModified = null;

function loadMeta() {
  try {
    const m = JSON.parse(fs.readFileSync(META_PATH, 'utf8'));
    _etag = m.etag || null;
    _lastModified = m.lastModified || null;
  } catch {}
}

function saveMeta() {
  try {
    fs.mkdirSync(DISK_DIR, { recursive: true });
    fs.writeFileSync(META_PATH, JSON.stringify({ etag: _etag, lastModified: _lastModified }));
  } catch {}
}

function loadJsonArray(p) {
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(data) && data.length ? data : null;
  } catch {
    return null;
  }
}

function loadDisk() {
  return loadJsonArray(DISK_PATH);
}

// Fallback chain (offline / fetch failure): disk cache → in-repo prompts.json → bundled local copy.
function loadFallback() {
  return loadDisk() || loadJsonArray(REPO_PROMPTS_PATH) || loadJsonArray(LOCAL_PROMPTS_PATH);
}

function saveDisk(data) {
  try {
    fs.mkdirSync(DISK_DIR, { recursive: true });
    fs.writeFileSync(DISK_PATH, JSON.stringify(data));
  } catch {}
}

async function get() {
  if (_cache && Date.now() - _ts < TTL_MS) return _cache;

  if (!_etag && !_lastModified) loadMeta();

  const headers = {};
  if (_etag) headers['If-None-Match'] = _etag;
  else if (_lastModified) headers['If-Modified-Since'] = _lastModified;

  try {
    const res = await fetch(SOURCE, { headers });

    if (res.status === 304) {
      if (!_cache) _cache = loadFallback();
      _ts = Date.now();
      return _cache;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data) || !data.length) throw new Error('Empty or malformed prompts payload');
    _cache = data;
    _ts = Date.now();
    _etag = res.headers.get('ETag') || null;
    _lastModified = res.headers.get('Last-Modified') || null;
    saveMeta();
    saveDisk(data);
  } catch (err) {
    if (_cache) return _cache;
    _cache = loadFallback();
    if (_cache) { _ts = Date.now(); return _cache; }
    throw new Error(`Failed to fetch prompts and no local fallback available: ${err.message}`);
  }

  return _cache;
}

function invalidate() {
  _cache = null;
  _ts = 0;
}

module.exports = { get, invalidate };
