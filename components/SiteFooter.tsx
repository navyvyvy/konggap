import coffeeData from "../data/mungstery-beans.json";
import coffeeOrigins from "../public/coffee-origins-grid.png";
import coffeeOriginsTwo from "../public/coffee-origins-grid-2.png";
import { OriginExplorer, type OriginGuide } from "./OriginExplorer";

const originAliases: Record<string, string> = {
  brazil: "브라질", colombia: "콜롬비아", ecuador: "에콰도르", ethiopia: "에티오피아",
  guatemala: "과테말라", honduras: "온두라스", india: "인도", indonesia: "인도네시아",
  kenya: "케냐", mexico: "멕시코", panama: "파나마", peru: "페루", yemen: "예멘", 브룬디: "부룬디",
};

const profiles: Record<string, Pick<OriginGuide, "description" | "acidity" | "body" | "brew" | "image">> = {
  에티오피아: { description: "꽃과 차를 닮은 향이 선명하고, 워시드는 레몬과 베르가못처럼 맑으며 내추럴은 복숭아와 베리의 단맛이 짙습니다.", acidity: "화사하고 또렷함", body: "가볍고 실키함", brew: "핸드드립, 에어로프레스", image: 0 },
  콜롬비아: { description: "캐러멜 같은 단맛을 중심으로 오렌지, 붉은 과일, 초콜릿이 균형을 이룹니다. 지역과 가공에 따라 가장 폭넓게 달라지는 산지입니다.", acidity: "둥글고 균형 잡힘", body: "중간, 매끄러움", brew: "핸드드립, 에스프레소", image: 1 },
  과테말라: { description: "화산성 토양에서 오는 단단한 구조감 위로 초콜릿, 견과, 향신료와 은은한 과일 산미가 겹칩니다. 식어도 단맛이 안정적입니다.", acidity: "차분하고 단단함", body: "중간 이상", brew: "에스프레소, 프렌치프레스", image: 9 },
  브라질: { description: "견과와 초콜릿, 캐러멜의 고소한 단맛이 중심입니다. 산미가 낮고 질감이 묵직해 편하게 마시거나 우유와 섞기 좋습니다.", acidity: "낮고 부드러움", body: "묵직하고 크리미함", brew: "에스프레소, 모카포트", image: 2 },
  코스타리카: { description: "깨끗한 단맛과 감귤, 자두 같은 과일 향이 또렷합니다. 허니 프로세스에서는 꿀 같은 점성과 단맛이 더욱 길게 남습니다.", acidity: "밝고 깨끗함", body: "중간, 촉촉함", brew: "핸드드립, 에어로프레스", image: 10 },
  케냐: { description: "블랙커런트, 자몽, 토마토를 연상시키는 강한 과일 산미가 특징입니다. 진한 농도에서도 향이 무너지지 않고 주스처럼 생생합니다.", acidity: "높고 강렬함", body: "탄탄하고 주시함", brew: "핸드드립, 아이스 브루", image: 3 },
  파나마: { description: "게이샤 품종으로 잘 알려진 산지입니다. 자스민, 베르가못, 복숭아처럼 섬세한 향이 층을 이루며 입안에서 차처럼 맑게 이어집니다.", acidity: "섬세하고 화사함", body: "가볍고 매끈함", brew: "핸드드립", image: 11 },
  온두라스: { description: "사과와 복숭아의 산뜻함, 캐러멜과 꿀의 단맛이 편안하게 이어집니다. 과하지 않은 균형 덕분에 데일리 커피로 쓰기 좋습니다.", acidity: "부드럽고 산뜻함", body: "중간", brew: "핸드드립, 콜드브루", image: 12 },
  인도: { description: "향신료, 다크 초콜릿, 구운 곡물의 인상이 강하고 산미는 낮습니다. 질감이 묵직해 진한 에스프레소나 우유 음료에서 존재감이 큽니다.", acidity: "낮고 잔잔함", body: "매우 묵직함", brew: "에스프레소, 프렌치프레스", image: 8 },
  페루: { description: "카카오와 캐러멜의 포근한 단맛에 꽃, 감귤, 견과 향이 가볍게 더해집니다. 자극이 적고 정돈된 인상이 오래 남습니다.", acidity: "온화하고 맑음", body: "가벼운 중간", brew: "핸드드립, 클레버", image: 13 },
  니카라과: { description: "캐러멜과 카카오를 바탕으로 자두, 오렌지, 열대과일이 나타납니다. 단맛과 바디가 둥글어 내추럴 가공도 부담 없이 접근하기 좋습니다.", acidity: "둥글고 과일 같음", body: "중간 이상", brew: "핸드드립, 에스프레소", image: 14 },
  엘살바도르: { description: "오렌지와 체리의 산뜻함 뒤에 초콜릿과 아몬드가 이어집니다. 파카마라 품종은 향이 크고 질감이 풍성한 편입니다.", acidity: "선명하지만 부드러움", body: "중간, 둥근 질감", brew: "핸드드립, 에어로프레스", image: 15 },
  에콰도르: { description: "고지대에서 자란 커피는 꽃, 사과, 자두와 은은한 시나몬 향을 보입니다. 향은 화려하지만 질감은 가볍고 정교합니다.", acidity: "밝고 정교함", body: "가볍고 실키함", brew: "핸드드립", image: 16 },
  볼리비아: { description: "재배량은 적지만 자스민, 살구, 리치 같은 섬세한 향과 카카오의 단맛이 함께 나타납니다. 깨끗한 후미가 장점입니다.", acidity: "맑고 섬세함", body: "가벼운 중간", brew: "핸드드립", image: 17 },
  르완다: { description: "자몽과 복숭아, 홍차 같은 향에 사탕수수 단맛이 받쳐 줍니다. 워시드 커피는 특히 깨끗하고 촉촉한 질감이 돋보입니다.", acidity: "상큼하고 깨끗함", body: "중간, 주시함", brew: "핸드드립, 아이스 브루", image: 18 },
  예멘: { description: "건과일, 향신료, 카카오와 와인 같은 발효 향이 겹치는 독특한 커피입니다. 거칠지만 밀도 높은 단맛과 긴 여운이 매력입니다.", acidity: "와인처럼 깊음", body: "농밀하고 묵직함", brew: "모카포트, 프렌치프레스", image: 6 },
  멕시코: { description: "견과, 초콜릿, 갈색 설탕을 중심으로 오렌지 향이 은은하게 납니다. 산미가 편안하고 단맛이 정직해 매일 마시기 좋습니다.", acidity: "낮고 편안함", body: "중간", brew: "드립, 에스프레소", image: 19 },
  탄자니아: { description: "베리와 자두, 홍차의 산뜻함 뒤에 초콜릿과 캐러멜이 남습니다. 피베리는 맛이 응축되고 산미가 또렷한 편입니다.", acidity: "생기 있고 선명함", body: "중간", brew: "핸드드립, 에어로프레스", image: 20 },
  파푸아뉴기니: { description: "사탕수수와 붉은 사과의 단맛, 열대과일과 견과 향이 함께 나타납니다. 부드러운 질감 속에 야생적인 향이 살짝 남습니다.", acidity: "부드럽고 과일 같음", body: "크리미한 중간", brew: "프렌치프레스, 드립", image: 21 },
  인도네시아: { description: "웻헐 가공 특유의 허브, 흙, 향신료와 다크 카카오 향이 특징입니다. 산미가 낮고 바디가 두꺼워 진한 커피에 잘 맞습니다.", acidity: "낮고 묵직함", body: "두껍고 오래감", brew: "프렌치프레스, 모카포트", image: 22 },
  부룬디: { description: "블루베리와 붉은 과일, 홍차 같은 산미 위에 캐러멜 단맛이 얹힙니다. 르완다와 닮았지만 조금 더 농축된 과일 인상이 납니다.", acidity: "밝고 과즙 같음", body: "가벼운 중간", brew: "핸드드립", image: 23 },
  잠비아: { description: "다크 초콜릿과 견과, 은은한 향신료가 중심인 차분한 커피입니다. 산미보다 단맛과 질감이 앞서며 진한 추출에 잘 어울립니다.", acidity: "낮고 차분함", body: "중간 이상", brew: "에스프레소, 프렌치프레스", image: 24 },
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
    ...(profiles[origin] ?? { description: "수집된 기록이 늘어나면 산지 특징을 보강합니다.", acidity: "정보 준비 중", body: "정보 준비 중", brew: "드립", image: 0 }),
  })).sort((a, b) => b.count - a.count || a.origin.localeCompare(b.origin, "ko"));
}

