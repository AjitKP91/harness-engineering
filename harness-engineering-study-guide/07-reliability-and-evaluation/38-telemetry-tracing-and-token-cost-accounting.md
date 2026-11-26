> **Module 7: Reliability & Evaluation** | Prerequisites: Chapters 08, 09 & 37 | Reading Time: ~24 min
>
> [← 37. Transcript Logging & Deterministic Replay](./37-transcript-logging-and-deterministic-replay.md) | [Table of Contents](../README.md) | [39. Model Routing & Rate-Limit Fallbacks →](./39-model-routing-and-rate-limit-fallbacks.md)

# 38. Telemetry, Tracing & Token/Cost Accounting

In Chapter 37, we built the session's local black box (`.jsonl` transcripts) so you can debug a single run. Now zoom out: imagine your agent harness is running across 200 engineers—or 5,000 CI pull-request jobs a day.

Suddenly, someone asks:
- *"Why did our average task latency jump from 28 seconds to 65 seconds after Tuesday's release?"*
- *"Our API bill tripled overnight—which repo, model, or tool loop burned \$4,200?"*
- *"Did our prompt caching refactor actually increase cache hits, or did a hidden bug break prefix stability?"*

You cannot answer those questions by reading individual `.jsonl` files one by one. You need **Telemetry, Distributed Tracing, and Exact Token/Cost Accounting**—plus **hard budget kill switches** that stop a runaway agent loop before it drains your monthly API quota at 3 a.m.

---

## 1. The Simple Idea (Zero-Jargon Intuition)

Think of running a busy commercial restaurant kitchen (scaled up to a chain of 50 restaurants):

- A **transcript** *(Ch. 37)* is the security camera footage of one specific dinner order. Great for investigating a complaint.
- **Distributed Tracing** is a **color-coded stopwatch timeline** showing that Order #482 took 18 minutes total: 2 min taking the order, 11 min waiting on the grill, 3 min plating, and 2 min waiting on a runner. Instantly, you see the bottleneck is the grill—not the waiter.
- **Cost Accounting & Budgets** is the **cash register + circuit breaker** that knows saffron costs 50x more per gram than salt, calculates the exact profit margin of every plate, and automatically shuts off the gas valve if a faulty stove tries to burn \$500 of fuel on a single soup.

**What breaks if you don't have it?**
1. **Invisible cache regressions:** A tiny bug (like putting a timestamp in the system prompt, *Ch. 08*) silently drops your prompt cache hit rate from 90% to 0%, multiplying your monthly bill by 5x–10x without throwing a single error!
2. **Wrong cost math:** Treating all input tokens as full price—or forgetting that **reasoning/thinking tokens** are billed at expensive output rates—makes your reported spend wildly inaccurate.
3. **Runaway overnight spend:** One stuck subagent loop retrying a failing build 400 times in CI can burn hundreds of dollars before anyone wakes up.

---

## 2. Why This Matters in a Real Agent Harness

Observability turns harness engineering from guesswork into an **exact science**:

- **Pinpoint real bottlenecks:** Without span timelines, teams routinely blame "slow LLMs" when 70% of wall-clock time is actually spent waiting on an unindexed `grep`, a cold LSP startup, or a slow Docker container boot.
- **Verify optimizations with hard numbers:** When you ship micro-compaction *(Ch. 10)* or deferred tool loading *(Ch. 12)*, metrics immediately prove whether **tokens per resolved task** went down—or accidentally went *up* because the model had to re-read files!
- **Multi-agent visibility:** When a parent agent spawns 4 parallel subagents *(Ch. 26)* and calls 2 remote MCP servers *(Ch. 19)*, distributed trace IDs stitch the entire tree together into one visual flamegraph.
- **Enterprise trust & chargeback:** Organizations deploying coding agents need exact cost attribution per user, team, repository, and CI pipeline—and guaranteed spend ceilings.

---

## 3. The Big Picture

In **OpenTelemetry (OTel)**—the industry-standard open-source observability framework—one end-to-end user task is a **Trace** (identified by a `trace_id`), broken into nested timed units of work called **Spans** (each with a `span_id` and `parent_span_id`).

