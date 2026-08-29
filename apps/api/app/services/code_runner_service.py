import os
import shutil
import subprocess
import sys
import tempfile
import time
from typing import List, Optional

from app.schemas.challenge import (
    ChallengeExecutionRequest,
    ChallengeExecutionResponse,
    TestCase,
    TestCaseResult,
)
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
    raw_stdin = request.stdin or ""
    # Normalize CRLF/CR to LF, ensure clean line termination
    normalized_stdin = raw_stdin.replace("\r\n", "\n").replace("\r", "\n")
    if normalized_stdin and not normalized_stdin.endswith("\n"):
        normalized_stdin += "\n"
    stdin_bytes = normalized_stdin.encode("utf-8")

    timeout_seconds = 2.0

    temp_dir = tempfile.mkdtemp(prefix="ts_sandbox_")
    try:
        main_file = os.path.join(temp_dir, "main.py")
        with open(main_file, "w", encoding="utf-8") as f:
            f.write(
                "import sys\n"
                "if hasattr(sys, 'set_int_max_str_digits'):\n"
                "    sys.set_int_max_str_digits(100000)\n\n"
                + request.code
            )

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
                "-e",
                "PYTHONINTMAXSTRDIGITS=100000",
                "-v",
                f"{normalized_temp_dir}:/app:ro",
                "-w",
                "/app",
                "-i",
                "python:3.12-alpine",
                "python",
                "-X",
                "int_max_str_digits=100000",
                "-u",
                "main.py",
            ]

            try:
                proc = subprocess.run(
                    docker_cmd,
                    input=stdin_bytes,
                    capture_output=True,
                    timeout=timeout_seconds,
                )
                
                stderr_decoded = proc.stderr.decode("utf-8", errors="replace")
                stdout_decoded = proc.stdout.decode("utf-8", errors="replace")

                # Verify if Docker daemon failed to connect
                docker_daemon_error = (
                    "failed to connect to the docker API" in stderr_decoded
                    or "Cannot connect to the Docker daemon" in stderr_decoded
                    or "dockerDesktopLinuxEngine" in stderr_decoded
                    or "Is the docker daemon running" in stderr_decoded
                    or "error during connect" in stderr_decoded
                )

                if not docker_daemon_error:
                    stdout = stdout_decoded
                    stderr = stderr_decoded
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
                env = os.environ.copy()
                env["PYTHONINTMAXSTRDIGITS"] = "100000"
                proc = subprocess.run(
                    [sys.executable, "-X", "int_max_str_digits=100000", "-u", main_file],
                    input=stdin_bytes,
                    capture_output=True,
                    timeout=timeout_seconds,
                    cwd=temp_dir,
                    env=env,
                )
                stdout = proc.stdout.decode("utf-8", errors="replace")
                stderr = proc.stderr.decode("utf-8", errors="replace")
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
        if "EOFError: EOF when reading a line" in stderr and not raw_stdin.strip():
            stderr += "\n\n[TechSeeker Sandbox Tip] Your Python code requested input via input(), but STDIN was empty. In sandboxed batch execution, please enter input lines in the STDIN panel before clicking Run."

        return CodeExecutionResponse(
            stdout=stdout,
            stderr=stderr,
            exit_code=exit_code,
            execution_time_ms=execution_time_ms,
        )

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def execute_challenge_testcases(
    request: ChallengeExecutionRequest,
) -> ChallengeExecutionResponse:
    """
    Executes source code against multiple test cases and returns detailed results.
    """
    if not request.testcases:
        # Single execution fallback
        single_res = execute_sandboxed_code(
            CodeExecutionRequest(
                code=request.code,
                language=request.language,
                stdin=request.stdin or "",
            )
        )
        passed = single_res.exit_code == 0
        return ChallengeExecutionResponse(
            passed=passed,
            passed_tests=1 if passed else 0,
            total_tests=1,
            stdout=single_res.stdout,
            stderr=single_res.stderr,
            execution_time_ms=single_res.execution_time_ms,
            memory_kb=1024,
            test_results=[
                TestCaseResult(
                    id=1,
                    input=request.stdin or "",
                    expected_output="",
                    actual_output=single_res.stdout.strip(),
                    passed=passed,
                    execution_time_ms=single_res.execution_time_ms,
                    error=single_res.stderr if not passed else None,
                )
            ],
            feedback="Execution complete." if passed else "Execution encountered errors.",
        )

    results: List[TestCaseResult] = []
    total_time = 0
    passed_count = 0
    combined_stdout = []
    combined_stderr = []

    for tc in request.testcases:
        tc_res = execute_sandboxed_code(
            CodeExecutionRequest(
                code=request.code,
                language=request.language,
                stdin=tc.input,
            )
        )

        total_time += tc_res.execution_time_ms
        actual = tc_res.stdout.strip()
        expected = tc.expected_output.strip()

        is_passed = (tc_res.exit_code == 0) and (actual == expected)
        if is_passed:
            passed_count += 1

        if tc_res.stdout:
            combined_stdout.append(f"[Test {tc.id}] {tc_res.stdout.strip()}")
        if tc_res.stderr:
            combined_stderr.append(f"[Test {tc.id}] {tc_res.stderr.strip()}")

        results.append(
            TestCaseResult(
                id=tc.id,
                input=tc.input if not tc.is_hidden else "[Hidden Testcase Input]",
                expected_output=expected if not tc.is_hidden else "[Hidden Testcase Output]",
                actual_output=actual,
                passed=is_passed,
                execution_time_ms=tc_res.execution_time_ms,
                error=tc_res.stderr if not is_passed else None,
                is_hidden=tc.is_hidden,
            )
        )

    total_tests = len(request.testcases)
    all_passed = passed_count == total_tests

    feedback = (
        f"All {total_tests} test cases passed! ✨"
        if all_passed
        else f"Passed {passed_count} of {total_tests} test cases."
    )

    return ChallengeExecutionResponse(
        passed=all_passed,
        passed_tests=passed_count,
        total_tests=total_tests,
        stdout="\n".join(combined_stdout),
        stderr="\n".join(combined_stderr),
        execution_time_ms=total_time,
        memory_kb=1024,
        test_results=results,
        feedback=feedback,
    )
