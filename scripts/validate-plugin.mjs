import { access, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const pluginDir = path.join(root, "build/i2p-plugin/netherloom");
const archive = path.join(root, "dist-plugin/netherloom-0.1.0-dev.xpi2p");

const failures = [];
const checks = [];

function pass(label) {
  checks.push(label);
}

function fail(label, message) {
  failures.push(`${label}: ${message}`);
}

async function exists(label, file) {
  try {
    await access(file);
    pass(label);
    return true;
  } catch {
    fail(label, `${path.relative(root, file)} missing`);
    return false;
  }
}

function parseProperties(text) {
  const result = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    result.set(line.slice(0, index), line.slice(index + 1));
  }
  return result;
}

function requireProp(map, key, label = key) {
  const value = map.get(key);
  if (value == null || value === "") {
    fail(label, `missing ${key}`);
    return "";
  }
  pass(label);
  return value;
}

function requirePattern(map, key, pattern, label = key) {
  const value = requireProp(map, key, label);
  if (value && !pattern.test(value)) {
    fail(label, `${key}=${value} does not match ${pattern}`);
  }
  return value;
}

if (await exists("plugin directory", pluginDir)) {
  const pluginConfigPath = path.join(pluginDir, "plugin.config");
  const clientsConfigPath = path.join(pluginDir, "clients.config");
  const sumsPath = path.join(pluginDir, "SHA256SUMS");
  const jarPath = path.join(pluginDir, "lib/netherloom-plugin.jar");
  const indexPath = path.join(pluginDir, "webapp/index.html");
  const iconPath = path.join(pluginDir, "webapp/plugin-icon.png");

  await exists("plugin.config", pluginConfigPath);
  await exists("clients.config", clientsConfigPath);
  await exists("SHA256SUMS", sumsPath);
  await exists("plugin jar", jarPath);
  await exists("web index", indexPath);
  await exists("plugin icon", iconPath);

  const pluginConfig = parseProperties(await readFile(pluginConfigPath, "utf8"));
  requirePattern(pluginConfig, "name", /^netherloom$/);
  requirePattern(pluginConfig, "version", /^\d+\.\d+\.\d+$/);
  requireProp(pluginConfig, "author");
  requireProp(pluginConfig, "date");
  requireProp(pluginConfig, "description");
  requireProp(pluginConfig, "signer");
  requireProp(pluginConfig, "license");
  requireProp(pluginConfig, "min-i2p-version");
  requirePattern(pluginConfig, "min-java-version", /^17$/);
  requireProp(pluginConfig, "consoleLinkName");
  requirePattern(pluginConfig, "consoleLinkURL", /^http:\/\/127\.0\.0\.1:7667\/$/);

  const iconCode = requireProp(pluginConfig, "icon-code");
  if (iconCode) {
    try {
      const icon = Buffer.from(iconCode, "base64");
      if (icon.subarray(1, 4).toString("ascii") !== "PNG") {
        fail("icon-code png", "decoded icon-code is not a PNG");
      } else if (icon.readUInt32BE(16) !== 32 || icon.readUInt32BE(20) !== 32) {
        fail("icon-code 32x32", `decoded dimensions are ${icon.readUInt32BE(16)}x${icon.readUInt32BE(20)}`);
      } else {
        pass("icon-code png 32x32");
      }
    } catch (error) {
      fail("icon-code base64", error.message);
    }
  }

  const clientsConfig = parseProperties(await readFile(clientsConfigPath, "utf8"));
  requirePattern(clientsConfig, "clientApp.0.main", /^net\.netherloom\.plugin\.NetherloomServer$/);
  requirePattern(clientsConfig, "clientApp.0.classpath", /^\$PLUGIN\/lib\/netherloom-plugin\.jar$/);
  requirePattern(clientsConfig, "clientApp.0.args", /^7667$/);
  requirePattern(clientsConfig, "clientApp.0.stopargs", /^stop$/);
  requirePattern(clientsConfig, "clientApp.0.uninstallargs", /^stop$/);
  requirePattern(clientsConfig, "clientApp.0.startOnLoad", /^true$/);

  const jarList = spawnSync("jar", ["--list", "--file", jarPath], { encoding: "utf8" });
  if (jarList.status !== 0) {
    fail("jar list", jarList.stderr || "jar command failed");
  } else if (!jarList.stdout.includes("net/netherloom/plugin/NetherloomServer.class")) {
    fail("jar class", "NetherloomServer.class missing");
  } else {
    pass("jar contains NetherloomServer");
  }

  const index = await readFile(indexPath, "utf8");
  if (!index.includes("./assets/")) {
    fail("relative assets", "index.html does not use relative asset paths");
  } else {
    pass("relative assets");
  }

  const shas = (await readFile(sumsPath, "utf8")).trim().split(/\r?\n/).filter(Boolean);
  if (shas.length < 10) {
    fail("SHA256SUMS entries", "too few checksum entries");
  } else {
    pass("SHA256SUMS entries");
  }
  for (const line of shas) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    if (!match) {
      fail("SHA256SUMS format", `bad line: ${line}`);
      continue;
    }
    const [, expected, relative] = match;
    const file = path.join(pluginDir, relative);
    try {
      const actual = createHash("sha256").update(await readFile(file)).digest("hex");
      if (actual !== expected) fail("SHA256SUMS hash", `${relative} mismatch`);
    } catch (error) {
      fail("SHA256SUMS file", `${relative}: ${error.message}`);
    }
  }
  pass("SHA256SUMS hashes");

  const iconStats = await stat(iconPath);
  if (iconStats.size > 8192) {
    fail("plugin icon size", `plugin icon is ${iconStats.size} bytes`);
  } else {
    pass("plugin icon size");
  }
}

if (await exists("development archive", archive)) {
  const archiveList = spawnSync("jar", ["--list", "--file", archive], { encoding: "utf8" });
  if (archiveList.status !== 0) {
    fail("archive list", archiveList.stderr || "jar command failed");
  } else {
    for (const required of [
      "netherloom/plugin.config",
      "netherloom/clients.config",
      "netherloom/SHA256SUMS",
      "netherloom/lib/netherloom-plugin.jar",
      "netherloom/webapp/index.html",
    ]) {
      if (archiveList.stdout.includes(required)) {
        pass(`archive ${required}`);
      } else {
        fail(`archive ${required}`, "missing");
      }
    }
  }
}

if (failures.length) {
  console.error("Plugin validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Plugin validation passed (${checks.length} checks).`);
