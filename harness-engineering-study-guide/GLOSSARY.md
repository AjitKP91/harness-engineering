> **Reference** | [← 40. Agent Evaluation Harnesses & Benchmarks](./07-reliability-and-evaluation/40-agent-evaluation-harnesses-and-benchmarks.md) | [Table of Contents](./README.md)

# Plain-English Glossary of Harness Engineering

Every acronym and engineering term used across **The Complete Guide to AI Agent Harness Engineering**, explained simply in alphabetical order, with links to the chapters where you can go deeper.

---

## A

**AbortController / AbortSignal**
A standard cancellation handle (originally from JavaScript, with equivalents like `context.Context` in Go or `asyncio.Event` in Python) that tells an in-flight API stream or running tool to stop cleanly when the user hits `Ctrl+C` or a timeout expires. *(Ch. [04](./01-core-loop-and-execution/04-parallel-tool-calling.md), [06](./01-core-loop-and-execution/06-session-and-turn-state-machines.md))*

**Accessibility Tree (AXTree)**
A stripped-down, structured map of a web page built by the browser for screen readers—listing interactive buttons, links, inputs, and labels without messy CSS or decorative `<div>` clutter. Much smaller and cleaner for AI browser agents than raw HTML. *(Ch. [20](./03-tools-and-workspace-interaction/20-browser-automation-integration.md))*

**ACP (Agent Client Protocol)**
An open JSON-RPC protocol (pioneered by Zed and supported across editors and coding agents) that standardizes how code editors/IDEs talk to AI coding agents—sending prompts, streaming thoughts/tool status, approving permissions, and previewing diffs. Think of it as LSP, but for AI agents. *(Ch. [35](./06-extensibility-and-interfaces/35-client-server-protocols-json-rpc-acp-daemon-architecture.md))*

**Agent Harness**
All the software wrapped around a Large Language Model (LLM) that turns a stateless text-prediction API into a reliable software-engineering agent: tool loop, context manager, file editor, shell runner, sandbox, permissions, subagents, checkpoints, and telemetry. *(Ch. [00](./00-foundations/00-start-here-what-is-an-agent-harness.md))*

**`AGENTS.md` / `CLAUDE.md`**
Plain Markdown instruction files placed inside a repository (or user home directory) that tell an AI coding agent project-specific rules—how to run tests, code style conventions, architecture notes, and commands to avoid. *(Ch. [07](./02-context-and-memory/07-system-prompt-assembly-and-instruction-hierarchy.md))*

**ANSI Escape Sequences**
Invisible character codes (like `\x1b[31m`) that terminals interpret to render colors, bold text, cursor movement, and spinners. Harnesses usually strip them from tool outputs before sending logs to an LLM so they don't waste tokens. *(Ch. [11](./02-context-and-memory/11-tool-output-truncation-and-artifact-offloading.md), [17](./03-tools-and-workspace-interaction/17-shell-and-pty-session-management.md), [34](./06-extensibility-and-interfaces/34-tui-cli-event-rendering.md))*

**Artifact Offloading**
Saving a massive tool output (like a 50,000-line test log) to a temporary scratch file on disk and returning only a short preview plus the file path to the LLM, so the agent can inspect details on demand without blowing up its context window. *(Ch. [11](./02-context-and-memory/11-tool-output-truncation-and-artifact-offloading.md))*

**AST (Abstract Syntax Tree)**
A tree representation of source code's grammatical structure (functions, classes, imports, statements) produced by a parser like Tree-sitter. Lets harnesses inspect code structure or parse shell commands accurately instead of guessing with fragile regular expressions. *(Ch. [16](./03-tools-and-workspace-interaction/16-ast-and-language-server-protocol-lsp-integration.md), [23](./04-sandboxing-and-security/23-permission-models-and-command-approval-policies.md))*

**Atomic Write**
Updating a file safely by writing the full new contents to a temporary file in the same directory and then atomically renaming it (`os.replace`) over the target file, preventing half-written corrupted files if the process crashes mid-write. *(Ch. [14](./03-tools-and-workspace-interaction/14-file-reading-patching-and-diff-application.md))*

---

## B

