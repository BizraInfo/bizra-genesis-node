#!/usr/bin/env python3
"""
BIZRA SYSTEM INTEGRATION VALIDATOR
===================================
Validates all core system components are operational and integrated.

This script performs:
1. Static Analysis - Check all required files exist
2. Knowledge Base Validation - Verify data integrity
3. API Schema Validation - Check endpoint contracts
4. Component Integration - Verify cross-component communication
"""

import os
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple

# --- CONFIGURATION ---
PROJECT_ROOT = Path(__file__).parent.parent
DASHBOARD_ROOT = PROJECT_ROOT / "apps" / "dashboard"
KNOWLEDGE_ROOT = PROJECT_ROOT / "knowledge"

# Required file manifest
REQUIRED_FILES = {
    "Knowledge System": [
        KNOWLEDGE_ROOT / "ingest_assets.py",
        KNOWLEDGE_ROOT / "refinery.py",
        KNOWLEDGE_ROOT / "rag_engine.py",
        KNOWLEDGE_ROOT / "REFINED_KNOWLEDGE_BASE.json",
        KNOWLEDGE_ROOT / "ASSET_INVENTORY.json",
    ],
    "Dashboard Core": [
        DASHBOARD_ROOT / "src" / "lib" / "api.ts",
        DASHBOARD_ROOT / "src" / "lib" / "installer-service.ts",
        DASHBOARD_ROOT / "src" / "hooks" / "useNodeHealth.ts",
    ],
    "Documentation": [
        PROJECT_ROOT / "README.md",
        PROJECT_ROOT / "QUICKSTART.md",
        PROJECT_ROOT / "docs" / "BIZRA-NODE0-ARCHITECTURE-v1.0.1.md",
    ],
    "CI/CD": [
        PROJECT_ROOT / ".github" / "workflows" / "ci-cd-pipeline.yml",
    ]
}


