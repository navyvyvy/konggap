"use client";

import { useEffect, useRef, useState } from "react";

export type OriginGuide = {
  origin: string;
  count: number;
  example: string;
  notes: string[];
  roast: string;
  description: string;
  acidity: string;
  body: string;
  brew: string;
  images: number[];
};

export function OriginExplorer({ guides, imageSrcs }: { guides: OriginGuide[]; imageSrcs: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = guides[activeIndex];
  const activeImages = active.images;
  const currentImage = imageSrcs[activeImages[photoIndex]];
  const selectOrigin = (index: number) => {
    setActiveIndex(index);
    setPhotoIndex(0);
  };
  const selectRelative = (step: number) => selectOrigin((activeIndex + step + guides.length) % guides.length);
  const selectPhotoRelative = (step: number) => setPhotoIndex((photoIndex + step + activeImages.length) % activeImages.length);

  useEffect(() => {
    tabRefs.current[activeIndex]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeIndex]);

  return (
    <section className="originAtlas" aria-labelledby="origin-atlas-title">
      <header className="originAtlasHeader">
        <div>
          <span>791개 원두 기록으로 정리한</span>
          <h2 id="origin-atlas-title">산지별 커피 도감</h2>
        </div>
        <p>산지를 골라 맛의 성격과 어울리는 추출법을 확인하세요.</p>
      </header>

      <div className="originTabBar">
        <button className="originTabStep" aria-label="이전 산지 보기" onClick={() => selectRelative(-1)} type="button">이전</button>
        <nav className="originTabs" aria-label="커피 산지 선택">
          {guides.map((guide, index) => (
            <button
              aria-pressed={index === activeIndex}
              className="originTab"
              key={guide.origin}
              onClick={() => selectOrigin(index)}
              ref={(element) => { tabRefs.current[index] = element; }}
              type="button"
            >
              {guide.origin}
            </button>
          ))}
        </nav>
        <button className="originTabStep" aria-label="다음 산지 보기" onClick={() => selectRelative(1)} type="button">다음</button>
      </div>

      <div className="originStage">
        <figure className="originVisual" key={`image-${active.origin}-${photoIndex}`}>
          <img
            alt={`${active.origin} 커피 산지와 생산 과정`}
            className="originImage"
            height="418"
            src={currentImage}
            width="418"
          />
          <div className="originPhotoControls">
            <button aria-label="이전 사진" disabled={activeImages.length === 1} onClick={() => selectPhotoRelative(-1)} type="button">
              이전
            </button>
            <span>사진 {photoIndex + 1} / {activeImages.length}</span>
            <button aria-label="다음 사진" disabled={activeImages.length === 1} onClick={() => selectPhotoRelative(1)} type="button">
              다음
            </button>
          </div>
        </figure>

        <article className="originProfile" key={active.origin} aria-live="polite">
          <div className="originProfileHeading">
            <div>
              <span>{active.count}개 기록</span>
              <h3>{active.origin}</h3>
            </div>
            <strong>{active.notes.slice(0, 2).join(" · ")}</strong>
          </div>
          <p className="originDescription">{active.description}</p>
          <dl className="originTraits">
            <div><dt>산미</dt><dd>{active.acidity}</dd></div>
            <div><dt>바디</dt><dd>{active.body}</dd></div>
            <div><dt>잘 맞는 추출</dt><dd>{active.brew}</dd></div>
          </dl>
          <div className="originProfileMeta">
            <p><span>기록상 주요 배전</span><strong>{active.roast}</strong></p>
            <p><span>원두 예시</span><strong>{active.example}</strong></p>
          </div>
          <div className="originControls">
            <button aria-label="이전 산지" onClick={() => selectRelative(-1)} type="button">이전</button>
            <span>{activeIndex + 1} / {guides.length}</span>
            <button aria-label="다음 산지" onClick={() => selectRelative(1)} type="button">다음</button>
          </div>
        </article>
      </div>
    </section>
  );
}
