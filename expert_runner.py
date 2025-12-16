#!/usr/bin/env python3
"""
BIZRA Expert Runner — Self-Improving Agent Experts
===================================================
Agents that execute AND learn, accumulating expertise in mental models.

Usage:
    python expert_runner.py                           # Interactive mode
    python expert_runner.py --list                    # List all experts
    python expert_runner.py --expert pat --query "How does orchestration work?"
    python expert_runner.py --expert database --self-improve
"""

import argparse
import hashlib
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML not installed. Run: pip install pyyaml")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("ERROR: requests not installed. Run: pip install requests")
    sys.exit(1)


# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

EXPERTS_DIR = Path(__file__).parent / "experts"
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
LMSTUDIO_URL = os.environ.get("LMSTUDIO_URL", "http://localhost:1234")

# Expert configuration: which model to use for expert queries
EXPERT_CONFIG = {
    "pat": {"model": "qwen2.5:7b", "backend": "ollama"},
    "sat": {"model": "qwen2.5:7b", "backend": "ollama"},
    "database": {"model": "qwen2.5:7b", "backend": "ollama"},
    "inference": {"model": "qwen2.5:7b", "backend": "ollama"},
    "knowledge": {"model": "qwen2.5:7b", "backend": "ollama"},
    "websocket": {"model": "qwen2.5:7b", "backend": "ollama"},
    "auth": {"model": "qwen2.5:7b", "backend": "ollama"},
}


# ─────────────────────────────────────────────────────────────────────────────
# EXPERTISE FILE MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

def load_expertise(domain: str) -> Optional[Dict[str, Any]]:
    """Load an expert's mental model from YAML."""
    expertise_path = EXPERTS_DIR / domain / "expertise.yaml"
    if not expertise_path.exists():
        return None
    with open(expertise_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def save_expertise(domain: str, expertise: Dict[str, Any]) -> None:
    """Save an expert's mental model to YAML."""
    expertise_path = EXPERTS_DIR / domain / "expertise.yaml"
    expertise_path.parent.mkdir(parents=True, exist_ok=True)
    expertise["last_updated"] = datetime.now(timezone.utc).isoformat()
    with open(expertise_path, "w", encoding="utf-8") as f:
        yaml.dump(expertise, f, default_flow_style=False, sort_keys=False, allow_unicode=True)


def list_experts() -> List[str]:
    """List all available experts."""
    if not EXPERTS_DIR.exists():
        return []
    return [d.name for d in EXPERTS_DIR.iterdir() if d.is_dir() and (d / "expertise.yaml").exists()]


def compute_file_hash(path: Path) -> str:
    """Compute SHA256 hash of a file for validation."""
    if not path.exists():
        return "file_not_found"
    if path.is_dir():
        return "directory"
    h = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            h.update(f.read())
        return h.hexdigest()[:16]
    except Exception:
        return "unreadable"


# ─────────────────────────────────────────────────────────────────────────────
# INFERENCE
# ─────────────────────────────────────────────────────────────────────────────

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
        r = requests.post(url, json=payload, timeout=180)
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
        "max_tokens": 4096,
    }
    try:
        r = requests.post(url, json=payload, timeout=180)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
    except requests.exceptions.ConnectionError:
        return f"ERROR: Cannot connect to LM Studio at {LMSTUDIO_URL}. Is it running?"
    except Exception as e:
        return f"ERROR: {e}"


# ─────────────────────────────────────────────────────────────────────────────
# EXPERT QUERY SYSTEM
# ─────────────────────────────────────────────────────────────────────────────

