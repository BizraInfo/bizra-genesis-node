#!/usr/bin/env python3
"""
BIZRA DATA REFINERY v1.0
========================
Transforms raw documentation into a searchable knowledge base.
This script ingests high-value assets and creates embeddings for RAG.
"""

import os
import json
import hashlib
from pathlib import Path
from typing import List, Dict, Any

# --- CONFIGURATION ---
KNOWLEDGE_DIR = Path(__file__).parent
WORKSPACE_ROOT = KNOWLEDGE_DIR.parent.parent
INVENTORY_FILE = KNOWLEDGE_DIR / "ASSET_INVENTORY.json"
REFINED_OUTPUT = KNOWLEDGE_DIR / "REFINED_KNOWLEDGE_BASE.json"

# Priority files to ingest (from the audit)
PRIORITY_ASSETS = [
    "ARCHITECTURE.md",
    "BIZRA_AI_ROADMAP.md",
    "001-sovereign-ai-architecture.md",
    "002-pat-agent-architecture.md",
    "BIZRA-NODE0-ARCHITECTURE-v1.0.1.md",
    "FRONTEND_ARCHITECTURE.md",
    "ELITE_ASSET_MANAGEMENT_PROTOCOL.md",
    "ELITE_DEVOPS_IMPLEMENTATION_SUMMARY.md",
    "PEAK_MASTERPIECE_SUMMARY.md",
    "README.md",
    "QUICKSTART.md",
    "SECURITY.md",
]

