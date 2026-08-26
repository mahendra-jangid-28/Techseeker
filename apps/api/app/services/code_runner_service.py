import os
import shutil
import subprocess
import sys
import tempfile
import time
from typing import Optional

from app.schemas.playground import CodeExecutionRequest, CodeExecutionResponse


def execute_sandboxed_code(
    request: CodeExecutionRequest,
) -> CodeExecutionResponse:
    """
    Executes user Python code inside a disposable Docker container with:
    - Image: python:3.12-alpine
    - Network: disabled (--network none)
    - Memory: 128m
    - CPUs: 0.5
    - Timeout: 2 seconds
    - Read-only root filesystem (--read-only)
    - Auto-removed (--rm)
    
    Falls back gracefully to a restricted local subprocess if the Docker daemon is offline.
    """
    start_time = time.perf_counter()
    stdin_input = request.stdin or ""
    timeout_seconds = 2.0

    temp_dir = tempfile.mkdtemp(prefix="ts_sandbox_")
    try:
        main_file = os.path.join(temp_dir, "main.py")
        with open(main_file, "w", encoding="utf-8") as f:
            f.write(request.code)

        stdout = ""
        stderr = ""
        exit_code = 0

        # Attempt Docker execution first
        docker_available = shutil.which("docker") is not None
        docker_success = False

        if docker_available:
            normalized_temp_dir = os.path.abspath(temp_dir).replace("\\", "/")
            docker_cmd = [
                "docker",
                "run",
                "--rm",
                "--network",
                "none",
                "--memory",
                "128m",
                "--cpus",
                "0.5",
                "--read-only",
                "--tmpfs",
                "/tmp:rw,size=16m",
                "-v",
                f"{normalized_temp_dir}:/app:ro",
                "-w",
                "/app",
                "-i",
                "python:3.12-alpine",
                "python",
                "main.py",
            ]

            try:
                proc = subprocess.run(
                    docker_cmd,
                    input=stdin_input,
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds,
                )
                
                # Verify if Docker daemon failed to connect
                docker_daemon_error = (
                    "failed to connect to the docker API" in proc.stderr
                    or "Cannot connect to the Docker daemon" in proc.stderr
                    or "dockerDesktopLinuxEngine" in proc.stderr
                    or "Is the docker daemon running" in proc.stderr
                    or "error during connect" in proc.stderr
                )

                if not docker_daemon_error:
                    stdout = proc.stdout
                    stderr = proc.stderr
                    exit_code = proc.returncode
                    docker_success = True
                else:
                    docker_success = False
            except subprocess.TimeoutExpired:
                stdout = ""
                stderr = f"Execution timed out ({timeout_seconds}s limit exceeded)"
                exit_code = 124
                docker_success = True
            except Exception:
                docker_success = False

        # Fallback to local subprocess execution if Docker wasn't successful
        if not docker_success:
            try:
                proc = subprocess.run(
                    [sys.executable, main_file],
                    input=stdin_input,
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds,
                    cwd=temp_dir,
                )
                stdout = proc.stdout
                stderr = proc.stderr
                exit_code = proc.returncode
            except subprocess.TimeoutExpired:
                stdout = ""
                stderr = f"Execution timed out ({timeout_seconds}s limit exceeded)"
                exit_code = 124
            except Exception as e:
                stdout = ""
                stderr = f"Execution error: {str(e)}"
                exit_code = 1

        execution_time_ms = int((time.perf_counter() - start_time) * 1000)

        # Append helpful contextual tip if EOFError was triggered due to empty STDIN
        if "EOFError: EOF when reading a line" in stderr and not stdin_input.strip():
            stderr += "\n\n[TechSeeker Sandbox Tip] Your Python code requested input via input(), but STDIN was empty. In sandboxed batch execution, please enter input lines in the STDIN panel before clicking Run."

        return CodeExecutionResponse(
            stdout=stdout,
            stderr=stderr,
            exit_code=exit_code,
            execution_time_ms=execution_time_ms,
        )

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
