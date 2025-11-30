param (
    [string]$ApiBase = "http://localhost:3000"
)

$ErrorActionPreference = "Continue"

Write-Host "🧪 GENESIS 100 SMOKE TEST" -ForegroundColor Cyan
Write-Host "Target: $ApiBase" -ForegroundColor Gray

function Test-Endpoint {
    param ($Url, $Name)
    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $Name : PASS" -ForegroundColor Green
        }
        else {
            Write-Host "❌ $Name : FAIL ($($response.StatusCode))" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "❌ $Name : FAIL ($($_.Exception.Message))" -ForegroundColor Red
    }
}

Test-Endpoint "$ApiBase/health" "Health Check"
Test-Endpoint "$ApiBase/ready" "Readiness Probe"
Test-Endpoint "$ApiBase/api/agents/status" "Agents Status"

# Metrics (might be 401 if protected, checking connectivity)
try {
    $metrics = Invoke-WebRequest -Uri "$ApiBase/metrics" -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($metrics.StatusCode -eq 200) {
        Write-Host "✅ Metrics : PASS" -ForegroundColor Green
    }
    elseif ($metrics.StatusCode -eq 401) {
        Write-Host "✅ Metrics : PASS (Protected)" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️ Metrics : WARN ($($metrics.StatusCode))" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ Metrics : FAIL" -ForegroundColor Red
}

Write-Host "`nSmoke Test Complete." -ForegroundColor Cyan
