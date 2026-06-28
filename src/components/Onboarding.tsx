import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, RefreshCw, Wifi } from "lucide-react";
import { NetworkMark } from "./ui";
import {
  displayCreatureName,
  filterForCreature,
  personality,
  spriteForCreature,
  suggestCreatures,
} from "../lib/progression";
import { useObservatory } from "../state/ObservatoryProvider";

type Step = "welcome" | "connect" | "choose" | "name";
const ORDER: Step[] = ["welcome", "connect", "choose", "name"];

export function Onboarding() {
  const { settings, saveSettings, testConnection, connectionTest, chooseCreature } = useObservatory();

  const [step, setStep] = useState<Step>("welcome");
  const [password, setPassword] = useState(settings.password);
  const [pollSeconds, setPollSeconds] = useState(String(settings.pollSeconds));
  const [picks, setPicks] = useState<string[]>(() => suggestCreatures(3));
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");

  const index = ORDER.indexOf(step);
  const go = (next: Step) => setStep(next);

  const persistConnection = () => {
    saveSettings({
      password,
      pollSeconds: Number(pollSeconds) || 5,
      defaultMode: settings.defaultMode,
      theme: settings.theme,
    });
  };

  const finish = () => {
    if (!selected) return;
    chooseCreature(selected, name);
  };

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-head">
          <NetworkMark />
          <div>
            <h1>Netherloom Setup</h1>
            <p>Let's connect your I2P router and hatch your companion.</p>
          </div>
        </div>

        <div className="onboarding-steps">
          {ORDER.map((s, i) => (
            <i key={s} className={i <= index ? "done" : ""} />
          ))}
        </div>

        {step === "welcome" ? (
          <div className="onboarding-step">
            <h2>Welcome to Netherloom</h2>
            <p className="onboarding-lead">
              Netherloom turns your I2P router into a living world. A pixel companion grows in real time from your
              router's actual contribution to the network — tunnels carried, bandwidth shared, uptime.
            </p>
            <ul className="onboarding-list">
              <li>Connect to your router for verified live stats and pet reactions</li>
              <li>Choose a companion that starts at Level 0</li>
              <li>Watch it level up and evolve as you help the network</li>
            </ul>
            <div className="onboarding-nav">
              <span />
              <button className="primary" onClick={() => go("connect")}>
                Get started <ArrowRight size={15} />
              </button>
            </div>
          </div>
        ) : null}

        {step === "connect" ? (
          <div className="onboarding-step">
            <h2>Connect your router</h2>
            <p className="onboarding-lead">
              Netherloom reads live data through your router's <strong>I2PControl</strong> JSON-RPC API. On Java-I2P 2.10+
              it's built in but starts disabled — enable it once:
            </p>
            <ul className="onboarding-list">
              <li>Open <code>http://127.0.0.1:7657/configwebapps</code>, find the <code>jsonrpc</code> webapp, click <em>Start</em> and tick <em>run at startup</em>.</li>
              <li>Open <code>http://127.0.0.1:7657/jsonrpc/</code> and set an initial password.</li>
              <li>Enter that password below and test. You can finish setup while disconnected and connect later.</li>
            </ul>
            <label className="onboarding-field">
              <span>I2PControl password</span>
              <input type="password" value={password} placeholder="itoopie" onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label className="onboarding-field">
              <span>Poll interval (seconds)</span>
              <input type="number" min={1} max={120} value={pollSeconds} onChange={(e) => setPollSeconds(e.target.value)} />
            </label>
            <div className="onboarding-test">
              <button
                className="ghost"
                onClick={() => {
                  persistConnection();
                  testConnection(password);
                }}
                disabled={connectionTest.state === "testing"}
              >
                <Wifi size={15} /> {connectionTest.state === "testing" ? "Testing…" : "Test connection"}
              </button>
              {connectionTest.state === "ok" || connectionTest.state === "error" ? (
                <p className={`conn-result ${connectionTest.state}`}>{connectionTest.detail}</p>
              ) : null}
            </div>
            <div className="onboarding-nav">
              <button className="ghost" onClick={() => go("welcome")}>
                <ArrowLeft size={15} /> Back
              </button>
              <div className="onboarding-nav-right">
                <button
                  className="ghost"
                  onClick={() => {
                    persistConnection();
                    go("choose");
                  }}
                >
                  Skip for now
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    persistConnection();
                    go("choose");
                  }}
                >
                  Continue <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === "choose" ? (
          <div className="onboarding-step">
            <h2>Choose your companion</h2>
            <p className="onboarding-lead">It starts at Level 0 and grows with your router's contribution.</p>
            <div className="onboarding-grid">
              {picks.map((id) => (
                <button
                  key={id}
                  className={`onboarding-pick${selected === id ? " selected" : ""}`}
                  onClick={() => setSelected(id)}
                >
                  <div className="onboarding-art">
                    <img
                      src={spriteForCreature(id)}
                      style={{ filter: filterForCreature(id) }}
                      alt={displayCreatureName(id)}
                    />
                  </div>
                  <strong>{displayCreatureName(id)}</strong>
                  <span>{personality(id)}</span>
                </button>
              ))}
            </div>
            <div className="onboarding-nav">
              <button className="ghost" onClick={() => go("connect")}>
                <ArrowLeft size={15} /> Back
              </button>
              <div className="onboarding-nav-right">
                <button
                  className="ghost"
                  onClick={() => {
                    setSelected(null);
                    setPicks(suggestCreatures(3, picks));
                  }}
                >
                  <RefreshCw size={15} /> Suggest others
                </button>
                <button
                  className="primary"
                  disabled={!selected}
                  onClick={() => {
                    setName(selected ? displayCreatureName(selected) : "");
                    go("name");
                  }}
                >
                  Continue <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === "name" ? (
          <div className="onboarding-step">
            <h2>Name your companion</h2>
            <div className="onboarding-name-art">
              <div className="onboarding-art">
                <img
                  src={selected ? spriteForCreature(selected) : ""}
                  style={{ filter: selected ? filterForCreature(selected) : "none" }}
                  alt=""
                />
              </div>
              <label className="onboarding-field stacked">
                <span>Name</span>
                <input
                  className="name-input"
                  value={name}
                  maxLength={24}
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") finish();
                  }}
                />
              </label>
            </div>
            <div className="onboarding-nav">
              <button className="ghost" onClick={() => go("choose")}>
                <ArrowLeft size={15} /> Back
              </button>
              <button className="primary" disabled={!selected} onClick={finish}>
                <Check size={15} /> Enter Netherloom
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
