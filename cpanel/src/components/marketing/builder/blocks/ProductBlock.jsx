// T-003 — Product Block Component
import React from 'react';
import { ShoppingBag } from 'lucide-react';

export default function ProductBlock({ block, isEditing, onContentChange, language }) {
  const tr = (en, ar) => (language === 'ar' ? ar : en);

  const handleChange = (field, value) => {
    if (onContentChange) {
      onContentChange(block.id, { [field]: value });
    }
  };

  const align = block.textAlign || 'center';
  const cardStyle = {
    backgroundColor: block.backgroundColor,
    padding: block.padding,
    textAlign: align,
  };

  const productCardStyle = {
    display: 'inline-block',
    border: block.cardStyle === 'bordered' ? '1px solid #e2e8f0' : 'none',
    borderRadius: block.cardStyle === 'shadow' ? '12px' : '8px',
    boxShadow: block.cardStyle === 'shadow' ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
    padding: '16px',
    textAlign: 'center',
    maxWidth: '280px',
    margin: '0 auto',
  };

  const imageContainerStyle = {
    width: '100%',
    aspectRatio: '1/1',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
    overflow: 'hidden',
  };

  return (
    <div className="email-block email-product-block" style={cardStyle}>
      <div style={productCardStyle}>
        {isEditing ? (
          <div className="product-block-editor">
            <div style={imageContainerStyle}>
              {block.productImage ? (
                <img src={block.productImage} alt={block.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <ShoppingBag size={40} color="#7a8798" />
              )}
            </div>
            <input
              type="text"
              value={block.productName}
              onChange={(e) => handleChange('productName', e.target.value)}
              placeholder={tr('Product name', 'اسم المنتج')}
              className="product-name-input"
            />
            <div className="product-price-row">
              <span className="product-price">{block.productPrice || '$0.00'}</span>
            </div>
          </div>
        ) : (
          <>
            <div style={imageContainerStyle}>
              {block.productImage ? (
                <img src={block.productImage} alt={block.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <ShoppingBag size={40} color="#7a8798" />
              )}
            </div>
            <h4 style={{ margin: '0 0 8px', color: block.textColor }}>{block.productName}</h4>
            {block.showPrice && (
              <p style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 'bold', color: '#2169ca' }}>
                {block.productPrice}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
