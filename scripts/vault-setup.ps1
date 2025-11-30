# BIZRA Vault Setup Script
# SEC-01.1: Vault/KMS Integration - Phase 1
# Enterprise Secrets Management Setup

Write-Host "🔐 BIZRA Genesis Node - Vault/KMS Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if Docker is running
try {
    $dockerResult = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker is not running. Please start Docker first." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Docker is not available. Please install and start Docker first." -ForegroundColor Red
    exit 1
}

Write-Host "🔄 Starting Vault development server..." -ForegroundColor Blue

# Start Vault using docker-compose
docker-compose -f docker-compose.vault.yml up -d vault

Write-Host "⏳ Waiting for Vault to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if Vault is healthy
$maxAttempts = 10
$attempt = 1
$vaultHealthy = $false

while ($attempt -le $maxAttempts) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8200/v1/sys/health" -Method Get -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Vault is healthy" -ForegroundColor Green
            $vaultHealthy = $true
            break
        }
    } catch {
        Write-Host "Attempt $attempt/$maxAttempts`: Vault not ready yet..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        $attempt++
    }
}

if (-not $vaultHealthy) {
    Write-Host "❌ Vault failed to start after $maxAttempts attempts" -ForegroundColor Red
    docker-compose -f docker-compose.vault.yml logs vault
    exit 1
}

# Run the setup container to configure policies and roles
Write-Host "🔧 Configuring Vault policies and roles..." -ForegroundColor Blue
docker-compose -f docker-compose.vault.yml up vault-setup

# Verify setup and store secrets
Write-Host "💾 Configuring test secrets..." -ForegroundColor Blue

$env:VAULT_TOKEN = "dev-root-token-bizra"
$env:VAULT_ADDR = "http://localhost:8200"

# Generate a random JWT secret
$jwtSecret = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# Store secrets using vault CLI (assume it's installed)
$testSecrets = @(
    @{Path="secret/bizra/database/url"; Value="postgresql://bizra_user@localhost:5432/bizra_db"},
    @{Path="secret/bizra/redis/url"; Value="redis://localhost:6379"},
    @{Path="secret/bizra/auth/jwt_secret"; Value=$jwtSecret},
    @{Path="secret/bizra/api_keys/openai"; Value="sk-placeholder-openai-key"},
    @{Path="secret/bizra/api_keys/anthropic"; Value="sk-ant-placeholder-anthropic-key"}
)

foreach ($secret in $testSecrets) {
    try {
        $null = vault kv put $secret.Path value="$($secret.Value)"
    } catch {
        Write-Host "Warning: Could not store secret at $($secret.Path): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "✅ Test secrets configured" -ForegroundColor Green

# List stored secrets
Write-Host "📋 Available secrets:" -ForegroundColor Blue
try {
    vault kv list secret/bizra/
} catch {
    Write-Host "Could not list secrets: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Vault/KMS Integration Complete!" -ForegroundColor Green
Write-Host "==================================="
Write-Host ""
Write-Host "Vault UI: http://localhost:8200" -ForegroundColor White
Write-Host "Token: dev-root-token-bizra" -ForegroundColor White
Write-Host ""
Write-Host "To start the BIZRA application with vault secrets:" -ForegroundColor White
Write-Host "cargo run --bin api_server" -ForegroundColor White
Write-Host ""
Write-Host "To stop vault:" -ForegroundColor White
Write-Host "docker-compose -f docker-compose.vault.yml down" -ForegroundColor White
Write-Host ""

# Create a test script
$testScript = @'
Write-Host "🧪 Testing Vault Integration..." -ForegroundColor Blue

$env:VAULT_ADDR = "http://localhost:8200"
$env:VAULT_TOKEN = "dev-root-token-bizra"

# Test basic connectivity
Write-Host "Testing vault connectivity..." -ForegroundColor Blue
vault status

# Test secrets retrieval
Write-Host "Testing secrets retrieval..." -ForegroundColor Blue
vault kv get secret/bizra/database/url
vault kv get secret/bizra/auth/jwt_secret

Write-Host "✅ Vault integration tests completed" -ForegroundColor Green
'@

$testScript | Out-File -FilePath "test-vault-integration.ps1" -Encoding UTF8

Write-Host "📋 Next Steps:" -ForegroundColor Green
Write-Host "1. Run 'cargo run --bin api_server' to test the application" -ForegroundColor White
Write-Host "2. Use '.\test-vault-integration.ps1' to verify secrets access" -ForegroundColor White
Write-Host "3. Check the application logs for vault integration success" -ForegroundColor White
Write-Host ""
Write-Host "💡 Pro tip: This secures the enterprise foundation for production deployment!" -ForegroundColor Yellow
