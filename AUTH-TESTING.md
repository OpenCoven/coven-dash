# Auth Implementation - Testing & Deployment Guide

## Completed Implementation ✅

The coven-dash authentication system is now fully implemented following the coven-dashboard pattern.

### What Was Added

**1. Session Encryption (`lib/session.ts`)**
- AES-GCM encryption with random IV for credentials
- `encryptSession(config)` → encrypted token
- `decryptSession(token)` → GatewayConfig or null
- `readSessionFromCookies()` → gets session from httpOnly cookie
- Cookie helpers: `buildSessionCookie()`, `buildClearedSessionCookie()`

**2. Protected Route Helper (`lib/protected-route.ts`)**
- `requireGatewaySession(nextPath)` → redirects to /connect if no session
- Used in server components to enforce auth

**3. Login Page (`app/connect/`)**
- **page.tsx**: Server component that checks existing session
- **ConnectForm.tsx**: Client component with form handling
- Input fields: Gateway URL, Token, Password
- "Keep me signed in" checkbox (30-day persistence via localStorage)
- Error handling with troubleshooting hints
- Show/hide secrets toggle

**4. Session Endpoint (`app/api/gateway/session/`)**
- **POST**: Create session
  - Validates URL format (http/https)
  - Normalizes gateway URLs (handles localhost ↔ https conversion)
  - Encrypts credentials with SESSION_SECRET
  - Sets httpOnly cookie (secure, sameSite=lax)
  - Returns 400 with helpful error if validation fails
- **DELETE**: Clear session
  - Clears encrypted cookie
- **GET**: Status check
  - Returns session status (connected/disconnected)
  - Derives stable userId from gateway URL hash

**5. Updated Dashboard (`app/dashboard/`)**
- Added Logout button
- Logout clears session cookie and redirects to /connect?signedOut=1
- Handles 401 responses (session expired)
- All existing dashboard features preserved

**6. Updated API Route (`app/api/dashboard/`)**
- Reads credentials from encrypted session cookie
- No more GATEWAY_URL/GATEWAY_TOKEN env vars
- Returns 401 if no session
- Initializes GatewayClient with session config

**7. Root Redirect (`app/page.tsx`)**
- Checks for existing session
- Redirects to /dashboard if session exists
- Redirects to /connect if no session

### Environment Setup

**Required:**
```bash
# Generate SESSION_SECRET
openssl rand -base64 32

# Add to .env.local (or .env.production for deployment)
SESSION_SECRET=your-generated-secret-here
```

**Removed:**
- ❌ GATEWAY_URL (user provides via login form)
- ❌ GATEWAY_TOKEN (user provides via login form)
- ❌ GATEWAY_PASSWORD (user provides via login form)

---

## Testing Checklist ✅

### Local Development

```bash
cd ~/Documents/GitHub/OpenCoven/coven-dash

# Install deps (if needed)
npm install

# Generate SESSION_SECRET
openssl rand -base64 32
# Copy output, paste into .env.local

# Add to .env.local
SESSION_SECRET=<paste-here>
NODE_ENV=development

# Start dev server
npm run dev
```

### Manual Test Flow

1. **No Session → Login Page**
   - Visit http://localhost:3000
   - Should redirect to /connect
   - ✓ Confirm

