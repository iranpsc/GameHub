[CmdletBinding()]
param(
  [string]$TaskName = "WindowsLauncherAgent",
  [int]$Port = 5000,
  [string]$Host = "127.0.0.1"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Write-Host "Project root: $ProjectRoot"

$node = (Get-Command node -ErrorAction SilentlyContinue).Path
if (-not $node) { throw "Node.js not found on PATH. Please install Node.js from https://nodejs.org and re-run." }
$npm = (Get-Command npm -ErrorAction SilentlyContinue).Path
if (-not $npm) { throw "npm not found on PATH. Ensure Node.js installed with npm." }

Push-Location $ProjectRoot
try {
  if (Test-Path "package-lock.json") {
    & $npm ci
  } else {
    & $npm install
  }
} finally {
  Pop-Location
}

$envFile = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $envFile)) {
  Set-Content -Path $envFile -Value "PORT=$Port`nHOST=$Host" -Encoding UTF8
  Write-Host "Created .env with defaults"
}

$action = New-ScheduledTaskAction -Execute $node -Argument "`"$ProjectRoot\\src\\server.js`"" -WorkingDirectory $ProjectRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

try {
  $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  }
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings | Out-Null
  Write-Host "Registered scheduled task: $TaskName"
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "Started scheduled task."
} catch {
  throw $_
}