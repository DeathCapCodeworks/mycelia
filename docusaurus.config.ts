import type {Config} from '@docusaurus/types';
import type {ThemeConfig} from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Project Mycelia Report',
  url: 'https://example.com',
  baseUrl: '/',
  // favicon intentionally omitted to avoid 404 until asset is added
  stylesheets: ['/css/print.css'],
  markdown: {mermaid: true},
  i18n: {
    defaultLocale: 'en',
    locales: ['en']
  },
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          showLastUpdateTime: true,
          sidebarPath: require.resolve('./sidebars.ts')
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        }
      }
    ]
  ],
  plugins: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        highlightSearchTermsOnTargetPage: true,
        language: ['en']
      }
    ]
  ],
  themes: ['@docusaurus/theme-mermaid'],
  themeConfig: {
    navbar: {
      title: 'Project Mycelia'
    },
    footer: {
      style: 'dark'
    },
    prism: {},
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: false
    },
    mermaid: {
      theme: {light: 'neutral', dark: 'dark'}
    }
    // algolia: {
    //   appId: 'YOUR_APP_ID',
    //   apiKey: 'YOUR_SEARCH_API_KEY',
    //   indexName: 'mycelia'
    // }
  } satisfies ThemeConfig
};

export default config;

