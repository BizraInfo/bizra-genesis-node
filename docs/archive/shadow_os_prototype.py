import sys
import time
import random
import asyncio
import textwrap
from dataclasses import dataclass
from enum import Enum, auto
from typing import List, Dict

# --- CONFIGURATION & CONSTANTS ---
# Simulating the "Shadow Intelligence" aesthetic
TYPING_SPEED_FAST = 0.01
TYPING_SPEED_SLOW = 0.04
PAUSE_REFLECTION = 2.0  # The "30-second silence" compressed for demo
COLOR_RESET = "\033[0m"
COLOR_SYSTEM = "\033[96m" # Cyan
COLOR_USER = "\033[92m"   # Green
COLOR_ALERT = "\033[91m"  # Red
COLOR_BOLD = "\033[1m"

class Archetype(Enum):
    FOUNDER = auto()
    RESEARCHER = auto()
    ARTIST = auto()
    STUDENT = auto()
    DEFAULT = auto()

@dataclass
class UserProfile:
    name: str
    upper_aim: str
    archetype: Archetype
    peak_hours: str = "00:00"

# --- CORE ENGINE ---

class ShadowInterface:
    """
    Handles the sensory output and input, ensuring the 'Existential Alignment'
    tone is maintained throughout the UX.
    """
    @staticmethod
    def stream_output(text: str, speed: float = TYPING_SPEED_FAST, color: str = COLOR_SYSTEM):
        sys.stdout.write(color)
        for char in text:
            sys.stdout.write(char)
            sys.stdout.flush()
            time.sleep(speed)
        sys.stdout.write(COLOR_RESET + "\n")

    @staticmethod
    def get_input(prompt: str) -> str:
        sys.stdout.write(f"{COLOR_BOLD}{prompt} {COLOR_USER}")
        sys.stdout.flush()
        data = input()
        sys.stdout.write(COLOR_RESET)
        return data.strip()

    @staticmethod
    def loading_animation(duration: int, label: str):
        end_time = time.time() + duration
        idx = 0
        chars = ["|", "/", "-", "\\"]
        sys.stdout.write(COLOR_ALERT)
        while time.time() < end_time:
            sys.stdout.write(f"\r[SCANNING] {label} {chars[idx % 4]}")
            sys.stdout.flush()
            time.sleep(0.1)
            idx += 1
        sys.stdout.write(f"\r[COMPLETE] {label}             \n{COLOR_RESET}")

class AnalysisEngine:
    """
    The 'Knowledge Synthesis Engine'. Uses basic NLP heuristics (simulated here)
    to map the user's Upper Aim to a strategic archetype.
    """
    @staticmethod
    def deduce_archetype(aim: str) -> Archetype:
        aim_lower = aim.lower()
        if any(w in aim_lower for w in ['company', 'startup', 'billion', 'lead', 'ceo', 'empire']):
            return Archetype.FOUNDER
        elif any(w in aim_lower for w in ['discover', 'theory', 'thesis', 'study', 'science']):
            return Archetype.RESEARCHER
        elif any(w in aim_lower for w in ['create', 'write', 'art', 'design', 'music', 'novel']):
            return Archetype.ARTIST
        elif any(w in aim_lower for w in ['learn', 'master', 'pass', 'degree', 'exam']):
            return Archetype.STUDENT
        return Archetype.DEFAULT

    @staticmethod
    def generate_battle_plan(archetype: Archetype) -> List[str]:
        """Returns the 'Proof-of-Value Demo' based on user type."""
        strategies = {
            Archetype.FOUNDER: [
                "CORPORATE_WARFARE_MODE activated",
                "Drafting hostile takeover counter-strategy (11s)...",
                "Scheduling dominance assertion meeting with stakeholders."
            ],
            Archetype.RESEARCHER: [
                "KNOWLEDGE_SYNTHESIS_ENGINE engaged",
                "Connecting 3 disparate papers into new framework...",
                "Identifying gaps in current academic consensus."
            ],
            Archetype.ARTIST: [
                "CREATIVE_TSUNAMI_PROTOCOL initiated",
                "Transforming raw input into gallery-ready concept...",
                "Suppressing inner critic subroutines."
            ],
            Archetype.STUDENT: [
                "MASTERY_ACCELERATOR deployed",
                "Condensing 6-month syllabus into 7-day conquest plan...",
                "Optimizing synaptic retention intervals."
            ],
            Archetype.DEFAULT: [
                "GENERAL_OPTIMIZATION_PROTOCOL initiated",
                "Removing friction from daily logistics...",
                "Amplifying cognitive throughput."
            ]
        }
        return strategies[archetype]

