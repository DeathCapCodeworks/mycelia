import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'index',
    { type: 'category', label: 'Executive', items: ['executive/executive-one-pager'] },
    {
      type: 'category',
      label: 'Full Report',
      items: [
        'report/mycelia-comprehensive-report',
        'report/part-1-blockchain-and-bloom',
        'report/part-2-core-applications',
        'report/part-3-mycelia-navigator',
        'report/part-4-roadmap',
        'report/conclusion-next-steps',
        'report/funding-and-governance'
      ]
    },
    {
      type: 'category',
      label: 'Tokenomics',
      items: [
        'tokenomics/redemption-bitcoin-testnet',
        'tokenomics/proof-of-reserves',
        'tokenomics/staking-preview'
      ]
    },
    {
      type: 'category',
      label: 'Appendices',
      items: [
        'appendices/appendix-tokenomics',
        'appendices/appendix-security-threat-model',
        'appendices/appendix-hiring-plan',
        'appendices/appendix-risk-register',
        'appendices/glossary'
      ]
    },
    {
      type: 'category',
      label: 'Diagrams',
      items: [
        'diagrams/l1-architecture',
        'diagrams/mining-flow',
        'diagrams/navigator-layers',
        'diagrams/roadmap-gantt',
        'diagrams/data-flows',
        'diagrams/peg-flow',
        'diagrams/proof-of-reserves'
      ]
    },
    {
      type: 'category',
      label: 'Developer Documentation',
      items: [
        'developer-guide',
        'api-reference',
        'tutorials',
        'testing-guide'
      ]
    },
    {
      type: 'category',
      label: 'Ethereum Integration',
      items: [
        'evm/overview',
        'evm/provider',
        'evm/aa-paymaster'
      ]
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deploy/docker',
        'deploy/ipfs'
      ]
    },
    {
      type: 'category',
      label: 'Feature Flags',
      items: [
        'feature-flags/registry',
        'feature-flags/cli'
      ]
    },
    {
      type: 'category',
      label: 'Launch',
      items: [
        'launch/announcement',
        'launch/faq',
        'launch/press-kit'
      ]
    },
    {
      type: 'category',
      label: 'Security',
      items: [
        'security-overview',
        'security/bug-bounty'
      ]
    },
    {
      type: 'category',
      label: 'Governance',
      items: [
        'governance-v0'
      ]
    },
    {
      type: 'category',
      label: 'Runbooks',
      items: [
        'runbooks/key-ceremony',
        'runbooks/incident-playbook',
        'runbooks/upgrade-playbook',
        'runbooks/launch-day-checklist',
        'runbooks/rollback',
        'runbooks/emergency-controls',
        'runbooks/chaos-week1'
      ]
    },
    {
      type: 'category',
      label: 'Attestations',
      items: [
        'attestations/mainnet-por'
      ]
    },
    {
      type: 'category',
      label: 'Status',
      items: [
        'status/overview'
      ]
    },
    {
      type: 'category',
      label: 'Legal',
      items: [
        'legal/terms',
        'legal/privacy'
      ]
    },
    {
      type: 'category',
      label: 'Governance',
      items: [
        'governance-v0',
        'governance/proposals/P-0001-enable-btc-mainnet-redemption',
        'governance/proposals/P-0002-min-gas-price'
      ]
    },
    'references/references'
  ]
};

export default sidebars;

