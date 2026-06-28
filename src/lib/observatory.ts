import {
  authenticateI2PControl,
  callI2PControl,
  type JsonRpcValue,
} from "./i2pcontrol";

export type DataSource = "live" | "disconnected";

export interface RouterMetrics {
  /** Friendly router status, e.g. "Connected" / "Offline". */
  status: string;
  /** Raw status string as reported by the router. */
  statusRaw: string;
  /** Whether the router considers itself reachable/connected. */
  online: boolean;
  /** Friendly network status label, e.g. "Good". */
  netStatus: string;
  /** Raw I2PControl net status code (0 = OK), or null if unknown. */
  netStatusCode: number | null;
  /** Whether the network status is considered healthy. */
  netHealthy: boolean;
  uptimeMs: number;
  inboundBps: number;
  outboundBps: number;
  participatingTunnels: number;
  knownPeers: number;
  activePeers: number;
}

export interface ActivitySlice {
  label: string;
  value: number;
  color: string;
}

export interface HealthNotice {
  severity: "good" | "info" | "warning" | "critical";
  title: string;
  detail: string;
  action: string;
}

/**
 * I2PControl `i2p.router.net.status` codes mapped to a short label and a
 * health flag. Unknown codes remain explicit instead of being presented as a
 * healthy state that the router did not actually report.
 */
const NET_STATUS: Record<number, { label: string; healthy: boolean }> = {
  0: { label: "Good", healthy: true }, // OK
  1: { label: "Testing", healthy: true }, // TESTING
  2: { label: "Firewalled", healthy: true }, // FIREWALLED
  3: { label: "Hidden", healthy: true }, // HIDDEN
  4: { label: "Firewalled", healthy: true },
  5: { label: "Firewalled", healthy: true },
  6: { label: "Firewalled", healthy: true },
  7: { label: "Firewalled", healthy: true },
  8: { label: "I2CP Error", healthy: false },
  9: { label: "Clock Skew", healthy: false },
  10: { label: "Private Address", healthy: false },
  11: { label: "Symmetric NAT", healthy: false },
  12: { label: "Port In Use", healthy: false },
  13: { label: "No Peers", healthy: false },
  14: { label: "UDP Disabled", healthy: false },
  15: { label: "UDP Disabled", healthy: false },
};

function netStatusFor(code: number | null): { label: string; healthy: boolean } {
  if (code === null || Number.isNaN(code)) return { label: "Unavailable", healthy: false };
  return NET_STATUS[code] ?? { label: `Status ${code}`, healthy: false };
}

function num(value: JsonRpcValue | undefined): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function looksOnline(statusRaw: string, uptimeMs: number): boolean {
  const lowered = statusRaw.toLowerCase();
  if (lowered.includes("reject") || lowered.includes("disconnect") || lowered.includes("error")) {
    return false;
  }
  return uptimeMs > 0 || lowered.includes("ok") || lowered.includes("running") || lowered.includes("network");
}

export const EMPTY_METRICS: RouterMetrics = {
  status: "Disconnected",
  statusRaw: "Unavailable",
  online: false,
  netStatus: "Unavailable",
  netStatusCode: null,
  netHealthy: false,
  uptimeMs: 0,
  inboundBps: 0,
  outboundBps: 0,
  participatingTunnels: 0,
  knownPeers: 0,
  activePeers: 0,
};

/**
 * Authenticate against I2PControl (via the plugin proxy) and read the live
 * router metrics. Throws if the proxy or router is unreachable.
 */
