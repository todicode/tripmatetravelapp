[CmdletBinding()]
param(
    [string] $Email = 'tripmate.opt@gmail.com',
    [switch] $Replace
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if ($Email -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') {
    throw 'Enter a valid Gmail sender address with -Email.'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$personalDirectory = Join-Path $repoRoot 'personal'
$smtpEnvFile = Join-Path $personalDirectory 'gmail-smtp.env'
if ((Test-Path -LiteralPath $smtpEnvFile) -and -not $Replace) {
    Write-Host "Gmail SMTP is already configured at $smtpEnvFile. Use -Replace to change it." -ForegroundColor Yellow
    exit 0
}

$securePassword = Read-Host 'Paste the 16-character Gmail App Password' -AsSecureString
$password = ([System.Net.NetworkCredential]::new('', $securePassword).Password -replace '\s', '')
if ($password.Length -ne 16 -or $password -notmatch '^[A-Za-z0-9]+$') {
    throw 'The Gmail App Password must contain 16 letters/digits (spaces are ignored).'
}

if (-not (Test-Path -LiteralPath $personalDirectory)) {
    New-Item -ItemType Directory -Path $personalDirectory | Out-Null
}

Set-Content -LiteralPath $smtpEnvFile -Encoding UTF8 -Value @(
    "MAIL_USERNAME=$Email"
    "MAIL_PASSWORD=$password"
)
$password = $null
Write-Host "Gmail SMTP configured for $Email in ignored local file $smtpEnvFile." -ForegroundColor Green
Write-Host 'Next: run .\scripts\run-backend.ps1. The App Password will load automatically.'
