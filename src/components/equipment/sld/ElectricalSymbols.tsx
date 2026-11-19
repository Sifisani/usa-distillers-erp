import React from 'react';
import { BreakerOperatingState, EnergizationStatus } from '../../../types';

interface SymbolProps {
  className?: string;
  state?: BreakerOperatingState;
  energization?: EnergizationStatus;
  strokeColor?: string;
}

function resolveColor(
  strokeColor?: string,
  energization?: EnergizationStatus,
  state?: BreakerOperatingState
): string {
  if (strokeColor) return strokeColor;
  if (state === 'DECOMMISSIONED' || energization === 'DECOMMISSIONED') return '#94a3b8';
  if (energization === 'FAULT_BACKFEED' || state === 'TRIPPED') return '#dc2626';
  if (state === 'OPEN' || energization === 'DE_ENERGIZED') return '#64748b';
  return '#0f172a';
}

/**
 * Rotating AC Generator / Alternator Symbol (IEC 60617: Circle + G / ~)
 */
export const GeneratorSymbol: React.FC<SymbolProps> = ({
  className = 'w-9 h-9',
  state,
  energization,
  strokeColor
}) => {
  const color = resolveColor(strokeColor, energization, state);
  const isDecomm = state === 'DECOMMISSIONED' || energization === 'DECOMMISSIONED';
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-label="Generator Symbol">
      <circle
        cx="20"
        cy="20"
        r="14"
        stroke={color}
        strokeWidth="2"
        strokeDasharray={isDecomm ? '3 2' : undefined}
      />
      <text
        x="20"
        y="19"
        textAnchor="middle"
        fill={color}
        fontSize="11"
        fontWeight="800"
        fontFamily="ui-monospace, SFMono-Regular, monospace"
      >
        G
      </text>
      <path
        d="M 13 26 Q 16.5 22 20 26 T 27 26"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
      <line x1="20" y1="34" x2="20" y2="40" stroke={color} strokeWidth="2" />
    </svg>
  );
};

/**
 * Two-Winding Power Transformer Symbol (IEC 60617: Two Intersecting Circles)
 */
export const TransformerSymbol: React.FC<SymbolProps> = ({
  className = 'w-9 h-9',
  state,
  energization,
  strokeColor
}) => {
  const color = resolveColor(strokeColor, energization, state);
  const isDecomm = state === 'DECOMMISSIONED' || energization === 'DECOMMISSIONED';
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-label="Transformer Symbol">
      <line x1="20" y1="0" x2="20" y2="5" stroke={color} strokeWidth="2" />
      <circle
        cx="20"
        cy="14"
        r="9"
        stroke={color}
        strokeWidth="2"
        strokeDasharray={isDecomm ? '3 2' : undefined}
      />
      <circle
        cx="20"
        cy="26"
        r="9"
        stroke={color}
        strokeWidth="2"
        strokeDasharray={isDecomm ? '3 2' : undefined}
      />
      {/* Delta / Star winding hint */}
      <path d="M 17 14 L 20 9.5 L 23 14 Z" stroke={color} strokeWidth="1.2" fill="none" />
      <path d="M 20 26 L 20 29 M 20 26 L 17.5 23.5 M 20 26 L 22.5 23.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="20" y1="35" x2="20" y2="40" stroke={color} strokeWidth="2" />
    </svg>
  );
};

/**
 * Metering CT / VT Equipment Symbol
 */
export const MeteringEquipmentSymbol: React.FC<SymbolProps> = ({
  className = 'w-9 h-9',
  state,
  energization,
  strokeColor
}) => {
  const color = resolveColor(strokeColor, energization, state);
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-label="Metering Equipment Symbol">
      <line x1="0" y1="20" x2="10" y2="20" stroke={color} strokeWidth="2" />
      <line x1="30" y1="20" x2="40" y2="20" stroke={color} strokeWidth="2" />
      <rect x="10" y="8" width="20" height="24" rx="2" stroke={color} strokeWidth="1.8" fill="#ffffff" />
      {/* Dual CT/VT ring */}
      <circle cx="20" cy="17" r="5" stroke={color} strokeWidth="1.5" />
      <text
        x="20"
        y="29"
        textAnchor="middle"
        fill={color}
        fontSize="7"
        fontWeight="700"
        fontFamily="ui-monospace, SFMono-Regular, monospace"
      >
        CT/VT
      </text>
    </svg>
  );
};

