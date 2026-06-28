import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, X } from "lucide-react";
import { GUIDE_SECTIONS } from "../lib/guideContent";
import { useObservatory } from "../state/ObservatoryProvider";

export function GuideModal() {
  const { setGuideOpen, setView } = useObservatory();
  const [index, setIndex] = useState(0);
  const section = GUIDE_SECTIONS[index];
  const isLast = index === GUIDE_SECTIONS.length - 1;

  const close = () => setGuideOpen(false);
  const goto = () => {
    if (section.goto) setView(section.goto);
    close();
  };

  return (
    <div className="guide-modal-backdrop" role="dialog" aria-modal="true">
      <div className="guide-modal">
        <button className="guide-modal-close" onClick={close} aria-label="Close">
          <X size={16} />
        </button>

        <div className="guide-modal-head">
          <BookOpen size={18} />
          <div>
            <span>Netherloom Guide</span>
            <h3>{section.title}</h3>
          </div>
        </div>

        <div className="guide-modal-progress">
          {GUIDE_SECTIONS.map((s, i) => (
            <i key={s.id} className={i <= index ? "done" : ""} style={i === index ? { background: section.accent } : undefined} />
          ))}
        </div>

        <div className="guide-modal-body">
          <div className="guide-modal-icon" style={{ background: `${section.accent}22`, color: section.accent }}>
            <span>{section.icon}</span>
          </div>
          <p className="guide-modal-blurb">{section.blurb}</p>
          <div className="guide-modal-text">
            {section.body.map((line, i) => <p key={i}>{line}</p>)}
          </div>
          {section.tips && section.tips.length > 0 ? (
            <div className="guide-modal-tips" style={{ borderColor: `${section.accent}55` }}>
              <strong style={{ color: section.accent }}>Tips</strong>
              <ul>
                {section.tips.map((tip, i) => <li key={i}>{tip}</li>)}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="guide-modal-nav">
          <button className="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
            <ArrowLeft size={14} /> Back
          </button>
          <span className="guide-modal-counter">{index + 1} / {GUIDE_SECTIONS.length}</span>
          <div className="guide-modal-nav-right">
            {section.goto ? (
              <button className="goto" onClick={goto} style={{ borderColor: section.accent, color: section.accent }}>
                Open {section.shortTitle}
              </button>
            ) : null}
            {isLast ? (
              <button className="primary" onClick={close}>Done</button>
            ) : (
              <button className="primary" onClick={() => setIndex((i) => Math.min(GUIDE_SECTIONS.length - 1, i + 1))}>
                Next <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
