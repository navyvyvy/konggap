import type { Offer } from "../src/lib/offers";
import { UiButton } from "./UiButton";

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

function BeanIcon() {
  return (
    <svg className="beanIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.5 18.5c-3.1-3.1-2.5-8.4 1.2-12.1 3.7-3.7 9-4.3 12.1-1.2 3.1 3.1 2.5 8.4-1.2 12.1-3.7 3.7-9 4.3-12.1 1.2Z" />
      <path d="M8.8 17.2c2.3-1.2 3.1-3 3.6-5.2.5-2.1 1.3-4 3.8-5.2" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg className="favoriteIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 4h12v16l-6-3-6 3z" />
    </svg>
  );
}

const topBadgeTones = [
  "topBadgeTone0",
  "topBadgeTone1",
  "topBadgeTone2",
  "topBadgeTone3",
  "topBadgeTone4",
  "topBadgeTone5",
  "topBadgeTone6",
  "topBadgeTone7",
];

function topBadgeTone(index: number) {
  return topBadgeTones[index % topBadgeTones.length];
}

type TopBadge = {
  key: string;
  label: string;
};

export function OfferRow({
  offer,
  favorite,
  onToggleFavorite,
}: {
  offer: Offer;
  favorite?: boolean;
  onToggleFavorite?: (offer: Offer) => void;
}) {
  const hasTags = offer.flavorTags.length > 0 || offer.roastTags.length > 0;
  const sourceLabel = offer.source === "naver" ? "네이버" : "전문몰";
  const topBadges: TopBadge[] = [
    { key: "seller", label: offer.seller },
    ...(sourceLabel !== offer.seller ? [{ key: "source", label: sourceLabel }] : []),
    ...offer.flavorTags.map((tag) => ({ key: `flavor-${tag}`, label: tag })),
    ...offer.roastTags.map((tag) => ({ key: `roast-${tag}`, label: tag })),
  ];

  return (
    <div
      className="offerRow"
      role="link"
      tabIndex={0}
      onClick={() => window.open(offer.sourceUrl, "_blank", "noreferrer")}
      onKeyDown={(event) => {
        if (event.key === "Enter") window.open(offer.sourceUrl, "_blank", "noreferrer");
      }}
    >
      <div className="offerInfo">
        <div className="offerMeta">
          {onToggleFavorite ? (
            <UiButton
              className={`favoriteButton ${favorite ? "favoriteButtonActive" : ""}`}
              variant="plain"
              onClick={(event) => {
                event.stopPropagation();
                onToggleFavorite(offer);
              }}
              aria-pressed={favorite}
              aria-label={favorite ? "찜 해제" : "찜하기"}
            >
              <BookmarkIcon />
            </UiButton>
          ) : null}
          {hasTags || topBadges.length > 0 ? (
            topBadges.map((badge, index) => (
              <span
                className={`offerMetaBadge ${topBadgeTone(index)}`}
                key={`${badge.key}-${index}`}
              >
                {badge.label}
              </span>
            ))
          ) : null}
        </div>
        <a
          className="offerTitle"
          href={offer.sourceUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {offer.name}
        </a>
        {offer.tasteNote ? <div className="tasteNote">{offer.tasteNote}</div> : null}
      </div>
      <div className={`pricePanel ${offer.shippingKnown ? "" : "pricePanelUnknown"}`}>
        <div className="finalPrice">{formatWon(offer.finalPrice)}</div>
        <div className="costLine">
          <span className="productPrice"><BeanIcon />{formatWon(offer.price)}</span>
          <span className={`shippingFee ${offer.shippingKnown ? "" : "shippingUnknown"}`}>
            <TruckIcon />
            {offer.shippingKnown ? (offer.shippingFee ? formatWon(offer.shippingFee) : "무료") : "확인 필요"}
          </span>
        </div>
      </div>
    </div>
  );
}
