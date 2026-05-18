# Torn.Space — Complete VPS Deployment Guide

> **Your Server:** `ssh root@72.61.9.168`  
> **Your Repo:** `https://github.com/AshanDevPro/torn.git`  
> **VPS Provider:** Hostinger KVM (Ubuntu)

This is the single, definitive guide for deploying, updating, troubleshooting, adding SSL, and doing a fresh start on your Hostinger VPS.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Fresh VPS Setup (From Scratch)](#2-fresh-vps-setup-from-scratch)
3. [SSL / HTTPS Setup with Let's Encrypt](#3-ssl--https-setup-with-lets-encrypt)
4. [Updating the Server After Code Changes](#4-updating-the-server-after-code-changes)
5. [Wipe Everything & Start Fresh](#5-wipe-everything--start-fresh)
6. [Error Reference & Troubleshooting](#6-error-reference--troubleshooting)
7. [What NOT To Do on a VPS](#7-what-not-to-do-on-a-vps)
8. [Final Checklist](#8-final-checklist)
9. [Developer Mode Commands](#9-developer-mode-commands)
10. [Local Windows Development](#10-local-windows-development)

---

## 1. Architecture Overview

Torn needs **four services** running together on the VPS:

| Service | What It Does | Port / Socket |
|---|---|---|
| **Nginx** | Serves the built client files + reverse-proxies API/Socket.IO | Port `80` (and `443` with SSL) |
| **Node.js game server** (`app.js`) | Runs the game logic, Socket.IO | Port `7300` (TCP) |
| **Python account server** (`account/account_server.py`) | Handles login, registration, password reset | Port `8080` |
| **MongoDB** | Stores all player and game data | Port `27017` (local only) |

**How the browser connects:**

```
Browser  →  http(s)://YOUR_IP/             →  Nginx serves client/index.html
Browser  →  http(s)://YOUR_IP/socket.io/   →  Nginx proxies to 127.0.0.1:7300
Browser  →  http(s)://YOUR_IP/api/         →  Nginx proxies to 127.0.0.1:8080
```

The browser should **never** connect directly to ports `7300` or `8080`.

---

## 2. Fresh VPS Setup (From Scratch)

### Step 2.1 — Connect to Your VPS

```bash
ssh root@72.61.9.168
```

### Step 2.2 — Install System Dependencies

```bash
apt update && apt upgrade -y
apt install -y curl git nginx python3 python3-pip
```

**Install Node.js 18 LTS (recommended):**

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
```

**Verify versions:**

```bash
node -v      # Should be 18.x or higher
npm -v       # Should be 7+
python3 --version
nginx -v
```

**Install MongoDB:**

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod
mongod --version
```

> [!NOTE]
> If your Ubuntu version is not `jammy` (22.04), replace `jammy` with your version codename. Run `lsb_release -cs` to check.

**Install PM2:**

```bash
npm install -g pm2
pm2 -v
```

### Step 2.3 — Clone the Repo

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/AshanDevPro/torn.git torn-space
cd /var/www/torn-space
```

### Step 2.4 — Install Project Dependencies

**Node.js dependencies (include devDependencies for the build step):**

```bash
cd /var/www/torn-space
npm ci
```

> [!WARNING]
> Do **not** use `npm install --production`. The VPS build step needs webpack and Babel from `devDependencies`.

**Python dependencies:**

```bash
cd /var/www/torn-space
python3 -m pip install --upgrade -r requirements.txt
```

### Step 2.5 — Fix the Production Config

```bash
nano /var/www/torn-space/config/torn.cfg
```

Find the `<prod>` block and make sure it looks like this:

```
<prod>
    enable_discord_moderation false
    debug false
    want-xreal-ip true
    want-tls false
    want-unix-sockets false
    want-bots false
</prod>
```

> [!IMPORTANT]
> The repo defaults to `want-unix-sockets true` in `<prod>`. You **must** change this to `false`, otherwise the game server listens on a Unix socket file instead of TCP port `7300`, and Nginx cannot proxy to it.

Save and exit (`Ctrl+X`, then `Y`, then `Enter`).

### Step 2.6 — Build the Client

```bash
cd /var/www/torn-space
npm run build:vps
```

> [!CAUTION]
> **Never** use `npm run build` on your VPS. That command hardcodes the official `torn.space` URLs. Only `npm run build:vps` makes the client connect to whatever IP/domain serves the page.

### Step 2.7 — Start Services with PM2

Delete any old/broken processes first:

```bash
pm2 delete all
```

Start the account server:

```bash
cd /var/www/torn-space
pm2 start account/account_server.py --interpreter python3 --name torn-account
```

Start the game server:

```bash
cd /var/www/torn-space
pm2 start app.js --name torn-game -- 7300 prod
```

Save and enable on reboot:

```bash
pm2 save
pm2 startup
```

> [!NOTE]
> `pm2 startup` prints a command you need to copy-paste and run. After running it, do `pm2 save` again.

Verify:

```bash
pm2 status
```

You should see both `torn-account` and `torn-game` with status `online`.

### Step 2.8 — Configure Nginx (HTTP Only)

Create the site config:

```bash
cat >/etc/nginx/sites-available/torn <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/torn-space/client;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:7300;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 75s;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
```

Enable the site:

```bash
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/torn /etc/nginx/sites-enabled/torn
nginx -t
systemctl reload nginx
systemctl enable nginx
```

> [!WARNING]
> If `nginx -t` fails, **fix the error before continuing**. The most common mistake is pasting Markdown fences (` ```nginx `) into the config file.

### Step 2.9 — Open the Firewall

**Hostinger hPanel:**

1. Go to **VPS → Select your server → Security → Firewall**
2. Create or edit a firewall group
3. Add these **allow** rules:
   - TCP `22` from `anywhere` (SSH)
   - TCP `80` from `anywhere` (HTTP)
   - TCP `443` from `anywhere` (HTTPS — for later SSL)
4. Activate the firewall group on the server

**OS-level firewall (UFW):**

```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable
ufw status
```

> [!NOTE]
> You do **not** need to open ports `7300` or `8080` publicly. Nginx proxies them internally.

### Step 2.10 — Verify Everything

```bash
# Check processes
pm2 status

# Test game server socket locally
curl "http://127.0.0.1:7300/socket.io/?EIO=4&transport=polling"

# Test game server through Nginx
curl "http://72.61.9.168/socket.io/?EIO=4&transport=polling"

# Test account API
curl -I "http://72.61.9.168/"
```

A healthy Socket.IO response looks like:

```
0{"sid":"..."}
```

Then open in your browser:

```
http://72.61.9.168
```

---

## 3. SSL / HTTPS Setup with Let's Encrypt

> [!IMPORTANT]
> SSL requires a **domain name** (e.g., `yourgame.com`). You cannot get an SSL certificate for a raw IP address. If you only have an IP, skip this section and use HTTP.

### Step 3.1 — Point Your Domain to the VPS

In your domain registrar (Hostinger, Namecheap, etc.):

1. Add an **A record**: `@` → `72.61.9.168`
2. Add an **A record**: `www` → `72.61.9.168`
3. Wait 5–30 minutes for DNS propagation

Verify:

```bash
ping yourdomain.com
```

### Step 3.2 — Update Nginx to Use Your Domain

```bash
nano /etc/nginx/sites-available/torn
```

Change the `server_name` line from `_` to your domain:

```nginx
server_name yourdomain.com www.yourdomain.com;
```

Test and reload:

```bash
nginx -t
systemctl reload nginx
```

### Step 3.3 — Install Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### Step 3.4 — Obtain SSL Certificate

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will:
- Ask for your email address (for renewal notices)
- Ask you to agree to Terms of Service
- Ask if you want to redirect HTTP → HTTPS (choose **Yes**)
- Automatically modify your Nginx config to add SSL

### Step 3.5 — Verify Auto-Renewal

```bash
certbot renew --dry-run
```

Certbot installs a systemd timer that auto-renews certificates before they expire. Verify:

```bash
systemctl list-timers | grep certbot
```

### Step 3.6 — Verify the Final Nginx Config

After Certbot, your config should look similar to this:

```bash
cat /etc/nginx/sites-available/torn
```

```nginx
server {
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/torn-space/client;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:7300;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 75s;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = www.yourdomain.com) {
        return 301 https://$host$request_uri;
    }
    if ($host = yourdomain.com) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 404;
}
```

### Step 3.7 — Rebuild the Client (if needed)

If you were previously using HTTP and now switch to HTTPS, the `build:vps` webpack config automatically uses `window.location.protocol`, so it handles both. But rebuild to be safe:

```bash
cd /var/www/torn-space
npm run build:vps
pm2 restart torn-game
systemctl reload nginx
```

### Step 3.8 — Test

```
https://yourdomain.com
```

---

## 4. Updating the Server After Code Changes

### Step 4.1 — Push Changes From Your Local PC

On your Windows machine:

```powershell
cd "F:\Unity Games\torn"
git add .
git commit -m "describe your changes"
git push origin main
```

### Step 4.2 — Pull and Rebuild on VPS

SSH into the server:

```bash
ssh root@72.61.9.168
```

Pull and rebuild:

```bash
cd /var/www/torn-space
git fetch origin
git checkout main
git pull --ff-only origin main
npm ci
python3 -m pip install --upgrade -r requirements.txt
npm run build:vps
pm2 restart torn-account
pm2 restart torn-game
```

Verify:

```bash
pm2 status
nginx -t
```

> [!WARNING]
> Do **not** use `git reset --hard origin/main` unless you intentionally want to overwrite VPS-local changes (like your edited `config/torn.cfg`).

### Step 4.3 — If Config Got Overwritten

If `git pull` overwrites your `config/torn.cfg`, re-apply the production settings:

```bash
nano /var/www/torn-space/config/torn.cfg
```

Make sure `<prod>` has `want-unix-sockets false`, then:

```bash
pm2 restart torn-game
```

---

## 5. Wipe Everything & Start Fresh

Use this when you want to completely remove the game and reinstall from scratch.

### Step 5.1 — Stop All Services

```bash
pm2 stop all
pm2 delete all
systemctl stop nginx
```

### Step 5.2 — Remove the Game Files

```bash
rm -rf /var/www/torn-space
```

### Step 5.3 — Remove Nginx Site Config

```bash
rm -f /etc/nginx/sites-enabled/torn
rm -f /etc/nginx/sites-available/torn
systemctl reload nginx
```

### Step 5.4 — (Optional) Wipe the Database

> [!CAUTION]
> This permanently deletes all player accounts, progress, and game data!

```bash
mongosh
```

Inside the Mongo shell:

```javascript
use torn
db.dropDatabase()
exit
```

### Step 5.5 — (Optional) Remove SSL Certificates

```bash
certbot delete --cert-name yourdomain.com
```

### Step 5.6 — (Optional) Uninstall Everything

```bash
npm uninstall -g pm2
apt remove -y nodejs nginx mongodb-org certbot python3-certbot-nginx
apt autoremove -y
```

### Step 5.7 — Reinstall

Go back to [Section 2](#2-fresh-vps-setup-from-scratch) and follow every step from the beginning.

---

## 6. Error Reference & Troubleshooting

### 6.1 — `Failed to connect to the Torn servers` / `xhr poll error`

**This is the error shown in your screenshots.** It means the browser cannot reach Socket.IO.

**Diagnosis steps (run in order):**

```bash
# 1. Is the game server running?
pm2 status

# 2. Can the server itself reach Socket.IO?
curl "http://127.0.0.1:7300/socket.io/?EIO=4&transport=polling"

# 3. Can the outside world reach it through Nginx?
curl "http://72.61.9.168/socket.io/?EIO=4&transport=polling"

# 4. Check game server logs for errors
pm2 logs torn-game --lines 100
```

**Common causes and fixes:**

| Cause | Fix |
|---|---|
| Built with `npm run build` instead of `npm run build:vps` | Rebuild: `npm run build:vps` |
| `want-unix-sockets true` in `config/torn.cfg` `<prod>` block | Change to `false`, then `pm2 restart torn-game` |
| Game server crashed / not running | `pm2 restart torn-game` and check `pm2 logs torn-game` |
| Nginx `/socket.io/` block missing or wrong port | Re-create Nginx config (see Step 2.8) |
| Hostinger firewall blocking port 80 | Open port 80 in hPanel Firewall settings |
| UFW blocking port 80 | `ufw allow 80 && ufw reload` |

**If `curl localhost:7300` returns `connection refused`:**

```bash
# Check config
grep "want-unix-sockets" /var/www/torn-space/config/torn.cfg

# If it says true, fix it:
nano /var/www/torn-space/config/torn.cfg
# Change want-unix-sockets to false in <prod>

pm2 restart torn-game
pm2 logs torn-game --lines 50
```

**If `curl localhost:7300` works but `curl YOUR_IP/socket.io/` returns 404:**

```bash
# Check Nginx has the socket.io block
nginx -T | grep -n "socket.io"

# Check which site is enabled
ls -l /etc/nginx/sites-enabled

# Reload if needed
nginx -t && systemctl reload nginx
```

### 6.2 — `Welcome to nginx!` Instead of the Game

Nginx is serving its default page, not Torn.

```bash
# Check what sites are enabled
ls -l /etc/nginx/sites-enabled

# Remove default, enable torn
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/torn /etc/nginx/sites-enabled/torn

# Check the client files exist
ls -l /var/www/torn-space/client/index.html
ls -l /var/www/torn-space/client/client.min.js

# If missing, rebuild
cd /var/www/torn-space && npm run build:vps

# Reload
nginx -t && systemctl reload nginx
```

### 6.3 — `nginx -t` Says `unknown directive "```nginx"`

You pasted Markdown fences into the Nginx config file. Re-create the config cleanly using the `cat` command from [Step 2.8](#step-28--configure-nginx-http-only).

### 6.4 — `Failed to retrieve protocol version, all clients will be allowed!`

**Not a fatal error.** The server tried to read a Git tag and found none. It allows all client versions instead of blocking mismatched ones. This does not cause connection failures.

### 6.5 — `TypeError: gather() got an unexpected keyword argument 'loop'`

Python version mismatch with `aiohttp`. Fix:

```bash
cd /var/www/torn-space
python3 -m pip install --upgrade -r requirements.txt
pm2 restart torn-account
pm2 logs torn-account --lines 50
```

### 6.6 — Page Loads But Login Doesn't Work

```bash
# Check account server
pm2 logs torn-account --lines 100

# Test the API directly
curl -i -X POST "http://127.0.0.1:8080/api/login/" --data "test%test"

# Check MongoDB is running
systemctl status mongod

# If MongoDB is down:
systemctl start mongod
systemctl enable mongod
pm2 restart torn-account
```

### 6.7 — High CPU Usage

```bash
pm2 status
pm2 monit
ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%cpu | head -20
```

Common causes:
- `npm run dev:serve` or webpack dev server running on VPS → Kill it
- Duplicate PM2 processes → `pm2 delete all` and restart properly
- Bots enabled → Set `want-bots false` in `config/torn.cfg`
- Browser keeps reconnecting because Socket.IO is broken → Fix the socket

### 6.8 — Duplicate or Old PM2 Apps

```bash
pm2 delete all
cd /var/www/torn-space
pm2 start account/account_server.py --interpreter python3 --name torn-account
pm2 start app.js --name torn-game -- 7300 prod
pm2 save
```

### 6.9 — `npm ci` Fails or Dependencies Won't Install

```bash
# Clear npm cache
npm cache clean --force

# Remove and reinstall
rm -rf /var/www/torn-space/node_modules
cd /var/www/torn-space
npm ci
```

### 6.10 — `npm run build:vps` Fails

```bash
# Check the build script exists
cat /var/www/torn-space/package.json | grep "build:vps"

# Check deploy/webpack.vps.js exists
ls -l /var/www/torn-space/deploy/webpack.vps.js

# Run with verbose output
cd /var/www/torn-space
npx webpack --progress --config ./deploy/webpack.vps.js
```

### 6.11 — MongoDB Won't Start

```bash
systemctl status mongod
journalctl -u mongod --lines 50

# Common fix: directory permissions
chown -R mongodb:mongodb /var/lib/mongodb
chown mongodb:mongodb /tmp/mongodb-27017.sock 2>/dev/null
systemctl restart mongod
```

### 6.12 — SSL Certificate Renewal Failed

```bash
# Test renewal
certbot renew --dry-run

# If it fails, check Nginx is running
systemctl status nginx

# Force renewal
certbot renew --force-renewal

# Reload Nginx after renewal
systemctl reload nginx
```

### 6.13 — Game Works on HTTP but Not HTTPS

Make sure Nginx SSL config has all the proxy blocks. After Certbot modifies the file, verify:

```bash
nginx -T | grep -En "socket.io|proxy_pass|ssl_certificate"
```

If the `/socket.io/` proxy block is missing from the HTTPS server block, re-add it.

### 6.14 — `ERR_CONNECTION_TIMED_OUT` in Browser

```bash
# Check Nginx is running
systemctl status nginx

# Check firewall
ufw status

# Also check Hostinger hPanel firewall (port 80 and 443 must be open)
```

### 6.15 — Server Crashes on Reboot (PM2 Not Restarting)

```bash
pm2 startup
# Copy-paste and run the command it outputs
pm2 save
```

---

## 7. What NOT To Do on a VPS

| ❌ Never Do This | ✅ Do This Instead |
|---|---|
| `npm run build` | `npm run build:vps` |
| `npm run dev:serve` | `pm2 start app.js --name torn-game -- 7300 prod` |
| `node --use_strict app.js 7300 dev` | `pm2 start app.js --name torn-game -- 7300 prod` |
| `git reset --hard origin/main` (destroys config) | `git pull --ff-only origin main` |
| Open port `7300` or `8080` in firewall | Keep them closed; Nginx proxies internally |
| Run the game without PM2 | Always use PM2 for process management |

---

## 8. Final Checklist

Before sharing the server with players, verify **all** of these:

- [ ] `pm2 status` shows `torn-game` and `torn-account` both `online`
- [ ] `nginx -t` succeeds with no errors
- [ ] `curl "http://127.0.0.1:7300/socket.io/?EIO=4&transport=polling"` returns `0{"sid":"..."}`
- [ ] `curl "http://72.61.9.168/socket.io/?EIO=4&transport=polling"` also returns a handshake
- [ ] `systemctl status mongod` shows MongoDB running
- [ ] Hostinger hPanel firewall allows TCP `22`, `80`, `443`
- [ ] UFW allows `22`, `80`, `443`
- [ ] Browser opens `http://72.61.9.168` and shows the game
- [ ] You can select a team and enter the game without errors
- [ ] (If using SSL) `https://yourdomain.com` loads with a valid certificate

---

## 9. Developer Mode Commands

> Requires **Admin** (`A` tag) or **Owner** (`O` tag) permissions.

| Command | What It Does | Example |
|---|---|---|
| `/devmode <player>` | Toggle full dev mode (all items, max rank, god mode, infinite resources) | `/devmode TestPlayer` |
| `/godmode` | Toggle invincibility | `/godmode` |
| `/unlockall` | Unlock all 10 weapon slots with top weapons + infinite ammo | `/unlockall` |
| `/maxstats` | Max all stats (thrust, radar, agility, capacity, health, energy) to level 10 | `/maxstats` |
| `/setrank <0-25>` | Set your rank and ship level | `/setrank 25` |
| `/setexp <amount>` | Set experience points | `/setexp 1000000` |
| `/setmoney <amount>` | Set money | `/setmoney 10000000` |
| `/refill` | Refill ammo, health, and all resources to max | `/refill` |
| `/giveweapon <player> <id>` | Give a specific weapon by ID | `/giveweapon Player 13` |

**Common Weapon IDs:** `1` Pistol, `3` Machine Gun, `4` Shotgun, `6` Minigun, `8` Hadron Beam, `10` Missile, `12` Nuke, `13` Swarm Missile, `17` EMP Mine, `18` Hull Nanobots, `19` Photon Cloak, `21` Turbo, `22` Hyperdrive, `29` Warp Drive, `36` Supercharger, `39` Spreadshot

Developer mode status is saved to MongoDB and persists across sessions.

---

## 10. Local Windows Development

### Prerequisites

1. **Node.js v14+** — [Download](https://nodejs.org/)
2. **MongoDB Community Server** — [Download](https://www.mongodb.com/try/download/community)
   - Install as a Windows Service
   - Add `C:\Program Files\MongoDB\Server\7.0\bin` to System PATH
3. **Python 3** — [Download](https://www.python.org/) — Check "Add Python to PATH"

### Setup & Run

```powershell
cd "F:\Unity Games\torn"
pip install -r requirements.txt
.\devServer-win.ps1
```

> If you get a script execution error: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

Then open: **http://localhost:7301**

To stop: press **Enter** in the PowerShell window.

---

## Quick Reference Card

```
# SSH in
ssh root@72.61.9.168

# Check everything
pm2 status
nginx -t
systemctl status mongod
curl "http://127.0.0.1:7300/socket.io/?EIO=4&transport=polling"

# View logs
pm2 logs torn-game --lines 100
pm2 logs torn-account --lines 50

# Restart services
pm2 restart torn-game
pm2 restart torn-account
systemctl reload nginx

# Full update workflow
cd /var/www/torn-space
git pull --ff-only origin main
npm ci
npm run build:vps
pm2 restart torn-account
pm2 restart torn-game

# Emergency: nuke and rebuild
pm2 delete all
rm -rf /var/www/torn-space
# Then follow Section 2 from Step 2.3 onwards
```
