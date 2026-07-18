import coffeeData from "../data/mungstery-beans.json";
import { GuideOverview } from "./GuideOverview";
import { OriginExplorer, type OriginGuide } from "./OriginExplorer";
import { originImages } from "./originImages";

const originAliases: Record<string, string> = {
  brazil: "브라질", colombia: "콜롬비아", ecuador: "에콰도르", ethiopia: "에티오피아",
  guatemala: "과테말라", honduras: "온두라스", india: "인도", indonesia: "인도네시아",
  kenya: "케냐", mexico: "멕시코", panama: "파나마", peru: "페루", yemen: "예멘", 브룬디: "부룬디",
};

const profiles: Record<string, Pick<OriginGuide, "description" | "acidity" | "body" | "brew" | "images">> = {
  에티오피아: { description: "꽃과 차를 닮은 향이 선명하고, 워시드는 레몬과 베르가못처럼 맑으며 내추럴은 복숭아와 베리의 단맛이 짙습니다.", acidity: "화사하고 또렷함", body: "가볍고 실키함", brew: "핸드드립, 에어로프레스", images: [0, 7, 25] },
  콜롬비아: { description: "캐러멜 같은 단맛을 중심으로 오렌지, 붉은 과일, 초콜릿이 균형을 이룹니다. 지역과 가공에 따라 가장 폭넓게 달라지는 산지입니다.", acidity: "둥글고 균형 잡힘", body: "중간, 매끄러움", brew: "핸드드립, 에스프레소", images: [1, 4, 26] },
  과테말라: { description: "화산성 토양에서 오는 단단한 구조감 위로 초콜릿, 견과, 향신료와 은은한 과일 산미가 겹칩니다. 식어도 단맛이 안정적입니다.", acidity: "차분하고 단단함", body: "중간 이상", brew: "에스프레소, 프렌치프레스", images: [9, 5] },
  브라질: { description: "견과와 초콜릿, 캐러멜의 고소한 단맛이 중심입니다. 산미가 낮고 질감이 묵직해 편하게 마시거나 우유와 섞기 좋습니다.", acidity: "낮고 부드러움", body: "묵직하고 크리미함", brew: "에스프레소, 모카포트", images: [2, 27] },
  코스타리카: { description: "깨끗한 단맛과 감귤, 자두 같은 과일 향이 또렷합니다. 허니 프로세스에서는 꿀 같은 점성과 단맛이 더욱 길게 남습니다.", acidity: "밝고 깨끗함", body: "중간, 촉촉함", brew: "핸드드립, 에어로프레스", images: [10, 28] },
  케냐: { description: "블랙커런트, 자몽, 토마토를 연상시키는 강한 과일 산미가 특징입니다. 진한 농도에서도 향이 무너지지 않고 주스처럼 생생합니다.", acidity: "높고 강렬함", body: "탄탄하고 주시함", brew: "핸드드립, 아이스 브루", images: [3, 29] },
  파나마: { description: "게이샤 품종으로 잘 알려진 산지입니다. 자스민, 베르가못, 복숭아처럼 섬세한 향이 층을 이루며 입안에서 차처럼 맑게 이어집니다.", acidity: "섬세하고 화사함", body: "가볍고 매끈함", brew: "핸드드립", images: [11, 30] },
  온두라스: { description: "사과와 복숭아의 산뜻함, 캐러멜과 꿀의 단맛이 편안하게 이어집니다. 과하지 않은 균형 덕분에 데일리 커피로 쓰기 좋습니다.", acidity: "부드럽고 산뜻함", body: "중간", brew: "핸드드립, 콜드브루", images: [12, 31] },
  인도: { description: "향신료, 다크 초콜릿, 구운 곡물의 인상이 강하고 산미는 낮습니다. 질감이 묵직해 진한 에스프레소나 우유 음료에서 존재감이 큽니다.", acidity: "낮고 잔잔함", body: "매우 묵직함", brew: "에스프레소, 프렌치프레스", images: [8, 32] },
  페루: { description: "카카오와 캐러멜의 포근한 단맛에 꽃, 감귤, 견과 향이 가볍게 더해집니다. 자극이 적고 정돈된 인상이 오래 남습니다.", acidity: "온화하고 맑음", body: "가벼운 중간", brew: "핸드드립, 클레버", images: [13, 33] },
  니카라과: { description: "캐러멜과 카카오를 바탕으로 자두, 오렌지, 열대과일이 나타납니다. 단맛과 바디가 둥글어 내추럴 가공도 부담 없이 접근하기 좋습니다.", acidity: "둥글고 과일 같음", body: "중간 이상", brew: "핸드드립, 에스프레소", images: [14] },
  엘살바도르: { description: "오렌지와 체리의 산뜻함 뒤에 초콜릿과 아몬드가 이어집니다. 파카마라 품종은 향이 크고 질감이 풍성한 편입니다.", acidity: "선명하지만 부드러움", body: "중간, 둥근 질감", brew: "핸드드립, 에어로프레스", images: [15] },
  에콰도르: { description: "고지대에서 자란 커피는 꽃, 사과, 자두와 은은한 시나몬 향을 보입니다. 향은 화려하지만 질감은 가볍고 정교합니다.", acidity: "밝고 정교함", body: "가볍고 실키함", brew: "핸드드립", images: [16] },
  볼리비아: { description: "재배량은 적지만 자스민, 살구, 리치 같은 섬세한 향과 카카오의 단맛이 함께 나타납니다. 깨끗한 후미가 장점입니다.", acidity: "맑고 섬세함", body: "가벼운 중간", brew: "핸드드립", images: [17] },
  르완다: { description: "자몽과 복숭아, 홍차 같은 향에 사탕수수 단맛이 받쳐 줍니다. 워시드 커피는 특히 깨끗하고 촉촉한 질감이 돋보입니다.", acidity: "상큼하고 깨끗함", body: "중간, 주시함", brew: "핸드드립, 아이스 브루", images: [18] },
  예멘: { description: "건과일, 향신료, 카카오와 와인 같은 발효 향이 겹치는 독특한 커피입니다. 거칠지만 밀도 높은 단맛과 긴 여운이 매력입니다.", acidity: "와인처럼 깊음", body: "농밀하고 묵직함", brew: "모카포트, 프렌치프레스", images: [6] },
  멕시코: { description: "견과, 초콜릿, 갈색 설탕을 중심으로 오렌지 향이 은은하게 납니다. 산미가 편안하고 단맛이 정직해 매일 마시기 좋습니다.", acidity: "낮고 편안함", body: "중간", brew: "드립, 에스프레소", images: [19] },
  탄자니아: { description: "베리와 자두, 홍차의 산뜻함 뒤에 초콜릿과 캐러멜이 남습니다. 피베리는 맛이 응축되고 산미가 또렷한 편입니다.", acidity: "생기 있고 선명함", body: "중간", brew: "핸드드립, 에어로프레스", images: [20] },
  파푸아뉴기니: { description: "사탕수수와 붉은 사과의 단맛, 열대과일과 견과 향이 함께 나타납니다. 부드러운 질감 속에 야생적인 향이 살짝 남습니다.", acidity: "부드럽고 과일 같음", body: "크리미한 중간", brew: "프렌치프레스, 드립", images: [21] },
  인도네시아: { description: "웻헐 가공 특유의 허브, 흙, 향신료와 다크 카카오 향이 특징입니다. 산미가 낮고 바디가 두꺼워 진한 커피에 잘 맞습니다.", acidity: "낮고 묵직함", body: "두껍고 오래감", brew: "프렌치프레스, 모카포트", images: [22] },
  부룬디: { description: "블루베리와 붉은 과일, 홍차 같은 산미 위에 캐러멜 단맛이 얹힙니다. 르완다와 닮았지만 조금 더 농축된 과일 인상이 납니다.", acidity: "밝고 과즙 같음", body: "가벼운 중간", brew: "핸드드립", images: [23] },
  잠비아: { description: "다크 초콜릿과 견과, 은은한 향신료가 중심인 차분한 커피입니다. 산미보다 단맛과 질감이 앞서며 진한 추출에 잘 어울립니다.", acidity: "낮고 차분함", body: "중간 이상", brew: "에스프레소, 프렌치프레스", images: [24] },
};

