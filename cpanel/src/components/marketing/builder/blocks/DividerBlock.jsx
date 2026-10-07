// T-003 — Divider Block Component
import React from 'react';
import { Minus } from 'lucide-react';

export default function DividerBlock({ block, isEditing, onContentChange, language }) {
  const tr = (en, ar) => (language === 'ar' ? ar : en);

  const handleChange = (field, value) => {
    if (onContentChange) {
      onContentChange(block.id, { [field]: value });
    }
  };

  const containerStyle = {
    paddingTop: block.padding,
    paddingBottom: block.padding,
    backgroundColor: block.backgroundColor,
    display: 'flex',
    justifyContent: 'center',
  };

  const dividerStyle = {
    width: block.style === 'line' ? '100%' : '60px',
    height: block.thickness,
    backgroundColor: block.style === 'line' ? block.color : 'transparent',
    borderTop: block.style === 'dashed' ? `${block.thickness} dashed ${block.color}` : 'none',
    borderRadius: block.style === 'dots' ? '0' : '4px',
  };

  return (
    <div className="email-block email-divider-block" style={containerStyle}>
      {isEditing ? (
        <div className="divider-block-editor">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              type="button"
              className={block.style === 'line' ? 'is-active' : ''}
              onClick={() => handleChange('style', 'line')}
            >
              {tr('Line', 'خط')}
            </button>
            <button
              type="button"
              className={block.style === 'dashed' ? 'is-active' : ''}
              onClick={() => handleChange('style', 'dashed')}
            >
              {tr('Dashed', 'متقطع')}
            </button>
          </div>
          <div style={dividerStyle} />
        </div>
      ) : (
        <>
          {block.style === 'dots' ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: block.thickness,
                    height: block.thickness,
                    borderRadius: '50%',
                    backgroundColor: block.color,
                  }}
                />
              ))}
            </div>
          ) : (
            <div style={dividerStyle} />
          )}
        </>
      )}
    </div>
  );
}
