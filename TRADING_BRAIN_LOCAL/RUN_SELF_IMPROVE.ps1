$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
if (Test-Path .\.venv\Scripts\Activate.ps1) { . .\.venv\Scripts\Activate.ps1 }
$env:PYTHONPATH = (Resolve-Path .).Path
Write-Host 'Long-horizon self-improve (400y validation). This can take a while…'
python -m ota.self_improve --years 400 --generations 12 --pop 8 --eval-years 80
Write-Host 'Done. See ota\data\champion_genome.json and self_improve_report.json'
