// T-003 — Text Block Component
import React from 'react';
import { Heading2 } from 'lucide-react';

const MERGE_TAGS = [
  { tag: '{First_Name}', en: 'First name', ar: 'الاسم الأول' },
  { tag: '{Last_Name}', en: 'Last name', ar: 'اسم العائلة' },
  { tag: '{Company_Name}', en: 'Company', ar: 'الشركة' },
  { tag: '{Order_Total}', en: 'Order total', ar: 'إجمالي الطلب' },
];

function renderContent(content) {
  const parts = String(content || '').split(/(\{[A-Za-z_]+\})/g);
  return parts.map((part, i) =>
    /^\{[A-Za-z_]+\}$/.test(part)
      ? <span className="merge-tag-chip" key={i}>{part}</span>
      : <React.Fragment key={i}>{part}</React.Fragment>
  );
}

export default function TextBlock({ block, isEditing, onContentChange, language }) {
  const tr = (en, ar) => (language === 'ar' ? ar : en);

  const handleChange = (e) => {
    if (onContentChange) onContentChange(block.id, { content: e.target.value });
  };

  const insertTag = (tag) => {
    if (onContentChange) onContentChange(block.id, { content: `${block.content || ''}${block.content ? ' ' : ''}${tag}` });
  };

  const textStyles = {
    color: block.textColor,
    fontSize: block.fontSize,
    fontWeight: block.isHeader ? '700' : (block.fontWeight || 'normal'),
    textAlign: block.textAlign,
    lineHeight: block.lineHeight,
    backgroundColor: block.backgroundColor,
    padding: block.padding,
  };

  return (
    <div className="email-block email-text-block" style={textStyles}>
      {isEditing ? (
        <div className="text-block-editor" onClick={(e) => e.stopPropagation()}>
          <textarea
            className="text-block-textarea"
            value={block.content || ''}
            onChange={handleChange}
            placeholder={tr('Enter your text here...', 'أدخل نصك هنا...')}
            rows={4}
          />
          <div className="merge-tags-row">
            {MERGE_TAGS.map(({ tag, en, ar }) => (
              <button key={tag} type="button" className="merge-tag-btn" onClick={() => insertTag(tag)} title={tag}>
                {tr(en, ar)}
              </button>
            ))}
            <button
              type="button"
              className={`merge-tag-btn ${block.isHeader ? 'is-active' : ''}`}
              onClick={() => onContentChange && onContentChange(block.id, { isHeader: !block.isHeader })}
            >
              <Heading2 size={13} />
              {tr('Heading', 'عنوان')}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-block-preview">
          {block.isHeader ? (
            <h2 className="text-block-heading" style={{ margin: 0 }}>{block.content ? renderContent(block.content) : tr('Heading text', 'نص العنوان')}</h2>
          ) : (
            <p className="text-block-paragraph" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{block.content ? renderContent(block.content) : tr('Text content', 'محتوى النص')}</p>
          )}
        </div>
      )}
    </div>
  );
}
