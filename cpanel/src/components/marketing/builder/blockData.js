// T-003 - Email Template Builder: Block definitions

export const BLOCK_TYPES = {
  TEXT: 'text',
  BUTTON: 'button',
  IMAGE: 'image',
  PRODUCT: 'product',
  DIVIDER: 'divider',
  SOCIALS: 'socials',
  QUOTE: 'quote',
  LIST: 'list',
  SPACER: 'spacer',
  BANNER: 'banner',
  COUPON: 'coupon',
  COUNTDOWN: 'countdown',
  CONTACT: 'contact',
  ADDRESS: 'address',
};

export const DEFAULT_BLOCK_STYLES = {
  backgroundColor: '#ffffff',
  textColor: '#26344a',
  padding: '20px',
  borderRadius: '0px',
  textAlign: 'left',
  fontSize: '16px',
  fontWeight: 'normal',
  lineHeight: '1.6',
};

let blockCounter = 0;
export const createBlock = (type, overrides = {}) => {
  blockCounter++;
  const id = `block-${Date.now()}-${blockCounter}`;
  const baseBlock = { id, type, isSelected: false, isHovered: false, ...DEFAULT_BLOCK_STYLES };

  switch (type) {
    case BLOCK_TYPES.TEXT:
      return { ...baseBlock, content: '', tag: 'p', isHeader: false };
    case BLOCK_TYPES.BUTTON:
      return { ...baseBlock, text: 'Shop Now', url: '#', buttonColor: '#2169ca', buttonTextColor: '#ffffff', buttonRadius: '999px', buttonPadding: '12px 24px', alignment: 'center' };
    case BLOCK_TYPES.IMAGE:
      return { ...baseBlock, src: '', alt: '', link: '', width: '100%', height: 'auto' };
    case BLOCK_TYPES.DIVIDER:
      return { ...baseBlock, style: 'line', thickness: '1px', color: '#e2e8f0', spacing: '20px' };
    case BLOCK_TYPES.PRODUCT:
      return { ...baseBlock, productId: '', productName: 'Product Name', productPrice: '$99.00', productImage: '', productUrl: '#', showPrice: true, showBuyButton: true, cardStyle: 'bordered' };
    case BLOCK_TYPES.SOCIALS:
      return { ...baseBlock, platforms: ['facebook', 'instagram', 'twitter', 'linkedin'], urls: { facebook: '#', instagram: '#', twitter: '#', linkedin: '#' }, iconSize: '24px', iconColor: '#2169ca', spacing: '12px', alignment: 'center' };
    case BLOCK_TYPES.QUOTE:
      return { ...baseBlock, content: 'Enter your quote here...', backgroundColor: '#f8fafc', textColor: '#475569', padding: '24px' };
    case BLOCK_TYPES.LIST:
      return { ...baseBlock, items: ['Item 1', 'Item 2', 'Item 3'], backgroundColor: '#ffffff', textColor: '#334155' };
    case BLOCK_TYPES.SPACER:
      return { ...baseBlock, height: '40px', backgroundColor: 'transparent', padding: '0px' };
    case BLOCK_TYPES.BANNER:
      return { ...baseBlock, title: 'Special Offer!', subtitle: 'Get 50% off today', backgroundColor: '#2169ca', textColor: '#ffffff', padding: '32px' };
    case BLOCK_TYPES.COUPON:
      return { ...baseBlock, discount: '50% OFF', code: 'SAVE50', backgroundColor: '#fff8e6', borderColor: '#f59e0b', textColor: '#92400e', padding: '20px' };
    case BLOCK_TYPES.COUNTDOWN:
      return { ...baseBlock, title: 'Sale Ends In', endDate: '', backgroundColor: '#1e293b', textColor: '#ffffff', padding: '24px' };
    case BLOCK_TYPES.CONTACT:
      return { ...baseBlock, phone: '+966 XX XXX XXXX', email: 'info@company.com', website: 'www.company.com', backgroundColor: '#f8fafc' };
    case BLOCK_TYPES.ADDRESS:
      return { ...baseBlock, street: '123 Main Street', city: 'Riyadh', country: 'Saudi Arabia', backgroundColor: '#f8fafc' };
    default:
      return baseBlock;
  }
};