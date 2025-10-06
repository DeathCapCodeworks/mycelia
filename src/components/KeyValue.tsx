import React from 'react';

type KeyValueProps = {
  items: Array<{key: string; value: React.ReactNode}>;
};

export function KeyValue({items}: KeyValueProps) {
  return (
    <dl
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        gap: '0.5rem 1rem'
      }}
    >
      {items.map(({key, value}) => (
        <React.Fragment key={key}>
          <dt style={{fontWeight: 600}}>{key}</dt>
          <dd style={{margin: 0}}>{value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export default KeyValue;