**Backpressure**
A flow-control mechanism where a slow consumer (like a terminal renderer or disk logger) signals a fast producer (like an LLM token stream or noisy build command) to pause or drop/buffer data so memory doesn't grow without bound. *(Ch. [02](./01-core-loop-and-execution/02-streaming-and-event-parsing.md), [18](./03-tools-and-workspace-interaction/18-background-processes-and-async-notifications.md))*

**BM25**
A classic keyword-ranking algorithm (used in search engines and hybrid code search) that scores documents based on how often query terms appear and how rare those terms are across the whole codebase. *(Ch. [12](./02-context-and-memory/12-progressive-disclosure-and-on-demand-skills.md), [15](./03-tools-and-workspace-interaction/15-codebase-search-ripgrep-glob-semantic-indexing.md))*

**Bubblewrap (`bwrap`)**
A lightweight, unprivileged Linux sandboxing tool that uses Linux kernel namespaces (mount, PID, network, user) to run a command inside an isolated view of the filesystem and network without needing root privileges or Docker. *(Ch. [21](./04-sandboxing-and-security/21-os-level-sandboxing-seatbelt-bubblewrap-landlock-containers.md))*

---

## C

**CaMeL (CApabilities for MachinE Learning)**
A security architecture (from Google DeepMind / ETH Zurich) that defends against prompt injection by separating a **Privileged LLM** (which plans control flow from trusted instructions) from a **Quarantined LLM** (which extracts data from untrusted text without tool access), paired with capability/taint tracking. *(Ch. [24](./04-sandboxing-and-security/24-prompt-injection-defenses-and-trust-boundaries.md))*

**CDP (Chrome DevTools Protocol)**
The low-level WebSocket protocol used to inspect, debug, and automate Chromium-based browsers (clicking elements, reading DOM/AXTree, capturing screenshots, console logs, and network traffic). *(Ch. [20](./03-tools-and-workspace-interaction/20-browser-automation-integration.md))*

**Checkpoint**
A saved point-in-time snapshot of both the workspace files (often stored via a shadow Git repository or tree object) and the conversation transcript, allowing the user to safely rewind mistakes. *(Ch. [36](./07-reliability-and-evaluation/36-checkpointing-snapshots-and-rollback.md))*

**Circuit Breaker**
A safety switch that stops an agent or stops calling a failing service after repeated failures or detected doom loops, preventing runaway token spend or cascading outages. *(Ch. [05](./01-core-loop-and-execution/05-error-recovery-retries-and-infinite-loop-detection.md), [39](./07-reliability-and-evaluation/39-model-routing-and-rate-limit-fallbacks.md))*

**Compaction**
Shrinking a long conversation history before it overflows the context window or causes context rot—either by clearing stale tool outputs (*micro-compaction*) or summarizing earlier turns into a structured state checkpoint while keeping recent turns intact. *(Ch. [10](./02-context-and-memory/10-context-compaction-and-summarization.md))*

**Constrained Decoding (Structured Outputs)**
Forcing an LLM during token generation (using a grammar or finite-state machine derived from a JSON Schema) to emit only tokens that form valid JSON matching your exact tool schema (`strict: true`). *(Ch. [03](./01-core-loop-and-execution/03-tool-schema-design-and-structured-outputs.md))*

**Context Engineering**
The discipline of carefully choosing, ordering, compressing, and pruning every token sent into an LLM's context window at every turn to maximize reasoning accuracy while minimizing cost and latency. *(Ch. [07](./02-context-and-memory/07-system-prompt-assembly-and-instruction-hierarchy.md)–[13](./02-context-and-memory/13-short-term-vs-long-term-memory.md))*

**Context Rot**
The measurable drop in an LLM's reasoning accuracy, instruction-following, and recall as its context window fills up with long, noisy, or stale information—even well before hitting the hard maximum token limit. *(Ch. [09](./02-context-and-memory/09-context-window-budgeting.md))*

**Context Window**
The total token capacity (input + output/thinking) an LLM can process in a single API call. Functions as the model's short-term working desk. *(Ch. [00](./00-foundations/00-start-here-what-is-an-agent-harness.md), [09](./02-context-and-memory/09-context-window-budgeting.md))*

