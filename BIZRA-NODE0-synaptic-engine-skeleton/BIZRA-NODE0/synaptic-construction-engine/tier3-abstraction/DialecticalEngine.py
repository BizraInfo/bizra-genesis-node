"""DialecticalEngine
Generates thesis–antithesis–synthesis prompt patterns.
"""
from dataclasses import dataclass

@dataclass
class Dialectic:
    thesis: str
    antithesis: str
    synthesis: str

def make_dialectic(topic: str) -> Dialectic:
    return Dialectic(
        thesis=f"Thesis: {topic} should maximize rigor and safety.",
        antithesis=f"Antithesis: {topic} must remain flexible and creative.",
        synthesis=f"Synthesis: define invariants for safety; explore within safe bounds."
    )
