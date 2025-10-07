import type { Config } from '@docusaurus/types';
import { themes } from 'prism-react-renderer';

const config: Config = {
  title: 'Project Mycelia Report',
  url: 'http://localhost',
  baseUrl: '/',
  favicon: 'img/favicon.ico',
  i18n: { defaultLocale: 'en', locales: ['en'] },
  themes: ['@docusaurus/theme-mermaid'],
  presets: [
    [
      'classic',
      {
        docs: { routeBasePath: '/', showLastUpdateTime: true, sidebarPath: require.resolve('./sidebars.ts') },
        blog: false,
        theme: { customCss: require.resolve('./src/css/custom.css') }
      }
    ]
  ],
  themeConfig: {
    navbar: { title: 'Project Mycelia' },
    footer: { style: 'dark' },
    colorMode: { defaultMode: 'dark', respectPrefersColorScheme: true },
    prism: { theme: themes.github, darkTheme: themes.dracula }
  },
  stylesheets: ['/css/print.css'],
  markdown: { mermaid: true }
};
export default config;

