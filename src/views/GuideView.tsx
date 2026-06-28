import { useState } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { GUIDE_CATEGORIES, GUIDE_SECTIONS, type GuideSection } from "../lib/guideContent";
import { useObservatory } from "../state/ObservatoryProvider";

type FilterOption = "all" | GuideSection["category"];

const FILTER_OPTIONS: FilterOption[] = ["all", ...GUIDE_CATEGORIES.map((c) => c.id)];

export function GuideView() {
  const { setView, setGuideOpen } = useObservatory();
  const [filter, setFilter] = useState<FilterOption>("all");

  const filtered = filter === "all"
    ? GUIDE_SECTIONS
    : GUIDE_SECTIONS.filter((s) => s.category === filter);

  const goto = (section: GuideSection) => {
    if (section.goto) setView(section.goto);
  };

  return (
    <section className="view-page">
      <header className="view-head">
        <h2>Guide</h2>
        <p>How Netherloom works — care, expeditions, eepsites, bosses, evolution, and more.</p>
      </header>

      <div className="guide-toolbar">
        <div className="guide-filters">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option}
              className={filter === option ? "selected" : ""}
              aria-pressed={filter === option}
              onClick={() => setFilter(option)}
            >
              {option === "all" ? "All" : GUIDE_CATEGORIES.find((c) => c.id === option)?.label ?? option}
            </button>
          ))}
        </div>
        <button className="guide-tour" onClick={() => setGuideOpen(true)}>
          <BookOpen size={13} /> Replay tour
        </button>
      </div>

      <div className="guide-grid">
        {filtered.map((section) => (
          <article
            key={section.id}
            className="guide-card"
            style={{ borderColor: `${section.accent}55`, background: `${section.accent}08` }}
          >
            <div className="guide-card-head">
              <div className="guide-card-icon" style={{ background: `${section.accent}22` }}>
                <span>{section.icon}</span>
              </div>
              <div>
                <strong style={{ color: section.accent }}>{section.title}</strong>
                <small>{section.blurb}</small>
              </div>
            </div>
            <div className="guide-card-body">
              {section.body.slice(0, 2).map((line, i) => <p key={i}>{line}</p>)}
            </div>
            {section.tips && section.tips.length > 0 ? (
              <div className="guide-card-tips">
                <strong>Tips</strong>
                <ul>
                  {section.tips.slice(0, 2).map((tip, i) => <li key={i}>{tip}</li>)}
                </ul>
              </div>
            ) : null}
            {section.goto ? (
              <button className="guide-card-goto" onClick={() => goto(section)} style={{ color: section.accent }}>
                Open {section.shortTitle} <ArrowRight size={12} />
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
