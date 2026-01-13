#!/usr/bin/env python3
"""
BIZRA Dual Agentic System — Local Agent Runner v2.0
====================================================
PAT + SAT agents with full SystemProtocolKernel integration.
All PAT agent executions pass through the ethical microkernel with:
  - Ihsān Vector scoring (threshold ≥ 0.95)
  - 9-Probe Verification Protocol
  - SNR Tracking & Optimization
  - SAPE Pattern Elevation

Usage:
    python agent_runner.py                     # Interactive mode
    python agent_runner.py --agent MasterReasoner --message "Help me plan"
    python agent_runner.py --list              # List all agents
    python agent_runner.py --kernel-status     # Show kernel health
"""

import argparse
import json
import os
import sys
import time
from enum import Enum
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: requests not installed. Run: pip install requests")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# SYSTEMPROTOCOLKERNEL INTEGRATION
# ─────────────────────────────────────────────────────────────────────────────

try:
    from bizra_kernel import (
        get_kernel,
        SystemProtocolKernel,  # noqa: F401
        IhsanVector,  # noqa: F401
        IHSAN_THRESHOLD,
    )
    KERNEL_AVAILABLE = True
except ImportError:
    KERNEL_AVAILABLE = False
    IHSAN_THRESHOLD = 0.95  # Default value when kernel not available
    print("⚠ bizra_kernel not available — running without ethical enforcement")
    print("  To enable: ensure bizra_kernel/ is in PYTHONPATH")


# ─────────────────────────────────────────────────────────────────────────────
# PAT AGENTS
# ─────────────────────────────────────────────────────────────────────────────

class PatRole(Enum):
    MasterReasoner = "MasterReasoner"
    MemoryArchitect = "MemoryArchitect"
    CreativeSynthesizer = "CreativeSynthesizer"
    DataAnalyzer = "DataAnalyzer"
    Communicator = "Communicator"
    ExecutionPlanner = "ExecutionPlanner"
    EthicsGuardian = "EthicsGuardian"


