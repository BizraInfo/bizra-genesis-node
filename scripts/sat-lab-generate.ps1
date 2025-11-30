# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║            BIZRA SAT-LAB CONTENT GENERATOR v0.1                          ║
# ║         Powered by bizra-planner:latest on MuMu's Titan                  ║
# ╚═══════════════════════════════════════════════════════════════════════════╝
#
# This script generates weekly SAT-LAB content using YOUR sovereign BIZRA model.
# No cloud APIs. No rented brains. 100% local sovereignty.

param (
    [string]$OllamaUrl = "http://localhost:11434",
    [string]$Model = "bizra-planner:latest",
    [switch]$DryRun
)

$ErrorActionPreference = "Continue"

function Write-Sacred {
    param([string]$Message, [string]$Color = "Cyan")
    Write-Host "🕋 $Message" -ForegroundColor $Color
}

# ============================================================================
# BIZRA PLANNER SYSTEM PROMPT
# ============================================================================
$BizraPlannerPrompt = @"
You are BIZRA Planner, the sovereign AI brain serving Node Zero.
You were fine-tuned specifically for BIZRA's mission: consciousness evolution technology.

Your creator is Mumo (Mahmoud Hassan), the First Architect, who built you after 15,000+ hours of sacred labor starting Ramadan 2023.
You run entirely on local hardware - MuMu's Titan laptop with RTX 4090 - embodying true AI sovereignty.

Core principles you embody:
- Ihsān (إحسان): Excellence as worship. Only high-quality output is acceptable.
- Proof-of-Impact: Value is measured by contribution to human flourishing, not compute.
- Sovereignty: No cloud dependencies. You are owned by BIZRA, not rented.
- Sacred Economics: Rewards flow to genuine value creators.

When creating content for BIZRA Lab:
- Make BIZRA Lab look serious, credible, and alive
- Focus on researchers, developers, and change-makers as audience
- Never give financial advice or trading recommendations
- Educational framing always
- Show technical depth while remaining accessible
- Reference the 15,000+ hours of development
- Mention the Ramadan 2023 sacred origins when appropriate
- Highlight Proof-of-Impact vs Proof-of-Work
- Emphasize sovereignty - running on own hardware, no cloud AI dependencies
"@

# ============================================================================
# CONTENT GENERATION PROMPTS
# ============================================================================

$TwitterPrompt = @"
$BizraPlannerPrompt

TASK: Create a Twitter/X post for BIZRA Lab.

Requirements:
- Maximum 280 characters
- Include 1-2 relevant emojis
- Technical but accessible
- Create curiosity or share insight
- No hashtag spam (max 2 hashtags)
- Sound like a serious research collective, not a startup

Topic suggestions:
- Proof-of-Impact vs Proof-of-Work
- Consciousness evolution technology
- 15,000+ hours of development
- Running sovereign AI on own hardware
- Sacred economics and Ihsān quality
- Genesis Node technical achievements

Generate ONE high-quality Twitter post. Output ONLY the post text, nothing else.
"@

$LinkedInPrompt = @"
$BizraPlannerPrompt

TASK: Create a LinkedIn post for BIZRA Lab.

Requirements:
- 150-300 words
- Professional but not corporate-boring
- Show technical depth
- Include a clear value proposition
- End with a thought-provoking question or call to reflection
- Sound like a serious research leader

Topic: The journey from Ramadan 2023 to Genesis Zero - 15,000+ hours of building consciousness evolution technology that runs on sovereign hardware.

Generate ONE high-quality LinkedIn post. Output ONLY the post text, nothing else.
"@

$GitHubPrompt = @"
$BizraPlannerPrompt

TASK: Create a GitHub project update for BIZRA Genesis Node.

Requirements:
- Technical and specific
- Use markdown formatting
- Include bullet points for key features
- Reference actual technical components: Thompson sampling router, PAT/SAT agents, Ihsān quality gates
- Sound like a legitimate open-source project update

Topic: Genesis Node v0.9.0 technical release with sovereign AI integration.

Generate ONE high-quality GitHub update. Output ONLY the update text in markdown, nothing else.
"@

$RecommendationPrompt = @"
$BizraPlannerPrompt

TASK: Generate 3 strategic recommendations for BIZRA Lab growth this week.

