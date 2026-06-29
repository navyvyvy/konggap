"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { canonicalOfferUrl, sortOffersByFinalPrice, toggleFavoriteOffer, type Offer } from "../src/lib/offers";
import { OfferRow } from "./OfferRow";

const PAGE_SIZE = 25;
const COLLAPSED_FAVORITES = 3;
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

export function OfferSearch() {
  const [query, setQuery] = useState("생두");
  const [submittedQuery, setSubmittedQuery] = useState("생두");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [fetchedAt, setFetchedAt] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [favorites, setFavorites] = useState<Offer[]>([]);
  const [showAllFavorites, setShowAllFavorites] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [error, setError] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
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

    fetch(`/api/offers?q=${encodeURIComponent(submittedQuery)}`)
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
  }, [submittedQuery]);

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
  const hasCollapsedFavorites = favorites.length > COLLAPSED_FAVORITES && !showAllFavorites;
  const fetchedAtLabel = fetchedAt ? `${new Date(fetchedAt).toLocaleString("ko-KR")} 기준` : "";

  return (
    <main className="page">
      <header className="appHeader">
        <div className="brandLine">
          <h1>생두 가격비교</h1>
        </div>
        <form
          className="searchBar"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmittedQuery(query.trim() || "생두");
          }}
        >
          <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="검색어" />
          <button type="submit">조회</button>
        </form>
      </header>

      {status === "loading" ? <LoadingRows elapsedSeconds={elapsedSeconds} /> : null}
      {status === "empty" ? <div className="state">현재 조건에 맞는 구매 가능 생두가 없습니다.</div> : null}
      {status === "error" ? <div className="state">조회 실패: {error}</div> : null}

      {favorites.length ? (
        <section className="favoritesBlock" aria-label="찜 목록">
          <div className="sectionHeader">
            <h2>찜 목록 ({favorites.length.toLocaleString("ko-KR")})</h2>
            {favorites.length > COLLAPSED_FAVORITES ? (
              <button className="linkButton" type="button" onClick={() => setShowAllFavorites((value) => !value)}>
                {showAllFavorites ? "접기" : "전체 보기"}
              </button>
            ) : (
              <span>{favorites.length.toLocaleString("ko-KR")}개</span>
            )}
          </div>
          <div className={`offerList favoriteList ${hasCollapsedFavorites ? "favoriteListCollapsed" : ""}`}>
            {favorites.map((offer) => (
              <OfferRow
                key={offer.sourceUrl}
                offer={offer}
                favorite
                onToggleFavorite={(target) => setFavorites((items) => toggleFavoriteOffer(items, target))}
              />
            ))}
          </div>
        </section>
      ) : null}

      {status === "ready" ? (
        <section>
          <div className="sectionHeader">
            <div className="sectionTitle">
              {fetchedAtLabel ? <span>{fetchedAtLabel}</span> : null}
            </div>
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
    </main>
  );
}
