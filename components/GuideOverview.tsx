"use client";

import { Children, isValidElement, type ReactNode, useEffect, useRef, useState } from "react";
import guideGrade from "../public/tips/tips-gear.jpg";
import guideTaste from "../public/tips/tips-taste.jpg";
import guideFarm from "../public/origins/origin-02.jpg";
import guideVariety from "../public/origins/origin-04.jpg";
import guideDrying from "../public/origins/origin-05.jpg";
import guideGreenBean from "../public/origins/origin-06.jpg";

const topics = ["등급", "생두", "품종", "가공", "이력", "향미"];
const guideImages = [
  [guideGrade.src, "저울로 살펴보는 커피 원두"],
  [guideGreenBean.src, "세척 과정에 놓인 생두"],
  [guideVariety.src, "가지에서 익어가는 커피 체리"],
  [guideDrying.src, "건조대에서 가공 중인 커피"],
  [guideFarm.src, "산지의 커피 농장과 지형"],
  [guideTaste.src, "향과 맛을 살피는 커피"],
];

export function GuideOverview({ children }: { children: ReactNode }) {
  const [activeTopic, setActiveTopic] = useState(0);
  const [direction, setDirection] = useState<"next" | "previous">("next");
  const [visible, setVisible] = useState(false);
  const browserRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<number | null>(null);
  const slides = Children.toArray(children).flatMap((group) => isValidElement<{ children: ReactNode }>(group) ? Children.toArray(group.props.children) : []);
  const selectRelative = (step: number) => {
    setDirection(step > 0 ? "next" : "previous");
    setActiveTopic((activeTopic + step + slides.length) % slides.length);
  };
  const selectTopic = (index: number) => {
    setDirection(index >= activeTopic ? "next" : "previous");
    setActiveTopic(index);
  };

  useEffect(() => {
    const browser = browserRef.current;
    if (!browser) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(browser);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`footerGuideBrowser${visible ? " isVisible" : ""}`} ref={browserRef}>
      <div className="footerGuideNav">
        <div aria-label="안내 주제" className="footerTopicTabs" role="tablist">
          {topics.map((topic, index) => (
            <button
              aria-controls="coffee-guide-panel"
              aria-selected={activeTopic === index}
              id={`coffee-guide-tab-${index}`}
              key={topic}
              onClick={() => selectTopic(index)}
              role="tab"
              type="button"
            >
              {topic}
            </button>
          ))}
        </div>
        <div className="footerGuideControls">
          <button aria-label="이전 커피 정보" onClick={() => selectRelative(-1)} type="button">이전</button>
          <span>{activeTopic + 1} / {slides.length}</span>
          <button aria-label="다음 커피 정보" onClick={() => selectRelative(1)} type="button">다음</button>
        </div>
      </div>
      <div
        aria-labelledby={`coffee-guide-tab-${activeTopic}`}
        className="footerInfoGrid"
        data-direction={direction}
        id="coffee-guide-panel"
        key={activeTopic}
        onPointerDown={(event) => { pointerStart.current = event.clientX; }}
        onPointerUp={(event) => {
          if (pointerStart.current === null) return;
          const distance = event.clientX - pointerStart.current;
          pointerStart.current = null;
          if (Math.abs(distance) > 45) selectRelative(distance < 0 ? 1 : -1);
        }}
        role="tabpanel"
      >
        <div className="footerGuidePanel" data-active="true" data-slide={activeTopic}>
          <figure className="footerGuideVisual">
            <img alt={guideImages[activeTopic][1]} height="720" src={guideImages[activeTopic][0]} width="960" />
          </figure>
          <div className="footerGuideCopy">{slides[activeTopic]}</div>
        </div>
      </div>
    </div>
  );
}
