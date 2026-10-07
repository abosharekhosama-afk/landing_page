// T-003 - Block Properties Panel: Full support for all blocks
import React from 'react';
import { Settings, Palette, X, AlignLeft, AlignCenter, AlignRight, Facebook, Instagram, Twitter, Linkedin, Youtube, Globe, Phone, Mail, Plus, Trash2 } from 'lucide-react';

const BLOCK_TYPES = {
  TEXT: 'text',
  BUTTON: 'button',
  IMAGE: 'image',
  PRODUCT: 'product',
  DIVIDER: 'divider',
  SOCIALS: 'socials',
  QUOTE: 'quote',
  LIST: 'list',
  SPACER: 'spacer',
  BANNER: 'banner',
  COUPON: 'coupon',
  COUNTDOWN: 'countdown',
  CONTACT: 'contact',
  ADDRESS: 'address',
};

const SOCIAL_PLATFORMS = [
  { id: 'facebook', label: 'Facebook', labelAr: 'فيسبوك', icon: Facebook, color: '#1877f2' },
  { id: 'instagram', label: 'Instagram', labelAr: 'انستغرام', icon: Instagram, color: '#e4405f' },
  { id: 'twitter', label: 'Twitter', labelAr: 'تويتر', icon: Twitter, color: '#1da1f2' },
  { id: 'linkedin', label: 'LinkedIn', labelAr: 'لينكدإن', icon: Linkedin, color: '#0a66c2' },
  { id: 'youtube', label: 'YouTube', labelAr: 'يوتيوب', icon: Youtube, color: '#ff0000' },
  { id: 'whatsapp', label: 'WhatsApp', labelAr: 'واتساب', icon: Globe, color: '#25d366' },
  { id: 'phone', label: 'Phone', labelAr: 'هاتف', icon: Phone, color: '#2169ca' },
  { id: 'email', label: 'Email', labelAr: 'بريد', icon: Mail, color: '#2169ca' },
  { id: 'website', label: 'Website', labelAr: 'موقع', icon: Globe, color: '#2169ca' },
];