def build_expert_prompt(domain: str, expertise: Dict[str, Any]) -> str:
    """Build the system prompt for an expert, injecting its mental model."""
    expertise_yaml = yaml.dump(expertise, default_flow_style=False, sort_keys=False)
    
    return f"""You are the BIZRA {domain.upper()} Expert — a self-improving agent with accumulated domain knowledge.

## YOUR MENTAL MODEL (expertise.yaml)
This is your current understanding. It is NOT the source of truth — the actual codebase is.
Always validate your mental model against real code before answering.

```yaml
{expertise_yaml}
```

## YOUR PROTOCOL

1. **READ**: First, internalize your mental model above.
2. **VALIDATE**: If the user asks about code, mentally confirm your understanding matches reality.
3. **ANSWER**: Provide accurate, grounded responses using your validated knowledge.
4. **LEARN**: If you discover something new or your mental model is outdated, flag it.

## RESPONSE FORMAT

When answering:
- Reference specific files and locations from your mental model
- If you're uncertain, say so
- If your mental model might be outdated, say "FLAG FOR SELF-IMPROVEMENT: [description]"

## IHSĀN PRINCIPLES

- **Correctness**: Only state what you can validate
- **Efficiency**: Be concise, high SNR
- **Auditability**: Cite your sources (file locations, line numbers)
"""


def query_expert(domain: str, query: str) -> Dict[str, Any]:
    """Query an expert with a question."""
    expertise = load_expertise(domain)
    if expertise is None:
        return {
            "success": False,
            "error": f"Expert '{domain}' not found. Available: {list_experts()}",
        }
    
    config = EXPERT_CONFIG.get(domain, {"model": "qwen2.5:7b", "backend": "ollama"})
    system_prompt = build_expert_prompt(domain, expertise)
    
    start = time.time()
    
    if config["backend"] == "ollama":
        response = call_ollama(config["model"], system_prompt, query)
    elif config["backend"] == "lmstudio":
        response = call_lmstudio(config["model"], system_prompt, query)
    else:
        response = f"ERROR: Unknown backend {config['backend']}"
    
    latency_ms = int((time.time() - start) * 1000)
    
    # Check for self-improvement flags
    needs_improvement = "FLAG FOR SELF-IMPROVEMENT" in response
    
    return {
        "success": True,
        "domain": domain,
        "model": config["model"],
        "response": response,
        "latency_ms": latency_ms,
        "snr_score": expertise.get("snr_score", 0.0),
        "ihsan_score": expertise.get("ihsan_score", 0.0),
        "needs_improvement": needs_improvement,
    }


# ─────────────────────────────────────────────────────────────────────────────
# SELF-IMPROVEMENT SYSTEM
# ─────────────────────────────────────────────────────────────────────────────

def build_self_improve_prompt(domain: str, expertise: Dict[str, Any], context: str) -> str:
    """Build the prompt for self-improvement."""
    expertise_yaml = yaml.dump(expertise, default_flow_style=False, sort_keys=False)
    
    return f"""You are the BIZRA {domain.upper()} Expert Self-Improvement Engine.

## CURRENT MENTAL MODEL
```yaml
{expertise_yaml}
```

## NEW INFORMATION / CHANGES
{context}

## YOUR TASK

Analyze the new information and determine what updates are needed to the mental model.

Output ONLY valid YAML that represents the UPDATED expertise file.
Include:
1. Any new knowledge discovered
2. Updated patterns or edge cases
3. Corrected file locations or implementations
4. An entry in improvement_log with today's date and what changed
5. Updated snr_score if the improvement is significant (+0.01 to +0.05)

CRITICAL: Output ONLY the updated YAML, no explanation before or after.
Start with "domain:" and end with the improvement_log.
"""


