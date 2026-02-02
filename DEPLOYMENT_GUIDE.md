# Deploying Torn.Space to Hostinger VPS (Full Guide)

This guide walks you through hosting your game on a Hostinger VPS using Ubuntu 22. It covers the entire process: setting up the server, deploying the code, configuring the network, and maintaining the game.

## Prerequisites

-   Hostinger VPS with Ubuntu 22.04 installed.
-   Access to the VPS via SSH.
-   Your VPS IP Address: `76.13.108.157`
-   Your GitHub Repo: `https://github.com/AshanDevPro/torn.git`

## Step 0: Save & Publish Your Changes (On Your PC)

Before connecting to the VPS, ensure your local code (with the new VPS build scripts) is on GitHub.

1.  Open your local terminal (VS Code terminal).
2.  Run these commands:
    ```bash
    git add .
    git commit -m "Ready for VPS deployment"
    git push origin main
    ```

## Step 1: Connect to your VPS

Open your terminal (PowerShell, Command Prompt, or Terminal) and run:

```bash
ssh root@76.13.108.157
```
*Enter your VPS password when prompted.*

## Step 2: Install Required Software

Run these commands one by one to install Node.js, Database, and Web Server.

```bash
# 1. Update system
apt update && apt upgrade -y

# 2. Install basic tools
apt install curl git nginx lsof -y

# 3. Install Node.js (Version 16)
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt install -y nodejs

# 4. Install MongoDB (Database)
apt install -y gnupg wget
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt update
apt install -y mongodb-org

# 5. Start MongoDB
systemctl start mongod
systemctl enable mongod

# 6. Install PM2 (Process Manager)
npm install -g pm2
```

## Step 3: Set Up the Project Files

We will remove any old version of the game and clone the fresh code from GitHub to ensure a clean state.

```bash
# 1. Prepare directory
cd /var/www

# 2. Stop existing server if running
pm2 stop torn-server || true
pm2 delete torn-server || true

# 3. Remove old folder completely
rm -rf torn-space

# 4. Clone the repository (Fresh Install)
git clone https://github.com/AshanDevPro/torn.git torn-space

# 5. Enter directory and install dependencies
cd torn-space
npm install
```

## Step 4: Build the Client

This compiles your game code to work on your specific IP address.

```bash
npm run build:vps
```

## Step 5: Fix Permissions (CRITICAL)

After building, you **MUST** ensure Nginx can read the files. If you skip this, you will get a "403 Forbidden" error.

```bash
chown -R www-data:www-data /var/www/torn-space
chmod -R 755 /var/www/torn-space
```

## Step 6: Configure Nginx (Web Server)

1.  **Remove default config:**
    ```bash
    rm /etc/nginx/sites-enabled/default
    ```
2.  **Create new config:**
    ```bash
    nano /etc/nginx/sites-available/torn
    ```
3.  **Paste this configuration:**
    *(Use right-click to paste. This handles your IP 76.13.108.157 correctly)*

    ```nginx
    server {
        listen 80;
        server_name 76.13.108.157;

        root /var/www/torn-space/client;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        # WebSocket Proxy (For Game Connection)
        location /socket.io/ {
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header Host $http_host;
            proxy_set_header X-NginX-Proxy true;

            proxy_pass http://127.0.0.1:8080;
            proxy_redirect off;

            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
    ```
4.  **Save and Exit:** Press `Ctrl+X`, then `Y`, then `Enter`.
5.  **Enable Site & Restart:**
    ```bash
    ln -s /etc/nginx/sites-available/torn /etc/nginx/sites-enabled/ || true
    nginx -t
    systemctl restart nginx
    ```

## Step 7: Start Game Server

Start the backend server using PM2.

```bash
cd /var/www/torn-space

# Start the app
pm2 start app.js --name "torn-server" -- 8080

# Save for auto-restart on reboot
pm2 save
pm2 startup
```

## Step 8: Play!

Visit `http://76.13.108.157` in your browser.

---

## Maintenance & Troubleshooting

### How to Update the Game
When you make changes on your PC and push them to GitHub:

1.  **Connect via SSH.**
2.  **Pull changes:**
    ```bash
    cd /var/www/torn-space
    git fetch --all
    git reset --hard origin/main
    git pull
    ```
3.  **Rebuild client (if you changed frontend code):**
    ```bash
    npm install
    npm run build:vps
    ```
4.  **Fix Permissions (MANDATORY):**
    ```bash
    chown -R www-data:www-data /var/www/torn-space
    chmod -R 755 /var/www/torn-space
    ```
5.  **Restart Server (if you changed backend code):**
    ```bash
    pm2 restart torn-server
    ```

### Troubleshooting Common Issues

**1. White Screen / 403 Forbidden**
-   **Cause:** Nginx cannot access the files.
-   **Fix:**
    ```bash
    chown -R www-data:www-data /var/www/torn-space
    systemctl restart nginx
    ```

**2. Game not loading / "Connection Refused"**
-   **Cause:** The Node.js server isn't running.
-   **Fix:**
    ```bash
    pm2 status
    # If stopped:
    pm2 restart torn-server
    ```

**3. "Welcome to nginx" default page**
-   **Cause:** The default config wasn't deleted or the new one isn't enabled.
-   **Fix:**
    ```bash
    rm /etc/nginx/sites-enabled/default
    ln -s /etc/nginx/sites-available/torn /etc/nginx/sites-enabled/
    systemctl restart nginx
    ```
