# Curriculum Plan, Subtopic Syllabus & Writing Standard

This document defines the exact structure, subtopic coverage, and quality standard for every chapter in **The Complete Guide to AI Agent Harness Engineering**.

---

## Standard Chapter Structure

Every topic guide follows the same humane, beginner-friendly progression:

1. **Header & Navigation:** Breadcrumb, module, prerequisites, estimated reading time, and `← Previous | Table of Contents | Next →` links.
2. **1. The Simple Idea (Zero-Jargon Intuition):** Everyday analogy + what breaks if you don't have this piece.
3. **2. Why This Matters in a Real Agent Harness:** Real-world impact on reliability, latency, cost, or safety.
4. **3. The Big Picture (Visual Diagram):** Clear ASCII or Mermaid diagram showing how the pieces fit together.
5. **4. Deep Dive: Subtopic by Subtopic:** Every subtopic explained from first principles with plain-English definitions, concrete payloads/examples, trade-off tables, and clean commented code.
6. **5. How Real Harnesses Do It:** Grounded patterns from open-source and publicly documented systems (Claude Code, OpenAI Codex CLI, Gemini CLI, Aider, OpenCode, SWE-agent, MCP/ACP specs, etc.).
7. **6. Common Pitfalls & Failure Modes:** Real mistakes engineers make and how to prevent them.
8. **7. Build It Yourself: Mini-Lab / Concrete Blueprint:** A compact, understandable implementation example or design walkthrough.
9. **8. Key Takeaways & Quick Self-Check:** Summary bullets + 3–4 self-check questions with collapsible `<details>` answers.
10. **Footer Navigation:** `← Previous | Back to Table of Contents | Next →`.

---

## Complete Subtopic Syllabus (41 Chapters)

### Module 0: Foundations
- [x] **00. Start Here: What Is an Agent Harness?** (`00-foundations/00-start-here-what-is-an-agent-harness.md`)
  - What an LLM actually is (stateless text-in, text-out function)
  - Tokens, context windows, and why raw LLMs cannot touch your computer
  - The "Remote Specialist on a Phone Call" mental model of a harness
  - The 7 layers of a modern coding-agent harness
  - How a single user request travels through a harness from start to finish

---

### Module 1: Core Loop & Execution
- [x] **01. Agent Tool-Use Loop** (`01-core-loop-and-execution/01-agent-tool-use-loop.md`)
  - Stateless API calls vs. stateful conversation arrays
  - The ReAct cycle (Reason → Act → Observe → Repeat)
  - Stop reasons (`end_turn`, `tool_use`, `max_tokens`, `refusal`) and loop termination
  - Steering, user interruption, and injecting mid-loop messages
  - Turn caps, step budgets, and knowing when to stop
- [x] **02. Streaming & Event Parsing** (`01-core-loop-and-execution/02-streaming-and-event-parsing.md`)
  - Why streaming matters (Time-To-First-Token, perceived latency, live cancellation)
  - Server-Sent Events (SSE) and HTTP chunked streams from scratch
  - Reassembling incremental JSON deltas for tool arguments
  - Separating thinking/reasoning blocks, visible text, and tool call blocks
  - Handling malformed chunks, mid-stream disconnects, and backpressure
- [x] **03. Tool Schema Design & Structured Outputs** (`01-core-loop-and-execution/03-tool-schema-design-and-structured-outputs.md`)
  - How LLMs "see" tools (JSON Schema serialized into prompt/tool definitions)
  - Writing tool descriptions as micro-prompts (clear names, constraints, examples)
  - Constrained decoding / grammar-guided structured outputs (`strict: true`)
  - Designing ergonomic tool APIs (atomic vs. composite tools, enums, defaults, error messages as guidance)
  - Avoiding schema bloat and overlapping tool confusion
- [x] **04. Parallel Tool Calling** (`01-core-loop-and-execution/04-parallel-tool-calling.md`)
  - Single-turn fan-out: multiple tool calls in one assistant message
  - Read-only concurrency vs. write/mutation ordering hazards
  - Dependency graphs, locks, and batching policies
  - Matching `tool_use_id` to `tool_result` accurately and handling partial failures
  - Cancellation and timeout propagation across concurrent tool calls
