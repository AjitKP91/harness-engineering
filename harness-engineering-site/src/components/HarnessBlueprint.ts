interface BlueprintStage {
  step: number;
  nodeId: string;
  label: string;
  wireId: string;
  title: string;
  summary: string;
  chapters: { label: string; slug: string }[];
}

const STAGES: BlueprintStage[] = [
  {
    step: 1,
    nodeId: 'bp-ui',
    label: '1. User & Protocol',
    wireId: 'wire-1-2',
    title: 'Layer 1: CLI, TUI, Desktop & ACP Surface',
    summary:
      'You ask: "Fix the failing auth test." Whether typed in a terminal TUI or an IDE over ACP JSON-RPC, the UI ships a clean prompt to the core harness engine.',
    chapters: [
      { label: 'Ch. 34 TUI Rendering', slug: '34-tui-cli-event-rendering' },
      { label: 'Ch. 35 ACP & Daemons', slug: '35-client-server-protocols-json-rpc-acp-daemon-architecture' },
    ],
  },
  {
    step: 2,
    nodeId: 'bp-context',
    label: '2. Context & Cache',
    wireId: 'wire-2-3',
    title: 'Layer 2: System Prompt, Prefix Cache & Budget',
    summary:
      'The harness loads AGENTS.md rules, keeps tool definitions byte-identical for a 90% KV-cache discount, and verifies the conversation stays comfortably below context-rot thresholds.',
    chapters: [
      { label: 'Ch. 07 System Prompt', slug: '07-system-prompt-assembly-and-instruction-hierarchy' },
      { label: 'Ch. 08 Prompt Caching', slug: '08-prompt-caching-and-prefix-stability' },
      { label: 'Ch. 10 Compaction', slug: '10-context-compaction-and-summarization' },
    ],
  },
  {
    step: 3,
    nodeId: 'bp-loop',
    label: '3. Core Loop & LLM',
    wireId: 'wire-3-4',
    title: 'Layer 3: Streaming Loop & State Machine',
    summary:
      'The harness streams tokens from the LLM over SSE, separates thinking from tool calls, guards against doom loops, and tracks an explicit state machine (streaming → executing_tools).',
    chapters: [
      { label: 'Ch. 01 Tool-Use Loop', slug: '01-agent-tool-use-loop' },
      { label: 'Ch. 02 Streaming SSE', slug: '02-streaming-and-event-parsing' },
      { label: 'Ch. 06 State Machines', slug: '06-session-and-turn-state-machines' },
    ],
  },
  {
    step: 4,
    nodeId: 'bp-sandbox',
    label: '4. Policy & Sandbox',
    wireId: 'wire-4-5',
    title: 'Layer 4: Approval Policy, Secrets & OS Kernel Sandbox',
    summary:
      'Before running `pytest`, the harness parses the shell AST, scrubs host API keys, checks trust boundaries against prompt injection, and locks the child process in Seatbelt/Bubblewrap.',
    chapters: [
      { label: 'Ch. 21 OS Sandboxing', slug: '21-os-level-sandboxing-seatbelt-bubblewrap-landlock-containers' },
      { label: 'Ch. 23 Approval Policy', slug: '23-permission-models-and-command-approval-policies' },
      { label: 'Ch. 25 Secret Isolation', slug: '25-secret-and-credential-isolation' },
    ],
  },
  {
    step: 5,
    nodeId: 'bp-tools',
    label: '5. Tools & Workspace',
    wireId: 'wire-5-6',
    title: 'Layer 5: Ripgrep, Patching, PTY & MCP',
    summary:
      'Inside the workspace, parallel read tools locate the bug, surgical search-and-replace patches update code atomically, LSP reports zero type errors, and huge test logs offload cleanly.',
    chapters: [
      { label: 'Ch. 14 File Patching', slug: '14-file-reading-patching-and-diff-application' },
      { label: 'Ch. 15 Code Search', slug: '15-codebase-search-ripgrep-glob-semantic-indexing' },
      { label: 'Ch. 19 MCP Client', slug: '19-model-context-protocol-mcp-client-architecture' },
    ],
  },
  {
    step: 6,
    nodeId: 'bp-orch',
    label: '6. Multi-Agent',
    wireId: 'wire-6-7',
    title: 'Layer 6: Subagents, Worktrees & Workflows',
    summary:
      'For larger refactors, the coordinator isolates noisy research into subagents, gives parallel writers separate git worktrees, and wakes up reactively when background tasks finish.',
    chapters: [
      { label: 'Ch. 26 Subagents', slug: '26-subagent-spawning-and-context-isolation' },
      { label: 'Ch. 27 Git Worktrees', slug: '27-workspace-isolation-git-worktrees-ephemeral-clones' },
      { label: 'Ch. 30 Planning Mode', slug: '30-planning-mode-and-task-tracking' },
    ],
  },
  {
    step: 7,
    nodeId: 'bp-rel',
    label: '7. Reliability & Evals',
    wireId: 'wire-7-1',
    title: 'Layer 7: Checkpoints, Replay, Cost & Eval Harness',
    summary:
      'Every turn snapshots workspace state for instant rewind, writes append-only JSONL transcripts, records OpenTelemetry token costs, and proves changes against SWE-bench / CI benchmarks.',
    chapters: [
      { label: 'Ch. 36 Checkpoints', slug: '36-checkpointing-snapshots-and-rollback' },
      { label: 'Ch. 38 Telemetry & Cost', slug: '38-telemetry-tracing-and-token-cost-accounting' },
      { label: 'Ch. 40 Eval Harnesses', slug: '40-agent-evaluation-harnesses-and-benchmarks' },
    ],
  },
];

