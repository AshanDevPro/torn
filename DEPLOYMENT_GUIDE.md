# Deploying Torn.Space to Hostinger VPS (Clean Install)

This guide walks you through hosting your game on a Hostinger VPS using Ubuntu 22. It includes steps to push your recent updates (IP-based hosting support) to GitHub and then do a clean install on your VPS.

## Prerequisites

-   Hostinger VPS with Ubuntu 22.04 installed.
-   Access to the VPS via SSH.
-   Your VPS IP Address: `76.13.108.157`.
-   Your GitHub Repo: `https://github.com/AshanDevPro/Torn-master-new.git`.

## Step 0: Save & Publish Your Changes (On Your PC)

Before connecting to the VPS, you must upload the changes we just made (the new webpack config and build script) to GitHub.

1.  Open your local terminal (VS Code terminal).
2.  Run the following commands to commit and push:

    ```bash
    git add .
    git commit -m "Add VPS build configuration and dynamic IP support"
    git push origin main
    ```

    *(If `main` is not your branch name, replace it with `master` or your current branch).*

## Step 1: Connect to your VPS

Open your terminal (PowerShell, Command Prompt, or Terminal) and run:

```bash
ssh root@76.13.108.157
```

*Enter your VPS password when prompted.*

## Step 2: Install Required Software (If not already installed)

If you haven't set up the server yet, run these commands.

```bash
# Update system
apt update && apt upgrade -y

# Install Curl, Git, and Nginx
apt install curl git nginx -y

# Install Node.js (Version 16)
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt install -y nodejs

# Install MongoDB
apt install -y gnupg wget
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt update
apt install -y mongodb-org

# Start MongoDB
systemctl start mongod
systemctl enable mongod
```

## Step 3: Clean Setup of the Project

We will remove any old version of the game and clone the fresh code from GitHub.

```bash
# Install PM2 (Process Manager)
npm install -g pm2

# Navigate to web root
cd /var/www

# --- DANGER ZONE: CLEAN UP OLD FILES ---
# Stop existing server if running
pm2 stop torn-server || true
pm2 delete torn-server || true

# Remove old folder completely
rm -rf torn-space

# --- FRESH INSTALL ---
# Clone your repository
git clone https://github.com/AshanDevPro/Torn-master-new.git torn-space

# Enter the directory
cd torn-space

# Install Dependencies
npm install
```

## Step 4: Build the Client for IP Hosting

This step uses the specific IP-based build script we created.

```bash
npm run build:vps
```

## Step 5: Configure Nginx

1.  **Remove default config (if it exists):**
    ```bash
    rm /etc/nginx/sites-enabled/default
    ```
2.  **Create/Edit config:**
    ```bash
    nano /etc/nginx/sites-available/torn
    ```
3.  **Paste this configuration:**
    *(This handles your IP 76.13.108.157 correctly)*

    ```nginx
    server {
        listen 80;
        server_name 76.13.108.157;

        root /var/www/torn-space/client;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        # WebSocket Proxy
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
4.  **Save in Nano:** `Ctrl+X`, then `Y`, then `Enter`.
5.  **Enable Site & Restart:**
    ```bash
    ln -s /etc/nginx/sites-available/torn /etc/nginx/sites-enabled/ || true
    nginx -t
    systemctl restart nginx
    ```

## Step 6: Start Game Server with PM2

```bash
# Ensure you are in /var/www/torn-space
cd /var/www/torn-space

# Start the server on port 8080
pm2 start app.js --name "torn-server" -- 8080

# Save for auto-restart on reboot
pm2 save
pm2 startup
```

## Step 7: Play!

Visit `http://76.13.108.157` in your browser.

## Step 8: How to Verify Everything is Working

If something isn't working, run these commands on your VPS to check each part of the system.

### 1. Check if the Game Server is running
Run this command:
```bash
pm2 status
```
-   **Good:** You see `torn-server` with status `online`.
-   **Bad:** Status is `errored` or `stopped`.
    -   *Fix:* Run `pm2 logs` to see the error message.

### 2. Check if Nginx (Web Server) is running
Run this command:
```bash
systemctl status nginx
```
-   **Good:** You see `Active: active (running)` in green.
-   **Bad:** `Active: failed` or `inactive`.
    -   *Fix:* Run `nginx -t` to check for config errors, then `systemctl restart nginx`.

### 3. Check if MongoDB (Database) is running
Run this command:
```bash
systemctl status mongod
```
-   **Good:** `Active: active (running)`.
-   **Bad:** `failed` or `inactive`.
    -   *Fix:* Run `systemctl start mongod`.

### 4. Check if the Port is Open
Check if the game node process is actually listening on port 8080:
```bash
lsof -i :8080
```
*(You might need to install lsof first: `apt install lsof`)*
-   **Good:** You see a `node` process listed.
-   **Bad:** Empty output. The server isn't starting correctly. Check `pm2 logs`.

### 5. Check Browser Console
If the page loads but the game sticks:
1.  Press `F12` in your browser.
2.  Click the "Console" tab.
3.  Look for red errors.
    -   `Connection refused`: Server isn't running or Nginx isn't proxying correctly.
### 6. Fix "403 Forbidden" Error
If you see a white screen with "403 Forbidden":
1.  **It usually means the `client` folder is empty or missing.**
    Run the build command again:
    ```bash
    cd /var/www/torn-space
    npm run build:vps
    ```
2.  **Or permissions are wrong.**
    Run this command to fix ownership and permissions:
    ```bash
    chown -R www-data:www-data /var/www/torn-space
    chmod -R 755 /var/www/torn-space
    ```
3.  **Restart Nginx:**
    ```bash
    systemctl restart nginx
    ```