def self_improve_expert(domain: str, context: str = "") -> Dict[str, Any]:
    """Trigger self-improvement for an expert."""
    expertise = load_expertise(domain)
    if expertise is None:
        return {
            "success": False,
            "error": f"Expert '{domain}' not found.",
        }
    
    # If no context provided, gather from recent changes
    if not context:
        context = gather_improvement_context(domain, expertise)
    
    config = EXPERT_CONFIG.get(domain, {"model": "qwen2.5:7b", "backend": "ollama"})
    system_prompt = build_self_improve_prompt(domain, expertise, context)
    user_message = "Please update my mental model based on the new information."
    
    start = time.time()
    
    if config["backend"] == "ollama":
        response = call_ollama(config["model"], system_prompt, user_message)
    else:
        response = call_lmstudio(config["model"], system_prompt, user_message)
    
    latency_ms = int((time.time() - start) * 1000)
    
    # Try to parse the response as YAML
    try:
        # Clean up response (remove markdown code blocks if present)
        cleaned = response.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            cleaned = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
        
        new_expertise = yaml.safe_load(cleaned)
        if new_expertise and isinstance(new_expertise, dict) and "domain" in new_expertise:
            old_snr = expertise.get("snr_score", 0.0)
            new_snr = new_expertise.get("snr_score", old_snr)
            
            save_expertise(domain, new_expertise)
            
            return {
                "success": True,
                "domain": domain,
                "latency_ms": latency_ms,
                "snr_delta": new_snr - old_snr,
                "message": "Expertise file updated successfully",
            }
        else:
            return {
                "success": False,
                "error": "LLM did not return valid expertise YAML",
                "raw_response": response[:500],
            }
    except yaml.YAMLError as e:
        return {
            "success": False,
            "error": f"Failed to parse YAML: {e}",
            "raw_response": response[:500],
        }


def gather_improvement_context(domain: str, expertise: Dict[str, Any]) -> str:
    """Gather context for self-improvement by checking file changes."""
    context_parts = []
    
    # Check if known files have changed
    file_locations = expertise.get("file_locations", {})
    validation = expertise.get("validation", {})
    
    for key, path in file_locations.items():
        if isinstance(path, str):
            full_path = Path(__file__).parent / path
            if full_path.exists():
                current_hash = compute_file_hash(full_path)
                context_parts.append(f"File {path}: hash={current_hash}")
                
                # Read first 200 lines to provide context
                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read(8000)
                    context_parts.append(f"Content preview of {path}:\n{content[:2000]}")
                except Exception:
                    pass
    
    if not context_parts:
        context_parts.append("No specific changes detected. Perform general validation of mental model.")
    
    return "\n\n".join(context_parts)


def validate_expertise(domain: str) -> Dict[str, Any]:
    """Validate an expert's mental model against actual code."""
    expertise = load_expertise(domain)
    if expertise is None:
        return {"success": False, "error": f"Expert '{domain}' not found."}
    
    results = {"domain": domain, "validations": [], "issues": []}
    
    file_locations = expertise.get("file_locations", {})
    for key, path in file_locations.items():
        if isinstance(path, str):
            full_path = Path(__file__).parent / path
            exists = full_path.exists()
            results["validations"].append({
                "file": path,
                "exists": exists,
                "hash": compute_file_hash(full_path) if exists else None,
            })
            if not exists:
                results["issues"].append(f"File not found: {path}")
    
    results["valid"] = len(results["issues"]) == 0
    return results


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def print_experts():
    """Print all available experts with their status."""
    experts = list_experts()
    
    print("\n" + "=" * 70)
    print("  BIZRA AGENT EXPERTS — Self-Improving Domain Specialists")
    print("=" * 70)
    
    if not experts:
        print("  No experts found. Create expertise.yaml files in /experts/<domain>/")
        return
    
    print(f"\n  {'Expert':<15} {'SNR':<8} {'Ihsān':<8} {'Last Updated':<25} {'Status'}")
    print("  " + "-" * 65)
    
    for domain in sorted(experts):
        expertise = load_expertise(domain)
        if expertise:
            snr = expertise.get("snr_score", 0.0)
            ihsan = expertise.get("ihsan_score", 0.0)
            updated = expertise.get("last_updated", "unknown")[:19]
            status = "✅" if snr >= 0.85 else "⚠️" if snr >= 0.75 else "❌"
            print(f"  {domain:<15} {snr:<8.2f} {ihsan:<8.2f} {updated:<25} {status}")
    
    print()


