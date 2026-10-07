// T-003 - Additional Block Components with full editing support
import React from 'react';
import { Quote, List, Heart, Gift, Percent, Calendar, Phone, MapPin } from 'lucide-react';

export function QuoteBlock({ block }) {
  const align = block.textAlign || 'left';
  return (
    <div style={{ backgroundColor: block.backgroundColor || '#f8fafc', padding: block.padding || '24px', textAlign: align }}>
      <blockquote style={{ margin: 0, fontStyle: 'italic', color: block.textColor || '#475569', fontSize: block.fontSize || '16px' }}>
        {block.content || 'Enter your quote here...'}
      </blockquote>
    </div>
  );
}

export function ListBlock({ block, language }) {
  const rtl = language === 'ar';
  const align = block.textAlign || 'left';
  const items = block.items || ['Item 1', 'Item 2', 'Item 3'];
  return (
    <div style={{ backgroundColor: block.backgroundColor || '#ffffff', padding: block.padding || '16px', color: block.textColor || '#334155', textAlign: align }}>
      <ul style={{ margin: 0, paddingInlineStart: '24px', paddingLeft: rtl ? undefined : '24px', paddingRight: rtl ? '24px' : undefined, fontSize: block.fontSize || '14px', listStylePosition: 'inside' }}>
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}

export function SpacerBlock({ block }) {
  return <div style={{ height: block.height || '40px', backgroundColor: 'transparent' }} />;
}

export function BannerBlock({ block }) {
  const align = block.textAlign || 'center';
  return (
    <div style={{ backgroundColor: block.backgroundColor || '#2169ca', padding: block.padding || '32px', textAlign: align }}>
      <h2 style={{ margin: '0 0 8px', color: block.textColor || '#fff', fontSize: '24px' }}>{block.title || 'Special Offer!'}</h2>
      <p style={{ margin: 0, color: block.textColor || '#fff', fontSize: '16px', opacity: 0.9 }}>{block.subtitle || 'Get 50% off today'}</p>
    </div>
  );
}

export function CouponBlock({ block }) {
  return (
    <div style={{ backgroundColor: block.backgroundColor || '#fff8e6', border: `2px dashed ${block.borderColor || '#f59e0b'}`, borderRadius: block.borderRadius || '8px', padding: block.padding || '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '12px', color: block.textColor || '#92400e', marginBottom: '8px' }}>{block.discount || '50% OFF'}</div>
      <code style={{ fontSize: '20px', fontWeight: 'bold', color: block.textColor || '#92400e', letterSpacing: '2px' }}>{block.code || 'SAVE50'}</code>
    </div>
  );
}

export function CountdownBlock({ block }) {
  const [timeLeft, setTimeLeft] = React.useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  React.useEffect(() => {
    const targetDate = block.endDate ? new Date(block.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const interval = setInterval(() => {
      const now = new Date();
      const diff = targetDate - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / (1000 * 60)) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [block.endDate]);

  const timeBlocks = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Min', value: timeLeft.minutes },
    { label: 'Sec', value: timeLeft.seconds },
  ];

  return (
    <div style={{ backgroundColor: block.backgroundColor || '#1e293b', padding: block.padding || '24px', textAlign: 'center' }}>
      {block.title && <p style={{ margin: '0 0 16px', color: block.textColor || '#fff', fontSize: '14px' }}>{block.title}</p>}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
        {timeBlocks.map((t, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '8px', minWidth: '60px' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: block.textColor || '#fff' }}>{String(t.value).padStart(2, '0')}</div>
            </div>
            <small style={{ color: block.textColor || '#fff', opacity: 0.7, fontSize: '10px' }}>{t.label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContactBlock({ block }) {
  const align = block.textAlign || 'left';
  const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
  return (
    <div style={{ backgroundColor: block.backgroundColor || '#f8fafc', padding: block.padding || '20px', textAlign: align }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: block.fontSize || '14px', color: block.textColor || '#334155', alignItems: justify === 'center' ? 'center' : justify === 'flex-end' ? 'flex-end' : 'flex-start' }}>
        {block.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: justify }}><Phone size={16} /> <span dir="ltr">{block.phone}</span></div>}
        {block.email && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: justify }}><span dir="ltr">{block.email}</span></div>}
        {block.website && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: justify }}><span dir="ltr">{block.website}</span></div>}
      </div>
    </div>
  );
}

export function AddressBlock({ block }) {
  const align = block.textAlign || 'left';
  const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
  return (
    <div style={{ backgroundColor: block.backgroundColor || '#f8fafc', padding: block.padding || '20px', textAlign: align }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: block.fontSize || '14px', color: block.textColor || '#334155', justifyContent: justify }}>
        <MapPin size={16} style={{ marginTop: '2px' }} />
        <div style={{ textAlign: align }}>
          {block.street && <div>{block.street}</div>}
          {block.city && <div>{block.city}</div>}
          {block.country && <div>{block.country}</div>}
        </div>
      </div>
    </div>
  );
}