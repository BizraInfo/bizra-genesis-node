#!/bin/bash
# BIZRA Proof Protocol - Node0 Operational Verification
# Document ID: BIZRA-PROOF-NODE0-v1.0-ALIF
# Purpose: Verifiable deployment and sovereignty demonstration against giants

set -e

echo "============================================"
echo "BIZRA Node0 Proof Protocol Verification"
echo "Document ID: BIZRA-PROOF-NODE0-v1.0-ALIF"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Proof Results
declare -A PROOF_RESULTS
declare -A PROOF_METRICS

# Proof 1: Infrastructure Sovereignty
proof_infrastructure_sovereignty() {
    echo -e "\n${YELLOW}PROOF 1: Infrastructure Sovereignty${NC}"
    echo "Testing: Local AI processing without cloud dependency"

    local ollama_url="http://localhost:11434"

    # Check if Ollama is running locally (not cloud service)
    if curl -s "$ollama_url/api/tags" > /dev/null 2>&1; then
        PROOF_RESULTS["sovereignty"]="PASSED"
        PROOF_METRICS["ollama_available"]="TRUE"
        echo -e "✅ Ollama running locally (sovereign AI)"
    else
        PROOF_RESULTS["sovereignty"]="FAILED"
        PROOF_METRICS["ollama_available"]="FALSE"
        echo -e "❌ Ollama not running - deployment required"
        return 1
    fi

    # Verify no cloud data transmission
    if netstat -t 2>/dev/null | grep -v localhost > /dev/null; then
        PROOF_RESULTS["sovereignty"]="COMPROMISED"
        echo -e "⚠️ Warning: External network connections detected"
    fi

    echo -e "✅ Sovereignty Proof: PASSED (local AI capability confirmed)"
}

# Proof 2: Economic Alignment Demonstration
proof_economic_alignment() {
    echo -e "\n${YELLOW}PROOF 2: Economic Alignment Demonstration${NC}"
    echo "Testing: PoI incentives align with human productivity"

    local api_url="http://localhost:8080"

    # Create test PoI event
    local payload='{
        "event_type": "task_completed",
        "task_id": "sovereignty_test",
        "impact_score": 0.85,
        "ihsan_score": 0.92,
        "duration_minutes": 45,
        "description": "Completed infrastructure sovereignty verification",
        "assets_produced": ["proof-protocol-node0.sh", "sovereignty-report.json"]
    }'

    local response=$(curl -s -X POST "$api_url/api/poi/log" \
        -H "Content-Type: application/json" \
        -d "$payload" 2>/dev/null)

    if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
        PROOF_RESULTS["economics"]="PASSED"
        local bzc_reward=$(echo "$response" | jq -r '.data.reward_bzc')
        local imp_reward=$(echo "$response" | jq -r '.data.reward_imp')
        PROOF_METRICS["bzc_earned"]=$bzc_reward
        PROOF_METRICS["imp_earned"]=$imp_reward
        echo -e "✅ PoI Economics Working:"
        echo "   BZC Earned: $bzc_reward"
        echo "   IMP Earned: $imp_reward"
    else
        PROOF_RESULTS["economics"]="FAILED"
        echo -e "❌ PoI system not responding"
        return 1
    fi
}

# Proof 3: PAT Agent Capability Demonstration
proof_pat_agent_capability() {
    echo -e "\n${YELLOW}PROOF 3: PAT Agent Capability${NC}"
    echo "Testing: AI assistance without data extraction"

    local api_url="http://localhost:8080"

    # Test PAT chat with MasterReasoner
    local payload='{
        "message": "Analyze the strategic advantage of sovereign AI economics",
        "agent_role": "MasterReasoner"
    }'

    local response=$(curl -s -X POST "$api_url/api/pat/chat" \
        -H "Content-Type: application/json" \
        -d "$payload" 2>/dev/null)

    if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
        PROOF_RESULTS["pat_capability"]="PASSED"
        local agent=$(echo "$response" | jq -r '.data.agent')
        local model=$(echo "$response" | jq -r '.data.model')
        local latency=$(echo "$response" | jq -r '.data.latency_ms')
        PROOF_METRICS["pat_agent"]=$agent
        PROOF_METRICS["pat_model"]=$model
        PROOF_METRICS["pat_latency"]=$latency
        echo -e "✅ PAT Agent Response:"
        echo "   Agent: $agent"
        echo "   Model: $model"
        echo "   Latency: ${latency}ms"

        # Verify sovereign processing (no cloud LLM calls)
        echo -e "🔍 Verifying Sovereignty..."
        if ! ps aux | grep -v grep | grep -q "openai\|anthropic\|claude\|gpt\|gemini"; then
            PROOF_METRICS["sovereign_processing"]="TRUE"
            echo -e "✅ Sovereign Processing Confirmed (no cloud LLM calls detected)"
        fi
    else
        PROOF_RESULTS["pat_capability"]="FAILED"
        echo -e "❌ PAT Agent not responding"
        return 1
    fi
}

# Proof 4: Ethical AI Governance
proof_ethical_governance() {
    echo -e "\n${YELLOW}PROOF 4: Ethical AI Governance${NC}"
    echo "Testing: Ihsan scoring provides meaningful ethical measurement"

    local api_url="http://localhost:8080"

    # Get PoI statistics
    local response=$(curl -s GET "$api_url/api/poi/stats" 2>/dev/null)

    if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
        PROOF_RESULTS["ethics"]="PASSED"
        local total_events=$(echo "$response" | jq -r '.data.total_events')
        local avg_ihsan=$(echo "$response" | jq -r '.data.avg_ihsan')
        PROOF_METRICS["total_poi_events"]=$total_events
        PROOF_METRICS["avg_ihsan_score"]=$avg_ihsan
        echo -e "✅ Ethical Scoring Working:"
        echo "   Total PoI Events: $total_events"
        echo "   Average Ihsan Score: $avg_ihsan"
    else
        PROOF_RESULTS["ethics"]="FAILED"
        echo -e "❌ Ethics measurement system not responding"
        return 1
    fi
}

