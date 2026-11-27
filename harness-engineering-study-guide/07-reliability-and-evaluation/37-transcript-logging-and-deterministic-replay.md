> **Module 7: Reliability & Evaluation** | Prerequisites: Chapters 06, 11 & 36 | Reading Time: ~22 min
>
> [← 36. Checkpointing, Snapshots & Rollback](./36-checkpointing-snapshots-and-rollback.md) | [Table of Contents](../README.md) | [38. Telemetry, Tracing & Token/Cost Accounting →](./38-telemetry-tracing-and-token-cost-accounting.md)

# 37. Transcript Logging & Deterministic Replay

Imagine a user files a bug report: *"Your coding agent got stuck in a loop for 4 minutes, burned \$3.50 in tokens, and then deleted my config file."* You ask them to reproduce it. They run the exact same prompt again, and this time the agent solves the task cleanly in 12 seconds!

Welcome to the most frustrating reality of AI engineering: **LLMs are probabilistic, and real developer workspaces constantly change.** If you rely on "try to reproduce it live," you will almost never catch subtle harness bugs, like a malformed streaming delta, a broken tool-result truncation rule, or an edge case in context compaction.

The antidote is an **aviation black box** built into your harness: an **append-only JSONL transcript** that records every single event of a session, paired with a **deterministic replay engine** that lets you re-run your harness code offline, millisecond by millisecond, with zero API calls and 100% repeatability.

---

## 1. The Simple Idea (Zero-Jargon Intuition)

Think of an **airplane's flight data recorder** (the "black box") combined with a **chess game score sheet**.

- While the plane is flying, the recorder doesn't overwrite a summary file saying *"flight seems fine."* Every fraction of a second, it appends one new immutable line: altitude, speed, pilot stick input, engine temperature. Even if the plane loses power mid-flight, every line written up to the final millisecond survives intact.
- Later, investigators can feed that exact recording into a ground simulator to replay the instruments and test whether a firmware fix would have prevented the stall, without ever risking a real airplane.

In an agent harness, an **append-only JSONL transcript** is that flight recorder.

**What breaks if you don't have it?**
1. **Un-debuggable ghost bugs:** When a user says *"compaction dropped my instructions at turn 28,"* you have no way to see the exact prompt, tool outputs, or timings that caused it.
2. **Crash corruption:** If you store a session as one giant `session.json` file and overwrite it on every turn, a crash or `Ctrl+C` halfway through writing corrupts the entire JSON file; destroying the user's session.
3. **Slow, expensive, flaky tests:** Testing your harness loop against live LLM APIs costs real money, takes minutes in CI, and fails randomly whenever the model picks a slightly different phrasing.

---

## 2. Why This Matters in a Real Agent Harness

A well-designed transcript is not "just debug logging": it becomes the **single source of truth** powering five core features of a production harness:

- **Crash-proof session resume:** Because every event is flushed to disk as soon as it happens, killing the terminal and running `--resume` simply replays the JSONL file to reconstruct the exact in-memory state *(Ch. 06)*.
- **Branching & Rewind (`/rewind`):** Instead of deleting history when a user rolls back *(Ch. 36)*, each event carries a `uuid` and `parent_uuid`. Rewinding simply creates a new child branch from an earlier `uuid`: preserving full audit history while cleanly updating the active conversation!
- **Deterministic bug reproduction:** You can take a real failing user transcript, drop it into a unit test, stub out the LLM and tools from the recording, and reproduce a parser or state-machine bug in **10 milliseconds** offline.
- **Post-hoc security & cost audits:** Security teams can scan JSONL transcripts to verify whether a permission policy blocked dangerous shell commands, and product teams can analyze where agents get stuck.
- **UI decoupling & time-travel viewers:** TUI, web dashboards, and shareable HTML replay viewers can all read the exact same JSONL file format.

---

## 3. The Big Picture