**Copy-on-Write (CoW) Clone**
A near-instant, zero-extra-disk-space filesystem copy (such as `cp -c` on macOS APFS or `cp --reflink=auto` on Linux Btrfs/XFS) where duplicated files share underlying disk blocks until one side modifies a file. *(Ch. [27](./05-multi-agent-and-orchestration/27-workspace-isolation-git-worktrees-ephemeral-clones.md))*

---

## D

**Daemon**
A long-running background process (such as a dev server, file watcher, or persistent agent core engine) designed to keep running indefinitely rather than exiting on its own. *(Ch. [18](./03-tools-and-workspace-interaction/18-background-processes-and-async-notifications.md), [35](./06-extensibility-and-interfaces/35-client-server-protocols-json-rpc-acp-daemon-architecture.md))*

**Data Contamination**
When benchmark tasks or their answers accidentally appeared in an LLM's training data, making eval scores look artificially high without reflecting real-world generalization. *(Ch. [40](./07-reliability-and-evaluation/40-agent-evaluation-harnesses-and-benchmarks.md))*

**Defense in Depth**
Layering multiple independent security controls (prompt boundaries + command approval policies + OS sandboxing + network filtering + secret isolation) so that if any single layer fails, the others still stop damage. *(Ch. [21](./04-sandboxing-and-security/21-os-level-sandboxing-seatbelt-bubblewrap-landlock-containers.md)–[25](./04-sandboxing-and-security/25-secret-and-credential-isolation.md))*

**Deterministic Replay**
Re-running a recorded session transcript against the harness using captured tool outputs or mock responses so engineers can reliably reproduce and debug bugs without flaky live LLM calls. *(Ch. [37](./07-reliability-and-evaluation/37-transcript-logging-and-deterministic-replay.md))*

**Doom Loop**
A failure mode where an agent gets stuck repeating the same failing tool call, oscillating between two broken edits (`A -> B -> A -> B`), or spinning on the same compiler error without making progress. *(Ch. [05](./01-core-loop-and-execution/05-error-recovery-retries-and-infinite-loop-detection.md))*

---

## E

**Egress Filtering**
Controlling outbound network connections from a sandboxed process—typically blocking all internet access by default and allowing only explicitly approved domains (e.g., package registries) through a filtering proxy. *(Ch. [22](./04-sandboxing-and-security/22-filesystem-and-network-isolation.md))*

**Elicitation (MCP)**
An MCP primitive that allows an MCP server to pause mid-tool-call and ask the client/user for structured missing input (such as a confirmation or parameter) via a safe UI flow. *(Ch. [19](./03-tools-and-workspace-interaction/19-model-context-protocol-mcp-client-architecture.md))*

**Environment Scrubbing**
Stripping sensitive host environment variables (like `OPENAI_API_KEY`, `AWS_SECRET_ACCESS_KEY`, `GITHUB_TOKEN`) before spawning a child shell command, passing only an explicit safe allowlist. *(Ch. [25](./04-sandboxing-and-security/25-secret-and-credential-isolation.md))*

**Episodic Memory**
Records of specific past sessions, events, or bugs encountered previously—contrasted with *working memory* (the live context window) and *semantic memory* (general facts and user preferences). *(Ch. [13](./02-context-and-memory/13-short-term-vs-long-term-memory.md))*

**Exponential Backoff with Jitter**
A retry strategy for transient API errors (`429`, `500`, `503`) that doubles the wait time after each failed attempt (`1s, 2s, 4s, 8s...`) and adds randomness (*jitter*) so many retrying clients don't slam the server at the exact same millisecond. *(Ch. [05](./01-core-loop-and-execution/05-error-recovery-retries-and-infinite-loop-detection.md), [39](./07-reliability-and-evaluation/39-model-routing-and-rate-limit-fallbacks.md))*

---

## F

**Fan-Out / Fan-In**
An orchestration pattern where one coordinator spawns many independent tasks in parallel (*fan-out*—e.g., analyzing 20 files at once) and then collects and combines all results into one final output (*fan-in*). *(Ch. [04](./01-core-loop-and-execution/04-parallel-tool-calling.md), [31](./05-multi-agent-and-orchestration/31-programmatic-agent-workflows.md))*

