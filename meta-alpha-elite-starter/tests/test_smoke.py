
import subprocess, sys, os
def test_dry_run():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    proc = subprocess.run([sys.executable, "meta_alpha_elite.py", "--dry-run"], cwd=repo_root, capture_output=True, text=True)
    assert proc.returncode == 0
    assert "Dry-run complete" in proc.stdout
