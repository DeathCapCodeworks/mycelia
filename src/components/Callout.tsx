import React from 'react';

type CalloutProps = {
  title: 'Security checkpoint' | 'Compliance' | 'Community' | 'SLOs';
  children?: React.ReactNode;
};

export function Callout({title, children}: CalloutProps) {
  return (
    <div
      style={{
        border: '1px solid var(--ifm-color-emphasis-300)',
        borderLeftWidth: 4,
        borderLeftColor: 'var(--ifm-color-primary)',
        padding: '0.75rem 1rem',
        borderRadius: 6,
        margin: '1rem 0'
      }}
    >
      <strong>{title}</strong>
      <div style={{marginTop: '0.5rem'}}>{children}</div>
    </div>
  );
}

export default Callout;

