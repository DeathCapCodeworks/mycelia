# Project Mycelia Doctor - PowerShell Environment Health Check

param(
    [switch]$Help
)

if ($Help) {
    Write-Host "Project Mycelia Doctor - Environment Health Check" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\scripts\doctor.ps1"
    Write-Host ""
    Write-Host "Checks:"
    Write-Host "  - Node >= 20.14"
    Write-Host "  - Corepack enabled"
    Write-Host "  - pnpm available"
    Write-Host "  - Git available"
    Write-Host "  - Workspace structure"
    Write-Host ""
    Write-Host "Exit codes:"
    Write-Host "  0 - All checks passed"
    Write-Host "  1 - Issues found (see remediation)"
    exit 0
}

Write-Host "🔍 Project Mycelia Doctor - Environment Health Check" -ForegroundColor Cyan
Write-Host ""

$issues = @()

# Check Node version
try {
    $nodeVersion = node --version
    $nodeMajor = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    $nodeMinor = [int]($nodeVersion -replace 'v\d+\.(\d+)\..*', '$1')
    $nodeOk = $nodeMajor -ge 20 -and $nodeMinor -ge 14
    
    if ($nodeOk) {
        Write-Host "✓ Node: $nodeVersion (required: >=20.14)" -ForegroundColor Green
    } else {
        Write-Host "✗ Node: $nodeVersion (required: >=20.14)" -ForegroundColor Red
        $issues += "Upgrade Node to >=20.14. Current: $nodeVersion"
    }
} catch {
    Write-Host "✗ Node: not found" -ForegroundColor Red
    $issues += "Install Node.js from https://nodejs.org/"
}

# Check corepack
try {
    $corepackVersion = corepack --version
    Write-Host "✓ Corepack: $corepackVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Corepack: not found" -ForegroundColor Red
    $issues += "Enable corepack: corepack enable"
}

# Check pnpm
try {
    $pnpmVersion = pnpm --version
    Write-Host "✓ pnpm: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ pnpm: not found" -ForegroundColor Red
    $issues += "Install pnpm via corepack: corepack enable && pnpm --version"
}

# Check Git
try {
    $gitVersion = git --version
    Write-Host "✓ Git: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Git: not found" -ForegroundColor Red
    $issues += "Install Git from https://git-scm.com/"
}

# Check workspace structure
$hasPackageJson = Test-Path "package.json"
$hasPnpmWorkspace = Test-Path "pnpm-workspace.yaml"
$hasPackagesDir = Test-Path "packages"
$hasAppsDir = Test-Path "apps"

if ($hasPackageJson) {
    Write-Host "✓ package.json" -ForegroundColor Green
} else {
    Write-Host "✗ package.json" -ForegroundColor Red
    $issues += "Run this script from the repository root"
}

if ($hasPnpmWorkspace) {
    Write-Host "✓ pnpm-workspace.yaml" -ForegroundColor Green
} else {
    Write-Host "✗ pnpm-workspace.yaml" -ForegroundColor Red
    $issues += "Create pnpm-workspace.yaml with workspace configuration"
}

if ($hasPackagesDir) {
    Write-Host "✓ packages/ directory" -ForegroundColor Green
} else {
    Write-Host "✗ packages/ directory" -ForegroundColor Red
    $issues += "Create packages/ directory for workspace packages"
}

if ($hasAppsDir) {
    Write-Host "✓ apps/ directory" -ForegroundColor Green
} else {
    Write-Host "✗ apps/ directory" -ForegroundColor Red
    $issues += "Create apps/ directory for applications"
}

# Print remediation
if ($issues.Count -eq 0) {
    Write-Host ""
    Write-Host "All checks passed! Environment is ready." -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "Remediation needed:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $issues.Count; $i++) {
        Write-Host "$($i + 1). $($issues[$i])"
    }
    exit 1
}