**FSM (Finite State Machine)**
A clean software design pattern that explicitly lists every valid state a session can be in (`idle`, `streaming`, `awaiting_approval`, `executing_tools`, `compacting`, `cancelled`, `error`) and the exact allowed transitions between them. *(Ch. [06](./01-core-loop-and-execution/06-session-and-turn-state-machines.md))*

---

## G

**Git Worktree**
A built-in Git feature (`git worktree add`) that lets you check out multiple branches of the same repository into separate directories at once, sharing one underlying `.git` object store so parallel agents can edit code without colliding. *(Ch. [27](./05-multi-agent-and-orchestration/27-workspace-isolation-git-worktrees-ephemeral-clones.md))*

**Glob**
A lightweight wildcard pattern for matching file paths (like `src/**/*.test.ts`), fast enough for an agent to map a repository's layout in milliseconds. *(Ch. [15](./03-tools-and-workspace-interaction/15-codebase-search-ripgrep-glob-semantic-indexing.md))*

---

## H

**Head+Tail Truncation**
A truncation strategy that keeps the *beginning* (command header/initial error) and *end* (final stack trace and summary) of a huge output while cutting out the repetitive middle. *(Ch. [11](./02-context-and-memory/11-tool-output-truncation-and-artifact-offloading.md))*

**HITL (Human-in-the-Loop)**
Designing explicit pause points where the agent asks a human to approve a high-risk action (like deleting files, pushing code, or making a payment) or review an implementation plan before proceeding. *(Ch. [23](./04-sandboxing-and-security/23-permission-models-and-command-approval-policies.md), [30](./05-multi-agent-and-orchestration/30-planning-mode-and-task-tracking.md))*

**Hook (Lifecycle Hook)**
A deterministic script, command, or callback configured to run automatically at specific points in the agent's lifecycle (such as `PreToolUse` to validate/block a command or `PostToolUse` to auto-format an edited file). *(Ch. [32](./06-extensibility-and-interfaces/32-lifecycle-hooks-and-interceptors.md))*

---

## I

**Indirect Prompt Injection**
An attack where malicious instructions are hidden inside untrusted external data that the agent reads—such as a repository's `README.md`, a GitHub issue, a git commit message, a web page, or an MCP tool response—trying to hijack the agent's tools. *(Ch. [24](./04-sandboxing-and-security/24-prompt-injection-defenses-and-trust-boundaries.md))*

**Instruction Hierarchy**
A strict trust ranking that defines whose instructions win when two messages conflict: typically System/Developer prompt > Enterprise Policy > Project Rules > User Message > Untrusted Tool Outputs. *(Ch. [07](./02-context-and-memory/07-system-prompt-assembly-and-instruction-hierarchy.md), [24](./04-sandboxing-and-security/24-prompt-injection-defenses-and-trust-boundaries.md))*

---

## J

**JSONL (JSON Lines / NDJSON)**
A text file format where every line is a complete, standalone JSON object separated by a newline (`\n`). Ideal for append-only session transcripts and streaming CLI output because you can append one event at a time without rewriting the whole file. *(Ch. [06](./01-core-loop-and-execution/06-session-and-turn-state-machines.md), [34](./06-extensibility-and-interfaces/34-tui-cli-event-rendering.md), [37](./07-reliability-and-evaluation/37-transcript-logging-and-deterministic-replay.md))*

**JSON-RPC 2.0**
A simple, lightweight remote procedure call protocol encoded in JSON, supporting requests (with an `id` expecting a response), notifications (fire-and-forget without an `id`), and structured errors. Used by LSP, MCP, and ACP. *(Ch. [16](./03-tools-and-workspace-interaction/16-ast-and-language-server-protocol-lsp-integration.md), [19](./03-tools-and-workspace-interaction/19-model-context-protocol-mcp-client-architecture.md), [35](./06-extensibility-and-interfaces/35-client-server-protocols-json-rpc-acp-daemon-architecture.md))*

---

## K

