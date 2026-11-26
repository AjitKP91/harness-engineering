> **Module 4: Sandboxing & Security** | Prerequisites: Chapters 21–24 | Reading Time: ~20 min
>
> [← 24. Prompt Injection Defenses & Trust Boundaries](./24-prompt-injection-defenses-and-trust-boundaries.md) | [Table of Contents](../README.md) | [26. Subagent Spawning & Context Isolation →](../05-multi-agent-and-orchestration/26-subagent-spawning-and-context-isolation.md)

# 25. Secret & Credential Isolation

In Chapter 24, we learned how to guard an agent's reasoning against untrusted inputs and break the Lethal Trifecta. Now let's look at the single highest-value target sitting on almost every developer's computer: **secrets and credentials**—API keys, GitHub tokens, cloud access keys, SSH private keys, and database passwords.

If a coding agent accidentally deletes a source file, `git checkout` brings it back in two seconds. If a coding agent leaks a production cloud key into a prompt log, a public pull request, or an external endpoint, **you cannot undo it**—you have an active security incident and an emergency key rotation on your hands.

---

## 1. The Simple Idea: Valet Keys and Sealed Envelopes

Imagine you pull up to a hotel and hand your car over to the valet. Do you hand them your **entire keyring**—house keys, safe deposit key, office badge—plus your wallet with your credit cards and PIN numbers?

Of course not! You hand them a **valet key**: a restricted key that starts the engine and opens the driver's door, cannot open the glovebox or trunk, and stays useless the moment you take the car back.

Now imagine an even better setup for paying the parking garage: instead of giving the valet your actual credit card, you give them a **plastic claim ticket**. When the car reaches the approved garage exit gate, the hotel's billing office verifies the gate and pays directly behind the scenes. Even if someone steals the claim ticket out of the valet's pocket, it is just a worthless piece of plastic.

That is **Secret & Credential Isolation** in an agent harness:
- **Environment scrubbing** keeps your house keys and wallet out of the agent's pockets.
- **Proxy-based credential injection** hands the sandbox a worthless **placeholder token** ("claim ticket"), while a trusted proxy outside the sandbox swaps in the real credential *only* when talking to an approved destination.
- **Redaction pipelines** act like a black marker scrubbing any stray sensitive numbers before text is sent to an LLM provider, written to disk transcripts, or exported to telemetry.
- **Ephemeral, least-privilege tokens** act like **valet keys** that expire automatically in minutes.

**What breaks if you don't isolate secrets?**
- Every subprocess your agent spawns inherits your shell's entire environment (`AWS_SECRET_ACCESS_KEY`, `OPENAI_API_KEY`, `GITHUB_TOKEN`, `DATABASE_URL`) by default.
- A single debugging command (`env`, `printenv`, `curl -v`, or a verbose stack trace) dumps live production secrets directly into the LLM's context window—sending them to an external model provider and saving them permanently in local transcript files.
- A prompt injection (Chapter 24) or compromised `npm install` postinstall script inside the workspace can harvest real credentials immediately.

---

## 2. Why This Matters in a Real Agent Harness

Most traditional developer tools don't have a "secret pipeline" problem because only the developer sees their own terminal. An AI coding agent completely changes the data flow:

1. **Everything the tool prints leaves your machine.** When a shell command prints a secret to `stdout` or `stderr`, the harness captures that text and sends it over HTTPS to the **Large Language Model (LLM)** API on the next turn. Even with zero-data-retention enterprise agreements, you never want live production passwords sitting inside model prompts.
2. **Harnesses persist everything for debugging and replay.** Modern harnesses write append-only JSONL session transcripts (Chapter 37), crash logs, and OpenTelemetry tracing spans (Chapter 38). One unredacted `.env` read can duplicate a secret into five different log files and cloud dashboards.
3. **Coding agents run untrusted third-party code.** Running `npm test`, `pytest`, or `cargo build` executes thousands of lines of third-party dependencies and build scripts inside the same process tree. If real credentials live in environment variables or readable files inside the sandbox, *any* dependency can read them—no prompt injection required!
4. **Static secrets outlive the session.** Unlike a broken edit that you can roll back with a Git checkpoint (Chapter 36), an exposed long-lived token remains dangerous until a human detects the leak and revokes it across every system.

> **The golden rule of credential isolation:** The agent and its sandbox should **never possess a raw secret** whenever a host-side proxy, brokered tool, or short-lived scoped token can do the job instead.

---

## 3. The Big Picture

In a properly isolated harness, real credentials live strictly in the **Host Control Plane**—never inside the sandboxed process tree, never in raw LLM prompts, and never in transcripts or telemetry:

```mermaid
flowchart LR
    VAULT["Host Secret Vault (Real Keys & Ephemeral Tokens)"] --> PROXY["Host Egress Credential Proxy"]
    VAULT -->|"Mint Opaque Placeholder"| ENV["Scrubbed Env Builder (Allowlist Only)"]
    ENV --> SBX["Isolated Sandbox (Agent Tools & Tests)"]
    SBX -->|"HTTPS with Placeholder Token"| PROXY
    PROXY -->|"Host Allowed? Swap Real Header"| API["Approved External API (e.g. api.github.com)"]
    PROXY -->|"Host Unapproved? Block / Keep Dummy"| BLK["Denied Egress & Audit Log"]
    SBX -->|"Tool stdout / stderr"| RED["Redaction Pipeline (Exact + Regex + Entropy)"]
    RED -->|"Scrubbed Text Only"| LLM["LLM Context Window"]
    RED -->|"Scrubbed Text Only"| LOG["Transcripts & Telemetry"]
```

Look closely at the two protective choke points:
1. **Outbound to external APIs (`Host Egress Credential Proxy`):** The sandbox only holds a dummy placeholder; the host proxy validates the destination hostname and swaps in the real secret on the wire.
2. **Inbound back to the harness (`Redaction Pipeline`):** Before any tool output touches the LLM prompt, disk transcript, or observability pipeline, a deterministic scanner masks anything that looks like—or exactly matches—a real secret.

---

## 4. Deep Dive: Subtopic by Subtopic

### 4.1 How Secrets Leak in Coding Agents (The Five Leak Channels)

Before you can plug leaks, you have to map every pipe secrets travel through. In practice, secrets leak through **five distinct channels**:

| Leak Channel | How It Happens in Real Sessions | Why Teams Miss It | Primary Architectural Defense |
| :--- | :--- | :--- | :--- |
| **1. Inherited Environment Variables** | Harness calls `subprocess.run("pytest")` without overriding `env`; child process inherits the parent shell's entire `os.environ` (`AWS_*`, `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`). | Works silently in local testing—nobody notices until a test logs `process.env` or dumps a config object on crash. | **Allowlist-based environment scrubbing** on every spawned subprocess and PTY. |
| **2. Workspace & Host Secret Files** | Agent runs `read_file(".env")`, `grep "API_KEY"`, or reads `~/.aws/credentials`, `~/.npmrc`, `~/.netrc`, or `~/.ssh/id_ed25519`. | Engineers scrub `env`, then forget `.env` is sitting right inside the repository folder! | **OS sandbox path denies** (Chapter 22) + tool-level ignore lists for `.env*`, `*.pem`, `*.key`, and credential dirs. |
| **3. Command Output & Debug Traces** | `curl -v`, HTTP client debug logs, Terraform plans, or exception tracebacks print `Authorization: Bearer ...` headers or database URLs with embedded passwords. | Even legitimate debugging commands echo credentials in error messages. | **Proxy-based credential injection** (so the tool never saw the real header) + **output redaction**. |
| **4. Transcripts & Checkpoints** | Harness saves full raw tool results to `~/.agent/sessions/*.jsonl` or creates shadow Git snapshots (Chapter 36) that accidentally include `.env`. | Transcripts are written by the *host* harness, which may log raw outputs before redacting for the UI. | **Redact at ingestion** (before writing to context *and* before writing to disk); exclude secret patterns from checkpoints. |
| **5. Telemetry & LLM Provider Payloads** | OpenTelemetry spans, error-tracking SDKs (Sentry), or API request logs record tool arguments or outputs containing leaked keys. | Observability hooks often attach raw `tool.output` attributes automatically. | **Single redaction gate** upstream of LLM requests, transcripts, and telemetry exporters. |

---

### 4.2 Environment Scrubbing: Allowlists Over Denylists

When your harness launches a shell command, test runner, linter, or local MCP subprocess, your operating system defaults to **copying every environment variable** from the parent harness process into the child.

That means the child process automatically receives:
- The harness's *own* LLM API keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`)!
- The developer's personal cloud and package credentials (`AWS_SECRET_ACCESS_KEY`, `NPM_TOKEN`, `STRIPE_API_KEY`, `GH_TOKEN`).
- Database connection strings (`DATABASE_URL=postgres://admin:supersecret@prod...`).

#### Why Denylists Alone Fall Short

A common first attempt is a **denylist**: *"Drop any variable whose name contains `KEY`, `SECRET`, or `TOKEN`."* That catches obvious names, but silently leaks variables like:
- `DATABASE_URL`, `REDIS_URL`, `MONGO_URI` (credentials embedded inside a URL)
- `PGPASSWORD`, `MYSQL_PWD`, `DOCKER_AUTH_CONFIG`
- `TWILIO_AUTH`, `SLACK_WEBHOOK`, `SENTRY_DSN`
- Custom internal names like `ACME_PROD_CRED` or `BILLING_PASS`

#### The Better Pattern: Default-Deny Allowlist + Explicit Overrides

Start from an **empty dictionary** and explicitly copy only a small **core allowlist** needed for developer tools to function (`PATH`, `HOME`, `USER`, `SHELL`, `TERM`, `LANG`, `LC_ALL`, `TMPDIR`, `TZ`, plus toolchain paths like `GOPATH`, `CARGO_HOME`, `VIRTUAL_ENV`). Then add deterministic non-interactive flags (`CI=true`, `PAGER=cat`, `GIT_TERMINAL_PROMPT=0` from Chapter 17) and any **explicitly approved** project variables.

