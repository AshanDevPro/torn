# 🚀 Torn Game — Hostinger VPS Deployment Guide

> **Your VPS:** Hostinger KVM  
> **VPS IP:** `72.61.9.168`  
> **Project path on VPS:** `/var/www/torn-space`  
> **GitHub repo:** `https://github.com/AshanDevPro/torn`

---

## 📐 Architecture Overview

The game has **three processes** that must all be running:

| Process | What It Does | Managed By |
|---|---|---|
| **Nginx** | Serves the HTML/JS files to players' browsers | systemctl |
| **Node.js game server** (`app.js`) | Runs the actual game (physics, players, sockets) | PM2 |
| **Python account server** (`account/account_server.py`) | Handles login, registration, passwords | PM2 |

All three must be running for the game to work.

---

## 🔄 PART 1: Update Game (Run Every Time You Make Changes)

### Step 1 — Push from Your Local PC

Open a terminal in VS Code on your computer:

```bash
git add .
git commit -m "Describe what you changed"
git push origin main
```

### Step 2 — Pull & Rebuild on the VPS

Connect to your VPS via SSH (from Hostinger dashboard → VPS → Terminal, or use PuTTY):

```bash
# Go to project folder
cd /var/www/torn-space

# Force-reset any local conflicts, then pull
git reset --hard HEAD
git pull origin main

# Install any new Node packages
npm install --production

# Rebuild the game client (ALWAYS do this after any code change)
npm run build:vps

# Restart both servers
pm2 restart torn-server
pm2 restart torn-account
```

> ✅ **How to check it worked:** Run `pm2 status` — both `torn-server` and `torn-account` should show **online**.

---

## 🛠️ PART 2: First-Time Setup (Fresh Hostinger VPS)

Do this **only once** when setting up a brand new VPS.

### Step 1 — Connect to VPS

From **Hostinger dashboard → VPS → Terminal** (or use PuTTY with your VPS IP).

### Step 2 — Install System Software

```bash
apt update && apt upgrade -y
apt install -y curl git nginx lsof gnupg wget python3 python3-pip

# Install Node.js 18 (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Confirm Node version (must be 18+)
node --version

# Install PM2 (process manager)
npm install -g pm2
```

### Step 3 — Install MongoDB

```bash
# Import MongoDB 6.0 GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | \
  gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor

# Add MongoDB repo (Ubuntu 22.04 / Jammy)
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | \
  tee /etc/apt/sources.list.d/mongodb-org-6.0.list

apt update
apt install -y mongodb-org

# Start MongoDB and enable auto-start on boot
systemctl start mongod
systemctl enable mongod

# Verify it's running
systemctl status mongod
```

### Step 4 — Clone the Project

```bash
mkdir -p /var/www
cd /var/www

# Clone your repo
git clone https://github.com/AshanDevPro/torn.git torn-space
cd torn-space

# Install Node dependencies
npm install --production

# Build the client bundle for VPS
npm run build:vps
```

### Step 5 — Install Python Account Server

```bash
cd /var/www/torn-space

# Install Python dependencies
pip3 install -r requirements.txt
```

### Step 6 — Configure Nginx

Create the Nginx site config:

```bash
nano /etc/nginx/sites-available/torn
```

Paste the following:

```nginx
server {
    listen 80;
    server_name 72.61.9.168;

    root /var/www/torn-space/client;
    index index.html;

    # Serve the game frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy Socket.IO game traffic to Node.js
    location /socket.io/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
    }

    # Proxy the login/register API to the Python account server
    location /api/ {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Activate the config:

```bash
# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Enable torn site
ln -s /etc/nginx/sites-available/torn /etc/nginx/sites-enabled/

# Test config (fix any errors before restarting)
nginx -t

