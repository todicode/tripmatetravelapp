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

$javaExecutable = if ($javaHome) { Join-Path $javaHome 'bin/java.exe' } else { '' }
if (-not $javaExecutable -or -not (Test-Path -LiteralPath $javaExecutable)) {
    throw 'JDK 26 not found. Pass -JavaHome <JDK 26 path> or set BACKEND_JAVA_HOME.'
}

$javaVersion = & $javaExecutable -version 2>&1 | Out-String
if ($LASTEXITCODE -ne 0 -or $javaVersion -notmatch 'version "26(?:\.|"|\+)') {
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
