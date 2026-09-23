# TINY GAMES // MONOCHROME

Ultra-small monochrome mini-games suite with an admin console and public visitor IP tracking.

## Aesthetic Constraints
- ZERO EMOJIS: Pure monospaced typography and ASCII indicators only.
- ZERO ROUND CORNERS: `border-radius: 0 !important` on all elements.
- PURE MONOCHROME: Strictly `#000000` (black) and `#ffffff` (white).

---

## Deploy to Render (1-Click)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/SamObviously/tiny-games)

**Direct Deploy URL**: [https://render.com/deploy?repo=https://github.com/SamObviously/tiny-games](https://render.com/deploy?repo=https://github.com/SamObviously/tiny-games)

Repository: [https://github.com/SamObviously/tiny-games](https://github.com/SamObviously/tiny-games)

This project includes a native `render.yaml` blueprint and zero external dependencies, making deployment to Render seamless:

### Option 1: Automatic Blueprint via GitHub
1. Create a new GitHub repository (e.g., `tiny-games`).
2. Push this folder to your repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/<your-username>/tiny-games.git
   git branch -M main
   git push -u origin main
   ```
3. Go to [Render Dashboard](https://dashboard.render.com).
4. Click **New +** -> **Blueprint**.
5. Select your repository. Render will automatically read `render.yaml` and configure:
   - Environment: `Node`
   - Build Command: (empty)
   - Start Command: `node server.mjs`
   - Plan: `Free`
6. Click **Apply**. Your app will be live with a free public HTTPS URL (e.g. `https://tiny-games-monochrome.onrender.com`).

### Option 2: Manual Web Service on Render
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Settings:
   - **Runtime**: `Node`
   - **Build Command**: *(leave empty)*
   - **Start Command**: `node server.mjs`
   - **Instance Type**: `Free`
4. Click **Create Web Service**.

---

## Public IP Tracking Details

When deployed to Render or behind any proxy (Cloudflare, AWS, etc.):
- Render routes client requests through Cloudflare edge servers. The server extracts the real client public IP from `cf-connecting-ip` and `x-forwarded-for`.
- For direct localhost development, the client browser pings `https://api.ipify.org` and registers the actual outbound public IP address to the admin console.