**KV Cache (Key-Value Cache)**
Internal mathematical tensors an LLM computes while reading your prompt's tokens. Prompt caching reuses those precomputed KV tensors across turns whenever the beginning (prefix) of your prompt stays byte-for-byte identical, slashing latency and input token cost by up to ~90%. *(Ch. [08](./02-context-and-memory/08-prompt-caching-and-prefix-stability.md))*

---

## L

**Landlock LSM**
A Linux Security Module built into modern Linux kernels that lets an unprivileged process voluntarily lock itself (and its future children) down to specific allowed file paths and TCP ports—rules that can never be loosened afterward. *(Ch. [21](./04-sandboxing-and-security/21-os-level-sandboxing-seatbelt-bubblewrap-landlock-containers.md))*

**Lethal Trifecta**
Security researcher Simon Willison's term for the dangerous combination of three capabilities in one agent: (1) access to private data, (2) exposure to untrusted content, and (3) the ability to externally communicate or act. Having all three without strict architectural isolation creates data-exfiltration risk. *(Ch. [24](./04-sandboxing-and-security/24-prompt-injection-defenses-and-trust-boundaries.md))*

**LLM-as-a-Judge**
Using a separate LLM call with a strict rubric to grade open-ended agent outputs (like explanations, plans, or UI quality) when deterministic unit tests alone cannot capture quality. *(Ch. [40](./07-reliability-and-evaluation/40-agent-evaluation-harnesses-and-benchmarks.md))*

**LSP (Language Server Protocol)**
An open JSON-RPC protocol that lets editors and coding agents ask language-specific servers (like `pyright`, `rust-analyzer`, or `typescript-language-server`) for type errors (*diagnostics*), symbol definitions, and all references across a project. *(Ch. [16](./03-tools-and-workspace-interaction/16-ast-and-language-server-protocol-lsp-integration.md))*

---

## M

**MCP (Model Context Protocol)**
An open standard (often called "USB-C for AI tools") that defines a uniform way for agent harnesses (MCP clients) to connect to external tool and data providers (MCP servers) over `stdio` or Streamable HTTP. *(Ch. [19](./03-tools-and-workspace-interaction/19-model-context-protocol-mcp-client-architecture.md))*

**Micro-Compaction**
A cheap, lossless-preserving step performed before full summarization that replaces bulky, older tool results (like 400-line file reads from 20 turns ago) with short placeholders while leaving recent turns and conversation structure intact. *(Ch. [10](./02-context-and-memory/10-context-compaction-and-summarization.md))*

**MicroVM**
A lightweight virtual machine (such as AWS Firecracker or Apple Virtualization) with its own isolated Linux kernel that boots in hundreds of milliseconds, providing stronger hardware-level isolation than standard Docker containers. *(Ch. [21](./04-sandboxing-and-security/21-os-level-sandboxing-seatbelt-bubblewrap-landlock-containers.md))*

---

## O

**OpenTelemetry (OTel)**
An open-source observability standard for collecting distributed traces, metrics, and logs—including **GenAI Semantic Conventions** that standardize how harnesses record LLM spans, tool spans, and token usage. *(Ch. [38](./07-reliability-and-evaluation/38-telemetry-tracing-and-token-cost-accounting.md))*

**Orphan `tool_use` Block**
A conversation corruption bug where an assistant message contains a `tool_use` call without an immediately following matching `tool_result` (often caused by an unhandled `Ctrl+C` or buggy compaction). Most LLM APIs immediately reject the entire request with a `400` error when this happens. *(Ch. [06](./01-core-loop-and-execution/06-session-and-turn-state-machines.md), [10](./02-context-and-memory/10-context-compaction-and-summarization.md))*

---

## P

**`pass@k` vs. `pass^k`**
Two complementary evaluation metrics across $k$ repeated trials of the same task: `pass@k` measures the chance that *at least one* of $k$ attempts succeeds (capability ceiling), while `pass^k` measures the chance that *all* $k$ attempts succeed (production reliability). *(Ch. [40](./07-reliability-and-evaluation/40-agent-evaluation-harnesses-and-benchmarks.md))*

