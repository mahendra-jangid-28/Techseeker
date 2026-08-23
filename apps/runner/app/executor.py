import asyncio
import os
import shutil
import signal
import sys
import tempfile
import time
from typing import Any, Dict, Optional

MAX_OUTPUT_BYTES = 64 * 1024  # 64 KB (65,536 bytes)
EXECUTION_TIMEOUT_SECONDS = 5.0
COMPILATION_TIMEOUT_SECONDS = 10.0
CHUNK_SIZE = 4096
TRUNCATION_INDICATOR = "\n[Output truncated at 64 KB]"
TRUNCATION_INDICATOR_BYTES = TRUNCATION_INDICATOR.encode("utf-8")
MEMORY_LIMIT_BYTES = 128 * 1024 * 1024  # 128 MB

SUPPORTED_LANGUAGES = {"python", "javascript", "cpp"}


async def _stream_reader(
    stream: asyncio.StreamReader,
    buffer_list: list[bytes],
    shared_state: dict,
):
    """
    Reads stream incrementally and stores up to MAX_OUTPUT_BYTES in buffer_list.
    Discards subsequent bytes to prevent pipe deadlocks without unbounded memory buffering.
    """
    try:
        while True:
            chunk = await stream.read(CHUNK_SIZE)
            if not chunk:
                break

            current_total = shared_state["total_captured"]
            if current_total < MAX_OUTPUT_BYTES:
                allowed = MAX_OUTPUT_BYTES - current_total
                keep = chunk[:allowed]
                buffer_list.append(keep)
                shared_state["total_captured"] += len(keep)
                if len(chunk) > allowed:
                    shared_state["truncated"] = True
            else:
                shared_state["truncated"] = True
    except (asyncio.CancelledError, Exception):
        pass


async def _write_stdin(stdin_writer: asyncio.StreamWriter, stdin_bytes: bytes):
    try:
        if stdin_bytes:
            stdin_writer.write(stdin_bytes)
            await stdin_writer.drain()
    except (BrokenPipeError, ConnectionResetError, asyncio.CancelledError):
        pass
    finally:
        try:
            stdin_writer.close()
            await stdin_writer.wait_closed()
        except Exception:
            pass


def _kill_process_group(pgid: int):
    try:
        if hasattr(os, "killpg"):
            os.killpg(pgid, signal.SIGKILL)
        else:
            os.kill(pgid, signal.SIGTERM)
    except (ProcessLookupError, PermissionError, OSError):
        pass


