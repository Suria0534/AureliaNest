# Daraz-lite split into separate apps

The frontend and backend are now fully separated into two standalone folders:

- c:\samanta\AureliaNest-frontend
- c:\samanta\AureliaNest-backend

Use each app independently with its own dependencies and startup command.

## Quick Start

### Backend

```bash
cd c:\samanta\AureliaNest-backend
copy .env.example .env
npm run dev
```

### Frontend

```bash
cd c:\samanta\AureliaNest-frontend
copy .env.example .env
npm run dev
```

Frontend default URL: http://localhost:5173
Backend default URL: http://localhost:5000
