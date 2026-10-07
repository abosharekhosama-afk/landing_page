// T-003 - Socials Block Component - Enhanced with full editing
import React from 'react';
import { Facebook, Instagram, Twitter, Linkedin, Youtube, Phone, Mail, Globe, Plus, Trash2, ExternalLink } from 'lucide-react';

const SOCIAL_PLATFORMS = [
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: '#1877f2' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: '#e4405f' },
  { id: 'twitter', label: 'Twitter', icon: Twitter, color: '#1da1f2' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: '#0a66c2' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, color: '#ff0000' },
  { id: 'whatsapp', label: 'WhatsApp', icon: Globe, color: '#25d366' },
  { id: 'phone', label: 'Phone', icon: Phone, color: '#2169ca' },
  { id: 'email', label: 'Email', icon: Mail, color: '#2169ca' },
  { id: 'website', label: 'Website', icon: Globe, color: '#2169ca' },
];

function SocialBlockRender({ block }) {
  const platforms = block.platforms || [];
  const urls = block.urls || {};
  const iconSize = parseInt(block.iconSize || '28', 10);
  const spacing = parseInt(block.spacing || '12', 10);
  const alignment = block.alignment || 'center';
  const iconColor = block.iconColor || '#2169ca';

  if (platforms.length === 0) {
    return (
      <div style={{ textAlign: alignment, padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
        No social platforms selected
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: alignment === 'left' ? 'flex-start' : alignment === 'right' ? 'flex-end' : 'center',
      gap: `${spacing}px`,
      padding: '16px'
    }}>
      {platforms.map((platformId) => {
        const platform = SOCIAL_PLATFORMS.find((p) => p.id === platformId);
        if (!platform) return null;
        const Icon = platform.icon;
        const hasUrl = urls[platformId] && urls[platformId] !== '#';

        return (
          <a
            key={platformId}
            href={urls[platformId] || '#'}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: `${iconSize + 16}px`,
              height: `${iconSize + 16}px`,
              borderRadius: '50%',
              background: hasUrl ? `${platform.color}15` : '#f1f5f9',
              color: hasUrl ? platform.color : '#94a3b8',
              transition: 'all 0.2s ease',
            }}
            title={platform.label}
          >
            <Icon size={iconSize} />
          </a>
        );
      })}
    </div>
  );
}

export default function SocialsBlock({ block, isEditing, onContentChange, language }) {
  const tr = (en, ar) => (language === 'ar' ? ar : en);
  const platforms = block.platforms || [];
  const urls = block.urls || {};

  const togglePlatform = (platformId) => {
    const newPlatforms = platforms.includes(platformId)
      ? platforms.filter((p) => p !== platformId)
      : [...platforms, platformId];
    onContentChange(block.id, { platforms: newPlatforms });
  };

  const updateUrl = (platformId, url) => {
    onContentChange(block.id, { urls: { ...urls, [platformId]: url } });
  };

  const addCustomPlatform = () => {
    const customId = `custom_${Date.now()}`;
    onContentChange(block.id, {
      platforms: [...platforms, customId],
      urls: { ...urls, [customId]: '#' },
    });
  };

  if (isEditing) {
    return (
      <div className="socials-block-editor">
        <div className="socials-platforms-grid">
          {SOCIAL_PLATFORMS.map((platform) => {
            const Icon = platform.icon;
            const isActive = platforms.includes(platform.id);
            return (
              <button
                key={platform.id}
                type="button"
                className={`social-platform-btn ${isActive ? 'is-active' : ''}`}
                style={{ '--platform-color': platform.color }}
                onClick={() => togglePlatform(platform.id)}
              >
                <Icon size={18} />
                <span>{tr(platform.label, platform.label)}</span>
              </button>
            );
          })}
        </div>

        {platforms.length > 0 && (
          <div className="socials-urls-section">
            <h4>{tr('Platform URLs', 'ط±ظˆط§ط¨ط· ط§ظ„ظ…ظ†طµط§طھ')}</h4>
            {platforms.map((platformId) => {
              const platform = SOCIAL_PLATFORMS.find((p) => p.id === platformId);
              if (!platform) return null;
              const Icon = platform.icon;
              return (
                <div key={platformId} className="social-url-row">
                  <div className="social-url-label">
                    <Icon size={16} style={{ color: platform.color }} />
                    <span>{platform.label}</span>
                  </div>
                  <div className="social-url-input">
                    <input
                      type="url"
                      value={urls[platformId] || ''}
                      onChange={(e) => updateUrl(platformId, e.target.value)}
                      placeholder={`https://${platform.label.toLowerCase()}.com/...`}
                      dir="ltr"
                    />
                    {urls[platformId] && urls[platformId] !== '#' && (
                      <a
                        href={urls[platformId]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-url-link"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button type="button" className="social-add-custom-btn" onClick={addCustomPlatform}>
          <Plus size={16} />
          <span>{tr('Add Custom Link', 'ط¥ط¶ط§ظپط© ط±ط§ط¨ط· ظ…ط®طµطµ')}</span>
        </button>
      </div>
    );
  }

  return <SocialBlockRender block={block} />;
}

export { SocialBlockRender };