def _format_bounded_output(
    stdout_chunks: list[bytes],
    stderr_chunks: list[bytes],
    truncated: bool,
    temp_dir: str,
) -> tuple[str, str, bool]:
    stdout_raw = b"".join(stdout_chunks)
    stderr_raw = b"".join(stderr_chunks)

    if truncated or (len(stdout_raw) + len(stderr_raw) > MAX_OUTPUT_BYTES):
        truncated = True
        max_content_bytes = max(0, MAX_OUTPUT_BYTES - len(TRUNCATION_INDICATOR_BYTES))

        # Budget stdout and stderr within max_content_bytes so combined output + indicator <= 64 KB
        if len(stdout_raw) + len(stderr_raw) > max_content_bytes:
            if len(stderr_raw) > max_content_bytes // 2 and len(stdout_raw) > max_content_bytes // 2:
                stdout_raw = stdout_raw[: max_content_bytes // 2]
                stderr_raw = stderr_raw[: max_content_bytes - len(stdout_raw)]
            elif len(stderr_raw) > max_content_bytes:
                stderr_raw = stderr_raw[: max_content_bytes - len(stdout_raw)]
            else:
                stdout_raw = stdout_raw[: max_content_bytes - len(stderr_raw)]

        stderr_raw = stderr_raw + TRUNCATION_INDICATOR_BYTES

    stdout_str = stdout_raw.decode("utf-8", errors="replace")
    stderr_str = stderr_raw.decode("utf-8", errors="replace")

    # Sanitize temp directory references in stderr and stdout
    stderr_str = stderr_str.replace(temp_dir + os.sep, "").replace(temp_dir, "")
    stdout_str = stdout_str.replace(temp_dir + os.sep, "").replace(temp_dir, "")

    # Strict guarantee: combined encoded UTF-8 byte length <= 65536
    while (len(stdout_str.encode("utf-8")) + len(stderr_str.encode("utf-8"))) > MAX_OUTPUT_BYTES:
        if len(stdout_str) > 0:
            stdout_str = stdout_str[:-1]
        elif len(stderr_str) > len(TRUNCATION_INDICATOR):
            stderr_str = stderr_str[: -(len(TRUNCATION_INDICATOR) + 1)] + TRUNCATION_INDICATOR
        else:
            break

    return stdout_str, stderr_str, truncated


class CodeExecutor:
    async def execute(
        self,
        language: str,
        code: str,
        stdin: Optional[str] = None,
    ) -> Dict[str, Any]:
        normalized_lang = language.strip().lower() if language else ""
        if normalized_lang not in SUPPORTED_LANGUAGES:
            return {
                "status": "unsupported_language",
                "stdout": "",
                "stderr": f"Unsupported language: {language}",
                "exit_code": None,
                "execution_time_ms": 0.0,
                "output_truncated": False,
            }

        temp_dir = tempfile.mkdtemp(dir="/tmp", prefix="run_")
        start_time = time.perf_counter()
        process = None

        try:
            stdin_bytes = stdin.encode("utf-8") if stdin else b""
            has_prlimit = shutil.which("prlimit") is not None

            # Prepare language-specific source files and execution command
            if normalized_lang == "python":
                file_path = os.path.join(temp_dir, "solution.py")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(code)

                if has_prlimit:
                    cmd = ["prlimit", f"--as={MEMORY_LIMIT_BYTES}", sys.executable, "-u", "solution.py"]
                else:
                    cmd = [sys.executable, "-u", "solution.py"]

                exec_env = {
                    "PYTHONUNBUFFERED": "1",
                    "PYTHONDONTWRITEBYTECODE": "1",
                    "PATH": os.environ.get("PATH", ""),
                }

            elif normalized_lang == "javascript":
                file_path = os.path.join(temp_dir, "solution.js")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(code)

                # Node.js V8 heap limit
                cmd = ["node", "--max-old-space-size=96", "solution.js"]

                exec_env = {
                    "PATH": os.environ.get("PATH", ""),
                }

            elif normalized_lang == "cpp":
                file_path = os.path.join(temp_dir, "solution.cpp")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(code)

                # Step 1: Compile C++ source code
                compile_proc = await asyncio.create_subprocess_exec(
                    "g++",
                    "-O2",
                    "-std=c++17",
                    "solution.cpp",
                    "-o",
                    "solution",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=temp_dir,
                    start_new_session=True,
                )

                try:
                    c_stdout, c_stderr = await asyncio.wait_for(
                        compile_proc.communicate(),
                        timeout=COMPILATION_TIMEOUT_SECONDS,
                    )
                except asyncio.TimeoutError:
                    if compile_proc and compile_proc.returncode is None and compile_proc.pid:
                        _kill_process_group(compile_proc.pid)
                    return {
                        "status": "runtime_error",
                        "stdout": "",
                        "stderr": f"Compilation timed out after {int(COMPILATION_TIMEOUT_SECONDS)} seconds.",
                        "exit_code": 1,
                        "execution_time_ms": round((time.perf_counter() - start_time) * 1000, 2),
                        "output_truncated": False,
                    }

                if compile_proc.returncode != 0:
                    execution_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
                    stdout_str, stderr_str, truncated = _format_bounded_output(
                        [c_stdout],
                        [c_stderr],
                        False,
                        temp_dir,
                    )
                    return {
                        "status": "runtime_error",
                        "stdout": stdout_str,
                        "stderr": stderr_str,
                        "exit_code": compile_proc.returncode,
                        "execution_time_ms": execution_time_ms,
                        "output_truncated": truncated,
                    }

                # Step 2: Binary command
                if has_prlimit:
                    cmd = ["prlimit", f"--as={MEMORY_LIMIT_BYTES}", "./solution"]
                else:
                    cmd = ["./solution"]

                exec_env = {
                    "PATH": os.environ.get("PATH", ""),
                }

            # Launch execution process in its own session / process group
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=temp_dir,
                start_new_session=True,
                env=exec_env,
            )

            stdout_chunks: list[bytes] = []
            stderr_chunks: list[bytes] = []
            shared_state = {
                "total_captured": 0,
                "truncated": False,
            }

            stdout_task = asyncio.create_task(
                _stream_reader(process.stdout, stdout_chunks, shared_state)
            )
            stderr_task = asyncio.create_task(
                _stream_reader(process.stderr, stderr_chunks, shared_state)
            )
            stdin_task = asyncio.create_task(
                _write_stdin(process.stdin, stdin_bytes)
            )

            try:
                await asyncio.wait_for(
                    asyncio.gather(stdout_task, stderr_task, stdin_task, process.wait()),
                    timeout=EXECUTION_TIMEOUT_SECONDS,
                )
                execution_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
                exit_code = process.returncode

                stdout_str, stderr_str, truncated = _format_bounded_output(
                    stdout_chunks,
                    stderr_chunks,
                    shared_state["truncated"],
                    temp_dir,
                )

                status = "success" if exit_code == 0 else "runtime_error"

                return {
                    "status": status,
                    "stdout": stdout_str,
                    "stderr": stderr_str,
                    "exit_code": exit_code,
                    "execution_time_ms": execution_time_ms,
                    "output_truncated": truncated,
                }

            except asyncio.TimeoutError:
                execution_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

                # Terminate process group if still running
                if process and process.returncode is None and process.pid:
                    _kill_process_group(process.pid)
                    try:
                        await asyncio.wait_for(process.wait(), timeout=1.0)
                    except Exception:
                        pass

                stdout_task.cancel()
                stderr_task.cancel()
                stdin_task.cancel()

                return {
                    "status": "timeout",
                    "stdout": "",
                    "stderr": f"Execution timed out after {int(EXECUTION_TIMEOUT_SECONDS)} seconds.",
                    "exit_code": None,
                    "execution_time_ms": execution_time_ms,
                    "output_truncated": False,
                }

        except Exception as e:
            execution_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
            if process and process.returncode is None and process.pid:
                _kill_process_group(process.pid)
                try:
                    await asyncio.wait_for(process.wait(), timeout=1.0)
                except Exception:
                    pass
            return {
                "status": "internal_error",
                "stdout": "",
                "stderr": f"Internal execution error: {type(e).__name__}",
                "exit_code": None,
                "execution_time_ms": execution_time_ms,
                "output_truncated": False,
            }
        finally:
            # Terminate only if process is still running
            if process and process.returncode is None and process.pid:
                _kill_process_group(process.pid)
                try:
                    await asyncio.wait_for(process.wait(), timeout=1.0)
                except Exception:
                    pass
            shutil.rmtree(temp_dir, ignore_errors=True)
