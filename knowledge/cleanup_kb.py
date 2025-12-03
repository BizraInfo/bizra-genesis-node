#!/usr/bin/env python3
"""
BIZRA Knowledge Base Cleanup Utility
=====================================
Removes empty content chunks, deduplicates, and optimizes the knowledge base.
"""

import json
from pathlib import Path
from datetime import datetime
import hashlib

KNOWLEDGE_ROOT = Path(__file__).parent
KB_PATH = KNOWLEDGE_ROOT / "REFINED_KNOWLEDGE_BASE.json"
BACKUP_PATH = KNOWLEDGE_ROOT / f"REFINED_KNOWLEDGE_BASE.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"


def cleanup_empty_chunks():
    """Remove chunks with empty or whitespace-only content and deduplicate."""
    print("🧹 BIZRA Knowledge Base Cleanup Utility")
    print("-" * 50)
    
    if not KB_PATH.exists():
        print("❌ Knowledge base not found!")
        return False
    
    # Load knowledge base
    with open(KB_PATH, 'r', encoding='utf-8') as f:
        kb = json.load(f)
    
    original_count = len(kb.get("chunks", []))
    print(f"📊 Original chunk count: {original_count}")
    
    # Create backup
    print(f"💾 Creating backup: {BACKUP_PATH.name}")
    with open(BACKUP_PATH, 'w', encoding='utf-8') as f:
        json.dump(kb, f, indent=2, ensure_ascii=False)
    
    # Step 1: Filter out empty chunks
    valid_chunks = []
    removed_empty = []
    
    for chunk in kb.get("chunks", []):
        content = chunk.get("content", "").strip()
        if content:
            valid_chunks.append(chunk)
        else:
            removed_empty.append(chunk.get("id", "unknown"))
    
    print(f"   Removed {len(removed_empty)} empty chunks")
    
    # Step 2: Deduplicate by ID (keep first occurrence)
    seen_ids = set()
    deduplicated_chunks = []
    duplicate_ids = []
    
    for chunk in valid_chunks:
        chunk_id = chunk.get("id", "")
        if chunk_id not in seen_ids:
            seen_ids.add(chunk_id)
            deduplicated_chunks.append(chunk)
        else:
            duplicate_ids.append(chunk_id)
    
    print(f"   Removed {len(duplicate_ids)} duplicate chunks")
    
    # Step 3: Regenerate IDs for any that are still duplicate
    final_chunks = []
    final_ids = set()
    
    for chunk in deduplicated_chunks:
        chunk_id = chunk.get("id", "")
        if chunk_id in final_ids or not chunk_id:
            # Generate new unique ID based on content hash
            content_hash = hashlib.md5(chunk.get("content", "").encode()).hexdigest()[:12]
            new_id = f"{content_hash}_{len(final_ids)}"
            chunk["id"] = new_id
            chunk_id = new_id
        
        final_ids.add(chunk_id)
        final_chunks.append(chunk)
    
    # Update knowledge base
    kb["chunks"] = final_chunks
    kb["total_chunks"] = len(final_chunks)
    kb["cleanup_timestamp"] = datetime.now().isoformat()
    kb["cleanup_removed_empty"] = len(removed_empty)
    kb["cleanup_removed_duplicates"] = len(duplicate_ids)
    
    # Save cleaned knowledge base
    with open(KB_PATH, 'w', encoding='utf-8') as f:
        json.dump(kb, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Cleanup complete!")
    print(f"   Final chunk count: {len(final_chunks)}")
    print(f"   Total removed: {original_count - len(final_chunks)}")
    
    return True


def validate_knowledge_base():
    """Validate knowledge base integrity after cleanup."""
    print("\n🔍 Validating knowledge base...")
    
    with open(KB_PATH, 'r', encoding='utf-8') as f:
        kb = json.load(f)
    
    chunks = kb.get("chunks", [])
    total_claimed = kb.get("total_chunks", 0)
    
    errors = []
    
    # Check chunk count
    if len(chunks) != total_claimed:
        errors.append(f"Chunk count mismatch: claimed {total_claimed}, actual {len(chunks)}")
    
    # Check for required fields
    for i, chunk in enumerate(chunks):
        if "id" not in chunk:
            errors.append(f"Chunk {i}: missing 'id' field")
        if "content" not in chunk:
            errors.append(f"Chunk {i}: missing 'content' field")
        if "source" not in chunk:
            errors.append(f"Chunk {i}: missing 'source' field")
    
    # Check for duplicates
    ids = [c.get("id") for c in chunks]
    duplicates = set([x for x in ids if ids.count(x) > 1])
    if duplicates:
        errors.append(f"Duplicate IDs found: {duplicates}")
    
    if errors:
        print("❌ Validation errors:")
        for error in errors:
            print(f"   - {error}")
        return False
    else:
        print("✅ Knowledge base validation passed!")
        print(f"   Total chunks: {len(chunks)}")
        print(f"   All required fields present")
        print(f"   No duplicate IDs")
        return True


if __name__ == "__main__":
    cleanup_empty_chunks()
    validate_knowledge_base()
