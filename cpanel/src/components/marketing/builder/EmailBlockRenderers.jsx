// T-003 - Email preview block renderers
import React from 'react';
import { Monitor, Mail, Phone, Globe, MapPin, Facebook, Instagram, Twitter, Linkedin, Youtube } from 'lucide-react';
import { BLOCK_TYPES } from './blockData.js';

export const SOCIAL_ICONS = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  whatsapp: Globe,
  website: Globe,
};

export const SOCIAL_COLORS = {
  facebook: '#1877f2',
  instagram: '#e4405f',
  twitter: '#1da1f2',
  linkedin: '#0a66c2',
  youtube: '#ff0000',
  whatsapp: '#25d366',
  website: '#2169ca',
};

export function TextBlockRender({ block }) {
  return (
    <div style={{ color: block.textColor || '#26344a', fontSize: block.fontSize || '16px', textAlign: block.textAlign || 'left', padding: block.padding || '16px 24px', backgroundColor: block.backgroundColor || '#ffffff', margin: 0, lineHeight: block.lineHeight || '1.6', fontWeight: block.isHeader ? '700' : (block.fontWeight || 'normal') }}>
      {block.isHeader ? <h2 style={{ margin: 0 }}>{block.content || 'Heading'}</h2> : <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{block.content || 'Text'}</p>}
    </div>
  );
}

export function ButtonBlockRender({ block, tr }) {
  return (
    <div style={{ textAlign: block.alignment || 'center', padding: block.padding || '16px 24px', backgroundColor: block.backgroundColor || '#ffffff' }}>
      <a href={block.url || '#'} onClick={(e) => e.preventDefault()} style={{ display: 'inline-block', padding: block.buttonPadding || '14px 32px', backgroundColor: block.buttonColor || '#2169ca', color: block.buttonTextColor || '#fff', borderRadius: block.buttonRadius || '50px', textDecoration: 'none', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>{block.text || tr('Shop Now', 'طھط³ظˆظ‚ ط§ظ„ط¢ظ†')}</a>
    </div>
  );
}

export function ImageBlockRender({ block, tr }) {
  const align = block.textAlign || 'center';
  const justify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  return (
    <div style={{ padding: block.padding || '16px 24px', backgroundColor: block.backgroundColor || '#ffffff', display: 'flex', justifyContent: justify }}>
      {block.src ? <img src={block.src} alt={block.alt || ''} style={{ width: block.width || '100%', maxWidth: '100%', height: block.height || 'auto', borderRadius: block.borderRadius || '8px', display: 'block' }} /> : (
        <div style={{ width: '100%', height: '180px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column', gap: '8px' }}>
          <Monitor size={32} /><span style={{ fontSize: '12px' }}>{tr('Image', 'طµظˆط±ط©')}</span>
        </div>
      )}
    </div>
  );
}

export function DividerBlockRender({ block }) {
  const bs = block.style === 'dashed' ? 'dashed' : block.style === 'dots' ? 'dotted' : 'solid';
  return <div style={{ padding: block.spacing || '16px 24px', backgroundColor: block.backgroundColor || '#ffffff' }}><hr style={{ border: 'none', borderTop: `${block.thickness || '1px'} ${bs} ${block.color || '#e2e8f0'}`, margin: 0 }} /></div>;
}

export function ProductBlockRender({ block }) {
  const align = block.textAlign || 'center';
  return (
    <div style={{ padding: block.padding || '16px 24px', backgroundColor: block.backgroundColor || '#ffffff', textAlign: align }}>
      <div style={{ display: 'inline-block', border: block.cardStyle === 'bordered' ? '1px solid #e2e8f0' : 'none', borderRadius: '12px', padding: '16px', maxWidth: '280px', boxShadow: block.cardStyle === 'shadow' ? '0 4px 12px rgba(0,0,0,0.08)' : 'none' }}>
        {block.productImage && <img src={block.productImage} alt={block.productName || 'Product'} style={{ width: '100%', borderRadius: '8px', marginBottom: '12px' }} />}
        <div style={{ fontWeight: 'bold', fontSize: '16px', color: block.textColor || '#26344a', marginBottom: '4px' }}>{block.productName || 'Product'}</div>
        {block.showPrice !== false && <div style={{ color: '#2169ca', fontSize: '20px', fontWeight: 'bold' }}>{block.productPrice || '$0.00'}</div>}
        {block.showBuyButton !== false && block.productUrl && <a href={block.productUrl} onClick={(e) => e.preventDefault()} style={{ display: 'inline-block', marginTop: '12px', padding: '10px 22px', backgroundColor: '#2169ca', color: '#fff', borderRadius: '999px', textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}>Buy</a>}
      </div>
    </div>
  );
}

export function SocialsBlockRender({ block }) {
  const platforms = block.platforms || [];
  const urls = block.urls || {};
  const iconSize = parseInt(block.iconSize || '28', 10);
  const spacing = parseInt(block.spacing || '12', 10);
  const alignment = block.alignment || 'center';
  if (platforms.length === 0) return <div style={{ textAlign: alignment, padding: '20px', color: '#94a3b8', fontSize: '13px' }}>No platforms</div>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: alignment === 'left' ? 'flex-start' : alignment === 'right' ? 'flex-end' : 'center', gap: `${spacing}px`, padding: '16px 24px', backgroundColor: block.backgroundColor || '#ffffff' }}>
      {platforms.map((pid) => {
        const Icon = SOCIAL_ICONS[pid] || Globe;
        const color = SOCIAL_COLORS[pid] || '#2169ca';
        const hasUrl = urls[pid] && urls[pid] !== '#';
        return <a key={pid} href={urls[pid] || '#'} onClick={(e) => e.preventDefault()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: `${iconSize + 16}px`, height: `${iconSize + 16}px`, borderRadius: '50%', background: hasUrl ? `${color}15` : '#f1f5f9', color: hasUrl ? color : '#94a3b8', textDecoration: 'none', cursor: 'pointer' }}><Icon size={iconSize} /></a>;
      })}
    </div>
  );
}

