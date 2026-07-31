"use client";

import { useEffect, useRef, useState } from "react";

const tabs = ["원두 입문", "시기·보관", "저울·분쇄", "포트·드리퍼", "필터·잔", "추출 준비", "린싱", "핫", "아이스", "맛 조절"];

const beanPath = [
  ["브라질·중남미 블렌드", "중배전", "견과·캐러멜처럼 편안하고 고소한 단맛"],
  ["콜롬비아 싱글 오리진", "중배전", "초콜릿 단맛과 둥근 과일 산미"],
  ["에티오피아 워시드", "약배전·워시드", "감귤·복숭아·꽃처럼 맑고 산뜻한 향"],
  ["에티오피아 내추럴", "약배전·내추럴", "베리·체리처럼 농익은 과일과 발효 향"],
];

const grinderPath = [
  ["저울", "0.1g·1초", "숫자 단위보다 물을 부었을 때 빠르게 반응하는지가 중요"],
  ["입문", "기본형 전동", "편의성을 우선해 추출 과정부터 익히기"],
  ["기준 잡기", "고급 수동", "균일한 분쇄로 굵기 변화와 맛의 관계 배우기"],
  ["다음 단계", "고급 전동", "분쇄 기준이 잡힌 뒤 편의성과 균일도를 함께 가져가기"],
];

const finishingGear = [
  ["필터", "물 빠짐이 안정적인 흰색 종이 필터. 추출이 10~20초 달라질 수 있어 밀폐 보관"],
  ["센서리잔", "향이 모이는 넓은 몸통·좁은 입구. 필수 장비라기보다 향에 집중하는 도구"],
  ["서버", "투명 유리면 충분. 삼각형은 스월링할 때 덜 튀고 향을 모으기 편함"],
];

const setup = [
  ["계량", "20.4g", "그라인더에 남는 0.3~0.4g을 고려해 실제 투입량 20g 맞추기"],
  ["RDT", "2회", "한 번 분사하고 흔드는 과정을 두 번 반복해 정전기·비산·뭉침 줄이기"],
  ["분쇄", "약 1,050μm", "중간보다 조금 굵게 시작하고 그라인더 눈금은 맛을 보며 조정"],
];

