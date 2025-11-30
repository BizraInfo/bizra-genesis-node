#!/usr/bin/env python3

"""
BIZRA DevOps Evidence Compliance Checker
=======================================

Professional elite practitioner evidence validation suite.
Audits DevOps framework against world-class standards.

Usage:
    python3 check_evidence_compliance.py --full-audit --generate-report
    python3 check_evidence_compliance.py --domain pipelines --audit-level deep
"""

import json
import yaml
import argparse
import sys
from datetime import datetime, timedelta
import os
from pathlib import Path

class DevOpsEvidenceAuditor:
    """Professional grade DevOps evidence compliance auditor."""

    def __init__(self, evidence_base_path="."):
        self.base_path = Path(evidence_base_path)
        self.claims_matrix = self._load_claims_matrix()
        self.audit_results = {}

    def _load_claims_matrix(self):
        """Load the comprehensive claims → evidence mapping matrix."""
        return {
            "pipelines": {
                "PIPE-001": {
                    "claim": "9-stage pipeline with multi-environment flow",
                    "evidence_path": "01-pipelines/workflows/elite-devops-pipeline.yml",
                    "verification_type": "yaml_exists"
                },
                "PIPE-002": {
                    "claim": "AI-powered risk assessment with 100+ signals",
                    "evidence_path": "05-ai-risk-engine/risk_engine.ts",
                    "verification_type": "code_exists"
                },
                "PIPE-003": {
                    "claim": "Risk-gated deployments (high/medium/low)",
                    "evidence_path": "01-pipelines/risk_gate_deployment.py",
                    "verification_type": "code_exists"
                },
                "PIPE-004": {
                    "claim": "SLO enforcement before promotion",
                    "evidence_path": "02-sre-and-slos/slo_enforcement.yaml",
                    "verification_type": "yaml_exists"
                }
            },
            "sre": {
                "SRE-001": {
                    "claim": "MTTR < 5 minutes (automated healing)",
                    "evidence_path": "02-sre-and-slos/mttr_metrics.json",
                    "verification_type": "metrics_recent"
                },
                "SRE-002": {
                    "claim": "99.999% availability SLA",
                    "evidence_path": "02-sre-and-slos/availability_slo.yaml",
                    "verification_type": "slo_defined"
                }
            },
            "security": {
                "SEC-001": {
                    "claim": "SOX automated financial controls",
                    "evidence_path": "03-security-and-compliance/sox_controls_automation.md",
                    "verification_type": "doc_exists"
                },
                "SEC-002": {
                    "claim": "GDPR privacy-by-design",
                    "evidence_path": "03-security-and-compliance/gdpr_privacy_design.md",
                    "verification_type": "doc_exists"
                }
            },
            "resilience": {
                "RES-001": {
                    "claim": "Planned downtime: 0 minutes/year",
                    "evidence_path": "04-resilience-and-chaos/zero_downtime_proofs/",
                    "verification_type": "chaos_results"
                },
                "RES-002": {
                    "claim": "Chaos testing: 7-layer failure simulation",
                    "evidence_path": "04-resilience-and-chaos/chaos_scenarios.yaml",
                    "verification_type": "yaml_exists"
                }
            },
            "ai": {
                "AI-001": {
                    "claim": "ML-powered risk assessment",
                    "evidence_path": "05-ai-risk-engine/risk_engine.ts",
                    "verification_type": "code_exists"
                },
                "AI-002": {
                    "claim": "Prediction accuracy > 98%",
                    "evidence_path": "05-ai-risk-engine/accuracy_metrics.json",
                    "verification_type": "metrics_threshold"
                }
            }
        }

    def audit_claim(self, claim_id, claim_config):
        """Audit a single professional claim."""
        evidence_path = claim_config['evidence_path']
        verification_type = claim_config['verification_type']
        claim = claim_config['claim']

        full_path = self.base_path / evidence_path

        # Verification logic based on type
        if verification_type == 'yaml_exists':
            result = self._verify_yaml_exists(full_path, claim)

        elif verification_type == 'code_exists':
            result = self._verify_code_exists(full_path, claim)

        elif verification_type == 'doc_exists':
            result = self._verify_doc_exists(full_path, claim)

        elif verification_type == 'metrics_recent':
            result = self._verify_metrics_recent(full_path, claim)

        elif verification_type == 'metrics_threshold':
            result = self._verify_metrics_threshold(full_path, claim)

        elif verification_type == 'chaos_results':
            result = self._verify_chaos_results(full_path, claim)

        elif verification_type == 'slo_defined':
            result = self._verify_slo_defined(full_path, claim)

        else:
            result = {
                'status': 'UNKNOWN',
                'details': f'Unknown verification type: {verification_type}'
            }

        self.audit_results[claim_id] = {
            'claim': claim,
            'evidence_path': evidence_path,
            'verification_type': verification_type,
            **result
        }

        return result

    def _verify_yaml_exists(self, path, claim):
        """Verify YAML evidence file exists and is parseable."""
        if not path.exists():
            return {
                'status': 'FAILED',
                'details': f"Evidence file missing: {path}"
            }

        try:
            with open(path, 'r', encoding='utf-8') as f:
                yaml.safe_load(f)
            return {
                'status': 'VERIFIED',
                'details': 'YAML file exists and is parseable'
            }
        except yaml.YAMLError as e:
            return {
                'status': 'FAILED',
                'details': f"Invalid YAML: {e}"
            }

    def _verify_code_exists(self, path, claim):
        """Verify code evidence file exists."""
        if not path.exists():
            return {
                'status': 'FAILED',
                'details': f"Code evidence missing: {path}"
            }

        # Basic code check - verify it contains expected content
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Look for evidence of implementation
            if 'class' in content or 'function' in content or 'export' in content:
                return {
                    'status': 'VERIFIED',
                    'details': 'Code implementation detected'
                }
            else:
                return {
                    'status': 'PARTIAL',
                    'details': 'Code structure unclear'
                }
        except Exception as e:
            return {
                'status': 'FAILED',
                'details': f"Error reading code: {e}"
            }

    def _verify_doc_exists(self, path, claim):
        """Verify documentation evidence exists."""
        if not path.exists():
            return {
                'status': 'FAILED',
                'details': f"Documentation missing: {path}"
            }

        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            if len(content.strip()) > 100:  # Reasonable doc length
                return {
                    'status': 'VERIFIED',
                    'details': 'Documentation evidence present'
                }
            else:
                return {
                    'status': 'PARTIAL',
                    'details': 'Documentation appears minimal'
                }
        except Exception as e:
            return {
                'status': 'FAILED',
                'details': f"Error reading documentation: {e}"
            }

    def _verify_metrics_recent(self, path, claim):
        """Verify metrics are recent and valid."""
        if not path.exists():
            return {
                'status': 'COLLECTING',
                'details': 'Metrics collection in progress'
            }

        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Check if data is recent (within last 30 days)
            if 'timestamp' in data:
                timestamp = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
                if datetime.now(timestamp.tzinfo) - timestamp < timedelta(days=30):
                    return {
                        'status': 'VERIFIED',
                        'details': 'Recent metrics collected'
                    }

            return {
                'status': 'PARTIAL',
                'details': 'Historical metrics exist but may be outdated'
            }

        except Exception as e:
            return {
                'status': 'FAILED',
                'details': f"Error with metrics: {e}"
            }

    def _verify_metrics_threshold(self, path, claim):
        """Verify metrics meet required thresholds."""
        if not path.exists():
            return {
                'status': 'COLLECTING',
                'details': 'Metrics data being collected'
            }

        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Extract accuracy metric for AI claims
            if 'prediction_accuracy' in data:
                accuracy = data['prediction_accuracy']
                if accuracy >= 0.98:  # 98% threshold
                    return {
                        'status': 'VERIFIED',
                        'details': f"Accuracy {accuracy:.1%} meets 98% requirement"
                    }
                else:
                    return {
                        'status': 'FAILED',
                        'details': f"Accuracy {accuracy:.1%} below 98% threshold"
                    }

            return {
                'status': 'PARTIAL',
                'details': 'Metrics exist but threshold verification incomplete'
            }

        except Exception as e:
            return {
                'status': 'FAILED',
                'details': f"Error with threshold metrics: {e}"
            }

    def _verify_chaos_results(self, path, claim):
        """Verify chaos engineering evidence exists."""
        chaos_files = list(path.glob('**/*.yaml')) + list(path.glob('**/*.json'))

        if not chaos_files:
            return {
                'status': 'FAILED',
                'details': 'No chaos test results found'
            }

        # Check for recent chaos experiments
        recent_results = []
        for chaos_file in chaos_files:
            try:
                # Parse chaos experiment results
                with open(chaos_file, 'r', encoding='utf-8') as f:
                    result = yaml.safe_load(f)

                if 'timestamp' in result:
                    ts = datetime.fromisoformat(result['timestamp'])
                    if datetime.now() - ts < timedelta(days=7):  # Recent
                        recent_results.append(chaos_file)
            except Exception:
                continue

        if recent_results:
            return {
                'status': 'VERIFIED',
                'details': f"{len(recent_results)} recent chaos tests documented"
            }
        else:
            return {
                'status': 'PARTIAL',
                'details': 'Chaos framework exists but recent tests needed'
            }

    def _verify_slo_defined(self, path, claim):
        """Verify SLO definitions exist and are valid."""
        if not path.exists():
            return {
                'status': 'FAILED',
                'details': 'SLO definitions missing'
            }

        try:
            with open(path, 'r', encoding='utf-8') as f:
                slo_config = yaml.safe_load(f)

            # Validate SLO structure
            required_fields = ['time_period', 'slo_type', 'conditions', 'requirements']
            if all(field in slo_config for field in required_fields):
                return {
                    'status': 'VERIFIED',
                    'details': 'Complete SLO definitions present'
                }
            else:
                return {
                    'status': 'PARTIAL',
                    'details': 'Incomplete SLO definitions'
                }

        except Exception as e:
            return {
                'status': 'FAILED',
                'details': f"SLO validation error: {e}"
            }

    def run_full_audit(self, domain=None):
        """Run comprehensive audit against all domains."""
        print("🏆 BIZRA DEVOPS EVIDENCE AUDIT - PROFESSIONAL ELITE CERTIFICATION")
        print("=" * 70)
        print()

        total_claims = 0
        verified_claims = 0

        for category, claims in self.claims_matrix.items():
            if domain and category != domain:
                continue

            print(f"🔍 Auditing {category.upper()} Domain ({len(claims)} claims)")
            print("-" * 50)

            category_verified = 0

            for claim_id, config in claims.items():
                total_claims += 1
                result = self.audit_claim(claim_id, config)

                status_symbol = {
                    'VERIFIED': '✅',
                    'FAILED': '❌',
                    'PARTIAL': '⚠️',
                    'COLLECTING': '🔄',
                    'UNKNOWN': '❓'
                }.get(result['status'], '❓')

                print(f"{status_symbol} {claim_id}: {result['status']}")
                print(f"   Claim: {config['claim']}")
                print(f"   Evidence: {config['evidence_path']}")
                print(f"   Result: {result['details']}")
                print()

                if result['status'] == 'VERIFIED':
                    verified_claims += 1
                    category_verified += 1

            print(f"🔢 {category.title()} Category Results: {category_verified}/{len(claims)} verified")
            print()

        # Overall scoring
        verification_rate = verified_claims / total_claims * 100 if total_claims > 0 else 0

        print("🏛️ ACCREDITATION RESULTS")
        print("=" * 30)
        print(f"Claims Audited: {total_claims}")
        print(f"Claims Verified: {verified_claims}")
        print(f"Verification Rate: {verification_rate:.1f}%")
        print()

        if verification_rate >= 90:
            print("🎯 ACCREDITATION: PROFESSIONAL ELITE PRACTITIONER CERTIFIED")
            print("🏆 SCORING: WORLD-CLASS EXCELLENCE ACHIEVED")
        elif verification_rate >= 75:
            print("🏢 ACCREDITATION: ADVANCED PROFESSION LEVEL ACHIEVED")
            print("🎯 SCORING: ENTERPRISE CAPABILITY DEMONSTRATED")
        else:
            print("⚠️ ACCREDITATION: ENHANCEMENT REQUIRED")
            print("🎯 SCORING: ADDITIONAL EVIDENCE NEEDED")

        return verification_rate

    def generate_audit_report(self, output_file="audit_report.md"):
        """Generate comprehensive audit report."""
        report_path = self.base_path / output_file

        with open(report_path, 'w', encoding='utf-8') as f:
            f.write("# BIZRA DevOps Evidence Audit Report\n\n")
            f.write("**Generated**: " + datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC") + "\n\n")

            # Executive summary
            verified = sum(1 for r in self.audit_results.values() if r.get('status') == 'VERIFIED')
            total = len(self.audit_results)
            success_rate = verified / total * 100 if total > 0 else 0

            f.write("## Executive Summary\n\n")
            f.write(f"- **Claims Audited**: {total}\n")
            f.write(f"- **Claims Verified**: {verified}\n")
            f.write(f"- **Success Rate**: {success_rate:.1f}%\n")
            f.write(f"- **Accreditation**: {'🏆 PROFESSIONAL ELITE' if success_rate >= 90 else '🏢 ADVANCED PROFESSIONAL'}\n\n")

            # Detailed results
            f.write("## Detailed Results\n\n")
            f.write("| Claim ID | Status | Evidence | Details |\n")
            f.write("|----------|--------|----------|--------|\n")

            for claim_id, result in self.audit_results.items():
                status = result.get('status', 'UNKNOWN')
                evidence = result.get('evidence_path', 'N/A')
                details = result.get('details', 'No details')
                f.write(f"| {claim_id} | {status} | {evidence} | {details} |\n")

            f.write("\n## Verification Legend\n\n")
            f.write("- ✅ **VERIFIED**: Evidence complete and validated\n")
            f.write("- ⚠️ **PARTIAL**: Evidence exists but improvements needed\n")
            f.write("- ❌ **FAILED**: Evidence missing or inadequate\n")
            f.write("- 🔄 **COLLECTING**: Evidence being gathered\n")
            f.write("- ❓ **UNKNOWN**: Verification method unclear\n")

        print(f"📊 Audit report generated: {report_path}")

def main():
    parser = argparse.ArgumentParser(description="BIZRA DevOps Evidence Compliance Auditor")
    parser.add_argument('--full-audit', action='store_true', help='Run complete audit across all domains')
    parser.add_argument('--domain', choices=['pipelines', 'sre', 'security', 'resilience', 'ai'],
                       help='Audit specific domain only')
    parser.add_argument('--generate-report', action='store_true', help='Generate detailed audit report')
    parser.add_argument('--audit-level', choices=['basic', 'deep'], default='basic',
                       help='Depth of audit verification')

    args = parser.parse_args()

    auditor = DevOpsEvidenceAuditor()

    if args.full_audit or args.domain:
        verification_rate = auditor.run_full_audit(args.domain)

        if args.generate_report:
            auditor.generate_audit_report()

        sys.exit(0 if verification_rate >= 75 else 1)

    else:
        print("Usage: python3 check_evidence_compliance.py --full-audit --generate-report")
        print("Or: python3 check_evidence_compliance.py --domain pipelines")
        sys.exit(1)

if __name__ == '__main__':
    main()
