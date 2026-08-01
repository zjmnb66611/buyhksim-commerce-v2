param([switch]$SkipBuild)

$ErrorActionPreference = "Stop"
$workspacePath = Split-Path -Parent $PSScriptRoot
$runtimePath = Join-Path $workspacePath ".runtime"
$pnpmPath = (Get-Command pnpm.cmd -ErrorAction Stop).Source

if (-not $SkipBuild) {
  Push-Location $workspacePath
  try { & $pnpmPath build } finally { Pop-Location }
  if ($LASTEXITCODE -ne 0) { throw "Production build failed. Local preview was not started." }
}

New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null
$services = @(
  @{ Name = "storefront"; Port = 3100; Script = "preview:storefront" },
  @{ Name = "admin"; Port = 3101; Script = "preview:admin" },
  @{ Name = "api"; Port = 4000; Script = "preview:api" }
)

foreach ($service in $services) {
  if (Get-NetTCPConnection -LocalPort $service.Port -State Listen -ErrorAction SilentlyContinue) {
    Write-Host "$($service.Name) is already listening on port $($service.Port)."
    continue
  }
  $stdoutPath = Join-Path $runtimePath "$($service.Name).out.log"
  $stderrPath = Join-Path $runtimePath "$($service.Name).err.log"
  $process = Start-Process -FilePath $pnpmPath -ArgumentList @("run", $service.Script) -WorkingDirectory $workspacePath -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru
  Set-Content -LiteralPath (Join-Path $runtimePath "$($service.Name).pid") -Value $process.Id -Encoding ascii
  Write-Host "$($service.Name) is starting. PID=$($process.Id), port=$($service.Port)."
}

Write-Host "Storefront: http://127.0.0.1:3100"
Write-Host "Admin: http://127.0.0.1:3101"
Write-Host "API health: http://127.0.0.1:4000/api/v1/health"
