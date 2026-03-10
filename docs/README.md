# POLLN Documentation

This directory contains the VitePress documentation site for POLLN.

## Local Development

### Prerequisites

Install dependencies:

```bash
npm install
```

### Development Server

Start the development server:

```bash
npm run docs:dev
```

The site will be available at `http://localhost:5173`

### Build

Build the static site:

```bash
npm run docs:build
```

The built files will be in `docs/.vitepress/dist/`

### Preview

Preview the production build:

```bash
npm run docs:preview
```

### Serve

Serve the built site:

```bash
npm run docs:serve
```

## Documentation Structure

```
docs/
├── .vitepress/
│   └── config.ts          # VitePress configuration
├── guide/
│   ├── index.md           # Getting started
│   ├── installation.md    # Installation guide
│   ├── quick-start.md     # Quick start tutorial
│   ├── configuration.md   # Configuration reference
│   ├── concepts/          # Core concepts
│   │   ├── README.md
│   │   ├── head-body-tail.md
│   │   ├── cell-types.md
│   │   ├── sensation.md
│   │   ├── colony.md
│   │   └── communication.md
│   ├── cells/             # Cell reference
│   │   └── README.md
│   ├── api/               # API reference
│   │   └── README.md
│   └── advanced/          # Advanced topics
│       └── README.md
├── examples/
│   └── README.md          # Example code
└── README.md              # This file
```

## Adding Documentation

### New Page

1. Create a new `.md` file in the appropriate directory
2. Add it to the sidebar in `.vitepress/config.ts`
3. Start writing!

### New Section

1. Create a new directory under `guide/`
2. Add a `README.md` with section overview
3. Add individual pages as `.md` files
4. Update the sidebar in `.vitePress/config.ts`

## Writing Guide

### Front Matter

Use front matter for page metadata:

```markdown
---
title: Page Title
description: Page description for SEO
---

# Content
```

### Code Blocks

Use triple backticks with language identifier:

```typescript
const cell = new LogCell('example')
```

### Alerts

Use VitePress custom containers:

```markdown
::: tip Tip
This is a helpful tip.
:::

::: warning Warning
This is a warning.
:::

::: danger Danger
This is dangerous.
:::
```

### Links

- Internal links: `[Guide](../guide/)`
- External links: `[GitHub](https://github.com/SuperInstance/polln)`
- API links: `[LogCell](../api/classes/LogCell.md)`

## Assets

Place images in `docs/public/`:

```
docs/
└── public/
    ├── logo.png
    └── images/
        └── example.png
```

Reference them as:

```markdown
![Example](/images/example.png)
```

## Deployment

### GitHub Pages

1. Build the site: `npm run docs:build`
2. Deploy `.vitepress/dist/` to GitHub Pages
3. Update `base` in `.vitepress/config.ts` if needed

### Vercel/Netlify

Connect the repository and set:

- **Build Command**: `npm run docs:build`
- **Publish Directory**: `docs/.vitepress/dist`
- **Node Version**: 18

## License

MIT

---

For more information, see the [main README](../README.md).
