import { useRef, useState } from "react";
import { Bug, Download, ExternalLink, FolderOpen, Github, Upload } from "lucide-react";
import { useObservatory, type Mode, type Theme } from "../state/ObservatoryProvider";
import { exportSave, importSave, getActiveSlot, setActiveSlot } from "../lib/saves";

export function SettingsView() {
  const {
    settings,
    saveSettings,
    testConnection,
    connectionTest,
    source,
    pluginAvailable,
    creatureName,
    renameCreature,
    exportSnapshot,
    autoCare,
    setAutoCare,
  } = useObservatory();

  const [password, setPassword] = useState(settings.password);
  const [pollSeconds, setPollSeconds] = useState(String(settings.pollSeconds));
  const [defaultMode, setDefaultMode] = useState<Mode>(settings.defaultMode);
  const [theme, setTheme] = useState<Theme>(settings.theme);
  const [saved, setSaved] = useState(false);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const activeSlot = getActiveSlot();

  const onSave = () => {
    saveSettings({ password, pollSeconds: Number(pollSeconds) || 5, defaultMode, theme });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const downloadSave = () => {
    const blob = new Blob([JSON.stringify(exportSave(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `netherloom-save-slot${activeSlot ?? 1}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const onImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = importSave(String(reader.result ?? ""));
      if (result.ok) {
        setImportMsg({ ok: true, text: "Save restored — reloading…" });
        window.setTimeout(() => window.location.reload(), 700);
      } else {
        setImportMsg({ ok: false, text: result.error ?? "Import failed." });
      }
    };
    reader.readAsText(file);
  };

  const switchSlot = () => {
    setActiveSlot(null);
    window.location.reload();
  };

  return (
    <section className="view-page">
      <header className="view-head">
        <h2>Settings</h2>
        <p>Connect Netherloom to your local I2P router via I2PControl.</p>
      </header>

      <div className="view-grid two">
        <div className="metric-panel settings-form">
          <span className="view-label">I2PControl Connection</span>
          <p className="settings-hint">
            Requires the <code>jsonrpc</code> webapp in your router console at{" "}
            <code>http://127.0.0.1:7657/configwebapps</code> (Start, then run at startup). Set its password at{" "}
            <code>http://127.0.0.1:7657/jsonrpc/</code> — default <code>itoopie</code> until you change it.
          </p>

          <label>
            <span>Plugin</span>
            <em className={pluginAvailable ? "tone-green" : "tone-violet"}>
              {pluginAvailable ? "Plugin server reachable" : "Not detected (dev / standalone)"}
            </em>
          </label>
          <label>
            <span>Data source</span>
            <em className={source === "live" ? "tone-green" : "tone-violet"}>
              {source === "live" ? "Live router" : "Disconnected — no synthetic data"}
            </em>
          </label>

          <label>
            <span>I2PControl password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="itoopie"
            />
          </label>
          <label>
            <span>Poll interval (seconds)</span>
            <input
              type="number"
              min={1}
              max={120}
              value={pollSeconds}
              onChange={(event) => setPollSeconds(event.target.value)}
            />
          </label>
          <label>
            <span>Default mode</span>
            <select value={defaultMode} onChange={(event) => setDefaultMode(event.target.value as Mode)}>
              <option value="Living">Living</option>
              <option value="Technical">Technical</option>
            </select>
          </label>
          <label>
            <span>Theme</span>
            <select value={theme} onChange={(event) => setTheme(event.target.value as Theme)}>
              <option value="Dark">Dark</option>
              <option value="Light">Light</option>
            </select>
          </label>

          <div className="settings-actions">
            <button className="primary" onClick={onSave}>
              {saved ? "Saved ✓" : "Save settings"}
            </button>
            <button
              onClick={() => testConnection(password)}
              disabled={connectionTest.state === "testing"}
            >
              {connectionTest.state === "testing" ? "Testing…" : "Test connection"}
            </button>
          </div>

          {connectionTest.state === "ok" || connectionTest.state === "error" ? (
            <p className={`conn-result ${connectionTest.state}`}>{connectionTest.detail}</p>
          ) : null}
        </div>

        <div className="metric-panel settings-form">
          <span className="view-label">Creature</span>
          <label>
            <span>Name</span>
            <input value={creatureName} onChange={(event) => renameCreature(event.target.value)} maxLength={24} />
          </label>
          <p className="settings-hint">
            Settings and the creature name are stored locally in your browser. The I2PControl password is sent only to
            the local plugin proxy, never to a remote server.
          </p>
          <button className="snapshot-button" onClick={exportSnapshot}>
            <Download size={15} />
            Export session snapshot
          </button>
          <p className="settings-hint">
            The JSON export contains abstract metrics and local progression only. Credentials, peer identities and
            routes are never included.
          </p>

          <span className="view-label" style={{ marginTop: 18, display: "block" }}>Auto-Care (Smart Feeder)</span>
          <label>
            <span>Enable auto-use of care items</span>
            <em className={autoCare.enabled ? "tone-green" : "tone-violet"}>
              <input
                type="checkbox"
                checked={autoCare.enabled}
                onChange={(event) => setAutoCare({ ...autoCare, enabled: event.target.checked })}
                style={{ marginRight: 8 }}
              />
              {autoCare.enabled ? "Active — items auto-used when stats drop below thresholds" : "Disabled"}
            </em>
          </label>
          <label>
            <span>Auto-feed at hunger below (%)</span>
            <input
              type="number"
              min={0}
              max={80}
              value={autoCare.feedThreshold}
              disabled={!autoCare.enabled}
              onChange={(event) => setAutoCare({ ...autoCare, feedThreshold: Number(event.target.value) || 0 })}
            />
          </label>
          <label>
            <span>Auto-clean at cleanliness below (%)</span>
            <input
              type="number"
              min={0}
              max={80}
              value={autoCare.cleanThreshold}
              disabled={!autoCare.enabled}
              onChange={(event) => setAutoCare({ ...autoCare, cleanThreshold: Number(event.target.value) || 0 })}
            />
          </label>
          <label>
            <span>Auto-play at fun below (%)</span>
            <input
              type="number"
              min={0}
              max={80}
              value={autoCare.playThreshold}
              disabled={!autoCare.enabled}
              onChange={(event) => setAutoCare({ ...autoCare, playThreshold: Number(event.target.value) || 0 })}
            />
          </label>
          <p className="settings-hint">
            Uses the most expensive care item you own in each category (best effect first). Checks every 15 seconds. Disabled categories stay manual.
          </p>
        </div>
      </div>

      <div className="metric-panel settings-form">
        <span className="view-label">Save &amp; Backup</span>
        <label>
          <span>Active save</span>
          <em className="tone-green">Slot {activeSlot ?? 1}</em>
        </label>
        <p className="settings-hint">
          Progress autosaves to this slot in your browser and survives plugin updates. Download a backup to keep it safe
          across browsers or machines — importing restores it into the current slot.
        </p>
        <div className="settings-actions">
          <button onClick={switchSlot}>
            <FolderOpen size={15} /> Switch save slot
          </button>
          <button onClick={downloadSave}>
            <Download size={15} /> Download save
          </button>
          <button onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Import save
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImportFile(file);
              event.target.value = "";
            }}
          />
        </div>
        {importMsg ? (
          <p className={`conn-result ${importMsg.ok ? "ok" : "error"}`}>{importMsg.text}</p>
        ) : null}
      </div>

      <div className="metric-panel settings-form">
        <span className="view-label">Feedback &amp; Links</span>
        <p className="settings-hint">
          Netherloom is free and open-source under AGPL-3.0. Found a bug, have an idea, or want to contribute?
        </p>
        <div className="settings-actions">
          <a className="settings-link" href="https://github.com/hendkai/Netherloom/issues/new" target="_blank" rel="noopener noreferrer">
            <Bug size={15} /> Report a bug / Request a feature
          </a>
          <a className="settings-link" href="https://github.com/hendkai/Netherloom/issues" target="_blank" rel="noopener noreferrer">
            <ExternalLink size={15} /> Browse issues
          </a>
          <a className="settings-link" href="https://github.com/hendkai/Netherloom" target="_blank" rel="noopener noreferrer">
            <Github size={15} /> Source code
          </a>
        </div>
        <p className="settings-hint">
          Licensed under <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer">AGPL-3.0-or-later</a>.
          No accounts, no payments, no remote servers.
        </p>
      </div>
    </section>
  );
}
