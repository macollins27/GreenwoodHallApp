# Environment Setup Instructions

## Local Development

Your `.env` file is already configured locally at `C:\Dev\GreenwoodHallApp\.env`

## GitHub Codespaces / Cloud IDE Setup

If you're running this project in GitHub Codespaces or another cloud environment, you need to create a `.env` file:

### Option 1: Create .env file in Codespaces

```bash
# In the Codespace terminal
cd /workspaces/GreenwoodHallApp

# Create .env file
touch .env

# Open in editor and add your environment variables:
# DATABASE_URL="file:./dev.db"
# ADMIN_EMAIL="info@greenwood-hall.com"
# ADMIN_PASSWORD="your-password"
# STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_public_key"
# STRIPE_SUCCESS_URL="http://localhost:3000/booking/complete?session_id={CHECKOUT_SESSION_ID}"
# STRIPE_CANCEL_URL="http://localhost:3000/booking/cancelled"
# POSTMARK_SERVER_TOKEN="your-postmark-token"
# POSTMARK_FROM_EMAIL="setup@greenwood-hall.com"
```

**Important:** Copy the actual values from your local `.env` file at `C:\Dev\GreenwoodHallApp\.env`

### Option 2: Use GitHub Codespaces Secrets (More Secure)

1. Go to your repository: https://github.com/macollins27/GreenwoodHallApp
2. Settings → Secrets and variables → Codespaces
3. Add each variable as a secret:
   - `DATABASE_URL`
   - `STRIPE_SECRET_KEY`
   - etc.

### After Creating .env:

```bash
# Setup database
npx prisma generate
npx prisma migrate deploy
npm run db:seed

# Start dev server
npm run dev
```

## Why .env Wasn't Pushed

The `.env` file contains sensitive information (API keys, passwords) and is in `.gitignore`:

```gitignore
# env files (can opt-in for committing if needed)
.env*
!.env.development
!.env.production.example
```

This prevents accidentally committing secrets to GitHub.

## Security Best Practices

- ✅ Keep `.env` in `.gitignore`
- ✅ Use `.env.development` and `.env.production.example` as templates
- ✅ Never commit real API keys or passwords
- ✅ Use environment variables in production (Vercel, Railway, etc.)
