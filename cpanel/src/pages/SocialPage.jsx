import React from "react";
import { brand } from "../data/brand.js";

function SocialPage({ t }) {
  return (
    <section className="page-shell social-page">
      <div className="page-heading">
        <p className="eyebrow">{t("social.eyebrow")}</p>
        <h1>{t("social.title")}</h1>
        <p>{t("social.note")}</p>
      </div>

      <div className="social-grid">
        {brand.socials.map((social) => (
          <a className="social-card" href={social.url} key={social.name} rel="noopener noreferrer" target="_blank">
            <span>{social.name.slice(0, 2)}</span>
            <h2>{social.name}</h2>
            <strong>{social.handle}</strong>
            <p>{t(`social.cards.${social.name}.description`)}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

export default SocialPage;
