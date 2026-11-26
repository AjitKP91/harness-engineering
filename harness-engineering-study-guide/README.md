# The Complete Guide to AI Agent Harness Engineering

> **A zero-to-mastery, human-friendly textbook on how modern AI coding agents actually work under the hood.**
>
> *Currency note (verified as of November 2026): Architectural principles in this guide are foundational and evergreen; vendor-specific API endpoints, CLI flags, environment variables, and protocol details reflect 2025–2026 releases and evolve rapidly—always check your provider's latest reference docs before shipping.*

If you have ever wondered how tools like Claude Code, OpenAI's Codex CLI, Gemini CLI, OpenCode, or Aider actually turn a text-predicting language model into an agent that can read repositories, edit files safely, run tests, spawn helper agents, and work for hours without losing its mind—you are in the right place.

The secret is not just a smarter AI model. It is **the harness**: the software wrapped around the model.

```text
  AI Agent  =  Language Model (the brain)  +  Agent Harness (the body, senses, memory, and guardrails)
```

---

## Who This Guide Is For

- **Total beginners to AI engineering:** Every guide starts from scratch, explains every acronym in plain English, and uses everyday analogies before touching code.
- **Software engineers building their first agent:** You get real architectures, working code blueprints, trade-off tables, and failure modes learned from production harnesses.
- **Staff/systems engineers hardening production agents:** You get deep dives into prompt caching, OS-level sandboxing (Seatbelt, Landlock, Bubblewrap), compaction algorithms, MCP/ACP protocols, deterministic replay, and benchmark harnesses.

---

## How to Read This Guide

1. **Start at Module 0:** Read [Start Here: What Is an Agent Harness?](./00-foundations/00-start-here-what-is-an-agent-harness.md) first if you are brand new to LLMs, APIs, or coding agents.
2. **Follow the links in order:** Every chapter has `← Previous | Table of Contents | Next →` navigation so you can read it straight through like a book.
3. **Keep the Glossary open:** Any unfamiliar word is explained gently when first introduced, and summarized in the [Plain-English Glossary](./GLOSSARY.md).
4. **See the full syllabus:** Check [PLAN.md](./PLAN.md) for the subtopic breakdown behind every chapter.

### Suggested Reading Paths

| Path | Goal | Chapters to Read |
| :--- | :--- | :--- |
| **Weekend Builder** | Build a working local coding agent from scratch | `00`, `01`, `03`, `05`, `07`, `09`, `14`, `15`, `17`, `23` |
| **Context & Cost Master** | Make agents fast, cheap, and accurate on long sessions | `07`, `08`, `09`, `10`, `11`, `12`, `13`, `26`, `38` |
| **Security & Sandboxing** | Run untrusted commands and tools safely | `17`, `21`, `22`, `23`, `24`, `25`, `36` |
| **Multi-Agent & Platform** | Orchestrate swarms, plugins, IDEs, and evals | `19`, `26`–`35`, `37`, `39`, `40` |

---

## Full Curriculum Map

### Module 0: Foundations
- [00. Start Here: What Is an Agent Harness?](./00-foundations/00-start-here-what-is-an-agent-harness.md)

### Module 1: Core Loop & Execution
1. [Agent Tool-Use Loop](./01-core-loop-and-execution/01-agent-tool-use-loop.md)
2. [Streaming & Event Parsing](./01-core-loop-and-execution/02-streaming-and-event-parsing.md)
3. [Tool Schema Design & Structured Outputs](./01-core-loop-and-execution/03-tool-schema-design-and-structured-outputs.md)
4. [Parallel Tool Calling](./01-core-loop-and-execution/04-parallel-tool-calling.md)
5. [Error Recovery, Retries & Infinite-Loop Detection](./01-core-loop-and-execution/05-error-recovery-retries-and-infinite-loop-detection.md)
6. [Session & Turn State Machines](./01-core-loop-and-execution/06-session-and-turn-state-machines.md)

### Module 2: Context & Memory
7. [System Prompt Assembly & Instruction Hierarchy](./02-context-and-memory/07-system-prompt-assembly-and-instruction-hierarchy.md)
8. [Prompt Caching & Prefix Stability](./02-context-and-memory/08-prompt-caching-and-prefix-stability.md)
9. [Context Window Budgeting](./02-context-and-memory/09-context-window-budgeting.md)
10. [Context Compaction & Summarization](./02-context-and-memory/10-context-compaction-and-summarization.md)
11. [Tool Output Truncation & Artifact Offloading](./02-context-and-memory/11-tool-output-truncation-and-artifact-offloading.md)
12. [Progressive Disclosure & On-Demand Skills](./02-context-and-memory/12-progressive-disclosure-and-on-demand-skills.md)
13. [Short-Term vs. Long-Term Memory](./02-context-and-memory/13-short-term-vs-long-term-memory.md)

