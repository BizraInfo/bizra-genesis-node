"""TensionExplorer
Identifies logic vs creativity trade-offs; emits Pareto design points.
"""
from typing import List, Dict

def pareto(points: List[Dict[str, float]], x="structure", y="novelty") -> List[Dict[str, float]]:
    # Simple Pareto filter for illustration
    frontier = []
    for p in points:
        if not any((q[x] >= p[x] and q[y] >= p[y] and (q[x] > p[x] or q[y] > p[y])) for q in points):
            frontier.append(p)
    return frontier
