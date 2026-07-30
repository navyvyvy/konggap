import { CoffeeTips } from "../components/CoffeeTips";
import { OfferSearch } from "../components/OfferSearch";
import { SiteFooter } from "../components/SiteFooter";

export default function Home() {
  return (
    <>
      <OfferSearch />
      <SiteFooter />
      <CoffeeTips />
    </>
  );
}
