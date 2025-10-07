import React from 'react';
import '../styles/neon.css';

export default function Background() {
  return (
    <>
      <div className="neon-grid" />
      <div className="nebula" aria-hidden>
        <div className="layer l1" />
        <div className="layer l2" />
        <div className="layer l3" />
      </div>
    </>
  );
}