**PGID (Process Group ID)**
An OS identifier shared by a spawned shell command and all child processes it creates. Starting commands in a new session (`setsid`) lets a harness kill the entire process tree cleanly (`killpg(-pgid, SIGTERM)`) instead of leaving orphan background processes behind. *(Ch. [17](./03-tools-and-workspace-interaction/17-shell-and-pty-session-management.md), [18](./03-tools-and-workspace-interaction/18-background-processes-and-async-notifications.md))*

**Prefix Stability**
Keeping the leading tokens of every API request (system prompt, tool definitions, and earlier conversation turns) strictly unchanged across turns so the LLM provider's prompt cache hits on every step. *(Ch. [08](./02-context-and-memory/08-prompt-caching-and-prefix-stability.md))*

**Progressive Disclosure**
Loading only tiny metadata indexes (like skill names and one-line descriptions) into the initial prompt and fetching full instructions, reference docs, or deferred tool schemas only when the current task actually needs them. *(Ch. [12](./02-context-and-memory/12-progressive-disclosure-and-on-demand-skills.md))*

**Proxy-Based Credential Injection**
A security pattern where the sandboxed agent receives a fake placeholder token, and a trusted proxy outside the sandbox swaps in the real secret *only* when the request goes to an explicitly allowlisted host—so the sandbox never sees the real secret. *(Ch. [25](./04-sandboxing-and-security/25-secret-and-credential-isolation.md))*

**PTY (Pseudo-Terminal)**
A virtual terminal pair created by the OS that makes a command behave as if a real human were sitting at a keyboard and screen (supporting interactive prompts, line editing, colors, and terminal resize signals). *(Ch. [17](./03-tools-and-workspace-interaction/17-shell-and-pty-session-management.md))*

---

## R

**ReAct (Reason + Act)**
The foundational agent loop where a model alternates between *Reasoning* about the goal, *Acting* by invoking a tool, and *Observing* the tool's output until the task is complete. *(Ch. [01](./01-core-loop-and-execution/01-agent-tool-use-loop.md))*

**Reactive Wakeup**
An event-driven pattern where an agent goes completely idle (consuming zero tokens and zero CPU) after launching a background command or subagent, and the harness automatically resumes the agent when a completion message arrives. *(Ch. [18](./03-tools-and-workspace-interaction/18-background-processes-and-async-notifications.md), [28](./05-multi-agent-and-orchestration/28-inter-agent-messaging-and-reactive-wakeups.md))*

**Ring Buffer**
A fixed-size circular memory buffer that automatically overwrites the oldest bytes once full, allowing a harness to capture live logs from a noisy background process without ever running out of RAM. *(Ch. [18](./03-tools-and-workspace-interaction/18-background-processes-and-async-notifications.md))*

**Ripgrep (`rg`)**
An ultra-fast Rust command-line text search tool that automatically respects `.gitignore` and skips binary files, making it the default lexical search engine inside modern coding agents. *(Ch. [15](./03-tools-and-workspace-interaction/15-codebase-search-ripgrep-glob-semantic-indexing.md))*

---

## S

**Seatbelt (`sandbox-exec` / SBPL)**
macOS's kernel-level sandboxing framework configured via Scheme-like Sandbox Profile Language (SBPL) rules that restrict which files, network sockets, and system calls a child process is allowed to access. *(Ch. [21](./04-sandboxing-and-security/21-os-level-sandboxing-seatbelt-bubblewrap-landlock-containers.md))*

**Set-of-Mark (SoM)**
A visual grounding technique for browser agents where the harness overlays numbered bounding boxes (`[1]`, `[2]`, `[3]`) onto clickable elements in a screenshot so a vision-capable LLM can accurately say "click `[14]`" instead of guessing raw pixel coordinates. *(Ch. [20](./03-tools-and-workspace-interaction/20-browser-automation-integration.md))*

**Shadow Git Repository**
A hidden, separate Git directory (`GIT_DIR` stored outside the user's repo, pointed at the user's workspace via `GIT_WORK_TREE`) used by a harness to take instant checkpoints without touching the user's real `.git` history or staging area. *(Ch. [36](./07-reliability-and-evaluation/36-checkpointing-snapshots-and-rollback.md))*