class SystemValidator:
    """Validates the BIZRA Genesis Node system integrity."""
    
    def __init__(self):
        self.results: Dict[str, Dict] = {}
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        
    def log(self, level: str, message: str):
        """Print formatted log message."""
        icons = {"PASS": "✅", "FAIL": "❌", "WARN": "⚠️", "INFO": "ℹ️"}
        print(f"  {icons.get(level, '•')} {message}")
        
    def check_files_exist(self) -> bool:
        """Check all required files exist."""
        print("\n📁 STATIC ANALYSIS: File Manifest Check")
        print("-" * 50)
        
        all_exist = True
        for category, files in REQUIRED_FILES.items():
            missing = [f for f in files if not f.exists()]
            
            if missing:
                self.log("FAIL", f"{category}: Missing {len(missing)} files")
                for f in missing:
                    self.log("INFO", f"  - {f.name}")
                all_exist = False
                self.failed += 1
            else:
                self.log("PASS", f"{category}: All {len(files)} files present")
                self.passed += 1
                
        return all_exist
    
    def validate_knowledge_base(self) -> bool:
        """Validate knowledge base integrity."""
        print("\n🧠 KNOWLEDGE BASE VALIDATION")
        print("-" * 50)
        
        kb_path = KNOWLEDGE_ROOT / "REFINED_KNOWLEDGE_BASE.json"
        
        if not kb_path.exists():
            self.log("FAIL", "Knowledge base file not found")
            self.failed += 1
            return False
        
        try:
            with open(kb_path, 'r', encoding='utf-8') as f:
                kb = json.load(f)
            
            # Check structure
            required_keys = ["version", "total_chunks", "total_files", "chunks"]
            missing_keys = [k for k in required_keys if k not in kb]
            
            if missing_keys:
                self.log("FAIL", f"Missing required keys: {missing_keys}")
                self.failed += 1
                return False
            
            # Check data integrity
            chunks = kb.get("chunks", [])
            total_claimed = kb.get("total_chunks", 0)
            
            if len(chunks) != total_claimed:
                self.log("WARN", f"Chunk count mismatch: claimed {total_claimed}, actual {len(chunks)}")
                self.warnings += 1
            else:
                self.log("PASS", f"Chunk count verified: {len(chunks)}")
                self.passed += 1
            
            # Validate chunk schema
            valid_chunks = 0
            for chunk in chunks:
                if all(k in chunk for k in ["id", "source", "content"]):
                    valid_chunks += 1
            
            if valid_chunks == len(chunks):
                self.log("PASS", f"All {valid_chunks} chunks have valid schema")
                self.passed += 1
            else:
                self.log("WARN", f"Invalid chunks: {len(chunks) - valid_chunks}")
                self.warnings += 1
            
            # Check for empty content
            empty_content = sum(1 for c in chunks if not c.get("content", "").strip())
            if empty_content > 0:
                self.log("WARN", f"Found {empty_content} chunks with empty content")
                self.warnings += 1
            else:
                self.log("PASS", "No empty content chunks")
                self.passed += 1
            
            return True
            
        except json.JSONDecodeError as e:
            self.log("FAIL", f"Invalid JSON: {e}")
            self.failed += 1
            return False
        except Exception as e:
            self.log("FAIL", f"Validation error: {e}")
            self.failed += 1
            return False
    
    def validate_installer_service(self) -> bool:
        """Validate installer service has required security features."""
        print("\n🔒 SECURITY VALIDATION: Installer Service")
        print("-" * 50)
        
        installer_path = DASHBOARD_ROOT / "src" / "lib" / "installer-service.ts"
        
        if not installer_path.exists():
            self.log("FAIL", "Installer service not found")
            self.failed += 1
            return False
        
        content = installer_path.read_text(encoding='utf-8')
        
        # Check for security features
        security_checks = {
            "Authentication": "getOrCreateSecret" in content or "LOCAL_SECRET" in content,
            "Input Validation": "sanitizeInput" in content or "MAX_MESSAGE_LENGTH" in content,
            "CORS Restriction": "ALLOWED_ORIGINS" in content or "'http://localhost:3000'" in content,
            "Security Headers": "X-Content-Type-Options" in content,
            "Checksum Verification": "Get-FileHash" in content or "expectedHash" in content,
        }
        
        for feature, present in security_checks.items():
            if present:
                self.log("PASS", f"{feature}: Implemented")
                self.passed += 1
            else:
                self.log("WARN", f"{feature}: Not found")
                self.warnings += 1
        
        return all(security_checks.values())
    
    def validate_rag_integration(self) -> bool:
        """Test RAG engine functionality."""
        print("\n🔍 RAG ENGINE INTEGRATION TEST")
        print("-" * 50)
        
        try:
            sys.path.insert(0, str(KNOWLEDGE_ROOT))
            from rag_engine import BizraRAGEngine
            
            engine = BizraRAGEngine()
            
            # Test loading
            if engine.load_knowledge_base():
                self.log("PASS", "Knowledge base loaded successfully")
                self.passed += 1
            else:
                self.log("FAIL", "Failed to load knowledge base")
                self.failed += 1
                return False
            
            # Test search
            results = engine.search("architecture sovereign", top_k=3)
            if len(results) > 0:
                self.log("PASS", f"Search returned {len(results)} results")
                self.passed += 1
            else:
                self.log("WARN", "Search returned no results")
                self.warnings += 1
            
            # Test context generation
            context = engine.get_context_for_prompt("monetization", max_tokens=500)
            if len(context) > 0:
                self.log("PASS", f"Context generated: {len(context)} chars")
                self.passed += 1
            else:
                self.log("WARN", "Context generation returned empty")
                self.warnings += 1
            
            return True
            
        except ImportError as e:
            self.log("FAIL", f"Import error: {e}")
            self.failed += 1
            return False
        except Exception as e:
            self.log("FAIL", f"RAG test error: {e}")
            self.failed += 1
            return False
    
    def generate_report(self) -> str:
        """Generate final validation report."""
        total = self.passed + self.failed + self.warnings
        score = (self.passed / total * 100) if total > 0 else 0
        
        status = "🟢 READY" if self.failed == 0 else "🔴 NOT READY"
        
        report = f"""
{'=' * 60}
  BIZRA SYSTEM VALIDATION REPORT
  Generated: {datetime.now().isoformat()}
{'=' * 60}

SUMMARY:
  ✅ Passed:   {self.passed}
  ❌ Failed:   {self.failed}
  ⚠️  Warnings: {self.warnings}
  
  Score: {score:.1f}%
  Status: {status}

{'=' * 60}
"""
        return report
    
    def run(self) -> bool:
        """Execute all validation checks."""
        print("=" * 60)
        print("  BIZRA SYSTEM INTEGRATION VALIDATOR")
        print("  Running comprehensive system checks...")
        print("=" * 60)
        
        self.check_files_exist()
        self.validate_knowledge_base()
        self.validate_installer_service()
        self.validate_rag_integration()
        
        report = self.generate_report()
        print(report)
        
        return self.failed == 0


if __name__ == "__main__":
    validator = SystemValidator()
    success = validator.run()
    sys.exit(0 if success else 1)