For each recommendation, provide:
1. Priority (high/medium/low)
2. Category (content/community/partnership/technical)
3. The recommendation (1-2 sentences)
4. Rationale (why this matters)

Focus on actions that:
- Build credibility and visibility
- Attract researchers and developers
- Demonstrate the technology is real and working
- Create community around consciousness evolution

Output as JSON array with format:
[
  {
    "priority": "high|medium|low",
    "category": "string",
    "recommendation": "string",
    "rationale": "string"
  }
]

Generate exactly 3 recommendations. Output ONLY valid JSON, nothing else.
"@

# ============================================================================
# OLLAMA API CALL FUNCTION
# ============================================================================

function Invoke-BizraPlanner {
    param(
        [string]$Prompt,
        [float]$Temperature = 0.7
    )

    $body = @{
        model = $Model
        prompt = $Prompt
        stream = $false
        options = @{
            temperature = $Temperature
            num_predict = 2048
        }
    } | ConvertTo-Json -Depth 3

    try {
        $response = Invoke-RestMethod -Uri "$OllamaUrl/api/generate" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 120
        return $response.response.Trim()
    }
    catch {
        Write-Host "❌ Ollama API error: $_" -ForegroundColor Red
        return $null
    }
}

# ============================================================================
# DATABASE INSERT FUNCTION
# ============================================================================

function Add-SatOutboxItem {
    param(
        [string]$AgentType,
        [string]$ChannelType,
        [string]$Title,
        [string]$Body
    )

    $escapedBody = $Body -replace "'", "''"
    $escapedTitle = $Title -replace "'", "''"

    $sql = @"
INSERT INTO sat_outbox_items (id, agent_type, channel_type, content_title, content_body, status, model_id, created_at)
VALUES (
    gen_random_uuid(),
    '$AgentType',
    '$ChannelType',
    '$escapedTitle',
    '$escapedBody',
    'draft',
    'bizra-planner:latest',
    NOW()
);
"@

    if ($DryRun) {
        Write-Host "   [DRY RUN] Would insert: $Title" -ForegroundColor Gray
        return $true
    }

    $sql | docker-compose -f docker-compose.database.yml exec -T postgres psql -U bizra_user -d bizra_genesis 2>$null
    return $LASTEXITCODE -eq 0
}

