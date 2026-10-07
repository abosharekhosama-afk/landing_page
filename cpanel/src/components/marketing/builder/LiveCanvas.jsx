// T-003 - Live Canvas Component: Email preview sheet
import React from 'react';
import { ChevronUp, ChevronDown, Pencil, Copy, Trash2 } from 'lucide-react';
import { BLOCK_TYPES } from './blockData.js';
import { TextBlock, ButtonBlock, ImageBlock, ProductBlock, DividerBlock, SocialsBlock, QuoteBlock, ListBlock, SpacerBlock, BannerBlock, CouponBlock, CountdownBlock, ContactBlock, AddressBlock } from './blocks/index.js';

const BLOCK_COMPONENTS = {
  [BLOCK_TYPES.TEXT]: TextBlock,
  [BLOCK_TYPES.BUTTON]: ButtonBlock,
  [BLOCK_TYPES.IMAGE]: ImageBlock,
  [BLOCK_TYPES.PRODUCT]: ProductBlock,
  [BLOCK_TYPES.DIVIDER]: DividerBlock,
  [BLOCK_TYPES.SOCIALS]: SocialsBlock,
  [BLOCK_TYPES.QUOTE]: QuoteBlock,
  [BLOCK_TYPES.LIST]: ListBlock,
  [BLOCK_TYPES.SPACER]: SpacerBlock,
  [BLOCK_TYPES.BANNER]: BannerBlock,
  [BLOCK_TYPES.COUPON]: CouponBlock,
  [BLOCK_TYPES.COUNTDOWN]: CountdownBlock,
  [BLOCK_TYPES.CONTACT]: ContactBlock,
  [BLOCK_TYPES.ADDRESS]: AddressBlock,
};

export default function LiveCanvas({
  blocks,
  selectedBlockId,
  previewMode,
  senderName,
  subject,
  previewText,
  onSelectBlock,
  onUpdateBlock,
  onMoveBlock,
  onDuplicateBlock,
  onDeleteBlock,
  language,
  tr,
}) {
  const [hoveredBlockId, setHoveredBlockId] = React.useState(null);

  const handleBlockClick = (e, blockId) => {
    e.stopPropagation();
    onSelectBlock(blockId);
  };

  const handleCanvasClick = () => {
    onSelectBlock(null);
  };

  const getBlockActions = (block, index) => {
    const actions = [];
    if (index > 0) {
      actions.push(
        <button key="move-up" type="button" onClick={() => onMoveBlock(block.id, 'up')} title={tr('Move Up', 'تحريك لاعلى')}>
          <ChevronUp size={14} />
        </button>
      );
    }
    if (index < blocks.length - 1) {
      actions.push(
        <button key="move-down" type="button" onClick={() => onMoveBlock(block.id, 'down')} title={tr('Move Down', 'تحريك لاسفل')}>
          <ChevronDown size={14} />
        </button>
      );
    }
    return actions;
  };

  return (
    <div className="live-canvas-wrapper" onClick={handleCanvasClick}>
      <div className={`email-canvas-sheet ${previewMode === 'mobile' ? 'is-mobile' : ''}`}>
        <div className="email-inbox-bar">
          <span className="email-inbox-avatar">{(senderName || 'S').charAt(0).toUpperCase()}</span>
          <div className="email-inbox-meta">
            <strong>{tr('From', 'من')}: {senderName || tr('Your sender name', 'اسم المرسل')}</strong>
            <b>{subject || tr('No subject yet - set it in Details', 'لا يوجد موضوع بعد - عينه في التفاصيل')}</b>
            <small>{previewText || tr('Preview text appears here', 'يظهر نص المعاينة هنا')}</small>
          </div>
        </div>

        <div className="email-canvas-body">
          {blocks.length === 0 ? (
            <div className="email-canvas-empty">
              <p>{tr('No blocks added yet. Use the panel on the right to add blocks.', 'لم تتم اضافة كتل بعد. استخدم اللوحة على اليمين لاضافة كتل.')}</p>
            </div>
          ) : (
            <div className="email-content-renderer">
              {blocks.map((block, index) => {
                const BlockComponent = BLOCK_COMPONENTS[block.type];
                if (!BlockComponent) return null;

                const isSelected = selectedBlockId === block.id;
                const isHovered = hoveredBlockId === block.id;

                return (
                  <div
                    key={block.id}
                    className={`canvas-block-wrapper ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''}`}
                    onClick={(e) => handleBlockClick(e, block.id)}
                    onMouseEnter={() => setHoveredBlockId(block.id)}
                    onMouseLeave={() => setHoveredBlockId(null)}
                  >
                    {(isSelected || isHovered) && (
                      <div className="block-action-bar">
                        <div className="block-actions-right">
                          {getBlockActions(block, index)}
                        </div>
                        <div className="block-actions-left">
                          <button type="button" onClick={(e) => { e.stopPropagation(); onSelectBlock(block.id); }} title={tr('Edit', 'تعديل')}>
                            <Pencil size={14} />
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); onDuplicateBlock(block.id); }} title={tr('Duplicate', 'تكرار')}>
                            <Copy size={14} />
                          </button>
                          <button type="button" className="is-delete" onClick={(e) => { e.stopPropagation(); onDeleteBlock(block.id); }} title={tr('Delete', 'حذف')}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                    <BlockComponent block={block} language={language} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="email-canvas-footer">
          <small>{tr('Sent with iCare Marketing', 'مرسل بواسطة iCare للتسويق')}</small>
        </div>
      </div>
    </div>
  );
}