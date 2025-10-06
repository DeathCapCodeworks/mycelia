import React from 'react';

type FigureProps = {
  id: string;
  caption: string;
  children: React.ReactNode;
};

export function Figure({id, caption, children}: FigureProps) {
  return (
    <figure id={id}>
      <div>{children}</div>
      <figcaption>
        <em>Figure {id}.</em> {caption}
      </figcaption>
    </figure>
  );
}

export default Figure;

