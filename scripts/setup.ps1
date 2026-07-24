# OptionScope local install (Windows PowerShell)
# From repo root after clone:
#   powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
# Or simply:
#   npm run setup

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
node scripts/setup.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
