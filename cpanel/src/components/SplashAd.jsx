import React from "react";
import { trackSplashAd } from "../utils/storefrontContentApi.js";
import { markSplashDisplayed, shouldDisplaySplash } from "../utils/splashFrequency.js";
import { adAnimationProps } from "../utils/adAnimation.js";

export default function SplashAd({ ad, page = "/", onClose }) {
  const [closed, setClosed] = React.useState(false);
  const [canClose, setCanClose] = React.useState(Number(ad?.close_delay_seconds || 0) === 0);

  React.useEffect(() => {
    if (!ad) return undefined;

    const frequencyStorage = (ad.frequency || "ONCE_PER_SESSION") === "EVERY_VISIT"
      ? null
      : (ad.frequency || "ONCE_PER_SESSION") === "ONCE_PER_DAY"
        ? window.localStorage
        : window.sessionStorage;
    if (!shouldDisplaySplash(ad, frequencyStorage)) {
      setClosed(true);
      onClose?.();
      return undefined;
    }

    markSplashDisplayed(ad, frequencyStorage);
    void trackSplashAd(ad.id, "view", page);

    const closeTimer = setTimeout(
      () => setCanClose(true),
      Math.max(0, Number(ad.close_delay_seconds || 0)) * 1000,
    );
    const duration = Number(ad.display_duration_seconds || 0);
    const durationTimer = duration > 0
      ? setTimeout(() => { setClosed(true); onClose?.(); }, duration * 1000)
      : null;

    return () => {
      clearTimeout(closeTimer);
      if (durationTimer) clearTimeout(durationTimer);
    };
  }, [ad, onClose, page]);

  if (!ad || closed) return null;

  const close = () => {
    if (!canClose) return;
    setClosed(true);
    onClose?.();
  };

  const anim = adAnimationProps(ad);

  return (
    <div className="store-splash-backdrop" role="dialog" aria-modal="true" aria-label={ad.title || "Store promotion"}>
      <div className={`store-splash-card ${anim.className}`} style={anim.style}>
        {canClose && (
          <button className="store-splash-close" type="button" onClick={close} aria-label="Close">
            ×
          </button>
        )}
        <picture>
          {ad.mobile_image_id && <source media="(max-width: 767px)" srcSet={ad.mobile_image_id} />}
          <img src={ad.desktop_image_id || ad.mobile_image_id || ""} alt={ad.title || ""} />
        </picture>
        <div className="store-splash-body">
          <h2>{ad.title}</h2>
          {ad.link && (
            <a href={ad.link} onClick={() => void trackSplashAd(ad.id, "click", page)}>
              {ad.link}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