function normalizeOrigin(origin: string) {
  const trimmed = origin.trim();
  return originAliases[trimmed.toLowerCase()] ?? originAliases[trimmed] ?? trimmed;
}

function buildOriginGuides(): OriginGuide[] {
  const groups = new Map<string, { count: number; examples: string[]; notes: Map<string, number>; roasts: Map<string, number> }>();
  for (const bean of coffeeData.beans) {
    const origins = [...new Set([...bean.origins, ...bean.components.map(({ origin }) => origin)].filter(Boolean).map(normalizeOrigin))];
    for (const origin of origins) {
      const group = groups.get(origin) ?? { count: 0, examples: [] as string[], notes: new Map<string, number>(), roasts: new Map<string, number>() };
      group.count += 1;
      for (const note of bean.notes) group.notes.set(note, (group.notes.get(note) ?? 0) + 1);
      if (bean.roastingPoint) group.roasts.set(bean.roastingPoint, (group.roasts.get(bean.roastingPoint) ?? 0) + 1);
      if (origins.length === 1 && group.examples.length < 1) group.examples.push(bean.name);
      groups.set(origin, group);
    }
  }

  return [...groups.entries()].map(([origin, group]) => ({
    origin,
    count: group.count,
    example: group.examples[0] ?? "기록 준비 중",
    notes: [...group.notes].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([note]) => note),
    roast: [...group.roasts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "정보 없음",
    ...(profiles[origin] ?? { description: "수집된 기록이 늘어나면 산지 특징을 보강합니다.", acidity: "정보 준비 중", body: "정보 준비 중", brew: "드립", images: [0] }),
  })).sort((a, b) => b.count - a.count || a.origin.localeCompare(b.origin, "ko"));
}

