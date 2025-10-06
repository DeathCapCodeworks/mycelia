import React from 'react';

type RoadmapBadgeProps = {
  label: string;
  color?: string;
};

export function RoadmapBadge({label, color = 'var(--ifm-color-primary)'}: RoadmapBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.15rem 0.5rem',
        borderRadius: 999,
        background: color,
        color: '#000',
        fontWeight: 700,
        fontSize: '0.8rem'
      }}
    >
      {label}
    </span>
  );
}

export default RoadmapBadge;

