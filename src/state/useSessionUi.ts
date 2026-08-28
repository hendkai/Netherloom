/**
 * Session & presentation state extracted from ObservatoryProvider (P6):
 * activity log, auto-care settings, offline summary, guide visibility,
 * pet reactions and the router-event feed. All persistence goes through
 * ./savePersistence; every returned name matches the previous provider
 * member so the context wiring stays untouched.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  appendActivity,
  createActivityLog,
  makeActivityId,
  type ActivityEntry,
  type ActivityLog,
} from "../lib/activityLog";
import type { CreatureSave } from "../lib/progression";
import {
  REACTION_SRC,
  MAX_ROUTER_EVENTS,
  loadActivityLog,
  loadAutoCare,
  loadRouterEvents,
  persistActivityLog,
  persistAutoCare,
  persistRouterEvents,
  readGuideSeen,
  writeGuideSeen,
} from "./savePersistence";
import type { AutoCareSettings } from "./savePersistence";
import type { RouterEvent, RouterEventDraft } from "../lib/routerEvents";

export interface Reaction {
  id: number;
  src: string;
  name: string;
}

export interface OfflineSummary {
  awayMs: number;
  expeditionsClaimed: number;
  eepsitesClaimed: number;
  bossDamage: number;
  bossDefeats: number;
  rewardsGained: { coins: number; xp: number; items: number };
}

export interface SessionUi {
  activityLog: ActivityLog;
  pushActivity: (entries: ActivityEntry | ActivityEntry[]) => void;
  clearActivity: () => void;
  autoCare: AutoCareSettings;
  setAutoCare: (next: AutoCareSettings) => void;
  offlineSummary: OfflineSummary | null;
  setOfflineSummary: React.Dispatch<React.SetStateAction<OfflineSummary | null>>;
  dismissOfflineSummary: () => void;
  guideSeen: boolean;
  guideOpen: boolean;
  markGuideSeen: () => void;
  setGuideOpen: (open: boolean) => void;
  reactions: Reaction[];
  setReactions: React.Dispatch<React.SetStateAction<Reaction[]>>;
  routerEvents: RouterEvent[];
  setRouterEvents: React.Dispatch<React.SetStateAction<RouterEvent[]>>;
  recordRouterEvents: (drafts: RouterEventDraft[]) => void;
}

export function useSessionUi(creature: CreatureSave | null): SessionUi {
  // --- Activity log ---------------------------------------------------------
  const [activityLog, setActivityLog] = useState<ActivityLog>(loadActivityLog);
  const activityLogRef = useRef(activityLog);
  activityLogRef.current = activityLog;

  const pushActivity = useCallback((entries: ActivityEntry | ActivityEntry[]) => {
    const incoming = Array.isArray(entries) ? entries : [entries];
    if (incoming.length === 0) return;
    const stamped = incoming.map((e) => ({ ...e, at: e.at || Date.now(), id: e.id || makeActivityId(e.at || Date.now()) }));
    const next = appendActivity(activityLogRef.current, stamped);
    activityLogRef.current = next;
    setActivityLog(next);
    persistActivityLog(next);
  }, []);

  const clearActivity = useCallback(() => {
    const empty = createActivityLog();
    activityLogRef.current = empty;
    setActivityLog(empty);
    persistActivityLog(empty);
  }, []);

  // --- Auto care --------------------------------------------------------------
  const [autoCare, setAutoCareState] = useState<AutoCareSettings>(loadAutoCare);
  const autoCareRef = useRef(autoCare);
  autoCareRef.current = autoCare;

  const setAutoCare = useCallback((next: AutoCareSettings) => {
    const clean: AutoCareSettings = {
      enabled: next.enabled,
      feedThreshold: Math.max(0, Math.min(80, Math.round(next.feedThreshold))),
      cleanThreshold: Math.max(0, Math.min(80, Math.round(next.cleanThreshold))),
      playThreshold: Math.max(0, Math.min(80, Math.round(next.playThreshold))),
    };
    autoCareRef.current = clean;
    setAutoCareState(clean);
    persistAutoCare(clean);
  }, []);

  // --- Offline summary ---------------------------------------------------------
  const [offlineSummary, setOfflineSummary] = useState<OfflineSummary | null>(null);
  const dismissOfflineSummary = useCallback(() => setOfflineSummary(null), []);

  // --- Guide ---------------------------------------------------------------------
  const [guideSeen, setGuideSeenState] = useState<boolean>(readGuideSeen);
  const [guideOpen, setGuideOpenState] = useState(false);

  const markGuideSeen = useCallback(() => {
    setGuideSeenState(true);
    writeGuideSeen();
  }, []);

  const setGuideOpen = useCallback((open: boolean) => {
    setGuideOpenState(open);
    if (open) {
      setGuideSeenState(true);
      writeGuideSeen();
    }
  }, []);

  useEffect(() => {
    if (!creature) return;
    if (guideSeen) return;
    const startedAt = creature.createdAt;
    if (Date.now() - startedAt > 5000) return;
    setGuideOpenState(true);
    writeGuideSeen();
  }, [creature, guideSeen]);

  // --- Reactions & router events ----------------------------------------------------
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [routerEvents, setRouterEvents] = useState<RouterEvent[]>(loadRouterEvents);
  const reactionId = useRef(0);
  const routerEventId = useRef(0);
  const recentEventKeysRef = useRef(new Map<string, number>());

  const recordRouterEvents = useCallback((drafts: RouterEventDraft[]) => {
    if (drafts.length === 0) return;
    const now = Date.now();
    const created: RouterEvent[] = [];

    for (const draft of drafts) {
      const eventKey = `${draft.kind}:${draft.title}`;
      const previousAt = recentEventKeysRef.current.get(eventKey) ?? 0;
      if (now - previousAt < 20_000) continue;
      const reactionSrc = REACTION_SRC.get(draft.reaction);
      if (!reactionSrc) continue;
      recentEventKeysRef.current.set(eventKey, now);
      created.push({
        ...draft,
        id: `${now}-${routerEventId.current += 1}`,
        timestamp: now,
        reactionSrc,
      });
    }

    if (created.length === 0) return;
    setRouterEvents((previous) => {
      const next = [...created.reverse(), ...previous].slice(0, MAX_ROUTER_EVENTS);
      persistRouterEvents(next);
      return next;
    });

    for (const event of created) {
      const id = (reactionId.current += 1);
      setReactions((previous) => [...previous, {
        id,
        src: event.reactionSrc,
        name: event.reaction,
      }]);
      window.setTimeout(() => {
        setReactions((previous) => previous.filter((reaction) => reaction.id !== id));
      }, 2600);
    }
  }, []);

  return {
    activityLog,
    pushActivity,
    clearActivity,
    autoCare,
    setAutoCare,
    offlineSummary,
    setOfflineSummary,
    dismissOfflineSummary,
    guideSeen,
    guideOpen,
    markGuideSeen,
    setGuideOpen,
    reactions,
    setReactions,
    routerEvents,
    setRouterEvents,
    recordRouterEvents,
  };
}