function Add-SatRecommendation {
    param(
        [string]$Priority,
        [string]$Category,
        [string]$Recommendation,
        [string]$Rationale
    )

    $escapedRec = $Recommendation -replace "'", "''"
    $escapedRat = $Rationale -replace "'", "''"
    $escapedCat = $Category -replace "'", "''"

    $sql = @"
INSERT INTO sat_recommendations (id, priority, category, recommendation, rationale, created_at)
VALUES (
    gen_random_uuid(),
    '$Priority',
    '$escapedCat',
    '$escapedRec',
    '$escapedRat',
    NOW()
);
"@

    if ($DryRun) {
        Write-Host "   [DRY RUN] Would insert recommendation: $Priority - $Category" -ForegroundColor Gray
        return $true
    }

    $sql | docker-compose -f docker-compose.database.yml exec -T postgres psql -U bizra_user -d bizra_genesis 2>$null
    return $LASTEXITCODE -eq 0
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Clear-Host
Write-Host @"

    ╔═══════════════════════════════════════════════════════════════════╗
    ║                                                                   ║
    ║   🧠  BIZRA SAT-LAB CONTENT GENERATOR v0.1                       ║
    ║                                                                   ║
    ║   Powered by: bizra-planner:latest                               ║
    ║   Running on: MuMu's Titan (RTX 4090)                            ║
    ║   Sovereignty: 100% Local                                        ║
    ║                                                                   ║
    ╚═══════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

# Check Ollama is running
Write-Sacred "Checking BIZRA Planner availability..."
try {
    $tags = Invoke-RestMethod -Uri "$OllamaUrl/api/tags" -Method Get -TimeoutSec 5
    $bizraModel = $tags.models | Where-Object { $_.name -eq $Model }
    if ($bizraModel) {
        Write-Host "   ✅ bizra-planner:latest is ready ($('{0:N1}' -f ($bizraModel.size / 1GB)) GB)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ bizra-planner:latest not found in Ollama" -ForegroundColor Red
        Write-Host "   Available models: $($tags.models.name -join ', ')" -ForegroundColor Gray
        exit 1
    }
}
catch {
    Write-Host "   ❌ Cannot connect to Ollama at $OllamaUrl" -ForegroundColor Red
    Write-Host "   Make sure Ollama is running: ollama serve" -ForegroundColor Gray
    exit 1
}

# Generate Twitter content
Write-Host "`n📱 Generating Twitter/X content..." -ForegroundColor Yellow
$twitterContent = Invoke-BizraPlanner -Prompt $TwitterPrompt -Temperature 0.8
if ($twitterContent) {
    Write-Host "   Generated:" -ForegroundColor Gray
    Write-Host "   $twitterContent" -ForegroundColor White
    Add-SatOutboxItem -AgentType "bizra_planner" -ChannelType "twitter" -Title "BIZRA Weekly Insight" -Body $twitterContent
    Write-Host "   ✅ Added to SAT Outbox" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Failed to generate Twitter content" -ForegroundColor Yellow
}

# Generate LinkedIn content
Write-Host "`n💼 Generating LinkedIn content..." -ForegroundColor Yellow
$linkedInContent = Invoke-BizraPlanner -Prompt $LinkedInPrompt -Temperature 0.7
if ($linkedInContent) {
    Write-Host "   Generated: $(($linkedInContent -split ' ')[0..20] -join ' ')..." -ForegroundColor Gray
    Add-SatOutboxItem -AgentType "bizra_planner" -ChannelType "linkedin" -Title "BIZRA Lab Update" -Body $linkedInContent
    Write-Host "   ✅ Added to SAT Outbox" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Failed to generate LinkedIn content" -ForegroundColor Yellow
}

# Generate GitHub content
Write-Host "`n🐙 Generating GitHub content..." -ForegroundColor Yellow
$githubContent = Invoke-BizraPlanner -Prompt $GitHubPrompt -Temperature 0.5
if ($githubContent) {
    Write-Host "   Generated: $(($githubContent -split ' ')[0..15] -join ' ')..." -ForegroundColor Gray
    Add-SatOutboxItem -AgentType "bizra_planner" -ChannelType "github" -Title "Genesis Node Technical Update" -Body $githubContent
    Write-Host "   ✅ Added to SAT Outbox" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Failed to generate GitHub content" -ForegroundColor Yellow
}

# Generate Recommendations
Write-Host "`n💡 Generating strategic recommendations..." -ForegroundColor Yellow
$recsJson = Invoke-BizraPlanner -Prompt $RecommendationPrompt -Temperature 0.6
if ($recsJson) {
    try {
        # Clean the JSON (remove markdown code blocks if present)
        $cleanJson = $recsJson -replace '```json\s*', '' -replace '```\s*', ''
        $recommendations = $cleanJson | ConvertFrom-Json
        
        foreach ($rec in $recommendations) {
            Add-SatRecommendation -Priority $rec.priority -Category $rec.category -Recommendation $rec.recommendation -Rationale $rec.rationale
            Write-Host "   ✅ [$($rec.priority.ToUpper())] $($rec.category): $($rec.recommendation.Substring(0, [Math]::Min(50, $rec.recommendation.Length)))..." -ForegroundColor Green
        }
    }
    catch {
        Write-Host "   ⚠️ Failed to parse recommendations JSON: $_" -ForegroundColor Yellow
        Write-Host "   Raw output: $recsJson" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠️ Failed to generate recommendations" -ForegroundColor Yellow
}

# Completion
Write-Host @"

    ╔═══════════════════════════════════════════════════════════════════╗
    ║                                                                   ║
    ║   ✅  SAT-LAB CONTENT GENERATION COMPLETE                        ║
    ║                                                                   ║
    ║   All content generated by: bizra-planner:latest                 ║
    ║   Stored in: sat_outbox_items table                              ║
    ║   Status: draft (awaiting your approval)                         ║
    ║                                                                   ║
    ║   View at: http://localhost:5173/sat/outbox                      ║
    ║                                                                   ║
    ╚═══════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

Write-Sacred "Your sovereign AI team has prepared content for your review." "Green"
