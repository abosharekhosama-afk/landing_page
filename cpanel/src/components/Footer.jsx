import React from "react";
import { brand } from "../data/brand.js";

const instagramUrl = "https://www.instagram.com/eb_chemical";
const facebookUrl = "https://www.facebook.com/profile.php?id=61586630773060";

function Footer({ onNavigate, t }) {
  const [openSection, setOpenSection] = React.useState("shop");

  function toggleSection(section) {
    setOpenSection((current) => (current === section ? "" : section));
  }

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-col footer-col-newsletter">
          <div className="footer-newsletter-card">
            <h3>{t("footer.newsletterTitle")}</h3>
            <p>Follow updates, product care tips, and upcoming offers from EB Chemical.</p>
            <div className="footer-newsletter-form">
              <input aria-label="Email" placeholder={t("footer.emailPlaceholder")} />
              <button type="button">{t("footer.subscribe")}</button>
            </div>
          </div>
        </div>

        <div className={openSection === "shop" ? "footer-col footer-col-shop is-open" : "footer-col footer-col-shop"}>
          <button
            aria-expanded={openSection === "shop"}
            className="footer-section-toggle"
            onClick={() => toggleSection("shop")}
            type="button"
          >
            <span>{t("footer.shop")}</span>
            <span className="footer-section-icon" aria-hidden="true">{openSection === "shop" ? "\u2212" : "+"}</span>
          </button>
          <p className="footer-brand-text">{t("footer.description")}</p>
          <nav>
            <button onClick={() => onNavigate("products")} type="button">{t("footer.products")}</button>
            <button type="button">Cleaning Products</button>
            <button type="button">Car Care</button>
            <button onClick={() => onNavigate("bundles")} type="button">Bundles & Sets</button>
            <button type="button">Refills</button>
            <button type="button">Accessories</button>
          </nav>
        </div>

        <div className={openSection === "about" ? "footer-col footer-col-about is-open" : "footer-col footer-col-about"}>
          <button
            aria-expanded={openSection === "about"}
            className="footer-section-toggle"
            onClick={() => toggleSection("about")}
            type="button"
          >
            <span>About</span>
            <span className="footer-section-icon" aria-hidden="true">{openSection === "about" ? "\u2212" : "+"}</span>
          </button>
          <nav>
            <button onClick={() => onNavigate("about")} type="button">About us</button>
            <button type="button">How it Works</button>
            <button type="button">Sustainability</button>
            <button type="button">Stories</button>
            <button type="button">Careers</button>
            <button type="button">Wholesale</button>
          </nav>
        </div>

        <div className={openSection === "help" ? "footer-col footer-col-help is-open" : "footer-col footer-col-help"}>
          <button
            aria-expanded={openSection === "help"}
            className="footer-section-toggle"
            onClick={() => toggleSection("help")}
            type="button"
          >
            <span>Help & support</span>
            <span className="footer-section-icon" aria-hidden="true">{openSection === "help" ? "\u2212" : "+"}</span>
          </button>
          <nav>
            <button type="button">Frequently asked questions</button>
            <button type="button">Shipping Information</button>
            <button type="button">{t("footer.contact")}</button>
            <a href={`https://wa.me/${brand.whatsappLinkNumber}`}>WhatsApp</a>
            <a href={instagramUrl} rel="noopener noreferrer" target="_blank">Instagram</a>
            <a href={facebookUrl} rel="noopener noreferrer" target="_blank">Facebook</a>
            <button type="button">Terms & Conditions</button>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