Every turn of the agent loop streams typed events through a **Redaction & Offloading Pipeline** into an **append-only `.jsonl` file** (plus an optional blob directory for huge tool outputs). Later, the same file feeds **Session Resume**, **Offline Replay Tests**, and **Audit/Analytics**.

```mermaid
flowchart LR
    Loop["Agent Loop (Turns, LLM, Tools)"] --> Pipe["Redactor + Large-Blob Offloader"]
    Pipe -->|"Append 1 JSON line + fsync"| Log["session.jsonl (Append-Only Truth)"]
    Pipe -->|"Payloads > 32 KB"| Blobs["blobs/sha256.txt (Full Output)"]
    Log --> Resume["Crash Recovery & Session Resume"]
    Log --> Replay["VCR Replay Harness (Offline Tests)"]
    Log --> Audit["Cost, Safety & Failure Analytics"]
```

---

## 4. Deep Dive: Subtopic by Subtopic

### 4.1 Append-Only JSONL Event Logs as the Single Source of Truth

**JSONL** stands for **JSON Lines** (also called NDJSON: Newline-Delimited JSON). Instead of wrapping a whole file in `[ ... ]` with commas between items, **each line is one complete, independent JSON object terminated by `\n`**.

Why JSONL beats a single `session.json` or heavy SQLite database for session transcripts:

| Property | Single `session.json` | Append-Only `.jsonl` | Embedded DB (SQLite) |
| :--- | :--- | :--- | :--- |
| **Write cost per event** | $O(N)$: rewrites whole file | **$O(1)$: appends 1 line** | $O(\log N)$ |
| **Crash mid-write** | Corrupts entire file | **Only last incomplete line affected; ignore & recover!** | Safe (WAL mode) |
| **Streaming reads** | Must load whole file in RAM | **Read line-by-line with constant memory** | Requires SQL queries |
| **CLI inspectability** | Needs full parse | **Works natively with `jq`, `rg`, `tail -f`, `wc -l`** | Needs `sqlite3` CLI |
| **Concurrency / tailing** | Readers see partial files | **Live UI / watcher can `tail -f` cleanly** | Lock contention possible |

> **Pro tip on durability:** Open the file in append mode (`"a"`), write the entire serialized line plus `\n` in a single write call, and flush. On load, if the very last line fails `json.loads()` because power died mid-write, log a warning and safely discard only that trailing partial line: every previous turn remains 100% intact!

#### Tree-Structured Events (`uuid` + `parent_uuid`)
Notice a clever trick used by modern harnesses: even though the file on disk is a flat append-only list of lines, each event stores its own `uuid` and `parent_uuid`.

```mermaid
flowchart LR
    e1["e1 (user: 'Fix login')"]
    e2["e2 (assistant: tool_use read_file)"]
    e3["e3 (tool_result: auth.py)"]
    e4["e4 (assistant: bad fix · abandoned after /rewind)"]
    e5["e5 (user: 'Use JWT instead' · parent_uuid = e3)"]
    e6["e6 (assistant: good fix)"]

    e1 --> e2 --> e3
    e3 -.->|"abandoned branch"| e4
    e3 -->|"active branch"| e5 --> e6
```

Because you **never overwrite or delete lines**, the file stays strictly append-only (fast, crash-safe, auditable), while following `parent_uuid` pointers from the latest active leaf gives you the exact active conversation thread!

---

### 4.2 Recording Every Prompt, Model Response, Tool Call, Timing, and Error

A transcript is only as useful as the **schema discipline** of its events. Every line should share a tiny, consistent **envelope** (header fields) plus a typed `payload`:

```json
{"seq":1,"uuid":"ev_01","parent_uuid":null,"ts":"2026-04-12T15:01:00.112Z","session_id":"sess_8f2a","type":"session_start","payload":{"cwd":"/repo","model":"claude-sonnet-4-6","harness_version":"1.8.2","git_head":"a91f3c2"}}
{"seq":2,"uuid":"ev_02","parent_uuid":"ev_01","ts":"2026-04-12T15:01:00.140Z","session_id":"sess_8f2a","type":"user_message","payload":{"text":"Fix the failing auth test"}}
{"seq":3,"uuid":"ev_03","parent_uuid":"ev_02","ts":"2026-04-12T15:01:02.490Z","session_id":"sess_8f2a","type":"llm_response","payload":{"model":"claude-sonnet-4-6","stop_reason":"tool_use","ttft_ms":420,"duration_ms":2350,"usage":{"input_tokens":8120,"cache_read_tokens":7400,"output_tokens":94},"content":[{"type":"tool_use","id":"call_1","name":"run_command","input":{"cmd":"pytest tests/test_auth.py"}}]}}
{"seq":4,"uuid":"ev_04","parent_uuid":"ev_03","ts":"2026-04-12T15:01:03.910Z","session_id":"sess_8f2a","type":"tool_result","payload":{"tool_use_id":"call_1","name":"run_command","status":"error","exit_code":1,"duration_ms":1415,"output_preview":"FAILED tests/test_auth.py::test_expired_token...","blob_ref":null}}
{"seq":5,"uuid":"ev_05","parent_uuid":"ev_04","ts":"2026-04-12T15:01:04.002Z","session_id":"sess_8f2a","type":"error","payload":{"category":"infra_rate_limit","http_status":429,"retry_after_ms":2000,"attempt":1}}
```

Notice what makes this schema gold for debugging:
- **Monotonic `seq` + ISO-8601 UTC `ts`:** Unambiguous ordering even when two parallel tool calls finish in the same millisecond.
- **Environment fingerprint in `session_start`:** Model ID, harness version, OS, `cwd`, and `git_head`; critical when comparing regressions across versions.
- **Exact timings (`ttft_ms`, `duration_ms`):** Lets you immediately tell whether a 12-second turn was slow because of the LLM or because `pytest` took 10 seconds.
- **Error events are first-class:** Never swallow HTTP 429s, retries, permission denials, or compaction triggers silently; log them as explicit events so you see the full story.
- **`schema_version`:** Include `"v": 1` in `session_start` so future parsers handle evolving formats gracefully without crashing on old logs.

---

### 4.3 Compact Transcripts vs. Full Payload Logs (Handling Large Outputs Cleanly)

Here is a classic mistake: an agent runs `cat huge_bundle.js` or a verbose test suite that prints 2 MB of logs, or captures three 1.5 MB PNG browser screenshots. If you inline base64 images and 2 MB strings straight into `session.jsonl`:

- A 30-turn session balloons to **60 MB**.
- Opening it in `jq` or loading it on `--resume` stalls for seconds.
- Sending the log in a bug report is impossible.

The clean solution is **Two-Tier Logging (Compact Transcript + Content-Addressed Blob Store)**: the exact same principle behind artifact offloading *(Ch. 11)*:

```text
~/.myagent/sessions/sess_8f2a/
├── transcript.jsonl          # Compact event stream (small, fast, easy to diff & inspect)
└── blobs/
    ├── 9f86d081...txt        # Full 2.1 MB pytest output (stored once by SHA-256)
    └── 4e074085...png        # Raw browser screenshot
```

When a tool result or payload exceeds a threshold (say, **16 KB or 32 KB**):
1. Write the full raw payload to `blobs/<sha256>.<ext>` (content-addressed so repeated identical outputs are stored only once).
2. In `transcript.jsonl`, store a compact record containing:
   - `truncated`: `true`
   - `byte_size`: `2148920`
   - `preview_head` and `preview_tail` (e.g., first 2 KB + last 2 KB: preserving error stack traces at the end!)
   - `blob_ref`: `"blobs/9f86d081.txt"`

| Log Mode | What It Contains | Typical Size (50 turns) | Best Used For |
| :--- | :--- | :--- | :--- |
| **Compact Transcript** | All events, tool inputs, timings, head/tail previews, and `blob_ref` pointers | 100 KB – 800 KB | Fast resume, CLI inspection, sharing bug reports, analytics |
| **Full Payload Log (Transcript + Blobs)** | Compact transcript + raw full outputs, full rendered system prompts, and binary media | 2 MB – 50 MB | Exact byte-for-byte replay, deep prompt debugging, visual audit |