### Module 3: Tools & Workspace Interaction
14. [File Reading, Patching & Diff Application](./03-tools-and-workspace-interaction/14-file-reading-patching-and-diff-application.md)
15. [Codebase Search (Ripgrep, Glob, Semantic Indexing)](./03-tools-and-workspace-interaction/15-codebase-search-ripgrep-glob-semantic-indexing.md)
16. [AST & Language Server Protocol (LSP) Integration](./03-tools-and-workspace-interaction/16-ast-and-language-server-protocol-lsp-integration.md)
17. [Shell & PTY Session Management](./03-tools-and-workspace-interaction/17-shell-and-pty-session-management.md)
18. [Background Processes & Async Notifications](./03-tools-and-workspace-interaction/18-background-processes-and-async-notifications.md)
19. [Model Context Protocol (MCP) Client Architecture](./03-tools-and-workspace-interaction/19-model-context-protocol-mcp-client-architecture.md)
20. [Browser Automation Integration](./03-tools-and-workspace-interaction/20-browser-automation-integration.md)

### Module 4: Sandboxing & Security
21. [OS-Level Sandboxing (macOS Seatbelt, Linux Bubblewrap/Landlock, Containers)](./04-sandboxing-and-security/21-os-level-sandboxing-seatbelt-bubblewrap-landlock-containers.md)
22. [Filesystem & Network Isolation](./04-sandboxing-and-security/22-filesystem-and-network-isolation.md)
23. [Permission Models & Command Approval Policies](./04-sandboxing-and-security/23-permission-models-and-command-approval-policies.md)
24. [Prompt Injection Defenses & Trust Boundaries](./04-sandboxing-and-security/24-prompt-injection-defenses-and-trust-boundaries.md)
25. [Secret & Credential Isolation](./04-sandboxing-and-security/25-secret-and-credential-isolation.md)

### Module 5: Multi-Agent & Orchestration
26. [Subagent Spawning & Context Isolation](./05-multi-agent-and-orchestration/26-subagent-spawning-and-context-isolation.md)
27. [Workspace Isolation (Git Worktrees / Ephemeral Clones)](./05-multi-agent-and-orchestration/27-workspace-isolation-git-worktrees-ephemeral-clones.md)
28. [Inter-Agent Messaging & Reactive Wakeups](./05-multi-agent-and-orchestration/28-inter-agent-messaging-and-reactive-wakeups.md)
29. [Multi-Agent Swarms & Shared Coordination](./05-multi-agent-and-orchestration/29-multi-agent-swarms-and-shared-coordination.md)
30. [Planning Mode & Task Tracking](./05-multi-agent-and-orchestration/30-planning-mode-and-task-tracking.md)
31. [Programmatic Agent Workflows](./05-multi-agent-and-orchestration/31-programmatic-agent-workflows.md)

### Module 6: Extensibility & Interfaces
32. [Lifecycle Hooks & Interceptors](./06-extensibility-and-interfaces/32-lifecycle-hooks-and-interceptors.md)
33. [Plugin & Configuration Discovery](./06-extensibility-and-interfaces/33-plugin-and-configuration-discovery.md)
34. [TUI / CLI Event Rendering](./06-extensibility-and-interfaces/34-tui-cli-event-rendering.md)
35. [Client-Server Protocols (JSON-RPC, ACP, Daemon Architecture)](./06-extensibility-and-interfaces/35-client-server-protocols-json-rpc-acp-daemon-architecture.md)

### Module 7: Reliability & Evaluation
36. [Checkpointing, Snapshots & Rollback](./07-reliability-and-evaluation/36-checkpointing-snapshots-and-rollback.md)
37. [Transcript Logging & Deterministic Replay](./07-reliability-and-evaluation/37-transcript-logging-and-deterministic-replay.md)
38. [Telemetry, Tracing & Token/Cost Accounting](./07-reliability-and-evaluation/38-telemetry-tracing-and-token-cost-accounting.md)
39. [Model Routing & Rate-Limit Fallbacks](./07-reliability-and-evaluation/39-model-routing-and-rate-limit-fallbacks.md)
40. [Agent Evaluation Harnesses & Benchmarks](./07-reliability-and-evaluation/40-agent-evaluation-harnesses-and-benchmarks.md)

### Reference
- [Plain-English Glossary](./GLOSSARY.md)
- [Curriculum Plan & Subtopic Syllabus](./PLAN.md)
