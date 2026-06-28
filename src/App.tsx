import { useState, type ReactElement } from "react";
import { Bell, Check, Coins, Download, Edit3, Settings } from "lucide-react";
import { navItems } from "./data";
import { StatPill, NetworkMark, PanelTitle } from "./components/ui";
import { RouterEventIcon } from "./components/RouterEventIcon";
import {
  formatBandwidth,
  formatBandwidthRaw,
  formatNumber,
  formatUptime,
} from "./lib/observatory";
import { ObservatoryProvider, useObservatory, type ViewId } from "./state/ObservatoryProvider";
import { Onboarding } from "./components/Onboarding";
import { PetSprite } from "./components/PetSprite";
import { SaveSlotSelect } from "./components/SaveSlotSelect";
import { OfflineSummaryModal } from "./components/OfflineSummaryModal";
import { GuideModal } from "./components/GuideModal";
import { getActiveSlot, setActiveSlot, type SlotId } from "./lib/saves";
import { ObservatoryView } from "./views/ObservatoryView";
import { TrafficView } from "./views/TrafficView";
import { PeersView } from "./views/PeersView";
import { TunnelsView } from "./views/TunnelsView";
import { HealthView } from "./views/HealthView";
import { CreatureView } from "./views/CreatureView";
import { CollectionView } from "./views/CollectionView";
import { QuestsView } from "./views/QuestsView";
import { SkillTreeView } from "./views/SkillTreeView";
import { AchievementsView } from "./views/AchievementsView";
import { TimelineView } from "./views/TimelineView";
import { ExpeditionsView } from "./views/ExpeditionsView";
import { EepsitesView } from "./views/EepsitesView";
import { BossesView } from "./views/BossesView";
import { ActivityView } from "./views/ActivityView";
import { GuideView } from "./views/GuideView";
import { SettingsView } from "./views/SettingsView";
import { ShopView } from "./views/ShopView";

const VIEWS: Record<ViewId, () => ReactElement> = {
  Observatory: ObservatoryView,
  Guide: GuideView,
  Traffic: TrafficView,
  Peers: PeersView,
  Tunnels: TunnelsView,
  Health: HealthView,
  Creature: CreatureView,
  Collection: CollectionView,
  Quests: QuestsView,
  Shop: ShopView,
  Skills: SkillTreeView,
  Achievements: AchievementsView,
  Timeline: TimelineView,
  Expeditions: ExpeditionsView,
  Eepsites: EepsitesView,
  Bosses: BossesView,
  Activity: ActivityView,
  Settings: SettingsView,
};

function eventTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function TopStats() {
  const { metrics, mode } = useObservatory();
  const technical = mode === "Technical";
  const stats = [
    { label: "Router Status", value: technical ? metrics.statusRaw : metrics.status, tone: metrics.online ? "green" : undefined },
    {
      label: "Network Status",
      value: technical && metrics.netStatusCode != null ? `${metrics.netStatus} (${metrics.netStatusCode})` : metrics.netStatus,
      tone: metrics.netHealthy ? "green" : undefined,
    },
    { label: "Uptime", value: formatUptime(metrics.uptimeMs) },
    {
      label: "Inbound",
      value: technical ? formatBandwidthRaw(metrics.inboundBps) : formatBandwidth(metrics.inboundBps),
      tone: "blue",
    },
    {
      label: "Outbound",
      value: technical ? formatBandwidthRaw(metrics.outboundBps) : formatBandwidth(metrics.outboundBps),
      tone: "violet",
    },
    { label: "Participating Tunnels", value: formatNumber(metrics.participatingTunnels) },
    { label: "Known Peers", value: formatNumber(metrics.knownPeers) },
  ];
  return (
    <div className="top-stats">
      {stats.map((stat) => (
        <StatPill key={stat.label} {...stat} />
      ))}
    </div>
  );
}

