# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with HMR
npm run build     # Type-check and build for production (tsc -b && vite build)
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

Tests use Vitest: `npm test` runs all tests once.

## Architecture

This is a React 19 + TypeScript + Vite project. Entry point is `src/main.tsx` which mounts `<App />` into `#root`. `App.tsx` renders `<SolarSystem />`, the main 3D visualization component in `src/SolarSystem.tsx`. Planet data lives in `src/planets.ts`, astronomical calculations in `src/astronomy.ts`, and time-playback controls in `src/TimeControls.tsx` and `src/timeConstants.ts`. Styles are in `src/App.css` and `src/index.css`.

Historical mission replay is handled by `src/MissionReplayPanel.tsx` with mission data and trajectory utilities in `src/missions/`.

Static assets (textures, icons) are served from `public/`.

TypeScript is split across two configs: `tsconfig.app.json` (browser code in `src/`) and `tsconfig.node.json` (Vite config). Both extend `tsconfig.json`.