const rinse = [
  ["필터 접기", "윗부분 0.5cm", "안으로 접고 벌린 뒤 모서리를 눌러 드리퍼에 넣기"],
  ["찬물 린싱", "강한 수압", "필터를 벽에 밀착해 물이 옆으로 새는 바이패스 줄이기"],
  ["뜨거운 물", "추가 린싱", "종이와 주변 냄새를 줄이고 드리퍼를 함께 예열하기"],
  ["린싱 물", "반드시 버리기", "예열이 끝나면 서버의 린싱 물을 비우기"],
  ["원두 담기", "중앙·가볍게", "살살 흔들어 평탄화하고 드리퍼를 두드리지 않기"],
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

const slideImages = ["tips-gear.jpg", "tips-storage.jpg", "tips-grinder.jpg", "tips-kettle.jpg", "tips-filter.jpg", "tips-setup.jpg", "tips-rinse.jpg", "tips-hot.jpg", "tips-iced.jpg", "tips-taste.jpg"];
const slideAlts = ["계량한 커피 원두", "용기에 담긴 커피 원두", "원두가 담긴 그라인더", "핸드드립용 드립 포트", "드리퍼에 놓인 종이 필터", "추출 전 원두 준비", "드리퍼에 물을 붓는 모습", "따뜻한 커피 추출", "얼음 잔에 커피를 붓는 모습", "커피 향과 맛을 확인하는 모습"];

function SetupRows({ rows }: { rows: string[][] }) {
  return <dl className="brewSetupRows">{rows.map(([name, value, note]) => <div key={name}><dt>{name}</dt><dd><strong>{value}</strong><span>{note}</span></dd></div>)}</dl>;
}

function PourRows({ rows }: { rows: string[][] }) {
  return <ol className="brewPourRows">{rows.map(([time, amount, note]) => <li key={`${time}-${amount}`}><time>{time}</time><strong>{amount}</strong><span>{note}</span></li>)}</ol>;
}

export function CoffeeTips() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const tabListRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.18 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const list = tabListRef.current;
    const tab = tabRefs.current[active];
    if (!list || !tab) return;
    list.scrollTo({ left: tab.offsetLeft - (list.clientWidth - tab.clientWidth) / 2, behavior: "smooth" });
  }, [active]);

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
      <header className="brewSlideHeading"><span>01</span><div><h2>산미는 단계적으로</h2><p>절제된 산미에서 밝은 산미로, 워시드에서 내추럴로 이동합니다.</p></div></header>
      <div className="brewSequence"><span>중배전</span><span>중배전 싱글</span><span>약배전 워시드</span><span>약배전 내추럴</span></div>
      <SetupRows rows={beanPath} />
    </>,
    <>
      <header className="brewSlideHeading"><span>02</span><div><h2>맛있는 시기와 보관</h2><p>갓 볶은 원두보다 가스가 충분히 빠진 뒤가 안정적입니다.</p></div></header>
      <SetupRows rows={[["맛있는 구간", "로스팅 후 1~3주", "디개싱이 진행되어 향과 추출이 안정되는 보편적인 구간"], ["2~3주 이내", "원래 봉투", "지퍼를 밀봉하고 아로마 밸브·차광 코팅이 있는 봉투 그대로 보관"], ["3~4주 이상", "전용 용기", "가스는 빼고 산소 유입은 막는 용기에 담아 어두운 실온에 보관"]]} />
      <p className="brewCallout">밀봉 지퍼가 없는 봉투도 전용 용기로 옮깁니다. 냉장고보다 산소·습기·빛을 막는 것이 먼저입니다.</p>
    </>,
    <>
      <header className="brewSlideHeading"><span>03</span><div><h2>저울과 그라인더</h2><p>최저가 장비를 반복 구매하기보다 오래 쓸 기준을 먼저 봅니다.</p></div></header>
      <SetupRows rows={grinderPath} />
      <p className="brewFootnote">저울은 4~5만원대에서도 충분하지만 반응이 느린 저가형은 물 양을 일정하게 맞추기 어렵습니다. 센서보다 반응 속도를 먼저 확인합니다.</p>
    </>,
    <>
      <header className="brewSlideHeading"><span>04</span><div><h2>포트와 드리퍼</h2><p>온도와 물줄기를 반복 가능하게 만드는 조합이 먼저입니다.</p></div></header>
      <div className="brewAdjustGrid">
        <article><span>전기 드립포트</span><h3>1°C 조절·직선형 수구</h3><p>배전도마다 온도가 달라 온도 조절이 중요합니다. 직선형은 가늘고 일정해 입문자가 강약을 안정적으로 다루기 쉽습니다.</p></article>
        <article><span>원뿔형 드리퍼</span><h3>플라스틱부터 시작</h3><p>가격과 접근성이 좋고 공유 레시피가 많은 형태가 편합니다. 중앙 위주로 붓고 벽을 피하면 바이패스를 줄일 수 있습니다.</p></article>
      </div>
      <p className="brewFootnote">곡선형 포트는 표현 범위가 넓지만 붓는 자세에 따라 유량이 크게 달라져 입문 단계에서는 난도가 높습니다.</p>
    </>,
    <>
      <header className="brewSlideHeading"><span>05</span><div><h2>필터·잔·서버</h2><p>맛에 직접 관여하는 순서와 선택 장비를 구분합니다.</p></div></header>
      <dl className="brewGearGrid">{finishingGear.map(([name, note]) => <div key={name}><dt>{name}</dt><dd>{note}</dd></div>)}</dl>
      <ul className="brewRules"><li>필터: 물 빠짐이 일정한 흰색 필터와 밀폐 보관함</li><li>센서리잔: 몸통이 넓고 입구가 좁아 향이 모이는 형태</li><li>서버: 얇고 투명한 유리, 부담 없는 가격</li></ul>
    </>,
    <>
      <header className="brewSlideHeading"><span>06</span><div><h2>계량·물·분쇄</h2><p>원두 20g이 실제로 드리퍼에 들어가도록 준비합니다.</p></div></header>
      <SetupRows rows={setup} />
      <div className="brewTemperatures"><span>약배전 <strong>92~94°C</strong></span><span>중배전 <strong>88~90°C</strong></span><span>강배전 <strong>84~86°C</strong></span></div>
      <p className="brewFootnote">찬 수돗물을 기본으로 쓰고 배관이 걱정되면 미네랄을 과하게 제거하지 않는 기본형 정수 필터를 사용합니다. 생수는 향이 강하지 않은 연수부터 비교합니다.</p>
    </>,
    <>
      <header className="brewSlideHeading"><span>07</span><div><h2>린싱과 원두 담기</h2><p>냄새 제거·필터 밀착·드리퍼 예열을 한 번에 해결합니다.</p></div></header>
      <SetupRows rows={rinse} />
      <p className="brewCallout">드리퍼를 탁탁 치면 미분이 벽으로 몰려 추출이 느려지고 떫어질 수 있습니다. 가볍게 흔드는 정도면 충분합니다.</p>
    </>,
    <>
      <header className="brewSlideHeading"><span>08</span><div><h2>핫 20g : 300g</h2><p>1:15 비율. 물줄기가 선에서 방울로 바뀔 때 다음 물을 붓습니다.</p></div></header>
      <div className="brewRatio"><strong>1:15</strong><span>목표 완료 약 2:40</span></div>
      <PourRows rows={hotPours} />
      <ul className="brewRules"><li>500원 크기의 작은 원을 그리며 가운데 중심으로 붓기</li><li>필터 벽에서 1cm 안쪽까지만 이동하기</li><li>포트 뚜껑은 닫고 물은 자연스럽게 식도록 두기</li></ul>
    </>,
    <>
      <header className="brewSlideHeading"><span>09</span><div><h2>아이스 20g : 200g</h2><p>1:10 비율. 붓는 양만 다르고 흐름은 핫과 같습니다.</p></div></header>
      <div className="brewRatio brewRatioIce"><strong>1:10</strong><span>목표 완료 약 2:10</span></div>
      <PourRows rows={icedPours} />
      <p className="brewCallout">추출이 끝나면 얼음이 가득 든 잔에 바로 옮기고 충분히 저어 온도와 농도를 맞춥니다.</p>
    </>,
    <>
      <header className="brewSlideHeading"><span>10</span><div><h2>맛은 한 변수씩</h2><p>물·온도·분쇄도를 한꺼번에 바꾸면 원인을 찾기 어렵습니다.</p></div></header>
      <div className="brewAdjustGrid">
        <article><span>쓰고 떫다 · 과다 추출</span><h3>물을 더하고, 다음에는 굵게</h3><p>현재 잔에는 물을 20g씩 더합니다. 다음 추출은 분쇄도만 5칸씩 굵게 조정하되 총 시간이 2:10보다 짧아지지 않게 봅니다.</p></article>
        <article><span>밋밋하고 신맛이 찌른다 · 과소 추출</span><h3>다음에는 조금 더 곱게</h3><p>다른 조건은 그대로 두고 분쇄도만 5칸씩 곱게 조정합니다. 총 추출이 2:50을 넘지 않는 범위에서 찾습니다.</p></article>
      </div>
      <p className="brewCallout">한 번에 한 칸만 바꾸고 기록합니다. 2:10~2:50은 맛을 조정할 때 지켜볼 범위입니다.</p>
    </>,
  ][active];

  return (
    <section className="brewTips" id="coffee-tips" aria-labelledby="coffee-tips-title" ref={sectionRef}>
      <div className="brewTipsShell" data-visible={visible} onKeyDown={(event) => { if (event.key === "ArrowLeft") move(-1); if (event.key === "ArrowRight") move(1); }} onPointerDown={(event) => { pointerStart.current = { x: event.clientX, y: event.clientY }; }} onPointerUp={onPointerUp} tabIndex={0}>
        <header className="brewTipsHeader">
          <div><span>HAND DRIP GUIDE</span><strong id="coffee-tips-title">핸드드립 입문 노트</strong></div>
          <nav className="brewTipsTabs" role="tablist" aria-label="핸드드립 단계" ref={tabListRef}>
            {tabs.map((tab, index) => <button aria-controls="brew-tip-panel" aria-label={tab} aria-selected={active === index} id={`brew-tip-${index}`} key={tab} onClick={() => selectSlide(index)} ref={(element) => { tabRefs.current[index] = element; }} role="tab" type="button"><b>{String(index + 1).padStart(2, "0")}</b><span>{tab}</span></button>)}
          </nav>
        </header>
        <article className="brewSlide" id="brew-tip-panel" key={active} role="tabpanel" aria-labelledby={`brew-tip-${active}`}>
          <figure className="brewSlideVisual"><img src={`/tips/${slideImages[active]}`} alt={slideAlts[active]} /></figure>
          <div className="brewSlideCopy">{slide}</div>
        </article>
        <footer className="brewTipsFooter"><button onClick={() => move(-1)} type="button">이전</button><span><strong>{active + 1}</strong> / {tabs.length} · {tabs[active]}</span><button onClick={() => move(1)} type="button">다음</button></footer>
      </div>
    </section>
  );
}