```text
Trace: trace_id=7f3a9c...  (Total: 14.8s | Cost: $0.042 | Cache Hit: 86%)
│
└── [invoke_agent: "coding-harness"] ................................. 14.8s
    │
    ├── [turn: 1] .................................................... 5.1s
    │   ├── [chat claude-sonnet-4-6] ─────── 2.4s (TTFT: 0.45s, 8.2k in / 7.1k cached / 120 out)
    │   ├── [execute_tool: ripgrep]  ── 0.3s (ok)
    │   └── [execute_tool: read_file] ─ 0.1s (ok)
    │
    ├── [turn: 2] .................................................... 6.8s
    │   ├── [chat claude-sonnet-4-6] ───────── 2.9s (TTFT: 0.50s)
    │   └── [invoke_agent: "test-runner" (subagent)] ─────── 3.8s
    │       ├── [chat claude-haiku-4-5] ─── 0.9s
    │       └── [execute_tool: bash]    ─────── 2.7s (pytest: 12 passed)
    │
    └── [turn: 3] .................................................... 2.9s
        ├── [chat claude-sonnet-4-6] ──────── 2.7s (stop_reason: end_turn)
        └── [budget_check] ────────────────── <1ms (spent $0.042 / $2.00 cap)
```

Notice how one glance reveals everything: Turn 2 took the longest, not because of the main LLM, but because the `bash` test run inside the subagent took 2.7 seconds—and the subagent smartly used a faster, cheaper model.

---

## 4. Deep Dive: Subtopic by Subtopic

### 4.1 Distributed Tracing for Agents (Traces → Spans)

If you are new to observability, only four vocabulary words matter:

| Term | Plain-English Meaning | In an Agent Harness |
| :--- | :--- | :--- |
| **Trace** | The complete journey of one request/task from start to finish, linked by one `trace_id`. | One user prompt or one autonomous CI task. |
| **Span** | A single timed step inside a trace, with start time, end time, status, and key-value **attributes**. | One LLM API call, one tool execution, one compaction pass, or one subagent run. |
| **Context Propagation** | Passing `traceparent` (`trace_id` + `parent_span_id`) across process or network boundaries. | Passing the parent span ID into spawned subagents and remote MCP HTTP headers so child spans nest cleanly under the parent! |
| **Metric** | A lightweight numeric measurement aggregated over time (counters, histograms, gauges). | P95 TTFT latency, total USD spend per hour, cache hit ratio across all users. |

#### Designing the 5-Level Agent Span Hierarchy
Keep your span tree clean and predictable:
1. **Session / Task Root Span (`invoke_agent`):** Lives for the entire user request. Carries `session.id`, `gen_ai.agent.name`, repo hash, and final outcome (`resolved`, `cancelled`, `budget_exceeded`, `error`).
2. **Turn Span (`agent.turn`):** Groups one ReAct iteration *(Ch. 01)*—making it easy to spot multi-turn loops.
3. **LLM Inference Span (`chat <model>`):** Wraps the provider HTTP call, recording exact token counts, finish reason, and time-to-first-token (TTFT).
4. **Tool Execution Span (`execute_tool <name>`):** Wraps each local tool or MCP call, recording `gen_ai.tool.name`, `gen_ai.tool.call.id`, exit status, and whether it required user approval (separating **human wait time** from actual tool execution time!).
5. **Subagent Span (`invoke_agent <subagent>`):** A child `invoke_agent` span linked to its parent via `parent_span_id`, so nested work never floats as an orphan trace.

> **Crucial timing detail:** If a tool waits 45 seconds for a human to click **"Approve"**, record approval wait as its own child span (`human.approval_wait`)—otherwise your tool-latency dashboards will look falsely slow!

---

### 4.2 OpenTelemetry GenAI Semantic Conventions

In the early days of AI tooling, every framework invented its own attribute names (`llm.tokens.prompt`, `openai_input_tokens`, `promptTokens`), making dashboards incompatible. Today, the **OpenTelemetry GenAI Semantic Conventions** (`open-telemetry/semantic-conventions-genai`) define a vendor-neutral `gen_ai.*` vocabulary supported across observability backends (Jaeger, Grafana Tempo, Datadog, SigNoz, Sentry, Dynatrace, Honeycomb, Langfuse, Phoenix).

