// T-003 - Template Builder Canvas: Main editor container (Wix-like)
import React from 'react';
import { Monitor, Smartphone, Undo2, Redo2, Save, Send, X, ChevronRight, ChevronLeft, Eye, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import LiveCanvas from './LiveCanvas.jsx';
import BlockPalette from './BlockPalette.jsx';
import BlockPropertiesPanel from './BlockPropertiesPanel.jsx';
import EmailPreviewModal from './EmailPreviewModal.jsx';
import { createBlock } from './blockData.js';

export default function TemplateBuilderCanvas({
  blocks, selectedBlockId, previewMode, onBlocksChange, onSelectBlock,
  onSave, onSendTest, onClose, onBack, onContinue, onPreviewModeChange, language, campaign,
}) {
  const tr = (en, ar) => (language === 'ar' ? ar : en);
  const isRtl = language === 'ar';
  const [past, setPast] = React.useState([]);
  const [future, setFuture] = React.useState([]);
  const [notice, setNotice] = React.useState('');
  const [showPreview, setShowPreview] = React.useState(false);
  const [modalPreviewMode, setModalPreviewMode] = React.useState(previewMode || 'desktop');
  const [previewAnchor, setPreviewAnchor] = React.useState(null);
  const [paletteCollapsed, setPaletteCollapsed] = React.useState(false);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  // Auto-collapse palette when a block is selected for editing
  React.useEffect(() => {
    if (selectedBlockId) {
      setPaletteCollapsed(true);
    }
  }, [selectedBlockId]);
  const showNotice = (msg) => { setNotice(msg); setTimeout(() => setNotice(''), 3000); };

  const commit = React.useCallback((next) => {
    setPast((p) => [...p.slice(-49), JSON.parse(JSON.stringify(blocks))]);
    setFuture([]);
    onBlocksChange(next);
  }, [blocks, onBlocksChange]);

  const handleUndo = () => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [JSON.parse(JSON.stringify(blocks)), ...f]);
    onBlocksChange(prev);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, JSON.parse(JSON.stringify(blocks))]);
    onBlocksChange(next);
  };

  const handleAddBlock = (newBlock) => {
    commit([...blocks, newBlock]);
    onSelectBlock(newBlock.id);
  };

  const handleUpdateBlock = (blockId, changes) => {
    commit(blocks.map((b) => (b.id === blockId ? { ...b, ...changes } : b)));
  };

  const handleMoveBlock = (blockId, dir) => {
    const idx = blocks.findIndex((b) => b.id === blockId);
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const updated = [...blocks];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    commit(updated);
  };

  const handleDuplicate = (blockId) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    const newBlock = createBlock(block.type, { ...block, id: undefined });
    const idx = blocks.findIndex((b) => b.id === blockId);
    commit([...blocks.slice(0, idx + 1), newBlock, ...blocks.slice(idx + 1)]);
    onSelectBlock(newBlock.id);
  };

  const handleDelete = (blockId) => {
    commit(blocks.filter((b) => b.id !== blockId));
    if (selectedBlockId === blockId) onSelectBlock(null);
  };

  const handleSave = () => {
    if (onSave) onSave(blocks);
    showNotice(tr('Template saved successfully!', 'تم حفظ القالب بنجاح!'));
  };

  const handleTest = () => {
    if (onSendTest) onSendTest();
    showNotice(tr('Test email prepared - check your inbox.', 'تم تجهيز رسالة الاختبار - تحقق من بريدك.'));
  };

  const handleContinue = () => {
    if (onSave) onSave(blocks);
    if (onContinue) onContinue();
  };

  const handleOpenPreview = (e) => {
    setPreviewAnchor(e.currentTarget ? e.currentTarget.getBoundingClientRect() : null);
    setModalPreviewMode(previewMode || 'desktop');
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
  };

  const handleModalModeChange = (mode) => {
    setModalPreviewMode(mode);
    if (onPreviewModeChange) onPreviewModeChange(mode);
  };

  return (
    <div className="template-builder-canvas" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="builder-header">
        <div className="builder-header-left">
          <button type="button" className="builder-close-btn" onClick={onClose} title={tr('Exit editor', 'خروج من المحرر')}><X size={18} /></button>
          <span className="builder-title">{tr('Email Editor', 'محرر البريد')}</span>
        </div>
        <div className="builder-header-center">
          <div className="device-toggle">
            <button type="button" className={previewMode !== 'mobile' ? 'is-active' : ''} onClick={() => onPreviewModeChange && onPreviewModeChange('desktop')}>
              <Monitor size={16} /><span>{tr('Desktop', 'سطح المكتب')}</span>
            </button>
            <button type="button" className={previewMode === 'mobile' ? 'is-active' : ''} onClick={() => onPreviewModeChange && onPreviewModeChange('mobile')}>
              <Smartphone size={16} /><span>{tr('Mobile', 'الجوال')}</span>
            </button>
          </div>
        </div>
        <div className="builder-header-right">
          <button type="button" className="builder-action-btn" onClick={handleUndo} disabled={past.length === 0} title={tr('Undo', 'تراجع')}><Undo2 size={16} /></button>
          <button type="button" className="builder-action-btn" onClick={handleRedo} disabled={future.length === 0} title={tr('Redo', 'اعادة')}><Redo2 size={16} /></button>
          <button type="button" className="builder-action-btn preview-btn" onClick={handleOpenPreview}>
            <Eye size={16} /><span>{tr('Preview', 'معاينة')}</span>
          </button>
          <button type="button" className="builder-action-btn" onClick={handleSave}><Save size={16} /><span>{tr('Save', 'حفظ')}</span></button>
          <button type="button" className="builder-action-btn secondary" onClick={handleTest}><Send size={16} /><span>{tr('Send Test', 'ارسال تجريبي')}</span></button>
        </div>
      </div>
      {notice && <div className="builder-notice"><span>{notice}</span></div>}
      <div className={`builder-main ${paletteCollapsed ? 'is-palette-collapsed' : ''}`}>
        <aside className="builder-sidebar-left">
          <BlockPropertiesPanel selectedBlock={selectedBlock} onUpdateBlock={handleUpdateBlock} onClose={() => { onSelectBlock(null); setPaletteCollapsed(false); }} language={language} />
        </aside>
        <main className={`builder-canvas ${paletteCollapsed ? 'is-expanded' : ''}`}>
          <LiveCanvas
            blocks={blocks} selectedBlockId={selectedBlockId} previewMode={previewMode}
            senderName={campaign?.senderName} subject={campaign?.subject} previewText={campaign?.previewText}
            onSelectBlock={onSelectBlock} onUpdateBlock={handleUpdateBlock} onMoveBlock={handleMoveBlock}
            onDuplicateBlock={handleDuplicate} onDeleteBlock={handleDelete} language={language} tr={tr}
          />
        </main>
        <aside className={`builder-sidebar-right ${paletteCollapsed ? 'is-collapsed' : ''}`}>
          <button type="button" className="palette-collapse-btn" onClick={() => setPaletteCollapsed(!paletteCollapsed)} title={paletteCollapsed ? tr('Expand blocks panel', 'توسيع لوحة الكتل') : tr('Collapse blocks panel', 'طي لوحة الكتل')}>
            {paletteCollapsed ? <Layers size={18} /> : <ChevronDown size={18} />}
            <span>{paletteCollapsed ? tr('Add Blocks', 'إضافة كتل') : tr('Collapse', 'طي')}</span>
            {!paletteCollapsed && (isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />)}
          </button>
          {!paletteCollapsed && <BlockPalette onAddBlock={handleAddBlock} language={language} />}
        </aside>
      </div>
      <div className="builder-footer">
        <div className="builder-footer-side">
          <button type="button" className="builder-footer-btn" onClick={onBack || onClose}>
            {isRtl ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            <span>{tr('Back', 'رجوع')}</span>
          </button>
        </div>
        <small className="builder-footer-hint">{tr('Step 3 of 5 - Content', 'الخطوة 3 من 5 - المحتوى')}</small>
        <div className="builder-footer-side">
          <button type="button" className="builder-footer-btn is-primary" onClick={handleContinue}>
            <span>{tr('Continue - Recipients', 'متابعة - المستلمون')}</span>
            {isRtl ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>
      {showPreview && (
        <EmailPreviewModal
          isOpen={true}
          onClose={handleClosePreview}
          anchorRect={previewAnchor}
          previewMode={modalPreviewMode}
          onPreviewModeChange={handleModalModeChange}
          senderName={campaign?.senderName}
          subject={campaign?.subject}
          previewText={campaign?.previewText}
          blocks={blocks}
          language={language}
          tr={tr}
        />
      )}
    </div>
  );
}