- [x] **05. Error Recovery, Retries & Infinite-Loop Detection** (`01-core-loop-and-execution/05-error-recovery-retries-and-infinite-loop-detection.md`)
  - Two distinct error classes: infrastructure errors (429/500/timeouts) vs. tool execution errors (bad path, test failure)
  - Exponential backoff with jitter and `Retry-After` headers
  - Turning tool errors into actionable feedback for the LLM instead of crashing
  - Detecting doom loops (identical repeated calls, oscillating edits, thrashing)
  - Circuit breakers, nudge injections, and graceful escalation to the human
- [x] **06. Session & Turn State Machines** (`01-core-loop-and-execution/06-session-and-turn-state-machines.md`)
  - Why ad-hoc `while` loops break in real apps (cancel, pause, resume, approval prompts)
  - Modeling explicit states (`idle`, `streaming`, `awaiting_approval`, `executing_tools`, `compacting`, `error`, `cancelled`)
  - Handling Ctrl+C / AbortController cleanly without corrupting conversation history
  - Maintaining valid message alternation (no orphan `tool_use` without matching `tool_result`)
  - Persisting session state to disk for crash recovery and resume

---

### Module 2: Context & Memory
- [x] **07. System Prompt Assembly & Instruction Hierarchy** (`02-context-and-memory/07-system-prompt-assembly-and-instruction-hierarchy.md`)
  - Instruction precedence (system/developer > repo rules > user message > untrusted tool output)
  - Dynamic assembly: base identity, OS/environment metadata, tool docs, repo files (`AGENTS.md`, `CLAUDE.md`)
  - Hierarchical rule discovery (global user config → repo root → subdirectory overrides)
  - Keeping system prompts concise, non-contradictory, and well-delimited (XML/Markdown sections)
  - Preventing instruction drift across long sessions
- [x] **08. Prompt Caching & Prefix Stability** (`02-context-and-memory/08-prompt-caching-and-prefix-stability.md`)
  - How KV caching works intuitively (why re-reading the same prefix is slow & expensive)
  - Provider prompt caching mechanics (explicit breakpoints vs. automatic prefix caching, TTLs, cost savings)
  - The Golden Rule of Prefix Stability (static first, dynamic last)
  - Common cache-busters (changing timestamps in system prompt, random tool ordering, mutating earlier messages)
  - Designing cache-aware harnesses (append-only history, stable tool registries, cache hit-rate monitoring)
- [x] **09. Context Window Budgeting** (`02-context-and-memory/09-context-window-budgeting.md`)
  - Tokens vs. characters vs. words; how tokenizers work and why counts vary by model
  - Context rot / "lost in the middle" — why filling 100% of the window hurts quality
  - Partitioning the budget (system prompt, tool schemas, pinned files, history, headroom for output/thinking)
  - Counting tokens locally vs. API usage metadata
  - Trigger thresholds (soft warning, proactive pruning, hard compaction)
- [x] **10. Context Compaction & Summarization** (`02-context-and-memory/10-context-compaction-and-summarization.md`)
  - Why naive FIFO message dropping destroys agent coherence
  - Micro-compaction (clearing old tool outputs) vs. full LLM summarization
  - Structured summary templates (goal, completed work, modified files, decisions, open errors, next steps)
  - Preserving invariants (keeping recent turns verbatim, never splitting `tool_use`/`tool_result` pairs)
  - Compaction failure modes (hallucinated summaries, repeated re-reading, loss of constraints)
- [x] **11. Tool Output Truncation & Artifact Offloading** (`02-context-and-memory/11-tool-output-truncation-and-artifact-offloading.md`)
  - Why a single `npm test` or `cat` can blow up a 200k-token window
  - Head+tail truncation vs. line/byte caps and preserving stack traces/exit codes
  - Artifact offloading: saving full outputs to scratch files and giving the agent a file pointer + preview
  - Content-aware filtering (binary detection, ANSI escape-code stripping, huge single-line minified files)
  - Letting the model paginate/search offloaded artifacts on demand
- [x] **12. Progressive Disclosure & On-Demand Skills** (`02-context-and-memory/12-progressive-disclosure-and-on-demand-skills.md`)
  - The tool/instruction bloat problem (loading 50 guides and 100 tools upfront wastes tokens and attention)
  - Progressive disclosure pattern: lightweight index/frontmatter first, full instructions loaded only when needed
  - Anatomy of a Skill (`SKILL.md` frontmatter, instructions, helper scripts, references)
  - Dynamic tool search / deferred tool loading
  - Balancing discoverability vs. token efficiency
