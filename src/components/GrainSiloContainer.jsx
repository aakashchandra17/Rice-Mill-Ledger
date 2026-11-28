import { useState, useEffect, useMemo } from 'react';
import { GrainStalkIcon, InwardArrowIcon, OutwardArrowIcon } from './AgriIcons';

/**
 * Animated 2D Grain Storage Container (Silo)
 * Visually displays live stock level using smooth SVG/CSS transitions
 * with authentic agricultural grain styling, glass reflection, and measurement ticks.
 */
export default function GrainSiloContainer({
  title = 'Grain Storage Yard / Silo',
  grainName = 'Paddy / Grain Stock',
  currentStock = 0,
  unit = 'quintal',
  totalReceived = 0,
  totalDelivered = 0,
  subtext = 'Live on-hand yard inventory',
  availableGrains = [], // optional array of { id, name, available, unit, received }
  onSelectGrain = null,
  selectedGrainId = null,
}) {
  const stockNum = Math.max(0, Number(currentStock || 0));
  const receivedNum = Math.max(stockNum, Number(totalReceived || 0));

  // Determine realistic fill percentage without inventing fake maximum capacities
  // Scale dynamically relative to total received or recent peak
  const fillPercent = useMemo(() => {
    if (stockNum <= 0) return 0;
    const baseReference = receivedNum > 0 ? receivedNum : stockNum * 1.25;
    const ratio = (stockNum / baseReference) * 100;
    // Bound visually between 8% (so empty isn't confused with low) and 95% (below roof)
    return Math.min(94, Math.max(10, Math.round(ratio)));
  }, [stockNum, receivedNum]);

  // Animated visual height for smooth CSS transitions
  const [animatedHeight, setAnimatedHeight] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedHeight(fillPercent);
    }, 100);
    return () => clearTimeout(timer);
  }, [fillPercent]);

  // Stock status descriptor
  const stockStatus = useMemo(() => {
    if (stockNum <= 0) return { label: 'Empty Yard', color: 'var(--muted)', bg: 'rgba(148, 163, 184, 0.1)' };
    if (fillPercent < 25) return { label: 'Low Reserves', color: 'var(--gold)', bg: 'rgba(251, 191, 36, 0.12)' };
    if (fillPercent < 70) return { label: 'Optimal Stock', color: 'var(--green-light)', bg: 'rgba(52, 211, 153, 0.12)' };
    return { label: 'High Capacity', color: 'var(--green-glow, #00f098)', bg: 'rgba(0, 240, 152, 0.16)' };
  }, [stockNum, fillPercent]);

  return (
    <div className="grain-silo-card panel">
      {/* Header */}
      <div className="silo-header">
        <div>
          <div className="silo-eyebrow">
            <span className="silo-live-indicator" />
            REAL-TIME COMMODITY SILO
          </div>
          <h3 className="silo-title">{title}</h3>
          <p className="silo-subtext">{subtext}</p>
        </div>

        <div className="silo-status-badge" style={{ color: stockStatus.color, background: stockStatus.bg }}>
          <span className="silo-status-dot" style={{ backgroundColor: stockStatus.color }} />
          {stockStatus.label}
        </div>
      </div>

      {/* Multiple Grains Selector Tabs (if multiple provided) */}
      {availableGrains && availableGrains.length > 1 && (
        <div className="silo-grain-tabs">
          {availableGrains.map(g => {
            const isSelected = String(g.id || g.grainId) === String(selectedGrainId);
            return (
              <button
                key={g.id || g.grainId}
                type="button"
                className={`silo-grain-tab ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectGrain && onSelectGrain(g.id || g.grainId)}
              >
                <span className="tab-grain-dot" />
                <span className="tab-grain-name">{g.name || g.grainName}</span>
                <span className="tab-grain-qty">{Number(g.available || g.stock || 0).toLocaleString('en-IN')} {g.unit || unit}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Silo Visual & Stats Container */}
      <div className="silo-body-grid">
        {/* Left: Modern 2D Glass Silo Visualizer */}
        <div className="silo-visual-container">
          <svg className="silo-svg" viewBox="0 0 200 280" preserveAspectRatio="xMidYMid meet">
            <defs>
              {/* Glass Silo Specular Sheen */}
              <linearGradient id="siloGlassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
                <stop offset="18%" stopColor="rgba(255,255,255,0.03)" />
                <stop offset="75%" stopColor="rgba(0,0,0,0.18)" />
                <stop offset="95%" stopColor="rgba(255,255,255,0.08)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.18)" />
              </linearGradient>

              {/* Brushed Metallic Silo Cap */}
              <linearGradient id="siloCapGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#152b1e" />
                <stop offset="25%" stopColor="#2c533e" />
                <stop offset="65%" stopColor="#1d3b2a" />
                <stop offset="100%" stopColor="#122319" />
              </linearGradient>

              {/* Natural Harvest Amber Grain Gradient */}
              <linearGradient id="neatGrainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="14%" stopColor="#f59e0b" />
                <stop offset="55%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#92400e" />
              </linearGradient>

              {/* Clip Path for Silo Cylindrical Chamber */}
              <clipPath id="siloChamberClip">
                <rect x="34" y="50" width="132" height="174" rx="8" ry="8" />
              </clipPath>
            </defs>

            {/* Industrial Support Structure (Clean, Solid, Engineered) */}
            {/* Structural base beam */}
            <rect x="28" y="224" width="144" height="6" rx="3" fill="#162e21" stroke="rgba(52,211,153,0.3)" strokeWidth="1.2" />

            {/* Dual heavy-duty vertical steel columns */}
            <rect x="44" y="230" width="10" height="35" rx="2" fill="#10251a" stroke="rgba(52,211,153,0.25)" strokeWidth="1" />
            <rect x="146" y="230" width="10" height="35" rx="2" fill="#10251a" stroke="rgba(52,211,153,0.25)" strokeWidth="1" />

            {/* Ground footplates */}
            <rect x="38" y="262" width="22" height="4" rx="2" fill="#0c1d14" stroke="rgba(52,211,153,0.35)" />
            <rect x="140" y="262" width="22" height="4" rx="2" fill="#0c1d14" stroke="rgba(52,211,153,0.35)" />

            {/* Central inverted conical discharge hopper */}
            <path d="M 72 230 L 86 253 L 114 253 L 128 230 Z" fill="#0c1d14" stroke="rgba(52,211,153,0.3)" strokeWidth="1.2" />
            <rect x="88" y="253" width="24" height="8" rx="2" fill="#193828" stroke="rgba(52,211,153,0.4)" strokeWidth="1" />

            {/* Silo Top Aerodynamic Dome Cap */}
            <path
              d="M 32 50 Q 100 28 168 50 Z"
              fill="url(#siloCapGrad)"
              stroke="rgba(52,211,153,0.35)"
              strokeWidth="1.8"
            />
            {/* Sleek low-profile vent collar */}
            <rect x="89" y="25" width="22" height="6" rx="3" fill="#1b3a2a" stroke="rgba(52,211,153,0.45)" strokeWidth="1" />

            {/* Silo Transparent Glass Shell */}
            <rect
              x="32"
              y="50"
              width="136"
              height="175"
              rx="10"
              ry="10"
              fill="rgba(8, 22, 15, 0.65)"
              stroke="rgba(52,211,153,0.28)"
              strokeWidth="2"
            />

            {/* Inside Clipped Chamber: Grain Mass + Liquid Wave */}
            <g clipPath="url(#siloChamberClip)">
              {/* Dark chamber interior */}
              <rect x="34" y="50" width="132" height="174" fill="rgba(4, 12, 8, 0.55)" />

              {/* Dynamic Grain Fill with Height Transition */}
              {animatedHeight > 0 && (
                <g
                  style={{
                    transform: `translateY(${174 * (1 - animatedHeight / 100)}px)`,
                    transition: 'transform 850ms cubic-bezier(0.25, 1, 0.5, 1)',
                  }}
                >
                  {/* Organic wave surface mass */}
                  <path
                    d="M 34 0 Q 67 -6, 100 0 T 166 0 L 166 185 L 34 185 Z"
                    fill="url(#neatGrainGrad)"
                  />

                  {/* Surface crest highlight */}
                  <path
                    d="M 34 0 Q 67 -6, 100 0 T 166 0"
                    fill="none"
                    stroke="rgba(254, 240, 138, 0.9)"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M 34 2 Q 67 -4, 100 2 T 166 2"
                    fill="none"
                    stroke="rgba(245, 158, 11, 0.6)"
                    strokeWidth="1.5"
                  />
                </g>
              )}

              {/* Empty state label when zero stock */}
              {animatedHeight === 0 && (
                <text
                  x="100"
                  y="140"
                  textAnchor="middle"
                  fill="rgba(148,169,156,0.55)"
                  fontSize="12"
                  fontWeight="600"
                  letterSpacing="0.4"
                >
                  Silo Empty
                </text>
              )}
            </g>

            {/* Precision Measurement Gauge Ticks (Clean & Minimalist along left wall) */}
            <g stroke="rgba(255,255,255,0.25)" strokeWidth="1.2">
              {/* 100% Mark */}
              <line x1="36" y1="62" x2="46" y2="62" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" />
              {/* 75% Mark */}
              <line x1="36" y1="102" x2="43" y2="102" />
              {/* 50% Center Mark */}
              <line x1="36" y1="142" x2="48" y2="142" stroke="rgba(52,211,153,0.7)" strokeWidth="1.8" />
              {/* 25% Mark */}
              <line x1="36" y1="182" x2="43" y2="182" />
              {/* 0% Bottom Mark */}
              <line x1="36" y1="218" x2="46" y2="218" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" />
            </g>

            {/* Subtle Right Wall Level Indicator Notch */}
            {animatedHeight > 0 && (
              <g
                style={{
                  transform: `translateY(${174 * (1 - animatedHeight / 100)}px)`,
                  transition: 'transform 850ms cubic-bezier(0.25, 1, 0.5, 1)',
                }}
              >
                <polygon
                  points="164,0 156,-4 156,4"
                  fill="var(--gold)"
                  stroke="rgba(254,240,138,0.8)"
                  strokeWidth="0.8"
                />
              </g>
            )}

            {/* Vertical Glass Specular Highlight Sheen */}
            <rect
              x="32"
              y="50"
              width="136"
              height="175"
              rx="10"
              ry="10"
              fill="url(#siloGlassGrad)"
              pointerEvents="none"
            />
          </svg>
        </div>

        {/* Right: Real Stock Quantities & Details */}
        <div className="silo-details-panel">
          <div className="silo-grain-badge">
            <GrainStalkIcon size={16} color="var(--gold)" />
            <span>{grainName}</span>
          </div>

          <div className="silo-stock-display">
            <span className="silo-stock-number">
              {stockNum.toLocaleString('en-IN')}
            </span>
            <span className="silo-stock-unit">{unit}</span>
          </div>
          <div className="silo-stock-caption">Current On-Hand Available Stock</div>

          <div className="silo-metrics-row">
            <div className="silo-submetric">
              <span className="submetric-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <InwardArrowIcon size={13} color="var(--gold)" /> Total Received
              </span>
              <span className="submetric-value" style={{ color: 'var(--gold)' }}>
                {receivedNum.toLocaleString('en-IN')} <small>{unit}</small>
              </span>
            </div>

            <div className="silo-submetric">
              <span className="submetric-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <OutwardArrowIcon size={13} color="#60a5fa" /> Dispatched / Mill
              </span>
              <span className="submetric-value" style={{ color: '#60a5fa' }}>
                {Math.max(0, Number(totalDelivered || 0)).toLocaleString('en-IN')} <small>{unit}</small>
              </span>
            </div>
          </div>

          <div className="silo-live-footer">
            <span className="pulse-dot" />
            <span>Levels update automatically on confirmed receipts and dispatches.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
