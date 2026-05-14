// Download Android keystore from EAS via GraphQL API
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ID = '6efb0108-5626-49b8-8ace-f852d3b292ad';
const PROJECT_SLUG = '@djbuba/uletnaya-parkovka';
const APP_ID = PROJECT_ID;

const state = JSON.parse(fs.readFileSync(path.join(process.env.USERPROFILE || process.env.HOME, '.expo', 'state.json'), 'utf8'));
const sessionInfo = JSON.parse(state.auth.sessionSecret);
const sessionId = sessionInfo.id;

console.log('Session ID:', sessionId);

async function gql(query, variables) {
  const r = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Expo-Session': state.auth.sessionSecret,
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await r.json();
  if (data.errors) {
    console.error(JSON.stringify(data.errors, null, 2));
    throw new Error('GraphQL error');
  }
  return data.data;
}

// Find the keystore for this app
const query = `
  query GetKeystore($appId: String!) {
    app {
      byId(appId: $appId) {
        id
        slug
        androidAppCredentials {
          id
          applicationIdentifier
          isLegacy
          androidAppBuildCredentialsList {
            id
            name
            isDefault
            androidKeystore {
              id
              type
              keystore
              keystorePassword
              keyAlias
              keyPassword
              md5CertificateFingerprint
              sha1CertificateFingerprint
              sha256CertificateFingerprint
              createdAt
            }
          }
        }
      }
    }
  }
`;

const data = await gql(query, { appId: APP_ID });
const credList = data.app.byId.androidAppCredentials;
console.log(`Found ${credList.length} Android app credentials`);

for (const cred of credList) {
  console.log(`\nApp ID: ${cred.applicationIdentifier}`);
  for (const bc of cred.androidAppBuildCredentialsList) {
    console.log(`  Build Credentials: ${bc.name} ${bc.isDefault ? '(default)' : ''}`);
    if (bc.androidKeystore) {
      const ks = bc.androidKeystore;
      const ksPath = `./keystore-${bc.name.replace(/[^a-zA-Z0-9]/g, '_')}.jks`;
      fs.writeFileSync(ksPath, Buffer.from(ks.keystore, 'base64'));
      console.log(`    Keystore saved: ${path.resolve(ksPath)}`);
      console.log(`    Alias:             ${ks.keyAlias}`);
      console.log(`    Keystore password: ${ks.keystorePassword}`);
      console.log(`    Key password:      ${ks.keyPassword}`);
      console.log(`    SHA1:   ${ks.sha1CertificateFingerprint}`);
      console.log(`    SHA256: ${ks.sha256CertificateFingerprint}`);
    }
  }
}
