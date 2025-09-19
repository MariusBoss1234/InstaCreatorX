Param(
  [string]$OpenAiKey,
  [string]$OpenRouterKey,
  [string]$Port
)

$envPath = Join-Path -Path $PSScriptRoot -ChildPath "..\.env"

if (!(Test-Path $envPath)) {
  New-Item -ItemType File -Path $envPath -Force | Out-Null
}

$lines = @()
if ($OpenAiKey) { $lines += "OPENAI_API_KEY=$OpenAiKey" }
if ($OpenRouterKey) { $lines += "OPENROUTER_API_KEY=$OpenRouterKey" }
if ($Port) { $lines += "PORT=$Port" }

if ($lines.Count -gt 0) {
  foreach ($line in $lines) {
    $key = ($line -split '=')[0]
    $content = Get-Content $envPath -ErrorAction SilentlyContinue
    if ($content -match "^$key=") {
      (Get-Content $envPath) |
        ForEach-Object { if ($_ -match "^$key=") { $line } else { $_ } } |
        Set-Content $envPath
    } else {
      Add-Content -Path $envPath -Value $line
    }
  }
  Write-Host ".env updated at $envPath"
} else {
  Write-Host "No values provided. Use -OpenAiKey and -OpenRouterKey parameters."
}
