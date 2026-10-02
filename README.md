# Paymail to BRC-100 Bridge

A Next.js application that connects Paymail aliases with BRC-100 wallets and BRC-29 payment derivation. Users can register aliases, collect incoming payments into their wallet, inspect payment records and send payments to Paymail recipients.

[Hosted example](https://paymail.us/).

## How it works

The service stores alias mappings, payment destinations and pending transactions in MongoDB. Its Paymail endpoints return receiving scripts and accept raw transactions or BEEF. The browser then retrieves payment records, asks the recipient wallet to internalise them and acknowledges successful collection.

The normal alias-management flow uses wallet signatures. A separate manual mode supports registration by public identity key and copying transaction import arguments for use elsewhere.

## Requirements

- Node.js 22 and npm.
- MongoDB, locally or through a hosted connection.
- A compatible BRC-100 wallet for signed registration, payment collection and sending.
- A public HTTPS hostname for an externally reachable Paymail service.

The raw-transaction delivery route uses mainnet WhatsOnChain endpoints. Network selection is not a complete application-wide setting; align the connected wallets and service integrations before sending funds.

## Run locally

```sh
npm ci
cp .env.example .env.local
```

Configure `.env.local`:

```dotenv
NEXT_PUBLIC_HOST=localhost:3000
MONGO_URI=mongodb://localhost:27017
DB_NAME=paymail_bridge
```

`NEXT_PUBLIC_HOST` is a hostname, optionally with a port, without a URL scheme or path. `MONGO_URI` and `DB_NAME` are used by [lib/db.ts](lib/db.ts), although they are absent from the supplied environment template. The defaults are shown above.

```sh
npm run dev -- --hostname 127.0.0.1
```

Open `http://localhost:3000`. Local HTTP is sufficient for browsing the interface, but capability responses construct **HTTPS** URLs. Testing Paymail discovery from other clients requires a reachable HTTPS origin and a matching `NEXT_PUBLIC_HOST`.

## API layout

| Path | Purpose |
| --- | --- |
| `/.well-known/bsvalias` | Rewritten to the Paymail capability document. |
| `/api/paymail/` | Public-key, profile, destination and transaction-delivery routes. |
| `/api/brc-100/` | Alias registration, collection, acknowledgement and transaction queries. |

There is no required server spending key in the active configuration. Wallet operations in the interface use the connected user's wallet.

## Current limitations

Manual collection accepts dummy signatures, and transaction acknowledgement is not authenticated or scoped to the requesting identity. Public-key-only registration also does not prove control of that key. These paths need a consistent access-control design before the service can promise private payment records or authenticated account management.

Transaction delivery can broadcast payments, and sending from the interface can spend wallet funds. Use a dedicated demonstration wallet when exercising these flows.

## Build and checks

```sh
npm run type-check
npm run build
npm start -- --hostname 127.0.0.1
```

The package uses Next.js 15 and React 19. It also defines a lint command, but no automated test script. Deployment needs MongoDB access and the same hostname configuration used to advertise Paymail capabilities.

- [app/page.tsx](app/page.tsx): browser wallet and manual workflows.
- [app/api/](app/api/): Paymail and bridge endpoints.
- [next.config.mjs](next.config.mjs): capability discovery rewrite.

## Licence

[Apache 2.0](LICENSE).
