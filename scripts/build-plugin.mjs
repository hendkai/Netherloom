import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const name = "netherloom";
const version = pkg.version;
const stageRoot = path.join(root, "build/i2p-plugin");
const pluginDir = path.join(stageRoot, name);
const archiveDir = path.join(root, "dist-plugin");
const archiveName = `${name}-${version}-dev.xpi2p`;
const archivePath = path.join(archiveDir, archiveName);
const signer = "netherloom-dev";

await rm(stageRoot, { recursive: true, force: true });
await rm(archiveDir, { recursive: true, force: true });
await mkdir(path.join(pluginDir, "lib"), { recursive: true });
await mkdir(path.join(pluginDir, "webapp"), { recursive: true });
await mkdir(path.join(pluginDir, "licenses"), { recursive: true });
await mkdir(archiveDir, { recursive: true });

await cp(path.join(root, "dist"), path.join(pluginDir, "webapp"), { recursive: true });
await cp(path.join(root, "build/netherloom-plugin.jar"), path.join(pluginDir, "lib/netherloom-plugin.jar"));
const iconSource = path.join(root, "src/assets/sprites/creatures/snail.png");
const iconTarget = path.join(pluginDir, "webapp/plugin-icon.png");
const iconResize = spawnSync("python3", [
  "-c",
  "from PIL import Image; import sys; im=Image.open(sys.argv[1]).convert('RGBA'); im.thumbnail((32,32), Image.Resampling.NEAREST); out=Image.new('RGBA',(32,32),(0,0,0,0)); out.alpha_composite(im, ((32-im.width)//2, (32-im.height)//2)); out.save(sys.argv[2])",
  iconSource,
  iconTarget,
], { stdio: "inherit" });
if (iconResize.status !== 0) {
  process.exit(iconResize.status ?? 1);
}
await writeFile(path.join(pluginDir, "licenses/LICENSE.txt"), "Netherloom prototype assets and code: project-local development license. Replace before public distribution.\\n");
const iconCode = (await readFile(iconTarget)).toString("base64");

const pluginConfig = `# Netherloom I2P plugin descriptor
name=netherloom
version=${version}
author=Netherloom contributors
date=2026-06-26
description=I2P Observatory: local-first router, tunnel, peer, bandwidth, and health visualization.
websiteURL=http://127.0.0.1:7667/
updateURL=
signer=${signer}
license=Proprietary prototype
min-i2p-version=2.0.0
min-java-version=17
depends=
consoleLinkName=Netherloom
consoleLinkURL=http://127.0.0.1:7667/
consoleLinkTooltip=Open I2P Observatory
icon-code=${iconCode}
`;

const clientsConfig = `# Starts the Netherloom local plugin web server.
clientApp.0.main=net.netherloom.plugin.NetherloomServer
clientApp.0.classpath=$PLUGIN/lib/netherloom-plugin.jar
clientApp.0.name=Netherloom Observatory
clientApp.0.args=7667
clientApp.0.stopargs=stop
clientApp.0.uninstallargs=stop
clientApp.0.delay=5
clientApp.0.startOnLoad=true
`;

await writeFile(path.join(pluginDir, "plugin.config"), pluginConfig);
await writeFile(path.join(pluginDir, "clients.config"), clientsConfig);
await writeFile(path.join(pluginDir, "README.txt"), `Netherloom I2P Plugin

This is a development plugin package for I2P Observatory.

Install target:
  ~/.i2p/plugins/netherloom/

Runtime:
  I2P starts net.netherloom.plugin.NetherloomServer from lib/netherloom-plugin.jar.
  The plugin serves the UI on http://127.0.0.1:7667/ and proxies JSON-RPC requests to the bundled jsonrpc webapp at http://127.0.0.1:7657/jsonrpc/.

Security:
  The proxy only accepts POST requests on /api/i2pcontrol and only forwards to loopback.
  The UI contains no external font or analytics dependency.

Distribution:
  dist-plugin/${archiveName} is an unsigned development archive.
  Public I2P distribution should be signed as SU3 with an appropriate trusted signing key.
`);

const files = [];
async function collect(dir) {
  const entries = await import("node:fs/promises").then((fs) => fs.readdir(dir, { withFileTypes: true }));
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collect(absolute);
    } else if (entry.isFile()) {
      files.push(absolute);
    }
  }
}

await collect(pluginDir);
files.sort();
const sums = [];
for (const file of files) {
  if (file.endsWith("SHA256SUMS")) continue;
  const hash = createHash("sha256").update(await readFile(file)).digest("hex");
  sums.push(`${hash}  ${path.relative(pluginDir, file).replaceAll(path.sep, "/")}`);
}
await writeFile(path.join(pluginDir, "SHA256SUMS"), `${sums.join("\n")}\n`);

const jar = spawnSync("jar", ["--create", "--file", archivePath, "-C", stageRoot, name], { stdio: "inherit" });
if (jar.status !== 0) {
  process.exit(jar.status ?? 1);
}

console.log(`Staged plugin at ${path.relative(root, pluginDir)}`);
console.log(`Created unsigned development archive ${path.relative(root, archivePath)}`);
