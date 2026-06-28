import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const root = process.cwd();
const source = path.join(root, "build/i2p-plugin/netherloom");

async function exists(dir) {
  try {
    return (await stat(dir)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Locate the active I2P configuration directory. The location differs per
 * platform / installer, so probe the common candidates and honour an explicit
 * override via the I2P env var.
 */
async function resolveI2PDir() {
  const home = os.homedir();
  const candidates = [
    process.env.I2P,
    path.join(home, ".i2p"),
    path.join(home, "Library/Application Support/i2p"), // macOS app / easy-install
    path.join(home, ".config/i2p"),
  ].filter(Boolean);

  for (const dir of candidates) {
    if (await exists(dir)) return dir;
  }
  return path.join(home, ".i2p"); // fall back to the classic default
}

const i2pDir = await resolveI2PDir();
const target = path.join(i2pDir, "plugins/netherloom");

await mkdir(path.dirname(target), { recursive: true });
await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });

console.log(`Using I2P directory: ${i2pDir}`);
console.log(`Installed Netherloom development plugin to ${target}`);
console.log("Restart I2P or reload plugins from the router console to start it.");
