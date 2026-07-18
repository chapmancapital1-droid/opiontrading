$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
if (Test-Path .\.venv\Scripts\Activate.ps1) { . .\.venv\Scripts\Activate.ps1 }
$env:PYTHONPATH = (Resolve-Path .).Path
python -m ota