```python
import fnmatch
import os
from typing import Mapping

# Safe baseline variables required for shells, compilers, and locales to work.
CORE_ENV_ALLOWLIST: frozenset[str] = frozenset({
    "PATH", "HOME", "USER", "LOGNAME", "SHELL",
    "TERM", "COLORTERM", "LANG", "LC_ALL", "LC_CTYPE",
    "TZ", "TMPDIR", "TEMP", "TMP",
    "XDG_CACHE_HOME", "XDG_CONFIG_HOME", "XDG_DATA_HOME",
    "GOPATH", "GOROOT", "CARGO_HOME", "RUSTUP_HOME",
    "VIRTUAL_ENV", "CONDA_PREFIX", "NODE_ENV",
})

# Defense-in-depth denylist: blocks sensitive names even if a user broadens rules.
SENSITIVE_NAME_PATTERNS: tuple[str, ...] = (
    "*KEY*", "*SECRET*", "*TOKEN*", "*PASS*", "*PWD*",
    "*CRED*", "*AUTH*", "*COOKIE*", "*SESSION*", "*DSN*",
    "DATABASE_URL", "REDIS_URL", "MONGO_URI", "AWS_*", "AZURE_*", "GCP_*",
)


def build_scrubbed_env(
    host_env: Mapping[str, str] | None = None,
    extra_allowlist: set[str] | None = None,
    explicit_set: Mapping[str, str] | None = None,
) -> dict[str, str]:
    """
    Construct a minimal, safe environment dict for a sandboxed child process.
    Uses allowlist-first inheritance + sensitive-name guardrails.
    """
    source = os.environ if host_env is None else host_env
    allowed = set(CORE_ENV_ALLOWLIST) | (extra_allowlist or set())

    scrubbed: dict[str, str] = {}
    for name, value in source.items():
        if name not in allowed:
            continue
        upper_name = name.upper()
        if any(fnmatch.fnmatch(upper_name, pat) for pat in SENSITIVE_NAME_PATTERNS):
            # Refuse to inherit even if misconfigured into extra_allowlist.
            continue
        scrubbed[name] = value

    # Deterministic harness defaults (prevent interactive hangs, Chapter 17).
    scrubbed.setdefault("CI", "true")
    scrubbed.setdefault("PAGER", "cat")
    scrubbed.setdefault("GIT_TERMINAL_PROMPT", "0")

    # Apply explicit safe overrides (e.g., placeholder tokens or proxy URLs).
    if explicit_set:
        scrubbed.update(explicit_set)

    return scrubbed
```

Notice how clean this is: even if the host shell has 85 exported variables including 12 production tokens, the child process sees only ~15 safe system variables—and zero real keys.

---

### 4.3 Proxy-Based Credential Injection (Zero-Secret Sandboxes)

Environment scrubbing solves accidental leaks when the sandbox *doesn't need* a credential. But what when the agent legitimately **does** need to talk to an authenticated API—such as pushing a branch to GitHub, pulling a private npm/PyPI package, or calling an internal staging API?

If you inject the real `GITHUB_TOKEN` into the sandbox, you're back to square one: any command, test, or prompt-injected script inside the sandbox can read and steal it.

The modern 2025–2026 architectural solution—pioneered in micro-VM agent sandboxes like **Gondolin**, cloud coding sandboxes, and enterprise AI gateways—is **Proxy-Based Credential Injection** (also called a **Credential Injection Proxy** or **Secret-Free Sandbox**).

#### How It Works Step by Step