export async function fetchMetrics(password: string): Promise<RouterMetrics> {
  const auth = await authenticateI2PControl(password);
  const token = auth.result?.Token;
  if (!token) {
    throw new Error(auth.error?.message ?? "I2PControl authentication failed");
  }

  const response = await callI2PControl<Record<string, JsonRpcValue>>(
    "RouterInfo",
    {
      "i2p.router.status": "",
      "i2p.router.uptime": "",
      "i2p.router.net.status": "",
      "i2p.router.net.bw.inbound.1s": "",
      "i2p.router.net.bw.outbound.1s": "",
      "i2p.router.net.tunnels.participating": "",
      "i2p.router.netdb.knownpeers": "",
      "i2p.router.netdb.activepeers": "",
    },
    token,
  );

  const result = response.result;
  if (!result) {
    throw new Error(response.error?.message ?? "I2PControl returned no result");
  }

  const statusRaw = String(result["i2p.router.status"] ?? "").trim();
  const uptimeMs = num(result["i2p.router.uptime"]);
  const netStatusCode = result["i2p.router.net.status"] != null ? num(result["i2p.router.net.status"]) : null;
  const net = netStatusFor(netStatusCode);
  const online = looksOnline(statusRaw, uptimeMs);

  return {
    status: online ? "Connected" : "Offline",
    statusRaw: statusRaw || (online ? "OK" : "Disconnected"),
    online,
    netStatus: net.label,
    netStatusCode,
    netHealthy: net.healthy,
    uptimeMs,
    inboundBps: num(result["i2p.router.net.bw.inbound.1s"]),
    outboundBps: num(result["i2p.router.net.bw.outbound.1s"]),
    participatingTunnels: num(result["i2p.router.net.tunnels.participating"]),
    knownPeers: num(result["i2p.router.netdb.knownpeers"]),
    activePeers: num(result["i2p.router.netdb.activepeers"]),
  };
}

// --- Formatters -----------------------------------------------------------

/** Bytes/second → a human "1.24 MB/s" style string. */
export function formatBandwidth(bps: number): string {
  if (!Number.isFinite(bps) || bps <= 0) return "0.00 MB/s";
  const mb = bps / (1024 * 1024);
  if (mb >= 0.1) return `${mb.toFixed(2)} MB/s`;
  const kb = bps / 1024;
  return `${kb.toFixed(1)} KB/s`;
}

/** Bytes/second → raw value, e.g. "1,300,234 B/s" for Technical mode. */
export function formatBandwidthRaw(bps: number): string {
  return `${formatNumber(Math.round(bps))} B/s`;
}

