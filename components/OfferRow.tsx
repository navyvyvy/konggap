import type { Offer } from "../src/lib/offers";

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function TruckIcon() {
  return (
    <svg className="truckIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7h11v10H3z" />
      <path d="M14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
    </svg>
  );
}

export function OfferRow({ offer }: { offer: Offer }) {
  const hasTags = offer.flavorTags.length > 0 || offer.roastTags.length > 0;

  return (
    <a className="offerRow" href={offer.sourceUrl} target="_blank" rel="noreferrer">
      <div className="offerInfo">
        <div className="offerTitle">{offer.name}</div>
        {hasTags ? (
          <div className="tags">
            {offer.flavorTags.map((tag) => (
              <span className="tag flavorTag" key={tag}>{tag}</span>
            ))}
            {offer.roastTags.map((tag) => (
              <span className="tag roastTag" key={tag}>{tag}</span>
            ))}
          </div>
        ) : null}
        {offer.tasteNote ? <div className="tasteNote">{offer.tasteNote}</div> : null}
      </div>
      <div className="pricePanel">
        <div className="priceLabel">{offer.shippingKnown ? "최종 비용" : "상품가 기준"}</div>
        <div className="finalPrice">{formatWon(offer.finalPrice)}</div>
        <div className="costLine">
          <span>{formatWon(offer.price)}</span>
          <span className="shippingFee">
            <TruckIcon />
            {offer.shippingKnown ? formatWon(offer.shippingFee ?? 0) : "확인 필요"}
          </span>
        </div>
      </div>
    </a>
  );
}
