# Nomad Customer App

A React + Vite implementation of the Nomad Financial Services customer app, built from
the Claude Design handoff in `../project/Nomad Customer App.dc.html`.

## Stack

- React 19 + Vite, `react-router-dom` for navigation.
- No backend — all data is mock/in-memory (see `src/data/mockData.js`), matching the
  original prototype's behavior. State (PIN auth, loan amount, withdraw amount/destination,
  toggles) lives in `src/state/AppStateContext.jsx` and resets on a full page reload.
- Design tokens (`src/styles/tokens/*.css`) and components (`src/components/ds/*`) are
  faithful reimplementations of the Nomad Group design system bundle.

## Screens

Splash → Login (4-digit PIN or Face ID) → Home, Savings, Savings goal detail, Borrow,
Loan, Investments, Withdraw, Documents, KYC verification. Bottom tab bar shown on Home,
Save, Goal detail, Borrow, Loan, Invest, and Documents (not on Withdraw, KYC, Login, Splash),
matching the source design.

## Run

```bash
npm install
npm run dev
```
