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
        {/* Left: 2D Glass Silo Visualizer */}
        <div className="silo-visual-container">
          <svg className="silo-svg" viewBox="0 0 200 280" preserveAspectRatio="xMidYMid meet">
            <defs>
              {/* Glass Silo Reflections */}
              <linearGradient id="siloGlassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
                <stop offset="15%" stopColor="rgba(255,255,255,0.05)" />
                <stop offset="70%" stopColor="rgba(0,0,0,0.25)" />
                <stop offset="90%" stopColor="rgba(255,255,255,0.15)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.25)" />
              </linearGradient>

              {/* Metallic Dome and Steel Framing */}
              <linearGradient id="siloDomeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e3a2b" />
                <stop offset="30%" stopColor="#3d6b53" />
                <stop offset="60%" stopColor="#244534" />
                <stop offset="100%" stopColor="#13241b" />
              </linearGradient>

              {/* Golden Grain Gradient */}
              <linearGradient id="grainFillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="18%" stopColor="#f59e0b" />
                <stop offset="60%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#92400e" />
              </linearGradient>

              {/* Grain Texture Pattern */}
              <pattern id="grainDots" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="0.8" fill="rgba(255,255,255,0.3)" />
                <circle cx="7" cy="6" r="0.8" fill="rgba(0,0,0,0.2)" />
                <circle cx="3" cy="8" r="0.6" fill="rgba(255,255,255,0.2)" />
              </pattern>

              {/* Clip Path for Silo Cylindrical Interior */}
              <clipPath id="siloInteriorClip">
                <rect x="30" y="55" width="140" height="175" rx="6" ry="6" />
              </clipPath>
            </defs>

            {/* Silo Support Legs & Base Funnel */}
            <path d="M 45 230 L 30 268 L 38 268 L 52 230 Z" fill="#1b3628" />
            <path d="M 155 230 L 170 268 L 162 268 L 148 230 Z" fill="#1b3628" />
            <path d="M 60 230 L 80 255 L 120 255 L 140 230 Z" fill="#142b20" stroke="rgba(52,211,153,0.3)" strokeWidth="1.5" />
            <rect x="75" y="255" width="50" height="14" rx="2" fill="#0d1e15" stroke="rgba(52,211,153,0.4)" strokeWidth="1" />

            {/* Silo Top Dome / Roof */}
            <path
              d="M 22 55 Q 100 12 178 55 Z"
              fill="url(#siloDomeGrad)"
              stroke="rgba(52,211,153,0.4)"
              strokeWidth="2"
            />
            {/* Aeration cap / Hatch */}
            <ellipse cx="100" cy="18" rx="16" ry="7" fill="#2d5540" stroke="rgba(52,211,153,0.5)" strokeWidth="1.5" />
            <line x1="100" y1="11" x2="100" y2="6" stroke="rgba(52,211,153,0.7)" strokeWidth="2" strokeLinecap="round" />

            {/* Silo Transparent Body Shell */}
            <rect
              x="28"
              y="55"
              width="144"
              height="176"
              rx="8"
              ry="8"
              fill="rgba(8, 20, 14, 0.72)"
              stroke="rgba(52,211,153,0.35)"
              strokeWidth="2.5"
            />

            {/* Clipped Inside Area: Grain Fill + Waves */}
            <g clipPath="url(#siloInteriorClip)">
              {/* Back ambient tint */}
              <rect x="30" y="55" width="140" height="175" fill="rgba(3, 8, 5, 0.45)" />

              {/* Dynamic Grain Fill with Height Transition */}
              {animatedHeight > 0 && (
                <g
                  style={{
                    transform: `translateY(${175 * (1 - animatedHeight / 100)}px)`,
                    transition: 'transform 900ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  {/* Grain Base Mass */}
                  <rect
                    x="30"
                    y="60"
                    width="140"
                    height="180"
                    fill="url(#grainFillGrad)"
                  />

                  {/* Grain Pattern Overlay */}
                  <rect
                    x="30"
                    y="60"
                    width="140"
                    height="180"
                    fill="url(#grainDots)"
                    opacity="0.65"
                  />

                  {/* Surface Wave Crest */}
                  <path
                    d="M 30 60 Q 65 52, 100 60 T 170 60 L 170 70 L 30 70 Z"
                    fill="#fef08a"
                    opacity="0.9"
                  />
                  <path
                    d="M 30 63 Q 65 57, 100 63 T 170 63 L 170 72 L 30 72 Z"
                    fill="#f59e0b"
                    opacity="0.5"
                  />
                </g>
              )}

              {/* Empty state soft dust when 0 stock */}
              {animatedHeight === 0 && (
                <text
                  x="100"
                  y="145"
                  textAnchor="middle"
                  fill="rgba(148,169,156,0.6)"
                  fontSize="12"
                  fontWeight="600"
                  letterSpacing="0.5"
                >
                  Silo Empty
                </text>
              )}
            </g>

            {/* Measurement Graduated Ticks on Silo Wall */}
            <g stroke="rgba(255,255,255,0.35)" strokeWidth="1.2">
              {/* 100% Top Tick */}
              <line x1="32" y1="65" x2="42" y2="65" />
              <line x1="158" y1="65" x2="168" y2="65" />
              {/* 75% Tick */}
              <line x1="32" y1="105" x2="39" y2="105" />
              <line x1="161" y1="105" x2="168" y2="105" />
              {/* 50% Center Tick */}
              <line x1="32" y1="145" x2="44" y2="145" stroke="rgba(52,211,153,0.7)" strokeWidth="1.8" />
              <line x1="156" y1="145" x2="168" y2="145" stroke="rgba(52,211,153,0.7)" strokeWidth="1.8" />
              {/* 25% Tick */}
              <line x1="32" y1="185" x2="39" y2="185" />
              <line x1="161" y1="185" x2="168" y2="185" />
              {/* 0% Bottom Tick */}
              <line x1="32" y1="225" x2="42" y2="225" />
              <line x1="158" y1="225" x2="168" y2="225" />
            </g>

            {/* Vertical Glass Highlights */}
            <rect
              x="28"
              y="55"
              width="144"
              height="176"
              rx="8"
              ry="8"
              fill="url(#siloGlassGrad)"
              pointerEvents="none"
            />

            {/* Horizontal Steel Reinforcement Bands */}
            <line x1="28" y1="95" x2="172" y2="95" stroke="rgba(52,211,153,0.25)" strokeWidth="1.5" />
            <line x1="28" y1="135" x2="172" y2="135" stroke="rgba(52,211,153,0.25)" strokeWidth="1.5" />
            <line x1="28" y1="175" x2="172" y2="175" stroke="rgba(52,211,153,0.25)" strokeWidth="1.5" />
            <line x1="28" y1="215" x2="172" y2="215" stroke="rgba(52,211,153,0.25)" strokeWidth="1.5" />

            {/* Visual Fill Percentage Tag */}
            <rect x="80" y="215" width="40" height="15" rx="7" fill="rgba(6,14,10,0.85)" stroke="rgba(52,211,153,0.3)" />
            <text x="100" y="226" textAnchor="middle" fill="var(--green-light)" fontSize="9.5" fontWeight="750">
              {animatedHeight}%
            </text>
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