function TopActions() {
  const {
    source,
    coins,
    routerEvents,
    setView,
    exportSnapshot,
    notificationsOpen,
    toggleNotifications,
    closeNotifications,
  } = useObservatory();
  const recent = routerEvents.slice(0, 5);
  return (
    <div className="top-actions">
      <button className="coin-balance" onClick={() => setView("Shop")} aria-label={`${formatNumber(coins)} coins`}>
        <Coins size={15} />
        <span>{formatNumber(coins)}</span>
      </button>
      <span className={`plugin-health ${source === "live" ? "ready" : "offline"}`}>
        {source === "live" ? "Live" : "Offline"}
      </span>
      <div className="bell-wrap">
        <button aria-label="Notifications" onClick={toggleNotifications}>
          <Bell />
          {routerEvents.length > 0 ? <i className="bell-badge">{Math.min(routerEvents.length, 99)}</i> : null}
        </button>
        {notificationsOpen ? (
          <div className="notif-dropdown">
            <div className="notif-head">Router Events</div>
            {recent.length > 0 ? recent.map((event) => (
              <button
                className="notif-row"
                key={event.id}
                onClick={() => {
                  closeNotifications();
                  setView("Timeline");
                }}
              >
                <RouterEventIcon kind={event.kind} size={15} />
                <time>{eventTime(event.timestamp)}</time>
                <span>{event.title}</span>
              </button>
            )) : <p className="notif-empty">Waiting for live router events.</p>}
          </div>
        ) : null}
      </div>
      <button aria-label="Export session snapshot" title="Export session snapshot" onClick={exportSnapshot}>
        <Download />
      </button>
      <button aria-label="Settings" onClick={() => setView("Settings")}>
        <Settings />
      </button>
    </div>
  );
}

