import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { LocateFixed, Minus, Plus, RotateCcw } from "lucide-react";
import { useObservatory } from "../state/ObservatoryProvider";
import {
  BRANCH_META,
  canUnlock,
  SKILL_BY_ID,
  SKILL_CANVAS,
  SKILL_TREE,
  type SkillBranch,
  type SkillNode,
  type UnlockFailure,
} from "../lib/skills";

const BRANCHES = Object.keys(BRANCH_META) as SkillBranch[];
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 1.35;

type TreeTransform = {
  x: number;
  y: number;
  zoom: number;
};

function reasonFor(node: SkillNode, reason?: UnlockFailure): string | null {
  if (reason === "requires_node") {
    const names = node.prerequisites
      .map((id) => SKILL_BY_ID.get(id)?.name)
      .filter(Boolean)
      .join(", ");
    return `Requires ${names || "a connected node"}`;
  }
  if (reason === "requires_level") return `Requires level ${node.requiresLevel}`;
  if (reason === "requires_achievement") return "Requires its linked router achievement";
  if (reason === "no_points") return "No skill points available";
  return null;
}

function clampZoom(value: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

export function SkillTreeView() {
  const {
    unlockedSkills,
    skillPointsAvailable,
    totalPointsEarned,
    progression,
    achievements,
    unlockSkill,
    respecSkills,
  } = useObservatory();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; x: number; y: number } | null>(null);
  const [transform, setTransform] = useState<TreeTransform>({ x: 0, y: 0, zoom: 0.58 });
  const [selectedId, setSelectedId] = useState("resonance.t1");

  const unlockedSet = useMemo(() => new Set(unlockedSkills), [unlockedSkills]);
  const achievementSet = useMemo(() => new Set(achievements), [achievements]);
  const level = progression?.level ?? 0;
  const selectedNode = SKILL_BY_ID.get(selectedId) ?? SKILL_TREE[0];
  const selectedCheck = canUnlock(
    selectedNode,
    unlockedSet,
    skillPointsAvailable,
    level,
    achievementSet,
  );
  const selectedUnlocked = unlockedSet.has(selectedNode.id);

  const centerTree = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    const zoom = clampZoom(
      Math.min(width / (SKILL_CANVAS.width + 120), height / (SKILL_CANVAS.height + 120)) * 0.98,
    );
    setTransform({
      zoom,
      x: (width - SKILL_CANVAS.width * zoom) / 2,
      y: (height - SKILL_CANVAS.height * zoom) / 2,
    });
  }, []);

  useEffect(() => {
    centerTree();
    window.addEventListener("resize", centerTree);
    return () => window.removeEventListener("resize", centerTree);
  }, [centerTree]);

  const zoomAtCenter = useCallback((delta: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setTransform((current) => {
      const zoom = clampZoom(current.zoom + delta);
      const centerX = viewport.clientWidth / 2;
      const centerY = viewport.clientHeight / 2;
      const worldX = (centerX - current.x) / current.zoom;
      const worldY = (centerY - current.y) / current.zoom;
      return {
        zoom,
        x: centerX - worldX * zoom,
        y: centerY - worldY * zoom,
      };
    });
  }, []);

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    setTransform((current) => {
      const zoom = clampZoom(current.zoom - event.deltaY * 0.0007);
      const worldX = (pointerX - current.x) / current.zoom;
      const worldY = (pointerY - current.y) / current.zoom;
      return {
        zoom,
        x: pointerX - worldX * zoom,
        y: pointerY - worldY * zoom,
      };
    });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: transform.x,
      y: transform.y,
    };
    event.currentTarget.classList.add("dragging");
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setTransform((current) => ({
      ...current,
      x: drag.x + event.clientX - drag.startX,
      y: drag.y + event.clientY - drag.startY,
    }));
  };

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.classList.remove("dragging");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleRespec = () => {
    if (unlockedSkills.length === 0) return;
    if (window.confirm("Refund every allocated skill point?")) respecSkills();
  };

  return (
    <section className="skill-atlas-page">
      <header className="skill-atlas-head">
        <div>
          <span className="skill-atlas-eyebrow">Companion progression</span>
          <h2>The Living Atlas</h2>
          <p>Allocate points across connected paths. Drag to explore and scroll to zoom.</p>
        </div>
        <div className="skill-atlas-summary">
          <strong>{skillPointsAvailable}</strong>
          <span>points available</span>
          <small>{unlockedSkills.length} / {SKILL_TREE.length} allocated</small>
        </div>
      </header>

      <div className="skill-atlas-toolbar">
        <div className="skill-atlas-totals">
          <span>Level {level}</span>
          <span>{totalPointsEarned} earned</span>
          <span>{Math.round(transform.zoom * 100)}% zoom</span>
        </div>
        <div className="skill-atlas-actions">
          <button onClick={() => zoomAtCenter(-0.12)} aria-label="Zoom out" title="Zoom out">
            <Minus />
          </button>
          <button onClick={() => zoomAtCenter(0.12)} aria-label="Zoom in" title="Zoom in">
            <Plus />
          </button>
          <button onClick={centerTree} aria-label="Fit skill tree" title="Fit skill tree">
            <LocateFixed />
          </button>
          <button
            onClick={handleRespec}
            disabled={unlockedSkills.length === 0}
            aria-label="Refund all skill points"
            title="Refund all skill points"
          >
            <RotateCcw />
          </button>
        </div>
      </div>

      <div
        className="skill-atlas-viewport"
        ref={viewportRef}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        <div
          className="skill-atlas-canvas"
          style={{
            width: SKILL_CANVAS.width,
            height: SKILL_CANVAS.height,
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.zoom})`,
          }}
        >
          <div className="skill-atlas-rings" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>

          <svg
            className="skill-atlas-links"
            width={SKILL_CANVAS.width}
            height={SKILL_CANVAS.height}
            viewBox={`0 0 ${SKILL_CANVAS.width} ${SKILL_CANVAS.height}`}
            aria-hidden="true"
          >
            {BRANCHES.map((branch) => {
              const first = SKILL_BY_ID.get(`${branch}.t1`);
              return first ? (
                <line
                  key={`origin-${branch}`}
                  className={unlockedSet.has(first.id) ? "active" : ""}
                  style={{ "--branch-color": BRANCH_META[branch].color } as CSSProperties}
                  x1={SKILL_CANVAS.centerX}
                  y1={SKILL_CANVAS.centerY}
                  x2={first.x}
                  y2={first.y}
                />
              ) : null;
            })}
            {SKILL_TREE.flatMap((node) =>
              node.prerequisites.map((parentId) => {
                const parent = SKILL_BY_ID.get(parentId);
                if (!parent) return null;
                const active = unlockedSet.has(parentId) && unlockedSet.has(node.id);
                const available = unlockedSet.has(parentId) && !unlockedSet.has(node.id);
                return (
                  <line
                    key={`${parentId}-${node.id}`}
                    className={active ? "active" : available ? "available" : ""}
                    style={{ "--branch-color": BRANCH_META[node.branch].color } as CSSProperties}
                    x1={parent.x}
                    y1={parent.y}
                    x2={node.x}
                    y2={node.y}
                  />
                );
              }),
            )}
          </svg>

          {BRANCHES.map((branch) => {
            const meta = BRANCH_META[branch];
            const labelPoint = (() => {
              const radians = (meta.angle * Math.PI) / 180;
              return {
                x: SKILL_CANVAS.centerX + Math.cos(radians) * 900,
                y: SKILL_CANVAS.centerY + Math.sin(radians) * 900,
              };
            })();
            return (
              <div
                className="skill-branch-label"
                key={branch}
                style={{
                  left: labelPoint.x,
                  top: labelPoint.y,
                  color: meta.color,
                  borderColor: meta.color,
                }}
              >
                <strong>{meta.name}</strong>
                <span>{meta.tagline}</span>
              </div>
            );
          })}

          <div className="skill-origin" style={{ left: SKILL_CANVAS.centerX, top: SKILL_CANVAS.centerY }}>
            <span>NL</span>
            <strong>Living Core</strong>
          </div>

          {SKILL_TREE.map((node) => {
            const unlocked = unlockedSet.has(node.id);
            const check = canUnlock(node, unlockedSet, skillPointsAvailable, level, achievementSet);
            const state = unlocked ? "unlocked" : check.ok ? "available" : "locked";
            const selected = selectedNode.id === node.id;
            return (
              <button
                className={`atlas-skill-node ${node.size} ${state} ${selected ? "selected" : ""}`}
                key={node.id}
                style={{
                  left: node.x,
                  top: node.y,
                  "--branch-color": BRANCH_META[node.branch].color,
                } as CSSProperties}
                onClick={() => setSelectedId(node.id)}
                aria-pressed={selected}
                aria-label={`${node.name}. ${node.description}. ${state}.`}
                title={`${node.name} — ${node.description}`}
              >
                <span className="atlas-node-frame">
                  <img src={node.icon} alt="" />
                </span>
                {node.size !== "minor" ? <strong>{node.name}</strong> : null}
              </button>
            );
          })}
        </div>

        <aside
          className="skill-inspector"
          style={{ "--branch-color": BRANCH_META[selectedNode.branch].color } as CSSProperties}
        >
          <div className={`skill-inspector-icon ${selectedNode.size}`}>
            <img src={selectedNode.icon} alt="" />
          </div>
          <span>{BRANCH_META[selectedNode.branch].name} · Tier {selectedNode.tier}</span>
          <h3>{selectedNode.name}</h3>
          <p>{selectedNode.description}</p>
          {reasonFor(selectedNode, selectedCheck.reason) ? (
            <small>{reasonFor(selectedNode, selectedCheck.reason)}</small>
          ) : null}
          <button
            onClick={() => unlockSkill(selectedNode.id)}
            disabled={selectedUnlocked || !selectedCheck.ok}
          >
            {selectedUnlocked ? "Allocated" : "Allocate point"}
          </button>
        </aside>

        <div className="skill-atlas-legend">
          <span><i className="unlocked" /> Allocated</span>
          <span><i className="available" /> Available</span>
          <span><i /> Locked</span>
        </div>
      </div>
    </section>
  );
}