export function ContactBlockRender({ block }) {
  const align = block.textAlign || 'left';
  const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
  return (
    <div style={{ backgroundColor: block.backgroundColor || '#f8fafc', padding: block.padding || '20px 24px', fontSize: block.fontSize || '14px', color: block.textColor || '#334155', textAlign: align }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: justify === 'center' ? 'center' : justify === 'flex-end' ? 'flex-end' : 'flex-start' }}>
        {block.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: justify }}><Phone size={16} style={{ color: '#2169ca' }} /><span dir="ltr">{block.phone}</span></div>}
        {block.email && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: justify }}><Mail size={16} style={{ color: '#2169ca' }} /><span dir="ltr">{block.email}</span></div>}
        {block.website && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: justify }}><Globe size={16} style={{ color: '#2169ca' }} /><span dir="ltr">{block.website}</span></div>}
      </div>
    </div>
  );
}

export function AddressBlockRender({ block }) {
  const align = block.textAlign || 'left';
  const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
  return (
    <div style={{ backgroundColor: block.backgroundColor || '#f8fafc', padding: block.padding || '20px 24px', fontSize: block.fontSize || '14px', color: block.textColor || '#334155', textAlign: align }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', justifyContent: justify }}>
        <MapPin size={16} style={{ color: '#2169ca', marginTop: '2px' }} />
        <div>{block.street && <div>{block.street}</div>}{block.city && <div>{block.city}</div>}{block.country && <div>{block.country}</div>}</div>
      </div>
    </div>
  );
}

export function QuoteBlockRender({ block }) {
  return (
    <div style={{ backgroundColor: block.backgroundColor || '#f8fafc', padding: block.padding || '24px', textAlign: block.textAlign || 'left' }}>
      <blockquote style={{ margin: 0, fontStyle: 'italic', color: block.textColor || '#475569', fontSize: block.fontSize || '16px', borderLeft: '3px solid #2169ca', paddingLeft: '16px' }}>{block.content || 'Quote'}</blockquote>
    </div>
  );
}

export function ListBlockRender({ block, language }) {
  const rtl = language === 'ar';
  const align = block.textAlign || 'left';
  return (
    <div style={{ backgroundColor: block.backgroundColor || '#ffffff', padding: block.padding || '16px 24px', color: block.textColor || '#334155', textAlign: align }}>
      <ul style={{ margin: 0, paddingInlineStart: '24px', paddingLeft: rtl ? undefined : '24px', paddingRight: rtl ? '24px' : undefined, fontSize: block.fontSize || '14px', listStylePosition: 'inside' }}>{(block.items || []).map((item, i) => <li key={i} style={{ marginBottom: '4px' }}>{item}</li>)}</ul>
    </div>
  );
}

export function SpacerBlockRender({ block }) {
  return <div style={{ height: block.height || '40px', backgroundColor: 'transparent' }} />;
}

export function BannerBlockRender({ block }) {
  const align = block.textAlign || 'center';
  return (
    <div style={{ backgroundColor: block.backgroundColor || '#2169ca', padding: block.padding || '32px 24px', textAlign: align }}>
      <h2 style={{ margin: '0 0 8px', color: block.textColor || '#fff', fontSize: '24px' }}>{block.title || 'Special Offer!'}</h2>
      <p style={{ margin: 0, color: block.textColor || '#fff', fontSize: '16px', opacity: 0.9 }}>{block.subtitle || 'Get 50% off'}</p>
    </div>
  );
}

export function CouponBlockRender({ block }) {
  return (
    <div style={{ backgroundColor: block.backgroundColor || '#fff8e6', border: `2px dashed ${block.borderColor || '#f59e0b'}`, borderRadius: '8px', padding: block.padding || '20px 24px', textAlign: 'center', margin: '16px 24px' }}>
      <div style={{ fontSize: '12px', color: block.textColor || '#92400e', marginBottom: '8px', fontWeight: '600' }}>{block.discount || '50% OFF'}</div>
      <code style={{ fontSize: '22px', fontWeight: 'bold', color: block.textColor || '#92400e', letterSpacing: '2px', padding: '8px 16px', background: '#fff', borderRadius: '4px', display: 'inline-block' }}>{block.code || 'SAVE50'}</code>
    </div>
  );
}

export function CountdownBlockRender({ block }) {
  const targetDate = block.endDate ? new Date(block.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const diff = Math.max(0, targetDate - new Date());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff / 3600000) % 24);
  const minutes = Math.floor((diff / 60000) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return (
    <div style={{ backgroundColor: block.backgroundColor || '#1e293b', padding: block.padding || '24px', textAlign: 'center' }}>
      {block.title && <p style={{ margin: '0 0 16px', color: block.textColor || '#fff', fontSize: '14px', fontWeight: '600' }}>{block.title}</p>}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
        {[{ v: days, l: 'Days' }, { v: hours, l: 'Hours' }, { v: minutes, l: 'Min' }, { v: seconds, l: 'Sec' }].map((t, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '8px', minWidth: '55px' }}>
              <div style={{ fontSize: '26px', fontWeight: 'bold', color: block.textColor || '#fff' }}>{String(t.v).padStart(2, '0')}</div>
            </div>
            <small style={{ color: block.textColor || '#fff', opacity: 0.7, fontSize: '10px' }}>{t.l}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
export function BlockRenderer({ block, tr, language }) {
  if (!block) return null;
  switch (block.type) {
    case BLOCK_TYPES.TEXT: return <TextBlockRender block={block} />;
    case BLOCK_TYPES.BUTTON: return <ButtonBlockRender block={block} tr={tr} />;
    case BLOCK_TYPES.IMAGE: return <ImageBlockRender block={block} tr={tr} />;
    case BLOCK_TYPES.DIVIDER: return <DividerBlockRender block={block} />;
    case BLOCK_TYPES.PRODUCT: return <ProductBlockRender block={block} />;
    case BLOCK_TYPES.SOCIALS: return <SocialsBlockRender block={block} />;
    case BLOCK_TYPES.CONTACT: return <ContactBlockRender block={block} />;
    case BLOCK_TYPES.ADDRESS: return <AddressBlockRender block={block} />;
    case BLOCK_TYPES.QUOTE: return <QuoteBlockRender block={block} />;
    case BLOCK_TYPES.LIST: return <ListBlockRender block={block} language={language} />;
    case BLOCK_TYPES.SPACER: return <SpacerBlockRender block={block} />;
    case BLOCK_TYPES.BANNER: return <BannerBlockRender block={block} />;
    case BLOCK_TYPES.COUPON: return <CouponBlockRender block={block} />;
    case BLOCK_TYPES.COUNTDOWN: return <CountdownBlockRender block={block} />;
    default: return null;
  }
}
