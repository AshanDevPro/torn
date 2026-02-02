# Deploying Torn.Space to Hostinger VPS (IP Only)

This guide walks you through hosting your game on a Hostinger VPS using Ubuntu 22, specifically for setups without a domain name (using IP address).

## Prerequisites

-   Hostinger VPS with Ubuntu 22.04 installed.
-   Access to the VPS via SSH (Command Line).
-   Your VPS IP Address: `76.13.108.157` (from your request).

## Step 1: Connect to your VPS

Open your terminal (PowerShell, Command Prompt, or Terminal) and run:

```bash
ssh root@76.13.108.157
```

*Enter your VPS password when prompted.*

## Step 2: Install Required Software

Update your system and install Node.js (v16+), MongoDB, Nginx, and git.

```bash
# Update system
apt update && apt upgrade -y

# Install Curl and Git
apt install curl git -y

# Install Node.js (Version 16 or higher recommended)
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

# Install Nginx (Web Server)
apt install -y nginx
```

## Step 3: Set Up the Project

Clone your repository and install dependencies.

```bash
# Navigate to web root (optional, but good practice)
cd /var/www

# Clone your project (Replace with your actual repo URL if different)
# Assuming you are uploading files directly or using your git repo
# If uploading via SFTP, upload to /var/www/torn-space
mkdir -p torn-space
cd torn-space

# If using git:
# git clone <YOUR_REPO_URL> .

# Install Dependencies
npm install

# Install PM2 (Process Manager to keep game running)
npm install -g pm2
```

## Step 4: Build the Client for IP Hosting

This is the **most important step** for your setup. You must use the `build:vps` script we created.

```bash
npm run build:vps
```

This ensures the game connects to your IP address (`http://76.13.108.157`) instead of looking for `torn.space`.

## Step 5: Configure Nginx

Nginx will serve the game files and forward the game connection to your Node.js server.

1.  **Remove default config:**
    ```bash
    rm /etc/nginx/sites-enabled/default
    ```
2.  **Create new config:**
    ```bash
    nano /etc/nginx/sites-available/torn
    ```
3.  **Paste the following configuration:**
    *(Use right-click to paste in Nano)*

    ```nginx
    server {
        listen 80;
        server_name 76.13.108.157; # Your VPS IP

        root /var/www/torn-space/client; # Path to your 'client' folder
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        # Socket.IO / Game Server Proxy
        location /socket.io/ {
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header Host $http_host;
            proxy_set_header X-NginX-Proxy true;

            proxy_pass http://127.0.0.1:8080; # Ensure this port matches your server config
            proxy_redirect off;

            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
    ```
4.  **Save and Exit:** Press `Ctrl + X`, then `Y`, then `Enter`.
5.  **Enable the site:**
    ```bash
    ln -s /etc/nginx/sites-available/torn /etc/nginx/sites-enabled/
    ```
6.  **Test and Restart Nginx:**
    ```bash
    nginx -t
    systemctl restart nginx
    ```

## Step 6: Start the Game Server

Now start the backend server using PM2.

```bash
# Start the app (Ensure you are in /var/www/torn-space)
# Note: Ensure your server listens on port 8080 as configured in Nginx
pm2 start app.js --name "torn-server" -- 8080

# Save PM2 list so it restarts on reboot
pm2 save
pm2 startup
```

## Step 7: Final Check

1.  Open your browser.
2.  Go to `http://76.13.108.157`.
3.  You should see your game and be able to play!

## Troubleshooting

-   **Game doesn't load:** Check Nginx status (`systemctl status nginx`).
-   **"Server connection lost":** Check if Node app is running (`pm2 status`) and if port 8080 matches in `app.js` and Nginx config.
-   **Firewall:** Ensure Hostinger firewall allows ports 80 (HTTP) and 22 (SSH).
