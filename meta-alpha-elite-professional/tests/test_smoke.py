
import subprocess, sys, os, pathlib
def test_self():
    repo = pathlib.Path(__file__).resolve().parents[1]
    proc = subprocess.run([sys.executable, "core/meta_alpha_professional_core.py", "--self-test"],
                          cwd=repo, capture_output=True, text=True)
    assert proc.returncode == 0
    assert "Result:" in proc.stdout