**Skill (`SKILL.md`)**
A portable folder of specialized instructions, scripts, and reference docs (with YAML frontmatter describing when to trigger it) that an agent harness discovers and loads on demand via progressive disclosure. *(Ch. [12](./02-context-and-memory/12-progressive-disclosure-and-on-demand-skills.md), [33](./06-extensibility-and-interfaces/33-plugin-and-configuration-discovery.md))*

**SSE (Server-Sent Events)**
A simple HTTP streaming standard where a server pushes incremental text events (`data: {...}\n\n`) over a long-lived HTTP response—used by virtually all LLM APIs to stream tokens and tool arguments in real time. *(Ch. [02](./01-core-loop-and-execution/02-streaming-and-event-parsing.md))*

**Stale-Read Guard**
Checking a file's modification timestamp (`mtime`) or SHA-256 content hash before applying an edit to confirm nobody else modified the file since the agent last read it. *(Ch. [14](./03-tools-and-workspace-interaction/14-file-reading-patching-and-diff-application.md))*

**Stop Reason**
A field returned by the LLM API explaining *why* generation stopped—such as `end_turn` (finished answering), `tool_use` (wants the harness to run tools), `max_tokens` (ran out of output room), or `refusal`. Drives the harness's main loop. *(Ch. [01](./01-core-loop-and-execution/01-agent-tool-use-loop.md))*

**Streamable HTTP (MCP)**
The modern remote transport in the Model Context Protocol (replacing legacy HTTP+SSE), using a single HTTP endpoint that supports regular JSON responses, optional SSE streaming, and resumable sessions via `Mcp-Session-Id`. *(Ch. [19](./03-tools-and-workspace-interaction/19-model-context-protocol-mcp-client-architecture.md))*

**Subagent**
An isolated child agent spawned by a parent agent with a focused prompt, its own clean context window, and scoped tools—returning only a concise summary so noisy intermediate exploration never pollutes the parent's context. *(Ch. [26](./05-multi-agent-and-orchestration/26-subagent-spawning-and-context-isolation.md))*

---

## T

**Taint Tracking**
Labeling data inside a harness with its trust level (e.g., `trusted_user` vs. `untrusted_external`) and propagating that label through computations so sensitive actions can be blocked if influenced by untrusted data. *(Ch. [24](./04-sandboxing-and-security/24-prompt-injection-defenses-and-trust-boundaries.md))*

**Token**
The basic unit of text processed and billed by an LLM—typically a word, subword, or punctuation mark (roughly 3–4 English characters on average). *(Ch. [00](./00-foundations/00-start-here-what-is-an-agent-harness.md), [09](./02-context-and-memory/09-context-window-budgeting.md))*

**Trajectory**
The complete ordered sequence of thoughts, tool calls, tool observations, edits, and final outputs produced by an agent while solving a task—used for debugging, replay, and evaluation. *(Ch. [37](./07-reliability-and-evaluation/37-transcript-logging-and-deterministic-replay.md), [40](./07-reliability-and-evaluation/40-agent-evaluation-harnesses-and-benchmarks.md))*

**TTFT (Time To First Token)**
The elapsed time from sending an API request to receiving the very first streamed token back from the LLM—the single biggest driver of how snappy or sluggish an agent feels to a user. *(Ch. [02](./01-core-loop-and-execution/02-streaming-and-event-parsing.md), [38](./07-reliability-and-evaluation/38-telemetry-tracing-and-token-cost-accounting.md))*

**TUI (Terminal User Interface)**
A rich interactive interface drawn inside a terminal window (with live markdown, colored diffs, spinners, and keyboard navigation) built with frameworks like Ink, Ratatui, or Bubble Tea. *(Ch. [34](./06-extensibility-and-interfaces/34-tui-cli-event-rendering.md))*

---

## U

**Unified Diff**
A standard patch format (`---`, `+++`, `@@ -start,count +start,count @@`, with `-` removed lines, `+` added lines, and unchanged context lines) used by Git and patch-based coding agents to describe surgical file edits compactly. *(Ch. [14](./03-tools-and-workspace-interaction/14-file-reading-patching-and-diff-application.md))*

---

[← 40. Agent Evaluation Harnesses & Benchmarks](./07-reliability-and-evaluation/40-agent-evaluation-harnesses-and-benchmarks.md) | [Table of Contents](./README.md)