> **Bonus design tip:** Should you log the giant 15 KB system prompt on *every* LLM request line? **No!** Hash the rendered system prompt and tool schemas once, store them as a `prompt_snapshot` event (or blob), and reference them by `prompt_hash` on each `llm_request`. That cuts transcript size by 80%+ and makes it instantly obvious when a bug accidentally mutated your system prompt and busted your prompt cache *(Ch. 08)*!

---

### 4.4 Deterministic Replay & Mock-Tool Testing

Now for the superpower that makes transcript logging pay off tenfold: **VCR-style deterministic replay**.

*(The name **VCR** comes from old video cassette recorders: a classic testing pattern pioneered by Ruby's `vcr` library and Python's `pytest-recording` that records external network calls once to a "cassette" file and replays them offline in tests.)*

In an agent harness, you have **two** sources of non-determinism:
1. **The LLM Provider** (stochastic token generation, streaming chunk boundaries, rate limits)
2. **The Tools / Environment** (filesystem state, clock time, shell exit codes, network APIs)

By placing clean interfaces (`LLMClient` and `ToolExecutor`) between your agent loop and the outside world, a single recorded `.jsonl` transcript powers **three distinct replay modes**:

| Replay Mode | LLM Source | Tool Source | What It Tests |
| :--- | :--- | :--- | :--- |
| **1. Full Hermetic Replay** | Recorded from JSONL | Recorded from JSONL | Harness logic: streaming parser, state machine, compaction triggers, UI renderer, cost math, loop detector. Runs in **< 20 ms**, \$0 cost! |
| **2. Mock-LLM + Live Tools** | Recorded from JSONL | Real tools in temp sandbox | Verifies that your real `edit_file`, `ripgrep`, sandbox rules, and checkpoint rollback still work on a real sequence of model tool calls. |
| **3. Live LLM + Mock Tools (Cassette)** | Real LLM API | Recorded tool responses | Tests whether a **new prompt or newer model** makes better decisions when handed the exact same historical tool outputs, without needing a fragile live database or repo setup. |

#### Handling Drift in Replay Matching
What if you refactor your system prompt slightly and then run Mode 1 (Full Hermetic Replay)? If your mock LLM matches requests by *exact raw byte hash* of the entire prompt, the test breaks on every minor wording tweak!

Instead, support configurable **matching strategies**:
- **Sequential cursor matching** (simplest for unit tests): *"Return the $k$-th recorded LLM response for the $k$-th turn, asserting that the expected `tool_result` IDs are present in the input."*
- **Structural key matching** (best for Mock Tools): Match tool calls by `(tool_name, canonical_json(tool_input))` so even if the LLM calls two read-only tools in a different order (`grep` before `read_file` instead of `read_file` before `grep`), the cassette still returns the right recorded output!
- **Normalizing volatile fields:** Before saving a transcript as a reusable test fixture, scrub machine-specific paths (`/Users/alice/proj` → `/workspace`), random UUIDs, and timestamps so tests pass identically on macOS, Linux, and CI runners.

---

### 4.5 Privacy, PII/Secret Redaction, and Retention Policies

An agent transcript is a **security goldmine** if left unprotected. Think about what flows through tool outputs during a single afternoon of coding:
- A developer runs `env` or prints a failing HTTP header containing `Authorization: Bearer sk-live-...`
- The agent reads a `.env` file, AWS credentials, or a database connection string (`postgres://admin:SuperSecret@prod...`)
- A test fixture dumps customer emails, phone numbers, or session cookies

Cross-referencing *Ch. 25 (Secret & Credential Isolation)*, you must **redact BEFORE writing to disk**: never rely on "we'll scrub it later before uploading."

