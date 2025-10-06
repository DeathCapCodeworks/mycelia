import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  myceliaSidebar: [
    {
      type: 'category',
      label: 'Executive',
      collapsed: false,
      items: ['executive/executive-one-pager']
    },
    {
      type: 'category',
      label: 'Full Report',
      collapsed: false,
      items: [
        'index',
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
      collapsed: false,
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
      collapsed: false,
      items: [
        'diagrams/l1-architecture',
        'diagrams/mining-flow',
        'diagrams/navigator-layers',
        'diagrams/roadmap-gantt',
        'diagrams/data-flows'
      ]
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: false,
      items: ['references/references']
    }
  ]
};

export default sidebars;

