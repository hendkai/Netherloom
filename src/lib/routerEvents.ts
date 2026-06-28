import type { RouterMetrics } from "./observatory";

export type RouterEventKind =
  | "connected"
  | "disconnected"
  | "network"
  | "tunnels"
  | "peers"
  | "bandwidth"
  | "idle"
  | "restart"
  | "level";

export type RouterEventSeverity = "good" | "info" | "warning" | "critical";

export type ReactionName =
  | "Heart"
  | "Smile"
  | "Laugh"
  | "Sleep"
  | "Surprise"
  | "Wave"
  | "Cry"
  | "Starry"
  | "Thumb"
  | "Spark"
  | "Network"
  | "Boost";

export interface RouterEventDraft {
  kind: RouterEventKind;
  severity: RouterEventSeverity;
  title: string;
  detail: string;
  reaction: ReactionName;
}

export interface RouterEvent extends RouterEventDraft {
  id: string;
  timestamp: number;
  reactionSrc: string;
}

const MIN_TRAFFIC_EVENT_BPS = 128 * 1024;
const IDLE_THRESHOLD_BPS = 4 * 1024;

export function deriveRouterEvents(
  previous: RouterMetrics | null,
  next: RouterMetrics,
): RouterEventDraft[] {
  if (!previous) {
    return next.online
      ? [{
          kind: "connected",
          severity: "good",
          title: "Router telemetry connected",
          detail: `${next.knownPeers.toLocaleString("en-US")} peers are visible to the local router.`,
          reaction: "Wave",
        }]
      : [];
  }

  const events: RouterEventDraft[] = [];
  const previousTraffic = previous.inboundBps + previous.outboundBps;
  const nextTraffic = next.inboundBps + next.outboundBps;

  if (!previous.online && next.online) {
    events.push({
      kind: "connected",
      severity: "good",
      title: "Router reconnected",
      detail: `Network status is ${next.netStatus}.`,
      reaction: "Smile",
    });
  } else if (previous.online && !next.online) {
    events.push(connectionLostEvent("The router reported an offline state."));
  }

  if (next.online && previous.netStatusCode !== next.netStatusCode) {
    events.push({
      kind: "network",
      severity: next.netHealthy ? "good" : "warning",
      title: `Network status changed to ${next.netStatus}`,
      detail: `I2PControl status code ${next.netStatusCode ?? "unknown"}.`,
      reaction: next.netHealthy ? "Thumb" : "Surprise",
    });
  }

  if (previous.uptimeMs > 60_000 && next.uptimeMs + 60_000 < previous.uptimeMs) {
    events.push({
      kind: "restart",
      severity: "info",
      title: "Router restart detected",
      detail: "The reported uptime returned to a lower value.",
      reaction: "Surprise",
    });
  }

  const tunnelDelta = next.participatingTunnels - previous.participatingTunnels;
  if (Math.abs(tunnelDelta) >= Math.max(2, Math.round(previous.participatingTunnels * 0.12))) {
    events.push({
      kind: "tunnels",
      severity: tunnelDelta > 0 ? "good" : "info",
      title: tunnelDelta > 0 ? "Tunnel participation increased" : "Tunnel participation decreased",
      detail: `${Math.abs(tunnelDelta)} ${Math.abs(tunnelDelta) === 1 ? "tunnel" : "tunnels"} ${tunnelDelta > 0 ? "added" : "released"}.`,
      reaction: tunnelDelta > 0 ? "Network" : "Surprise",
    });
  }

  const peerDelta = next.activePeers - previous.activePeers;
  if (Math.abs(peerDelta) >= 4) {
    events.push({
      kind: "peers",
      severity: peerDelta > 0 ? "good" : "info",
      title: peerDelta > 0 ? "Active peer set expanded" : "Active peer set contracted",
      detail: `${Math.abs(peerDelta)} active ${Math.abs(peerDelta) === 1 ? "peer" : "peers"} ${peerDelta > 0 ? "joined" : "left"} the current set.`,
      reaction: peerDelta > 0 ? "Wave" : "Sleep",
    });
  }

  if (
    nextTraffic >= MIN_TRAFFIC_EVENT_BPS
    && nextTraffic > Math.max(previousTraffic * 1.75, previousTraffic + 96 * 1024)
  ) {
    events.push({
      kind: "bandwidth",
      severity: "good",
      title: "Relay traffic surged",
      detail: `Combined traffic reached ${formatRate(nextTraffic)}.`,
      reaction: "Boost",
    });
  } else if (previousTraffic >= MIN_TRAFFIC_EVENT_BPS && nextTraffic < IDLE_THRESHOLD_BPS) {
    events.push({
      kind: "idle",
      severity: "info",
      title: "Router traffic became quiet",
      detail: `Combined traffic fell below ${formatRate(IDLE_THRESHOLD_BPS)}.`,
      reaction: "Sleep",
    });
  }

  return events.slice(0, 3);
}

export function connectionLostEvent(detail: string): RouterEventDraft {
  return {
    kind: "disconnected",
    severity: "critical",
    title: "Router telemetry disconnected",
    detail,
    reaction: "Cry",
  };
}

export function levelUpEvent(level: number): RouterEventDraft {
  return {
    kind: "level",
    severity: "good",
    title: `Companion reached level ${level}`,
    detail: "A new skill point milestone was earned from live router contribution.",
    reaction: "Starry",
  };
}

function formatRate(bytesPerSecond: number): string {
  if (bytesPerSecond >= 1024 * 1024) {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
  }
  return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
}