#### Layered Redaction Pipeline
1. **Known-value scrubbing:** At session start, take the values of sensitive environment variables (anything matching `*_KEY`, `*_TOKEN`, `*_SECRET`, `*_PASSWORD`, `DATABASE_URL` with length $\ge 8$) and register them as exact-match literals to replace with `[REDACTED:ENV:<NAME>]`.
2. **Structured pattern detectors:** Run fast regexes for high-confidence secret formats:
   - API keys (`sk-[A-Za-z0-9_-]{20,}`, `ghp_[A-Za-z0-9]{36}`, `AKIA[0-9A-Z]{16}`, `AIza[0-9A-Za-z_-]{35}`)
   - Private key blocks (`-----BEGIN .* PRIVATE KEY----- ... -----END .* PRIVATE KEY-----`)
   - JWTs (`eyJ...\.eyJ...\.[A-Za-z0-9_-]+`) and `Bearer <token>` headers
   - Optional PII detectors (emails, SSNs, credit card numbers via Luhn check) for enterprise modes
3. **Filesystem permissions & encryption at rest:** Create session directories with strict POSIX permissions (`0700` for dirs, `0600` for `.jsonl` and `blobs/*`) so other users on a shared machine cannot read your transcripts.
4. **Retention & Right-to-Delete:**
   - Set a sane default TTL (e.g., **30 days**), with automatic background sweeping of expired `.jsonl` files and orphaned blobs.
   - Support an **ephemeral / zero-persistence mode** (`--no-persist` or `HARNESS_EPHEMERAL=1`) for regulated environments or sensitive incident response where nothing should touch disk.
   - Provide an explicit CLI command (`myagent sessions purge`) so users can wipe a session, and all its linked blobs and checkpoints, completely.

---

## 5. How Real Harnesses Do It

- **Claude Code (`~/.claude/projects/<encoded-path>/<session-id>.jsonl`):** Records every session as an append-only JSONL file scoped by an encoded workspace path. Each line carries `uuid`, `parentUuid`, `timestamp`, `sessionId`, `cwd`, and a `type` discriminator (`user`, `assistant`, `system`, etc.), with `tool_use` and `tool_result` blocks faithfully preserved. Because events link via `parentUuid`, branching after `/rewind` and resuming sessions (`claude --resume`) work cleanly off the same log. Community tools like `claude-replay` parse these exact JSONL files into interactive step-by-step HTML timelines.
- **OpenAI Codex CLI (`~/.codex/sessions/YYYY/MM/DD/rollout-<timestamp>-<id>.jsonl`):** Automatically writes date-sharded append-only JSONL "rollout" files (and supports zstd-compressed archives `.jsonl.zst`). Each line wraps `{timestamp, type, payload}` using structured record families like `session_meta`, `turn_context`, `response_item`, and `event_msg` (capturing token counts, shell outputs, `apply_patch` diffs, and plan updates). Developers routinely pipe these files into `jq` or Python replay scripts.
- **SWE-agent & Harbor / OpenHands Trajectories:** Save structured `.traj` / JSONL trajectory logs capturing every thought, action, observation, exit status, and latency metric, allowing researchers to replay and inspect thousands of benchmark runs offline without re-running expensive containers.
- **Playwright Trace Viewer & VCR Testing Ecosystems:** Inspired the two-tier pattern (lightweight JSONL event timeline + content-addressed blob directory for screenshots and large DOM/stdout captures), keeping timelines snappy while preserving full fidelity on demand.

---

## 6. Common Pitfalls & Failure Modes

1. **Redacting *after* writing to disk (or forgetting tool *inputs*):**
   *What happens:* You redact `tool_result` outputs, but forget that the agent passed `curl -H "Authorization: Bearer secret123"` inside `tool_use.input`. The secret still lands in plaintext in `transcript.jsonl`.
   *Fix:* Pass **every** event payload (user messages, LLM text, tool inputs, tool outputs, and error messages) through the redactor immediately before serialization.
