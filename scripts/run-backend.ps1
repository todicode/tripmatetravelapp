[CmdletBinding()]
param(
    [string] $JavaHome,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $MavenArguments
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $repoRoot 'backend'
$databaseEnvFile = Join-Path $repoRoot 'docs/database/.env.erd.local'
$frontendEnvFile = Join-Path $repoRoot 'frontend/.env.local'
$gmailEnvFile = Join-Path $repoRoot 'personal/gmail-smtp.env'
$defaultJavaHome = 'C:\Program Files\Eclipse Adoptium\jdk-26.0.2.1+1'
$javaHome = if ($JavaHome) { $JavaHome } elseif ($env:BACKEND_JAVA_HOME) {
    $env:BACKEND_JAVA_HOME
} elseif (Test-Path -LiteralPath (Join-Path $defaultJavaHome 'bin/java.exe')) {
    $defaultJavaHome
} else {
    $env:JAVA_HOME
}

function Read-EnvValue([string] $path, [string] $name) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing environment file: $path"
    }

    $line = Get-Content -LiteralPath $path | Where-Object { $_ -match "^$name=" } | Select-Object -First 1
    if (-not $line) {
        throw "Missing $name in $path"
    }

    $value = $line.Substring($name.Length + 1).Trim()
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "$name is empty in $path"
    }

    return $value
}

# Load local port here; email settings are applied below before startup.
$backendEnvFile = Join-Path $backendRoot '.env'
if (Test-Path -LiteralPath $backendEnvFile) {
    $portLine = Get-Content -LiteralPath $backendEnvFile | Where-Object { $_ -match '^\s*SERVER_PORT\s*=' } | Select-Object -First 1
    if ($portLine) {
        $portValue = ($portLine -split '=', 2)[1].Trim().Trim('"').Trim("'")
        $serverPort = 0
        if (-not [int]::TryParse($portValue, [ref] $serverPort) -or $serverPort -lt 1 -or $serverPort -gt 65535) {
            throw 'SERVER_PORT in backend/.env must be an integer between 1 and 65535.'
        }
        $env:SERVER_PORT = [string] $serverPort
    }
}

$javaExecutable = if ($javaHome) { Join-Path $javaHome 'bin/java.exe' } else { '' }
if (-not $javaExecutable -or -not (Test-Path -LiteralPath $javaExecutable)) {
    throw 'JDK 26 not found. Pass -JavaHome <JDK 26 path> or set BACKEND_JAVA_HOME.'
}

$javaVersion = & $javaExecutable --version | Out-String
if ($LASTEXITCODE -ne 0 -or $javaVersion -notmatch '(?m)^(?:openjdk|java) 26(?:\.|\s|\+|$)') {
    throw "Backend requires JDK 26. Selected: $javaHome"
}

$mavenWrapper = Join-Path $backendRoot 'mvnw.cmd'
if (-not (Test-Path -LiteralPath $mavenWrapper)) {
    throw "Maven wrapper was not found at $mavenWrapper"
}

$dbPassword = Read-EnvValue $databaseEnvFile 'TRIPMATE_DB_PASSWORD'
$googleWebClientId = Read-EnvValue $frontendEnvFile 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'

$env:JAVA_HOME = $javaHome
$env:Path = "$javaHome\bin;$env:Path"
$env:DATABASE_URL = 'jdbc:postgresql://127.0.0.1:55432/tripmate_auth'
$env:DATABASE_USERNAME = 'tripmate'
$env:DATABASE_PASSWORD = $dbPassword
$env:GOOGLE_WEB_CLIENT_ID = $googleWebClientId
$localEmailSettings = @{}
if (Test-Path -LiteralPath $backendEnvFile) {
    foreach ($line in Get-Content -LiteralPath $backendEnvFile) {
        if ($line -match '^\s*(EMAIL_MODE|MAIL_HOST|MAIL_PORT|MAIL_USERNAME|MAIL_PASSWORD|MAIL_FROM)\s*=(.*)$') {
            $name = $Matches[1]
            $value = $Matches[2].Trim()
            if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            $localEmailSettings[$name] = $value
        }
    }
}

if ($localEmailSettings.Count -gt 0) {
    if (-not $localEmailSettings.ContainsKey('EMAIL_MODE') -or $localEmailSettings['EMAIL_MODE'] -notin @('log', 'smtp')) {
        throw 'Set EMAIL_MODE to log or smtp in backend/.env.'
    }
    if ($localEmailSettings['EMAIL_MODE'] -eq 'smtp') {
        foreach ($name in @('MAIL_HOST', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_FROM')) {
            if ([string]::IsNullOrWhiteSpace($localEmailSettings[$name])) {
                throw "Set $name in backend/.env to enable SMTP, or use EMAIL_MODE=log."
            }
        }
        $mailPort = 0
        if (-not [int]::TryParse($localEmailSettings['MAIL_PORT'], [ref] $mailPort) -or $mailPort -lt 1 -or $mailPort -gt 65535) {
            throw 'MAIL_PORT in backend/.env must be an integer between 1 and 65535.'
        }
    }
    foreach ($name in $localEmailSettings.Keys) {
        [Environment]::SetEnvironmentVariable($name, $localEmailSettings[$name], 'Process')
    }
    Write-Host "Email configuration loaded from backend/.env (mode: $env:EMAIL_MODE)." -ForegroundColor Cyan
} elseif (Test-Path -LiteralPath $gmailEnvFile) {
    $gmailAddress = Read-EnvValue $gmailEnvFile 'MAIL_USERNAME'
    $env:MAIL_PASSWORD = Read-EnvValue $gmailEnvFile 'MAIL_PASSWORD'
    $env:EMAIL_MODE = 'smtp'
    $env:MAIL_HOST = 'smtp.gmail.com'
    $env:MAIL_PORT = '587'
    $env:MAIL_USERNAME = $gmailAddress
    $env:MAIL_FROM = $gmailAddress
    Write-Host "Gmail SMTP enabled for $gmailAddress" -ForegroundColor Cyan
}

Write-Host "Using JDK: $javaHome" -ForegroundColor Cyan
Write-Host 'Starting local PostgreSQL...' -ForegroundColor Cyan
& docker compose `
    --env-file $databaseEnvFile `
    -f (Join-Path $repoRoot 'docs/database/compose.auth.yml') `
    up -d --wait

if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose failed with exit code $LASTEXITCODE"
}

if (-not $MavenArguments -or $MavenArguments.Count -eq 0) {
    $MavenArguments = @('clean', 'spring-boot:run')
}

Write-Host "Starting backend with: $($MavenArguments -join ' ')" -ForegroundColor Green
Push-Location $backendRoot
try {
    & $mavenWrapper @MavenArguments
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