export function SiteFooter() {
  return (
    <footer className="siteFooter" id="guide">
      <OriginExplorer guides={buildOriginGuides()} imageSrcs={originImages} />
      <div className="footerClosing" id="data">
        <div className="footerClosingInner">
          <header className="footerClosingHeader">
            <div>
              <span>SCA · WCR · ICO 자료를 바탕으로</span>
              <h2>커피 정보 읽는 법</h2>
            </div>
            <p>커피 상품명에서 자주 보이는 등급, 품종, 가공, 향미 용어를 업계 기준에 맞춰 풀었습니다.</p>
          </header>
          <GuideOverview>
            <div className="footerGuideColumn">
              <section>
                <h3>등급은 국가마다 다르다</h3>
                <div className="footerSectionContent">
                  <p>커피 등급은 세계 공통 점수가 아닙니다. 에티오피아의 G1·G2는 결점과 컵 품질을 기준으로 나누지만, 케냐의 AA·AB와 콜롬비아의 Supremo·Excelso는 주로 생두 크기를 뜻합니다.</p>
                  <dl className="priceEquation">
                    <div><dt>에티오피아</dt><dd>G1 · G2</dd></div>
                    <div><dt>케냐</dt><dd>AA 18/17 · AB 16</dd></div>
                    <div><dt>콜롬비아</dt><dd>Supremo 17 · Excelso 14</dd></div>
                  </dl>
                  <p className="footerPolicyNote">따라서 G1과 AA를 놓고 어느 쪽이 더 높은 등급인지 단순 비교할 수 없습니다.</p>
                </div>
              </section>
              <section>
                <h3>스크린·수분·결점</h3>
                <div className="footerSectionContent">
                  <p>스크린 숫자는 생두를 거르는 체의 구멍 크기입니다. 단위는 1/64인치로, 스크린 18은 약 7.1mm입니다. 다만 알이 크다고 반드시 더 맛있는 것은 아닙니다.</p>
                  <ul><li>수분: 스페셜티 생두는 대체로 10~12.5%를 참고</li><li>결점: 검은콩·신콩·곰팡이·벌레 먹은 콩 등</li><li>퀘이커: 로스팅해도 충분히 갈색으로 변하지 않은 콩</li><li>SHB·SHG: 고도와 밀도를 가리키며 산지마다 기준이 다름</li></ul>
                  <dl className="flavorIndex">
                    <div><dt>외관</dt><dd>색·크기·균일도</dd></div>
                    <div><dt>냄새</dt><dd>곰팡이·발효·노화</dd></div>
                    <div><dt>물리 결점</dt><dd>검은콩·신콩·파손</dd></div>
                    <div><dt>컵 결점</dt><dd>페놀·곰팡이·발효취</dd></div>
                  </dl>
                </div>
              </section>
            </div>
            <div className="footerGuideColumn">
              <section>
                <h3>종과 품종을 구분한다</h3>
                <div className="footerSectionContent">
                  <p>아라비카와 카네포라(로부스타)는 서로 다른 종입니다. WCR 카탈로그에는 22개국의 품종 100종 이상이 실려 있으며, 향미 잠재력뿐 아니라 수확량과 병 저항성, 알맞은 재배 고도도 확인할 수 있습니다.</p>
                  <dl className="flavorIndex">
                    <div><dt>Typica</dt><dd>Typica · Maragogype</dd></div>
                    <div><dt>Bourbon</dt><dd>Bourbon · SL28</dd></div>
                    <div><dt>교배·선발</dt><dd>Catimor · Ruiru 11</dd></div>
                    <div><dt>에티오피아</dt><dd>Geisha · 지역 재래종</dd></div>
                  </dl>
                  <p className="footerPolicyNote">같은 품종도 토양과 기후, 가공 방식에 따라 맛이 달라집니다. Geisha라는 이름만으로 품질이 보장되는 것도 아닙니다.</p>
                </div>
              </section>
              <section>
                <h3>가공은 씨앗을 꺼내는 과정</h3>
                <div className="footerSectionContent">
                  <p><strong>워시드</strong>는 과육을 벗기고 발효·세척한 뒤 말립니다. <strong>내추럴</strong>은 체리째, <strong>허니</strong>는 점액질을 일부 남긴 채 건조합니다. 발효와 건조 조건도 제각각이라 가공명만 보고 맛을 단정하기는 어렵습니다.</p>
                  <ul><li>워시드: 깨끗한 향과 산미가 잘 드러나는 편</li><li>내추럴: 잘 익은 과일과 발효 향이 두드러지는 편</li><li>허니: 질감과 단맛이 도드라지는 편</li><li>웻헐: 수분이 남은 상태에서 탈각하는 인도네시아식 가공</li><li>무산소 발효: 산소를 제한해 발효하며 특정 맛을 보장하지 않음</li></ul>
                </div>
              </section>
            </div>
            <div className="footerGuideColumn">
              <section>
                <h3>로트의 이력을 읽는다</h3>
                <div className="footerSectionContent">
                  <p>국가명만 있는 상품보다 지역, 농장이나 조합, 생산자, 수확 시기, 로트까지 적힌 상품이 이력을 더 자세히 보여줍니다. 고도는 주로 m.a.s.l.(해발 미터)로 적지만 그 자체가 품질 점수는 아닙니다.</p>
                  <ul><li>싱글 오리진: 한 산지에서 나온 커피지만 한 농장이라는 뜻은 아님</li><li>마이크로로트: 따로 관리한 작은 로트로, 공통 용량 기준은 없음</li><li>Crop 24/25: 생산국의 수확·출하 시기</li><li>Blend: 여러 산지·품종·로트를 목적에 맞게 조합</li></ul>
                  <dl className="flavorIndex">
                    <div><dt>Country</dt><dd>생산 국가</dd></div>
                    <div><dt>Region</dt><dd>지역·마을</dd></div>
                    <div><dt>Producer</dt><dd>농장·조합·생산자</dd></div>
                    <div><dt>Lot</dt><dd>분리 생산 단위</dd></div>
                  </dl>
                </div>
              </section>
              <section>
                <h3>향미와 컵 평가</h3>
                <div className="footerSectionContent">
                  <p>향미 노트는 첨가한 맛이 아니라 평가자가 커피에서 느낀 인상입니다. WCR 감각 어휘집은 110개 속성을 다루며, SCA는 점수 하나보다 커피가 지닌 특징과 가치를 함께 살핍니다.</p>
                  <ul><li>산미: 강도뿐 아니라 종류와 선명도까지 살핌</li><li>바디·마우스필: 무게감과 점성, 질감</li><li>후미: 삼킨 뒤 남는 향과 맛, 이어지는 시간</li><li>SCA CVA: 물리·서술·기호·외재 평가를 따로 기록</li></ul>
                  <dl className="flavorIndex">
                    <div><dt>물리 평가</dt><dd>결점·수분·크기</dd></div>
                    <div><dt>서술 평가</dt><dd>향미 종류와 강도</dd></div>
                    <div><dt>기호 평가</dt><dd>품질 인상과 선호</dd></div>
                    <div><dt>외재 평가</dt><dd>산지·생산·가공 정보</dd></div>
                  </dl>
                </div>
              </section>
            </div>
          </GuideOverview>
          <div className="siteFooterMeta"><span>콩값장부 커피 노트</span><small>SCA CVA · World Coffee Research · International Coffee Organization</small></div>
        </div>
      </div>
    </footer>
  );
}
