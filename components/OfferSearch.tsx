"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Offer } from "../src/lib/offers";
import { OfferRow } from "./OfferRow";

const PAGE_SIZE = 25;

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
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [error, setError] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

  const visibleOffers = useMemo(() => offers.slice(0, visibleCount), [offers, visibleCount]);

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

      {status === "loading" ? <div className="state">조회 중</div> : null}
      {status === "empty" ? <div className="state">현재 조건에 맞는 구매 가능 생두가 없습니다.</div> : null}
      {status === "error" ? <div className="state">조회 실패: {error}</div> : null}

      {status === "ready" ? (
        <div className="offerList">
          {visibleOffers.map((offer) => (
            <OfferRow key={offer.id} offer={offer} />
          ))}
          <div ref={sentinelRef} className="sentinel" />
        </div>
      ) : null}
    </main>
  );
}
