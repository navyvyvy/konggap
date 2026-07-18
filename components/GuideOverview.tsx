"use client";

import { Children, type ReactNode, useState } from "react";

const topics = ["등급·생두", "품종·이력", "향미·평가"];

export function GuideOverview({ children }: { children: ReactNode }) {
  const [activeTopic, setActiveTopic] = useState(0);

  return (
    <div className="footerGuideBrowser">
      <div aria-label="안내 주제" className="footerTopicTabs" role="tablist">
        {topics.map((topic, index) => (
          <button
            aria-selected={activeTopic === index}
            key={topic}
            onClick={() => setActiveTopic(index)}
            role="tab"
            type="button"
          >
            {topic}
          </button>
        ))}
      </div>
      <div className="footerInfoGrid">
        {Children.map(children, (child, index) => (
          <div className="footerGuidePanel" data-active={activeTopic === index}>{child}</div>
        ))}
      </div>
    </div>
  );
}
