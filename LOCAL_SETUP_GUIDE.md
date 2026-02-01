# Local Game Setup Guide

Follow these steps to host and play the game locally on your Windows machine.

## Prerequisites

Before starting, ensure you have the following installed on your computer. These are required for the game to run.

1.  **Node.js (v14 or higher)**
    *   [Download Node.js](https://nodejs.org/)
    *   *Why?* Required to run the game client and web server.

2.  **MongoDB (Community Server)**
    *   [Download MongoDB](https://www.mongodb.com/try/download/community)
    *   *Important:* During installation, ensure you select "Run as Network Service User" (default) and check the box that says "Install MongoDB as a Service".
    *   *System PATH:* You likely need to add the MongoDB `bin` folder to your System PATH variables so the `mongod` command works in PowerShell.
        *   Standard path to add: `C:\Program Files\MongoDB\Server\7.0\bin` (version number may vary).

3.  **Python 3**
    *   [Download Python](https://www.python.org/)
    *   *Important:* Check the box **"Add Python to PATH"** in the installer.

---

## Step 1: Install Python Dependencies

1.  Open the project folder (`Torn-master`) in File Explorer.
2.  Right-click in the empty space and select **"Open in Terminal"** or open **PowerShell** and navigate to this folder.
3.  Run the following command to install the required Python libraries:

    ```powershell
    pip install -r requirements.txt
    ```

---

## Step 2: Run the Game

The project includes an automatic script to start the database, login server, and game server all at once.

1.  In the same **PowerShell** window inside the project folder, run:

    ```powershell
    .\devServer-win.ps1
    ```

    *   *Note:* If you get a security error running scripts, run this command first: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`, then try again.

2.  Wait for the script to initialize. You will see several windows or logs starting up. It is downloading Node.js dependencies and building the client.

---

## Step 3: Play

Once the script says "Ready" or "Done" and indicates the server is running:

1.  Open your web browser (Chrome, Firefox, etc.).
2.  Navigate to: **http://localhost:7301**

You should now see the game running locally!

---

## How to Stop

To stop the servers, go back to the PowerShell window where you ran the script and press **Enter**.