1. **Mint an opaque placeholder on the host:** Before starting the sandbox, the host harness registers each real secret in memory and generates a unique, high-entropy **placeholder token** (for example, `HARNESS_PLACEHOLDER_GH_7a9e4c1b8f20...`), bound to a strict **host allowlist** (for example, `api.github.com` and `github.com` only).
2. **Pass *only* the placeholder into the sandbox:** Inside the sandbox, `GITHUB_TOKEN` is set to `HARNESS_PLACEHOLDER_GH_7a9e4c1b8f20...`, and outbound HTTP/HTTPS traffic is forced through a host-side proxy (`HTTP_PROXY` / `HTTPS_PROXY`, or a virtual network interface inside a micro-VM with no direct internet route).
3. **Intercept outbound requests at the host boundary:** When `git`, `gh`, `npm`, or a Python script makes an HTTPS request to `https://api.github.com/repos/...`, the request hits the host-side proxy (which terminates **Transport Layer Security (TLS)** using a locally trusted sandbox CA certificate—the sandbox only trusts the proxy's ephemeral CA).
4. **Verify destination host, then swap on the wire:**
   - The proxy checks: *Does this request's target hostname match the exact host allowlist bound to `HARNESS_PLACEHOLDER_GH_...`?*
   - **If YES (`api.github.com`):** The proxy replaces the placeholder in the `Authorization` header (or configured header) with the **real token**, forwards the request over standard TLS to GitHub, and scrubs the real token from any response/error echo before returning the response to the sandbox.
   - **If NO (e.g., `untrusted.example`):** The proxy **refuses to substitute** (and ideally blocks the request outright and logs a high-severity security alert!). Even if the request ever got out, the recipient would only receive a worthless placeholder string.

```text
  SANDBOX (Untrusted Execution Zone)              HOST PROXY (Trusted Zone)            EXTERNAL API
  ==================================              =========================            ============
  env: GITHUB_TOKEN=PLACEHOLDER_GH_7a9e...

  1. Legitimate tool calls api.github.com:
     Authorization: Bearer PLACEHOLDER_GH_7a9e ──▶ Host == api.github.com? YES!
                                                   Swap -> Bearer ghs_real_token ──▶  api.github.com
                                                   (Logs: "GH token used for /pulls")

  2. Compromised script tries untrusted.example:
     Authorization: Bearer PLACEHOLDER_GH_7a9e ──▶ Host == api.github.com? NO!
                                                   BLOCKED + Security Alert!     ✗    untrusted.example
                                                   (Real token NEVER leaves host)
```

#### Comparing Credential Delivery Architectures

| Pattern | Sandbox Sees Real Secret? | Works with Unmodified CLI Tools (`git`, `npm`, `curl`)? | Complexity | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **Raw Env Vars in Sandbox** | Yes (High risk) | Yes | Very low | Avoid for autonomous agents; acceptable only with throwaway local dev mocks. |
| **Short-Lived Scoped Token in Sandbox** | Yes, but time- & scope-limited | Yes | Low | Good baseline when a proxy isn't feasible (e.g., single-repo 15-min token). |
| **Proxy-Based Credential Injection** | **No** (Placeholder only) | Yes (via proxy + sandbox CA) | Medium | Gold standard for coding sandboxes needing authenticated HTTP/Git/package registries. |
| **Host-Side Brokered Tools (MCP / RPC)** | **No** (Tool runs on host) | N/A (Exposed as structured tool) | Medium | High-privilege APIs (GitHub PR creation, Slack, cloud deploys) where you also want fine-grained argument policies. |

> **Important nuance:** Proxy-based injection protects against **credential exfiltration** (stealing the raw key so an attacker can reuse it elsewhere). It does *not* by itself stop a compromised agent from making a bad API call to an *allowed* host (like deleting a GitHub repo via `api.github.com`). That's why you pair the credential proxy with **least-privilege token scoping** (Section 4.5) and **permission policies** (Chapter 23)!

---

### 4.4 Redaction Pipelines for Tool Outputs, Logs, and LLM Prompts

Even with scrubbed environments and credential proxies, secrets can still surface unexpectedly: a developer accidentally pasted a key into a legacy test fixture, a `.env.example` turned out to contain a real staging token, or an external service echoed a signed URL in an error message.

A **Redaction Pipeline** is your deterministic safety net. It runs synchronously on *every* piece of tool output **before** that output is appended to the LLM message history, written to a disk transcript, or sent to telemetry.

Effective redaction combines **three complementary detection engines**:

#### 1. Exact-Value Dynamic Registry (Zero False Negatives for Known Secrets)
Before the session begins, the host harness already knows the exact values of sensitive host environment variables (e.g., `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GITHUB_TOKEN`) and any secrets loaded into the credential proxy. Register those exact strings—**plus their Base64 and URL-encoded variants**—in an in-memory redactor. Even if a secret has an unusual custom format with no prefix, exact matching catches it 100% of the time.

#### 2. Structured Prefix & Regular Expression (Regex) Rules
Modern cloud providers and API vendors intentionally add recognizable prefixes (and sometimes checksums) to their tokens specifically so scanners like **Gitleaks** and **TruffleHog** can catch them accurately:

| Provider / Secret Type | Recognizable Pattern / Prefix | Notes |
| :--- | :--- | :--- |
| **GitHub Tokens** | `ghp_` (classic PAT), `gho_` (OAuth), `ghs_` (App installation), `github_pat_` (fine-grained) | High precision, near-zero false positives. |
| **AWS Access Key ID** | `AKIA[0-9A-Z]{16}` (long-lived), `ASIA[0-9A-Z]{16}` (STS temporary) | Pair with secret-key context scanning nearby. |
| **LLM Provider Keys** | `sk-ant-...` (Anthropic), `sk-proj-...` / `sk-...` (OpenAI), `AIza...` (Google API) | Critical so a harness never leaks its own API key! |
| **Private Key Blocks** | `-----BEGIN (RSA\|EC\|OPENSSH\|PRIVATE) KEY-----` | Always redact the entire PEM block through `-----END ...-----`. |
| **Database / Basic Auth URLs** | `(postgres\|mysql\|mongodb\|redis)://[^:\s]+:([^@\s]+)@` | Redact only the password group so the host/port stays debuggable. |
| **JSON Web Tokens (JWTs)** | `eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}` | Often carry active bearer sessions in HTTP logs. |

#### 3. Context-Aware Shannon Entropy Scanning
What about a custom internal API token with no standard prefix, like `X-Internal-Auth: 9fK2mP8qR4vW1xZ7bN5cL0jH3tY6uA`?

**Shannon entropy** measures how "random" (unpredictable) a string of characters is, in bits per character:
- Normal English words or identifiers (`calculate_user_invoice`): low entropy (~3.0–3.8 bits/char).
- Randomly generated secrets (Base64/hex tokens): high entropy (~4.5–5.8 bits/char).

**Crucial trick:** Never run raw entropy scanning across all code output blindly—otherwise you will redact every Git commit SHA, UUID, Webpack bundle hash, and `package-lock.json` integrity digest, ruining the agent's ability to debug! Instead, make entropy scanning **context-aware**: trigger it only when a high-entropy token (≥ 20 chars, entropy ≥ 4.5) appears right next to a sensitive assignment or header keyword (`password`, `secret`, `token`, `api_key`, `authorization`, `bearer`, `client_secret`) and does *not* match known non-secret formats (like pure 40-char hex git SHAs or UUIDs).

#### Streaming Chunk-Boundary Protection
When streaming command output in chunks (Chapters 02, 17), a 40-character API key can easily get sliced right down the middle across two consecutive chunks (`"Authorization: Bearer sk-ant-api03-abc"` followed by `"def123456..."`). If you scan each chunk independently, you miss the split secret!

**The fix:** Maintain a small **sliding overlap tail buffer** (e.g., hold back the last 128 bytes of each chunk until the next chunk arrives, scan `tail + new_chunk`, emit the safe prefix, and flush the final tail on EOF).

---

### 4.5 Ephemeral, Least-Privilege, Short-Lived Tokens vs. Static Personal Tokens

Even the best proxy and redactor follow defense in depth: always assume that someday, somewhere, a token *could* be misused or exposed. The single most effective way to limit blast radius is to **stop giving agents static personal credentials**.

| Property | Static Personal Token (e.g., Classic PAT, IAM User Key) | Ephemeral Least-Privilege Token (e.g., GitHub App, OIDC/STS) |
| :--- | :--- | :--- |
| **Lifespan** | Months, years, or "never expires." | **15 minutes to 1 hour** (automatically expires when the task finishes). |
| **Scope of Access** | Usually tied to your entire user identity across dozens of repos or cloud accounts. | Scoped to **one repository**, one branch prefix, or one staging namespace. |
| **Identity in Audit Logs** | Looks identical to you—impossible to tell whether *you* or the *agent* made the API call. | Distinct bot/agent identity (`agent-runner[bot]`), cleanly auditable and revocable. |
| **If Exposed** | Urgent security incident; manual rotation across every developer machine and CI job. | Rapidly expires on its own; minimal blast radius even during its short window. |

#### Practical Short-Lived Patterns for Agent Harnesses
- **GitHub:** Mint a **GitHub App installation token** (`ghs_...`, 1-hour TTL) scoped strictly to `contents: write` and `pull_requests: write` on the single target repository—never `admin` or org-wide access.
- **Cloud Providers (AWS / GCP / Azure):** Exchange an **OpenID Connect (OIDC)** workload identity token for short-lived **AWS STS** (`ASIA...`) or GCP short-lived OAuth tokens scoped to a read-only or sandboxed staging role.
- **MCP Servers:** Use **OAuth 2.0** authorization flows (Chapter 19) with granular read-only scopes (e.g., `issues:read` instead of full workspace write) and short-lived access tokens managed on the host—never hand raw OAuth refresh tokens to the sandbox.
- **Databases:** If an agent needs to inspect schemas or debug queries, point it at a **local seeded container** or a **read-only, PII-anonymized replica** with a temporary session credential—never production read-write credentials.

---

## 5. How Real Harnesses Do It

Leading open-source and production coding agents in 2025–2026 apply these exact patterns:

- **OpenAI Codex CLI (`shell_environment_policy`):** Builds child process environments from scratch using an explicit `config.toml` policy (`inherit = "core"`, `ignore_default_excludes = false` to strip `KEY`/`SECRET`/`TOKEN`, wildcard `filters` like `"AWS_*" = "exclude"`, and `set` for safe static overrides). This guarantees subprocesses inside the OS sandbox never inherit the user's ambient terminal secrets.
- **Gondolin (Earendil / Armin Ronacher):** An open-source lightweight Linux micro-VM agent sandbox with a programmable host-side TypeScript/JavaScript control plane. Instead of passing real API keys into the guest VM, Gondolin injects dummy placeholder strings (`GONDOLIN_SECRET_*`) and intercepts outbound HTTP/TLS traffic on the host, substituting the real credential *only* when the destination matches an explicitly allowed upstream host.
- **GitHub Copilot Coding Agent:** Combines ephemeral cloud sandboxes with short-lived, repository-scoped **GitHub App installation tokens** (`ghs_`, ~1-hour expiry) and an **Agent Firewall** that blocks unapproved outbound hosts—shrinking both the credential's lifetime and its reachable network surface.
- **Enterprise AI Gateways & Stateless Redaction Proxies:** Production enterprise wrappers (such as CLI redaction wrappers and stateless tokenization proxies like OVHcloud's *Pookie* design) dynamically learn local `.env` values at startup, combine them with Gitleaks-style regex rules, and replace secrets with deterministic placeholders in real time across streaming SSE and JSON tool payloads before traffic reaches external LLM providers or audit logs.

---

## 6. Common Pitfalls & Failure Modes

1. **Scrubbing `env` while leaving `.env` readable inside the workspace.**
   *Why it fails:* Your child process has a spotless environment—and then the agent (or a test script) simply runs `cat .env` and prints every database password into stdout.
   *Fix:* Block `.env`, `.env.local`, `.env.production`, `*.pem`, and `*.key` via OS sandbox read-deny rules (Chapter 22) *and* file-tool deny globs, while providing a sanitized `.env.example` or mock values for local tests.

2. **Building a credential proxy without strict host binding.**
   *Why it fails:* If the proxy blindly replaces `PLACEHOLDER_GH` with the real GitHub token on *any* outbound HTTP request regardless of destination hostname, a hijacked script can simply send `Authorization: Bearer PLACEHOLDER_GH` to an attacker-controlled server and have the proxy hand over the real key!
   *Fix:* **Host allowlist binding is non-negotiable.** Every placeholder MUST be bound to exact allowed hostname(s) (never loose substring matches like `*github*`), and the proxy must also block HTTP redirects (`301`/`302`/`307`) that forward `Authorization` headers to a different host.

3. **Forgetting encoded variants of known secrets.**
   *Why it fails:* Exact-string redaction catches `sk-ant-12345`, but misses `c2stYW50LTEyMzQ1` (the Base64 encoding of the exact same secret) or URL-encoded tokens inside query strings.
   *Fix:* When registering known host secrets into your redactor, automatically register their Base64, URL-encoded, and stripped-prefix variants too.

4. **Redacting only for the LLM, while logging raw outputs to disk or telemetry.**
   *Why it fails:* Your LLM API call is clean, yet `~/.agent/transcripts/session.jsonl` and your OpenTelemetry backend quietly store raw credentials in plaintext.
   *Fix:* Make redaction the **very first step** inside your tool runner's output capture pipeline—every downstream consumer (LLM context, UI, disk transcript, telemetry) receives the *already-redacted* stream.

5. **Over-aggressive entropy redaction that destroys debuggability.**
   *Why it fails:* Flagging every high-entropy 32-char string masks Git commit hashes, SHA-256 checksums, Docker image digests, and lockfile hashes—making the agent blind to real build errors.
   *Fix:* Combine entropy checks with nearby keyword context (`token`, `secret`, `password`, `bearer`) and explicitly exempt standard non-secret hashes (UUIDs, 40/64-char hex digests, `sha512-...` SRI hashes).

---

## 7. Build It Yourself: Mini-Lab — Zero-Secret Credential Proxy + Redaction Pipeline

Below is a compact, self-contained Python blueprint demonstrating both halves of credential isolation:
1. **`CredentialProxy`** — mints opaque placeholder tokens bound to exact host allowlists, swaps real credentials *only* on approved outbound hosts, and rejects unapproved destinations.
2. **`SecretRedactor`** — combines exact known-secret matching (including Base64 variants), structured regex patterns, and context-aware Shannon entropy detection before text ever reaches the LLM or logs.

```python
import base64
from dataclasses import dataclass
import math
import re
import secrets
from urllib.parse import quote


# --- Part 1: Host-Side Credential Injection Proxy ---

@dataclass(frozen=True)
class BoundSecret:
    name: str
    real_value: str
    placeholder: str
    allowed_hosts: frozenset[str]


class CredentialProxy:
    """
    Lives strictly on the HOST side (outside the sandbox).
    The sandbox only ever receives `placeholder` strings.
    """

    def __init__(self) -> None:
        self._by_placeholder: dict[str, BoundSecret] = {}

    def register_secret(
        self,
        name: str,
        real_value: str,
        allowed_hosts: set[str],
    ) -> str:
        """Store a real secret on the host and return a safe placeholder for the sandbox."""
        placeholder = f"HARNESS_PH_{name.upper()}_{secrets.token_hex(12)}"
        self._by_placeholder[placeholder] = BoundSecret(
            name=name,
            real_value=real_value,
            placeholder=placeholder,
            allowed_hosts=frozenset(h.lower() for h in allowed_hosts),
        )
        return placeholder

    def known_real_secrets(self) -> dict[str, str]:
        """Expose {name: real_value} strictly to the host-side redactor."""
        return {s.name: s.real_value for s in self._by_placeholder.values()}

    def rewrite_outbound_headers(
        self,
        target_host: str,
        headers: dict[str, str],
    ) -> tuple[bool, dict[str, str], str]:
        """
        Inspect outbound request headers from the sandbox.
        Substitutes placeholders ONLY if target_host is explicitly allowlisted.
        """
        normalized_host = target_host.lower().strip()
        rewritten = dict(headers)

        for header_key, header_val in headers.items():
            for placeholder, secret in self._by_placeholder.items():
                if placeholder in header_val:
                    if normalized_host not in secret.allowed_hosts:
                        # Hard block: never swap a credential for an unapproved host!
                        return (
                            False,
                            {},
                            f"BLOCKED: placeholder '{secret.name}' sent to unapproved host '{normalized_host}'",
                        )
                    rewritten[header_key] = header_val.replace(
                        placeholder, secret.real_value
                    )

        return True, rewritten, f"ALLOWED: forwarded to '{normalized_host}'"


# --- Part 2: Multi-Layer Output & Prompt Redactor ---

STRUCTURED_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("github_token", re.compile(r"\b(?:ghp|gho|ghs|ghu|ghr)_[A-Za-z0-9]{20,}\b")),
    ("github_pat", re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}\b")),
    ("aws_access_key", re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b")),
    ("anthropic_key", re.compile(r"\bsk-ant-[A-Za-z0-9_-]{20,}\b")),
    ("openai_key", re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b")),
    ("pem_private_key", re.compile(
        r"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----"
    )),
    ("db_url_password", re.compile(
        r"((?:postgres|postgresql|mysql|mongodb|redis)://[^:\s/@]+:)([^@\s]+)(@)"
    )),
]

# Context-aware entropy trigger: sensitive keyword followed by a high-randomness value.
CONTEXT_ASSIGNMENT_RE = re.compile(
    r"(?i)(\b(?:api[_-]?key|secret|token|password|passwd|bearer|authorization)\b"
    r"\s*[:=]\s*['\"]?)([A-Za-z0-9+/=_-]{20,})(['\"]?)"
)
PURE_HEX_SHA_RE = re.compile(r"^[0-9a-fA-F]{32,64}$")


def shannon_entropy(text: str) -> float:
    if not text:
        return 0.0
    counts: dict[str, int] = {}
    for ch in text:
        counts[ch] = counts.get(ch, 0) + 1
    length = len(text)
    return -sum((c / length) * math.log2(c / length) for c in counts.values())


class SecretRedactor:
    """Deterministic redaction pipeline run before LLM context, logs, and telemetry."""

    def __init__(self, known_secrets: dict[str, str] | None = None) -> None:
        # Map exact secret strings (plus encoded variants) -> label.
        self._exact_variants: list[tuple[str, str]] = []
        for label, value in (known_secrets or {}).items():
            if len(value) < 8:
                continue
            b64 = base64.b64encode(value.encode()).decode()
            url_enc = quote(value, safe="")
            for variant in {value, b64, url_enc}:
                self._exact_variants.append((variant, label))
        # Longest matches first to prevent partial-replacement artifacts.
        self._exact_variants.sort(key=lambda pair: len(pair[0]), reverse=True)

    def redact(self, text: str) -> str:
        result = text

        # Layer 1: Exact registered host secrets (+ Base64 / URL-encoded variants).
        for variant, label in self._exact_variants:
            if variant in result:
                result = result.replace(variant, f"[REDACTED:{label}]")

        # Layer 2: Known provider prefixes & structured formats.
        for label, pattern in STRUCTURED_PATTERNS:
            if label == "db_url_password":
                result = pattern.sub(r"\1[REDACTED:db_password]\3", result)
            else:
                result = pattern.sub(f"[REDACTED:{label}]", result)

        # Layer 3: Context-aware Shannon entropy check for unknown custom secrets.
        def _mask_high_entropy(match: re.Match[str]) -> str:
            prefix, candidate, suffix = match.group(1), match.group(2), match.group(3)
            # Keep standard placeholders and pure hex git/sha digests debuggable.
            if candidate.startswith("HARNESS_PH_") or PURE_HEX_SHA_RE.match(candidate):
                return match.group(0)
            if shannon_entropy(candidate) >= 4.2:
                return f"{prefix}[REDACTED:high_entropy_secret]{suffix}"
            return match.group(0)

        return CONTEXT_ASSIGNMENT_RE.sub(_mask_high_entropy, result)


# --- End-to-End Defensive Demo ---
if __name__ == "__main__":
    proxy = CredentialProxy()
    # Real token stays ONLY in host memory; sandbox gets a worthless placeholder.
    gh_placeholder = proxy.register_secret(
        name="github_token",
        real_value="ghs_DEMO_REAL_SHORTLIVED_TOKEN_9876543210",
        allowed_hosts={"api.github.com"},
    )
    print("Sandbox env sees:", f"GITHUB_TOKEN={gh_placeholder}")

    # 1. Legitimate request to api.github.com -> proxy swaps header on the wire.
    ok, hdrs, msg = proxy.rewrite_outbound_headers(
        "api.github.com",
        {"Authorization": f"Bearer {gh_placeholder}"},
    )
    print("Approved host ->", ok, msg)

    # 2. Unauthorized host attempt -> proxy hard-blocks and never injects real token.
    ok, hdrs, msg = proxy.rewrite_outbound_headers(
        "untrusted.example",
        {"Authorization": f"Bearer {gh_placeholder}"},
    )
    print("Unapproved host ->", ok, msg)

    # 3. Redactor scrubs real keys, Base64 encodings, DB URLs, and high-entropy values,
    #    while preserving git commit hashes for debugging.
    redactor = SecretRedactor(proxy.known_real_secrets())
    raw_tool_log = (
        "git_sha=4b825dc642cb6eb9a060e54bf8d69288fbee4904\n"
        "DB=postgres://app:SuperS3cretPass@db.internal:5432/prod\n"
        "X-Custom-Token: 9fK2mP8qR4vW1xZ7bN5cL0jH3tY6uA\n"
        f"echo_b64={base64.b64encode(b'ghs_DEMO_REAL_SHORTLIVED_TOKEN_9876543210').decode()}\n"
    )
    print("\nRedacted tool output:\n" + redactor.redact(raw_tool_log))
```

**Try extending this mini-lab:**
1. Add a **streaming chunk redactor** with a 128-byte overlap tail buffer so a secret split across two stdout chunks cannot slip past the regex or exact-match layers.
2. Add **response scrubbing** inside `CredentialProxy` so if an upstream API echoes an `Authorization` header back in a debug error body, the proxy replaces the real value back with the placeholder before returning bytes into the sandbox.

---

## 8. Key Takeaways & Quick Self-Check

- **Map all five leak channels:** Environment variables, workspace/host secret files (`.env`, `~/.ssh`), command output/tracebacks, persistent disk transcripts, and LLM/telemetry payloads.
- **Scrub child environments with an allowlist:** Start from an empty dict and inherit only core system variables (`PATH`, `HOME`, `LANG`, `TMPDIR`), never raw `os.environ`.
- **Use proxy-based credential injection for zero-secret sandboxes:** Give the sandbox an opaque placeholder token; let a host-side proxy swap in the real credential *only* when the destination hostname matches an explicit allowlist.
- **Layer your redaction pipeline upstream of everything:** Combine an exact-value registry (+ Base64/URL-encoded variants), structured provider regexes, and context-aware Shannon entropy scanning—and run it *before* data hits the LLM, transcripts, or telemetry.
- **Replace static personal tokens with ephemeral, least-privilege credentials:** Use short-lived GitHub App installation tokens (`ghs_`), OIDC/STS cloud sessions, and tightly scoped OAuth tokens so any worst-case incident has a minimal blast radius.

### Quick Self-Check

1. **Why is an allowlist-based environment scrubber safer than a denylist that blocks `*_KEY`, `*_SECRET`, and `*_TOKEN`?**
   <details>
   <summary>Show Answer</summary>
   Denylists constantly miss non-obvious variable names that still hold live credentials—such as `DATABASE_URL`, `PGPASSWORD`, `REDIS_URL`, `SENTRY_DSN`, or custom company variables like `BILLING_PASS`. An allowlist starts from an empty environment and passes only known-safe system variables (`PATH`, `HOME`, `LANG`, `TMPDIR`, etc.), failing closed by default.
   </details>

2. **In proxy-based credential injection, why must every placeholder token be strictly bound to an allowlist of destination hostnames?**
   <details>
   <summary>Show Answer</summary>
   Without host binding, a compromised or prompt-injected process inside the sandbox could send its placeholder token to any external domain, and the proxy would obligingly swap in the real secret and deliver it straight to the attacker. Binding each placeholder to exact allowed hosts (e.g., `api.github.com` only) ensures the real credential is never injected on unauthorized outbound traffic.
   </details>

3. **Why should Shannon entropy scanning in a coding agent be context-aware rather than applied blindly to all command output?**
   <details>
   <summary>Show Answer</summary>
   Software repositories and build logs are packed with legitimate high-entropy strings that are *not* secrets—such as Git commit SHAs, UUIDs, Docker image digests, and `package-lock.json` integrity hashes. Blind entropy scanning redacts those hashes and breaks debugging. Pairing entropy thresholds with nearby sensitive keywords (`password`, `token`, `secret`, `bearer`) and exempting standard hash formats keeps false positives low.
   </details>

4. **Why are short-lived GitHub App installation tokens (`ghs_`) or OIDC/STS sessions much safer for autonomous coding agents than a developer's static Personal Access Token (PAT)?**
   <details>
   <summary>Show Answer</summary>
   Static PATs often carry broad permissions across all of a developer's repositories, never expire (or last months), and blur agent actions with human actions in audit logs. Ephemeral tokens expire automatically (typically within 15–60 minutes), are scoped to the minimum permissions on a single repository or staging role, and carry a distinct bot/workload identity for clean auditing and instant revocation.
   </details>

---

[← 24. Prompt Injection Defenses & Trust Boundaries](./24-prompt-injection-defenses-and-trust-boundaries.md) | [Table of Contents](../README.md) | [26. Subagent Spawning & Context Isolation →](../05-multi-agent-and-orchestration/26-subagent-spawning-and-context-isolation.md)
