"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { canonicalOfferUrl, filterOffers, normalizeOffer, sortOffersByFinalPrice, toggleFavoriteOffer, type Offer, type RawOffer } from "../src/lib/offers";
import { OfferRow } from "./OfferRow";
import { UiButton } from "./UiButton";

const PAGE_SIZE = 25;
const FAVORITES_STORAGE_KEY = "coffee-favorite-offers";
const PRODUCT_TAB_STORAGE_KEY = "coffee-product-tab";
const LOADING_STEPS = [
  "판매처 목록 확인 중",
  "가격과 배송비 정리 중",
  "구매 가능한 상품만 추리는 중",
  "중복 링크 정리 중",
  "향미와 배전 단서 확인 중",
  "가격순 목록 준비 중",
];

type ApiResult = {
  fetchedAt: string;
  offers: Offer[];
  error?: string;
};

type SnapshotOffer = {
  title: string;
  link: string;
  price: number;
  shippingFee?: number | null;
  seller?: string;
  source?: string;
  flavorTags?: string[];
  roastTags?: string[];
  tasteNote?: string;
  rawDescription?: string;
};

type OfferSnapshot = {
  fetchedAt: string;
  offers: SnapshotOffer[];
};

type ProductKind = "green" | "whole";

const PRODUCT_LABELS: Record<ProductKind, { label: string; query: string }> = {
  green: { label: "생두", query: "생두" },
  whole: { label: "홀빈", query: "원두" },
};

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
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

function FilterIcon() {
  return (
    <svg className="buttonIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M7 12h10M10 17h4" />
    </svg>
  );
}

function LoadingRows({ elapsedSeconds }: { elapsedSeconds: number }) {
  const step = LOADING_STEPS[Math.floor(elapsedSeconds / 6) % LOADING_STEPS.length];

  return (
    <section className="loadingBlock" aria-live="polite">
      <div className="loadingStatus">
        <strong>가격 목록 확인 중</strong>
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
      <UiButton
        className="favoriteRemove"
        variant="plain"
        onClick={(event) => {
          event.stopPropagation();
          onRemove(offer);
        }}
        aria-label="찜 해제"
      >
        <CloseIcon />
      </UiButton>
      <span>{offer.seller}</span>
      <strong>{formatWon(offer.finalPrice)}</strong>
      <p>{offer.name}</p>
    </div>
  );
}

