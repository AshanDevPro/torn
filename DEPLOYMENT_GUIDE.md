# 🚀 Torn.Space Ultimate Hosting & Update Guide

This guide covers everything from the very first setup to updating your game with new features (like Developer Mode).

**VPS IP:** `76.13.108.157`  
**Domain:** `http://76.13.108.157`  
**Project Path on VPS:** `/var/www/torn-space`

---

## 🔄 PART 1: How to Update Your Game (Most Common Task)

Do this whenever you make changes (like adding Developer Mode) and want them to appear on the live server.

### **Step 1: Save & Push (On Your LOCAL PC)**
*Run this in your VS Code terminal on your computer.*

```bash
# 1. Add all changes
git add .

# 2. Commit with a message
git commit -m "Update game features"

# 3. Send to GitHub
git push origin main
```

### **Step 2: Pull & Restart (On The VPS SERVER)**
*Run this in the terminal connected to your VPS.*

```bash
# 1. Connect (if not already connected)
ssh root@76.13.108.157

# 2. Go to the project folder (CRITICAL STEP)
cd /var/www/torn-space

# 3. Download the new code
git pull origin main

# 4. Re-install server dependencies (just in case)
npm install

# 5. Restart the server
pm2 restart torn-server
```

> **Note:** If you changed frontend code (visuals, React, HTML), you must also run `npm run build:vps` after `npm install`.

---

## 🛠️ PART 2: First Time Setup (If Starting Fresh)

**⚠️ Only do this if the server is empty or broken.**

### **Step 1: Install Software**
Run these on the VPS:
```bash
apt update && apt upgrade -y
apt install curl git nginx lsof gnupg wget -y

# Install Node.js 16
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt install -y nodejs

# Install PM2
npm install -g pm2

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod
```

### **Step 2: Setup Project**
```bash
cd /var/www

# Remove old folder if it exists
rm -rf torn-space

# Clone fresh
git clone https://github.com/AshanDevPro/torn.git torn-space

# Go inside (CRITICAL)
cd torn-space

# Install & Build
npm install
npm run build:vps
```

### **Step 3: Fix Permissions**
```bash
chown -R www-data:www-data /var/www/torn-space
chmod -R 755 /var/www/torn-space
```

### **Step 4: Nginx Web Server Setup**
1. `nano /etc/nginx/sites-available/torn`
2. Paste this config:
```nginx
server {
    listen 80;
    server_name 76.13.108.157;

    root /var/www/torn-space/client;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /socket.io/ {
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```
3. Save (`Ctrl+X`, `Y`, `Enter`).
4. Activate:
```bash
rm /etc/nginx/sites-enabled/default
ln -s /etc/nginx/sites-available/torn /etc/nginx/sites-enabled/
systemctl restart nginx
```

### **Step 5: Start Game**
```bash
cd /var/www/torn-space
pm2 start app.js --name "torn-server" -- 8080
pm2 save
pm2 startup
```

---

## 🚑 PART 3: Troubleshooting

### **Error: `fatal: not a git repository`**
*   **Cause:** You are in the wrong folder.
*   **Fix:**
    ```bash
    cd /var/www/torn-space
    ```
    *Then try your git command again.*

### **Error: `ERR_CONNECTION_TIMED_OUT` (Website not loading)**
*   **Cause:** Server is down or Firewall is blocking connections.
*   **Fix 1 (Check Server):** Go to Hostinger Dashboard -> VPS -> Status. Ensure it is **Running**.
*   **Fix 2 (Firewall):** 
    Run this on VPS:
    ```bash
    ufw allow 80
    ufw allow 22
    ufw allow 443
    ufw reload
    ```

### **Error: `502 Bad Gateway`**
*   **Cause:** The game server (Node.js) is crashed or stopped.
*   **Fix:**
    ```bash
    pm2 restart torn-server
    ```

### **Error: Developer Mode Commands Not Working**
*   **Cause:** You didn't update the server code or you don't have Admin permissions.
*   **Fix:**
    1. Follow **PART 1** (Update Game) above completely.
    2. Check server logs to see if code loaded:
       ```bash
       pm2 logs torn-server
       ```
