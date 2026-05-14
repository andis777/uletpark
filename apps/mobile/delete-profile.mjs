// Delete an Apple provisioning profile via App Store Connect API
// Usage: node delete-profile.mjs T3K8V6UU2W
import fs from 'node:fs';
import jwt from 'jsonwebtoken';

const KEY_ID = 'P2AVPA23A5';
const ISSUER_ID = 'abe9b631-ff19-4c29-82a6-995286613901';
const KEY_PATH = './AuthKey_P2AVPA23A5.p8';
const profileId = process.argv[2];

if (!profileId) {
  console.error('Usage: node delete-profile.mjs <PROFILE_ID>');
  process.exit(1);
}

const privateKey = fs.readFileSync(KEY_PATH, 'utf8');
const token = jwt.sign(
  {
    iss: ISSUER_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 1200,
    aud: 'appstoreconnect-v1',
  },
  privateKey,
  { algorithm: 'ES256', keyid: KEY_ID }
);

const res = await fetch(`https://api.appstoreconnect.apple.com/v1/profiles/${profileId}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` },
});
console.log(`Status: ${res.status} ${res.statusText}`);
if (res.status !== 204 && res.status !== 200) {
  console.log(await res.text());
  process.exit(1);
}
console.log('Profile deleted.');
