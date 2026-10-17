param([string]$JavaHome = $env:JAVA_HOME, [string]$Tests)

$ErrorActionPreference = 'Stop'
if (-not $JavaHome) { $JavaHome = 'C:\Program Files\Java\jdk-26.0.2.1' }
if (-not (Test-Path -LiteralPath (Join-Path $JavaHome 'bin\java.exe'))) { throw 'Pass -JavaHome with a Java 26 JDK directory.' }
docker info --format '{{.ServerVersion}}'
if ($LASTEXITCODE -ne 0) { throw 'Start Docker Desktop before running these tests.' }

$suffix = [Guid]::NewGuid().ToString('N').Substring(0, 10)
$mainName = "tripmate-trip-tests-$suffix"
$profileName = "tripmate-profile-tests-$suffix"
$password = [Guid]::NewGuid().ToString('N')
$variables = @('JAVA_HOME', 'JAVA_TOOL_OPTIONS', 'GROUP_TEST_DATABASE_URL', 'GROUP_TEST_DATABASE_PASSWORD',
    'SOCIAL_TEST_DATABASE_URL', 'SOCIAL_TEST_DATABASE_PASSWORD', 'MESSAGING_TEST_DATABASE_URL',
    'MESSAGING_TEST_DATABASE_PASSWORD', 'PROFILE_TEST_DATABASE_URL', 'PROFILE_TEST_DATABASE_PASSWORD')
$previous = @{}
foreach ($name in $variables) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$created = @()

function Wait-Database([string]$container, [string]$user) {
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        docker exec $container pg_isready -U $user *> $null
        if ($LASTEXITCODE -eq 0) { return }
        Start-Sleep -Milliseconds 500
    }
    throw "Test PostgreSQL did not start: $container"
}

Push-Location (Join-Path $PSScriptRoot '..\backend')
try {
    $containerId = docker run --detach --rm --name $mainName -e POSTGRES_USER=tripmate -e "POSTGRES_PASSWORD=$password" -e POSTGRES_DB=tripmate_group_test -p '127.0.0.1::5432' postgres:17
    if ($LASTEXITCODE -ne 0) { throw 'Cannot create test PostgreSQL.' }
    $created += $containerId.Trim()
    $containerId = docker run --detach --rm --name $profileName -e "POSTGRES_PASSWORD=$password" -e POSTGRES_DB=tripmate_profile_test -p '127.0.0.1::5432' postgres:17
    if ($LASTEXITCODE -ne 0) { throw 'Cannot create profile regression PostgreSQL.' }
    $created += $containerId.Trim()
    Wait-Database $mainName 'tripmate'
    Wait-Database $profileName 'postgres'
    foreach ($database in @('tripmate_social_test', 'tripmate_messaging_test')) {
        docker exec $mainName createdb -U tripmate $database
        if ($LASTEXITCODE -ne 0) { throw "Cannot create test database $database" }
    }
    $mainPort = (docker port $mainName 5432/tcp).Trim().Split(':')[-1]
    $profilePort = (docker port $profileName 5432/tcp).Trim().Split(':')[-1]
    $env:JAVA_HOME = $JavaHome
    $env:JAVA_TOOL_OPTIONS = "$($previous['JAVA_TOOL_OPTIONS']) -Duser.timezone=UTC".Trim()
    $env:GROUP_TEST_DATABASE_URL = "jdbc:postgresql://127.0.0.1:$mainPort/tripmate_group_test"
    $env:SOCIAL_TEST_DATABASE_URL = "jdbc:postgresql://127.0.0.1:$mainPort/tripmate_social_test"
    $env:MESSAGING_TEST_DATABASE_URL = "jdbc:postgresql://127.0.0.1:$mainPort/tripmate_messaging_test"
    $env:PROFILE_TEST_DATABASE_URL = "jdbc:postgresql://127.0.0.1:$profilePort/tripmate_profile_test"
    $env:GROUP_TEST_DATABASE_PASSWORD = $password
    $env:SOCIAL_TEST_DATABASE_PASSWORD = $password
    $env:MESSAGING_TEST_DATABASE_PASSWORD = $password
    $env:PROFILE_TEST_DATABASE_PASSWORD = $password
    # Windows PowerShell 5 wraps native stderr (including JVM notices) as error records.
    $ErrorActionPreference = 'Continue'
    $mavenArguments = @('clean', 'test')
    if ($Tests) { $mavenArguments += "-Dtest=$Tests" }
    & .\mvnw.cmd @mavenArguments
    $mavenExit = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($mavenExit -ne 0) { throw 'Backend regression tests failed. See backend/target/surefire-reports.' }
} finally {
    foreach ($containerId in $created) { docker rm --force $containerId | Out-Null }
    foreach ($name in $variables) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
    Pop-Location
}