function Sidebar() {
  const { activeView, setView, mode, setMode, pluginAvailable } = useObservatory();
  return (
    <aside className="left-rail">
      <nav className="nav-list" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const view = item.label as ViewId;
          return (
            <button
              className={activeView === view ? "active" : ""}
              key={item.label}
              aria-label={item.label}
              onClick={() => setView(view)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mode-box">
        <span>Mode</span>
        {(["Living", "Technical"] as const).map((item) => (
          <button className={mode === item ? "selected" : ""} key={item} onClick={() => setMode(item)}>
            {item === "Living" ? "✺" : "⌘"} {item}
          </button>
        ))}
      </div>

      <div className="privacy-note">
        <NetworkMark compact />
        <span>
          I2P is freedom.
          <br />
          You are the network.
        </span>
      </div>

      <a
        className="version-tag"
        href="https://github.com/hendkai/Netherloom"
        target="_blank"
        rel="noopener noreferrer"
        title={pluginAvailable ? "Running as I2P plugin — click for source code" : "Running in dev / standalone — click for source code"}
      >
        <span className="version-dot" data-mode={pluginAvailable ? "plugin" : "dev"} />
        <strong>Netherloom v{__APP_VERSION__}</strong>
        <small>{pluginAvailable ? "plugin" : "dev"}</small>
      </a>
    </aside>
  );
}

function EditableName() {
  const { creatureName, renameCreature } = useObservatory();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(creatureName);

  if (editing) {
    const commit = () => {
      renameCreature(draft);
      setEditing(false);
    };
    return (
      <div className="creature-name">
        <input
          className="name-input"
          value={draft}
          autoFocus
          maxLength={24}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            if (event.key === "Escape") setEditing(false);
          }}
        />
        <button aria-label="Save name" onClick={commit}>
          <Check size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="creature-name">
      <h2>{creatureName}</h2>
      <button
        aria-label="Edit name"
        onClick={() => {
          setDraft(creatureName);
          setEditing(true);
        }}
      >
        <Edit3 size={14} />
      </button>
    </div>
  );
}

function RightRail() {
  const {
    metrics,
    source,
    reactions,
    routerEvents,
    creature,
    creatureFilter,
    creatureName,
    progression,
    coins,
    gearScore,
    equipped,
  } = useObservatory();
  const p = progression;
  const score = `${formatNumber(Math.min(100, Math.round((metrics.knownPeers / 16 + metrics.activePeers / 2.4) / 2)))} / 100`;
  const energy = source === "live" && p ? `${p.energy}%` : "—";
  const mood = p ? p.mood : "Resting";

  return (
    <aside className="right-rail">
      <div className="level-card">
        <div className="avatar-sprite">
          <PetSprite
            petId={creature?.id ?? ""}
            equipped={equipped}
            size={50}
            baseScale={p?.stage.scale ?? 1}
            filter={creatureFilter}
            alt={creatureName}
          />
        </div>
        <div>
          <strong>LVL {p ? p.level : 0}</strong>
          <div className="xp-track">
            <span style={{ width: `${(p ? p.xpPct : 0) * 100}%` }} />
          </div>
          <small>
            {formatNumber(p ? p.xpIntoLevel : 0)} / {formatNumber(p ? p.xpForNextLevel : 100)} XP
          </small>
        </div>
      </div>

      <section className="side-panel creature-card">
        <PanelTitle title="Your Creature" />
        <div className="creature-art" data-stage={p ? p.stage.index : 0}>
          <PetSprite
            petId={creature?.id ?? ""}
            equipped={equipped}
            size={118}
            baseScale={p?.stage.scale ?? 1}
            filter={creatureFilter}
            alt={creatureName}
          />
          <div className="reaction-layer">
            {reactions.map((reaction, index) => (
              <img
                key={reaction.id}
                className="reaction-pop"
                src={reaction.src}
                alt={reaction.name}
                style={{ left: `${42 + ((index * 37) % 26)}%` }}
              />
            ))}
          </div>
        </div>
        <EditableName />
        <p>{p ? p.title : "Hatchling"}</p>
        <div className="level-badge">Level {p ? p.level : 0}</div>
        <div className="xp-track violet">
          <span style={{ width: `${(p ? p.xpPct : 0) * 100}%` }} />
        </div>
        <div className="creature-stats">
          <div>
            <span>Personality</span>
            <strong>{p ? p.personality : "—"}</strong>
          </div>
          <div>
            <span>Mood</span>
            <strong>{mood}</strong>
          </div>
          <div>
            <span>Energy</span>
            <strong>{energy}</strong>
          </div>
          <div>
            <span>Title</span>
            <strong>{p ? p.title : "Hatchling"}</strong>
          </div>
          <div>
            <span>Affinity</span>
            <strong>{p ? p.affinity : "—"}</strong>
          </div>
        </div>
      </section>

      <section className="side-panel pet-signals">
        <PanelTitle title="Pet Reactions" />
        <p className="pet-signals-note">Automatic signals from live router telemetry</p>
        <div className="pet-signal-list">
          {routerEvents.length > 0 ? routerEvents.slice(0, 3).map((event) => (
            <div className={`pet-signal ${event.severity}`} key={event.id}>
              <img src={event.reactionSrc} alt={`${event.reaction} reaction`} />
              <span>
                <strong>{event.title}</strong>
                <small>{eventTime(event.timestamp)}</small>
              </span>
            </div>
          )) : (
            <div className="pet-signal-empty">
              {source === "live" ? "Watching for router changes…" : "Connect I2PControl to start reactions."}
            </div>
          )}
        </div>
      </section>

      <section className="side-panel stats-list">
        <PanelTitle title="Stats" />
        {[
          ["Total XP Earned", formatNumber(p ? p.totalXp : 0)],
          ["Coins", formatNumber(coins)],
          ["Gear Score", formatNumber(gearScore)],
          ["Participating Tunnels", formatNumber(metrics.participatingTunnels)],
          ["Data Shared", `${(p ? p.dataSharedGB : 0).toFixed(2)} GB`],
          ["Uptime", formatUptime(metrics.uptimeMs)],
          ["Peers Helped", formatNumber(metrics.knownPeers)],
          ["Network Score", score],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>
    </aside>
  );
}

function AppShell() {
  const { activeView, mode, theme, onboardingNeeded, recentAchievement, dismissAchievement, offlineSummary, guideOpen } = useObservatory();
  const View = VIEWS[activeView];

  if (onboardingNeeded) {
    return (
      <main className="app-shell" data-mode={mode.toLowerCase()} data-theme={theme.toLowerCase()}>
        <Onboarding />
      </main>
    );
  }

  return (
    <main className="app-shell" data-mode={mode.toLowerCase()} data-theme={theme.toLowerCase()}>
      <header className="topbar">
        <div className="brand">
          <NetworkMark />
          <div>
            <h1>Netherloom</h1>
            <span>Living Network Edition</span>
          </div>
        </div>
        <TopStats />
        <TopActions />
      </header>

      {recentAchievement ? (
        <div className="ach-banner" role="status">
          <div className="ach-banner-badge">★ Achievement unlocked</div>
          <div className="ach-banner-name">{recentAchievement.name}</div>
          <div className="ach-banner-desc">
            {recentAchievement.description} · +{formatNumber(recentAchievement.rewardCoins)} coins
          </div>
          <button className="ach-banner-close" onClick={dismissAchievement} aria-label="Dismiss">
            ×
          </button>
        </div>
      ) : null}

      {offlineSummary ? <OfflineSummaryModal summary={offlineSummary} /> : null}
      {guideOpen ? <GuideModal /> : null}

      <div className="layout-grid">
        <Sidebar />
        <section className="observatory">
          <View />
        </section>
        <RightRail />
      </div>
    </main>
  );
}

export function App() {
  const [slot, setSlot] = useState<SlotId | null>(() => getActiveSlot());

  if (slot == null) {
    return (
      <SaveSlotSelect
        onPick={(picked) => {
          setActiveSlot(picked);
          setSlot(picked);
          // Reload so the provider reads this slot's namespaced storage cleanly.
          window.location.reload();
        }}
      />
    );
  }

  return (
    <ObservatoryProvider>
      <AppShell />
    </ObservatoryProvider>
  );
}