- [x] **13. Short-Term vs. Long-Term Memory** (`02-context-and-memory/13-short-term-vs-long-term-memory.md`)
  - Working memory (active context window) vs. episodic memory (past sessions) vs. semantic memory (repo facts & preferences)
  - File-based memory (`MEMORY.md`, structured markdown notes) vs. vector/database memory
  - Memory extraction, deduplication, staleness, and contradiction resolution
  - Privacy, scoping (project vs. global user memory), and user inspectability
  - When memory helps vs. when stale memory misleads an agent

---

### Module 3: Tools & Workspace Interaction
- [x] **14. File Reading, Patching & Diff Application** (`03-tools-and-workspace-interaction/14-file-reading-patching-and-diff-application.md`)
  - Why line-numbered paginated reads beat dumping whole files
  - Edit formats compared: whole-file rewrite vs. search-and-replace blocks vs. unified diffs (`apply_patch`)
  - Whitespace, indentation, line-ending (`CRLF`/`LF`), and ambiguity bugs
  - Atomic writes, stale-read detection (mtime/hash guards), and encoding safety
  - Designing helpful edit error messages so the model self-corrects on the next try
- [x] **15. Codebase Search (Ripgrep, Glob, Semantic Indexing)** (`03-tools-and-workspace-interaction/15-codebase-search-ripgrep-glob-semantic-indexing.md`)
  - File discovery (`glob`, respecting `.gitignore`, skipping `node_modules`/`.git`/build artifacts)
  - Lexical search with `ripgrep` (regex, fixed-string, context lines, result caps, sorting)
  - Semantic / vector code search (chunking, embeddings, hybrid BM25 + vector retrieval)
  - Why modern harnesses often prefer fast agentic `ripgrep` + `glob` over heavy pre-built vector indexes (freshness, exactness, zero indexing lag)
  - Ranking, deduplication, and formatting search results for LLM readability
- [x] **16. AST & Language Server Protocol (LSP) Integration** (`03-tools-and-workspace-interaction/16-ast-and-language-server-protocol-lsp-integration.md`)
  - Why text search isn't enough (renaming symbols, finding callers, type errors)
  - Abstract Syntax Trees (ASTs) and Tree-sitter (outline views, structural code chunking, syntax validation)
  - How LSP works (JSON-RPC between client and language server: `goToDefinition`, `findReferences`, `hover`, `diagnostics`)
  - Closing the feedback loop: pushing real-time compiler/type diagnostics back to the agent after edits
  - Managing language server warm-up, multi-language workspaces, and memory overhead
- [x] **17. Shell & PTY Session Management** (`03-tools-and-workspace-interaction/17-shell-and-pty-session-management.md`)
  - Stateless subprocess (`exec`) vs. persistent interactive Pseudo-Terminal (`PTY`)
  - What a PTY is in plain English (stdin/stdout/stderr, TTY mode, ANSI codes, interactive prompts)
  - Working directory, environment variables, exit codes, and `PATH` inheritance
  - Handling interactive hang traps (pagers like `less`, `git` prompts, `sudo`, `npm init`, `PAGER=cat`, `CI=true`)
  - Timeouts, process groups (`PGID`), and cleanly killing child process trees without leaving orphans
- [x] **18. Background Processes & Async Notifications** (`03-tools-and-workspace-interaction/18-background-processes-and-async-notifications.md`)
  - Short-lived commands vs. long-running jobs (builds, test suites) vs. daemons (dev servers, watchers)
  - Synchronous wait budgets (`WaitMsBeforeAsync`) and automatic backgrounding
  - Ring-buffered log capture and on-demand status inspection
  - Event-driven notifications vs. wasteful LLM polling loops (`sleep` anti-pattern)
  - Cleanup guarantees when a session ends or crashes
- [x] **19. Model Context Protocol (MCP) Client Architecture** (`03-tools-and-workspace-interaction/19-model-context-protocol-mcp-client-architecture.md`)
  - What MCP solves (the $M \times N$ integration problem — "USB-C for AI tools")
  - MCP primitives: Tools, Resources, Prompts, and Sampling
  - Transports: `stdio` (local subprocesses) vs. Streamable HTTP (remote servers)
  - Lifecycle handshake (`initialize`), capability negotiation, namespacing, and reconnection
  - Auth (OAuth), security boundaries, and preventing MCP tool-schema context explosion
