# Netherloom I2P Plugin

Netherloom can be packaged as a local I2P plugin that starts a loopback-only Java web server and serves the Observatory UI from the installed plugin directory.

## Build

```bash
npm run build:plugin
npm run validate:plugin
```

Outputs:

- `build/i2p-plugin/netherloom/` — installable plugin directory layout
- `dist-plugin/netherloom-0.1.0-dev.xpi2p` — unsigned development archive

For a local development install:

```bash
npm run install:plugin:dev
```

This copies the staged plugin to `~/.i2p/plugins/netherloom/`.

## Plugin Layout

```text
netherloom/
  plugin.config
  clients.config
  SHA256SUMS
  lib/netherloom-plugin.jar
  webapp/
    index.html
    assets/
    plugin-icon.png
```

`clients.config` starts `net.netherloom.plugin.NetherloomServer` on `127.0.0.1:7667`. The UI is linked from the router console via `plugin.config`.

## Runtime API

- `GET /api/health` returns plugin health.
- `POST /api/i2pcontrol` forwards JSON-RPC to `http://127.0.0.1:7657/jsonrpc/`.

The proxy is intentionally loopback-only and POST-only. It does not expose arbitrary outbound requests.

## Signing

The generated `.xpi2p` is a development archive. Public I2P distribution should use the current I2P SU3 signing workflow with a trusted plugin signing key. Keep the staged directory as the canonical payload and sign that payload with the local I2P release tooling.

Signing is intentionally not faked in this repository. A real release needs the maintainer's private plugin signing key.

Reference: https://i2p.net/en/docs/specs/plugin/
