<img src="https://torn.space/img/harrlogo.png">

<h3 align="center">A somewhat popular online space MMO.</h3>
<br>
<p align="center">
    <img src="https://img.shields.io/github/contributors/TornDotSpace/Torn?style=for-the-badge&color=ff1f44">
    <img src="https://img.shields.io/github/last-commit/TornDotSpace/Torn?style=for-the-badge&color=ff1f44">
    <img src="https://img.shields.io/github/languages/code-size/TornDotSpace/Torn?style=for-the-badge&color=ff1f44">
</p>

## Guide
* **Complete Guide** (VPS hosting, SSL, updates, troubleshooting, dev mode, local setup): `TORN_COMPLETE_GUIDE.md`

## Prerequisites
* Node.JS v14+
* NPM v7
* MongoDB
* Python 3.x (`pip install -r requirements.txt`)

## Local Development Setup
* Navigate to the directory you wish to put the repository in.
* Clone the repo.
```sh
git clone https://github.com/TornDotSpace/Torn
```
* Install Node.JS from [here](https://nodejs.org).
* Update NPM to v7
```sh
npm i -g npm
```
* For a full Windows walkthrough, use `LOCAL_SETUP_GUIDE.md`.
* Quick start:
```sh
./start_dev_server.sh # UNIX
.\devServer-win.ps1 # Windows PowerShell
```
* Navigate to `http://localhost:7301` in your browser, and you should be able to play.

## VPS note
If you are deploying this game to your own server, use `TORN_COMPLETE_GUIDE.md` and build the client with:

```sh
npm run build:vps
```

