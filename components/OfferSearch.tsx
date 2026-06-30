"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { canonicalOfferUrl, sortOffersByFinalPrice, toggleFavoriteOffer, type Offer } from "../src/lib/offers";
import { OfferRow } from "./OfferRow";

const PAGE_SIZE = 25;
const FAVORITES_STORAGE_KEY = "coffee-favorite-offers";
const LOADING_STEPS = [
  "네이버 검색 결과 확인 중",
  "네이버 상품 ID 정리 중",
  "전문몰 가격표 읽는 중",
  "구매 가능한 생두만 거르는 중",
  "100만원 초과 가격 제외 중",
  "중복 광고 링크 합치는 중",
  "향미와 배전 단서 붙이는 중",
  "배송비 표시 정리 중",
  "가격순 목록 준비 중",
];

type ApiResult = {
  fetchedAt: string;
  offers: Offer[];
  error?: string;
};

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function CloseIcon() {
  return (
    <svg className="buttonIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7l10 10M17 7L7 17" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  const path = direction === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6";

  return (
    <svg className="buttonIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

function LoadingRows({ elapsedSeconds }: { elapsedSeconds: number }) {
  const step = LOADING_STEPS[Math.floor(elapsedSeconds / 6) % LOADING_STEPS.length];

  return (
    <section className="loadingBlock" aria-live="polite">
      <div className="loadingStatus">
        <strong>크롤링 중</strong>
        <span>{elapsedSeconds}초 경과 · {step}</span>
      </div>
      <div className="offerList loadingList">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="loadingRow" key={index}>
            <div>
              <span className="skeleton skeletonMeta" />
              <span className="skeleton skeletonTitle" />
              <span className="skeleton skeletonText" />
            </div>
            <div className="loadingPrice">
              <span className="skeleton skeletonLabel" />
              <span className="skeleton skeletonAmount" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FavoriteCard({ offer, onRemove }: { offer: Offer; onRemove: (offer: Offer) => void }) {
  return (
    <div
      className="favoriteCard"
      role="link"
      tabIndex={0}
      onClick={() => window.open(offer.sourceUrl, "_blank", "noreferrer")}
      onKeyDown={(event) => {
        if (event.key === "Enter") window.open(offer.sourceUrl, "_blank", "noreferrer");
      }}
    >
      <button
        className="favoriteRemove"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove(offer);
        }}
        aria-label="찜 해제"
      >
        <CloseIcon />
      </button>
      <span>{offer.seller}</span>
      <strong>{formatWon(offer.finalPrice)}</strong>
      <p>{offer.name}</p>
    </div>
  );
}

export function OfferSearch() {
  const [query, setQuery] = useState("생두");
  const [submittedQuery, setSubmittedQuery] = useState("생두");
  const [reloadKey, setReloadKey] = useState(0);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [fetchedAt, setFetchedAt] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [favorites, setFavorites] = useState<Offer[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [error, setError] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const favoriteStripRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!saved) return;
    try {
      setFavorites(JSON.parse(saved));
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError("");
    setVisibleCount(PAGE_SIZE);
    setElapsedSeconds(0);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    const params = new URLSearchParams({ q: submittedQuery });
    if (reloadKey > 0) params.set("refresh", "1");

    fetch(`/api/offers?${params.toString()}`)
      .then(async (response) => {
        const data = (await response.json()) as ApiResult;
        if (!response.ok) throw new Error(data.error || "조회 실패");
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setOffers(data.offers);
        setFetchedAt(data.fetchedAt);
        setStatus(data.offers.length ? "ready" : "empty");
      })
      .catch((fetchError: Error) => {
        if (cancelled) return;
        setOffers([]);
        setError(fetchError.message);
        setStatus("error");
      })
      .finally(() => {
        window.clearInterval(timer);
      });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [submittedQuery, reloadKey]);

  useEffect(() => {
    const list = listRef.current;
    const sentinel = sentinelRef.current;
    if (!list || !sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleCount((count) => Math.min(count + PAGE_SIZE, offers.length));
      }
    }, { root: list });
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [offers.length]);

  const sortedOffers = useMemo(() => sortOffersByFinalPrice(offers, sortOrder), [offers, sortOrder]);
  const visibleOffers = useMemo(() => sortedOffers.slice(0, visibleCount), [sortedOffers, visibleCount]);
  const favoriteUrls = useMemo(() => new Set(favorites.map((offer) => canonicalOfferUrl(offer.sourceUrl))), [favorites]);
  const fetchedAtLabel = fetchedAt
    ? `${new Date(fetchedAt).toLocaleString("ko-KR", { year: "2-digit", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" })} 기준`
    : "";
  const summary = useMemo(() => {
    const naverCount = offers.filter((offer) => offer.source === "naver").length;
    const cheapest = sortOffersByFinalPrice(offers)[0];

    return {
      naverCount,
      shopCount: offers.length - naverCount,
      lowestFinalPrice: cheapest?.finalPrice ?? 0,
    };
  }, [offers]);
  const submitCurrentQuery = () => {
    const nextQuery = query.trim() || "생두";
    setReloadKey((key) => key + 1);
    if (nextQuery === submittedQuery) {
      return;
    }
    setSubmittedQuery(nextQuery);
  };

  return (
    <main className="page">
      <header className="heroPanel">
        <div className="heroCopy">
          <h1>생두 가격비교</h1>
          <p>오늘 살 수 있는 생두를 최종가부터 좁혀봅니다.</p>
        </div>
        <div className="heroAction">
          <form
            className="searchBar"
            onSubmit={(event) => {
              event.preventDefault();
              submitCurrentQuery();
            }}
          >
            <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="검색어" />
            <button type="submit">조회</button>
          </form>
          <div className="heroFacts" aria-label="현재 조회 상태">
            <div>
              <span>최저</span>
              <strong>{status === "ready" ? formatWon(summary.lowestFinalPrice) : "-"}</strong>
            </div>
            <div>
              <span>목록</span>
              <strong>{status === "ready" ? `${offers.length.toLocaleString("ko-KR")}개` : status === "loading" ? "조회 중" : "-"}</strong>
            </div>
            <div>
              <span>찜</span>
              <strong>{favorites.length.toLocaleString("ko-KR")}개</strong>
            </div>
          </div>
        </div>
      </header>

      <section className="toolPanel">
        {status === "loading" ? <LoadingRows elapsedSeconds={elapsedSeconds} /> : null}
        {status === "empty" ? (
          <div className="state">
            <strong>결과 없음</strong>
            <span>현재 조건에 맞는 구매 가능 생두가 없습니다.</span>
            <button type="button" onClick={submitCurrentQuery}>다시 조회</button>
          </div>
        ) : null}
        {status === "error" ? (
          <div className="state">
            <strong>조회 실패</strong>
            <span>{error}</span>
            <button type="button" onClick={submitCurrentQuery}>다시 조회</button>
          </div>
        ) : null}

        {status === "ready" ? (
          <section className="summaryBar" aria-label="조회 요약">
            <div>
              <span>기준</span>
              <strong>{fetchedAtLabel}</strong>
            </div>
            <div>
              <span>목록</span>
              <strong>{offers.length.toLocaleString("ko-KR")}개</strong>
            </div>
            <div>
              <span>최저</span>
              <strong>{formatWon(summary.lowestFinalPrice)}</strong>
            </div>
            <div>
              <span>출처</span>
              <strong>네이버 {summary.naverCount.toLocaleString("ko-KR")} · 전문몰 {summary.shopCount.toLocaleString("ko-KR")}</strong>
            </div>
          </section>
        ) : null}

        {favorites.length ? (
          <section className="favoritesBlock" aria-label="찜 목록">
            <div className="sectionHeader">
              <h2>찜 목록 ({favorites.length.toLocaleString("ko-KR")})</h2>
              {favorites.length > 1 ? (
                <div className="stripControls" aria-label="찜 목록 이동">
                  <button type="button" onClick={() => favoriteStripRef.current?.scrollBy({ left: -320, behavior: "smooth" })} aria-label="왼쪽으로 이동"><ChevronIcon direction="left" /></button>
                  <button type="button" onClick={() => favoriteStripRef.current?.scrollBy({ left: 320, behavior: "smooth" })} aria-label="오른쪽으로 이동"><ChevronIcon direction="right" /></button>
                </div>
              ) : (
                <span>{favorites.length.toLocaleString("ko-KR")}개</span>
              )}
            </div>
            <div className="favoriteStrip" ref={favoriteStripRef}>
              {favorites.map((offer) => (
                <FavoriteCard
                  key={offer.sourceUrl}
                  offer={offer}
                  onRemove={(target) => setFavorites((items) => toggleFavoriteOffer(items, target))}
                />
              ))}
            </div>
          </section>
        ) : null}

        {status === "ready" ? (
          <section>
            <div className="sectionHeader">
              <div className="sectionTitle" />
              <div className="sectionTools">
                <span>{visibleOffers.length.toLocaleString("ko-KR")} / {offers.length.toLocaleString("ko-KR")}</span>
                <select
                  value={sortOrder}
                  onChange={(event) => {
                    setSortOrder(event.target.value as "asc" | "desc");
                    setVisibleCount(PAGE_SIZE);
                  }}
                  aria-label="정렬"
                >
                  <option value="asc">낮은 가격순</option>
                  <option value="desc">높은 가격순</option>
                </select>
              </div>
            </div>
            <div className="offerList scrollList" ref={listRef}>
              {visibleOffers.map((offer) => (
                <OfferRow
                  key={offer.id}
                  offer={offer}
                  favorite={favoriteUrls.has(canonicalOfferUrl(offer.sourceUrl))}
                  onToggleFavorite={(target) => setFavorites((items) => toggleFavoriteOffer(items, target))}
                />
              ))}
              <div ref={sentinelRef} className="sentinel" />
            </div>
          </section>
        ) : null}
      </section>

      <footer className="siteFooter">같은 검색어는 30분 동안 같은 기준 사용 · 구매와 상세 확인은 각 판매처에서 진행</footer>
    </main>
  );
}
