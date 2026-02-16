# Kill processes on port 8000 (backend) and 3000 (frontend)
# Run from repo root: .\restart-dev.ps1

foreach ($port in @(8000, 3000)) {
  $found = netstat -ano | findstr "LISTENING" | findstr ":$port "
  if ($found) {
    foreach ($line in $found) {
      $parts = ($line -replace '\s+', ' ').Trim().Split(' ')
      $pid = $parts[-1]
      if ($pid -match '^\d+$') {
        Write-Host "Killing PID $pid on port $port"
        taskkill /F /PID $pid 2>$null
      }
    }
  } else {
    Write-Host "Port $port is free"
  }
}
Write-Host "Done. Start backend and frontend in two terminals (see frontend/README.md)."
Write-Host "  Backend:  cd backend  then  python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
Write-Host "  Frontend: cd frontend then  npm run dev"
