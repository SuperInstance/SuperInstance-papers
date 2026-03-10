import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'POLLN',
  description: 'Pattern-Organized Large Language Network - A distributed intelligence system with living spreadsheet cells',
  lang: 'en-US',
  base: '/polln/',
  head: [
    ['link', { rel: 'icon', href: '/logo.png' }],
    ['meta', { name: 'theme-color', content: '#3c8772' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:locale', content: 'en-US' }],
    ['meta', { property: 'og:title', content: 'POLLN | Pattern-Organized Large Language Network' }],
    ['meta', { property: 'og:site_name', content: 'POLLN' }],
    ['meta', { property: 'og:image', content: '/og-image.png' }],
    ['meta', { property: 'og:url', content: 'https://polln.ai' }],
    ['script', { src: 'https://cdn.usefathom.com/script.js', 'data-site': 'XXXXXX', defer: '' }]
  ],

  themeConfig: {
    logo: '/logo.png',

    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Concepts', link: '/guide/concepts/' },
      { text: 'API', link: '/guide/api/' },
      { text: 'Examples', link: '/examples/' },
      {
        text: 'v0.1.0',
        items: [
          {
            text: 'Changelog',
            link: 'https://github.com/SuperInstance/polln/blob/main/CHANGELOG.md'
          },
          {
            text: 'Contributing',
            link: 'https://github.com/SuperInstance/polln/blob/main/README.md#contributing'
          }
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          collapsible: true,
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' },
            { text: 'Configuration', link: '/guide/configuration' }
          ]
        },
        {
          text: 'Core Concepts',
          collapsible: true,
          items: [
            { text: 'LOG System Overview', link: '/guide/concepts/' },
            { text: 'Head/Body/Tail Paradigm', link: '/guide/concepts/head-body-tail' },
            { text: 'Cell Types', link: '/guide/concepts/cell-types' },
            { text: 'Sensation Types', link: '/guide/concepts/sensation' },
            { text: 'Colony Architecture', link: '/guide/concepts/colony' },
            { text: 'Agent Communication', link: '/guide/concepts/communication' }
          ]
        },
        {
          text: 'Cell Reference',
          collapsible: true,
          items: [
            { text: 'Overview', link: '/guide/cells/' },
            { text: 'LogCell', link: '/guide/cells/logcell' },
            { text: 'InputCell', link: '/guide/cells/input' },
            { text: 'OutputCell', link: '/guide/cells/output' },
            { text: 'TransformCell', link: '/guide/cells/transform' },
            { text: 'FilterCell', link: '/guide/cells/filter' },
            { text: 'AggregateCell', link: '/guide/cells/aggregate' },
            { text: 'ValidateCell', link: '/guide/cells/validate' },
            { text: 'AnalysisCell', link: '/guide/cells/analysis' },
            { text: 'PredictionCell', link: '/guide/cells/prediction' },
            { text: 'DecisionCell', link: '/guide/cells/decision' },
            { text: 'ExplainCell', link: '/guide/cells/explain' },
            { text: 'Custom Cells', link: '/guide/cells/custom' }
          ]
        },
        {
          text: 'API Reference',
          collapsible: true,
          items: [
            { text: 'API Overview', link: '/guide/api/' },
            { text: 'Client SDK', link: '/guide/api/client' },
            { text: 'Server API', link: '/guide/api/server' },
            { text: 'WebSocket API', link: '/guide/api/websocket' },
            { text: 'Type Definitions', link: '/guide/api/types' }
          ]
        },
        {
          text: 'Advanced Topics',
          collapsible: true,
          items: [
            { text: 'Overview', link: '/guide/advanced/' },
            { text: 'Performance', link: '/guide/advanced/performance' },
            { text: 'Security', link: '/guide/advanced/security' },
            { text: 'Deployment', link: '/guide/advanced/deployment' },
            { text: 'Monitoring', link: '/guide/advanced/monitoring' },
            { text: 'Testing', link: '/guide/advanced/testing' }
          ]
        }
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'Basic Spreadsheet', link: '/examples/basic-spreadsheet' },
            { text: 'Data Pipeline', link: '/examples/data-pipeline' },
            { text: 'Real-time Analytics', link: '/examples/realtime-analytics' },
            { text: 'Predictive Model', link: '/examples/predictive-model' },
            { text: 'Multi-Colony System', link: '/examples/multi-colony' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/SuperInstance/polln' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-PRESENT SuperInstance.AI'
    },

    editLink: {
      pattern: 'https://github.com/SuperInstance/polln/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    lastUpdated: {
      text: 'Last updated',
      formatOptions: {
        dateStyle: 'full',
        timeStyle: 'medium'
      }
    },

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            placeholder: 'Search documentation',
            translations: {
              button: {
                buttonText: 'Search documentation',
                buttonAriaLabel: 'Search documentation'
              },
              modal: {
                noResultsText: 'No results for',
                resetButtonTitle: 'Clear search query',
                footer: {
                  selectText: 'to select',
                  navigateText: 'to navigate',
                  closeText: 'to close'
                }
              }
            }
          }
        }
      }
    },

    carbonAds: {
      code: 'CEBI4KQM',
      placement: 'pollnai'
    }
  },

  markdown: {
    codeTransformers: [
      {
        post: (code, node) => {
          if (/@lang='ts'/.test(node.props)) {
            return code.replace(/interface (\w+)/, 'export interface $1')
          }
          return code
        }
      }
    ],
    config: (md) => {
      md.use(require('markdown-it-deflist'))
      md.use(require('markdown-it-abbr'))
      md.use(require('markdown-it-footnote'))
      md.use(require('markdown-it-ins'))
      md.use(require('markdown-it-mark'))
    }
  },

  locales: {
    root: {
      label: 'English',
      lang: 'en-US'
    }
  }
})
