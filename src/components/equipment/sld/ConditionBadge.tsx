import React from 'react';
import { MaintenanceCondition } from '../../../types';
import { getConditionDisplayMeta } from '../../../core/electrical/inspections';

interface ConditionBadgeProps {
  condition: MaintenanceCondition;
  compact?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}

export const ConditionBadge: React.FC<ConditionBadgeProps> = ({
  condition,
  compact = false,
  onClick,
  title
}) => {
  const meta = getConditionDisplayMeta(condition);
  const content = (
    <span
      className={`inline-flex items-center gap-1 rounded border font-mono font-bold transition ${
        compact ? 'px-1 py-0 text-[8px] leading-tight' : 'px-1.5 py-0.5 text-[10px]'
      } ${meta.badgeClass} ${onClick ? 'hover:brightness-95 cursor-pointer' : ''}`}
      title={title || `Maintenance Condition: ${meta.label}`}
    >
      <span className={`rounded-full shrink-0 ${compact ? 'w-1.5 h-1.5' : 'w-2 h-2'} ${meta.dotClass}`} />
      <span>{compact ? meta.shortLabel : meta.label}</span>
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick(e);
        }}
        className="inline-flex shrink-0 cursor-pointer"
        title={title || `Inspect / View Latest Maintenance Condition (${meta.label})`}
      >
        {content}
      </button>
    );
  }

  return content;
};
