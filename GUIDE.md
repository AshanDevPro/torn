# Torn.Space - Setup Guide

This guide covers how to set up the game **Locally** (for development/playing on your own PC) and **Online** (deploying to a server).

---

## 💻 1. Local Setup (Windows)

### Prerequisites
Before you start, make sure you have installed:
1. **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
2. **MongoDB** (Community Server) - [Download](https://www.mongodb.com/try/download/community)
3. **Python 3** - [Download](https://www.python.org/)

### Installation Steps

1. **Install Python Dependencies**
   Open a terminal in the project folder and run:
   ```powershell
   pip install -r requirements.txt
   ```

2. **Install Node.js Dependencies**
   ```powershell
   npm install
   ```

3. **Setup Client File**
   If `client/index.html` does not exist, copy it from the template:
   ```powershell
   copy client/index.html.template client/index.html
   ```

### Running the Game
You need to run **three** separate components. Open **3 separate terminal windows** inside the project folder:

**Terminal 1: Account Server**
Handles user logins.
```powershell
python account/account_server.py
```

**Terminal 2: Game Server**
The main game logic.
```powershell
node --use_strict app.js 7300 dev
```
*(Make sure MongoDB is running in the background. If not, start it with `mongod`)*.

**Terminal 3: Client Server**
Serves the web page.
```powershell
npm run dev:serve
```

### How to Play
Open your browser and navigate to:
👉 **http://localhost:7301**

---

## ☁️ 2. Online Deployment (Linux / VPS)

To host the game online so others can play, you need a Virtual Private Server (VPS) running Linux (e.g., Ubuntu).

### Server Prerequisites
Run the following on your server to install required tools:
```bash
sudo apt update
sudo apt install nodejs npm mongodb python3 python3-pip nginx git
pip3 install -r requirements.txt
```

### Deployment Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/YourUsername/Torn-master.git
   cd Torn-master
   ```

2. **Install & Build**
   ```bash
   npm ci
   npm run build
   ```
   *This compiles the game into the `client/` folder.*

3. **Process Manager (PM2)**
   Use PM2 to keep your server running 24/7.
   ```bash
   npm install -g pm2
   pm2 start account/account_server.py --interpreter python3 --name "torn-account"
   pm2 start app.js --name "torn-game" -- 7300 prod
   pm2 save
   ```

4. **Nginx Configuration (Reverse Proxy)**
   Edit your Nginx config (`/etc/nginx/sites-available/default`) to serve the game files and proxy the WebSocket connection.

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       root /path/to/Torn-master/client;
       index index.html;

       # Serve static files (Game Client)
       location / {
           try_files $uri $uri/ =404;
       }

       # Proxy WebSocket connections to Game Server
       location /socket.io/ {
           proxy_pass http://localhost:7300;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
       }
       
       # Proxy Account Server (if needed by client directly)
       location /api/ {
           proxy_pass http://localhost:8080;
       }
   }
   ```

5. **Restart Nginx**
   ```bash
   sudo systemctl restart nginx
   ```

### Verify
Visit `http://your-domain.com` in your browser.
