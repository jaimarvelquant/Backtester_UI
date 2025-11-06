# Strategic Analysis Web App

A modern React + Vite implementation of the Strategic Analysis platform. The app
recreates the key flows from the original Angular bundle: login, dashboard,
portfolio and trading-view management, backtesting analytics, and master data &
user administration.

## Tech stack

- React 18 with TypeScript
- Vite for development/build tooling
- @tanstack/react-query for data fetching & caching
- Custom context providers for auth, alerts, and global loading state
- Modern CSS modules (no external UI kit dependency)

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Run the dev server** (default http://localhost:5173 – auto opens)

   ```bash
   npm run dev
   ```

3. **Build for production**

   ```bash
   npm run build
   ```

4. **Preview the production build**

   ```bash
   npm run preview
   ```

## Environment configuration

The app assumes the backend endpoints follow the structure used by the Angular
bundle. Configure via `.env` (all optional – defaults mirror the original):

```env
VITE_API_BASE_URL=/strategy/backtest/api
VITE_PUBLIC_BASE_URL=/strategy/backtest/public
```

## Feature parity

| Feature                         | Status | Notes |
|--------------------------------|--------|-------|
| Auth & auth-token management   | ✅     | Mirrors `AuthService` localStorage usage. |
| Dashboard quick metrics        | ✅     | Shows recent portfolios & trading view setups. |
| Portfolio list/detail          | ✅     | Search, paging, run/delete, exports, metrics view. |
| Portfolio backtesting          | ✅     | Dedicated list and analytics (metrics/day/month/margin/transactions). |
| Trading view list/detail       | ✅     | Run/delete/exports + signal & metrics display. |
| Master data management         | ✅     | List/search, edit/create, item validation. |
| User management                | ✅     | Search, add/edit/reset, granular access toggles. |
| Global alerts & loading        | ✅     | Replaces Angular alert/loading services. |
| Portfolio/TradingView sharing  | 🚧     | Endpoints available; UI not yet rebuilt. |
| JSON upload flows              | 🚧     | Prompted as “coming soon”. |

## Project structure

```
webapp/
├─ src/
│  ├─ components/      # Layout & feedback components
│  ├─ context/         # Auth, alert, loading providers
│  ├─ hooks/           # API client hook & guard
│  ├─ pages/           # Feature pages
│  ├─ services/        # API client wrapper
│  ├─ styles/          # Global theming
│  ├─ utils/           # Data formatting helpers
│  └─ App.tsx          # Route definitions & guards
├─ vite.config.ts
├─ tsconfig*.json
└─ package.json
```

## Testing endpoints quickly

- Login: `POST /strategy/backtest/public/login` with `{ username, password }`
- Portfolio search: `POST /strategy/backtest/api/portfolio/search`
- Backtesting data: `GET /strategy/backtest/api/portfolio/transaction/:id`
- Trading view search: `POST /strategy/backtest/api/trading-view/search`

The React app calls the same endpoints via the `ApiClient` wrapper so the
backend contract remains unchanged.

## Known limitations & next steps

- File upload (portfolio / trading view) is currently stubbed – reintroduce
  once design requirements are final.
- Sharing dialogs for portfolios & trading views are not yet ported.
- The dashboard surface uses simple tables; consider porting the original
  charts/widgets once the datasets are clarified.
- Tests are not included; integrate unit/e2e coverage once the API is stable.
- Icons are unicode emoji to avoid bundling an icon pack. Swap for brand assets
  if desired.

## Accessibility & UX notes

- Global focus rings and keyboard-friendly buttons are enabled.
- Alerts and loading overlays render at the root level so all routes (including
  the login page) share consistent feedback.
- Tables are responsive with horizontal scroll for smaller screens.

## License

MIT – mirrors the CoreUI Angular template licensing.
