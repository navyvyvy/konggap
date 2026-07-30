"use client";

import { useEffect, useRef, useState } from "react";

const tabs = ["원두·장비", "사전 세팅", "핫 레시피", "아이스", "맛 조절"];

const gear = [
  ["저울", "0.1g·1초 단위, 빠른 반응"],
  ["그라인더", "입문은 전동, 이후 분쇄 균일도"],
  ["드립포트", "1°C 조절과 안정적인 직선형 수구"],
  ["드리퍼", "레시피가 많은 V60 02"],
  ["필터", "빠른 물빠짐과 밀폐 보관"],
  ["센서리잔", "향이 모이는 좁은 입구"],
  ["서버", "투명한 유리, 스월링 쉬운 형태"],
];

const setup = [
  ["계량", "20.4g", "그라인더에 남는 0.3~0.4g까지 고려"],
  ["RDT", "2회", "한 번 분사하고 흔드는 과정을 두 번"],
  ["분쇄", "약 1,050μm", "중간보다 조금 굵은 지점에서 시작"],
  ["린싱", "찬물 → 뜨거운 물", "필터를 밀착하고 예열한 물은 버리기"],
  ["평탄화", "가볍게 흔들기", "드리퍼를 치면 미분이 벽으로 몰릴 수 있음"],
];

const hotPours = [
  ["0:00", "+60g", "누적 60g · 뜸 40초"],
  ["0:40", "+80g", "누적 140g"],
  ["약 1:20", "+80g", "누적 220g"],
  ["약 2:00", "+80g", "누적 300g"],
];

const icedPours = [
  ["0:00", "+40g", "누적 40g · 뜸 40초"],
  ["0:40", "+50g", "누적 90g"],
  ["약 1:10", "+60g", "누적 150g"],
  ["약 1:40", "+50g", "누적 200g"],
];

function PourRows({ rows }: { rows: string[][] }) {
  return (
    <ol className="brewPourRows">
      {rows.map(([time, amount, note]) => (
        <li key={`${time}-${amount}`}><time>{time}</time><strong>{amount}</strong><span>{note}</span></li>
      ))}
    </ol>
  );
}

