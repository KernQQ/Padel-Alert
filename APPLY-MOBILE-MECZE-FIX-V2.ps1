$ErrorActionPreference = 'Stop'
$project = 'C:\PROJEKTY\Padel-Alert'
$jsx = Join-Path $project 'frontend\src\components\MyMatchesPanel.jsx'
$css = Join-Path $project 'frontend\src\styles\app.css'
$backup = Join-Path $project '_backup-mobile-mecze-fix-v2'

Write-Host '=== PadelAlert - MOBILE MECZE FIX V2 ===' -ForegroundColor Cyan
if (!(Test-Path $jsx) -or !(Test-Path $css)) { throw 'Nie znaleziono plikow frontendu w C:\PROJEKTY\Padel-Alert.' }

if (Test-Path $backup) { Remove-Item $backup -Recurse -Force }
New-Item -ItemType Directory -Path $backup | Out-Null
Copy-Item $jsx (Join-Path $backup 'MyMatchesPanel.jsx')
Copy-Item $css (Join-Path $backup 'app.css')

try {
  $text = Get-Content $jsx -Raw
  $old = '<span className="my-matches-count">{matches.length}</span>'
  $new = '{matches.length > 0 && <span className="my-matches-count">{matches.length}</span>}'
  if ($text.Contains($old)) {
    $text = $text.Replace($old, $new)
    Set-Content -Path $jsx -Value $text -Encoding UTF8
  } elseif (!$text.Contains($new)) {
    throw 'Nie znaleziono licznika meczow do poprawy.'
  }

  $cssText = Get-Content $css -Raw
  $marker = 'PADELALERT MOBILE MECZE FIX V2'
  if (!$cssText.Contains($marker)) {
    $addon = @'

/* PADELALERT MOBILE MECZE FIX V2 */
@media (max-width: 900px) {
  .my-matches-panel .section-heading {
    padding-top: 4px !important;
    overflow: visible !important;
  }

  .my-matches-panel .section-heading .section-kicker {
    display: block !important;
    line-height: 1.35 !important;
    padding-top: 1px !important;
    overflow: visible !important;
  }

  .my-matches-panel .my-matches-count {
    flex: 0 0 auto !important;
    align-self: flex-start !important;
    margin-top: 2px !important;
  }
}
'@
    Add-Content -Path $css -Value $addon -Encoding UTF8
  }

  Write-Host 'Buduje frontend...' -ForegroundColor Yellow
  Push-Location (Join-Path $project 'frontend')
  try { npm run build; if ($LASTEXITCODE -ne 0) { throw 'Build frontendu nie przeszedl.' } }
  finally { Pop-Location }

  Write-Host ''
  Write-Host 'BUILD OK. Poprawka gotowa.' -ForegroundColor Green
  $answer = Read-Host 'Wdrozyc teraz do GitHub? [T/N]'
  if ($answer -match '^[TtYy]$') {
    Push-Location $project
    try {
      git add frontend/src/components/MyMatchesPanel.jsx frontend/src/styles/app.css
      git commit -m 'Fix mobile My Matches header and zero counter'
      if ($LASTEXITCODE -ne 0) { Write-Host 'Brak nowych zmian do commita albo commit nie powiodl sie.' -ForegroundColor Yellow }
      git push origin main
      if ($LASTEXITCODE -ne 0) { throw 'Push do GitHub nie przeszedl.' }
    }
    finally { Pop-Location }
    Write-Host 'WDROZONE.' -ForegroundColor Green
  } else {
    Write-Host 'Zmiany zostaly lokalnie. GitHub nie zostal ruszony.' -ForegroundColor Yellow
  }
}
catch {
  Write-Host ('BLAD: ' + $_.Exception.Message) -ForegroundColor Red
  Write-Host 'Przywracam pliki sprzed poprawki...' -ForegroundColor Yellow
  if (Test-Path (Join-Path $backup 'MyMatchesPanel.jsx')) { Copy-Item (Join-Path $backup 'MyMatchesPanel.jsx') $jsx -Force }
  if (Test-Path (Join-Path $backup 'app.css')) { Copy-Item (Join-Path $backup 'app.css') $css -Force }
  throw
}
