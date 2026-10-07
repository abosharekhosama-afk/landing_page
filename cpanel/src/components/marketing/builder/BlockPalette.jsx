// T-003 - Block Palette: Side panel for adding blocks to the email template
import React from 'react';
import { Type, MousePointerClick, Image as ImageIcon, ShoppingBag, Minus, Share2, Plus, Quote, List, Heart, Gift, Percent, Calendar, Phone, MapPin } from 'lucide-react';
import { BLOCK_TYPES, createBlock } from './blockData.js';

const BLOCK_CATEGORIES = [
  {
    id: 'basic',
    labelEn: 'Basic',
    labelAr: 'أساسي',
    blocks: [
      { type: BLOCK_TYPES.TEXT, icon: Type, labelEn: 'Text', labelAr: 'نص' },
      { type: BLOCK_TYPES.BUTTON, icon: MousePointerClick, labelEn: 'Button', labelAr: 'زر' },
      { type: BLOCK_TYPES.IMAGE, icon: ImageIcon, labelEn: 'Image', labelAr: 'صورة' },
    ],
  },
  {
    id: 'layout',
    labelEn: 'Layout',
    labelAr: 'تخطيط',
    blocks: [
      { type: BLOCK_TYPES.DIVIDER, icon: Minus, labelEn: 'Divider', labelAr: 'فاصل' },
      { type: BLOCK_TYPES.SPACER, icon: Heart, labelEn: 'Spacer', labelAr: 'مسافة' },
    ],
  },
  {
    id: 'media',
    labelEn: 'Products & Social',
    labelAr: 'سلع وتواصل',
    blocks: [
      { type: BLOCK_TYPES.PRODUCT, icon: ShoppingBag, labelEn: 'Product Card', labelAr: 'كارت منتج' },
      { type: BLOCK_TYPES.SOCIALS, icon: Share2, labelEn: 'Social Icons', labelAr: 'أيقونات التواصل' },
    ],
  },
  {
    id: 'content',
    labelEn: 'Content',
    labelAr: 'محتوى',
    blocks: [
      { type: BLOCK_TYPES.QUOTE, icon: Quote, labelEn: 'Quote', labelAr: 'اقتباس' },
      { type: BLOCK_TYPES.LIST, icon: List, labelEn: 'List', labelAr: 'قائمة' },
    ],
  },
  {
    id: 'promo',
    labelEn: 'Promo',
    labelAr: 'عروض',
    blocks: [
      { type: BLOCK_TYPES.BANNER, icon: Gift, labelEn: 'Banner', labelAr: 'بانر' },
      { type: BLOCK_TYPES.COUPON, icon: Percent, labelEn: 'Coupon', labelAr: 'كوبون' },
      { type: BLOCK_TYPES.COUNTDOWN, icon: Calendar, labelEn: 'Countdown', labelAr: 'عد تنازلي' },
    ],
  },
  {
    id: 'contact',
    labelEn: 'Contact',
    labelAr: 'اتصال',
    blocks: [
      { type: BLOCK_TYPES.CONTACT, icon: Phone, labelEn: 'Contact Info', labelAr: 'معلومات الاتصال' },
      { type: BLOCK_TYPES.ADDRESS, icon: MapPin, labelEn: 'Address', labelAr: 'العنوان' },
    ],
  },
];

export default function BlockPalette({ onAddBlock, language }) {
  const [activeTab, setActiveTab] = React.useState('basic');
  const tr = (en, ar) => (language === 'ar' ? ar : en);

  const currentCategory = BLOCK_CATEGORIES.find((c) => c.id === activeTab) || BLOCK_CATEGORIES[0];

  const handleAddBlock = (blockType) => {
    const newBlock = createBlock(blockType);
    if (onAddBlock) {
      onAddBlock(newBlock);
    }
  };

  return (
    <div className="block-palette">
      <div className="block-palette-header">
        <h3>{tr('Add Blocks', 'إضافة كتل')}</h3>
      </div>

      <div className="block-palette-tabs">
        {BLOCK_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            className={activeTab === category.id ? 'is-active' : ''}
            onClick={() => setActiveTab(category.id)}
          >
            {tr(category.labelEn, category.labelAr)}
          </button>
        ))}
      </div>

      <div className="block-palette-content">
        <div className="block-palette-grid">
          {currentCategory.blocks.map((block) => {
            const Icon = block.icon;
            return (
              <button
                key={block.type}
                type="button"
                className="palette-block-item"
                onClick={() => handleAddBlock(block.type)}
              >
                <span className="palette-block-icon">
                  <Icon size={20} />
                </span>
                <span className="palette-block-label">{tr(block.labelEn, block.labelAr)}</span>
                <span className="palette-block-add">
                  <Plus size={14} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="block-palette-hint">
        <small>{tr('Click a block to add it to your email', 'انقر على كتلة لإضافتها إلى بريدك')}</small>
      </div>
    </div>
  );
}