# Used by share.bat: waits for the Cloudflare Quick Tunnel to get its link, then prints it in a box
# and copies it to the clipboard. cloudflared reports the link on its metrics server (/quicktunnel).
param([int]$MetricsPort = 20241, [int]$TimeoutSeconds = 90)

$hostname = $null
for ($i = 0; $i -lt $TimeoutSeconds -and -not $hostname; $i++) {
  Start-Sleep -Seconds 1
  try {
    $hostname = (Invoke-RestMethod "http://127.0.0.1:$MetricsPort/quicktunnel" -TimeoutSec 2).hostname
  } catch {
    # tunnel not up yet
  }
}

if (-not $hostname) {
  Write-Host ''
  Write-Host "  [!] Could not read the link. Open http://127.0.0.1:$MetricsPort/quicktunnel to see it." -ForegroundColor Yellow
  exit 1
}

$link = "https://$hostname"
try { Set-Clipboard -Value $link } catch { }

$line = '=' * ($link.Length + 8)
Write-Host ''
Write-Host "  $line" -ForegroundColor Green
Write-Host "      $link" -ForegroundColor Green
Write-Host "  $line" -ForegroundColor Green
Write-Host '  The link is copied to the clipboard. Send it and open it on your phone.'
Write-Host '  Sign in with email + password (the Google button is hidden in share mode).'
Write-Host '  Keep this window open while sharing. Press Ctrl+C or close the window to stop.'
Write-Host ''
