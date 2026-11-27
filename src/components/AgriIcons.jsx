import React from 'react';

/**
 * Clean, minimalist agricultural SVG vector icon set.
 * Consistent 1.8 stroke-width, rounded caps/joins, muted enterprise styling.
 */

const BaseIcon = ({ size = 20, color = 'currentColor', strokeWidth = 1.8, children, style = {} }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ verticalAlign: 'middle', flexShrink: 0, ...style }}
    aria-hidden="true"
  >
    {children}
  </svg>
);

// Grain Stalk / Sheaf (Logo & Commodity)
export const GrainStalkIcon = (props) => (
  <BaseIcon {...props}>
    <path d="M12 22V8" />
    <path d="M12 8C10.5 5.5 8 5 6 6c0 2.5 1.5 4.5 6 5" />
    <path d="M12 8c1.5-2.5 4-3 6-2 0 2.5-1.5 4.5-6 5" />
    <path d="M12 13c-2-1.5-4.5-1.8-6-.5 0 2 1.5 3.5 6 4" />
    <path d="M12 13c2-1.5 4.5-1.8 6-.5 0 2-1.5 3.5-6 4" />
  </BaseIcon>
);

// Grain Silo / Storage Bin
export const SiloStorageIcon = (props) => (
  <BaseIcon {...props}>
    {/* Domed roof */}
    <path d="M4 10C4 6 7.5 3 12 3s8 3 8 7" />
    {/* Main silo cylinder */}
    <rect x="4" y="10" width="16" height="11" rx="1" />
    {/* Silo graduation ribs */}
    <line x1="4" y1="14" x2="20" y2="14" />
    <line x1="4" y1="18" x2="20" y2="18" />
    {/* Vertical indicator */}
    <line x1="12" y1="10" x2="12" y2="21" />
  </BaseIcon>
);

// Balance Scale (Settlement & Accounts)
export const SettlementScaleIcon = (props) => (
  <BaseIcon {...props}>
    <line x1="12" y1="3" x2="12" y2="21" />
    <line x1="4" y1="7" x2="20" y2="7" />
    {/* Left pan */}
    <path d="M2 13l4-6 4 6c0 1.5-1.8 2.5-4 2.5s-4-1-4-2.5z" />
    {/* Right pan */}
    <path d="M14 13l4-6 4 6c0 1.5-1.8 2.5-4 2.5s-4-1-4-2.5z" />
    {/* Stand base */}
    <line x1="8" y1="21" x2="16" y2="21" />
  </BaseIcon>
);

// Security Shield & Lock (Tenant Isolation & Privacy)
export const TenantShieldIcon = (props) => (
  <BaseIcon {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </BaseIcon>
);

// Mobile & Tablet Responsive Device
export const MobilePhoneIcon = (props) => (
  <BaseIcon {...props}>
    <rect x="6" y="2" width="12" height="20" rx="2.5" />
    <line x1="10" y1="18" x2="14" y2="18" />
    <line x1="10" y1="5" x2="14" y2="5" />
  </BaseIcon>
);

// Rice Mill / Industrial Warehouse
export const MillFactoryIcon = (props) => (
  <BaseIcon {...props}>
    <path d="M3 21h18" />
    <path d="M5 21V9l6-4v4l6-4v16" />
    <path d="M9 21v-4h4v4" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="15" cy="12" r="1" />
  </BaseIcon>
);

// Farmer / Network Member Silhouette
export const FarmerAvatarIcon = (props) => (
  <BaseIcon {...props}>
    {/* Hat brim */}
    <path d="M4 11c2.5-2 13.5-2 16 0" />
    {/* Hat dome */}
    <path d="M8 10c0-3 1.8-5 4-5s4 2 4 5" />
    {/* Body */}
    <circle cx="12" cy="13" r="3" />
    <path d="M5 21c0-3.5 3.1-6 7-6s7 2.5 7 6" />
  </BaseIcon>
);

// Rupee Currency / Coins Stack
export const RupeeCoinIcon = (props) => (
  <BaseIcon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 7.5h7" />
    <path d="M8.5 10.5h5.5" />
    <path d="M11 7.5v3a2.5 2.5 0 0 1-2.5 2.5h1l4 4" />
  </BaseIcon>
);

// Trending Upward / Inward Delivery
export const TrendingUpIcon = (props) => (
  <BaseIcon {...props}>
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </BaseIcon>
);

// Pending Clock / Hourglass
export const PendingClockIcon = (props) => (
  <BaseIcon {...props}>
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 6 12 12 16 14" />
  </BaseIcon>
);

// Clipboard / Audited Ledger
export const ClipboardLedgerIcon = (props) => (
  <BaseIcon {...props}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <line x1="8" y1="11" x2="16" y2="11" />
    <line x1="8" y1="15" x2="13" y2="15" />
  </BaseIcon>
);

// Lightning / Instant Speed
export const SpeedBoltIcon = (props) => (
  <BaseIcon {...props}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </BaseIcon>
);

// Inward Arrow (Stock Receive / Intake)
export const InwardArrowIcon = (props) => (
  <BaseIcon {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </BaseIcon>
);

// Outward Arrow (Stock Delivery / Dispatch)
export const OutwardArrowIcon = (props) => (
  <BaseIcon {...props}>
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </BaseIcon>
);