export default function BlockPropertiesPanel({ selectedBlock, onUpdateBlock, onClose, language }) {
  const tr = (en, ar) => (language === 'ar' ? ar : en);
  const ch = (f, v) => { if (onUpdateBlock && selectedBlock) onUpdateBlock(selectedBlock.id, { [f]: v }); };

  if (!selectedBlock) return (
    <div className="block-properties-panel is-empty">
      <div className="properties-empty-state"><Settings size={32} /><p>{tr('Select a block to edit its properties', 'اختر كتلة لتعديل خصائصها')}</p></div>
    </div>
  );

  const labels = {
    [BLOCK_TYPES.TEXT]: 'Text',
    [BLOCK_TYPES.BUTTON]: 'Button',
    [BLOCK_TYPES.IMAGE]: 'Image',
    [BLOCK_TYPES.PRODUCT]: 'Product',
    [BLOCK_TYPES.DIVIDER]: 'Divider',
    [BLOCK_TYPES.SOCIALS]: 'Socials',
    'quote': 'Quote',
    'list': 'List',
    'spacer': 'Spacer',
    'banner': 'Banner',
    'coupon': 'Coupon',
    'countdown': 'Countdown',
    'contact': 'Contact',
    'address': 'Address',
  };

  const labelsAr = {
    [BLOCK_TYPES.TEXT]: 'نص',
    [BLOCK_TYPES.BUTTON]: 'زر',
    [BLOCK_TYPES.IMAGE]: 'صورة',
    [BLOCK_TYPES.PRODUCT]: 'منتج',
    [BLOCK_TYPES.DIVIDER]: 'فاصل',
    [BLOCK_TYPES.SOCIALS]: 'تواصل',
    'quote': 'اقتباس',
    'list': 'قائمة',
    'spacer': 'مسافة',
    'banner': 'بانر',
    'coupon': 'كوبون',
    'countdown': 'عد تنازلي',
    'contact': 'اتصال',
    'address': 'عنوان',
  };

  const alignRow = (value, field) => (
    <div className="property-segmented">
      <button type="button" className={value === 'left' ? 'is-active' : ''} onClick={() => ch(field, 'left')} title={tr('Left', 'يسار')}><AlignLeft size={14} /></button>
      <button type="button" className={value === 'center' ? 'is-active' : ''} onClick={() => ch(field, 'center')} title={tr('Center', 'وسط')}><AlignCenter size={14} /></button>
      <button type="button" className={value === 'right' ? 'is-active' : ''} onClick={() => ch(field, 'right')} title={tr('Right', 'يمين')}><AlignRight size={14} /></button>
    </div>
  );

  const colorInput = (field, label) => (
    <div className="property-group">
      <label>{tr(label, label === 'Background' ? 'الخلفية' : label === 'Text Color' ? 'لون النص' : label === 'Button Color' ? 'لون الزر' : label === 'Icon Color' ? 'لون الأيقونات' : label === 'Color' ? 'اللون' : label)}</label>
      <div className="property-color-row">
        <input type="color" value={selectedBlock[field] || '#ffffff'} onChange={(e) => ch(field, e.target.value)} />
        <input type="text" value={selectedBlock[field] || '#ffffff'} onChange={(e) => ch(field, e.target.value)} dir="ltr" />
      </div>
    </div>
  );

  const rangeInput = (field, label, min, max, format) => (
    <div className="property-group">
      <label>{tr(label, label === 'Padding' ? 'التباعد' : label === 'Font Size' ? 'حجم الخط' : label === 'Border Radius' ? 'انحناء الحواف' : label === 'Icon Size' ? 'حجم الأيقونة' : label === 'Spacing' ? 'المسافة' : label === 'Thickness' ? 'السُمك' : label === 'Height' ? 'الارتفاع' : label === 'Width' ? 'العرض' : label)}</label>
      <div className="property-input-row">
        <input type="range" min={min} max={max} value={parseInt(selectedBlock[field], 10) || min} onChange={(e) => ch(field, format ? format(e.target.value) : `${e.target.value}px`)} />
        <span>{selectedBlock[field]}</span>
      </div>
    </div>
  );

  return (
    <div className="block-properties-panel">
      <div className="properties-header">
        <div className="properties-title"><Palette size={16} /><span>{tr('Properties', 'الخصائص')}</span></div>
        <button type="button" className="properties-close" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="properties-block-type"><span className="block-type-badge">{tr(labels[selectedBlock.type], labelsAr[selectedBlock.type])}</span></div>
      <div className="properties-content">
        {/* Common Properties */}
        {colorInput('backgroundColor', 'Background')}
        {rangeInput('padding', 'Padding', 0, 50)}

        {/* Text Block */}
        {selectedBlock.type === BLOCK_TYPES.TEXT && <>
          <div className="property-group"><label>{tr('Content', 'المحتوى')}</label><textarea value={selectedBlock.content || ''} onChange={(e) => ch('content', e.target.value)} rows={4} /></div>
          {colorInput('textColor', 'Text Color')}
          {rangeInput('fontSize', 'Font Size', 12, 48)}
          <div className="property-group"><label>{tr('Alignment', 'المحاذاة')}</label>{alignRow(selectedBlock.textAlign || 'left', 'textAlign')}</div>
        </>}

        {/* Button Block */}
        {selectedBlock.type === BLOCK_TYPES.BUTTON && <>
          <div className="property-group"><label>{tr('Text', 'النص')}</label><input type="text" value={selectedBlock.text || ''} onChange={(e) => ch('text', e.target.value)} /></div>
          <div className="property-group"><label>{tr('URL', 'الرابط')}</label><input type="url" value={selectedBlock.url || ''} onChange={(e) => ch('url', e.target.value)} placeholder="https://" dir="ltr" /></div>
          {colorInput('buttonColor', 'Button Color')}
          {colorInput('buttonTextColor', 'Text Color')}
          {rangeInput('buttonPadding', 'Padding', 8, 40)}
          {rangeInput('buttonRadius', 'Border Radius', 0, 50)}
          <div className="property-group"><label>{tr('Alignment', 'المحاذاة')}</label>{alignRow(selectedBlock.alignment || 'center', 'alignment')}</div>
        </>}

        {/* Image Block */}
        {selectedBlock.type === BLOCK_TYPES.IMAGE && <>
          <div className="property-group"><label>{tr('Image URL', 'رابط الصورة')}</label><input type="url" value={selectedBlock.src || ''} onChange={(e) => ch('src', e.target.value)} placeholder="https://" dir="ltr" /></div>
          <div className="property-group"><label>{tr('Alt text', 'النص البديل')}</label><input type="text" value={selectedBlock.alt || ''} onChange={(e) => ch('alt', e.target.value)} /></div>
          <div className="property-group"><label>{tr('Link (optional)', 'الرابط (اختياري)')}</label><input type="url" value={selectedBlock.link || ''} onChange={(e) => ch('link', e.target.value)} placeholder="https://" dir="ltr" /></div>
          {rangeInput('width', 'Width', 10, 100, (v) => (/^\d+$/.test(String(v).trim()) ? `${v}%` : v))}
          <div className="property-group"><label>{tr('Alignment', 'المحاذاة')}</label>{alignRow(selectedBlock.textAlign || 'center', 'textAlign')}</div>
        </>}

        {/* Product Block */}
        {selectedBlock.type === BLOCK_TYPES.PRODUCT && <>
          <div className="property-group"><label>{tr('Name', 'الاسم')}</label><input type="text" value={selectedBlock.productName || ''} onChange={(e) => ch('productName', e.target.value)} /></div>
          <div className="property-group"><label>{tr('Price', 'السعر')}</label><input type="text" value={selectedBlock.productPrice || ''} onChange={(e) => ch('productPrice', e.target.value)} /></div>
          <div className="property-group"><label>{tr('Image URL', 'رابط الصورة')}</label><input type="url" value={selectedBlock.productImage || ''} onChange={(e) => ch('productImage', e.target.value)} placeholder="https://" dir="ltr" /></div>
          <div className="property-group"><label>{tr('Product URL', 'رابط المنتج')}</label><input type="url" value={selectedBlock.productUrl || ''} onChange={(e) => ch('productUrl', e.target.value)} placeholder="https://" dir="ltr" /></div>
          {colorInput('textColor', 'Text Color')}
          <div className="property-group"><label>{tr('Show Price', 'إظهار السعر')}</label>
            <div className="property-segmented">
              <button type="button" className={selectedBlock.showPrice !== false ? 'is-active' : ''} onClick={() => ch('showPrice', true)}>{tr('Yes', 'نعم')}</button>
              <button type="button" className={selectedBlock.showPrice === false ? 'is-active' : ''} onClick={() => ch('showPrice', false)}>{tr('No', 'لا')}</button>
            </div>
          </div>
          <div className="property-group"><label>{tr('Show Buy Button', 'إظهار زر الشراء')}</label>
            <div className="property-segmented">
              <button type="button" className={selectedBlock.showBuyButton !== false ? 'is-active' : ''} onClick={() => ch('showBuyButton', true)}>{tr('Yes', 'نعم')}</button>
              <button type="button" className={selectedBlock.showBuyButton === false ? 'is-active' : ''} onClick={() => ch('showBuyButton', false)}>{tr('No', 'لا')}</button>
            </div>
          </div>
          <div className="property-group"><label>{tr('Card Style', 'نمط البطاقة')}</label>
            <div className="property-segmented">
              <button type="button" className={(selectedBlock.cardStyle || 'bordered') === 'bordered' ? 'is-active' : ''} onClick={() => ch('cardStyle', 'bordered')}>{tr('Bordered', 'بإطار')}</button>
              <button type="button" className={selectedBlock.cardStyle === 'plain' ? 'is-active' : ''} onClick={() => ch('cardStyle', 'plain')}>{tr('Plain', 'بسيطة')}</button>
              <button type="button" className={selectedBlock.cardStyle === 'shadow' ? 'is-active' : ''} onClick={() => ch('cardStyle', 'shadow')}>{tr('Shadow', 'ظل')}</button>
            </div>
          </div>
          <div className="property-group"><label>{tr('Alignment', 'المحاذاة')}</label>{alignRow(selectedBlock.textAlign || 'center', 'textAlign')}</div>
        </>}

        {/* Divider Block */}
        {selectedBlock.type === BLOCK_TYPES.DIVIDER && <>
          <div className="property-group"><label>{tr('Style', 'النمط')}</label>
            <div className="property-segmented">
              <button type="button" className={selectedBlock.style === 'line' ? 'is-active' : ''} onClick={() => ch('style', 'line')}>{tr('Line', 'خط')}</button>
              <button type="button" className={selectedBlock.style === 'dashed' ? 'is-active' : ''} onClick={() => ch('style', 'dashed')}>{tr('Dashed', 'متقطع')}</button>
              <button type="button" className={selectedBlock.style === 'dots' ? 'is-active' : ''} onClick={() => ch('style', 'dots')}>{tr('Dots', 'نقاط')}</button>
            </div>
          </div>
          {colorInput('color', 'Color')}
          {rangeInput('thickness', 'Thickness', 1, 10)}
          {rangeInput('spacing', 'Spacing', 0, 40)}
        </>}

        {/* Socials Block */}
        {selectedBlock.type === BLOCK_TYPES.SOCIALS && <>
          {colorInput('iconColor', 'Icon Color')}
          {rangeInput('iconSize', 'Icon Size', 20, 48)}
          {rangeInput('spacing', 'Spacing', 4, 32)}
          <div className="property-group"><label>{tr('Alignment', 'المحاذاة')}</label>{alignRow(selectedBlock.alignment || 'center', 'alignment')}</div>
          <div className="property-group">
            <label>{tr('Platforms', 'المنصات')}</label>
            <div className="social-platforms-picker">
              {SOCIAL_PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                const isActive = (selectedBlock.platforms || []).includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    type="button"
                    className={`social-platform-chip ${isActive ? 'is-active' : ''}`}
                    style={{ '--platform-color': platform.color }}
                    onClick={() => {
                      const currentPlatforms = selectedBlock.platforms || [];
                      const newPlatforms = isActive
                        ? currentPlatforms.filter(p => p !== platform.id)
                        : [...currentPlatforms, platform.id];
                      ch('platforms', newPlatforms);
                    }}
                    title={tr(platform.label, platform.labelAr)}
                  >
                    <Icon size={16} />
                    <span>{tr(platform.label, platform.labelAr)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {(selectedBlock.platforms || []).length > 0 && (
            <div className="property-group">
              <label>{tr('Platform Links', 'روابط المنصات')}</label>
              <div className="social-links-editor">
                {(selectedBlock.platforms || []).map((platformId) => {
                  const platform = SOCIAL_PLATFORMS.find(p => p.id === platformId);
                  if (!platform) return null;
                  const Icon = platform.icon;
                  const urls = selectedBlock.urls || {};
                  return (
                    <div key={platformId} className="social-link-row">
                      <div className="social-link-label">
                        <Icon size={14} style={{ color: platform.color }} />
                        <span>{tr(platform.label, platform.labelAr)}</span>
                      </div>
                      <input
                        type="url"
                        value={urls[platformId] || ''}
                        onChange={(e) => ch('urls', { ...urls, [platformId]: e.target.value })}
                        placeholder={`https://${platform.label.toLowerCase()}.com/...`}
                        dir="ltr"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>}

        {/* Quote Block */}
        {selectedBlock.type === 'quote' && <>
          <div className="property-group"><label>{tr('Content', 'المحتوى')}</label><textarea value={selectedBlock.content || ''} onChange={(e) => ch('content', e.target.value)} rows={4} /></div>
          {colorInput('textColor', 'Text Color')}
          {colorInput('backgroundColor', 'Background')}
          {rangeInput('fontSize', 'Font Size', 12, 48)}
          <div className="property-group"><label>{tr('Alignment', 'المحاذاة')}</label>{alignRow(selectedBlock.textAlign || 'left', 'textAlign')}</div>
        </>}

        {/* List Block */}
        {selectedBlock.type === 'list' && <>
          <div className="property-group"><label>{tr('Items', 'العناصر')}</label>
            {(selectedBlock.items || []).map((item, i) => (
              <div key={i} className="list-item-row">
                <input type="text" value={item} onChange={(e) => { const items = [...(selectedBlock.items || [])]; items[i] = e.target.value; ch('items', items); }} />
                <button type="button" onClick={() => { const items = [...(selectedBlock.items || [])]; items.splice(i, 1); ch('items', items); }}>X</button>
              </div>
            ))}
            <button type="button" className="add-item-btn" onClick={() => ch('items', [...(selectedBlock.items || []), 'New Item'])}>+ {tr('Add Item', 'إضافة عنصر')}</button>
          </div>
          {colorInput('textColor', 'Text Color')}
          {rangeInput('fontSize', 'Font Size', 10, 32)}
          <div className="property-group"><label>{tr('Alignment', 'المحاذاة')}</label>{alignRow(selectedBlock.textAlign || 'left', 'textAlign')}</div>
        </>}
        {/* Spacer Block */}
        {selectedBlock.type === 'spacer' && <>
          {rangeInput('height', 'Height', 10, 100)}
        </>}

        {/* Banner Block */}
        {selectedBlock.type === 'banner' && <>
          <div className="property-group"><label>{tr('Title', 'العنوان')}</label><input type="text" value={selectedBlock.title || ''} onChange={(e) => ch('title', e.target.value)} /></div>
          <div className="property-group"><label>{tr('Subtitle', 'النص الفرعي')}</label><input type="text" value={selectedBlock.subtitle || ''} onChange={(e) => ch('subtitle', e.target.value)} /></div>
          {colorInput('backgroundColor', 'Background')}
          {colorInput('textColor', 'Text Color')}
          <div className="property-group"><label>{tr('Alignment', 'المحاذاة')}</label>{alignRow(selectedBlock.textAlign || 'center', 'textAlign')}</div>
        </>}

        {/* Coupon Block */}
        {selectedBlock.type === 'coupon' && <>
          <div className="property-group"><label>{tr('Discount Text', 'نص الخصم')}</label><input type="text" value={selectedBlock.discount || ''} onChange={(e) => ch('discount', e.target.value)} /></div>
          <div className="property-group"><label>{tr('Code', 'الكود')}</label><input type="text" value={selectedBlock.code || ''} onChange={(e) => ch('code', e.target.value)} /></div>
          {colorInput('backgroundColor', 'Background')}
          {colorInput('borderColor', 'Border Color')}
          {colorInput('textColor', 'Text Color')}
        </>}

        {/* Countdown Block */}
        {selectedBlock.type === 'countdown' && <>
          <div className="property-group"><label>{tr('Title', 'العنوان')}</label><input type="text" value={selectedBlock.title || ''} onChange={(e) => ch('title', e.target.value)} /></div>
          <div className="property-group"><label>{tr('End Date', 'تاريخ النهاية')}</label><input type="datetime-local" value={selectedBlock.endDate || ''} onChange={(e) => ch('endDate', e.target.value)} /></div>
          {colorInput('backgroundColor', 'Background')}
          {colorInput('textColor', 'Text Color')}
        </>}

        {/* Contact Block */}
        {selectedBlock.type === 'contact' && <>
          <div className="property-group"><label>{tr('Phone', 'الهاتف')}</label><input type="tel" value={selectedBlock.phone || ''} onChange={(e) => ch('phone', e.target.value)} dir="ltr" /></div>
          <div className="property-group"><label>{tr('Email', 'البريد')}</label><input type="email" value={selectedBlock.email || ''} onChange={(e) => ch('email', e.target.value)} dir="ltr" /></div>
          <div className="property-group"><label>{tr('Website', 'الموقع')}</label><input type="url" value={selectedBlock.website || ''} onChange={(e) => ch('website', e.target.value)} placeholder="https://" dir="ltr" /></div>
          {colorInput('textColor', 'Text Color')}
          {rangeInput('fontSize', 'Font Size', 10, 32)}
          <div className="property-group"><label>{tr('Alignment', 'المحاذاة')}</label>{alignRow(selectedBlock.textAlign || 'left', 'textAlign')}</div>
        </>}

        {/* Address Block */}
        {selectedBlock.type === 'address' && <>
          <div className="property-group"><label>{tr('Street', 'الشارع')}</label><input type="text" value={selectedBlock.street || ''} onChange={(e) => ch('street', e.target.value)} /></div>
          <div className="property-group"><label>{tr('City', 'المدينة')}</label><input type="text" value={selectedBlock.city || ''} onChange={(e) => ch('city', e.target.value)} /></div>
          <div className="property-group"><label>{tr('Country', 'البلد')}</label><input type="text" value={selectedBlock.country || ''} onChange={(e) => ch('country', e.target.value)} /></div>
          {colorInput('textColor', 'Text Color')}
          {rangeInput('fontSize', 'Font Size', 10, 32)}
          <div className="property-group"><label>{tr('Alignment', 'المحاذاة')}</label>{alignRow(selectedBlock.textAlign || 'left', 'textAlign')}</div>
        </>}
      </div>
    </div>
  );
}
