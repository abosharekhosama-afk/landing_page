// T-003 — Image Block Component
import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

export default function ImageBlock({ block, isEditing, onContentChange, language }) {
  const tr = (en, ar) => (language === 'ar' ? ar : en);
  const align = block.textAlign || 'center';
  const justify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  const handleChange = (field, value) => {
    if (onContentChange) {
      onContentChange(block.id, { [field]: value });
    }
  };

  const imageWrapperStyle = {
    padding: block.padding,
    backgroundColor: block.backgroundColor,
    display: 'flex',
    justifyContent: justify,
  };

  const imageStyle = {
    width: block.width,
    maxWidth: '100%',
    height: block.height || 'auto',
    display: 'block',
    margin: 0,
    borderRadius: block.borderRadius,
  };

  return (
    <div className="email-block email-image-block" style={imageWrapperStyle}>
      {isEditing ? (
        <div className="image-block-editor">
          <div className="image-upload-area">
            {block.src ? (
              <div className="image-preview-wrapper">
                <img src={block.src} alt={block.alt} style={imageStyle} />
              </div>
            ) : (
              <div className="image-placeholder">
                <ImageIcon size={32} />
                <span>{tr('Click to add image', 'انقر لإضافة صورة')}</span>
              </div>
            )}
            <input
              type="text"
              value={block.src}
              onChange={(e) => handleChange('src', e.target.value)}
              placeholder={tr('Image URL', 'رابط الصورة')}
              className="image-url-input"
            />
          </div>
          <input
            type="text"
            value={block.alt}
            onChange={(e) => handleChange('alt', e.target.value)}
            placeholder={tr('Alt text', 'النص البديل')}
            className="image-alt-input"
          />
        </div>
      ) : block.src ? (
        <img src={block.src} alt={block.alt || tr('Image', 'صورة')} style={imageStyle} />
      ) : (
        <div className="image-empty-state">
          <ImageIcon size={40} />
          <span>{tr('No image added', 'لم تتم إضافة صورة')}</span>
        </div>
      )}
    </div>
  );
}
