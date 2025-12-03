import os
import json
import time
from pathlib import Path
from typing import List, Dict, Any

# --- CONFIGURATION ---
ROOT_DIR = Path("C:/award-winner-design")
KNOWLEDGE_DIR = ROOT_DIR / "bizra-genesis-node/knowledge"
EXTENSIONS_OF_INTEREST = {
    '.md': 'Documentation',
    '.txt': 'Notes',
    '.pdf': 'Documents',
    '.ts': 'Code (TypeScript)',
    '.tsx': 'Code (React)',
    '.rs': 'Code (Rust)',
    '.py': 'Code (Python)',
    '.json': 'Data',
    '.html': 'Design'
}

class AssetMiner:
    def __init__(self):
        self.assets: List[Dict[str, Any]] = []
        self.stats = {ext: 0 for ext in EXTENSIONS_OF_INTEREST}
        self.total_size = 0
        self.start_time = time.time()

    def scan_directory(self, path: Path):
        """Recursively scans the directory for valuable assets."""
        print(f"Scanning: {path}")
        try:
            for entry in os.scandir(path):
                if entry.is_dir():
                    if entry.name.startswith('.') or entry.name == 'node_modules' or entry.name == 'target':
                        continue  # Skip system/build folders
                    self.scan_directory(Path(entry.path))
                elif entry.is_file():
                    self._process_file(Path(entry.path))
        except PermissionError:
            print(f"Permission denied: {path}")

    def _process_file(self, file_path: Path):
        """Analyzes a single file to determine its asset value."""
        ext = file_path.suffix.lower()
        if ext in EXTENSIONS_OF_INTEREST:
            try:
                stats = file_path.stat()
                size = stats.st_size
                modified = stats.st_mtime
                
                asset = {
                    "name": file_path.name,
                    "path": str(file_path),
                    "type": EXTENSIONS_OF_INTEREST[ext],
                    "size_bytes": size,
                    "modified_timestamp": modified,
                    "value_score": self._calculate_value_score(file_path, size)
                }
                
                self.assets.append(asset)
                self.stats[ext] += 1
                self.total_size += size
                
            except Exception as e:
                print(f"Error processing {file_path}: {e}")

    def _calculate_value_score(self, path: Path, size: int) -> int:
        """Heuristic to estimate the 'value' of a file."""
        score = 1
        name = path.name.lower()
        
        # High value keywords
        if 'architecture' in name: score += 5
        if 'roadmap' in name: score += 5
        if 'plan' in name: score += 3
        if 'api' in name: score += 3
        if 'secret' in name or 'key' in name: score += 10 # Security risk, but high value
        
        # Code is valuable
        if path.suffix in ['.ts', '.rs', '.py']: score += 2
        
        return score

    def save_report(self):
        """Saves the asset inventory to a JSON file."""
        report = {
            "scan_timestamp": time.time(),
            "duration_seconds": time.time() - self.start_time,
            "total_assets_found": len(self.assets),
            "total_size_bytes": self.total_size,
            "asset_breakdown": self.stats,
            "top_valuable_assets": sorted(self.assets, key=lambda x: x['value_score'], reverse=True)[:20],
            "inventory": self.assets
        }
        
        output_path = KNOWLEDGE_DIR / "ASSET_INVENTORY.json"
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2)
            
        print(f"\n--- SCAN COMPLETE ---")
        print(f"Assets Found: {len(self.assets)}")
        print(f"Total Size: {self.total_size / (1024*1024):.2f} MB")
        print(f"Report saved to: {output_path}")

if __name__ == "__main__":
    print("--- BIZRA ASSET MINER v1.0 ---")
    print("Initializing Gold Mine Activation Protocol...")
    
    miner = AssetMiner()
    
    # Ensure knowledge dir exists
    KNOWLEDGE_DIR.mkdir(parents=True, exist_ok=True)
    
    # Start Scan
    miner.scan_directory(ROOT_DIR)
    
    # Save Results
    miner.save_report()
