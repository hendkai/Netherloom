import { mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "src/plugin/java/net/netherloom/plugin/NetherloomServer.java");
const classes = path.join(root, "build/plugin-classes");
const jarPath = path.join(root, "build/netherloom-plugin.jar");

await rm(classes, { recursive: true, force: true });
await mkdir(classes, { recursive: true });
await mkdir(path.dirname(jarPath), { recursive: true });

const javac = spawnSync("javac", ["--release", "17", "-d", classes, source], { stdio: "inherit" });
if (javac.status !== 0) {
  process.exit(javac.status ?? 1);
}

const jar = spawnSync("jar", ["--create", "--file", jarPath, "-C", classes, "."], { stdio: "inherit" });
if (jar.status !== 0) {
  process.exit(jar.status ?? 1);
}

console.log(`Built ${path.relative(root, jarPath)}`);
