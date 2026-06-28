import {
  Activity,
  Gauge,
  Network,
  RefreshCw,
  Sparkles,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { RouterEventKind } from "../lib/routerEvents";

const ICONS = {
  connected: Wifi,
  disconnected: WifiOff,
  network: Activity,
  tunnels: Network,
  peers: Users,
  bandwidth: Gauge,
  idle: Activity,
  restart: RefreshCw,
  level: Sparkles,
} satisfies Record<RouterEventKind, typeof Activity>;

export function RouterEventIcon({ kind, size = 16 }: { kind: RouterEventKind; size?: number }) {
  const Icon = ICONS[kind];
  return <Icon size={size} aria-hidden="true" />;
}
