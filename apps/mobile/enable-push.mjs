import fs from 'node:fs';
import jwt from 'jsonwebtoken';

const KEY_ID = 'P2AVPA23A5';
const ISSUER_ID = 'abe9b631-ff19-4c29-82a6-995286613901';
const BUNDLE_ID_NUMERIC = 'D2TVZPJLZ7'; // Apple ID for ru.uletnayaparkovka.app

const privateKey = fs.readFileSync('./AuthKey_P2AVPA23A5.p8', 'utf8');
const token = jwt.sign(
  { iss: ISSUER_ID, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+1200, aud: 'appstoreconnect-v1' },
  privateKey, { algorithm: 'ES256', keyid: KEY_ID }
);

const body = {
  data: {
    type: 'bundleIdCapabilities',
    attributes: { capabilityType: 'PUSH_NOTIFICATIONS' },
    relationships: { bundleId: { data: { type: 'bundleIds', id: BUNDLE_ID_NUMERIC } } },
  },
};

const r = await fetch('https://api.appstoreconnect.apple.com/v1/bundleIdCapabilities', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
console.log('Status:', r.status);
console.log(await r.text());