*(Note: As of 2025–2026, the `gen_ai.*` namespace is actively maturing under Development status, so production harnesses pin a specific semantic-convention schema version in their instrumentation layer.)*

#### Core Span Naming & Attributes

| Span Type | Recommended Span Name | Key Standard Attributes |
| :--- | :--- | :--- |
| **Agent Run** | `invoke_agent {gen_ai.agent.name}` | `gen_ai.operation.name = "invoke_agent"`, `gen_ai.agent.name`, `gen_ai.agent.id`, `gen_ai.conversation.id` |
| **LLM Call** | `{gen_ai.operation.name} {gen_ai.request.model}` (e.g., `chat claude-sonnet-4-6`) | `gen_ai.operation.name = "chat"` (or `"generate_content"`), `gen_ai.provider.name` (`"anthropic"`, `"openai"`, `"gcp.vertex_ai"`), `gen_ai.request.model`, `gen_ai.response.model`, `gen_ai.response.finish_reasons` |
| **Token Usage** *(on LLM Span)* | *(attributes on the LLM span)* | Core: `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens` · Development/extended: `gen_ai.usage.cache_read.input_tokens`, `gen_ai.usage.cache_creation.input_tokens`, `gen_ai.usage.reasoning.output_tokens` |
| **Tool Call** | `execute_tool {gen_ai.tool.name}` | `gen_ai.operation.name = "execute_tool"`, `gen_ai.tool.name`, `gen_ai.tool.call.id`, `gen_ai.tool.type` (`"function"` or `"extension"` / MCP) |

#### Standard OTel GenAI Metrics
Alongside spans, emit aggregated histograms/counters:
- `gen_ai.client.token.usage` (Histogram, unit: `{token}`, split by `gen_ai.token.type`: `input` vs `output`)
- `gen_ai.client.operation.duration` (Histogram, unit: `s`)
- `gen_ai.server.time_to_first_token` / client-side `gen_ai.client.operation.time_to_first_chunk` (Histogram, unit: `s`)

> **Privacy rule for OTel:** By default, **do not attach raw prompt text or raw code snippets** (`gen_ai.input.messages` / `gen_ai.output.messages`) to exported telemetry spans unless the user explicitly opts in—and always pass opted-in content through your secret redactor *(Ch. 37)*. Metadata-only traces (durations, token counts, tool names, error codes) give you 95% of operational insight with zero source-code leakage!

---

### 4.3 Measuring What Actually Matters

Avoid "vanity dashboards" packed with useless averages. In a coding-agent harness, **six high-signal metrics** tell you almost everything about user experience, reliability, and efficiency:

1. **TTFT (Time-To-First-Token) & TPOT (Time-Per-Output-Token):**
   - **TTFT** is how long the user stares at a blank spinner before the first token arrives (dominated by prompt prefill + provider queue time). Track **P50 and P95**—not the mean!
   - **TPOT** (or tokens/sec) is streaming smoothness once output begins.
   - *Why it matters:* A 6-second TTFT feels sluggish even if total task time is fine. High TTFT usually signals either a cold prompt cache or oversized context windows *(Ch. 08, 09)*.
2. **End-to-End Task Latency (split by LLM vs. Tool vs. Human Wait):**
   - Always decompose wall-clock time into `llm_ms`, `tool_ms`, `human_approval_ms`, and `harness_overhead_ms`.
3. **Prompt Cache Hit Ratio:**
   $$\text{Cache Hit Ratio} = \frac{\text{cache\_read\_input\_tokens}}{\text{total\_input\_tokens}}$$
   - In a healthy multi-turn coding session (5+ turns), this should sit around **75%–95%**. If it suddenly drops below 50%, something is busting your prompt prefix!
4. **Tool Failure Rate (by Tool Name & Error Class):**
   - Track failure percentages separately for `edit_file` (e.g., stale-line / search-block mismatch—a sign your edit format or error feedback needs work, *Ch. 14*) vs. `bash` (often expected during TDD when running failing tests first!) vs. `mcp_*` (infrastructure instability).
5. **Tokens per Resolved Task (and Cost per Resolved Task):**
   - The ultimate north-star efficiency metric. A cheaper model that takes 18 turns and 400k tokens to fix a bug can easily cost *more* (and feel worse) than a stronger model that fixes it in 4 turns and 60k tokens!
