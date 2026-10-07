import React from "react";

const socialLinks = [
  {
    key: "instagram",
    name: "Instagram",
    handle: "@eb_chemical",
    url: "https://www.instagram.com/eb_chemical",
    icon: "IG",
    description: "Follow product care tips, updates, and everyday cleaning ideas.",
  },
  {
    key: "facebook",
    name: "Facebook",
    handle: "EB Chemical",
    url: "https://www.facebook.com/profile.php?id=61586630773060",
    icon: "f",
    description: "See announcements, offers, and EB Chemical news.",
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    handle: "00972599130765",
    url: "https://wa.me/972599130765",
    icon: "WA",
    description: "Direct support and product inquiries will be available soon.",
  },
  {
    key: "email",
    name: "Email",
    handle: "elyas.2006@yahoo.com",
    url: "mailto:elyas.2006@yahoo.com",
    icon: "@",
    description: "Send us questions, product requests, or business inquiries by email.",
  },
  {
    key: "tiktok",
    name: "TikTok",
    handle: "Coming soon",
    url: "",
    icon: "TT",
    description: "Short cleaning tips and product videos will be available soon.",
  },
];

function FollowUsPage() {
  return (
    <section className="page-shell social-page follow-us-page">
      <div className="page-heading">
        <p className="eyebrow">Follow us</p>
        <h1>Follow EB Chemical</h1>
        <p>Stay connected with EB Chemical through our official social media channels.</p>
      </div>

      <div className="social-grid follow-social-grid">
        {socialLinks.map((social) => {
          const CardElement = social.url ? "a" : "article";
          const cardProps = social.url
            ? {
                href: social.url,
                rel: "noopener noreferrer",
                target: "_blank",
              }
            : {
                "aria-label": `${social.name} link coming soon`,
              };

          return (
            <CardElement
              className={`social-card follow-social-card follow-social-card-${social.key}${
                social.url ? "" : " follow-social-card-disabled"
              }`}
              key={social.name}
              {...cardProps}
            >
              <span className="follow-social-icon">{social.icon}</span>
              <div className="follow-social-copy">
                <h2>{social.name}</h2>
                <strong>{social.handle}</strong>
                <p>{social.description}</p>
              </div>
              <span className="follow-social-status">{social.url ? "Open channel" : "Link coming soon"}</span>
            </CardElement>
          );
        })}
      </div>
    </section>
  );
}

export default FollowUsPage;
