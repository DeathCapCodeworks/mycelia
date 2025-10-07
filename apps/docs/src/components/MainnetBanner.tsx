import React from 'react';
import clsx from 'clsx';

export default function MainnetBanner(): JSX.Element {
  return (
    <div className={clsx('alert alert--success margin-bottom--md')}>
      <div className="container">
        <div className="row">
          <div className="col col--12">
            <h3 className="alert__title">
              🚀 Mycelia Mainnet is Live!
            </h3>
            <p className="alert__message">
              The Mycelia mainnet is now operational with a hard peg of 10 BLOOM = 1 BTC, 
              backed by locked Bitcoin reserves. View our{' '}
              <a href="/attestations/mainnet-por">Proof of Reserves</a> and{' '}
              <a href="/governance-v0">Governance v0</a> documentation.
            </p>
            <div className="alert__actions">
              <a
                className="button button--primary button--sm"
                href="/attestations/mainnet-por"
              >
                View PoR Attestations
              </a>
              <a
                className="button button--secondary button--sm"
                href="/governance-v0"
              >
                Governance v0
              </a>
              <a
                className="button button--secondary button--sm"
                href="/status.json"
                target="_blank"
                rel="noopener noreferrer"
              >
                System Status
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
