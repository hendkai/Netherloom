import { useState } from "react";
import { ChevronRight, Database, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { PetSprite } from "./PetSprite";
import { NetworkMark } from "./ui";
import { allSlotSummaries, deleteSlot, type SlotId } from "../lib/saves";

export function SaveSlotSelect({ onPick }: { onPick: (slot: SlotId) => void }) {
  const [, force] = useState(0);
  const summaries = allSlotSummaries();
  const [confirmDelete, setConfirmDelete] = useState<SlotId | null>(null);

  return (
    <div className="slot-select">
      <main className="slot-select-shell">
        <header className="slot-select-head">
          <NetworkMark />
          <div className="slot-select-title">
            <span className="slot-kicker">Local companion archive</span>
            <h1>Netherloom</h1>
            <p>Choose which network companion should wake with this router.</p>
          </div>
          <div className="slot-storage-status">
            <Database size={16} />
            <span>
              Browser storage
              <strong>Available</strong>
            </span>
          </div>
        </header>

        <div className="slot-list">
          {summaries.map((s) => (
            <article key={s.slot} className={`slot-card${s.empty ? " empty" : " occupied"}`}>
              <div className="slot-card-top">
                <span className="slot-no">Save {String(s.slot).padStart(2, "0")}</span>
                <span className={`slot-state ${s.empty ? "empty" : ""}`}>
                  <i />
                  {s.empty ? "Open channel" : "Stored locally"}
                </span>
              </div>
              {s.empty ? (
                <button className="slot-main new" onClick={() => onPick(s.slot)}>
                  <span className="slot-empty-mark">
                    <Plus size={26} />
                  </span>
                  <span className="slot-copy">
                    <strong>New companion</strong>
                    <small>Start a separate journey on this router.</small>
                  </span>
                  <span className="slot-action">
                    Begin <ChevronRight size={17} />
                  </span>
                </button>
              ) : (
                <>
                  <button className="slot-main" onClick={() => onPick(s.slot)}>
                    <span className="slot-pet-stage">
                      <span className="slot-pet-ring" />
                      <PetSprite petId={s.petId} size={148} baseScale={0.96} alt={s.name} />
                      <span className="slot-level">LVL {s.level}</span>
                    </span>
                    <span className="slot-copy">
                      <small className="slot-copy-label">Network companion</small>
                      <strong>{s.name}</strong>
                      <span>{s.title}</span>
                      {s.createdAt ? (
                        <em>Linked {new Date(s.createdAt).toLocaleDateString()}</em>
                      ) : null}
                    </span>
                    <span className="slot-action">
                      Continue <ChevronRight size={17} />
                    </span>
                  </button>
                  {confirmDelete === s.slot ? (
                    <div className="slot-confirm">
                      <span>
                        <strong>Delete this companion?</strong>
                        This cannot be undone.
                      </span>
                      <button
                        className="danger"
                        onClick={() => {
                          deleteSlot(s.slot);
                          setConfirmDelete(null);
                          force((n) => n + 1);
                        }}
                      >
                        Delete
                      </button>
                      <button onClick={() => setConfirmDelete(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button
                      className="slot-delete"
                      aria-label={`Delete save ${s.slot}`}
                      title={`Delete save ${s.slot}`}
                      onClick={() => setConfirmDelete(s.slot)}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </>
              )}
            </article>
          ))}
        </div>

        <p className="slot-note">
          <ShieldCheck size={15} />
          Progress stays in this browser. Create portable backups from Settings.
        </p>
      </main>
    </div>
  );
}
