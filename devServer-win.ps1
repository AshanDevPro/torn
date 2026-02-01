$ErrorActionPreference = "Stop"

Write-Host "Starting mongod with journaling disabled on port 27017"
New-Item -ItemType Directory -Force -Path ".\db" | Out-Null
$procs = @()
$procs += Start-Process -FilePath "mongod" -ArgumentList "--port 27017 --dbpath .\db --nojournal --bind_ip localhost" -PassThru

Write-Host "Starting account server"
$procs += Start-Process -FilePath "python" -ArgumentList ".\account\account_server.py" -PassThru

Write-Host "Building client"
npm ci

Write-Host "Starting dev server"
$procs += Start-Process -FilePath "npm" -ArgumentList "run dev:serve" -PassThru

Copy-Item ".\client\index.html.template" ".\client\index.html" -Force

Write-Host "Starting shard-1 on port 7300"
$procs += Start-Process -FilePath "node" -ArgumentList "--use_strict app.js 7300 dev" -PassThru

Write-Host "Done. Browse to http://localhost:7301 to access the Torn dev server!"
Read-Host "Press Enter to stop all processes"

foreach ($p in $procs) {
    if ($p -and -not $p.HasExited) {
        Stop-Process -Id $p.Id -Force
    }
}
