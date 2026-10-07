// T-003 — Button Block Component
import React from 'react';
import { MousePointerClick } from 'lucide-react';

export default function ButtonBlock({ block, isEditing, onContentChange, language }) {
  const tr = (en, ar) => (language === 'ar' ? ar : en);

  const handleChange = (field, value) => {
    if (onContentChange) {
      onContentChange(block.id, { [field]: value });
    }
  };

  const buttonStyle = {
    display: 'inline-block',
    backgroundColor: block.buttonColor,
    color: block.buttonTextColor,
    padding: block.buttonPadding,
    borderRadius: block.buttonRadius,
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
    textAlign: 'center',
    cursor: isEditing ? 'pointer' : 'default',
    border: 'none',
    minWidth: '120px',
  };

  const containerStyle = {
    display: 'flex',
    justifyContent: block.alignment === 'left' ? 'flex-start' : block.alignment === 'right' ? 'flex-end' : 'center',
    padding: block.padding,
  };

  return (
    <div className="email-block email-button-block" style={{ backgroundColor: block.backgroundColor }}>
      <div style={containerStyle}>
        {isEditing ? (
          <div className="button-block-editor">
            <input
              type="text"
              value={block.text}
              onChange={(e) => handleChange('text', e.target.value)}
              placeholder={tr('Button text', 'نص الزر')}
              className="button-text-input"
            />
            <button style={buttonStyle} type="button">
              {block.text || tr('Button', 'زر')}
            </button>
          </div>
        ) : (
          <a href={block.url || '#'} style={buttonStyle} onClick={(e) => e.preventDefault()}>
            <MousePointerClick size={14} style={{ marginInlineEnd: '6px', verticalAlign: 'middle' }} />
            {block.text || tr('Shop Now', 'تسوق الآن')}
          </a>
        )}
      </div>
    </div>
  );
}