6. **Loop / Intervention Rate:**
   - Percentage of sessions hitting doom-loop detectors *(Ch. 05)*, hard turn caps, or user `Ctrl+C` cancellations mid-turn. A spike here is an immediate red flag after a prompt or model change.

---

### 4.4 Accurate Cost Accounting (Input, Output, Cache Read, Cache Write, Reasoning)

If your cost calculator simply does `input_tokens * input_price + output_tokens * output_price`, your numbers can be off by **300% to 800%**!

Modern LLM APIs bill across **five distinct token buckets**—and providers report them differently!

| Token Bucket | Typical Price Multiplier (vs. Base Input) | Billing Gotcha to Watch Out For |
| :--- | :--- | :--- |
| **Uncached Input Tokens** | `1.0x` | Regular prompt tokens processed fresh. |
| **Cache Write (Creation) Tokens** | `1.25x` (5-min TTL) or `2.0x` (1-hr TTL) on Anthropic; `1.0x` (free writes) on OpenAI/Gemini | Writing to Anthropic's explicit prompt cache costs a small premium upfront, which pays off on the very next turn. |
| **Cache Read (Hit) Tokens** | `0.1x` (90% off!) to `0.25x` (75% off) | Huge savings on multi-turn agent histories. |
| **Visible Output Tokens** | `3x` to `5x` base input | Generated text and tool call JSON arguments. |
| **Reasoning / Thinking Tokens** | Same as **Output Tokens** (`3x`–`5x`) | Even when hidden or summarized in the UI, thinking tokens are billed as output! |

#### The #1 Provider Accounting Bug: Inclusive vs. Exclusive Counts!
Every harness engineer gets bitten by this once—make sure it isn't you:

- **OpenAI & Gemini APIs (Inclusive):** `prompt_tokens` (or `input_tokens`) **already includes** `cached_tokens`. To compute uncached input tokens, you **must subtract**:
  $$\text{uncached\_in} = \text{input\_tokens} - \text{cache\_read\_tokens}$$
  Likewise, `completion_tokens` (or `output_tokens`) **already includes** `reasoning_tokens` (though Gemini sometimes reports `thoughtsTokenCount` separately—always check your provider adapter!).
- **Anthropic Messages API (Exclusive for Input):** `usage.input_tokens` is **only the uncached portion**! Total input tokens is the **sum**:
  $$\text{total\_in} = \text{input\_tokens} + \text{cache\_creation\_input\_tokens} + \text{cache\_read\_input\_tokens}$$
  Forgetting this makes Anthropic's cache hit ratio look impossible (e.g., `cache_read = 18,000` while `input_tokens = 400`, yielding a nonsensical `4500%` hit rate!).