export function mountHarnessBlueprint(container: HTMLElement): () => void {
  let activeIndex = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let playing = !reducedMotion;
  let timer: number | undefined;

  container.innerHTML = `
    <div class="blueprint-card">
      <div class="blueprint-top">
        <div class="blueprint-title">
          <span class="badge badge-teal">Interactive Architecture</span>
          <span>How One Task Flows Through All 7 Harness Layers</span>
        </div>
        <div class="blueprint-controls">
          <button type="button" class="btn-ghost btn-sm" id="bp-prev">← Prev</button>
          <button type="button" class="btn-ghost btn-sm" id="bp-toggle">${playing ? 'Pause' : 'Play'}</button>
          <button type="button" class="btn-ghost btn-sm" id="bp-next">Next →</button>
        </div>
      </div>

      <div class="blueprint-svg-wrap">
        <svg class="blueprint-svg" viewBox="0 0 680 340" role="img" aria-label="Interactive 7-layer AI agent harness diagram">
          <!-- Signal Wires -->
          <path id="wire-1-2" class="bp-wire" d="M 185 52 L 245 52" />
          <path id="wire-1-2-flow" class="bp-wire-flow" d="M 185 52 L 245 52" />

          <path id="wire-2-3" class="bp-wire" d="M 425 52 L 485 52" />
          <path id="wire-2-3-flow" class="bp-wire-flow" d="M 425 52 L 485 52" />

          <path id="wire-3-4" class="bp-wire" d="M 575 88 L 575 138" />
          <path id="wire-3-4-flow" class="bp-wire-flow" d="M 575 88 L 575 138" />

          <path id="wire-4-5" class="bp-wire" d="M 485 174 L 425 174" />
          <path id="wire-4-5-flow" class="bp-wire-flow" d="M 485 174 L 425 174" />

          <path id="wire-5-6" class="bp-wire" d="M 245 174 L 185 174" />
          <path id="wire-5-6-flow" class="bp-wire-flow" d="M 245 174 L 185 174" />

          <path id="wire-6-7" class="bp-wire" d="M 100 210 L 100 258 L 245 282" />
          <path id="wire-6-7-flow" class="bp-wire-flow" d="M 100 210 L 100 258 L 245 282" />

          <path id="wire-7-1" class="bp-wire" d="M 245 282 L 40 282 L 40 52 L 18 52" />
          <path id="wire-7-1-flow" class="bp-wire-flow" d="M 245 282 L 40 282 L 40 52 L 18 52" />

          <!-- Nodes -->
          <g class="bp-node" id="bp-ui" data-step="0" tabindex="0" role="button" aria-label="Layer 1: User and Protocol Surface">
            <rect class="bp-box" x="18" y="18" width="167" height="68" rx="11" />
            <text x="32" y="42" fill="currentColor" font-size="12" font-weight="700">1. User &amp; Interface</text>
            <text x="32" y="61" fill="var(--ink-muted)" font-size="10.5">TUI · CLI · IDE (ACP)</text>
          </g>

          <g class="bp-node" id="bp-context" data-step="1" tabindex="0" role="button" aria-label="Layer 2: Context and Cache">
            <rect class="bp-box" x="242" y="18" width="186" height="68" rx="11" />
            <text x="255" y="42" fill="currentColor" font-size="12" font-weight="700">2. Context &amp; Cache</text>
            <text x="255" y="61" fill="var(--ink-muted)" font-size="10">AGENTS.md · KV Cache · Compact</text>
          </g>

          <g class="bp-node" id="bp-loop" data-step="2" tabindex="0" role="button" aria-label="Layer 3: Core Loop and LLM">
            <rect class="bp-box" x="485" y="18" width="177" height="68" rx="11" />
            <text x="499" y="42" fill="currentColor" font-size="12" font-weight="700">3. Core Loop &amp; LLM</text>
            <text x="499" y="61" fill="var(--ink-muted)" font-size="10.5">SSE Stream · FSM · Retries</text>
          </g>

          <g class="bp-node" id="bp-sandbox" data-step="3" tabindex="0" role="button" aria-label="Layer 4: Policy and Sandbox">
            <rect class="bp-box" x="485" y="138" width="177" height="72" rx="11" />
            <text x="499" y="164" fill="currentColor" font-size="12" font-weight="700">4. Policy &amp; Sandbox</text>
            <text x="499" y="183" fill="var(--ink-muted)" font-size="10.5">Seatbelt · bwrap · Secrets</text>
          </g>

          <g class="bp-node" id="bp-tools" data-step="4" tabindex="0" role="button" aria-label="Layer 5: Tools and Workspace">
            <rect class="bp-box" x="245" y="138" width="180" height="72" rx="11" />
            <text x="259" y="164" fill="currentColor" font-size="12" font-weight="700">5. Tools &amp; Workspace</text>
            <text x="259" y="183" fill="var(--ink-muted)" font-size="10.5">Patch · Ripgrep · LSP · MCP</text>
          </g>

          <g class="bp-node" id="bp-orch" data-step="5" tabindex="0" role="button" aria-label="Layer 6: Multi-Agent Orchestration">
            <rect class="bp-box" x="18" y="138" width="167" height="72" rx="11" />
            <text x="32" y="164" fill="currentColor" font-size="12" font-weight="700">6. Orchestration</text>
            <text x="32" y="183" fill="var(--ink-muted)" font-size="10.5">Subagents · Worktrees · Plan</text>
          </g>

          <g class="bp-node" id="bp-rel" data-step="6" tabindex="0" role="button" aria-label="Layer 7: Reliability and Evaluation">
            <rect class="bp-box" x="245" y="248" width="320" height="68" rx="11" />
            <text x="262" y="274" fill="currentColor" font-size="12" font-weight="700">7. Reliability, Telemetry &amp; Evals</text>
            <text x="262" y="294" fill="var(--ink-muted)" font-size="10.5">Git Checkpoints · JSONL Replay · OTel Cost · Benchmarks</text>
          </g>
        </svg>
      </div>

      <div class="bp-steps-bar" id="bp-steps-bar">
        ${STAGES.map(
          (s, idx) => `<button type="button" class="bp-step-pill" data-step="${idx}">${s.label}</button>`
        ).join('')}
      </div>

      <div class="bp-inspector" id="bp-inspector"></div>
    </div>
  `;

  const inspector = container.querySelector<HTMLElement>('#bp-inspector')!;
  const toggleBtn = container.querySelector<HTMLButtonElement>('#bp-toggle')!;
  const prevBtn = container.querySelector<HTMLButtonElement>('#bp-prev')!;
  const nextBtn = container.querySelector<HTMLButtonElement>('#bp-next')!;

  const renderStage = () => {
    const stage = STAGES[activeIndex];
    container.querySelectorAll('.bp-node').forEach((node) => {
      node.classList.toggle('is-active', Number((node as HTMLElement).dataset.step) === activeIndex);
    });
    container.querySelectorAll('.bp-step-pill').forEach((pill) => {
      pill.classList.toggle('is-active', Number((pill as HTMLElement).dataset.step) === activeIndex);
    });
    container.querySelectorAll('.bp-wire-flow').forEach((wire) => {
      wire.classList.toggle('is-live', wire.id === `${stage.wireId}-flow`);
    });

    inspector.innerHTML = `
      <div class="bp-inspector-head">
        <span class="bp-inspector-title">${stage.title}</span>
        <span class="badge badge-accent">Step ${stage.step} of ${STAGES.length}</span>
      </div>
      <p class="bp-inspector-desc">${stage.summary}</p>
      <div class="bp-inspector-links">
        ${stage.chapters
          .map((c) => `<a class="bp-chip-link" href="#/chapter/${c.slug}">${c.label} →</a>`)
          .join('')}
      </div>
    `;
  };

  const stopAuto = () => {
    playing = false;
    if (timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
    toggleBtn.textContent = 'Play';
  };

  const startAuto = () => {
    if (timer !== undefined) window.clearInterval(timer);
    playing = true;
    toggleBtn.textContent = 'Pause';
    timer = window.setInterval(() => {
      activeIndex = (activeIndex + 1) % STAGES.length;
      renderStage();
    }, 3400);
  };

  toggleBtn.addEventListener('click', () => {
    if (playing) stopAuto();
    else startAuto();
  });

  prevBtn.addEventListener('click', () => {
    stopAuto();
    activeIndex = (activeIndex - 1 + STAGES.length) % STAGES.length;
    renderStage();
  });

  nextBtn.addEventListener('click', () => {
    stopAuto();
    activeIndex = (activeIndex + 1) % STAGES.length;
    renderStage();
  });

  container.querySelectorAll<HTMLElement>('[data-step]').forEach((el) => {
    el.addEventListener('click', () => {
      stopAuto();
      activeIndex = Number(el.dataset.step);
      renderStage();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        stopAuto();
        activeIndex = Number(el.dataset.step);
        renderStage();
      }
    });
  });

  renderStage();
  if (playing) startAuto();

  return () => {
    if (timer !== undefined) window.clearInterval(timer);
  };
}