/**
 * Circuit Breaker Symbol (VCB / ACB / MCCB / MCB)
 * Reflects live switching state: CLOSED solid block/contact, OPEN angled blade,
 * TRIPPED fault cross, DECOMMISSIONED racked-out chevrons.
 */
export const CircuitBreakerSymbol: React.FC<SymbolProps> = ({
  className = 'w-9 h-9',
  state = 'CLOSED',
  energization,
  strokeColor
}) => {
  const color = resolveColor(strokeColor, energization, state);
  const fillClosed =
    energization === 'FAULT_BACKFEED'
      ? '#dc2626'
      : energization === 'ENERGIZED'
      ? '#0f766e'
      : color;

  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-label={`Circuit Breaker (${state})`}>
      {/* Top & bottom conductor leads */}
      <line x1="20" y1="0" x2="20" y2="10" stroke={color} strokeWidth="2" />
      <line x1="20" y1="30" x2="20" y2="40" stroke={color} strokeWidth="2" />

      {/* Outer breaker chamber */}
      <rect
        x="11"
        y="10"
        width="18"
        height="20"
        rx="2"
        stroke={color}
        strokeWidth="1.8"
        strokeDasharray={state === 'DECOMMISSIONED' ? '2 2' : undefined}
        fill={state === 'CLOSED' ? '#f0fdfa' : '#ffffff'}
      />

      {state === 'CLOSED' && (
        <>
          <line x1="20" y1="10" x2="20" y2="30" stroke={fillClosed} strokeWidth="2.5" />
          <line x1="16" y1="16" x2="24" y2="24" stroke={fillClosed} strokeWidth="1.8" />
          <line x1="24" y1="16" x2="16" y2="24" stroke={fillClosed} strokeWidth="1.8" />
        </>
      )}

      {state === 'OPEN' && (
        <>
          <circle cx="20" cy="12.5" r="1.8" fill={color} />
          <circle cx="20" cy="27.5" r="1.8" fill={color} />
          {/* Open contact blade angled left */}
          <line x1="20" y1="27.5" x2="13.5" y2="15" stroke="#d97706" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}

      {state === 'TRIPPED' && (
        <>
          <line x1="20" y1="27.5" x2="13.5" y2="15" stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="14" y1="13" x2="26" y2="27" stroke="#dc2626" strokeWidth="2" />
          <line x1="26" y1="13" x2="14" y2="27" stroke="#dc2626" strokeWidth="2" />
        </>
      )}

      {state === 'DECOMMISSIONED' && (
        <>
          {/* Racked out draw-out chevrons */}
          <path d="M 15 14 L 20 18 L 25 14" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 15 26 L 20 22 L 25 26" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
};

/**
 * IEC Cartridge Fuse Symbol
 */
export const FuseSymbol: React.FC<SymbolProps> = ({
  className = 'w-8 h-8',
  state,
  energization,
  strokeColor
}) => {
  const color = resolveColor(strokeColor, energization, state);
  return (
    <svg viewBox="0 0 36 36" className={className} fill="none" aria-label="Fuse Symbol">
      <line x1="18" y1="0" x2="18" y2="36" stroke={color} strokeWidth="2" />
      <rect x="12" y="9" width="12" height="18" rx="1" stroke={color} strokeWidth="2" fill="#ffffff" />
      <line x1="18" y1="9" x2="18" y2="27" stroke={color} strokeWidth="1.8" />
    </svg>
  );
};

/**
 * Switch-Disconnector Blade Symbol
 */
export const SwitchDisconnectorSymbol: React.FC<SymbolProps> = ({
  className = 'w-8 h-8',
  state = 'CLOSED',
  energization,
  strokeColor
}) => {
  const color = resolveColor(strokeColor, energization, state);
  const isClosed = state === 'CLOSED';
  return (
    <svg viewBox="0 0 36 36" className={className} fill="none" aria-label="Switch-Disconnector Symbol">
      <line x1="18" y1="0" x2="18" y2="10" stroke={color} strokeWidth="2" />
      <line x1="14" y1="10" x2="22" y2="10" stroke={color} strokeWidth="2" />
      <circle cx="18" cy="26" r="2" fill={color} />
      <line
        x1="18"
        y1="26"
        x2={isClosed ? '18' : '10'}
        y2={isClosed ? '10' : '14'}
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line x1="18" y1="26" x2="18" y2="36" stroke={color} strokeWidth="2" />
    </svg>
  );
};

/**
 * Combined HV Fused Switch-Disconnector Symbol (Tx1/Tx2/Tx3 HV Fuse Units)
 */
export const FusedSwitchDisconnectorSymbol: React.FC<SymbolProps> = ({
  className = 'w-9 h-9',
  state = 'CLOSED',
  energization,
  strokeColor
}) => {
  const color = resolveColor(strokeColor, energization, state);
  const isClosed = state === 'CLOSED';
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-label="Fused Switch-Disconnector Symbol">
      {/* Upper switch disconnector */}
      <line x1="20" y1="0" x2="20" y2="7" stroke={color} strokeWidth="2" />
      <line x1="16" y1="7" x2="24" y2="7" stroke={color} strokeWidth="1.8" />
      <line
        x1="20"
        y1="17"
        x2={isClosed ? '20' : '12'}
        y2={isClosed ? '7' : '10'}
        stroke={isClosed ? color : '#d97706'}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Lower inline fuse */}
      <rect x="15" y="19" width="10" height="14" rx="1" stroke={color} strokeWidth="1.8" fill="#ffffff" />
      <line x1="20" y1="17" x2="20" y2="40" stroke={color} strokeWidth="1.8" />
    </svg>
  );
};

/**
 * Busbar Schematic Symbol
 */
export const BusbarSymbol: React.FC<SymbolProps> = ({
  className = 'w-8 h-6',
  strokeColor = '#0f172a'
}) => (
  <svg viewBox="0 0 36 24" className={className} fill="none" aria-label="Busbar Symbol">
    <line x1="2" y1="12" x2="34" y2="12" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" />
    <line x1="10" y1="4" x2="10" y2="12" stroke={strokeColor} strokeWidth="1.8" />
    <line x1="18" y1="12" x2="18" y2="20" stroke={strokeColor} strokeWidth="1.8" />
    <line x1="26" y1="12" x2="26" y2="20" stroke={strokeColor} strokeWidth="1.8" />
  </svg>
);

/**
 * Motor Control Centre (MCC) Enclosure Symbol
 */
export const MccPanelSymbol: React.FC<SymbolProps> = ({
  className = 'w-8 h-8',
  energization,
  strokeColor
}) => {
  const color = resolveColor(strokeColor, energization);
  return (
    <svg viewBox="0 0 36 36" className={className} fill="none" aria-label="MCC Panel Symbol">
      <rect x="5" y="4" width="26" height="28" rx="2" stroke={color} strokeWidth="2" fill="#f8fafc" />
      <line x1="5" y1="11" x2="31" y2="11" stroke={color} strokeWidth="1.4" />
      <line x1="18" y1="11" x2="18" y2="32" stroke={color} strokeWidth="1.4" />
      <line x1="5" y1="21" x2="31" y2="21" stroke={color} strokeWidth="1.4" />
      <circle cx="11" cy="16" r="1.5" fill={color} />
      <circle cx="24" cy="16" r="1.5" fill={color} />
      <circle cx="11" cy="26" r="1.5" fill={color} />
      <circle cx="24" cy="26" r="1.5" fill={color} />
    </svg>
  );
};

/**
 * Distribution Board (DB) Enclosure Symbol
 */
export const DistributionBoardSymbol: React.FC<SymbolProps> = ({
  className = 'w-8 h-8',
  energization,
  strokeColor
}) => {
  const color = resolveColor(strokeColor, energization);
  return (
    <svg viewBox="0 0 36 36" className={className} fill="none" aria-label="Distribution Board Symbol">
      <rect x="6" y="5" width="24" height="26" rx="2" stroke={color} strokeWidth="2" fill="#ffffff" />
      <line x1="11" y1="12" x2="25" y2="12" stroke={color} strokeWidth="2.5" />
      <line x1="13" y1="12" x2="13" y2="26" stroke={color} strokeWidth="1.5" />
      <line x1="18" y1="12" x2="18" y2="26" stroke={color} strokeWidth="1.5" />
      <line x1="23" y1="12" x2="23" y2="26" stroke={color} strokeWidth="1.5" />
    </svg>
  );
};

/**
 * Electrical Motor / Load Symbol (IEC 60617: Circle + M / 3~)
 */
export const ElectricalLoadSymbol: React.FC<SymbolProps> = ({
  className = 'w-5 h-5',
  energization,
  strokeColor
}) => {
  const color = resolveColor(strokeColor, energization);
  return (
    <svg viewBox="0 0 28 28" className={className} fill="none" aria-label="Electrical Motor Load Symbol">
      <line x1="14" y1="0" x2="14" y2="5" stroke={color} strokeWidth="1.8" />
      <circle cx="14" cy="16" r="10.5" stroke={color} strokeWidth="1.8" fill="#ffffff" />
      <text
        x="14"
        y="17.5"
        textAnchor="middle"
        fill={color}
        fontSize="9.5"
        fontWeight="800"
        fontFamily="ui-monospace, SFMono-Regular, monospace"
      >
        M
      </text>
      <text
        x="14"
        y="23.5"
        textAnchor="middle"
        fill={color}
        fontSize="5"
        fontWeight="700"
        fontFamily="ui-monospace, SFMono-Regular, monospace"
      >
        3~
      </text>
    </svg>
  );
};

/**
 * Motor Starter Symbol (IEC 60617 style compact schematic block for DOL, Y/D, VSD, Soft Starter)
 */
export const StarterSymbol: React.FC<{
  starterType?: 'DOL' | 'Y/D' | 'VSD' | 'SOFT STARTER' | 'OTHER';
  className?: string;
  energization?: EnergizationStatus;
  strokeColor?: string;
}> = ({ starterType = 'DOL', className = 'w-9 h-7', energization, strokeColor }) => {
  const color = resolveColor(strokeColor, energization);
  const label =
    starterType === 'SOFT STARTER'
      ? 'SS'
      : starterType === 'OTHER'
      ? 'STR'
      : starterType;

  return (
    <svg viewBox="0 0 44 28" className={className} fill="none" aria-label={`Motor Starter (${starterType})`}>
      <line x1="22" y1="0" x2="22" y2="5" stroke={color} strokeWidth="1.6" />
      <rect x="4" y="5" width="36" height="18" rx="2" stroke={color} strokeWidth="1.6" fill="#ffffff" />
      {starterType === 'VSD' && (
        <path d="M 8 18 Q 11 10 14 14 T 19 10" stroke="#0f766e" strokeWidth="1.3" fill="none" />
      )}
      <text
        x={starterType === 'VSD' ? '29' : '22'}
        y="17"
        textAnchor="middle"
        fill={color}
        fontSize="8.5"
        fontWeight="800"
        fontFamily="ui-monospace, SFMono-Regular, monospace"
      >
        {label}
      </text>
      <line x1="22" y1="23" x2="22" y2="28" stroke={color} strokeWidth="1.6" />
    </svg>
  );
};
