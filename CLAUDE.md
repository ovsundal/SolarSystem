# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with HMR
npm run build     # Type-check and build for production (tsc -b && vite build)
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

No test runner is configured in this project.

## Architecture

This is a React 19 + TypeScript + Vite project. The entire app currently lives in `src/App.tsx` with styles in `src/App.css` and `src/index.css`. Entry point is `src/main.tsx` which mounts `<App />` into `#root`.

Static assets referenced via SVG `<use href="/icons.svg#...">` are served from `public/`.

TypeScript is split across two configs: `tsconfig.app.json` (browser code in `src/`) and `tsconfig.node.json` (Vite config). Both extend `tsconfig.json`.