**Best practice:** Normalize every provider's raw `usage` JSON into one canonical `NormalizedUsage` struct inside your provider adapter *(Ch. 39)* before it ever touches telemetry, pricing, or budget logic:
- `uncached_input_tokens`
- `cache_write_input_tokens` (optionally split by TTL tier, e.g., 5m vs 1h)
- `cache_read_input_tokens`
- `visible_output_tokens`
- `reasoning_output_tokens`
- *(Plus long-context tier flags: several models apply a 2x pricing multiplier when a single call's total input exceeds 200k tokens!)*

#### Worked Pricing Example (One Real Agent Turn)
Suppose a turn calls a model priced at **\$3 / 1M base input**, **\$3.75 / 1M cache write**, **\$0.30 / 1M cache read**, and **\$15 / 1M output** (including reasoning), with:
- `uncached_input`: `1,200` tokens
- `cache_write`: `4,000` tokens
- `cache_read`: `40,000` tokens
- `visible_output`: `300` tokens
- `reasoning_output`: `1,700` tokens

$$\text{Cost} = \frac{1{,}200 \times 3 + 4{,}000 \times 3.75 + 40{,}000 \times 0.30 + (300 + 1{,}700) \times 15}{1{,}000{,}000} = \$0.0606$$

Compare that to naive math without prompt caching: `(45,200 × 3 + 2,000 × 15) / 1M = $0.1656`—nearly **3x higher**! Accurate bucket accounting shows the true economics of your harness.

---

### 4.5 Budgets, Quotas, and Runaway-Spend Kill Switches

In interactive CLI usage, a human sees the terminal scrolling and hits `Ctrl+C` if an agent goes off the rails. In **headless CI, background automations, and multi-agent swarms**, nobody is watching. A runaway loop can silently burn through a team's API budget in minutes.

Design your **Budget Enforcer** with **four layers of defense**:

1. **Multi-Scope Hierarchical Budgets:**
   - **Per-Turn / Per-Call Cap:** Maximum `max_output_tokens` and reasoning budget on a single request.
   - **Per-Session / Per-Task Cap:** e.g., `max_cost_usd = 2.00` (interactive) or `max_cost_usd = 0.50` (CI bot), plus `max_turns = 40`.
   - **Shared Parent + Subagent Pool:** **Critical!** Subagents must draw from the *parent session's* shared budget ledger—never give each of 10 spawned subagents its own fresh \$5 allowance, or a single task suddenly has a \$55 ceiling!
   - **Org / User Rolling Quota:** Daily or monthly spend limit enforced at your API gateway or proxy.
2. **Pre-Flight Reservation (Before Calling the LLM):**
   Before every LLM API call, estimate the worst-case incremental cost (current prompt tokens + `max_output_tokens`). If `spent + estimated > hard_cap`, stop *before* sending the request.
3. **Soft Warning → Graceful Wrap-Up → Hard Kill Switch:**
   - At **80% of budget** (soft threshold): inject a system nudge into the next turn: *"[Budget Notice: 80% of session budget used. Avoid broad exploration; finish verification and summarize your status.]"*
   - At **100% of budget** (hard threshold): **immediately abort the loop** (cancelling any in-flight subagents via `AbortController` / cancellation token), transition the session state machine to `budget_exceeded` *(Ch. 06)*, persist all work done so far, and present a clear cost breakdown so the user can either stop or explicitly raise the cap (`--max-budget-usd`).
4. **Spend-Velocity Anomaly Detector:**
   Even under a \$10 cap, spending \$2.00 in 20 seconds usually indicates a tight infinite retry loop or broken cache. A velocity circuit breaker pauses execution and alerts the user if burn rate spikes abnormally.

---

## 5. How Real Harnesses Do It

- **Claude Code (Built-in OTel + `/cost` + `--max-budget-usd`):** Ships native OpenTelemetry export (`CLAUDE_CODE_ENABLE_TELEMETRY=1`) emitting metrics and events for token usage (input, output, cache read, cache creation), USD cost, session duration, and active tool calls. Interactive users can inspect live session spend via `/cost`, while headless/CI runs enforce hard spend ceilings with `--max-budget-usd` and `--max-turns`.
- **Gemini CLI (Native OTel Telemetry):** Includes built-in OpenTelemetry instrumentation exporting traces and metrics to local collectors or Google Cloud Monitoring, tracking model latency, token breakdowns (including cached and thinking tokens), tool call success/failure rates, and session outcomes.
- **OpenAI Agents SDK & Codex CLI:** Propagate trace contexts automatically across agent handoffs, tool calls, and subagents, recording structured usage payloads (`input_tokens`, `cached_tokens`, `output_tokens`, `reasoning_tokens`) per turn and supporting pluggable OTel/Langfuse/Arize exporters.
- **LiteLLM Proxy & Enterprise AI Gateways:** Sit between developer harnesses and upstream model providers to enforce centralized per-key/per-team spend caps, track exact model pricing tables in one place, and automatically reject requests with HTTP 400/429 once a budget ceiling is hit—so even a buggy client harness cannot overspend.

---

## 6. Common Pitfalls & Failure Modes

1. **Double-counting cached or reasoning tokens across providers:**
   *What happens:* You apply Anthropic's exclusive-input math to OpenAI's inclusive `prompt_tokens` field, charging cached tokens *twice* (once at `1.0x` and again at `0.1x`).
   *Fix:* Always normalize raw provider usage into an explicit, mutually exclusive `NormalizedUsage` struct inside each provider adapter, with unit tests for Anthropic, OpenAI, and Gemini payloads.
2. **Stale hardcoded model pricing tables:**
   *What happens:* A vendor cuts prices by 50% or introduces a long-context (`> 200k`) surcharge, and your harness reports phantom costs for six months.
   *Fix:* Load pricing tables from a versioned JSON config file (updatable independently of binary releases) and log **raw token buckets** alongside computed USD cost so finance/analytics can always recompute historical spend cleanly.
3. **Unbounded subagent budgets:**
   *What happens:* You enforce a \$1.00 cap on the main agent, which spawns 8 subagents that each spend \$0.80—blowing past your cap by 7x.
   *Fix:* Pass a **thread-safe shared `BudgetLedger`** reference down to every subagent and check it atomically before every LLM call.
4. **Blocking the agent loop on synchronous telemetry HTTP exports:**
   *What happens:* Your OTel collector goes down or has 3-second latency, and suddenly every single tool call in the user's CLI hangs waiting to flush spans!
   *Fix:* Always use OpenTelemetry's **BatchSpanProcessor** on a background thread/task with short timeouts and drop-on-full ring buffers. **Telemetry must never crash or slow down the agent.**
5. **High-cardinality labels exploding metric storage:**
   *What happens:* You attach `session_id` or `file_path` as a **metric label** (dimension) in Prometheus/OTel metrics. Within a week, millions of unique label combinations crash your metrics server.
   *Fix:* Put high-cardinality IDs (`session_id`, `file_path`, `tool_call_id`) on **Traces/Spans and Logs**, never on Metrics! Keep metric labels low-cardinality (`model`, `provider`, `tool_name`, `status`).

---

## 7. Build It Yourself: Mini-Lab

Let's build a clean, zero-fluff **OTel-Aligned Cost & Budget Engine** in Python (~120 lines). It normalizes both OpenAI-style (inclusive) and Anthropic-style (exclusive) token usage, computes accurate multi-bucket USD cost (including long-context surcharges), records OTel GenAI span attributes, and enforces a thread-safe shared budget across parent agents and subagents with an 80% soft warning and 100% hard kill switch.

```python
from __future__ import annotations

import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Iterator


@dataclass(frozen=True)
class ModelPricing:
    """USD per 1,000,000 tokens."""
    input_per_m: float
    cache_write_per_m: float
    cache_read_per_m: float
    output_per_m: float           # Applies to visible + reasoning tokens
    long_context_threshold: int = 200_000
    long_context_multiplier: float = 1.0  # e.g., 2.0 for models with >200k tier


@dataclass(frozen=True)
class NormalizedUsage:
    """Mutually exclusive token buckets—safe to sum without double-counting."""
    uncached_input: int
    cache_write_input: int
    cache_read_input: int
    visible_output: int
    reasoning_output: int

    @property
    def total_input(self) -> int:
        return self.uncached_input + self.cache_write_input + self.cache_read_input

    @property
    def total_output(self) -> int:
        return self.visible_output + self.reasoning_output

    @property
    def cache_hit_ratio(self) -> float:
        return (self.cache_read_input / self.total_input) if self.total_input else 0.0

    def to_otel_attributes(self) -> dict[str, int]:
        """Map directly to OpenTelemetry GenAI Semantic Conventions."""
        attrs = {
            "gen_ai.usage.input_tokens": self.total_input,
            "gen_ai.usage.output_tokens": self.total_output,
        }
        if self.cache_read_input > 0:
            attrs["gen_ai.usage.cache_read.input_tokens"] = self.cache_read_input
        if self.cache_write_input > 0:
            attrs["gen_ai.usage.cache_creation.input_tokens"] = self.cache_write_input
        if self.reasoning_output > 0:
            attrs["gen_ai.usage.reasoning.output_tokens"] = self.reasoning_output
        return attrs


def normalize_anthropic_usage(raw: dict[str, Any]) -> NormalizedUsage:
    """
    Anthropic `input_tokens` is EXCLUSIVE of cache read/creation tokens.
    Anthropic does not emit a separate `reasoning_tokens` usage field; extended-thinking
    output tokens are already folded into `output_tokens` at the same output rate.
    """
    uncached = int(raw.get("input_tokens", 0))
    cache_write = int(raw.get("cache_creation_input_tokens", 0))
    cache_read = int(raw.get("cache_read_input_tokens", 0))
    total_out = int(raw.get("output_tokens", 0))
    return NormalizedUsage(
        uncached_input=uncached,
        cache_write_input=cache_write,
        cache_read_input=cache_read,
        visible_output=total_out,
        reasoning_output=0,
    )


def normalize_openai_usage(raw: dict[str, Any]) -> NormalizedUsage:
    """OpenAI `input_tokens` is INCLUSIVE of cached tokens; output includes reasoning."""
    total_in = int(raw.get("input_tokens", raw.get("prompt_tokens", 0)))
    cache_read = int(
        raw.get("input_tokens_details", {}).get("cached_tokens", 0)
    )
    total_out = int(raw.get("output_tokens", raw.get("completion_tokens", 0)))
    reasoning = int(
        raw.get("output_tokens_details", {}).get("reasoning_tokens", 0)
    )
    return NormalizedUsage(
        uncached_input=max(0, total_in - cache_read),
        cache_write_input=0,  # OpenAI prompt cache writes are not billed extra
        cache_read_input=cache_read,
        visible_output=max(0, total_out - reasoning),
        reasoning_output=reasoning,
    )


def calculate_cost_usd(usage: NormalizedUsage, pricing: ModelPricing) -> float:
    mult = (
        pricing.long_context_multiplier
        if usage.total_input > pricing.long_context_threshold
        else 1.0
    )
    cost = (
        usage.uncached_input * pricing.input_per_m * mult
        + usage.cache_write_input * pricing.cache_write_per_m * mult
        + usage.cache_read_input * pricing.cache_read_per_m * mult
        + usage.total_output * pricing.output_per_m
    ) / 1_000_000.0
    return round(cost, 8)


class BudgetExceededError(RuntimeError):
    """Raised by the kill switch when session + subagent spend hits the hard cap."""


class SharedBudgetLedger:
    """Thread-safe spend tracker shared across a parent agent and all subagents."""

    def __init__(self, max_cost_usd: float, soft_warn_ratio: float = 0.80) -> None:
        self.max_cost_usd = max_cost_usd
        self.soft_warn_ratio = soft_warn_ratio
        self._lock = threading.Lock()
        self.spent_usd = 0.0
        self.soft_warning_emitted = False
        self.call_count = 0

    def check_preflight(self, estimated_min_usd: float = 0.0) -> None:
        with self._lock:
            if self.spent_usd + estimated_min_usd >= self.max_cost_usd:
                raise BudgetExceededError(
                    f"Hard budget cap reached: ${self.spent_usd:.4f} / ${self.max_cost_usd:.4f}"
                )

    def record_spend(self, cost_usd: float) -> str | None:
        """Record actual spend; returns an optional soft-warning nudge for the LLM."""
        with self._lock:
            self.spent_usd += cost_usd
            self.call_count += 1
            if self.spent_usd >= self.max_cost_usd:
                raise BudgetExceededError(
                    f"Hard budget cap reached: ${self.spent_usd:.4f} / ${self.max_cost_usd:.4f}"
                )
            if (
                not self.soft_warning_emitted
                and self.spent_usd >= self.max_cost_usd * self.soft_warn_ratio
            ):
                self.soft_warning_emitted = True
                pct = int((self.spent_usd / self.max_cost_usd) * 100)
                return (
                    f"[Budget Notice: {pct}% of session budget (${self.spent_usd:.3f} / "
                    f"${self.max_cost_usd:.2f}) spent. Wrap up verification and avoid "
                    f"broad new exploration.]"
                )
            return None


@contextmanager
def trace_llm_span(
    provider: str, model: str, ledger: SharedBudgetLedger, pricing: ModelPricing
) -> Iterator[dict[str, Any]]:
    """Lightweight OTel-shaped span wrapper enforcing pre-flight & post-flight budgets."""
    ledger.check_preflight()
    start = time.perf_counter()
    span: dict[str, Any] = {
        "name": f"chat {model}",
        "attributes": {
            "gen_ai.operation.name": "chat",
            "gen_ai.provider.name": provider,
            "gen_ai.request.model": model,
        },
        "usage": None,
        "ttft_s": None,
        "budget_nudge": None,
    }
    try:
        yield span
    finally:
        span["duration_s"] = round(time.perf_counter() - start, 4)
        if isinstance(span.get("usage"), NormalizedUsage):
            usage: NormalizedUsage = span["usage"]
            cost = calculate_cost_usd(usage, pricing)
            span["attributes"].update(usage.to_otel_attributes())
            span["attributes"]["harness.cost_usd"] = cost
            span["attributes"]["harness.cache_hit_ratio"] = round(usage.cache_hit_ratio, 4)
            span["budget_nudge"] = ledger.record_spend(cost)
```

Notice how cleanly every piece connects:
1. Before calling the API, `ledger.check_preflight()` stops overspending immediately.
2. When the LLM call finishes, the caller sets `span["usage"] = normalize_anthropic_usage(resp.usage)` (or `normalize_openai_usage`).
3. The `finally` block records standard OpenTelemetry `gen_ai.*` attributes, computes exact multi-bucket USD cost, updates the shared parent/subagent ledger, and either triggers a graceful 80% wrap-up nudge or trips the 100% hard kill switch.

---

## 8. Key Takeaways & Quick Self-Check

- **Model agents as nested Trace → Span trees:** Nest `invoke_agent` → `turn` → `chat <model>` / `execute_tool <name>` / child `invoke_agent`, and always separate human approval wait time from tool execution time.
- **Follow OpenTelemetry GenAI Semantic Conventions:** Use standard `gen_ai.operation.name`, `gen_ai.provider.name`, `gen_ai.request.model`, `gen_ai.tool.name`, and `gen_ai.usage.*` attributes so your harness plugs straight into any observability backend.
- **Measure what moves the needle:** Prioritize P50/P95 TTFT, latency breakdown (LLM vs. tool vs. human), prompt cache hit ratio, tool failure rate, and **cost/tokens per resolved task**.
- **Normalize provider token counts before doing math:** Never confuse inclusive (`OpenAI`) vs. exclusive (`Anthropic`) input token reporting, and always account for cache writes, cache reads, and reasoning tokens (billed as output).
- **Enforce shared hierarchical kill switches:** Share one atomic budget ledger across parent agents and subagents, warn softly at 80% for graceful wrap-up, and hard-abort at 100%.

### Quick Self-Check

1. **An Anthropic API call returns `input_tokens: 500`, `cache_creation_input_tokens: 1500`, and `cache_read_input_tokens: 8000`. What is the true prompt cache hit ratio?**
   <details><summary>Show Answer</summary>
   **80%** (`8,000 / 10,000`). Because Anthropic's `input_tokens` is *exclusive* of cached tokens, total input tokens is `500 + 1,500 + 8,000 = 10,000`. Dividing `8,000 / 500` by mistake would produce a bogus `1600%` hit ratio.
   </details>

2. **Why should `session_id` and `file_path` go on OpenTelemetry *spans* rather than *metrics* labels?**
   <details><summary>Show Answer</summary>
   Because they are **high-cardinality** values (millions of unique strings). Metrics backends create a separate time series for every unique combination of label values, so high-cardinality metric labels cause memory explosions and soaring bills. Spans and logs are designed to store per-request high-cardinality identifiers safely.
   </details>

3. **Your dashboard shows `execute_tool bash` P95 latency suddenly spiked from 1.2s to 38s, even though the commands themselves didn't get slower. What observability mistake likely caused this?**
   <details><summary>Show Answer</summary>
   The `execute_tool` span likely started *before* the human-in-the-loop permission prompt appeared—so 36 seconds of a developer reading the approval dialog got bundled into "tool execution latency." Split approval waiting into its own separate span (`human.approval_wait`) so infrastructure latency stays accurate.
   </details>

4. **Why is a soft budget threshold (e.g., 80%) valuable alongside a hard 100% kill switch?**
   <details><summary>Show Answer</summary>
   A hard kill switch guarantees you never overspend, but stopping abruptly mid-edit leaves the user with unfinished code and no summary. Injecting a soft warning at 80% gives the agent 1–2 turns to finish its current edit, run a quick verification test, and write a clean handoff summary before the hard cap trips.
   </details>

---

[← 37. Transcript Logging & Deterministic Replay](./37-transcript-logging-and-deterministic-replay.md) | [Table of Contents](../README.md) | [39. Model Routing & Rate-Limit Fallbacks →](./39-model-routing-and-rate-limit-fallbacks.md)
