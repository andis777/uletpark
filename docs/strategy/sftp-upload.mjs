// Upload static landing to Beget hosting via SFTP
// Usage: node sftp-upload.mjs <local-file> <remote-path>
import Client from "ssh2-sftp-client";
import { argv, exit } from "node:process";

const [, , local = "/tmp/uletnaya-www/index.html", remote = "/uletnayaparkovka.ru/public_html/index.html"] = argv;

const sftp = new Client();

try {
  await sftp.connect({
    host: "37.140.192.179",
    port: 22,
    username: "u0241430",
    password: "Vk9Dmp7z8ah9YFAO",
    readyTimeout: 20000,
  });
  console.log("✓ Connected");

  // List home dir to find right path
  const home = await sftp.list("/");
  console.log("Root dir:", home.slice(0, 20).map(f => `${f.type}${f.name}`).join("  "));

  // Try multiple common Beget paths
  const candidates = [
    "/uletnayaparkovka.ru/public_html/",
    "/var/www/u0241430/data/www/uletnayaparkovka.ru/",
    "/home/u0241430/uletnayaparkovka.ru/public_html/",
    "/uletnayaparkovka.ru/www/",
  ];

  let foundPath = null;
  for (const p of candidates) {
    try {
      const lst = await sftp.list(p);
      foundPath = p;
      console.log(`✓ Found webroot at ${p} — ${lst.length} entries`);
      console.log("  Existing files:", lst.slice(0, 10).map(f => f.name).join(", "));
      break;
    } catch { /* keep trying */ }
  }

  if (!foundPath) {
    console.log("✗ Could not find webroot. Listing top-level dirs:");
    for (const f of home) {
      console.log(" ", f.type, f.name);
      if (f.type === "d") {
        try {
          const sub = await sftp.list("/" + f.name);
          console.log("    →", sub.slice(0, 8).map(s => `${s.type}${s.name}`).join("  "));
        } catch {}
      }
    }
    process.exit(1);
  }

  // Backup existing index.html if present
  try {
    await sftp.rename(foundPath + "index.html", foundPath + `index.html.bak-${Date.now()}`);
    console.log("✓ Backup of old index.html created");
  } catch {
    console.log("ℹ No existing index.html to backup");
  }

  // Upload
  const remoteFile = foundPath + "index.html";
  await sftp.put(local, remoteFile);
  console.log(`✓ Uploaded ${local} → ${remoteFile}`);

  // Set permissions
  await sftp.chmod(remoteFile, 0o644);
  console.log("✓ Permissions set 644");

  // Verify
  const stat = await sftp.stat(remoteFile);
  console.log(`✓ Verified: ${stat.size} bytes uploaded`);

} catch (e) {
  console.error("✗ FAILED:", e.message);
  exit(1);
} finally {
  await sftp.end();
}
