import React from "react";
import SplashAd from "./SplashAd.jsx";

export default function SplashAdGallery({ ads = [], page = "/" }) {
  const [index, setIndex] = React.useState(0);
  const [active, setActive] = React.useState(0);
  const activeAds = (Array.isArray(ads) ? ads : []).filter(Boolean);

  function handleClose() {
    setActive((current) => {
      const next = current + 1;
      if (next >= activeAds.length) return -1;
      setIndex(next % activeAds.length);
      return next;
    });
  }

  if (!activeAds.length || active < 0) return null;
  if (activeAds.length === 1) {
    return <SplashAd ad={activeAds[0]} page={page} onClose={() => setActive(-1)} />;
  }

  const current = activeAds[index % activeAds.length];
  return <SplashAd ad={current} key={current.id || index} page={page} onClose={handleClose} />;
}