export function OfferSearch() {
  const [activeProduct, setActiveProduct] = useState<ProductKind>("green");
  const [query, setQuery] = useState(PRODUCT_LABELS.green.query);
  const [submittedQuery, setSubmittedQuery] = useState(PRODUCT_LABELS.green.query);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [fetchedAt, setFetchedAt] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [flavorFilter, setFlavorFilter] = useState("");
  const [roastFilter, setRoastFilter] = useState("");
  const [favorites, setFavorites] = useState<Offer[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [error, setError] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const favoriteStripRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const savedProduct = localStorage.getItem(PRODUCT_TAB_STORAGE_KEY);
    if (savedProduct === "whole") {
      setActiveProduct("whole");
      setQuery(PRODUCT_LABELS.whole.query);
      setSubmittedQuery(PRODUCT_LABELS.whole.query);
    }
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
    localStorage.setItem(PRODUCT_TAB_STORAGE_KEY, activeProduct);
  }, [activeProduct]);

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

    const params = new URLSearchParams({ q: submittedQuery, product: activeProduct });
    if (refreshNonce > 0) params.set("refresh", "1");

    const request = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1"
      ? fetchStaticSnapshot(activeProduct)
      : fetch(`/api/offers?${params.toString()}`).then(async (response) => {
          const data = (await response.json()) as ApiResult;
          if (!response.ok) throw new Error(data.error || "조회 실패");
          return data;
        });

    request
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
  }, [submittedQuery, activeProduct, refreshNonce]);

  const tagOptions = useMemo(() => ({
    flavors: [...new Set(offers.flatMap((offer) => offer.flavorTags))].sort(),
    roasts: [...new Set(offers.flatMap((offer) => offer.roastTags))].sort(),
  }), [offers]);
  const filteredOffers = useMemo(() => filterOffers(offers, {
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    flavorTag: flavorFilter,
    roastTag: roastFilter,
  }), [offers, minPrice, maxPrice, flavorFilter, roastFilter]);
  const sortedOffers = useMemo(() => sortOffersByFinalPrice(filteredOffers, sortOrder), [filteredOffers, sortOrder]);
  const visibleOffers = useMemo(() => sortedOffers.slice(0, visibleCount), [sortedOffers, visibleCount]);
  const favoriteUrls = useMemo(() => new Set(favorites.map((offer) => canonicalOfferUrl(offer.sourceUrl))), [favorites]);
  const hasVisibleTable = offers.length > 0;
  const isRefreshing = status === "loading" && hasVisibleTable;
  const fetchedAtLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleString("ko-KR", { year: "2-digit", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "";
  const fetchedAtCompactLabel = fetchedAt
    ? (() => {
        const date = new Date(fetchedAt);
        return `${date.getMonth() + 1}.${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
      })()
    : "";
  const summary = useMemo(() => {
    const cheapest = sortOffersByFinalPrice(filteredOffers)[0];

    return {
      lowestFinalPrice: cheapest?.finalPrice ?? 0,
    };
  }, [filteredOffers]);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [minPrice, maxPrice, flavorFilter, roastFilter, sortOrder]);
  useEffect(() => {
    const list = listRef.current;
    const sentinel = sentinelRef.current;
    if (!list || !sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredOffers.length));
      }
    }, { root: list });
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [filteredOffers.length]);
  const submitCurrentQuery = () => {
    const nextQuery = query.trim() || PRODUCT_LABELS[activeProduct].query;
    setRefreshNonce((count) => count + 1);
    setSubmittedQuery(nextQuery);
  };
  const clearFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setFlavorFilter("");
    setRoastFilter("");
  };
  const handleToggleFavorite = (offer: Offer) => {
    setFavorites((items) => {
      const next = toggleFavoriteOffer(items, offer);
      if (next.length > items.length) setShowFavorites(true);
      return next;
    });
  };
  const switchProduct = (product: ProductKind) => {
    if (product === activeProduct) return;
    const nextQuery = PRODUCT_LABELS[product].query;
    setActiveProduct(product);
    setQuery(nextQuery);
    setSubmittedQuery(nextQuery);
    clearFilters();
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <main className="page">
      <header className="heroPanel">
        <div className="heroCopy">
          <h1>콩값장부</h1>
          <p>커피콩 최종가 모음</p>
        </div>
        <form
          className="searchBar listSearchBar desktopSearch"
          onSubmit={(event) => {
            event.preventDefault();
            submitCurrentQuery();
          }}
        >
          <span className="searchIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M10.5 18a7.5 7.5 0 1 1 5.3-12.8 7.5 7.5 0 0 1-5.3 12.8Zm5.2-2.3 3.8 3.8" />
            </svg>
          </span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="검색어" />
          <UiButton type="submit" variant="primary">콩값 체크</UiButton>
        </form>
      </header>

      <section className="toolPanel">
        {status === "loading" && !hasVisibleTable ? <LoadingRows elapsedSeconds={elapsedSeconds} /> : null}
        {status === "empty" ? (
          <div className="state">
            <strong>결과 없음</strong>
            <span>현재 조건에 맞는 구매 가능 생두가 없습니다.</span>
            <UiButton onClick={submitCurrentQuery}>다시 조회</UiButton>
          </div>
        ) : null}
        {status === "error" ? (
          <div className="state">
            <strong>조회 실패</strong>
            <span>{error}</span>
            <UiButton onClick={submitCurrentQuery}>다시 조회</UiButton>
          </div>
        ) : null}

        {status === "ready" || isRefreshing ? (
          <div className="workspaceGrid">
            {showFavorites ? (
              <section className="favoritesBlock" aria-label="찜 목록">
                <div className="sectionHeader">
                  <h2>찜 목록 ({favorites.length.toLocaleString("ko-KR")})</h2>
                  {favorites.length ? (
                    <div className="stripControls" aria-label="찜 목록 이동">
                      <UiButton variant="plain" onClick={() => setFavorites([])} aria-label="찜 모두 해제"><CloseIcon /></UiButton>
                      {favorites.length > 1 ? (
                        <>
                          <UiButton variant="plain" onClick={() => favoriteStripRef.current?.scrollBy({ left: -320, behavior: "smooth" })} aria-label="왼쪽으로 이동"><ChevronIcon direction="left" /></UiButton>
                          <UiButton variant="plain" onClick={() => favoriteStripRef.current?.scrollBy({ left: 320, behavior: "smooth" })} aria-label="오른쪽으로 이동"><ChevronIcon direction="right" /></UiButton>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {favorites.length ? (
                  <div className="favoriteStrip" ref={favoriteStripRef}>
                    {favorites.map((offer) => (
                      <FavoriteCard
                        key={offer.sourceUrl}
                        offer={offer}
                        onRemove={handleToggleFavorite}
                      />
                    ))}
                  </div>
                ) : <div className="emptyFavorite">찜한 항목 없음</div>}
              </section>
            ) : null}
            <section className="resultsPanel" aria-label="가격 목록">
              <div className="sectionHeader">
                <div className="sectionTitle">
                  <div className="productTabs" role="tablist" aria-label="상품 종류">
                    {(Object.keys(PRODUCT_LABELS) as ProductKind[]).map((product) => (
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeProduct === product}
                        className={activeProduct === product ? "productTab productTabActive" : "productTab"}
                        onClick={() => switchProduct(product)}
                        key={product}
                      >
                        {PRODUCT_LABELS[product].label}
                      </button>
                    ))}
                  </div>
                  <span>{filteredOffers.length.toLocaleString("ko-KR")}개</span>
                  {isRefreshing ? <span className="refreshPill" aria-live="polite">불러오는 중</span> : null}
                </div>
                <div className="inlineFacts" aria-label="현재 조회 상태">
                  <span><span className="fullLabel">기준</span><span className="compactLabel">기준</span> <strong className="fullValue">{fetchedAtLabel || "-"}</strong><strong className="compactValue">{fetchedAtCompactLabel || "-"}</strong></span>
                  <span><span className="fullLabel">최저가</span><span className="compactLabel">최저</span> <strong className="fullValue">{summary.lowestFinalPrice ? formatWon(summary.lowestFinalPrice) : "-"}</strong><strong className="compactValue">{summary.lowestFinalPrice ? formatNumber(summary.lowestFinalPrice) : "-"}</strong></span>
                  <UiButton
                    className="inlineFactButton"
                    variant="plain"
                    onClick={() => setShowFavorites((value) => !value)}
                    aria-expanded={showFavorites}
                  ><span><span className="fullLabel">찜한 콩</span><span className="compactLabel">찜</span> <strong className="fullValue">{favorites.length.toLocaleString("ko-KR")}개</strong><strong className="compactValue">{favorites.length.toLocaleString("ko-KR")}</strong></span></UiButton>
                </div>
                <div className="sectionTools">
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
                  <UiButton
                    className={`toolButton ${showFilters ? "toolButtonActive" : ""}`}
                    variant="condition"
                    onClick={() => setShowFilters((value) => !value)}
                    aria-expanded={showFilters}
                    aria-label="조건"
                  >
                    <FilterIcon />
                    조건
                  </UiButton>
                </div>
              </div>
              {showFilters ? (
                <section className="filterBar" aria-label="목록 필터">
                  <label>
                    <span>최소가</span>
                    <input inputMode="numeric" value={minPrice} onChange={(event) => setMinPrice(event.target.value.replace(/\D/g, ""))} placeholder="0" />
                  </label>
                  <label>
                    <span>최대가</span>
                    <input inputMode="numeric" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value.replace(/\D/g, ""))} placeholder="제한 없음" />
                  </label>
                  <label>
                    <span>향미</span>
                    <select value={flavorFilter} onChange={(event) => setFlavorFilter(event.target.value)}>
                      <option value="">전체</option>
                      {tagOptions.flavors.map((tag) => <option value={tag} key={tag}>{tag}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>배전</span>
                    <select value={roastFilter} onChange={(event) => setRoastFilter(event.target.value)}>
                      <option value="">전체</option>
                      {tagOptions.roasts.map((tag) => <option value={tag} key={tag}>{tag}</option>)}
                    </select>
                  </label>
                  <UiButton onClick={clearFilters}>필터 초기화</UiButton>
                </section>
              ) : null}
              {isRefreshing ? (
                <LoadingRows elapsedSeconds={elapsedSeconds} />
              ) : filteredOffers.length ? (
                <div className="offerList scrollList" ref={listRef}>
                  {visibleOffers.map((offer) => (
                    <OfferRow
                      key={offer.id}
                      offer={offer}
                      favorite={favoriteUrls.has(canonicalOfferUrl(offer.sourceUrl))}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                  <div ref={sentinelRef} className="sentinel" />
                </div>
              ) : (
                <div className="state">
                  <strong>조건 결과 없음</strong>
                  <span>가격이나 태그 조건을 줄이면 다시 보입니다.</span>
                  <UiButton onClick={clearFilters}>필터 초기화</UiButton>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}

async function fetchStaticSnapshot(productKind: ProductKind) {
  const fileName = productKind === "whole" ? "latest-offers-whole.json" : "latest-offers.json";
  const response = await fetch(`data/${fileName}`, { cache: "no-store" });
  if (!response.ok) throw new Error("정적 가격 목록을 불러오지 못했습니다.");
  const data = (await response.json()) as OfferSnapshot;
  const offers = sortOffersByFinalPrice(data.offers.map((item, index) => normalizeOffer({
    id: `${item.source ?? "snapshot"}-${index}-${item.link}`,
    name: item.title,
    seller: item.seller ?? item.source ?? "판매처",
    source: item.source === "shop" ? "shop" : "naver",
    sourceUrl: item.link,
    price: item.price,
    shippingFee: item.shippingFee ?? null,
    flavorTags: item.flavorTags,
    roastTags: item.roastTags,
    tasteNote: item.tasteNote,
    rawDescription: item.rawDescription,
    fetchedAt: data.fetchedAt,
  } satisfies RawOffer)));

  return { fetchedAt: data.fetchedAt, offers };
}
