import fs from 'node:fs';
import jwt from 'jsonwebtoken';

const KEY_ID = 'P2AVPA23A5';
const ISSUER_ID = 'abe9b631-ff19-4c29-82a6-995286613901';
const BUNDLE_ID = 'ru.uletnayaparkovka.app';

const privateKey = fs.readFileSync('./AuthKey_P2AVPA23A5.p8', 'utf8');
const token = jwt.sign(
  { iss: ISSUER_ID, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+1200, aud: 'appstoreconnect-v1' },
  privateKey, { algorithm: 'ES256', keyid: KEY_ID }
);

async function api(path) {
  const r = await fetch(`https://api.appstoreconnect.apple.com/v1${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) { console.error(path, r.status, await r.text()); return null; }
  return r.json();
}

const list = await api(`/bundleIds?filter[identifier]=${BUNDLE_ID}`);
const bid = list?.data?.[0];
if (!bid) { console.error('Bundle ID not found'); process.exit(1); }
console.log('Bundle ID:', bid.id, '|', bid.attributes.identifier, '|', bid.attributes.name);

const caps = await api(`/bundleIds/${bid.id}/bundleIdCapabilities`);
console.log('\nCapabilities:');
for (const c of caps?.data || []) {
  console.log(' -', c.attributes.capabilityType, c.attributes.settings ? JSON.stringify(c.attributes.settings) : '');
}

const profiles = await api(`/profiles?filter[name]=*${BUNDLE_ID}*&limit=20`);
console.log('\nProfiles:');
for (const p of profiles?.data || []) {
  console.log(' -', p.attributes.uuid, '|', p.attributes.name, '|', p.attributes.profileState, '|', p.attributes.profileType);
}