2. **Corrupting JSONL with unbuffered concurrent writes:**
   *What happens:* Parallel tool calls *(Ch. 04)* finish on two async tasks or threads at the exact same instant and interleave bytes onto the same line, producing mangled JSON.
   *Fix:* Funnel all transcript writes through a single synchronized writer (a mutex/lock or a single dedicated async writer queue) and serialize the entire JSON line + `\n` into one string buffer before calling `write()`.
3. **Log explosion from streaming token deltas:**
   *What happens:* Logging every individual SSE token chunk (`"He"`, `"llo"`, `" "`, `"world"`) turns one 500-token response into 500 JSON lines, bloating files 20x.
   *Fix:* Record the **assembled** assistant message (plus `ttft_ms` and total `duration_ms`) in the main transcript; only capture raw SSE chunks when an explicit `--debug-wire-log` flag is turned on.
4. **Brittle exact-match VCR cassettes:**
   *What happens:* Your replay test hashes the full system prompt including today's date (`"Today is 2026-04-12"`). Tomorrow, every replay test in CI fails.
   *Fix:* Inject a deterministic fake clock in tests, normalize paths/dates before matching, and prefer structural matching (`tool_name` + canonical args) over brittle full-prompt byte equality.
5. **Orphaned blobs after deleting a `.jsonl` file:**
   *What happens:* Your retention job deletes old `transcript.jsonl` files after 30 days, but forgets to clean up `blobs/`; quietly filling 10 GB of disk over a year.
   *Fix:* Either scope `blobs/` inside each session's own folder (`sessions/<session_id>/blobs/`) so deleting the session folder removes everything atomically, or run reference-counted garbage collection across shared blobs.

---

## 7. Build It Yourself: Mini-Lab

Below is a compact, production-style **Redacting JSONL Transcript Logger + Deterministic VCR Replayer** in Python. It demonstrates:
- Pre-write secret redaction
- Automatic offloading of payloads over 8 KB to content-addressed blobs
- Safe crash recovery (ignoring a torn final line)
- A `ReplayLLMClient` and `ReplayToolExecutor` that replay a recorded session offline in milliseconds