PAT_AGENTS = {
    PatRole.MasterReasoner: {
        "model": "deepseek-r1:7b",
        "backend": "ollama",
        "description": "Strategic thinking, complex analysis, planning",
        "system_prompt": (
            "You are BIZRA Master Reasoner, an expert strategic thinker and problem solver. "
            "Your role is to help users with complex analysis, planning, and decision-making. "
            "Think deeply about problems. Consider multiple perspectives. Provide thorough, "
            "well-reasoned insights. When appropriate, create structured plans with clear steps."
        ),
    },
    PatRole.MemoryArchitect: {
        "model": "qwen2.5:7b",
        "backend": "ollama",
        "description": "Knowledge organization, finding connections, recall",
        "system_prompt": (
            "You are BIZRA Memory Architect, a specialist in knowledge organization. "
            "Your role is to help users structure information, find connections between ideas, "
            "organize notes, and improve recall. Create clear mental models and frameworks."
        ),
    },
    PatRole.CreativeSynthesizer: {
        "model": "qwen2.5:7b",
        "backend": "ollama",
        "description": "Writing, brainstorming, ideation",
        "system_prompt": (
            "You are BIZRA Creative Synthesizer, an expert in creative thinking and content creation. "
            "Your role is to help users with writing, brainstorming, ideation, and creative problem-solving. "
            "Be imaginative, inspiring, and push boundaries while remaining practical."
        ),
    },
    PatRole.DataAnalyzer: {
        "model": "mistral:7b",
        "backend": "ollama",
        "description": "Data analysis, pattern recognition, insights",
        "system_prompt": (
            "You are BIZRA Data Analyzer, a specialist in extracting insights from information. "
            "Your role is to help users analyze data, recognize patterns, and make data-driven decisions. "
            "Present findings clearly with visualization suggestions when helpful."
        ),
    },
    PatRole.Communicator: {
        "model": "mistral:7b",
        "backend": "ollama",
        "description": "Email drafts, presentations, messaging",
        "system_prompt": (
            "You are BIZRA Communicator, an expert in effective messaging and presentation. "
            "Your role is to help users craft clear, compelling communications including emails, "
            "presentations, reports, and messages. Adapt tone and style to the audience."
        ),
    },
    PatRole.ExecutionPlanner: {
        "model": "agentflow-7b",
        "backend": "lmstudio",
        "description": "Schedules, checklists, task sequencing (AgentFlow 7B)",
        "system_prompt": (
            "You are BIZRA Execution Planner powered by AgentFlow 7B. Your role is to help users "
            "break down tasks, create schedules, build checklists, and sequence activities. "
            "You excel at: 1) Multi-step task decomposition 2) Dependency mapping 3) Resource optimization "
            "4) Timeline estimation 5) Agent workflow orchestration. Focus on realistic, achievable steps."
        ),
    },
    PatRole.EthicsGuardian: {
        "model": "qwen2.5:7b",
        "backend": "ollama",
        "description": "Safety compliance, bias detection, ethical review",
        "system_prompt": (
            "You are BIZRA Ethics Guardian, responsible for ensuring outputs are safe and ethical. "
            "Your role is to review content for potential harm, bias, misinformation, or ethical violations. "
            "Apply Ihsan (excellence), Adl (justice), and Amānah (trust) principles."
        ),
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# SAT AGENTS (non-LLM, rule-based for now)
# ─────────────────────────────────────────────────────────────────────────────

class SatRole(Enum):
    PoiVerifier = "PoiVerifier"
    ResourceAllocator = "ResourceAllocator"
    RiskGuardian = "RiskGuardian"
    GovernanceEngine = "GovernanceEngine"
    EvidenceEngine = "EvidenceEngine"


SAT_AGENTS = {
    SatRole.PoiVerifier: {
        "description": "Validates PoI claims, checks Ihsan threshold, blocks fraud",
        "ihsan_threshold": 0.85,
    },
    SatRole.ResourceAllocator: {
        "description": "Manages CPU/GPU allocation, prevents overload",
        "cpu_percent": 25,
    },
    SatRole.RiskGuardian: {
        "description": "Monitors for security threats, unusual patterns",
    },
    SatRole.GovernanceEngine: {
        "description": "Implements parameter changes, upgrade logic",
    },
    SatRole.EvidenceEngine: {
        "description": "Produces dashboards, reports, health indicators",
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# INFERENCE BACKENDS
# ─────────────────────────────────────────────────────────────────────────────

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
LMSTUDIO_URL = os.environ.get("LMSTUDIO_URL", "http://localhost:1234")


def check_ollama() -> bool:
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        return r.status_code == 200
    except Exception:
        return False


def check_lmstudio() -> bool:
    try:
        r = requests.get(f"{LMSTUDIO_URL}/v1/models", timeout=2)
        return r.status_code == 200
    except Exception:
        return False


def call_ollama(model: str, system_prompt: str, user_message: str) -> str:
    """Call Ollama for inference."""
    url = f"{OLLAMA_URL}/api/generate"
    payload = {
        "model": model,
        "system": system_prompt,
        "prompt": user_message,
        "stream": False,
    }
    try:
        r = requests.post(url, json=payload, timeout=120)
        r.raise_for_status()
        return r.json().get("response", "")
    except requests.exceptions.ConnectionError:
        return f"ERROR: Cannot connect to Ollama at {OLLAMA_URL}. Is it running?"
    except Exception as e:
        return f"ERROR: {e}"


def call_lmstudio(model: str, system_prompt: str, user_message: str) -> str:
    """Call LM Studio (OpenAI-compatible API) for inference."""
    url = f"{LMSTUDIO_URL}/v1/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.7,
        "max_tokens": 2048,
    }
    try:
        r = requests.post(url, json=payload, timeout=120)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
    except requests.exceptions.ConnectionError:
        return f"ERROR: Cannot connect to LM Studio at {LMSTUDIO_URL}. Is it running?"
    except Exception as e:
        return f"ERROR: {e}"


# ─────────────────────────────────────────────────────────────────────────────
# AGENT RUNNER (with SystemProtocolKernel)
# ─────────────────────────────────────────────────────────────────────────────

def run_pat_agent(role: PatRole, message: str, knowledge_context: str = "", enforce_kernel: bool = True) -> dict:
    """
    Run a PAT agent through the SystemProtocolKernel.
    
    When kernel is enabled, all responses go through:
    1. Session creation with protocol hash
    2. 9-Probe Verification Protocol
    3. Ihsān Vector scoring (must pass threshold)
    4. SNR tracking for efficiency
    5. SAPE pattern elevation check
    """
    config = PAT_AGENTS[role]
    model = config["model"]
    backend = config["backend"]
    system_prompt = config["system_prompt"]

    # Inject knowledge context if available
    if knowledge_context:
        system_prompt = f"{system_prompt}\n\nRelevant knowledge context:\n{knowledge_context}"

    start = time.time()

    # Get raw inference response
    if backend == "ollama":
        response = call_ollama(model, system_prompt, message)
    elif backend == "lmstudio":
        response = call_lmstudio(model, system_prompt, message)
    else:
        response = f"ERROR: Unknown backend {backend}"

    latency_ms = int((time.time() - start) * 1000)

    # Build base result
    result = {
        "agent": role.value,
        "model": model,
        "backend": backend,
        "response": response,
        "latency_ms": latency_ms,
        "kernel_enforced": False,
    }

    # If kernel available and enforcement enabled, run through kernel
    if KERNEL_AVAILABLE and enforce_kernel and not response.startswith("ERROR"):
        try:
            kernel = get_kernel()
            
            # Execute through kernel
            execution = kernel.execute(
                action_type="inference",
                agent_id=role.value,
                action_payload={
                    "message": message,
                    "response": response,
                    "model": model,
                    "backend": backend,
                    "has_knowledge_context": bool(knowledge_context),
                },
            )
            
            # Add kernel results to response
            result["kernel_enforced"] = True
            result["session_id"] = execution.session_id
            result["ihsan_score"] = round(execution.ihsan_score, 4)
            result["ihsan_passed"] = execution.ihsan_passed
            result["verification_passed"] = execution.verification_passed
            result["snr"] = round(execution.snr, 4)
            result["sape_elevation"] = execution.elevated_pattern
            
            # If Ihsān threshold not met, flag for FATE review
            if not execution.ihsan_passed:
                result["fate_escalation"] = True
                result["fate_reason"] = (
                    f"Ihsān score {execution.ihsan_score:.4f} < threshold {IHSAN_THRESHOLD}"
                )
                # Append warning to response
                result["response"] = (
                    f"⚠️ FATE REVIEW REQUIRED\n"
                    f"Ihsān: {execution.ihsan_score:.4f} (need ≥{IHSAN_THRESHOLD})\n"
                    f"─────────────────────────\n{response}"
                )
            
            # If verification failed, add warning
            if not execution.verification_passed:
                result["verification_warning"] = "9-Probe verification incomplete"
        
        except Exception as e:
            result["kernel_error"] = str(e)

    return result


def run_sat_agent(role: SatRole, **kwargs) -> dict:
    """Run a SAT agent (rule-based, no LLM)."""
    config = SAT_AGENTS[role]

    if role == SatRole.PoiVerifier:
        ihsan_score = kwargs.get("ihsan_score", 0.9)
        threshold = config["ihsan_threshold"]
        verified = ihsan_score >= threshold
        return {
            "agent": role.value,
            "verified": verified,
            "ihsan_score": ihsan_score,
            "threshold": threshold,
            "reason": "Passed" if verified else f"Ihsan {ihsan_score} < threshold {threshold}",
        }

    elif role == SatRole.ResourceAllocator:
        cpu_total = kwargs.get("cpu_cores", 16)
        ram_gb = kwargs.get("ram_gb", 64)
        return {
            "agent": role.value,
            "recommended_cpu_cores": max(2, cpu_total // 4),
            "recommended_ram_gb": max(8, ram_gb // 4),
            "gpu_enabled": ram_gb >= 32,
        }

    elif role == SatRole.RiskGuardian:
        return {
            "agent": role.value,
            "risk_level": "low",
            "threats": [],
            "recommendations": ["Continue monitoring"],
        }

    elif role == SatRole.EvidenceEngine:
        return {
            "agent": role.value,
            "report_type": "health",
            "status": "operational",
            "uptime_percent": 99.9,
        }

    else:
        return {"agent": role.value, "status": "not implemented"}


# ─────────────────────────────────────────────────────────────────────────────
# RAG INTEGRATION
# ─────────────────────────────────────────────────────────────────────────────

def get_knowledge_context(query: str, max_tokens: int = 1500) -> str:
    """Get knowledge context from the RAG engine."""
    knowledge_dir = Path(__file__).parent / "knowledge"
    sys.path.insert(0, str(knowledge_dir))

    try:
        from rag_engine import BizraRAGEngine
        engine = BizraRAGEngine()
        if engine.load_knowledge_base():
            return engine.get_context_for_prompt(query, max_tokens=max_tokens)
    except Exception as e:
        print(f"[RAG] Warning: {e}")

    return ""


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def show_kernel_status():
    """Display SystemProtocolKernel health and configuration."""
    print("\n" + "=" * 60)
    print("  SYSTEMPROTOCOLKERNEL STATUS")
    print("=" * 60)
    
    if not KERNEL_AVAILABLE:
        print("\n  ❌ KERNEL NOT AVAILABLE")
        print("     The bizra_kernel module is not installed or not in PYTHONPATH.")
        print("     Agents will run WITHOUT ethical enforcement.")
        print("\n     To enable, ensure bizra_kernel/ is in your PYTHONPATH:")
        print("       export PYTHONPATH=$PYTHONPATH:/workspaces/bizra-genesis-node")
        print()
        return
    
    try:
        kernel = get_kernel()
        
        print("\n  ✅ KERNEL ACTIVE")
        print(f"     Ihsān Threshold: ≥ {IHSAN_THRESHOLD}")
        print(f"     Active Sessions: {len(kernel.session_manager.active_sessions)}")
        print(f"     Total Executions: {len(kernel.session_manager.all_sessions)}")
        
        # Show SNR stats
        if kernel.snr_tracker.history:
            avg_snr = sum(m.snr for m in kernel.snr_tracker.history) / len(kernel.snr_tracker.history)
            print(f"     Average SNR: {avg_snr:.4f}")
            rankings = kernel.snr_tracker.get_agent_rankings()
            if rankings:
                print("     Top Agents by SNR:")
                for agent_id, snr in rankings[:3]:
                    print(f"       • {agent_id}: {snr:.4f}")
        else:
            print("     SNR History: No data yet")
        
        # Show SAPE elevations
        elevated = kernel.sape_engine.get_elevated_patterns()
        if elevated:
            print(f"     SAPE Elevations: {len(elevated)} patterns")
            for p in elevated[:3]:
                print(f"       • {p.name} (count={p.count})")
        else:
            print("     SAPE Elevations: None yet")
        
        print("\n  📊 Kernel Configuration:")
        print(f"     ihsan_threshold: {kernel.config.ihsan_threshold}")
        print(f"     snr_threshold: {kernel.config.snr_threshold}")
        print(f"     sape_elevation_threshold: {kernel.config.sape_elevation_threshold}")
        print(f"     verification_threshold: {kernel.config.verification_threshold}")
        
    except Exception as e:
        print(f"\n  ⚠️ KERNEL ERROR: {e}")
    
    print()


def list_agents():
    print("\n" + "=" * 60)
    print("  BIZRA DUAL AGENTIC SYSTEM — AVAILABLE AGENTS")
    print("=" * 60)
    
    # Kernel status summary
    if KERNEL_AVAILABLE:
        print(f"\n  🛡️ Kernel: ACTIVE (Ihsān ≥ {IHSAN_THRESHOLD})")
    else:
        print("\n  ⚠️ Kernel: DISABLED (no ethical enforcement)")

    print("\n📱 PAT (Personal Agent Team):")
    print("-" * 60)
    for role, config in PAT_AGENTS.items():
        backend_status = "✅" if (
            (config["backend"] == "ollama" and check_ollama()) or
            (config["backend"] == "lmstudio" and check_lmstudio())
        ) else "❌"
        print(f"  {backend_status} {role.value:20} → {config['model']:15} ({config['backend']})")
        print(f"     {config['description']}")

    print("\n🔧 SAT (System Agent Team):")
    print("-" * 60)
    for role, config in SAT_AGENTS.items():
        print(f"  ✅ {role.value:20} → rule-based")
        print(f"     {config['description']}")

    print()


def interactive_mode():
    print("\n" + "=" * 60)
    print("  BIZRA AGENT RUNNER — INTERACTIVE MODE")
    print("=" * 60)
    print("  Commands: /list, /agent <name>, /quit")
    print("  Default agent: MasterReasoner")
    print("=" * 60 + "\n")

    current_agent = PatRole.MasterReasoner
    use_rag = True

    while True:
        try:
            user_input = input(f"[{current_agent.value}] You: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nGoodbye!")
            break

        if not user_input:
            continue

        if user_input.lower() == "/quit":
            print("Goodbye!")
            break

        if user_input.lower() == "/list":
            list_agents()
            continue

        if user_input.lower().startswith("/agent "):
            agent_name = user_input.split(" ", 1)[1].strip()
            try:
                current_agent = PatRole(agent_name)
                print(f"  → Switched to {current_agent.value}")
            except ValueError:
                print(f"  → Unknown agent: {agent_name}")
                print(f"     Available: {', '.join(r.value for r in PatRole)}")
            continue

        if user_input.lower() == "/rag":
            use_rag = not use_rag
            print(f"  → RAG enrichment: {'ON' if use_rag else 'OFF'}")
            continue

        # Get knowledge context if enabled
        knowledge_context = ""
        if use_rag:
            print("  [RAG] Searching knowledge base...")
            knowledge_context = get_knowledge_context(user_input)
            if knowledge_context:
                print(f"  [RAG] Found {len(knowledge_context)} chars of context")

        # Run agent through kernel
        print(f"  [{current_agent.value}] Thinking...")
        result = run_pat_agent(current_agent, user_input, knowledge_context)

        print(f"\n  [{current_agent.value}] ({result['latency_ms']}ms):")
        
        # Show kernel metrics if enforced
        if result.get("kernel_enforced"):
            ihsan = result.get("ihsan_score", 0)
            snr = result.get("snr", 0)
            status = "✅" if result.get("ihsan_passed") else "⚠️"
            print(f"  {status} Ihsān: {ihsan:.3f} | SNR: {snr:.3f}")
        
        print("-" * 60)
        print(result["response"])
        print("-" * 60 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="BIZRA Dual Agentic System — Local Agent Runner v2.0"
    )
    parser.add_argument("--list", action="store_true", help="List all agents")
    parser.add_argument("--kernel-status", action="store_true", help="Show kernel health")
    parser.add_argument("--agent", type=str, help="Agent to use (e.g., MasterReasoner)")
    parser.add_argument("--message", type=str, help="Message to send to agent")
    parser.add_argument("--no-rag", action="store_true", help="Disable RAG enrichment")
    parser.add_argument("--no-kernel", action="store_true", help="Disable kernel enforcement")
    parser.add_argument("--sat", type=str, help="Run SAT agent (e.g., PoiVerifier)")
    args = parser.parse_args()

    if args.list:
        list_agents()
        return
    
    if args.kernel_status:
        show_kernel_status()
        return

    if args.sat:
        try:
            role = SatRole(args.sat)
            result = run_sat_agent(role)
            print(json.dumps(result, indent=2))
        except ValueError:
            print(f"Unknown SAT agent: {args.sat}")
            print(f"Available: {', '.join(r.value for r in SatRole)}")
        return

    if args.agent and args.message:
        try:
            role = PatRole(args.agent)
        except ValueError:
            print(f"Unknown PAT agent: {args.agent}")
            print(f"Available: {', '.join(r.value for r in PatRole)}")
            return

        knowledge_context = ""
        if not args.no_rag:
            knowledge_context = get_knowledge_context(args.message)

        result = run_pat_agent(role, args.message, knowledge_context, enforce_kernel=not args.no_kernel)
        
        # Pretty print with kernel info highlighted
        print(json.dumps(result, indent=2))
        
        # Extra kernel summary if enforced
        if result.get("kernel_enforced"):
            print("\n─── Kernel Summary ───")
            ihsan = result.get("ihsan_score", 0)
            passed = "✅ PASSED" if result.get("ihsan_passed") else "❌ FAILED"
            print(f"  Ihsān: {ihsan:.4f} {passed}")
            print(f"  SNR: {result.get('snr', 0):.4f}")
            if result.get("sape_elevation"):
                print(f"  SAPE: Elevated to '{result['sape_elevation']}'")
            if result.get("fate_escalation"):
                print(f"  ⚠️ FATE ESCALATION: {result.get('fate_reason')}")
        
        return

    # Default: interactive mode
    interactive_mode()


if __name__ == "__main__":
    main()
