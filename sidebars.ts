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
        'report/conclusion-next-steps'
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
    'references/references'
  ]
};

export default sidebars;