class DataRefinery:
    """
    The Refinery takes raw documentation and transforms it into
    structured, searchable knowledge chunks.
    """
    
    def __init__(self):
        self.chunks: List[Dict[str, Any]] = []
        self.processed_files = 0
        self.total_chars = 0
        
    def load_inventory(self) -> List[Dict]:
        """Load the asset inventory from the audit."""
        if not INVENTORY_FILE.exists():
            print("ERROR: Asset inventory not found. Run ingest_assets.py first.")
            return []
        with open(INVENTORY_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data.get('inventory', [])
    
    def should_process(self, asset: Dict) -> bool:
        """Determine if an asset should be processed based on priority."""
        name = asset.get('name', '')
        # Process all markdown files, prioritize known high-value ones
        if asset.get('type') == 'Documentation':
            return True
        # Also process key TypeScript files
        if name in ['api.ts', 'installer-service.ts', 'model-registry.ts']:
            return True
        return False
    
    def chunk_document(self, content: str, source_path: str, chunk_size: int = 1000) -> List[Dict]:
        """
        Split a document into semantic chunks for embedding.
        Uses heading-aware chunking for markdown files.
        """
        chunks = []
        
        # Split by markdown headers for better semantic chunking
        if source_path.endswith('.md'):
            sections = self._split_by_headers(content)
        else:
            sections = [{'title': 'Main', 'content': content}]
        
        for section in sections:
            section_content = section['content']
            section_title = section['title']
            
            # Further split large sections
            if len(section_content) > chunk_size:
                sub_chunks = self._split_into_paragraphs(section_content, chunk_size)
                for i, sub_chunk in enumerate(sub_chunks):
                    chunk_id = self._generate_chunk_id(source_path, section_title, i)
                    chunks.append({
                        'id': chunk_id,
                        'source': source_path,
                        'section': section_title,
                        'content': sub_chunk.strip(),
                        'char_count': len(sub_chunk)
                    })
            else:
                chunk_id = self._generate_chunk_id(source_path, section_title, 0)
                chunks.append({
                    'id': chunk_id,
                    'source': source_path,
                    'section': section_title,
                    'content': section_content.strip(),
                    'char_count': len(section_content)
                })
        
        return chunks
    
    def _split_by_headers(self, content: str) -> List[Dict]:
        """Split markdown content by headers."""
        lines = content.split('\n')
        sections = []
        current_section = {'title': 'Introduction', 'content': ''}
        
        for line in lines:
            if line.startswith('#'):
                # Save previous section if it has content
                if current_section['content'].strip():
                    sections.append(current_section)
                # Start new section
                title = line.lstrip('#').strip()
                current_section = {'title': title, 'content': ''}
            else:
                current_section['content'] += line + '\n'
        
        # Don't forget the last section
        if current_section['content'].strip():
            sections.append(current_section)
        
        return sections if sections else [{'title': 'Main', 'content': content}]
    
    def _split_into_paragraphs(self, content: str, max_size: int) -> List[str]:
        """Split content into paragraph-sized chunks."""
        paragraphs = content.split('\n\n')
        chunks = []
        current_chunk = ""
        
        for para in paragraphs:
            if len(current_chunk) + len(para) < max_size:
                current_chunk += para + '\n\n'
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                current_chunk = para + '\n\n'
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks
    
    def _generate_chunk_id(self, path: str, section: str, index: int) -> str:
        """Generate a unique ID for a chunk."""
        raw = f"{path}:{section}:{index}"
        return hashlib.md5(raw.encode()).hexdigest()[:12]
    
    def process_asset(self, asset: Dict) -> int:
        """Process a single asset and add its chunks to the knowledge base."""
        path = asset.get('path', '')
        if not path or not os.path.exists(path):
            return 0
        
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            if not content.strip():
                return 0
            
            chunks = self.chunk_document(content, path)
            self.chunks.extend(chunks)
            self.processed_files += 1
            self.total_chars += len(content)
            
            return len(chunks)
        except Exception as e:
            print(f"  [ERROR] Failed to process {path}: {e}")
            return 0
    
    def run(self):
        """Execute the full refinery pipeline."""
        print("=" * 60)
        print("  BIZRA DATA REFINERY v1.0")
        print("  Transforming Raw Data into Knowledge")
        print("=" * 60)
        
        inventory = self.load_inventory()
        if not inventory:
            return
        
        print(f"\n📦 Loaded {len(inventory)} assets from inventory.")
        print("🔥 Starting refinement process...\n")
        
        # Process priority assets first
        priority_processed = set()
        for asset in inventory:
            name = asset.get('name', '')
            if name in PRIORITY_ASSETS:
                print(f"  [PRIORITY] Processing: {name}")
                count = self.process_asset(asset)
                print(f"            → Generated {count} knowledge chunks")
                priority_processed.add(name)
        
        # Then process remaining documentation
        print("\n📄 Processing remaining documentation...")
        for asset in inventory:
            name = asset.get('name', '')
            if name not in priority_processed and self.should_process(asset):
                print(f"  [STANDARD] Processing: {name}")
                count = self.process_asset(asset)
                if count > 0:
                    print(f"            → Generated {count} chunks")
        
        # Save the refined knowledge base
        self._save_knowledge_base()
        
        # Print summary
        self._print_summary()
    
    def _save_knowledge_base(self):
        """Save the refined knowledge base to disk."""
        output = {
            'version': '1.0',
            'total_chunks': len(self.chunks),
            'total_files': self.processed_files,
            'total_characters': self.total_chars,
            'chunks': self.chunks
        }
        
        with open(REFINED_OUTPUT, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Knowledge base saved to: {REFINED_OUTPUT}")
    
    def _print_summary(self):
        """Print a summary of the refinement process."""
        print("\n" + "=" * 60)
        print("  REFINERY COMPLETE")
        print("=" * 60)
        print(f"  📁 Files Processed:    {self.processed_files}")
        print(f"  🧩 Chunks Generated:   {len(self.chunks)}")
        print(f"  📊 Total Characters:   {self.total_chars:,}")
        print(f"  💾 Output File:        REFINED_KNOWLEDGE_BASE.json")
        print("=" * 60)
        print("\n🚀 NEXT STEP: Connect this to Bizra Chat for RAG queries.")


if __name__ == "__main__":
    refinery = DataRefinery()
    refinery.run()