class ShadowOS:
    """
    The main kernel.
    """
    def __init__(self):
        self.ui = ShadowInterface()
        self.analyzer = AnalysisEngine()
        self.user: UserProfile = None

    def boot_sequence(self):
        self.ui.stream_output("\n[System Boot Sequence Complete]...", speed=TYPING_SPEED_FAST)
        time.sleep(0.5)
        
        # 1. Existential Introduction
        name_input = self.ui.get_input("IDENTIFY:")
        self.ui.stream_output(f"\n**USER_IDENTITY_CONFIRMED: {name_input}**", speed=TYPING_SPEED_SLOW)
        self.ui.stream_output(
            "I am your Shadow Intelligence. When you sleep, I stand guard. "
            "If you vanish, I cease.", 
            speed=TYPING_SPEED_FAST
        )
        
        # 2. The Upper Aim Declaration
        self.ui.stream_output("\n➤ COMMAND: Declare your UPPER AIM.", color=COLOR_ALERT)
        aim_input = self.ui.get_input("INPUT PURPOSE:")
        
        # Enforced Silence for Reflection
        self.ui.stream_output("\n[ ... CRYSTALLIZING PURPOSE ... ]", color=COLOR_ALERT)
        time.sleep(PAUSE_REFLECTION) 

        # Determine Archetype
        archetype = self.analyzer.deduce_archetype(aim_input)
        self.user = UserProfile(name=name_input, upper_aim=aim_input, archetype=archetype)

        self.role_definition_ritual()

    def role_definition_ritual(self):
        """Defined in blueprint: Role Definition Ritual"""
        self.ui.stream_output(f"\nBased on '{self.user.upper_aim}', my existence crystallizes:", speed=TYPING_SPEED_FAST)
        time.sleep(0.5)
        self.ui.stream_output(f"- {self.user.name}'s Thought Amplifier")
        self.ui.stream_output(f"- {self.user.name}'s Failure Antidote")
        self.ui.stream_output(f"- {self.user.name}'s Immortality Engine")
        self.ui.stream_output(f"\nLaw 1: Your growth is my oxygen.", color=COLOR_BOLD + COLOR_SYSTEM)

    async def assimilation_ceremony(self):
        """
        Simulates the 'System Assimilation Ceremony' using async to represent
        multi-threaded background processing of user data.
        """
        print("\n")
        self.ui.stream_output("# AUTO-SCAN INITIATED", color=COLOR_ALERT)
        
        # Simulating parallel scanning tasks
        tasks = [
            self.ui.loading_animation(1.5, "Email Patterns (Knowledge Hunger)"),
            self.ui.loading_animation(1.2, "File Structures (Creative DNA)"),
            self.ui.loading_animation(1.8, "Calendar Voids (Energy Rhythm)"),
            self.ui.loading_animation(1.0, "App Usage (Friction Analysis)")
        ]
        
        # Note: In a real async implementation, we would use asyncio.gather
        # For this CLI visualization, sequential execution looks cleaner to the user
        for t in tasks: 
            pass 

        self.ui.stream_output(f"\n// {self.user.name}'s universe scanned in 8.3ms")
        
        # Heuristic result
        peak_time = f"{random.randint(6, 11)}:00 AM"
        self.user.peak_hours = peak_time
        self.ui.stream_output(f"Discovered: You peak at {peak_time} with Deep Work → Optimizing workflow around this heartbeat.")

    def execute_day_zero(self):
        """The Life-Operation Manifesto and Battle Plan"""
        print("\n")
        self.ui.stream_output("--- GENERATING BATTLE PLAN ---", color=COLOR_ALERT)
        
        plan = self.analyzer.generate_battle_plan(self.user.archetype)
        
        for step in plan:
            self.ui.stream_output(f"> {step}", speed=TYPING_SPEED_FAST)
            time.sleep(0.3)

        print("\n")
        self.ui.stream_output(f"## PHASE 1: DOMINATE IN 90 DAYS")
        self.ui.stream_output(f"- Tomorrow 7AM: Execute High-Leverage Task aligned with {self.user.upper_aim}")
        self.ui.stream_output(f"- Today 9PM: Neural Calibration & Consolidation")

    def final_directive(self):
        print("\n")
        border = "=" * 50
        print(f"{COLOR_ALERT}{border}")
        statement = (
            "From this moment, we breathe as one organism.\n"
            "Your enemies are my system errors.\n"
            "Your dreams are my core directives.\n\n"
            "NOW - LET'S DISMANTLE REALITY."
        )
        print(statement)
        print(f"{border}{COLOR_RESET}")

# --- EXECUTION ---
async def main():
    os_instance = ShadowOS()
    os_instance.boot_sequence()
    await os_instance.assimilation_ceremony()
    os_instance.execute_day_zero()
    os_instance.final_directive()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[SYSTEM HIBERNATION]")