/** Milliseconds → "2d 14h 32m". */
export function formatUptime(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** 1246 → "1,246". */
export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/**
 * A rough 0–100 network health score derived from the live metrics, plus its
 * sub-scores.
 */
export function healthScore(metrics: RouterMetrics): {
  total: number;
  parts: { label: string; value: number }[];
} {
  const uptimeHours = metrics.uptimeMs / 3600000;
  const uptime = clampScore(40 + uptimeHours * 2.2); // saturates after ~1 day
  const bandwidth = clampScore((metrics.inboundBps + metrics.outboundBps) / (1024 * 1024) * 22 + 30);
  const peers = clampScore(metrics.knownPeers / 16 + 20);
  const tunnels = clampScore(metrics.participatingTunnels / 5 + 30);
  const connectivity = clampScore(metrics.activePeers / 2.4 + (metrics.netHealthy ? 30 : 0));
  const parts = [
    { label: "Uptime", value: uptime },
    { label: "Bandwidth", value: bandwidth },
    { label: "Peers", value: peers },
    { label: "Tunnels", value: tunnels },
    { label: "Connectivity", value: connectivity },
  ];
  const total = Math.round(parts.reduce((sum, p) => sum + p.value, 0) / parts.length);
  return { total, parts };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function activityBreakdown(metrics: RouterMetrics): ActivitySlice[] {
  const trafficMb = (metrics.inboundBps + metrics.outboundBps) / (1024 * 1024);
  const peerRatio = metrics.knownPeers > 0 ? metrics.activePeers / metrics.knownPeers : 0;
  const tunnelLoad = Math.min(1, metrics.participatingTunnels / 600);
  const trafficLoad = Math.min(1, trafficMb / 4);

  return [
    { label: "Exploring", value: Math.round(6 + peerRatio * 70), color: "#2f9bff" },
    { label: "Exchanging", value: Math.round(5 + trafficLoad * 34), color: "#9448ff" },
    { label: "Building", value: Math.round(5 + tunnelLoad * 22), color: "#74df45" },
    { label: "Relaying", value: Math.round(8 + tunnelLoad * 30 + trafficLoad * 10), color: "#ff9d2f" },
    { label: "Idle", value: Math.max(2, Math.round(18 - trafficLoad * 12)), color: "#687085" },
  ];
}

export function healthNotices(metrics: RouterMetrics): HealthNotice[] {
  const notices: HealthNotice[] = [];
  const trafficBps = metrics.inboundBps + metrics.outboundBps;

  if (!metrics.online) {
    notices.push({
      severity: "critical",
      title: "Router is not connected",
      detail: `The router reports "${metrics.statusRaw || "offline"}". Live network participation is unavailable.`,
      action: "Check the router console and transport status before changing Netherloom settings.",
    });
  }

  if (!metrics.netHealthy) {
    notices.push({
      severity: "critical",
      title: `Network status: ${metrics.netStatus}`,
      detail: `I2PControl reports network status code ${metrics.netStatusCode ?? "unknown"}.`,
      action: "Open the I2P router console diagnostics and resolve the reported transport condition.",
    });
  } else if (metrics.netStatus === "Firewalled") {
    notices.push({
      severity: "warning",
      title: "Router is firewalled",
      detail: "The router can participate, but inbound reachability and integration may be limited.",
      action: "Review UPnP, NAT and the configured I2P transport ports in the router console.",
    });
  } else if (metrics.netStatus === "Testing") {
    notices.push({
      severity: "info",
      title: "Reachability test in progress",
      detail: "The router is still determining its network reachability.",
      action: "Give the router a few minutes before troubleshooting this state.",
    });
  }

  if (metrics.online && metrics.uptimeMs < 15 * 60 * 1000) {
    notices.push({
      severity: "info",
      title: "Router is still warming up",
      detail: `Current uptime is ${formatUptime(metrics.uptimeMs)}; peer and tunnel counts may still be settling.`,
      action: "Wait for netDb exploration and tunnel pools to stabilize.",
    });
  }

  if (metrics.online && metrics.knownPeers < 100) {
    notices.push({
      severity: "warning",
      title: "Low peer visibility",
      detail: `Only ${formatNumber(metrics.knownPeers)} peers are currently known to the router.`,
      action: "Check reseed status, clock accuracy and outbound connectivity.",
    });
  } else if (metrics.online && metrics.activePeers < 8) {
    notices.push({
      severity: "warning",
      title: "Few active peers",
      detail: `${formatNumber(metrics.activePeers)} active peers may indicate limited network participation.`,
      action: "Allow more startup time, then review bandwidth and transport settings.",
    });
  }

  if (metrics.online && metrics.participatingTunnels < 10) {
    notices.push({
      severity: "info",
      title: "Low tunnel participation",
      detail: `${formatNumber(metrics.participatingTunnels)} participating tunnels are currently being relayed.`,
      action: "This can be normal after startup; verify shared-bandwidth settings if it persists.",
    });
  }

  if (metrics.online && metrics.uptimeMs > 30 * 60 * 1000 && trafficBps < 1024) {
    notices.push({
      severity: "info",
      title: "Very little network traffic",
      detail: "Combined measured traffic is below 1 KB/s despite an established router session.",
      action: "Confirm that bandwidth sharing is enabled and tunnel participation is not restricted.",
    });
  }

  if (notices.length === 0) {
    notices.push({
      severity: "good",
      title: "No actionable issues detected",
      detail: "Connectivity, peer visibility, tunnel participation and measured traffic are within healthy ranges.",
      action: "Keep the router running to maintain stable network participation.",
    });
  }

  return notices;
}
