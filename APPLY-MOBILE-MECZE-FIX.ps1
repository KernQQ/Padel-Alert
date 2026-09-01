$ErrorActionPreference = 'Stop'
$Project = 'C:\PROJEKTY\Padel-Alert'
$jsx = Join-Path $Project 'frontend\src\components\MyMatchesPanel.jsx'
$css = Join-Path $Project 'frontend\src\styles\app.css'
$backup = Join-Path $Project '_backup-mobile-mecze-fix'

Write-Host '=== PadelAlert - MOBILE MECZE FIX ===' -ForegroundColor Green
if (!(Test-Path $jsx) -or !(Test-Path $css)) { throw 'Nie znaleziono plikow projektu w C:\PROJEKTY\Padel-Alert' }

if (Test-Path $backup) { Remove-Item $backup -Recurse -Force }
New-Item -ItemType Directory -Path $backup | Out-Null
Copy-Item $jsx (Join-Path $backup 'MyMatchesPanel.jsx')
Copy-Item $css (Join-Path $backup 'app.css')

try {
  $content = Get-Content $jsx -Raw
  $old = '<span className="my-matches-count">{matches.length}</span>'
  $new = '{matches.length > 0 && (`r`n          <span className="my-matches-count">{matches.length}</span>`r`n        )}'
  if ($content.Contains($old)) {
    $content = $content.Replace($old, $new)
    Set-Content -Path $jsx -Value $content -Encoding UTF8
  } elseif (!$content.Contains('matches.length > 0 &&')) {
    throw 'Nie znaleziono licznika meczow do poprawienia.'
  }

  $marker = 'PADELALERT MOBILE MECZE FINAL FIX'
  $cssContent = Get-Content $css -Raw
  if (!$cssContent.Contains($marker)) {
    $patch = @'

/* PADELALERT MOBILE MECZE FINAL FIX */
@media (max-width: 520px) {
  .my-matches-panel .section-heading {
    display: flex !important;
    align-items: flex-start !important;
    justify-content: space-between !important;
    gap: 12px !important;
    padding-top: 3px !important;
    overflow: visible !important;
  }

  .my-matches-panel .section-heading > div {
    min-width: 0 !important;
    overflow: visible !important;
  }

  .my-matches-panel .section-kicker {
    display: block !important;
    margin: 0 0 7px !important;
    padding: 1px 0 0 !important;
    line-height: 1.25 !important;
    overflow: visible !important;
  }

  .my-matches-panel .section-heading h2 {
    margin-top: 0 !important;
  }

  .my-matches-count {
    flex: 0 0 auto !important;
    margin-top: 3px !important;
  }
}
'@
    Add-Content -Path $css -Value $patch -Encoding UTF8
  }

  Write-Host 'Buduje frontend...' -ForegroundColor Cyan
  Push-Location (Join-Path $Project 'frontend')
  try { npm run build; if ($LASTEXITCODE -ne 0) { throw 'Build frontendu nie przeszedl.' } }
  finally { Pop-Location }

  Write-Host ''
  Write-Host 'FIX OK. Poprawiono tylko mobilne Moje mecze.' -ForegroundColor Green
  $answer = Read-Host 'Wdrozyc teraz do GitHub? [T/N]'
  if ($answer -match '^[TtYy]') {
    Push-Location $Project
    try {
      git add frontend/src/components/MyMatchesPanel.jsx frontend/src/styles/app.css
      git commit -m 'Fix mobile My Matches header'
      if ($LASTEXITCODE -ne 0) { Write-Host 'Brak nowych zmian do commita lub commit nie powiodl sie.' -ForegroundColor Yellow }
      git push origin main
      if ($LASTEXITCODE -ne 0) { Write-Host 'Push nie przeszedl. Uruchom pozniej: git push origin main' -ForegroundColor Yellow }
    } finally { Pop-Location }
  }
} catch {
  Write-Host ('BLAD: ' + $_.Exception.Message) -ForegroundColor Red
  Write-Host 'Przywracam pliki sprzed poprawki...' -ForegroundColor Yellow
  Copy-Item (Join-Path $backup 'MyMatchesPanel.jsx') $jsx -Force
  Copy-Item (Join-Path $backup 'app.css') $css -Force
  exit 1
}
