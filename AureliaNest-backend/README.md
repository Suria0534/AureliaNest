# Daraz-lite Backend

Express + MongoDB backend API for the Daraz-lite marketplace.

## Run

```bash
copy .env.example .env
npm install
npm run dev
```

API URL: http://localhost:5000

## Deploy on Render

If Render shows `Could not read package.json` from `/opt/render/project/src/package.json`, the service is pointing at the wrong root. Set the service `Root Directory` to `AureliaNest-backend` and use:

- Build Command: `npm install`
- Start Command: `npm start`

You can also use the included `render.yaml` blueprint if this folder is the repo root on GitHub.

## Environment

- PORT=5000
- MONGODB_URI=mongodb://127.0.0.1:27017/daraz_lite
- JWT_SECRET=replace-with-a-strong-secret
- BKASH_NUMBER=01840268794
- SMTP_HOST=smtp.example.com
- SMTP_PORT=587
- SMTP_USER=your-smtp-user
- SMTP_PASS=your-smtp-password
- SMTP_FROM=no-reply@example.com

## Endpoints

- GET /api/health
- POST /api/auth/signup
- POST /api/auth/login
- GET /api/products
- POST /api/products
- POST /api/orders
- GET /api/orders?sellerName=SellerName
- POST /api/payments/mock
- POST /api/payments/confirm
- GET /api/seller/:sellerName/dashboard