- [x] **20. Browser Automation Integration** (`03-tools-and-workspace-interaction/20-browser-automation-integration.md`)
  - Why coding agents need a browser (UI verification, live debugging, web apps, visual regressions)
  - How Playwright / Chrome DevTools Protocol (CDP) control a browser
  - Perception strategies: raw HTML vs. Accessibility Trees (AXTree) vs. Screenshots + Set-of-Mark overlays
  - Capturing console logs, network requests, DOM state, and visual diffs
  - Browser security: isolated profiles, origin allowlists, auth/payment boundaries, and prompt injection in web pages

---

### Module 4: Sandboxing & Security
- [x] **21. OS-Level Sandboxing (macOS Seatbelt, Linux Bubblewrap/Landlock, Containers)** (`04-sandboxing-and-security/21-os-level-sandboxing-seatbelt-bubblewrap-landlock-containers.md`)
  - Why "asking the LLM politely not to run `rm -rf /`" is not security
  - Defense in depth: process isolation vs. OS sandboxes vs. containers vs. microVMs (Firecracker/Apple Virtualization)
  - macOS Seatbelt (`sandbox-exec` / SBPL profiles) — how it works and its caveats
  - Linux Bubblewrap (`bwrap` namespaces) and Landlock LSM (unprivileged kernel-enforced filesystem/network rules)
  - Container/VM sandboxes (Docker, gVisor, Kata, microVMs) — startup speed vs. isolation strength
- [x] **22. Filesystem & Network Isolation** (`04-sandboxing-and-security/22-filesystem-and-network-isolation.md`)
  - Workspace-scoped read/write rules, read-only system mounts, and writable scratch `/tmp`
  - Protecting sensitive host paths (`~/.ssh`, `~/.aws`, browser profiles, `.git/hooks`, `.env`)
  - Symlink traversal and path-canonicalization attacks (`realpath` checks)
  - Network isolation: offline-by-default sandboxes, egress allowlists, HTTP/CONNECT filtering proxies
  - Preventing data exfiltration via DNS, curl, or package-manager postinstall scripts
- [x] **23. Permission Models & Command Approval Policies** (`04-sandboxing-and-security/23-permission-models-and-command-approval-policies.md`)
  - The UX vs. safety tension (approval fatigue vs. silent danger)
  - Permission tiers: Auto-allow (read-only), Ask-once / Prefix allowlist, Always-ask, Hard-deny
  - Parsing shell commands safely (AST parsing vs. fragile regex; pipes, subshells `$(...)`, redirects, `eval`)
  - Human-in-the-loop approval UX (clear diffs, command summaries, blast-radius indicators)
  - Policy-as-code for teams and enterprise governance
- [x] **24. Prompt Injection Defenses & Trust Boundaries** (`04-sandboxing-and-security/24-prompt-injection-defenses-and-trust-boundaries.md`)
  - Direct vs. indirect prompt injection (malicious README, git commit message, issue comment, web page, MCP tool output)
  - The "Lethal Trifecta" (untrusted input + access to private data + ability to exfiltrate/act)
  - Architectural defenses: privilege separation, structural delimiters, taint tracking, deterministic policy checks outside the LLM
  - Why LLM-only defenses ("please ignore malicious instructions") are necessary but never sufficient
  - Practical mitigation checklist for coding harnesses
- [x] **25. Secret & Credential Isolation** (`04-sandboxing-and-security/25-secret-and-credential-isolation.md`)
  - How secrets leak in coding agents (env vars, `.env` files, command output, transcripts, telemetry)
  - Environment scrubbing (`env` allowlists for child processes)
  - Proxy-based credential injection (the sandbox never holds the real API key or GitHub token)
  - Redaction pipelines for tool outputs, logs, and LLM prompts
  - Ephemeral, least-privilege, short-lived tokens vs. static personal tokens

---

### Module 5: Multi-Agent & Orchestration
- [x] **26. Subagent Spawning & Context Isolation** (`05-multi-agent-and-orchestration/26-subagent-spawning-and-context-isolation.md`)
  - Why a single agent context gets polluted during broad exploration or multi-module work
  - Parent-child delegation: passing a crisp brief, isolated context window, returning a concise summary
  - Specialized subagent profiles (read-only researcher, code editor, verifier, browser operator)
  - Tool scoping, model tiering (fast/cheap vs. frontier), and recursion depth limits
  - When to use a subagent vs. doing the work directly in the parent