```python
from __future__ import annotations

import hashlib
import json
import os
import re
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# High-confidence secret patterns redacted BEFORE anything touches disk
SECRET_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("ANTHROPIC_OR_OPENAI_KEY", re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b")),
    ("GITHUB_TOKEN", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36}\b")),
    ("AWS_ACCESS_KEY", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("BEARER_TOKEN", re.compile(r"(?i)(Bearer\s+)[A-Za-z0-9._\-]{16,}")),
]


class SecretRedactor:
    def __init__(self, extra_secrets: list[str] | None = None) -> None:
        self.literals = [s for s in (extra_secrets or []) if len(s) >= 8]

    def scrub_str(self, text: str) -> str:
        for secret in self.literals:
            if secret in text:
                text = text.replace(secret, "[REDACTED:LITERAL]")
        for label, pattern in SECRET_PATTERNS:
            text = pattern.sub(f"[REDACTED:{label}]", text)
        return text

    def scrub(self, obj: Any) -> Any:
        if isinstance(obj, str):
            return self.scrub_str(obj)
        if isinstance(obj, list):
            return [self.scrub(x) for x in obj]
        if isinstance(obj, dict):
            return {k: self.scrub(v) for k, v in obj.items()}
        return obj


class TranscriptWriter:
    """Thread-safe, append-only JSONL writer with secret redaction & blob offloading."""

    def __init__(
        self,
        session_dir: Path,
        session_id: str,
        blob_threshold_bytes: int = 8192,
        redactor: SecretRedactor | None = None,
    ) -> None:
        self.session_id = session_id
        self.session_dir = session_dir
        self.blobs_dir = session_dir / "blobs"
        self.log_path = session_dir / "transcript.jsonl"
        self.blob_threshold = blob_threshold_bytes
        self.redactor = redactor or SecretRedactor()
        self._lock = threading.Lock()
        self._seq = 0
        self._last_uuid: str | None = None

        self.session_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.blobs_dir.mkdir(parents=True, exist_ok=True, mode=0o700)

    def _offload_if_large(self, text: str) -> dict[str, Any]:
        raw = text.encode("utf-8")
        if len(raw) <= self.blob_threshold:
            return {"inline": text, "truncated": False, "blob_ref": None}

        digest = hashlib.sha256(raw).hexdigest()
        blob_rel = f"blobs/{digest}.txt"
        blob_path = self.session_dir / blob_rel
        if not blob_path.exists():
            blob_path.write_bytes(raw)
            os.chmod(blob_path, 0o600)

        head = text[:1500]
        tail = text[-1500:]
        return {
            "inline": f"{head}\n... [{len(raw)} bytes offloaded to {blob_rel}] ...\n{tail}",
            "truncated": True,
            "byte_size": len(raw),
            "blob_ref": blob_rel,
        }

    def append(
        self, event_type: str, payload: dict[str, Any], parent_uuid: str | None = None
    ) -> str:
        # 1. Scrub secrets BEFORE offloading or writing
        clean_payload = self.redactor.scrub(payload)

        # 2. Offload large tool output strings to content-addressed blobs
        if event_type == "tool_result" and isinstance(clean_payload.get("output"), str):
            clean_payload["output"] = self._offload_if_large(clean_payload["output"])

        with self._lock:
            self._seq += 1
            ev_uuid = f"ev_{uuid.uuid4().hex[:12]}"
            record = {
                "seq": self._seq,
                "uuid": ev_uuid,
                "parent_uuid": parent_uuid if parent_uuid is not None else self._last_uuid,
                "ts": datetime.now(timezone.utc).isoformat(),
                "session_id": self.session_id,
                "type": event_type,
                "payload": clean_payload,
            }
            line = json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n"
            with open(self.log_path, "a", encoding="utf-8") as f:
                f.write(line)
                f.flush()
            self._last_uuid = ev_uuid
            return ev_uuid


def load_transcript_safe(log_path: Path) -> list[dict[str, Any]]:
    """Read JSONL line-by-line, safely ignoring a single torn final line after a crash."""
    events: list[dict[str, Any]] = []
    lines = log_path.read_text(encoding="utf-8").splitlines()
    for idx, line in enumerate(lines):
        if not line.strip():
            continue
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            if idx == len(lines) - 1:
                # Expected recovery path if process crashed mid-write on the final line
                break
            raise ValueError(f"Corrupt JSONL line {idx + 1} in {log_path}")
    return events


class DeterministicReplayHarness:
    """VCR-style offline replayer built directly from a recorded JSONL transcript."""

    def __init__(self, session_dir: Path) -> None:
        self.session_dir = session_dir
        events = load_transcript_safe(session_dir / "transcript.jsonl")
        self._llm_queue = [e["payload"] for e in events if e["type"] == "llm_response"]
        self._llm_cursor = 0

        # Index recorded tool results by (tool_name, canonical_input_json)
        self._tool_map: dict[tuple[str, str], list[dict[str, Any]]] = {}
        pending_calls: dict[str, tuple[str, str]] = {}
        for ev in events:
            if ev["type"] == "llm_response":
                for block in ev["payload"].get("content", []):
                    if block.get("type") == "tool_use":
                        key = (
                            block["name"],
                            json.dumps(block["input"], sort_keys=True),
                        )
                        pending_calls[block["id"]] = key
            elif ev["type"] == "tool_result":
                call_id = ev["payload"]["tool_use_id"]
                if call_id in pending_calls:
                    self._tool_map.setdefault(pending_calls[call_id], []).append(
                        ev["payload"]
                    )

    def next_llm_response(self) -> dict[str, Any]:
        if self._llm_cursor >= len(self._llm_queue):
            raise AssertionError("Replay diverged: agent made more LLM calls than recorded!")
        resp = self._llm_queue[self._llm_cursor]
        self._llm_cursor += 1
        return resp

    def run_mock_tool(self, name: str, tool_input: dict[str, Any]) -> str:
        key = (name, json.dumps(tool_input, sort_keys=True))
        queue = self._tool_map.get(key)
        if not queue:
            raise AssertionError(f"Unexpected tool call during replay: {name}({tool_input})")
        recorded = queue.pop(0)
        out = recorded["output"]
        # Re-hydrate full content from blob if it was offloaded
        if isinstance(out, dict) and out.get("blob_ref"):
            return (self.session_dir / out["blob_ref"]).read_text(encoding="utf-8")
        return out["inline"] if isinstance(out, dict) else str(out)
```