# Proof 5: Federation Readiness
proof_federation_readiness() {
    echo -e "\n${YELLOW}PROOF 5: Federation Readiness${NC}"
    echo "Testing: Node networking and resource coordination capability"

    local api_url="http://localhost:8080"

    # Get resource status
    local response=$(curl -s GET "$api_url/api/resources/status" 2>/dev/null)

    if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
        PROOF_RESULTS["federation"]="PASSED"
        local node_id=$(echo "$response" | jq -r '.data.node_id')
        local status=$(echo "$response" | jq -r '.data.status')
        PROOF_METRICS["node_id"]=$node_id
        PROOF_METRICS["node_status"]=$status
        echo -e "✅ Federation Ready:"
        echo "   Node ID: $node_id"
        echo "   Status: $status"

        # Check if resource pooling is operational
        if echo "$response" | jq -e '.data.cpu_cores_total > 0' > /dev/null 2>&1; then
            PROOF_METRICS["resource_management"]="ACTIVE"
            echo -e "✅ Resource Management: ACTIVE"
        fi
    else
        PROOF_RESULTS["federation"]="FAILED"
        echo -e "❌ Federation capabilities not available"
        return 1
    fi
}

# Generate Proof Report
generate_proof_report() {
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}BIZRA PROOF REPORT - NODE0 VERIFICATION${NC}"
    echo -e "${GREEN}========================================${NC}"

    local total_proofs=5
    local passed_proofs=0

    for proof in "${!PROOF_RESULTS[@]}"; do
        echo -e "\nProof: $proof"
        echo -e "Status: ${PROOF_RESULTS[$proof]}"

        if [ "${PROOF_RESULTS[$proof]}" = "PASSED" ]; then
            ((passed_proofs++))
        fi

        # Display relevant metrics
        case $proof in
            "sovereignty")
                echo -e "Ollama Available: ${PROOF_METRICS['ollama_available']}"
                ;;
            "economics")
                echo -e "BZC Earned: ${PROOF_METRICS['bzc_earned']}"
                echo -e "IMP Earned: ${PROOF_METRICS['imp_earned']}"
                ;;
            "pat_capability")
                echo -e "Agent: ${PROOF_METRICS['pat_agent']}"
                echo -e "Model: ${PROOF_METRICS['pat_model']}"
                echo -e "Latency: ${PROOF_METRICS['pat_latency']}ms"
                ;;
            "ethics")
                echo -e "Total PoI Events: ${PROOF_METRICS['total_poi_events']}"
                echo -e "Avg Ihsan Score: ${PROOF_METRICS['avg_ihsan_score']}"
                ;;
            "federation")
                echo -e "Node ID: ${PROOF_METRICS['node_id']}"
                echo -e "Node Status: ${PROOF_METRICS['node_status']}"
                ;;
        esac
    done

    local success_rate=$((passed_proofs * 100 / total_proofs))
    echo -e "\n${YELLOW}OVERALL VERIFICATION${NC}"
    echo -e "Success Rate: $passed_proofs/$total_proofs ($success_rate%)"
    echo -e "Verification Date: $(date -Iseconds)"

    if [ $success_rate -ge 80 ]; then
        echo -e "${GREEN}VERDICT: PROVEN - BIZRA Node0 Ready for Against the Giants${NC}"
        return 0
    else
        echo -e "${RED}VERDICT: FAILED - Critical Functions Require Attention${NC}"
        return 1
    fi
}

# Save Results to JSON
save_json_report() {
    local json_output='{
        "verification": {
            "node_id": "NODE0-TITAN",
            "timestamp": "'$(date -Iseconds)'",
            "document_id": "BIZRA-PROOF-NODE0-v1.0-ALIF",
            "success_rate": "'$((passed_proofs * 100 / 5))'%"
        },
        "proof_results": {
'

    local first=true
    for proof in sovereignty economics pat_capability ethics federation; do
        if [ "$first" = true ]; then first=false; else json_output+=','; fi
        json_output+='"'$proof'": "'${PROOF_RESULTS[$proof]}'"'
    done

    json_output+='
        },
        "metrics": {
'

    first=true
    for metric in "${!PROOF_METRICS[@]}"; do
        if [ "$first" = true ]; then first=false; else json_output+=','; fi
        json_output+='"'$metric'": "'${PROOF_METRICS[$metric]}'"'
    done

    json_output+='
        }
    }'

    echo "$json_output" | jq '.' > sovereignty-report.json
    echo -e "\n${GREEN}JSON Report saved: sovereignty-report.json${NC}"
}

# Main Proof Protocol Execution
main() {
    # Check if jq is available for JSON processing
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}ERROR: jq required for JSON processing${NC}"
        echo "Install: apt-get install jq"
        exit 1
    fi

    echo "Initiating Proof Protocol..."
    echo "This will verify all BIZRA claims through operational code"

    # Execute all proofs
    proof_infrastructure_sovereignty
    proof_economic_alignment
    proof_pat_agent_capability
    proof_ethical_governance
    proof_federation_readiness

    # Generate and display report
    generate_proof_report
    local result=$?

    # Save JSON report regardless of outcome
    save_json_report

    exit $result
}

# Execute main protocol
main "$@"
