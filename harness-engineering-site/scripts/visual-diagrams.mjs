/**
 * Bespoke editorial HTML & SVG diagrams rendered at build time for key chapters.
 * Markdown files keep a matching `<!-- visual:<id> -->` + ```mermaid fallback
 * so GitHub/CLI readers see Mermaid while the web reader renders these crisp,
 * theme-aware (`light-dark()`) architectural figures.
 */

function wrapFigure(id, badge, title, bodyHtml) {
  return `<figure class="visual-diagram-figure" data-visual-id="${id}" aria-label="${title}">
  <div class="visual-diagram-toolbar">
    <span class="visual-diagram-badge">${badge}</span>
    <span class="visual-diagram-title">${title}</span>
  </div>
  <div class="visual-diagram-stage">
    ${bodyHtml}
  </div>
</figure>\n`;
}

function downArrow(labelHtml = '') {
  return `<div class="vd-v-connector" aria-hidden="true">
    <span class="vd-v-line"></span>
    ${labelHtml ? `<span class="vd-connector-label">${labelHtml}</span>` : ''}
    <svg class="vd-arrow-svg" width="14" height="9" viewBox="0 0 14 9"><path d="M1 1.5 7 7.5 13 1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </div>`;
}

const VISUAL_BUILDERS = {
  'harness-anatomy': () => {
    const body = `
      <div class="vd-anatomy">
        <div class="vd-layer-card vd-layer-user">
          <div class="vd-layer-head">
            <span class="vd-layer-name">User Interface Surface</span>
            <span class="vd-chip-row">
              <span class="vd-mini-chip">CLI / TUI</span>
              <span class="vd-mini-chip">Desktop App</span>
              <span class="vd-mini-chip">IDE via ACP</span>
              <span class="vd-mini-chip">CI Pipeline</span>
            </span>
          </div>
        </div>

        ${downArrow('<a class="vd-mod-link" style="--chip-accent:var(--mod-6)" href="#/chapter/32-lifecycle-hooks-and-interceptors">Module 6: Extensibility &amp; Interfaces →</a>')}

        <div class="vd-layer-card" style="--card-accent:var(--mod-1)">
          <div class="vd-layer-head">
            <span class="vd-layer-name">Orchestration &amp; Core Loop</span>
            <span class="vd-mod-links">
              <a class="vd-mod-pill" style="--chip-accent:var(--mod-1)" href="#/chapter/01-agent-tool-use-loop">Module 1: Core Loop</a>
              <a class="vd-mod-pill" style="--chip-accent:var(--mod-5)" href="#/chapter/26-subagent-spawning-and-context-isolation">Module 5: Multi-Agent</a>
            </span>
          </div>
          <ul class="vd-bullet-row">
            <li>Turn State Machine &amp; Streaming Parser</li>
            <li>Planning Mode, Task Checklists, Subagents, Swarms &amp; Workflows</li>
          </ul>
        </div>

        <div class="vd-split-connector" aria-hidden="true">
          <svg viewBox="0 0 400 28" preserveAspectRatio="none" class="vd-split-svg">
            <path d="M 200 0 L 200 11 M 100 11 L 300 11 M 100 11 L 100 24 M 300 11 L 300 24" fill="none" stroke="currentColor" stroke-width="1.6"/>
            <path d="M 95 20 L 100 26 L 105 20 M 295 20 L 300 26 L 305 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <div class="vd-anatomy-cols">
          <div class="vd-anatomy-col">
            <div class="vd-layer-card" style="--card-accent:var(--mod-2)">
              <div class="vd-layer-head">
                <span class="vd-layer-name">Context &amp; Memory Engine</span>
                <a class="vd-mod-pill" style="--chip-accent:var(--mod-2)" href="#/chapter/07-system-prompt-assembly-and-instruction-hierarchy">Module 2</a>
              </div>
              <ul class="vd-bullet-list">
                <li>System Prompt &amp; Rules</li>
                <li>Prompt Cache Prefix Control</li>
                <li>Token Budgets &amp; Compaction</li>
                <li>Output Truncation &amp; Skills</li>
              </ul>
            </div>

            ${downArrow()}

            <div class="vd-layer-card" style="--card-accent:var(--accent)">
              <div class="vd-layer-head">
                <span class="vd-layer-name">LLM Provider Layer</span>
                <a class="vd-mod-pill" style="--chip-accent:var(--accent)" href="#/chapter/39-model-routing-and-rate-limit-fallbacks">Ch. 39</a>
              </div>
              <ul class="vd-bullet-list">
                <li>Model Routing &amp; Retries</li>
                <li>Rate-Limit Fallbacks</li>
              </ul>
            </div>
          </div>

          <div class="vd-anatomy-col">
            <div class="vd-layer-card" style="--card-accent:var(--mod-3)">
              <div class="vd-layer-head">
                <span class="vd-layer-name">Tools &amp; Workspace Layer</span>
                <a class="vd-mod-pill" style="--chip-accent:var(--mod-3)" href="#/chapter/14-file-reading-patching-and-diff-application">Module 3</a>
              </div>
              <ul class="vd-bullet-list">
                <li>File Read / Patch / Diff</li>
                <li>Ripgrep, Glob, AST / LSP</li>
                <li>Shell / PTY &amp; Background</li>
                <li>MCP Servers &amp; Browser</li>
              </ul>
            </div>

            ${downArrow()}

            <div class="vd-layer-card" style="--card-accent:var(--mod-4)">
              <div class="vd-layer-head">
                <span class="vd-layer-name">Sandbox &amp; Security Layer</span>
                <a class="vd-mod-pill" style="--chip-accent:var(--mod-4)" href="#/chapter/21-os-level-sandboxing-seatbelt-bubblewrap-landlock-containers">Module 4</a>
              </div>
              <ul class="vd-bullet-list">
                <li>Seatbelt / Bubblewrap / VM</li>
                <li>FS / Net Isolation &amp; Secrets</li>
                <li>Approval Policies &amp; Guards</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="vd-split-connector" aria-hidden="true">
          <svg viewBox="0 0 400 28" preserveAspectRatio="none" class="vd-split-svg">
            <path d="M 100 0 L 100 13 M 300 0 L 300 13 M 100 13 L 300 13 M 200 13 L 200 24" fill="none" stroke="currentColor" stroke-width="1.6"/>
            <path d="M 195 20 L 200 26 L 205 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <div class="vd-layer-card" style="--card-accent:var(--mod-7)">
          <div class="vd-layer-head">
            <span class="vd-layer-name">Reliability &amp; Observability</span>
            <a class="vd-mod-pill" style="--chip-accent:var(--mod-7)" href="#/chapter/36-checkpointing-snapshots-and-rollback">Module 7</a>
          </div>
          <ul class="vd-bullet-grid">
            <li>Git Checkpoints &amp; Rollback</li>
            <li>JSONL Transcripts &amp; Replay</li>
            <li>OpenTelemetry &amp; Cost Logs</li>
            <li>Evaluation &amp; Benchmark Harnesses</li>
          </ul>
        </div>
      </div>`;
    return wrapFigure('harness-anatomy', 'System Architecture', '7-Layer Anatomy of a Modern Coding-Agent Harness', body);
  },

  'instruction-hierarchy': () => {
    const layers = [
      {
        num: '01',
        name: 'Enterprise / Managed Policy',
        path: '/etc/my-agent/AGENTS.md',
        desc: 'Hard org-wide compliance rules. Highest priority; cannot be disabled.',
        accent: 'var(--mod-4)',
      },
      {
        num: '02',
        name: 'Global User Config',
        path: '~/.my-agent/AGENTS.md · ~/.claude/CLAUDE.md',
        desc: 'Your personal preferences across every project on your machine.',
        accent: 'var(--mod-5)',
      },
      {
        num: '03',
        name: 'Repository Root',
        path: '<git-root>/AGENTS.md · CLAUDE.md',
        desc: 'Shared team conventions checked into version control.',
        accent: 'var(--mod-2)',
      },
      {
        num: '04',
        name: 'Ancestor Directories',
        path: '<git-root>/services/payments/AGENTS.md',
        desc: 'Walked from repo root down to CWD; closer directories refine broader parent rules.',
        accent: 'var(--mod-3)',
      },
      {
        num: '05',
        name: 'Local Uncommitted Overrides',
        path: 'CLAUDE.local.md · AGENTS.override.md',
        desc: 'Gitignored personal overrides for just this repo (e.g., local DB port).',
        accent: 'var(--mod-1)',
      },
    ];
    const body = `
      <div class="vd-stack">
        <div class="vd-priority-banner is-high">Highest Precedence · Non-Overridable Safety Floor</div>
        ${layers
          .map(
            (l, i) => `
          <div class="vd-stack-item" style="--tier-accent:${l.accent}">
            <div class="vd-stack-num">${l.num}</div>
            <div class="vd-stack-content">
              <div class="vd-stack-top">
                <strong>${l.name}</strong>
                <code class="vd-path-chip">${l.path}</code>
              </div>
              <p>${l.desc}</p>
            </div>
          </div>
          ${i < layers.length - 1 ? '<div class="vd-stack-step" aria-hidden="true">↓ refined by narrower scope ↓</div>' : ''}`
          )
          .join('')}
        <div class="vd-priority-banner is-low">Most Specific Scope · Closest Directory Wins</div>
      </div>`;
    return wrapFigure('instruction-hierarchy', 'Precedence Cascade', '5-Layer Instruction Assembly Hierarchy', body);
  },

  'prompt-cache-prefix': () => {
    const body = `
      <div class="vd-cache">
        <div class="vd-cache-turn">
          <div class="vd-cache-head">
            <strong>Turn 1 — Cold Start</strong>
            <span class="vd-cache-tag is-write">Cache Write (1.25× write / 1.0× base)</span>
          </div>
          <div class="vd-cache-blocks">
            <span class="vd-blk is-compute">Tools</span>
            <span class="vd-blk is-compute">System Prompt</span>
            <span class="vd-blk is-compute">AGENTS.md</span>
            <span class="vd-blk is-compute">User Msg 1</span>
          </div>
          <div class="vd-cache-bar is-compute">COMPUTE &amp; CACHE FULL PREFIX</div>
        </div>

        <div class="vd-cache-turn">
          <div class="vd-cache-head">
            <strong>Turn 2 — Cache-Stable Append</strong>
            <span class="vd-cache-tag is-hit">90%+ Cache Hit! (0.1× read cost)</span>
          </div>
          <div class="vd-cache-blocks">
            <span class="vd-blk is-hit">Tools</span>
            <span class="vd-blk is-hit">System Prompt</span>
            <span class="vd-blk is-hit">AGENTS.md</span>
            <span class="vd-blk is-hit">User Msg 1</span>
            <span class="vd-blk is-compute">Asst 1</span>
            <span class="vd-blk is-compute">Tool Res 1</span>
          </div>
          <div class="vd-cache-bar-split">
            <span class="vd-cache-bar is-hit" style="flex:4">INSTANT CACHE READ (0.1×)</span>
            <span class="vd-cache-bar is-compute" style="flex:2">COMPUTE NEW</span>
          </div>
        </div>

        <div class="vd-cache-turn">
          <div class="vd-cache-head">
            <strong>Turn 3 — Cache Bust! (Live timestamp injected into System Prompt)</strong>
            <span class="vd-cache-tag is-miss">Full Prefix Invalidation</span>
          </div>
          <div class="vd-cache-blocks">
            <span class="vd-blk is-hit">Tools</span>
            <span class="vd-blk is-changed" title="Single changed token">System Prompt*</span>
            <span class="vd-blk is-miss">AGENTS.md</span>
            <span class="vd-blk is-miss">User Msg 1</span>
            <span class="vd-blk is-miss">Asst 1</span>
            <span class="vd-blk is-miss">Tool Res 1</span>
            <span class="vd-blk is-miss">Asst 2</span>
          </div>
          <div class="vd-cache-bar-split">
            <span class="vd-cache-bar is-hit" style="flex:1">HIT</span>
            <span class="vd-cache-bar is-miss" style="flex:6">1 CHANGED TOKEN INVALIDATES EVERYTHING TO ITS RIGHT: RECOMPUTE ALL</span>
          </div>
        </div>
      </div>`;
    return wrapFigure('prompt-cache-prefix', 'KV-Cache Mechanics', 'Prefix Stability vs. Single-Token Cache Bust', body);
  },

  'context-budget-bar': () => {
    const body = `
      <div class="vd-budget">
        <div class="vd-budget-cap">200,000-Token Context Window (Hard Model Ceiling)</div>
        <div class="vd-budget-bar-wrap">
          <div class="vd-budget-bar" role="img" aria-label="200k token budget: 4k system, 12k tools, 10k pinned, up to 134k conversation history with compaction trigger at 128k, and 40k output headroom">
            <div class="vd-seg is-sys" style="flex:4 0 58px" title="System ~4k tokens (2%)">
              <span class="vd-seg-name">System</span>
              <span class="vd-seg-val">~4k</span>
            </div>
            <div class="vd-seg is-tools" style="flex:12 0 68px" title="Tools ~12k tokens (6%)">
              <span class="vd-seg-name">Tools</span>
              <span class="vd-seg-val">~12k</span>
            </div>
            <div class="vd-seg is-pin" style="flex:10 0 64px" title="Pinned Rules ~10k tokens (5%)">
              <span class="vd-seg-name">Pinned</span>
              <span class="vd-seg-val">~10k</span>
            </div>
            <div class="vd-seg is-hist" style="flex:134 1 200px" title="Conversation History: grows 0..134k">
              <span class="vd-seg-name">Conversation History</span>
              <span class="vd-seg-val">Grows across turns (0..134k)</span>
              <div class="vd-compact-marker" style="left:76.1%;" title="128k Hard Compaction Trigger (80% of 160k usable input)">
                <span class="vd-compact-pin">128k</span>
              </div>
            </div>
            <div class="vd-seg is-headroom" style="flex:40 0 92px" title="Output Headroom ~40k reserved for Thinking + Output (20%)">
              <span class="vd-seg-name">Headroom</span>
              <span class="vd-seg-val">~40k</span>
            </div>
          </div>
        </div>
        <div class="vd-budget-ticks">
          <span>0</span>
          <span>4k</span>
          <span>16k</span>
          <span>26k</span>
          <span class="vd-tick-warn">128k (80% usable)</span>
          <span class="vd-tick-cap">160k Usable Cap</span>
          <span>200k</span>
        </div>
        <div class="vd-budget-notes">
          <div class="vd-note-pill is-warn">
            <strong>128k Trigger:</strong> Hard compaction fires (~80% of 160k usable input budget)
          </div>
          <div class="vd-note-pill is-info">
            <strong>160k Cap:</strong> Usable input ceiling: <strong>40k headroom</strong> stays reserved for Thinking + Output
          </div>
        </div>
      </div>`;
    return wrapFigure('context-budget-bar', 'Token Budget', '200,000-Token Context Window Partitioning', body);
  },

  'policy-precedence': () => {
    const tiers = [
      {
        num: 'Tier 1',
        name: 'Organization / Managed Policy',
        path: 'MDM · /etc/agent/policy',
        accent: 'var(--mod-4)',
        bullets: [
          'Hard-denies production deploys, raw <code>curl | sh</code>, and <code>~/.ssh</code> reads',
          'Can lock down and disable <code>--yolo</code> / <code>--dangerously-skip-permissions</code>',
        ],
      },
      {
        num: 'Tier 2',
        name: 'User Global Policy',
        path: '~/.agent/settings.json',
        accent: 'var(--mod-5)',
        bullets: ['Personal safe read-only allowlists (<code>git status</code>, <code>rg</code>, <code>ls</code>)'],
      },
      {
        num: 'Tier 3',
        name: 'Repository Shared Policy',
        path: '.agent/settings.json',
        accent: 'var(--mod-2)',
        bullets: [
          'Team-approved test/build scripts (<code>npm run test:unit</code>)',
          '<strong>Security Rule:</strong> Untrusted repos can never widen or override higher denies',
        ],
      },
      {
        num: 'Tier 4',
        name: 'Session / Ephemeral Approvals',
        path: 'In-memory for current run',
        accent: 'var(--mod-6)',
        bullets: ['Temporary “Allow for this session” grants cleared as soon as the session ends'],
      },
    ];
    const body = `
      <div class="vd-stack">
        <div class="vd-priority-banner is-high">Highest Priority (Cannot Be Overridden by Lower Layers)</div>
        ${tiers
          .map(
            (t) => `
          <div class="vd-policy-card" style="--tier-accent:${t.accent}">
            <div class="vd-policy-top">
              <div class="vd-policy-title">
                <span class="vd-policy-badge">${t.num}</span>
                <strong>${t.name}</strong>
              </div>
              <code class="vd-path-chip">${t.path}</code>
            </div>
            <ul class="vd-bullet-list">${t.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>
          </div>`
          )
          .join('')}
        <div class="vd-priority-banner is-low">Lowest Priority · Evaluated Only When Higher Layers Have No Match</div>
      </div>`;
    return wrapFigure('policy-precedence', 'Security Hierarchy', '4-Tier Command Approval Policy Precedence', body);
  },

  'lethal-trifecta': () => {
    const body = `
      <div class="vd-trifecta">
        <svg class="vd-trifecta-svg" viewBox="0 0 680 360" role="img" aria-label="The Lethal Trifecta: Access to Private Data, Exposure to Untrusted Content, and Ability to Communicate Externally converging on a High Risk Zone">
          <!-- Outer triangle connecting the 3 pillars -->
          <polygon points="340,122 178,256 502,256" class="vd-tri-fill" />
          <polygon points="340,122 178,256 502,256" class="vd-tri-stroke" />

          <!-- Center danger badge -->
          <text x="340" y="198" text-anchor="middle" class="vd-tri-danger-title">HIGH RISK</text>
          <text x="340" y="218" text-anchor="middle" class="vd-tri-danger-title">EXFILTRATION ZONE</text>
          <text x="340" y="238" text-anchor="middle" class="vd-tri-danger-sub">Break any 1 leg to neutralize</text>

          <!-- Pillar 1: Top -->
          <g transform="translate(190,14)">
            <rect width="300" height="86" rx="12" class="vd-tri-card" />
            <rect width="300" height="5" rx="3" class="vd-tri-accent-1" />
            <text x="150" y="30" text-anchor="middle" class="vd-tri-card-title">(1) Access to Private Data</text>
            <text x="150" y="51" text-anchor="middle" class="vd-tri-card-body">Local files, proprietary code, DBs,</text>
            <text x="150" y="69" text-anchor="middle" class="vd-tri-card-body">emails, secrets, environment vars</text>
          </g>

          <!-- Pillar 2: Bottom Left -->
          <g transform="translate(22,254)">
            <rect width="268" height="94" rx="12" class="vd-tri-card" />
            <rect width="268" height="5" rx="3" class="vd-tri-accent-2" />
            <text x="134" y="30" text-anchor="middle" class="vd-tri-card-title">(2) Untrusted Content</text>
            <text x="134" y="51" text-anchor="middle" class="vd-tri-card-body">Issues, PRs, web pages,</text>
            <text x="134" y="69" text-anchor="middle" class="vd-tri-card-body">3rd-party repos &amp; MCP outputs</text>
          </g>

          <!-- Pillar 3: Bottom Right -->
          <g transform="translate(390,254)">
            <rect width="268" height="94" rx="12" class="vd-tri-card" />
            <rect width="268" height="5" rx="3" class="vd-tri-accent-3" />
            <text x="134" y="30" text-anchor="middle" class="vd-tri-card-title">(3) External Action / Egress</text>
            <text x="134" y="51" text-anchor="middle" class="vd-tri-card-body">HTTP requests, curl, git push,</text>
            <text x="134" y="69" text-anchor="middle" class="vd-tri-card-body">PR comments, email, image URLs</text>
          </g>
        </svg>
      </div>`;
    return wrapFigure('lethal-trifecta', 'Threat Model', 'The Lethal Trifecta of Prompt Injection', body);
  },

  'reversible-boundary': () => {
    const body = `
      <div class="vd-compare">
        <div class="vd-compare-col is-safe">
          <div class="vd-compare-head">
            <span class="vd-status-dot is-safe">✓</span>
            <div>
              <strong>Reversible (Local State)</strong>
              <span>Safely rolled back via Git checkpoints</span>
            </div>
          </div>
          <ul class="vd-compare-list">
            <li><span class="vd-mark is-safe">✓</span> Edited source files</li>
            <li><span class="vd-mark is-safe">✓</span> Created / deleted local files</li>
            <li><span class="vd-mark is-safe">✓</span> Local build artifacts</li>
            <li><span class="vd-mark is-safe">✓</span> Conversation history in RAM</li>
          </ul>
        </div>
        <div class="vd-compare-col is-danger">
          <div class="vd-compare-head">
            <span class="vd-status-dot is-danger">✗</span>
            <div>
              <strong>Irreversible (External World)</strong>
              <span>Checkpoints CANNOT undo; gate with approvals</span>
            </div>
          </div>
          <ul class="vd-compare-list">
            <li><span class="vd-mark is-danger">✗</span> Sent emails / Slack messages</li>
            <li><span class="vd-mark is-danger">✗</span> <code>POST</code> / <code>DELETE</code> to production APIs</li>
            <li><span class="vd-mark is-danger">✗</span> <code>git push --force</code> to remote</li>
            <li><span class="vd-mark is-danger">✗</span> <code>DROP TABLE</code> / production migrations</li>
            <li><span class="vd-mark is-danger">✗</span> <code>terraform apply</code> / cloud deploys</li>
            <li><span class="vd-mark is-danger">✗</span> Published npm / PyPI packages</li>
          </ul>
        </div>
      </div>`;
    return wrapFigure('reversible-boundary', 'Safety Boundary', 'Reversible Local State vs. Irreversible External Side Effects', body);
  },

  'otel-trace-waterfall': () => {
    // 14.8s total timeline
    const spans = [
      { depth: 0, name: 'invoke_agent: "coding-harness"', start: 0, dur: 14.8, color: 'var(--mod-0)', note: '14.8s · root' },
      { depth: 1, name: 'turn: 1', start: 0, dur: 5.1, color: 'var(--mod-1)', note: '5.1s' },
      { depth: 2, name: 'chat claude-sonnet-4-6', start: 0, dur: 2.4, color: 'var(--mod-2)', note: '2.4s · TTFT 0.45s · 8.2k in / 7.1k cached / 120 out' },
      { depth: 2, name: 'execute_tool: ripgrep', start: 2.4, dur: 0.3, color: 'var(--mod-3)', note: '0.3s (ok)' },
      { depth: 2, name: 'execute_tool: read_file', start: 2.7, dur: 0.1, color: 'var(--mod-3)', note: '0.1s (ok)' },
      { depth: 1, name: 'turn: 2', start: 5.1, dur: 6.8, color: 'var(--mod-1)', note: '6.8s' },
      { depth: 2, name: 'chat claude-sonnet-4-6', start: 5.1, dur: 2.9, color: 'var(--mod-2)', note: '2.9s · TTFT 0.50s' },
      { depth: 2, name: 'invoke_agent: "test-runner" (subagent)', start: 8.0, dur: 3.8, color: 'var(--mod-5)', note: '3.8s' },
      { depth: 3, name: 'chat claude-haiku-4-5', start: 8.0, dur: 0.9, color: 'var(--mod-2)', note: '0.9s' },
      { depth: 3, name: 'execute_tool: bash', start: 8.9, dur: 2.7, color: 'var(--mod-3)', note: '2.7s (pytest: 12 passed)' },
      { depth: 1, name: 'turn: 3', start: 11.9, dur: 2.9, color: 'var(--mod-1)', note: '2.9s' },
      { depth: 2, name: 'chat claude-sonnet-4-6', start: 11.9, dur: 2.7, color: 'var(--mod-2)', note: '2.7s · stop_reason: end_turn' },
      { depth: 2, name: 'budget_check', start: 14.6, dur: 0.2, color: 'var(--mod-7)', note: '<1ms · $0.042 / $2.00 cap' },
    ];
    const total = 14.8;
    const rowsHtml = spans
      .map((s) => {
        const leftPct = ((s.start / total) * 100).toFixed(2);
        const widthPct = Math.max(1.2, (s.dur / total) * 100).toFixed(2);
        return `<div class="vd-trace-row">
          <div class="vd-trace-label" style="padding-left:${s.depth * 14}px">
            ${s.depth > 0 ? '<span class="vd-trace-branch" aria-hidden="true">└</span>' : ''}
            <code>${s.name}</code>
          </div>
          <div class="vd-trace-track">
            <span class="vd-trace-bar" style="left:${leftPct}%;width:${widthPct}%;--span-color:${s.color}"></span>
          </div>
          <div class="vd-trace-note">${s.note}</div>
        </div>`;
      })
      .join('');

    const body = `
      <div class="vd-trace">
        <div class="vd-trace-meta">
          <span><strong>Trace:</strong> <code>trace_id=7f3a9c4e</code></span>
          <span><strong>Total:</strong> 14.8s</span>
          <span><strong>Cost:</strong> $0.042</span>
          <span><strong>Cache Hit:</strong> 86%</span>
        </div>
        <div class="vd-trace-grid">
          <div class="vd-trace-header">
            <span>Span Hierarchy</span>
            <span class="vd-trace-axis"><span>0s</span><span>7.4s</span><span>14.8s</span></span>
            <span>Duration &amp; Telemetry</span>
          </div>
          ${rowsHtml}
        </div>
      </div>`;
    return wrapFigure('otel-trace-waterfall', 'Distributed Trace', 'OpenTelemetry GenAI Span Waterfall', body);
  },
};

export function renderVisualDiagram(id) {
  const builder = VISUAL_BUILDERS[id];
  if (!builder) {
    throw new Error(`Unknown visual diagram id "${id}"`);
  }
  return builder();
}