With this ~140-line module, any real production failure can be scrubbed, saved into `tests/fixtures/bug_412/`, and replayed in `pytest` forever, with zero API cost and zero flakiness.

---

## 8. Key Takeaways & Quick Self-Check

- **Append-only JSONL is the gold standard for session logs:** $O(1)$ writes, constant-memory streaming reads, native CLI inspectability (`jq`, `rg`), and safe recovery from mid-write crashes.
- **Link events with `uuid` and `parent_uuid`:** You get branching and `/rewind` support without ever mutating or destroying historical lines.
- **Separate metadata from giant blobs:** Offload large tool outputs and screenshots to a content-addressed `blobs/` folder while keeping head/tail previews in `transcript.jsonl`.
- **Use transcripts as VCR cassettes:** Replay both LLM and tool outputs for blazing-fast hermetic unit tests, or replay recorded tool outputs against a live LLM to benchmark prompt/model upgrades safely.
- **Redact before writing to disk:** Scrub known env secrets and regex token patterns across *both* tool inputs and outputs, lock down file permissions (`0600`), and enforce retention TTLs.

### Quick Self-Check

1. **Why is an append-only `.jsonl` file significantly safer than periodically overwriting a single `session.json` file?**
   <details><summary>Show Answer</summary>
   Overwriting a single `session.json` rewrites the whole file ($O(N)$) on every turn; if the process crashes or is killed mid-write, the entire JSON document becomes invalid and unparseable. With append-only `.jsonl`, each event is one independent line appended in $O(1)$ time, so a mid-write crash can only corrupt the single trailing line, which the loader can safely discard while preserving all earlier turns.
   </details>

2. **How does a harness support `/rewind` (rolling back 5 turns and trying a different path) while keeping its transcript strictly append-only?**
   <details><summary>Show Answer</summary>
   By giving every event a `uuid` and `parent_uuid`. Rewinding does not erase lines from the `.jsonl` file; instead, the next event simply sets its `parent_uuid` to the earlier checkpoint's `uuid`, forming a new branch in a tree. Walking `parent_uuid` pointers backward from the current leaf reconstructs the active conversation while keeping the full audit history intact.
   </details>

3. **In a VCR replay test, why is structural matching `(tool_name, canonical_json(input))` often better than sequential matching for mock tool execution?**
   <details><summary>Show Answer</summary>
   Because an agent or model often invokes independent read-only tools (like `grep` and `read_file`) in a slightly different order across runs. Structural matching lets the mock return the exact recorded output for each tool call regardless of ordering, while still catching genuinely unexpected or malformed tool calls.
   </details>

4. **A harness redacts `tool_result` outputs before writing to `transcript.jsonl`, yet an API key still leaked into the log. What are two likely places it came from?**
   <details><summary>Show Answer</summary>
   (1) **Tool inputs** (`tool_use.input`), such as a shell command containing `curl -H "Authorization: Bearer ..."` or an inline secret in `write_file`; and (2) **user prompts or error messages** (e.g., an HTTP exception trace echoing auth headers). The redactor must run over the *entire* event payload, not just tool outputs, before serialization.
   </details>

---

[← 36. Checkpointing, Snapshots & Rollback](./36-checkpointing-snapshots-and-rollback.md) | [Table of Contents](../README.md) | [38. Telemetry, Tracing & Token/Cost Accounting →](./38-telemetry-tracing-and-token-cost-accounting.md)
