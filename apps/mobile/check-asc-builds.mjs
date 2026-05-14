import fs from 'node:fs';
import jwt from 'jsonwebtoken';

const KEY_ID = 'P2AVPA23A5';
const ISSUER_ID = 'abe9b631-ff19-4c29-82a6-995286613901';
const APP_ID = '6767523063'; // App Store Connect numeric App ID

const privateKey = fs.readFileSync('./AuthKey_P2AVPA23A5.p8', 'utf8');
const token = jwt.sign(
  { iss: ISSUER_ID, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+1200, aud: 'appstoreconnect-v1' },
  privateKey, { algorithm: 'ES256', keyid: KEY_ID }
);

async function api(path) {
  const r = await fetch(`https://api.appstoreconnect.apple.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) { console.error(path, r.status, (await r.text()).slice(0, 500)); return null; }
  return r.json();
}

// 1. App info
const app = await api(`/apps/${APP_ID}`);
console.log('App:', app?.data?.attributes?.name, '|', app?.data?.attributes?.bundleId);

// 2. All builds (last 20)
const builds = await api(`/builds?filter[app]=${APP_ID}&sort=-uploadedDate&limit=20&include=preReleaseVersion`);
console.log(`\nBuilds (${builds?.data?.length ?? 0}):`);
const versions = {};
for (const inc of builds?.included ?? []) {
  if (inc.type === 'preReleaseVersions') versions[inc.id] = inc.attributes.version;
}
for (const b of builds?.data ?? []) {
  const v = versions[b.relationships?.preReleaseVersion?.data?.id] || '?';
  const a = b.attributes;
  console.log(`  v${v} build #${a.version} | ${a.processingState} | uploaded ${a.uploadedDate} | expired:${a.expired}`);
}

// 3. App Store version (for submit-for-review)
const v = await api(`/apps/${APP_ID}/appStoreVersions?limit=5`);
console.log(`\nApp Store Versions:`);
for (const ver of v?.data ?? []) {
  console.log(`  v${ver.attributes.versionString} | state=${ver.attributes.appStoreState} | platform=${ver.attributes.platform}`);
}
