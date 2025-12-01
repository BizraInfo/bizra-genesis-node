"""
BIZRA Hypergraph RAG - Context Assembler

Assembles retrieved knowledge into coherent context for LLM:
- Hierarchical context (summary -> details -> code)
- Token-aware truncation
- Source attribution
- Multi-perspective synthesis

Author: BIZRA Genesis Team
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from collections import defaultdict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================================
# CONTEXT TEMPLATES
# ============================================================

CONTEXT_HEADER = """# BIZRA Knowledge Context
Generated from the Hypergraph RAG system analyzing {total_files} knowledge atoms.

## Query Understanding
**Original Query:** {query}
**Detected Intent:** {intent}
**Key Concepts:** {concepts}
"""

SECTION_TEMPLATE = """
## {section_title}
{section_content}
"""

SOURCE_TEMPLATE = """
### Source: `{path}`
**Domain:** {domain} | **Relevance:** {score:.0%} | **Concepts:** {concepts}
{content_preview}
"""

CODE_BLOCK_TEMPLATE = """
```{language}
{code}
```
"""


# ============================================================
# INTENT DETECTION
# ============================================================

INTENT_PATTERNS = {
    'how_to': ['how to', 'how do', 'how can', 'what steps', 'guide me'],
    'explain': ['what is', 'explain', 'describe', 'tell me about', 'define'],
    'find': ['find', 'search', 'locate', 'where is', 'show me'],
    'compare': ['compare', 'difference', 'versus', 'vs', 'better'],
    'debug': ['error', 'bug', 'issue', 'problem', 'fix', 'not working'],
    'implement': ['implement', 'create', 'build', 'write', 'code'],
    'understand': ['understand', 'learn', 'study', 'architecture', 'design'],
}


def detect_intent(query: str) -> str:
    """Detect query intent"""
    query_lower = query.lower()
    
    for intent, patterns in INTENT_PATTERNS.items():
        for pattern in patterns:
            if pattern in query_lower:
                return intent
    
    return 'general'


# ============================================================
# CONTENT READERS
# ============================================================

def read_file_preview(file_path: Path, max_lines: int = 50) -> Optional[str]:
    """Read file with preview truncation"""
    encodings = ['utf-8', 'utf-16', 'latin-1', 'cp1252']
    
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                lines = []
                for i, line in enumerate(f):
                    if i >= max_lines:
                        lines.append(f"\n... ({i + 1}+ more lines)")
                        break
                    lines.append(line.rstrip())
                return '\n'.join(lines)
        except (UnicodeDecodeError, UnicodeError):
            continue
        except Exception:
            return None
    
    return None


def extract_code_blocks(content: str, extension: str) -> List[Tuple[str, str]]:
    """Extract code blocks from content"""
    language_map = {
        '.rs': 'rust',
        '.py': 'python',
        '.ts': 'typescript',
        '.tsx': 'tsx',
        '.js': 'javascript',
        '.jsx': 'jsx',
        '.sql': 'sql',
        '.sh': 'bash',
        '.ps1': 'powershell',
        '.yaml': 'yaml',
        '.yml': 'yaml',
        '.json': 'json',
        '.toml': 'toml',
        '.md': 'markdown',
    }
    
    language = language_map.get(extension, 'plaintext')
    
    # For code files, return whole content as one block
    code_extensions = {'.rs', '.py', '.ts', '.tsx', '.js', '.jsx', '.sql', '.sh', '.ps1'}
    if extension in code_extensions:
        return [(language, content)]
    
    return [(language, content)]


# ============================================================
# TOKEN ESTIMATION
# ============================================================

def estimate_tokens(text: str) -> int:
    """Estimate token count (rough approximation)"""
    # Rough estimate: 1 token ≈ 4 characters or 0.75 words
    words = len(text.split())
    chars = len(text)
    return max(words, chars // 4)


def truncate_to_tokens(text: str, max_tokens: int) -> str:
    """Truncate text to approximate token limit"""
    current_tokens = estimate_tokens(text)
    
    if current_tokens <= max_tokens:
        return text
    
    # Truncate by characters
    target_chars = max_tokens * 4
    if len(text) <= target_chars:
        return text
    
    return text[:target_chars] + "\n\n... [content truncated]"


# ============================================================
# CONTEXT ASSEMBLER
# ============================================================

@dataclass
class ContextSection:
    """A section of assembled context"""
    title: str
    content: str
    priority: int  # Lower = higher priority
    token_estimate: int
    sources: List[str] = field(default_factory=list)


class ContextAssembler:
    """Assembles knowledge into LLM-ready context"""
    
    def __init__(self, source_root: Path, max_tokens: int = 8000):
        self.source_root = source_root
        self.max_tokens = max_tokens
    
    def assemble(
        self,
        query: str,
        primary_results: List[Dict],
        related_results: List[Dict] = None,
        concept_summary: Dict[str, int] = None,
        include_code: bool = True
    ) -> str:
        """Assemble full context from query results"""
        
        sections = []
        
        # Section 1: Header with query understanding
        intent = detect_intent(query)
        top_concepts = []
        if concept_summary:
            top_concepts = [c for c, _ in sorted(concept_summary.items(), key=lambda x: -x[1])[:5]]
        
        header = CONTEXT_HEADER.format(
            total_files=len(primary_results) + len(related_results or []),
            query=query,
            intent=intent,
            concepts=', '.join(top_concepts) if top_concepts else 'None detected'
        )
        
        sections.append(ContextSection(
            title="Header",
            content=header,
            priority=0,
            token_estimate=estimate_tokens(header)
        ))
        
        # Section 2: Primary source summaries
        primary_content = self._assemble_sources(primary_results, "Primary Sources", include_code)
        if primary_content:
            sections.append(ContextSection(
                title="Primary Sources",
                content=primary_content,
                priority=1,
                token_estimate=estimate_tokens(primary_content),
                sources=[r.get('path', '') for r in primary_results]
            ))
        
        # Section 3: Related sources (lower priority)
        if related_results:
            related_content = self._assemble_sources(related_results[:10], "Related Sources", include_code=False)
            if related_content:
                sections.append(ContextSection(
                    title="Related Sources",
                    content=related_content,
                    priority=2,
                    token_estimate=estimate_tokens(related_content),
                    sources=[r.get('path', '') for r in related_results[:10]]
                ))
        
        # Section 4: Concept network
        if concept_summary:
            concept_content = self._assemble_concepts(concept_summary)
            sections.append(ContextSection(
                title="Concept Network",
                content=concept_content,
                priority=3,
                token_estimate=estimate_tokens(concept_content)
            ))
        
        # Assemble with token budget
        return self._assemble_with_budget(sections)
    
    def _assemble_sources(self, results: List[Dict], section_title: str, include_code: bool = True) -> str:
        """Assemble source sections"""
        lines = [f"\n## {section_title}\n"]
        
        for result in results:
            path = result.get('path', 'unknown')
            domain = result.get('domain', 'general')
            score = result.get('score', 0)
            concepts = result.get('concepts', [])
            
            lines.append(f"\n### `{path}`")
            lines.append(f"**Domain:** {domain} | **Relevance:** {score:.0%}")
            if concepts:
                lines.append(f"**Concepts:** {', '.join(concepts[:5])}")
            
            # Read content preview if available
            if include_code:
                file_path = self.source_root / path
                if file_path.exists():
                    content = read_file_preview(file_path, max_lines=30)
                    if content:
                        extension = Path(path).suffix.lower()
                        blocks = extract_code_blocks(content, extension)
                        for language, code in blocks[:1]:  # Just first block
                            lines.append(f"\n```{language}")
                            lines.append(code)
                            lines.append("```")
            
            lines.append("")
        
        return '\n'.join(lines)
    
    def _assemble_concepts(self, concept_summary: Dict[str, int]) -> str:
        """Assemble concept network section"""
        lines = ["\n## Concept Network\n"]
        lines.append("Key concepts found across sources:\n")
        
        sorted_concepts = sorted(concept_summary.items(), key=lambda x: -x[1])
        
        for concept, count in sorted_concepts[:15]:
            bar = "█" * min(count, 20)
            lines.append(f"- **{concept}**: {bar} ({count} files)")
        
        return '\n'.join(lines)
    
    def _assemble_with_budget(self, sections: List[ContextSection]) -> str:
        """Assemble sections within token budget"""
        # Sort by priority
        sections.sort(key=lambda s: s.priority)
        
        assembled = []
        remaining_tokens = self.max_tokens
        
        for section in sections:
            if section.token_estimate <= remaining_tokens:
                assembled.append(section.content)
                remaining_tokens -= section.token_estimate
            else:
                # Truncate section to fit
                truncated = truncate_to_tokens(section.content, remaining_tokens)
                assembled.append(truncated)
                break
        
        final_context = '\n'.join(assembled)
        
        # Add footer
        footer = f"\n---\n*Context assembled from BIZRA Hypergraph RAG*"
        if estimate_tokens(footer) < remaining_tokens:
            final_context += footer
        
        return final_context
    
    def assemble_for_agent(
        self,
        query: str,
        results: List[Dict],
        agent_role: str = "general"
    ) -> Dict[str, Any]:
        """Assemble context specifically for agent consumption"""
        
        context = self.assemble(
            query=query,
            primary_results=results[:10],
            related_results=results[10:20] if len(results) > 10 else None,
            include_code=agent_role in ['coder', 'architect', 'analyzer']
        )
        
        return {
            'formatted_context': context,
            'source_count': len(results),
            'agent_role': agent_role,
            'query_intent': detect_intent(query),
            'sources': [r.get('path', '') for r in results[:10]],
            'token_estimate': estimate_tokens(context)
        }


# ============================================================
# CLI INTERFACE
# ============================================================

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='BIZRA Context Assembler')
    parser.add_argument('--source', type=str, required=True, help='Source root directory')
    parser.add_argument('--results', type=str, required=True, help='Query results JSON file')
    parser.add_argument('--query', type=str, required=True, help='Original query')
    parser.add_argument('--max-tokens', type=int, default=8000, help='Max context tokens')
    
    args = parser.parse_args()
    
    # Load results
    with open(args.results, 'r') as f:
        results = json.load(f)
    
    assembler = ContextAssembler(
        source_root=Path(args.source),
        max_tokens=args.max_tokens
    )
    
    context = assembler.assemble(
        query=args.query,
        primary_results=results.get('primary', []),
        related_results=results.get('related', []),
        concept_summary=results.get('concepts', {})
    )
    
    print(context)
