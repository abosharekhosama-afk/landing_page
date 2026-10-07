// T-003 - Email Preview Modal Component - Realistic Email Client Simulation
import React, { useState } from 'react';
import { X, Monitor, Smartphone, Mail, Star, MoreHorizontal, Reply, Forward, Printer, Trash2, Archive, Flag, ChevronDown } from 'lucide-react';
import { BlockRenderer } from './EmailBlockRenderers.jsx';

export default function EmailPreviewModal({
  isOpen, onClose, anchorRect, previewMode, onPreviewModeChange,
  senderName, subject, previewText, blocks, language, tr,
}) {
  const [showSenderDetails, setShowSenderDetails] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  if (!isOpen) return null;

  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = now.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
  const senderEmail = (senderName || 'sender').toLowerCase().replace(/\s+/g, '.') + '@example.com';

  // Anchor the window right under the Preview button, centered on screen,
  // stretched to the bottom (full screen height) — never clipped in LTR/RTL.
  let anchoredStyle = null;
  if (anchorRect && window.innerWidth > 640) {
    const width = Math.min(980, window.innerWidth - 24);
    const left = Math.max(12, (window.innerWidth - width) / 2);
    // Keep the whole window inside the viewport: reserve a 380px minimum height
    const top = Math.max(12, Math.min(anchorRect.bottom + 8, window.innerHeight - 380 - 12));
    // Full screen height: from just under the button down to the viewport bottom
    const maxH = Math.max(380, window.innerHeight - top - 12);
    const height = maxH;
    anchoredStyle = {
      position: 'fixed',
      top,
      left,
      width,
      maxWidth: width,
      height,
      maxHeight: maxH,
      margin: 0,
      '--email-preview-top': `${top}px`,
      zIndex: 2001,
    };
  }

  return (
    <div className="email-client-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="email-client-container" style={anchoredStyle || undefined} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {/* Top bar */}
        <div className="email-client-header">
          <button type="button" className="email-client-btn" onClick={onClose} title={tr('Close', 'إغلاق')}><X size={18} /></button>
          <div className="preview-mode-toggle">
            <button type="button" className={previewMode !== 'mobile' ? 'is-active' : ''} onClick={() => onPreviewModeChange && onPreviewModeChange('desktop')} title={tr('Desktop', 'سطح المكتب')}><Monitor size={16} /></button>
            <button type="button" className={previewMode === 'mobile' ? 'is-active' : ''} onClick={() => onPreviewModeChange && onPreviewModeChange('mobile')} title={tr('Mobile', 'جوال')}><Smartphone size={16} /></button>
          </div>
        </div>

                {/* Toolbar */}
        <div className="email-client-toolbar">
          <button type="button" className="toolbar-btn" title={tr('Archive', 'أرشفة')}><Archive size={16} /></button>
          <button type="button" className="toolbar-btn" title={tr('Report spam', 'إبلاغ عن مزعج')}><Flag size={16} /></button>
          <button type="button" className="toolbar-btn" title={tr('Delete', 'حذف')}><Trash2 size={16} /></button>
          <span className="toolbar-divider" />
          <button type="button" className="toolbar-btn" title={tr('Mark as unread', 'وضع علامة كغير مقروء')}><Mail size={16} /></button>
          <span className="flex-spacer" />
          <span className="toolbar-pagination">{tr('1 of 1', '١ من ١')}</span>
          <button type="button" className="toolbar-btn" title={tr('Print', 'طباعة')} onClick={() => window.print()}><Printer size={16} /></button>
        </div>

        {/* Message view */}
        <div className={`email-client-content${previewMode === 'mobile' ? ' is-mobile' : ''}`}>
          <div className="email-client-email-view">
            <h1 className="email-view-subject">{subject || tr('No subject', 'بدون موضوع')}</h1>
            <div className="email-view-sender">
              <span className="email-sender-avatar">{(senderName || 'S').charAt(0).toUpperCase()}</span>
              <div className="email-sender-info">
                <div className="email-sender-name-row">
                  <span className="email-sender-name">{senderName || tr('Sender Name', 'اسم المرسل')}</span>
                  <span className="email-sender-email">&lt;{senderEmail}&gt;</span>
                  <button type="button" className="sender-details-toggle" onClick={() => setShowSenderDetails(!showSenderDetails)}><ChevronDown size={14} /></button>
                </div>
                <div className="email-sender-to">{tr('to me', 'إلي')}</div>
                {showSenderDetails && (
                  <div className="email-sender-details">
                    <div><strong>{tr('From', 'من')}:</strong> {senderName || tr('Sender Name', 'اسم المرسل')} &lt;{senderEmail}&gt;</div>
                    {previewText && <div><strong>{tr('Preview', 'معاينة')}:</strong> {previewText}</div>}
                  </div>
                )}
              </div>
              <div className="email-sender-meta">
                <span className="email-time">{dateString}, {timeString}</span>
                <button type="button" className="toolbar-btn" title={tr('Star', 'تمييز بنجمة')}><Star size={16} /></button>
                <div className="toolbar-dropdown-wrapper">
                  <button type="button" className="toolbar-btn" onClick={() => setShowMoreActions(!showMoreActions)}><MoreHorizontal size={16} /></button>
                  {showMoreActions && (
                    <div className="toolbar-dropdown">
                      <button type="button" onClick={() => setShowMoreActions(false)}><Reply size={14} /> {tr('Reply', 'رد')}</button>
                      <button type="button" onClick={() => setShowMoreActions(false)}><Forward size={14} /> {tr('Forward', 'إعادة توجيه')}</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="email-view-body">
              {(!blocks || blocks.length === 0) ? (
                <div className="email-view-empty">
                  <Mail size={48} />
                  <p>{tr('No content to preview', 'لا يوجد محتوى للمعاينة')}</p>
                </div>
              ) : (
                <div className="email-blocks-renderer" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  {blocks.map((block) => <BlockRenderer key={block.id} block={block} tr={tr} language={language} />)}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="email-view-footer">
              <span className="email-footer-text">{tr('Sent with iCare Marketing', 'مرسل بواسطة iCare للتسويق')}</span>
              <a href="#" className="email-footer-unsubscribe" onClick={(e) => e.preventDefault()}>{tr('Unsubscribe', 'إلغاء الاشتراك')}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
