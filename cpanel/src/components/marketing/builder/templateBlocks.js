// T-003 — Data-filled pre-built template block sets

import { BLOCK_TYPES, createBlock } from './blockData.js';

const svg = (w, h, c1, c2, label) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w * 0.86}" cy="${h * 0.3}" r="${h * 0.28}" fill="rgba(255,255,255,0.16)"/><circle cx="${w * 0.12}" cy="${h * 0.82}" r="${h * 0.2}" fill="rgba(255,255,255,0.12)"/><text x="50%" y="52%" fill="#ffffff" font-family="Arial, sans-serif" font-size="${Math.round(h / 5)}" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`
  )}`;

const NEWSLETTER_BANNER = svg(600, 180, '#1c5fae', '#1eabd2', 'Monthly News');
const PROMO_BANNER = svg(600, 200, '#b8322f', '#e8734a', '50% OFF');
const LAUNCH_BANNER = svg(600, 190, '#5b2d90', '#c04a8f', 'We Are Live');
const STORY_BANNER = svg(600, 170, '#0b6e4f', '#4cb087', 'Our Story');
const EVENT_BANNER = svg(600, 190, '#7c3aed', '#c084fc', 'Join Our Event');
const CART_BANNER = svg(600, 180, '#ea580c', '#fbbf24', "Don't Miss Out");
const THANKS_BANNER = svg(600, 170, '#db2777', '#f472b6', 'Thank You');
const WELCOME_BANNER = svg(600, 180, '#0e7490', '#22d3ee', 'Welcome!');
const PRODUCT_IMG = svg(280, 280, '#dbe7f3', '#b7cde6', 'Product');
const CART_PRODUCT_IMG = svg(280, 280, '#ffe8d6', '#fcd0a4', 'Your Item');

const createHeaderSection = (src, alt) => [
  createBlock(BLOCK_TYPES.IMAGE, { src, alt, width: '100%', padding: '0' }),
];

const createFooterSection = () => [
  createBlock(BLOCK_TYPES.DIVIDER, { style: 'line', thickness: '1px', color: '#e2e8f0', spacing: '12px' }),
  createBlock(BLOCK_TYPES.SOCIALS, { padding: '16px', iconColor: '#2169ca' }),
  createBlock(BLOCK_TYPES.TEXT, { content: '© 2026 iCare. All rights reserved.', fontSize: '11px', textAlign: 'center', textColor: '#7a8798', padding: '8px 24px 24px', lineHeight: '1.6' }),
];

export const TEMPLATE_BLOCKS = {
  newsletter: () => [
    ...createHeaderSection(NEWSLETTER_BANNER, 'Newsletter header banner'),
    createBlock(BLOCK_TYPES.TEXT, { content: 'Hello {First_Name}, welcome to our newsletter! 👋', isHeader: true, fontSize: '26px', textAlign: 'center', textColor: '#26344a', padding: '28px 24px 8px', backgroundColor: '#ffffff' }),
    createBlock(BLOCK_TYPES.TEXT, { content: 'Here is everything new this month.', fontSize: '15px', textAlign: 'center', textColor: '#5b6b82', lineHeight: '1.7', padding: '0 32px 18px' }),
    createBlock(BLOCK_TYPES.BUTTON, { text: 'Read More', url: '#', alignment: 'center', padding: '18px 20px 24px' }),
    ...createFooterSection(),
  ],
  promotion: () => [
    ...createHeaderSection(PROMO_BANNER, 'Promotion banner'),
    createBlock(BLOCK_TYPES.TEXT, { content: '{First_Name}, this deal is for you! 🎉', isHeader: true, fontSize: '28px', fontWeight: 'bold', textAlign: 'center', textColor: '#b8322f', padding: '26px 24px 8px' }),
    createBlock(BLOCK_TYPES.TEXT, { content: 'Enjoy 50% OFF everything in store.', fontSize: '16px', textAlign: 'center', lineHeight: '1.7', padding: '0 32px 16px' }),
    createBlock(BLOCK_TYPES.BUTTON, { text: 'Claim Discount', url: '#', buttonColor: '#b8322f', alignment: 'center', padding: '14px 20px 8px' }),
    ...createFooterSection(),
  ],
  announcement: () => [
    ...createHeaderSection(LAUNCH_BANNER, 'Launch announcement banner'),
    createBlock(BLOCK_TYPES.TEXT, { content: '🚀 {First_Name}, we just launched!', isHeader: true, fontSize: '27px', fontWeight: 'bold', textAlign: 'center', textColor: '#5b2d90', padding: '26px 24px 8px' }),
    createBlock(BLOCK_TYPES.TEXT, { content: 'Our brand-new online experience is live.', fontSize: '15px', textAlign: 'center', lineHeight: '1.75', padding: '0 32px 18px' }),
    createBlock(BLOCK_TYPES.BUTTON, { text: "Explore Now", url: '#', buttonColor: '#5b2d90', alignment: 'center', padding: '8px 20px 22px' }),
    ...createFooterSection(),
  ],
  'product-story': () => [
    ...createHeaderSection(STORY_BANNER, 'Product story banner'),
    createBlock(BLOCK_TYPES.TEXT, { content: 'Behind the Design', isHeader: true, fontSize: '28px', fontWeight: 'bold', textAlign: 'center', padding: '26px 24px 8px' }),
    createBlock(BLOCK_TYPES.TEXT, { content: 'Every product has a story.', fontSize: '15px', textAlign: 'center', fontStyle: 'italic', lineHeight: '1.8', textColor: '#5b6b82', padding: '0 32px 14px' }),
    createBlock(BLOCK_TYPES.PRODUCT, { productName: 'Signature Collection', productPrice: '$129.00', productImage: PRODUCT_IMG, productUrl: '#', cardStyle: 'bordered', padding: '16px 24px' }),
    createBlock(BLOCK_TYPES.BUTTON, { text: 'Shop Now', url: '#', alignment: 'center', padding: '18px 20px 24px' }),
    ...createFooterSection(),
  ],
  'event-invite': () => [
    ...createHeaderSection(EVENT_BANNER, 'Event invitation banner'),
    createBlock(BLOCK_TYPES.TEXT, { content: '📅 You\'re Invited, {First_Name}!', isHeader: true, fontSize: '27px', fontWeight: 'bold', textAlign: 'center', textColor: '#7c3aed', padding: '26px 24px 8px' }),
    createBlock(BLOCK_TYPES.TEXT, { content: 'Join us for an exclusive evening of launches, demos and networking.', fontSize: '15px', textAlign: 'center', lineHeight: '1.75', textColor: '#5b6b82', padding: '0 32px 14px' }),
    createBlock(BLOCK_TYPES.COUNTDOWN, { title: 'Event starts in', endDate: '', backgroundColor: '#f5f3ff', textColor: '#5b21b6', padding: '20px' }),
    createBlock(BLOCK_TYPES.LIST, { items: ['Product demos & hands-on sessions', 'Networking with industry leaders', 'Exclusive launch offers for attendees'], backgroundColor: '#ffffff', textColor: '#46566b', padding: '18px 32px' }),
    createBlock(BLOCK_TYPES.BUTTON, { text: 'Reserve My Seat', url: '#', buttonColor: '#7c3aed', alignment: 'center', padding: '10px 20px 20px' }),
    createBlock(BLOCK_TYPES.ADDRESS, { street: 'Riyadh Front, Hall B', city: 'Riyadh', country: 'Saudi Arabia', backgroundColor: '#faf9ff', textColor: '#46566b', padding: '16px 32px' }),
    ...createFooterSection(),
  ],
  'cart-recovery': () => [
    ...createHeaderSection(CART_BANNER, 'Cart recovery banner'),
    createBlock(BLOCK_TYPES.TEXT, { content: '{First_Name}, you left something behind 🛒', isHeader: true, fontSize: '26px', fontWeight: 'bold', textAlign: 'center', textColor: '#ea580c', padding: '24px 24px 8px' }),
    createBlock(BLOCK_TYPES.PRODUCT, { productName: 'Your Selected Item', productPrice: '$89.00', productImage: CART_PRODUCT_IMG, productUrl: '#', cardStyle: 'shadow', padding: '14px 24px' }),
    createBlock(BLOCK_TYPES.COUPON, { discount: 'Extra 15% just for you', code: 'COMEBACK15', backgroundColor: '#fff7ed', borderColor: '#ea580c', textColor: '#9a3412', padding: '18px 24px', margin: '0 24px' }),
    createBlock(BLOCK_TYPES.BUTTON, { text: 'Complete My Order', url: '#', buttonColor: '#ea580c', alignment: 'center', padding: '14px 20px 22px' }),
    createBlock(BLOCK_TYPES.TEXT, { content: 'Hurry — this offer expires in 48 hours.', fontSize: '13px', textAlign: 'center', textColor: '#9a3412', padding: '0 24px 18px' }),
    ...createFooterSection(),
  ],
  'thank-you': () => [
    ...createHeaderSection(THANKS_BANNER, 'Thank you banner'),
    createBlock(BLOCK_TYPES.TEXT, { content: 'Thank You, {First_Name} 💙', isHeader: true, fontSize: '28px', fontWeight: 'bold', textAlign: 'center', textColor: '#db2777', padding: '26px 24px 8px' }),
    createBlock(BLOCK_TYPES.QUOTE, { content: 'Your trust is the most valuable thing we have ever built.', backgroundColor: '#fdf2f8', textColor: '#9d174d', padding: '22px 28px', fontSize: '16px' }),
    createBlock(BLOCK_TYPES.TEXT, { content: 'Because of customers like you, we keep growing. Here\'s a small gift for your next visit.', fontSize: '15px', textAlign: 'center', lineHeight: '1.75', textColor: '#5b6b82', padding: '16px 32px 6px' }),
    createBlock(BLOCK_TYPES.COUPON, { discount: 'A little thank-you', code: 'THANKS10', backgroundColor: '#fdf2f8', borderColor: '#db2777', textColor: '#9d174d', padding: '18px 24px', margin: '8px 24px' }),
    createBlock(BLOCK_TYPES.SPACER, { height: '12px' }),
    createBlock(BLOCK_TYPES.CONTACT, { phone: '+966 XX XXX XXXX', email: 'care@company.com', website: 'www.company.com', backgroundColor: '#ffffff', textColor: '#46566b', textAlign: 'center', padding: '14px 24px' }),
    ...createFooterSection(),
  ],
  welcome: () => [
    ...createHeaderSection(WELCOME_BANNER, 'Welcome banner'),
    createBlock(BLOCK_TYPES.TEXT, { content: 'Welcome aboard, {First_Name}! 🎉', isHeader: true, fontSize: '27px', fontWeight: 'bold', textAlign: 'center', textColor: '#0e7490', padding: '26px 24px 8px' }),
    createBlock(BLOCK_TYPES.TEXT, { content: 'We are thrilled to have you. Here are three quick steps to get the most out of your account.', fontSize: '15px', textAlign: 'center', lineHeight: '1.75', textColor: '#5b6b82', padding: '0 32px 14px' }),
    createBlock(BLOCK_TYPES.LIST, { items: ['Complete your profile in under a minute', 'Explore the dashboard and key features', 'Reach out anytime — we reply fast'], backgroundColor: '#ecfeff', textColor: '#155e75', padding: '18px 32px' }),
    createBlock(BLOCK_TYPES.BUTTON, { text: 'Get Started', url: '#', buttonColor: '#0e7490', alignment: 'center', padding: '10px 20px 14px' }),
    createBlock(BLOCK_TYPES.SPACER, { height: '8px' }),
    createBlock(BLOCK_TYPES.CONTACT, { phone: '+966 XX XXX XXXX', email: 'hello@company.com', website: 'www.company.com', backgroundColor: '#ffffff', textColor: '#46566b', textAlign: 'center', padding: '14px 24px' }),
    ...createFooterSection(),
  ],
  blank: () => [
    createBlock(BLOCK_TYPES.TEXT, { content: 'Start typing your message here...', fontSize: '16px', textColor: '#7a8798', padding: '40px 28px' }),
  ],
};

export const getTemplateBlocks = (templateId) => {
  if (!templateId || templateId === 'blank') return TEMPLATE_BLOCKS.blank();
  return TEMPLATE_BLOCKS[templateId.toLowerCase()] || TEMPLATE_BLOCKS.blank();
};