export function CoffeeTips() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.18 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const alignDeck = () => {
    const section = sectionRef.current;
    if (section) window.scrollTo(0, window.scrollY + section.getBoundingClientRect().top);
  };
  const move = (offset: number) => {
    alignDeck();
    setActive((current) => (current + offset + tabs.length) % tabs.length);
  };
  const selectSlide = (index: number) => {
    alignDeck();
    setActive(index);
  };
  const onPointerUp = (event: React.PointerEvent) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 54 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
  };

  const slide = [
    <>
      <header className="brewSlideHeading"><span>01</span><div><h2>원두와 장비는 이 순서</h2><p>처음부터 비싼 장비보다 반복 가능한 조건을 먼저 만듭니다.</p></div></header>
      <div className="brewSequence" aria-label="원두 입문 순서"><span>중배전</span><span>중배전 싱글</span><span>약배전 워시드</span><span>약배전 내추럴</span></div>
      <dl className="brewGearGrid">{gear.map(([name, note]) => <div key={name}><dt>{name}</dt><dd>{note}</dd></div>)}</dl>
      <p className="brewFootnote">원두는 로스팅 후 1~3주가 대체로 안정적입니다. 2~3주 안에 마신다면 아로마 밸브 봉투를 밀봉해 어두운 실온에 둡니다.</p>
    </>,
    <>
      <header className="brewSlideHeading"><span>02</span><div><h2>추출 전 세팅</h2><p>원두 20g을 실제로 드리퍼에 넣기 위한 준비입니다.</p></div></header>
      <dl className="brewSetupRows">{setup.map(([name, value, note]) => <div key={name}><dt>{name}</dt><dd><strong>{value}</strong><span>{note}</span></dd></div>)}</dl>
      <div className="brewTemperatures"><span>약배전 <strong>92~94°C</strong></span><span>중배전 <strong>88~90°C</strong></span><span>강배전 <strong>84~86°C</strong></span></div>
      <p className="brewFootnote">찬 수돗물을 기본으로 쓰되 배관 상태가 걱정되면 기본 정수 필터나 아이시스 8.0·백산수·평창수처럼 무난한 물부터 비교합니다.</p>
    </>,
    <>
      <header className="brewSlideHeading"><span>03</span><div><h2>핫 20g : 300g</h2><p>1:15 비율. 뜸 40초 뒤 물이 거의 빠질 때 다음 물을 붓습니다.</p></div></header>
      <div className="brewRatio"><strong>1:15</strong><span>목표 완료 약 2:40</span></div>
      <PourRows rows={hotPours} />
      <ul className="brewRules"><li>500원 크기의 작은 원을 그리며 가운데 중심으로 붓기</li><li>필터 벽에서 1cm 안쪽까지만 이동하기</li><li>포트 뚜껑은 닫고, 물은 자연스럽게 식도록 두기</li></ul>
    </>,
    <>
      <header className="brewSlideHeading"><span>04</span><div><h2>아이스 20g : 200g</h2><p>1:10 비율. 붓는 양만 다르고 흐름은 핫과 같습니다.</p></div></header>
      <div className="brewRatio brewRatioIce"><strong>1:10</strong><span>목표 완료 약 2:10</span></div>
      <PourRows rows={icedPours} />
      <p className="brewCallout">추출이 끝나면 얼음이 가득 든 잔에 바로 옮기고 충분히 저어 온도와 농도를 맞춥니다.</p>
    </>,
    <>
      <header className="brewSlideHeading"><span>05</span><div><h2>맛은 한 변수씩 잡기</h2><p>물·온도·분쇄도를 한꺼번에 바꾸면 원인을 찾기 어렵습니다.</p></div></header>
      <div className="brewAdjustGrid">
        <article><span>쓰고 떫다 · 과다 추출</span><h3>물을 더하고, 다음에는 굵게</h3><p>현재 잔에는 물을 20g씩 더합니다. 다음 추출은 분쇄도만 굵게 조정하되 총 시간이 2:10보다 짧아지지 않게 봅니다.</p></article>
        <article><span>밋밋하고 신맛이 찌른다 · 과소 추출</span><h3>다음에는 조금 더 곱게</h3><p>다른 조건은 그대로 두고 분쇄도만 곱게 조정합니다. 총 추출이 2:50을 넘지 않는 범위에서 찾습니다.</p></article>
      </div>
      <p className="brewCallout">한 번에 한 칸만 바꾸고 기록합니다. 2:10~2:50은 맛을 조정할 때 지켜볼 안전 범위입니다.</p>
    </>,
  ][active];

  return (
    <section className="brewTips" id="coffee-tips" aria-labelledby="coffee-tips-title" ref={sectionRef}>
      <div
        className="brewTipsShell"
        data-visible={visible}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") move(-1);
          if (event.key === "ArrowRight") move(1);
        }}
        onPointerDown={(event) => { pointerStart.current = { x: event.clientX, y: event.clientY }; }}
        onPointerUp={onPointerUp}
        tabIndex={0}
      >
        <header className="brewTipsHeader">
          <div><span>HAND DRIP GUIDE</span><strong id="coffee-tips-title">핸드드립 입문 노트</strong></div>
          <nav className="brewTipsTabs" role="tablist" aria-label="핸드드립 단계">
            {tabs.map((tab, index) => <button aria-controls="brew-tip-panel" aria-label={tab} aria-selected={active === index} id={`brew-tip-${index}`} key={tab} onClick={() => selectSlide(index)} role="tab" type="button"><b>0{index + 1}</b><span>{tab}</span></button>)}
          </nav>
        </header>
        <article className="brewSlide" data-active="true" id="brew-tip-panel" key={active} role="tabpanel" aria-labelledby={`brew-tip-${active}`}>
          <figure className="brewSlideVisual"><img src={`/tips/${["tips-gear.jpg", "tips-setup.jpg", "tips-hot.jpg", "tips-iced.jpg", "tips-taste.jpg"][active]}`} alt={["저울 위에서 계량하는 커피 원두", "필터에 뜨거운 물을 붓는 핸드드립", "따뜻한 핸드드립 커피", "얼음 잔에 커피를 붓는 모습", "커피 향과 맛을 확인하는 커퍼"][active]} /></figure>
          <div className="brewSlideCopy">{slide}</div>
        </article>
        <footer className="brewTipsFooter"><button onClick={() => move(-1)} type="button">이전</button><span><strong>{active + 1}</strong> / {tabs.length} · {tabs[active]}</span><button onClick={() => move(1)} type="button">다음</button></footer>
      </div>
    </section>
  );
}
