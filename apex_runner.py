#!/usr/bin/env python3
"""
BIZRA APEX Runner v1.0 — Unified Agent Experts + SystemProtocol Kernel
=======================================================================
The culmination of the BIZRA Convergence Blueprint:

- Agent Experts: Self-improving agents with persistent mental models
- SystemProtocolKernel: Ihsān enforcement and protocol-level auditability
- SNR Optimization: Token efficiency tracking
- SAPE Pattern Elevation: Detecting recurring patterns for abstraction

Usage:
  python apex_runner.py --help
  python apex_runner.py --status
  python apex_runner.py --expert pat "How do I query the database?"
  python apex_runner.py --interactive

Reference: THE BIZRA CONVERGENCE BLUEPRINT
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Import kernel
from system_protocol_kernel import (
    SystemProtocolKernel,
    get_kernel,
    IhsanDimension,
    IhsanScore,
)

# Import expert runner
from expert_runner import (
    load_expertise,
    save_expertise,
    list_experts,
    query_expert,
    validate_expertise,
    EXPERTS_DIR,
)


# ─────────────────────────────────────────────────────────────────────────────
# APEX RUNNER
# ─────────────────────────────────────────────────────────────────────────────

class APEXRunner:
    """
    Unified runner that combines Agent Experts with SystemProtocolKernel.
    
    Every expert query is:
    1. Wrapped in a protocol session
    2. Validated against Ihsān thresholds
    3. Tracked for SNR efficiency
    4. Logged for auditability
    """
    
    def __init__(self):
        self.kernel = get_kernel()
        self.experts_dir = EXPERTS_DIR
        self._experts_cache: Dict[str, Dict[str, Any]] = {}
        
        # Load all experts
        self._load_experts()
    
    def _load_experts(self) -> None:
        """Load all available experts."""
        for domain in list_experts():
            expertise = load_expertise(domain)
            if expertise:
                self._experts_cache[domain] = expertise
    
    def list_domains(self) -> List[str]:
        """List all available expert domains."""
        return list(self._experts_cache.keys())
    
    def get_expert(self, domain: str) -> Optional[Dict[str, Any]]:
        """Get an expert's mental model."""
        return self._experts_cache.get(domain)
    
    def query_with_kernel(
        self,
        expert_name: str,
        question: str,
        model: str = "llama3.2",
    ) -> Dict[str, Any]:
        """
        Query an expert with full kernel enforcement.
        
        Returns:
            Dict with response, ihsan_score, snr_score, and audit info
        """
        # Start session
        session = self.kernel.start_session({
            "expert": expert_name,
            "question": question[:100],  # Truncate for logging
        })
        
        result: Dict[str, Any] = {
            "session_id": session.session_id,
            "expert": expert_name,
            "question": question,
        }
        
        try:
            # Pre-check: Expert exists
            expertise = self.get_expert(expert_name)
            if not expertise:
                result["success"] = False
                result["error"] = f"Expert '{expert_name}' not found"
                self.kernel.end_session(session.session_id)
                return result
            
            # Pre-check: Expert Ihsān score meets threshold
            expert_ihsan = expertise.get("ihsan_score", 0.0)
            if expert_ihsan < self.kernel.ihsan_threshold:
                # Update session's Ihsān based on expert quality
                self.kernel.update_ihsan_dimension(
                    session.session_id,
                    IhsanDimension.CORRECTNESS,
                    expert_ihsan,
                )
            
            # Execute query with Ihsān enforcement
            exec_result = self.kernel.execute_with_ihsan(
                session.session_id,
                action=lambda: self._do_query(expert_name, question, model),
                action_type="expert_query",
                pre_checks=[
                    lambda: expert_name in self.list_domains(),
                ],
            )
            
            if exec_result["success"]:
                response = exec_result["result"]
                result["success"] = True
                result["response"] = response.get("response", "")
                
                # Update SNR based on response quality
                useful_tokens = len(result["response"].split())
                total_tokens = len(question.split()) + useful_tokens + 100  # Rough estimate
                self.kernel.update_snr_metrics(
                    session.session_id,
                    useful_tokens,
                    total_tokens,
                    confidence=0.9,
                )
            else:
                result["success"] = False
                result["error"] = exec_result.get("error", "Unknown error")
            
            # Add metrics
            result["ihsan_score"] = exec_result.get("ihsan_score", 0.0)
            result["snr_score"] = exec_result.get("snr_score", 0.0)
            result["latency_ms"] = exec_result.get("latency_ms", 0)
            
        except Exception as e:
            result["success"] = False
            result["error"] = str(e)
        
        # End session
        summary = self.kernel.end_session(session.session_id)
        result["session_summary"] = summary
        
        return result
    
    def _do_query(
        self,
        expert_name: str,
        question: str,
        model: str,
    ) -> Dict[str, Any]:
        """Execute the actual expert query."""
        return query_expert(
            domain=expert_name,
            query=question,
        )
    
    def validate_expert(self, expert_name: str) -> Dict[str, Any]:
        """Validate an expert's mental model against the codebase."""
        return validate_expertise(expert_name)
    
    def get_status(self) -> Dict[str, Any]:
        """Get combined status of kernel and experts."""
        kernel_status = self.kernel.get_kernel_status()
        
        experts = []
        for domain in self.list_domains():
            expertise = self.get_expert(domain)
            if expertise:
                experts.append({
                    "domain": domain,
                    "snr_score": expertise.get("snr_score", 0.0),
                    "ihsan_score": expertise.get("ihsan_score", 0.0),
                    "last_updated": expertise.get("last_updated", "unknown"),
                })
        
        return {
            "apex_version": "1.0.0",
            "kernel": kernel_status,
            "experts": experts,
            "total_experts": len(experts),
        }
    
    def interactive_mode(self) -> None:
        """Run interactive APEX session."""
        print("=" * 60)
        print("  BIZRA APEX Runner v1.0 — Interactive Mode")
        print("=" * 60)
        print("\nCommands:")
        print("  /status         - Show system status")
        print("  /experts        - List available experts")
        print("  /expert <name>  - Switch to expert")
        print("  /validate       - Validate current expert")
        print("  /kernel         - Show kernel status")
        print("  /quit           - Exit")
        print("\nType your question after selecting an expert.")
        print("-" * 60)
        
        current_expert: Optional[str] = None
        experts = self.list_domains()
        
        if experts:
            current_expert = experts[0]
            print(f"\n📚 Default expert: {current_expert}")
        
        while True:
            try:
                prompt = f"\n[{current_expert or 'no-expert'}] > "
                user_input = input(prompt).strip()
                
                if not user_input:
                    continue
                
                if user_input.startswith("/"):
                    cmd_parts = user_input[1:].split(maxsplit=1)
                    cmd = cmd_parts[0].lower()
                    arg = cmd_parts[1] if len(cmd_parts) > 1 else ""
                    
                    if cmd == "quit" or cmd == "exit":
                        print("\n👋 Goodbye!")
                        break
                    
                    elif cmd == "status":
                        status = self.get_status()
                        print(json.dumps(status, indent=2))
                    
                    elif cmd == "experts":
                        print("\n📚 Available Experts:")
                        for domain in self.list_domains():
                            exp = self.get_expert(domain)
                            snr = exp.get("snr_score", 0.0) if exp else 0.0
                            ihsan = exp.get("ihsan_score", 0.0) if exp else 0.0
                            marker = "✅" if snr >= 0.85 else "⚠️"
                            print(f"  {marker} {domain:15} SNR={snr:.2f} Ihsān={ihsan:.2f}")
                    
                    elif cmd == "expert":
                        if arg in self.list_domains():
                            current_expert = arg
                            print(f"✅ Switched to expert: {current_expert}")
                        else:
                            print(f"❌ Expert '{arg}' not found")
                    
                    elif cmd == "validate":
                        if current_expert:
                            result = self.validate_expert(current_expert)
                            print(json.dumps(result, indent=2))
                        else:
                            print("❌ No expert selected")
                    
                    elif cmd == "kernel":
                        status = self.kernel.get_kernel_status()
                        print(json.dumps(status, indent=2))
                    
                    else:
                        print(f"❌ Unknown command: {cmd}")
                
                else:
                    # Query the expert
                    if not current_expert:
                        print("❌ Select an expert first with /expert <name>")
                        continue
                    
                    print(f"\n🔍 Querying {current_expert}...")
                    result = self.query_with_kernel(current_expert, user_input)
                    
                    if result["success"]:
                        print(f"\n📊 Metrics: Ihsān={result['ihsan_score']:.2f}, SNR={result['snr_score']:.2f}, Latency={result['latency_ms']}ms")
                        print(f"\n{result['response']}")
                    else:
                        print(f"\n❌ Error: {result.get('error', 'Unknown')}")
            
            except KeyboardInterrupt:
                print("\n\n👋 Interrupted. Goodbye!")
                break
            except EOFError:
                print("\n👋 Goodbye!")
                break


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="BIZRA APEX Runner — Unified Agent Experts + SystemProtocol Kernel",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python apex_runner.py --status
  python apex_runner.py --expert pat "How do I add a new agent?"
  python apex_runner.py --interactive
        """,
    )
    
    parser.add_argument("--status", action="store_true", help="Show system status")
    parser.add_argument("--expert", metavar="NAME", help="Expert to query")
    parser.add_argument("question", nargs="?", help="Question to ask the expert")
    parser.add_argument("--interactive", "-i", action="store_true", help="Interactive mode")
    parser.add_argument("--validate", metavar="NAME", help="Validate an expert")
    parser.add_argument("--model", default="llama3.2", help="LLM model to use")
    
    args = parser.parse_args()
    
    runner = APEXRunner()
    
    if args.status:
        print(json.dumps(runner.get_status(), indent=2))
    
    elif args.validate:
        result = runner.validate_expert(args.validate)
        print(json.dumps(result, indent=2))
    
    elif args.expert and args.question:
        result = runner.query_with_kernel(args.expert, args.question, args.model)
        if result["success"]:
            print(f"Ihsān: {result['ihsan_score']:.3f} | SNR: {result['snr_score']:.3f} | Latency: {result['latency_ms']}ms\n")
            print(result["response"])
        else:
            print(f"Error: {result.get('error', 'Unknown')}", file=sys.stderr)
            sys.exit(1)
    
    elif args.interactive:
        runner.interactive_mode()
    
    else:
        # List experts by default
        print("BIZRA APEX Runner v1.0\n")
        print("Available experts:")
        for domain in runner.list_domains():
            exp = runner.get_expert(domain)
            if exp:
                print(f"  - {domain} (SNR: {exp.get('snr_score', 0.0):.2f})")
        print("\nUse --help for usage information")


if __name__ == "__main__":
    main()
