# Paymail ↔ BRC‑29 Bridge

Demo application that explores bridging Paymail identities with BRC‑29 payment flows. The app is built with Next.js (TypeScript) and deployed on Vercel.

[Demo](https://paymail.us)

Users can register their ofrntity publicKey against an alias which can then be used to collect
payments via <alias>@paymail.us

- Live demo: https://paymail-brc100-bridge.vercel.app
- License: Apache-2.0

## Tech stack

- Next.js (App Router)
- TypeScript
- Deployed on Vercel

## Getting started

Prerequisites:
- Node.js 18+ is recommended

Install dependencies and run the development server:

```bash
# install
npm install
# or
yarn
# or
pnpm install
# or
bun install

# develop
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Then open http://localhost:3000 in your browser.

Build and start in production mode:

```bash
npm run build
npm start
```

## Configuration

If the application requires environment variables (e.g., endpoints or credentials for Paymail or BRC‑29 services), create a `.env.local` file in the project root and define them there:

```
# .env.local (example)
# NEXT_PUBLIC_SOME_ENDPOINT=https://...
# SOME_SERVER_SECRET=...
```

Note: Public variables must be prefixed with `NEXT_PUBLIC_` to be exposed to the browser.

## Scripts

Common package scripts you can expect in this project:

- `dev` — Start the Next.js development server
- `build` — Build the production bundle
- `start` — Start the production server
- `lint` — Lint the code (if configured)

Run with your preferred package manager, e.g. `npm run dev`.

## Development notes

- This project uses the Next.js App Router and React Server Components by default.
- TypeScript types and strictness can be adjusted in `tsconfig.json`.
- Add or modify routes and UI in the `app/` directory.

## Deployment

The app is configured for Vercel. You can deploy by connecting the repository to Vercel or using the Vercel CLI. For alternative platforms, follow standard Next.js deployment guidance:
- Next.js deployment docs: https://nextjs.org/docs/deployment
- Vercel: https://vercel.com

## Contributing

Issues and pull requests are welcome. Please open an issue to discuss changes that might affect the public demo or interface.

## Acknowledgements

- Paymail specification and ecosystem
- [BRC‑29](https://brc.dev/29)
- Next.js by Vercel