# Apply config
systemctl restart nginx
systemctl enable nginx
```

### Step 7 — Open Firewall Ports

Run this on the VPS to allow web traffic:

```bash
ufw allow 22    # SSH (so you don't lock yourself out)
ufw allow 80    # HTTP game
ufw allow 443   # HTTPS (for future)
ufw --force enable
ufw status
```

> ⚠️ **Hostinger also has a firewall panel.** Go to **Hostinger → VPS → Firewall** and make sure ports **22**, **80**, and **443** are allowed there too.

### Step 8 — Start Game Servers with PM2

```bash
cd /var/www/torn-space

# Start Node.js game server (port 8080, prod config)
pm2 start app.js --name "torn-server" -- 8080 prod

# Start Python account server (port 8081)
pm2 start "python3 account/account_server.py" --name "torn-account"

# Save the process list
pm2 save

# Enable PM2 auto-start on server reboot
pm2 startup
# (Run the command that pm2 prints out)
```

### Step 9 — Verify Everything Works

```bash
# Check all processes are running
pm2 status

# Watch live logs
pm2 logs --lines 50

# Test Nginx is serving the site
curl -I http://72.61.9.168
```

Open your browser and go to `http://72.61.9.168` — you should see the game login screen.

---

## 🌐 PART 3: Add a Domain Name (Optional but Recommended)

If you have a domain (e.g. `mygame.com`):

1. In Hostinger **Domains → DNS**, add an **A record** pointing to your VPS IP.
2. Update Nginx: `nano /etc/nginx/sites-available/torn` → change `server_name 72.61.9.168;` to `server_name mygame.com;`
3. Install free HTTPS certificate:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d mygame.com
systemctl reload nginx
```

---

## 🚑 PART 4: Troubleshooting

### ❌ Website Not Loading (`ERR_CONNECTION_TIMED_OUT`)
- **Check 1:** `pm2 status` — are both servers `online`?
- **Check 2:** `systemctl status nginx` — is Nginx `active (running)`?
- **Check 3:** Hostinger dashboard → **VPS Firewall** — is port 80 open?
- **Check 4:** VPS firewall: `ufw status` — does it show port 80 ALLOW?

### ❌ White/Blank Screen or `502 Bad Gateway`
The Node.js server crashed. Fix:
```bash
pm2 logs torn-server --lines 100   # See the error
pm2 restart torn-server
```

### ❌ Can't Log In / `Failed to connect to Torn Account Services`
The Python account server is down. Fix:
```bash
pm2 logs torn-account --lines 50   # See the error
pm2 restart torn-account
```

### ❌ Team Select Does Nothing / Stuck on Loading Screen
This was a socket race condition bug — **already fixed in the latest code**.  
Make sure you've pulled and rebuilt:
```bash
cd /var/www/torn-space
git reset --hard HEAD
git pull origin main
npm install --production
npm run build:vps
pm2 restart torn-server
```

### ❌ `Your local changes would be overwritten by merge`
VPS has conflicting local files. Force reset:
```bash
cd /var/www/torn-space
git reset --hard HEAD
git clean -fd
git pull origin main
```

### ❌ `fatal: not a git repository`
You're in the wrong folder:
```bash
cd /var/www/torn-space
```

### ❌ `Cannot find module '...'` on server start
Dependencies missing. Run:
```bash
cd /var/www/torn-space
npm install --production
pm2 restart torn-server
```

### ❌ MongoDB not connecting
```bash
systemctl status mongod      # Check if it's running
systemctl start mongod       # Start it
journalctl -u mongod -n 50  # See MongoDB logs
```

### 🔍 View Live Server Logs
```bash
pm2 logs torn-server     # Game server logs
pm2 logs torn-account    # Account server logs
pm2 logs                 # All logs
pm2 status               # Quick status of all processes
```

---

## 📋 Quick Reference Cheat Sheet

| Task | Command |
|---|---|
| Update game | `git reset --hard HEAD && git pull && npm install --production && npm run build:vps && pm2 restart all` |
| Restart game server | `pm2 restart torn-server` |
| Restart account server | `pm2 restart torn-account` |
| Restart everything | `pm2 restart all` |
| View logs | `pm2 logs` |
| Check status | `pm2 status` |
| Restart Nginx | `systemctl restart nginx` |
| Check Nginx config | `nginx -t` |