export function SiteFooter() {
  return (
    <footer className="siteFooter" id="guide">
      <OriginExplorer guides={buildOriginGuides()} imageSrcs={[coffeeOrigins.src, coffeeOriginsTwo.src]} />
      <div className="footerClosing" id="data">
        <div className="footerClosingInner">
          <header className="footerClosingHeader">
            <span>콩값장부 이용 기준</span>
            <h2>가격과 원두 정보는<br />이렇게 정리합니다</h2>
            <p>검색 결과를 비교하기 전에 알아둘 데이터 기준과 개인정보 처리를 한 화면에 모았습니다.</p>
          </header>
          <div className="footerInfoGrid">
            <section>
              <h3>가격 갱신</h3>
              <p>자동 갱신은 매일 02시, 10시, 14시, 18시에 실행합니다. 화면에는 마지막으로 수집에 성공한 시각을 표시합니다.</p>
            </section>
            <section>
              <h3>목록 정리</h3>
              <p>같은 상품 주소는 하나로 합치고, 구매할 수 있는 상품만 남깁니다. 비정상적으로 높은 가격과 샘플 상품은 제외합니다.</p>
            </section>
            <section>
              <h3>원두 정보</h3>
              <p>산지, 가공, 향미와 배전 정보는 수집한 791개 원두 기록과 상품 설명을 대조합니다. 확인하기 어려운 값은 임의로 채우지 않습니다.</p>
            </section>
            <section>
              <h3>브라우저 저장</h3>
              <p>찜한 콩은 현재 브라우저에만 저장합니다. 회원 정보, 결제 정보와 주문 내역은 수집하거나 서버로 전송하지 않습니다.</p>
            </section>
            <section>
              <h3>외부 판매처</h3>
              <p>상품을 누르면 해당 판매처로 이동합니다. 최종 가격, 재고, 주문, 결제와 배송에 관한 책임은 각 판매처에 있습니다.</p>
            </section>
            <section>
              <h3>광고와 쿠키</h3>
              <p>광고 제공업체는 광고 제공과 측정을 위해 쿠키를 사용할 수 있습니다. 쿠키 사용 여부는 브라우저 설정에서 관리할 수 있습니다.</p>
            </section>
          </div>
          <div className="siteFooterMeta"><span>콩값장부</span><small>가격과 원두 정보를 한곳에서 비교합니다.</small></div>
        </div>
      </div>
    </footer>
  );
}