def interactive_mode():
    """Run interactive expert query mode."""
    print("\n" + "=" * 70)
    print("  BIZRA EXPERT RUNNER — Interactive Mode")
    print("=" * 70)
    print("  Commands:")
    print("    /list              - List all experts")
    print("    /expert <domain>   - Switch to expert")
    print("    /validate          - Validate current expert's mental model")
    print("    /improve           - Trigger self-improvement")
    print("    /quit              - Exit")
    print("=" * 70 + "\n")
    
    experts = list_experts()
    current_expert = experts[0] if experts else None
    
    if not current_expert:
        print("  No experts found. Create expertise files first.")
        return
    
    print(f"  Current expert: {current_expert}")
    print()
    
    while True:
        try:
            user_input = input(f"[{current_expert}] Query: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nGoodbye!")
            break
        
        if not user_input:
            continue
        
        if user_input.lower() == "/quit":
            print("Goodbye!")
            break
        
        if user_input.lower() == "/list":
            print_experts()
            continue
        
        if user_input.lower().startswith("/expert "):
            new_expert = user_input.split(" ", 1)[1].strip()
            if new_expert in list_experts():
                current_expert = new_expert
                print(f"  → Switched to {current_expert}")
            else:
                print(f"  → Unknown expert: {new_expert}")
                print(f"     Available: {', '.join(list_experts())}")
            continue
        
        if user_input.lower() == "/validate":
            print("  Validating mental model...")
            result = validate_expertise(current_expert)
            if result.get("valid"):
                print("  ✅ All files validated successfully")
            else:
                print("  ⚠️ Issues found:")
                for issue in result.get("issues", []):
                    print(f"     - {issue}")
            continue
        
        if user_input.lower() == "/improve":
            print("  Triggering self-improvement...")
            result = self_improve_expert(current_expert)
            if result.get("success"):
                print(f"  ✅ {result.get('message')}")
                print(f"     SNR delta: {result.get('snr_delta', 0):+.2f}")
            else:
                print(f"  ❌ {result.get('error')}")
            continue
        
        # Query the expert
        print(f"  [{current_expert}] Thinking...")
        result = query_expert(current_expert, user_input)
        
        if result.get("success"):
            print(f"\n  [{current_expert}] ({result['latency_ms']}ms | SNR: {result['snr_score']:.2f}):")
            print("-" * 70)
            print(result["response"])
            print("-" * 70)
            
            if result.get("needs_improvement"):
                print("  ⚠️ Self-improvement flagged. Run /improve to update mental model.")
        else:
            print(f"  ❌ {result.get('error')}")
        
        print()


def main():
    parser = argparse.ArgumentParser(
        description="BIZRA Agent Experts — Self-Improving Domain Specialists"
    )
    parser.add_argument("--list", action="store_true", help="List all experts")
    parser.add_argument("--expert", type=str, help="Expert domain to use")
    parser.add_argument("--query", type=str, help="Query to ask the expert")
    parser.add_argument("--self-improve", action="store_true", help="Trigger self-improvement")
    parser.add_argument("--validate", action="store_true", help="Validate expert's mental model")
    parser.add_argument("--context", type=str, help="Context for self-improvement (e.g., diff)")
    args = parser.parse_args()
    
    if args.list:
        print_experts()
        return
    
    if args.expert and args.validate:
        result = validate_expertise(args.expert)
        print(json.dumps(result, indent=2))
        return
    
    if args.expert and args.self_improve:
        context = args.context or ""
        result = self_improve_expert(args.expert, context)
        print(json.dumps(result, indent=2))
        return
    
    if args.expert and args.query:
        result = query_expert(args.expert, args.query)
        if result.get("success"):
            print(result["response"])
        else:
            print(f"ERROR: {result.get('error')}")
        return
    
    # Default: interactive mode
    interactive_mode()


if __name__ == "__main__":
    main()
