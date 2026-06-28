import { useRef } from "react";
import { Heart, Lightbulb, Maximize2, Minus, Play, Plus, Star } from "lucide-react";
import { NetworkCanvas } from "../NetworkCanvas";
import { Sparkline, PanelHeader, PanelTitle, Ring } from "../components/ui";
import { usePetCompositeSprite } from "../components/PetSprite";
import { activityBreakdown, healthScore, formatBandwidth, formatNumber } from "../lib/observatory";
import { useObservatory, type ViewId } from "../state/ObservatoryProvider";
import { hungerStatus, cleanlinessStatus, funStatus } from "../lib/care";

function ActivityLegend() {
  const { metrics, peerCreatures } = useObservatory();
  const activity = activityBreakdown(metrics);
  return (
    <div className="activity-legend">
      <h3>Live Activity</h3>
      <p className="legend-model-note">
        {peerCreatures.length > 0
          ? `${Math.min(peerCreatures.length, 7)} connected routers · hash aliases only`
          : "Waiting for connected router peers"}
      </p>
      {activity.map((item) => (
        <div key={item.label}>
          <i style={{ background: item.color }} />
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function ObservatoryControls({ onFullscreen }: { onFullscreen: () => void }) {
  const { setZoom, playback, setPlayback, replayPlaying, toggleReplayPlaying } = useObservatory();
  return (
    <>
      <div className="zoom-controls">
        <button aria-label="Zoom in" onClick={() => setZoom((z) => z + 0.15)}>
          <Plus />
        </button>
        <button aria-label="Zoom out" onClick={() => setZoom((z) => z - 0.15)}>
          <Minus />
        </button>
        <button aria-label="Fullscreen" onClick={onFullscreen}>
          <Maximize2 />
        </button>
      </div>
      <div className="playback">
        {(["Live", "Replay"] as const).map((item) => (
          <button className={playback === item ? "selected" : ""} key={item} onClick={() => setPlayback(item)}>
            {item === "Live" ? <span className="live-dot" /> : null}
            {item}
          </button>
        ))}
        <button
          aria-label={replayPlaying ? "Pause replay" : "Play replay"}
          onClick={() => {
            if (playback !== "Replay") setPlayback("Replay");
            else toggleReplayPlaying();
          }}
        >
          <Play size={14} fill="currentColor" />
        </button>
      </div>
    </>
  );
}

function ReplayBar() {
  const { playback, replayPos, setReplayPos } = useObservatory();
  if (playback !== "Replay") return null;
  return (
    <div className="replay-bar">
      <span>Replay</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={replayPos}
        onChange={(event) => setReplayPos(Number(event.target.value))}
        aria-label="Replay position"
      />
      <span>{Math.round(replayPos * 100)}%</span>
    </div>
  );
}

function BottomMetricPanels() {
  const { metrics, series, values } = useObservatory();
  const health = healthScore(metrics);
  const tunnelDelta = values.tunnels - (series.tunnels[0] ?? values.tunnels);
  const tunnelPct = series.tunnels[0] ? Math.round((tunnelDelta / series.tunnels[0]) * 100) : 0;

  return (
    <section className="bottom-metrics">
      <div className="metric-panel bandwidth">
        <PanelHeader title="Bandwidth" />
        <div className="bandwidth-grid">
          <div>
            <span>Inbound</span>
            <strong className="tone-blue">{formatBandwidth(values.inbound * 1024 * 1024)}</strong>
          </div>
          <Sparkline values={series.inbound} color="#19a8ff" />
          <div>
            <span>Outbound</span>
            <strong className="tone-violet">{formatBandwidth(values.outbound * 1024 * 1024)}</strong>
          </div>
          <Sparkline values={series.outbound} color="#c24dff" />
        </div>
      </div>

      <div className="metric-panel">
        <PanelHeader title="Participating Tunnels" />
        <div className="big-number">
          <strong className="tone-violet">{formatNumber(values.tunnels)}</strong>
          <span className={tunnelDelta < 0 ? "negative" : ""}>
            {tunnelDelta >= 0 ? "+" : ""}
            {formatNumber(tunnelDelta)} ({tunnelPct}%)
          </span>
        </div>
        <Sparkline values={series.tunnels} color="#b540ff" filled />
      </div>

      <div className="metric-panel peers-panel">
        <PanelHeader title="Peers" />
        <div className="peer-values">
          <div>
            <span>Known Peers</span>
            <strong className="tone-blue">{formatNumber(metrics.knownPeers)}</strong>
          </div>
          <Sparkline values={series.peers} color="#1da8ff" />
          <div>
            <span>Active Peers</span>
            <strong className="tone-green">{formatNumber(values.peers)}</strong>
          </div>
          <Sparkline values={series.peers} color="#36e56a" />
        </div>
      </div>

      <div className="metric-panel health-panel">
        <PanelHeader title="Network Health" status={metrics.netHealthy ? "Good" : metrics.netStatus} />
        <div className="health-content">
          <Ring value={health.total} />
          <ul>
            {health.parts.map((part) => (
              <li key={part.label}>
                {part.label} {part.value}/100
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

interface Suggestion {
  id: string;
  icon: string;
  text: string;
  detail?: string;
  accent: string;
  action: ViewId;
}

function NextActionsHelper() {
  const {
    care,
    activeBoss,
    activeExpedition,
    activeEepsite,
    coins,
    careInventory,
    careItems,
    progression,
    needsEvolutionChoice,
    setView,
  } = useObservatory();

  const suggestions: Suggestion[] = [];

  if (needsEvolutionChoice) {
    suggestions.push({
      id: "evolution",
      icon: "✨",
      text: "Choose your evolution path",
      detail: "Unlock new stage names and a permanent bonus.",
      accent: "#b280ff",
      action: "Creature",
    });
  }

  if (activeBoss) {
    const hpPct = activeBoss.progress.currentHp / activeBoss.progress.maxHp;
    if (hpPct < 0.2) {
      suggestions.push({
        id: "boss-finish",
        icon: "⚔",
        text: `${activeBoss.boss.name} at ${Math.round(hpPct * 100)}% — finish it`,
        detail: "Use care items as ammo for the final blow.",
        accent: "#ff5b6e",
        action: "Bosses",
      });
    }
  }

  if (activeExpedition?.active) {
    suggestions.push({
      id: "exp-claim",
      icon: "🧭",
      text: `Expedition ready: ${activeExpedition.expedition.name}`,
      detail: "Claim your coins, XP, and items.",
      accent: "#7a5aff",
      action: "Expeditions",
    });
  }

  if (activeEepsite?.active) {
    suggestions.push({
      id: "eep-claim",
      icon: "🌐",
      text: `Eepsite ready: ${activeEepsite.eepsite.host}`,
      detail: "Claim the higher-tier loot.",
      accent: "#57c7ff",
      action: "Eepsites",
    });
  }

  if (care) {
    const h = hungerStatus(care.hunger);
    const c = cleanlinessStatus(care.cleanliness);
    const f = funStatus(care.fun);
    const worst = [h, c, f].sort((a, b) => priorityOf(a.tone) - priorityOf(b.tone))[0];
    if (worst.tone === "critical" || worst.tone === "warn") {
      const what = worst === h ? "hungry" : worst === c ? "dirty" : "bored";
      suggestions.push({
        id: "care-low",
        icon: "🐾",
        text: `Your pet is ${what} (${worst.label})`,
        detail: careInventory.length > 0 ? "Use a care item from inventory." : "Buy food / soap / toys in the shop.",
        accent: "#ff6fae",
        action: careInventory.length > 0 ? "Creature" : "Shop",
      });
    }
  }

  const affordableCare = careItems.find((item) => item.cost <= coins);
  if (care && careInventory.length === 0 && affordableCare) {
    suggestions.push({
      id: "stock-care",
      icon: "🛒",
      text: "Stock up on care items",
      detail: `You can afford ${affordableCare.name} (${formatNumber(affordableCare.cost)} coins).`,
      accent: "#ffd36a",
      action: "Shop",
    });
  }

  const level = progression?.level ?? 0;
  if (suggestions.length === 0 && level < 5) {
    suggestions.push({
      id: "first-expedition",
      icon: "🚀",
      text: "Start your first Tunnel Sweep",
      detail: "5-minute expedition for quick coins and XP.",
      accent: "#43dd85",
      action: "Expeditions",
    });
  }
  if (suggestions.length === 0) {
    suggestions.push({
      id: "boss-fight",
      icon: "💀",
      text: "Fight the active boss",
      detail: "Auto-combat is running — every hit counts.",
      accent: "#ff5b6e",
      action: "Bosses",
    });
  }

  const top = suggestions.slice(0, 3);

  return (
    <section className="next-actions">
      <div className="next-actions-head">
        <Lightbulb size={14} />
        <span>What next?</span>
      </div>
      <div className="next-actions-grid">
        {top.map((sug) => (
          <button
            key={sug.id}
            className="next-action-card"
            style={{ borderColor: `${sug.accent}55`, background: `${sug.accent}10` }}
            onClick={() => setView(sug.action)}
          >
            <div className="next-action-icon" style={{ background: `${sug.accent}22` }}>
              <span>{sug.icon}</span>
            </div>
            <div>
              <strong style={{ color: sug.accent }}>{sug.text}</strong>
              {sug.detail ? <small>{sug.detail}</small> : null}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function priorityOf(tone: "good" | "ok" | "warn" | "critical"): number {
  switch (tone) {
    case "critical": return 0;
    case "warn": return 1;
    case "ok": return 2;
    case "good": return 3;
  }
}

export function ObservatoryView() {
  const {
    zoom,
    playback,
    creature,
    creatureFilter,
    progression,
    equipped,
    reactions,
    peerCreatures,
  } = useObservatory();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const heroComposite = usePetCompositeSprite(
    creature?.id ?? "",
    equipped,
    progression?.stage.scale ?? 1,
    creatureFilter,
  );

  const onFullscreen = () => {
    const el = cardRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  };

  return (
    <>
      <div className="canvas-card" ref={cardRef}>
        <NetworkCanvas
          zoom={zoom}
          paused={playback === "Replay"}
          heroSprite={heroComposite.src}
          heroFilter={heroComposite.composed ? "none" : creatureFilter}
          peers={peerCreatures}
        />
        <div className="network-reaction-layer" aria-live="polite">
          {reactions.map((reaction, index) => (
            <img
              key={reaction.id}
              src={reaction.src}
              alt={`${reaction.name} reaction`}
              style={{ transform: `translate(${index * 16}px, ${index * -10}px)` }}
            />
          ))}
        </div>
        <ActivityLegend />
        <ObservatoryControls onFullscreen={onFullscreen} />
        <ReplayBar />
        <div className="reaction heart">
          <Heart size={20} fill="currentColor" />
        </div>
        <div className="reaction star">
          <Star size={20} fill="currentColor" />
        </div>
      </div>
      <NextActionsHelper />
      <BottomMetricPanels />
    </>
  );
}

export { PanelTitle };
