$ErrorActionPreference = "Stop"
$workspacePath = Split-Path -Parent $PSScriptRoot
$runtimePath = Join-Path $workspacePath ".runtime"

foreach ($name in @("storefront", "admin", "api")) {
  $pidPath = Join-Path $runtimePath "$name.pid"
  if (-not (Test-Path -LiteralPath $pidPath)) { continue }
  $processId = [int](Get-Content -LiteralPath $pidPath -Raw)
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $processId
    Write-Host "$name stopped."
  }
  Remove-Item -LiteralPath $pidPath -Force
}