- [x] **27. Workspace Isolation (Git Worktrees / Ephemeral Clones)** (`05-multi-agent-and-orchestration/27-workspace-isolation-git-worktrees-ephemeral-clones.md`)
  - The parallel editing collision problem (two agents editing the same directory)
  - How `git worktree` works under the hood (shared `.git` object store, independent working directories and branches)
  - Copy-on-write clones (APFS `cp -c`, Btrfs/XFS reflinks) vs. full clones vs. git worktrees
  - Managing build caches, lockfiles, ports, and untracked files across parallel workspaces
  - Merging, conflict resolution, and cleanup of ephemeral workspaces
- [x] **28. Inter-Agent Messaging & Reactive Wakeups** (`05-multi-agent-and-orchestration/28-inter-agent-messaging-and-reactive-wakeups.md`)
  - Synchronous blocking calls vs. asynchronous event-driven messaging
  - Message envelopes, mailboxes, correlation IDs, and delivery guarantees
  - Reactive wakeups: sleeping at zero token cost and resuming when a message or task finishes
  - Avoiding polling loops, message storms, and deadlocks
  - Bidirectional guidance (subagents asking parents clarifying questions mid-task)
- [x] **29. Multi-Agent Swarms & Shared Coordination** (`05-multi-agent-and-orchestration/29-multi-agent-swarms-and-shared-coordination.md`)
  - Topologies: Coordinator-Worker, Pipeline/Assembly Line, Shared Message Board, Peer Review (Generator-Evaluator)
  - Ownership boundaries (file/module sharding so workers don't stomp on each other)
  - Shared state, task queues, and claim/lock semantics
  - Stall detection, monitoring, and graceful shutdown
  - Economics and diminishing returns: when multi-agent swarms beat single agents (and when they don't)
- [x] **30. Planning Mode & Task Tracking** (`05-multi-agent-and-orchestration/30-planning-mode-and-task-tracking.md`)
  - Why separating "think & plan" from "edit & execute" dramatically improves complex tasks
  - Read-only planning phases, implementation plan artifacts, and human approval gates
  - Live task checklists / todo state machines (keeping long-horizon focus across compaction)
  - Dynamic re-planning when reality contradicts the initial plan
  - Anti-patterns: over-planning trivial tasks and stale checklists
- [x] **31. Programmatic Agent Workflows** (`05-multi-agent-and-orchestration/31-programmatic-agent-workflows.md`)
  - Probabilistic LLM control flow vs. deterministic code orchestration
  - Fan-out / fan-in patterns (map-reduce over files, test failures, or review lenses)
  - Staged pipelines (research → design → implement → verify → aggregate)
  - Combining deterministic scripts/tools with targeted LLM calls
  - Concurrency limits, structured return contracts, and partial-failure handling

---

### Module 6: Extensibility & Interfaces
- [x] **32. Lifecycle Hooks & Interceptors** (`06-extensibility-and-interfaces/32-lifecycle-hooks-and-interceptors.md`)
  - What hooks are (deterministic code firing at known points in the agent lifecycle)
  - Standard hook points: `SessionStart`, `PreToolUse`, `PostToolUse`, `BeforeModel`, `Stop/Completion`, `Notification`
  - Hook actions: observe/log, allow/deny/block, mutate inputs/outputs, inject feedback (auto-linting/formatting after edits)
  - Execution models (shell commands via JSON stdin/stdout, in-process scripts, webhooks)
  - Security, timeouts, and preventing hook loops
- [x] **33. Plugin & Configuration Discovery** (`06-extensibility-and-interfaces/33-plugin-and-configuration-discovery.md`)
  - Layered configuration precedence (built-in defaults → system/enterprise → user global → project repo → local overrides → CLI flags)
  - Packaging plugins (manifests bundling skills, hooks, MCP servers, agents, and rules)
  - Namespacing, version compatibility, and conflict resolution
  - Trust & security for project-level configs (why blindly executing hooks from a cloned repo is dangerous!)
  - Hot reloading vs. session-scoped config snapshots
- [x] **34. TUI / CLI Event Rendering** (`06-extensibility-and-interfaces/34-tui-cli-event-rendering.md`)
  - Designing great developer UX in the terminal (streaming markdown, syntax-highlighted diffs, collapsible tool panels, spinners)
  - Terminal architecture basics (alternate screen vs. inline scrollback, ANSI escape sequences, raw mode, resize signals `SIGWINCH`)
  - Decoupling the agent engine from the UI via typed event streams
  - Non-interactive / headless / CI mode (`--json`, exit codes, piping)
  - Rendering performance (frame throttling, flicker-free redraws, wide Unicode/emoji width bugs)
- [x] **35. Client-Server Protocols (JSON-RPC, ACP, Daemon Architecture)** (`06-extensibility-and-interfaces/35-client-server-protocols-json-rpc-acp-daemon-architecture.md`)
  - Why modern harnesses split the Core Engine (daemon/server) from UI Clients (CLI, IDE, Web, Desktop)
  - JSON-RPC 2.0 over `stdio`, Unix domain sockets, or WebSockets/HTTP
  - Agent Client Protocol (ACP): standardizing IDE-to-agent communication (sessions, streaming updates, tool permissions, diffs)
  - Reconnecting clients, multi-client sessions, and surviving UI crashes
  - Protocol versioning, capability negotiation, and authentication on local sockets

---

### Module 7: Reliability & Evaluation
- [x] **36. Checkpointing, Snapshots & Rollback** (`07-reliability-and-evaluation/36-checkpointing-snapshots-and-rollback.md`)
  - Why "undo" in an agent harness is harder than Ctrl+Z in a text editor
  - Shadow Git repositories, Git stash/tree snapshots (`git write-tree`), and per-turn file backups
  - Coupling conversation rollback with filesystem rollback (rewinding both memory and disk together)
  - What cannot be rolled back (external API calls, sent emails, deployed infra, deleted DB rows) and how to guard them
  - Storage overhead, garbage collection, and handling binary/untracked files
- [x] **37. Transcript Logging & Deterministic Replay** (`07-reliability-and-evaluation/37-transcript-logging-and-deterministic-replay.md`)
  - Append-only JSONL event logs as the single source of truth for a session
  - Recording every prompt, model response, tool call, tool result, timing, and error
  - Compact transcripts vs. full payload logs (handling large outputs cleanly)
  - Deterministic replay and mock-tool testing for debugging non-deterministic LLM bugs
  - Privacy, PII/secret redaction, and retention policies
- [x] **38. Telemetry, Tracing & Token/Cost Accounting** (`07-reliability-and-evaluation/38-telemetry-tracing-and-token-cost-accounting.md`)
  - Distributed tracing for agents (Traces → Spans: Session → Turn → LLM Call → Tool Call → Subagent)
  - OpenTelemetry GenAI Semantic Conventions
  - Measuring what actually matters (TTFT, end-to-end latency, cache hit ratio, tool failure rate, tokens per resolved task)
  - Accurate cost accounting (input, output, cached read, cache write, reasoning/thinking tokens)
  - Budgets, quotas, and runaway-spend kill switches
- [x] **39. Model Routing & Rate-Limit Fallbacks** (`07-reliability-and-evaluation/39-model-routing-and-rate-limit-fallbacks.md`)
  - Provider abstraction layers (normalizing messages, tool schemas, thinking blocks, and error codes across vendors)
  - Tiered model routing (fast/cheap models for search/summarization/classification; frontier models for planning/hard bugs)
  - Handling 429 rate limits, quota exhaustion, overload (529/503), and regional outages
  - Fallback chains, token-bucket rate limiters, and preserving prompt cache locality during failover
  - Cross-model handoff pitfalls (incompatible thinking signatures, differing tool-call conventions)
- [x] **40. Agent Evaluation Harnesses & Benchmarks** (`07-reliability-and-evaluation/40-agent-evaluation-harnesses-and-benchmarks.md`)
  - Why "vibes-based testing" fails when iterating on prompts, tools, or compaction
  - Anatomy of an eval harness: isolated task container → run agent → run hidden grading tests → collect trajectory + score
  - Key coding benchmarks (SWE-bench / SWE-bench Verified, Terminal-Bench, custom internal repo evals)
  - Grading methods: deterministic unit tests, static checks, LLM-as-a-judge, trajectory assertions
  - Pass@k vs. Pass^k (reliability under variance), preventing data contamination, and regression gating in CI

---

## Execution Waves
- **Wave 0 (Foundations):** `README.md`, `PLAN.md`, Chapter `00`
- **Wave 1 (Modules 1 & 2):** Chapters `01`–`13`
- **Wave 2 (Modules 3 & 4):** Chapters `14`–`25`
- **Wave 3 (Modules 5, 6 & 7):** Chapters `26`–`40`
- **Wave 4 (Synthesis & Audit):** `GLOSSARY.md`, link verification, structural & technical quality audit across all 44 files.
