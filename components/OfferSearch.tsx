"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sortOffersByFinalPrice, toggleFavoriteOffer, type Offer } from "../src/lib/offers";
import { OfferRow } from "./OfferRow";

const PAGE_SIZE = 25;
const FAVORITES_STORAGE_KEY = "coffee-favorite-offers";

type ApiResult = {
  fetchedAt: string;
  offers: Offer[];
  error?: string;
};

export function OfferSearch() {
  const [query, setQuery] = useState("생두");
  const [submittedQuery, setSubmittedQuery] = useState("생두");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [fetchedAt, setFetchedAt] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [favorites, setFavorites] = useState<Offer[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [error, setError] = useState("");
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
      });

    return () => {
      cancelled = true;
    };
  }, [submittedQuery]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleCount((count) => Math.min(count + PAGE_SIZE, offers.length));
      }
    });
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [offers.length]);

  const sortedOffers = useMemo(() => sortOffersByFinalPrice(offers, sortOrder), [offers, sortOrder]);
  const visibleOffers = useMemo(() => sortedOffers.slice(0, visibleCount), [sortedOffers, visibleCount]);
  const favoriteUrls = useMemo(() => new Set(favorites.map((offer) => offer.sourceUrl)), [favorites]);

  return (
    <main className="page">
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

      {fetchedAt ? <div className="timestamp">{new Date(fetchedAt).toLocaleString("ko-KR")} 기준</div> : null}

      {offers.length ? (
        <div className="resultBar">
          <span>{offers.length.toLocaleString("ko-KR")}개</span>
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
      ) : null}

      {status === "loading" ? <div className="state">조회 중</div> : null}
      {status === "empty" ? <div className="state">현재 조건에 맞는 구매 가능 생두가 없습니다.</div> : null}
      {status === "error" ? <div className="state">조회 실패: {error}</div> : null}

      {favorites.length ? (
        <section className="favoritesBlock" aria-label="찜 목록">
          <div className="favoritesHeader">찜 목록 {favorites.length.toLocaleString("ko-KR")}개</div>
          <div className="offerList favoriteList">
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
        <div className="offerList">
          {visibleOffers.map((offer) => (
            <OfferRow
              key={offer.id}
              offer={offer}
              favorite={favoriteUrls.has(offer.sourceUrl)}
              onToggleFavorite={(target) => setFavorites((items) => toggleFavoriteOffer(items, target))}
            />
          ))}
          <div ref={sentinelRef} className="sentinel" />
        </div>
      ) : null}
    </main>
  );
}