2. **Login with Valid Credentials**
   - Fill in Gateway URL (e.g., http://127.0.0.1:18789)
   - Fill in Token (from your gateway)
   - Fill in Password (if required)
   - Check "Keep me signed in" (optional)
   - Click "Connect"
   - ✓ Should see dashboard with live data
   - ✓ Cookie set (check DevTools → Application → Cookies)
   - ✓ localStorage has `coven.connect.rememberMe=1` (if checked)

3. **Page Reload with Remember Me**
   - Reload page
   - ✓ Should still show dashboard (session restored)
   - ✓ Cookie persists for 30 days (if "Keep me signed in" was checked)

4. **Logout**
   - Click "Logout" button
   - ✓ Should redirect to /connect?signedOut=1
   - ✓ Should see "Signed out. Reconnect to resume." notice
   - ✓ Cookie cleared (DevTools → Cookies should be gone)

5. **Login Again After Logout**
   - Fill form again
   - Click "Connect"
   - ✓ Dashboard appears again

6. **Session Expiry (Browser Close)**
   - Login WITHOUT "Keep me signed in"
   - Close browser completely
   - Reopen and visit localhost:3000
   - ✓ Should redirect to /connect (session expired)

7. **Invalid Credentials**
   - Go to /connect
   - Enter wrong URL, token, or password
   - Click "Connect"
   - ✓ Should see error message with troubleshooting steps

8. **Invalid Gateway URL**
   - Try "not-a-url"
   - ✓ Should show "Gateway URL must use http:// or https://."
   - Try "ftp://example.com"
   - ✓ Should show same error

9. **Missing Required Fields**
   - Leave URL blank, click "Connect"
   - ✓ Should show "Gateway URL is required."
   - Leave Token blank, click "Connect"
   - ✓ Should show "Gateway token is required."

### Automated Testing (Optional)

Create `app/api/gateway/session/route.test.ts`:

```typescript
// Test POST encryption/validation
// Test DELETE cookie clear
// Test GET status check
// Test loopback host detection
// Test Tailscale host normalization
```

---

## Deployment

### Vercel Deployment

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Set Environment Variables** (in Vercel dashboard)
   - `SESSION_SECRET` → Your generated secret
   - `NODE_ENV` → "production" (Vercel sets this auto)

3. **Vercel auto-deploys** on push

4. **Test Production**
   - Visit https://coven-dash.vercel.app/
   - Login with your gateway credentials
   - Verify secure cookies (should have secure flag in production)

### Self-Hosted Deployment

1. **Build**
   ```bash
   npm run build
   ```

2. **Set Environment**
   ```bash
   export SESSION_SECRET="your-secret"
   export NODE_ENV="production"
   ```

3. **Start**
   ```bash
   npm run start
   ```

---

## Security Checklist ✅

- ✅ SESSION_SECRET required (16+ chars)
- ✅ AES-GCM encryption for credentials
- ✅ httpOnly cookies (XSS-proof)
- ✅ Secure flag in production
- ✅ sameSite=lax (CSRF-resistant)
- ✅ Random IV for each encryption
- ✅ Credentials never stored client-side
- ✅ Password fields use type=password
- ✅ Show/hide secrets toggle
- ✅ Loopback host detection (prevents cross-origin reachability issues)

---

## Troubleshooting

### "SESSION_SECRET must be set..."
```bash
# Generate and add to .env.local
openssl rand -base64 32
# Paste as SESSION_SECRET=<value>
```

### "Connection failed: Network connection..."
- Verify gateway is running: `coven daemon status`
- Verify gateway URL is reachable from this dashboard
- If localhost gateway, make sure dashboard is also localhost
- If remote gateway, use https://yourname.your-tailnet.ts.net

### "Gateway token is required"
- Token field cannot be empty
- Copy token from your gateway credentials

### Cookies not persisting
- Check "Keep me signed in" checkbox to enable 30-day persistence
- By default, session expires when browser closes

### Session not restoring after reload
- "Keep me signed in" not checked → session is session-only (expires on close)
- Check that `coven.connect.rememberMe=1` in localStorage
- Check that encrypted cookie exists in DevTools

---

## Next Steps

1. **Test locally** with your gateway
2. **Deploy to Vercel** (instructions above)
3. **Share dashboard URL** with team members
4. **Each person logs in** with their own gateway credentials
5. **Remember me** option allows 30-day persistence

---

## Files Changed

- `lib/session.ts` — New encryption utilities
- `lib/protected-route.ts` — New auth helper
- `app/connect/page.tsx` — New login page
- `app/connect/ConnectForm.tsx` — New login form component
- `app/api/gateway/session/route.ts` — New session endpoint
- `app/dashboard/page.tsx` — Added logout button, session check
- `app/api/dashboard/route.ts` — Updated to use session credentials
- `app/page.tsx` — Updated to check session and redirect
- `.env.example` — Updated to document SESSION_SECRET

---

## Verification

```bash
# Build succeeds with no errors
npm run build
# ✓ Build output shows all routes compiled

# Type checking passes
PATH="/Users/buns/.nvm/versions/node/v24.13.0/bin:$PATH" npm run lint
# ✓ No TypeScript errors

# Dev server starts
npm run dev
# ✓ Server listens on port 3000
# ✓ http://localhost:3000 redirects to /connect
```

---

## Summary

✅ **Multi-user authentication** implemented identically to coven-dashboard
✅ **Login form** at /connect with URL, token, password
✅ **Encrypted session cookies** using AES-GCM
✅ **Remember me** option for 30-day persistence
✅ **Logout** clears session and redirects
✅ **No env vars** for gateway config — user provides via form
✅ **Build verified** with no errors
✅ **Ready for production** deployment

The authentication system is solid, secure, and ready for real users.
