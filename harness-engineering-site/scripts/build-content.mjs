import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import katex from 'katex';
import { createHighlighter } from 'shiki';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, '..');
const GUIDE_ROOT = path.resolve(SITE_ROOT, '../harness-engineering-study-guide');
const OUT_DIR = path.join(SITE_ROOT, 'public', 'data');
const CHAPTERS_OUT_DIR = path.join(OUT_DIR, 'chapters');

const MODULES = [
  {
    id: '00-foundations',
    number: 0,
    title: 'Foundations',
    subtitle: 'Start here: understand LLMs, tokens, tools, and the 7 layers of a harness.',
    accent: 'var(--mod-0)',
  },
  {
    id: '01-core-loop-and-execution',
    number: 1,
    title: 'Core Loop & Execution',
    subtitle: 'Turn stateless LLM APIs into streaming, fault-tolerant, interruptible loops.',
    accent: 'var(--mod-1)',
  },
  {
    id: '02-context-and-memory',
    number: 2,
    title: 'Context & Memory',
    subtitle: 'Prompt caching, context budgets, compaction, offloading, skills, and memory.',
    accent: 'var(--mod-2)',
  },
  {
    id: '03-tools-and-workspace-interaction',
    number: 3,
    title: 'Tools & Workspace Interaction',
    subtitle: 'File patching, ripgrep, AST/LSP, PTYs, background jobs, MCP, and browsers.',
    accent: 'var(--mod-3)',
  },
  {
    id: '04-sandboxing-and-security',
    number: 4,
    title: 'Sandboxing & Security',
    subtitle: 'Kernel isolation, egress filtering, approval policies, and prompt-injection defenses.',
    accent: 'var(--mod-4)',
  },
  {
    id: '05-multi-agent-and-orchestration',
    number: 5,
    title: 'Multi-Agent & Orchestration',
    subtitle: 'Subagents, git worktrees, reactive wakeups, swarms, planning, and workflows.',
    accent: 'var(--mod-5)',
  },
  {
    id: '06-extensibility-and-interfaces',
    number: 6,
    title: 'Extensibility & Interfaces',
    subtitle: 'Lifecycle hooks, plugins, terminal rendering, and ACP client-server protocols.',
    accent: 'var(--mod-6)',
  },
  {
    id: '07-reliability-and-evaluation',
    number: 7,
    title: 'Reliability & Evaluation',
    subtitle: 'Checkpoints, deterministic replay, telemetry, model routing, and benchmarks.',
    accent: 'var(--mod-7)',
  },
];

const CHAPTER_FILES = [
  '00-foundations/00-start-here-what-is-an-agent-harness.md',
  '01-core-loop-and-execution/01-agent-tool-use-loop.md',
  '01-core-loop-and-execution/02-streaming-and-event-parsing.md',
  '01-core-loop-and-execution/03-tool-schema-design-and-structured-outputs.md',
  '01-core-loop-and-execution/04-parallel-tool-calling.md',
  '01-core-loop-and-execution/05-error-recovery-retries-and-infinite-loop-detection.md',
  '01-core-loop-and-execution/06-session-and-turn-state-machines.md',
  '02-context-and-memory/07-system-prompt-assembly-and-instruction-hierarchy.md',
  '02-context-and-memory/08-prompt-caching-and-prefix-stability.md',
  '02-context-and-memory/09-context-window-budgeting.md',
  '02-context-and-memory/10-context-compaction-and-summarization.md',
  '02-context-and-memory/11-tool-output-truncation-and-artifact-offloading.md',
  '02-context-and-memory/12-progressive-disclosure-and-on-demand-skills.md',
  '02-context-and-memory/13-short-term-vs-long-term-memory.md',
  '03-tools-and-workspace-interaction/14-file-reading-patching-and-diff-application.md',
  '03-tools-and-workspace-interaction/15-codebase-search-ripgrep-glob-semantic-indexing.md',
  '03-tools-and-workspace-interaction/16-ast-and-language-server-protocol-lsp-integration.md',
  '03-tools-and-workspace-interaction/17-shell-and-pty-session-management.md',
  '03-tools-and-workspace-interaction/18-background-processes-and-async-notifications.md',
  '03-tools-and-workspace-interaction/19-model-context-protocol-mcp-client-architecture.md',
  '03-tools-and-workspace-interaction/20-browser-automation-integration.md',
  '04-sandboxing-and-security/21-os-level-sandboxing-seatbelt-bubblewrap-landlock-containers.md',
  '04-sandboxing-and-security/22-filesystem-and-network-isolation.md',
  '04-sandboxing-and-security/23-permission-models-and-command-approval-policies.md',
  '04-sandboxing-and-security/24-prompt-injection-defenses-and-trust-boundaries.md',
  '04-sandboxing-and-security/25-secret-and-credential-isolation.md',
  '05-multi-agent-and-orchestration/26-subagent-spawning-and-context-isolation.md',
  '05-multi-agent-and-orchestration/27-workspace-isolation-git-worktrees-ephemeral-clones.md',
  '05-multi-agent-and-orchestration/28-inter-agent-messaging-and-reactive-wakeups.md',
  '05-multi-agent-and-orchestration/29-multi-agent-swarms-and-shared-coordination.md',
  '05-multi-agent-and-orchestration/30-planning-mode-and-task-tracking.md',
  '05-multi-agent-and-orchestration/31-programmatic-agent-workflows.md',
  '06-extensibility-and-interfaces/32-lifecycle-hooks-and-interceptors.md',
  '06-extensibility-and-interfaces/33-plugin-and-configuration-discovery.md',
  '06-extensibility-and-interfaces/34-tui-cli-event-rendering.md',
  '06-extensibility-and-interfaces/35-client-server-protocols-json-rpc-acp-daemon-architecture.md',
  '07-reliability-and-evaluation/36-checkpointing-snapshots-and-rollback.md',
  '07-reliability-and-evaluation/37-transcript-logging-and-deterministic-replay.md',
  '07-reliability-and-evaluation/38-telemetry-tracing-and-token-cost-accounting.md',
  '07-reliability-and-evaluation/39-model-routing-and-rate-limit-fallbacks.md',
  '07-reliability-and-evaluation/40-agent-evaluation-harnesses-and-benchmarks.md',
];

const READING_PATHS = [
  {
    id: 'weekend-builder',
    title: 'Weekend Builder',
    goal: 'Build a working local coding agent from scratch',
    chapterNums: ['00', '01', '03', '05', '07', '09', '14', '15', '17', '23'],
    accent: 'var(--mod-1)',
  },
  {
    id: 'context-cost',
    title: 'Context & Cost Master',
    goal: 'Make agents fast, cheap, and accurate on long sessions',
    chapterNums: ['07', '08', '09', '10', '11', '12', '13', '26', '38'],
    accent: 'var(--mod-2)',
  },
  {
    id: 'security',
    title: 'Security & Sandboxing',
    goal: 'Run untrusted commands and tools safely',
    chapterNums: ['17', '21', '22', '23', '24', '25', '36'],
    accent: 'var(--mod-4)',
  },
  {
    id: 'multi-agent',
    title: 'Multi-Agent & Platform',
    goal: 'Orchestrate swarms, plugins, IDEs, and evals',
    chapterNums: ['19', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '37', '39', '40'],
    accent: 'var(--mod-5)',
  },
];

const LABS = [
  {
    id: 'tool-loop',
    title: 'Live Tool-Use Loop Simulator',
    subtitle: 'Step through a real multi-turn bug fix, inspect growing conversation arrays, stop reasons, and token cost.',
    chapterSlug: '01-agent-tool-use-loop',
    chapterNum: '01',
    badge: 'Core Loop',
  },
  {
    id: 'prompt-cache',
    title: 'Prompt Cache & Prefix Stability Playground',
    subtitle: 'Flip cache-busting bugs on and off to watch prefix KV cache hits turn crimson and multiply cost 10x.',
    chapterSlug: '08-prompt-caching-and-prefix-stability',
    chapterNum: '08',
    badge: 'Caching',
  },
  {
    id: 'context-compaction',
    title: 'Context Window Tank & Compaction Simulator',
    subtitle: 'Fill a 200k token desk with reads and test logs, trigger context rot zones, and compare micro vs. full compaction.',
    chapterSlug: '09-context-window-budgeting',
    chapterNum: '09',
    badge: 'Context',
  },
  {
    id: 'sandbox-layers',
    title: 'Defense-in-Depth Sandbox Inspector',
    subtitle: 'Send safe and dangerous shell commands through Policy, Path/Secret Guards, and OS Kernel Sandboxes.',
    chapterSlug: '21-os-level-sandboxing-seatbelt-bubblewrap-landlock-containers',
    chapterNum: '21',
    badge: 'Security',
  },
  {
    id: 'subagent-isolation',
    title: 'Subagent Context Isolation Visualizer',
    subtitle: 'Compare exploring 3 subsystems inline vs. spawning isolated subagents and keeping parent working memory crisp.',
    chapterSlug: '26-subagent-spawning-and-context-isolation',
    chapterNum: '26',
    badge: 'Multi-Agent',
  },
  {
    id: 'pass-k-eval',
    title: 'pass@k vs. pass^k Reliability Explorer',
    subtitle: 'Adjust per-trial accuracy and trial count to visualize capability ceiling vs. production consistency.',
    chapterSlug: '40-agent-evaluation-harnesses-and-benchmarks',
    chapterNum: '40',
    badge: 'Evaluations',
  },
];

const LABS_BY_CHAPTER = new Map();
for (const lab of LABS) {
  const list = LABS_BY_CHAPTER.get(lab.chapterSlug) ?? [];
  list.push(lab.id);
  LABS_BY_CHAPTER.set(lab.chapterSlug, list);
}
// Also embed Context Tank lab inside Chapter 10!
LABS_BY_CHAPTER.set('10-context-compaction-and-summarization', ['context-compaction']);

function slugifyHeading(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripInlineMarkdown(str) {
  return str
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\\([\\`*_{}[\]()#+\-.!$])/g, '$1')
    .trim();
}

function preprocessMathOutsideCode(markdown) {
  // Split out fenced code blocks and inline code spans so we never touch $ inside code.
  const tokens = [];
  const protect = (text, regex) => {
    return text.replace(regex, (match) => {
      const idx = tokens.length;
      tokens.push(match);
      return `@@CODE_TOKEN_${idx}@@`;
    });
  };

  let work = protect(markdown, /^(`{3,}|~{3,})[\s\S]*?^\1[ \t]*$/gm);
  work = protect(work, /`[^`\n]+`/g);

  // Protect escaped literal dollars `\$`
  const ESCAPED_DOLLAR = '@@ESCAPED_DOLLAR@@';
  work = work.replace(/\\\$/g, ESCAPED_DOLLAR);

  // Render display math $$...$$
  work = work.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
    const html = katex.renderToString(expr.trim(), {
      displayMode: true,
      throwOnError: false,
      strict: false,
    });
    const idx = tokens.length;
    tokens.push(`<div class="math-display">${html}</div>`);
    return `@@CODE_TOKEN_${idx}@@`;
  });

  // Render inline math $...$ (non-empty, doesn't start/end with space, avoids unmatched currency)
  work = work.replace(/\$([^\s$\\](?:[^$\n]*?[^\s$\\])?)\$/g, (full, expr) => {
    // Guard against accidental currency pairs like "$50 ... $100" across prose
    if (/^\d[\d,.\s]*$/.test(expr) || /\s{2,}/.test(expr) || expr.length > 140) {
      return full;
    }
    const html = katex.renderToString(expr, {
      displayMode: false,
      throwOnError: false,
      strict: false,
    });
    const idx = tokens.length;
    tokens.push(`<span class="math-inline">${html}</span>`);
    return `@@CODE_TOKEN_${idx}@@`;
  });

  work = work.replaceAll(ESCAPED_DOLLAR, '$');
  // Restore code and math tokens (twice in case nested, though shouldn't be)
  work = work.replace(/@@CODE_TOKEN_(\d+)@@/g, (_, idx) => tokens[Number(idx)]);
  work = work.replace(/@@CODE_TOKEN_(\d+)@@/g, (_, idx) => tokens[Number(idx)]);
  return work;
}

const SLUG_BY_REL = new Map();
for (const rel of CHAPTER_FILES) {
  const slug = path.basename(rel, '.md');
  SLUG_BY_REL.set(path.resolve(GUIDE_ROOT, rel), slug);
}

function rewriteHref(href, sourceFilePath) {
  if (!href) return href;
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
    return href;
  }
  if (href.startsWith('#')) {
    return href;
  }
  const [rawTarget, hashPart] = href.split('#');
  const resolved = path.resolve(path.dirname(sourceFilePath), rawTarget);
  if (resolved === path.join(GUIDE_ROOT, 'README.md')) {
    return '#/';
  }
  if (resolved === path.join(GUIDE_ROOT, 'GLOSSARY.md')) {
    return '#/glossary';
  }
  if (resolved === path.join(GUIDE_ROOT, 'PLAN.md')) {
    return '#/roadmap';
  }
  const targetSlug = SLUG_BY_REL.get(resolved);
  if (targetSlug) {
    return hashPart ? `#/chapter/${targetSlug}?section=${encodeURIComponent(hashPart)}` : `#/chapter/${targetSlug}`;
  }
  throw new Error(`Unresolved relative link "${href}" inside ${sourceFilePath} (resolved to ${resolved})`);
}

async function main() {
  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(CHAPTERS_OUT_DIR, { recursive: true });

  const highlighter = await createHighlighter({
    themes: ['github-light', 'github-dark-dimmed'],
    langs: [
      'bash',
      'json',
      'markdown',
      'python',
      'scheme',
      'toml',
      'typescript',
      'xml',
      'yaml',
      'text',
    ],
  });

  const LANG_ALIASES = {
    ts: 'typescript',
    js: 'typescript',
    javascript: 'typescript',
    py: 'python',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    plain: 'text',
    ascii: 'text',
    '': 'text',
  };
  const LOADED_LANGS = new Set([
    'bash',
    'json',
    'markdown',
    'python',
    'scheme',
    'toml',
    'typescript',
    'xml',
    'yaml',
    'text',
  ]);

  let mermaidCounter = 0;

  function renderMarkdown(markdown, sourceFilePath, collectHeadings = true) {
    const headings = [];
    const seenIds = new Map();

    const uniqueId = (rawText) => {
      const base = slugifyHeading(rawText) || 'section';
      const count = seenIds.get(base) ?? 0;
      seenIds.set(base, count + 1);
      return count === 0 ? base : `${base}-${count + 1}`;
    };

    const withMath = preprocessMathOutsideCode(markdown);
    const marked = new Marked();

    marked.use({
      gfm: true,
      breaks: false,
      renderer: {
        heading({ tokens, depth }) {
          const innerHtml = this.parser.parseInline(tokens);
          const plainText = stripInlineMarkdown(innerHtml.replace(/<[^>]+>/g, ''));
          const id = uniqueId(plainText);
          if (collectHeadings && (depth === 2 || depth === 3)) {
            headings.push({ id, level: depth, text: plainText });
          }
          if (depth === 1) {
            return '';
          }
          return `<h${depth} id="${id}" tabindex="-1"><a class="heading-anchor" href="#${id}" data-anchor="${id}" aria-label="Link to ${escapeHtml(plainText)}">#</a>${innerHtml}</h${depth}>\n`;
        },
        code({ text, lang }) {
          const rawLang = (lang || '').trim().toLowerCase().split(/\s+/)[0];
          if (rawLang === 'mermaid') {
            mermaidCounter += 1;
            const mId = `mmd-${mermaidCounter}`;
            const b64 = Buffer.from(text, 'utf8').toString('base64');
            return `<figure class="mermaid-figure" data-mermaid-id="${mId}" data-mermaid-b64="${b64}">
  <div class="mermaid-toolbar">
    <span class="mermaid-badge">Architecture Diagram</span>
    <div class="mermaid-actions">
      <button type="button" class="mermaid-btn" data-action="zoom">Expand</button>
      <button type="button" class="mermaid-btn" data-action="copy">Copy source</button>
    </div>
  </div>
  <div class="mermaid-stage"><div class="mermaid-loading">Rendering diagram…</div></div>
</figure>\n`;
          }

          const mapped = LANG_ALIASES[rawLang] ?? rawLang;
          const safeLang = LOADED_LANGS.has(mapped) ? mapped : 'text';
          const displayLang = rawLang || 'text';
          const highlighted = highlighter.codeToHtml(text, {
            lang: safeLang,
            themes: {
              light: 'github-light',
              dark: 'github-dark-dimmed',
            },
            defaultColor: false,
          });
          return `<div class="code-block">
  <div class="code-header">
    <span class="code-lang">${escapeHtml(displayLang)}</span>
    <button type="button" class="copy-code-btn">Copy</button>
  </div>
  <div class="code-scroll">${highlighted}</div>
</div>\n`;
        },
        table(token) {
          const headerHtml = token.header
            .map((cell) => {
              const align = cell.align ? ` style="text-align:${cell.align}"` : '';
              return `<th${align}>${this.parser.parseInline(cell.tokens)}</th>`;
            })
            .join('');
          const rowsHtml = token.rows
            .map((row) => {
              const cells = row
                .map((cell) => {
                  const align = cell.align ? ` style="text-align:${cell.align}"` : '';
                  return `<td${align}>${this.parser.parseInline(cell.tokens)}</td>`;
                })
                .join('');
              return `<tr>${cells}</tr>`;
            })
            .join('\n');
          return `<div class="table-scroll" tabindex="0"><table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>\n`;
        },
        link({ href, title, tokens }) {
          const rewritten = rewriteHref(href || '', sourceFilePath);
          const inner = this.parser.parseInline(tokens);
          const isExternal = rewritten.startsWith('http://') || rewritten.startsWith('https://');
          const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
          const extAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
          return `<a href="${escapeHtml(rewritten)}"${titleAttr}${extAttrs}>${inner}</a>`;
        },
        html({ text }) {
          return text.replace(/<details(\s|>)/g, '<details class="quiz-reveal"$1');
        },
      },
    });

    const html = marked.parse(withMath);
    return { html, headings };
  }

  const chaptersMeta = [];
  const searchItems = [];
  let totalWords = 0;
  let totalLines = 0;

  for (let i = 0; i < CHAPTER_FILES.length; i++) {
    const rel = CHAPTER_FILES[i];
    const absPath = path.join(GUIDE_ROOT, rel);
    const raw = await fs.readFile(absPath, 'utf-8');
    const lines = raw.split(/\r?\n/);
    totalLines += lines.length;

    const moduleId = rel.split('/')[0];
    const mod = MODULES.find((m) => m.id === moduleId);
    const slug = path.basename(rel, '.md');
    const num = slug.slice(0, 2);

    // Extract top metadata from line 1: > **Module X: ...** | Prerequisites: ... | Reading Time: ~XX min
    const headerLine = lines[0] || '';
    const prereqMatch = headerLine.match(/Prerequisites:\s*([^|]+)/i);
    const timeMatch = headerLine.match(/Reading Time:\s*([^\n|]+)/i);
    const prerequisites = prereqMatch ? prereqMatch[1].trim() : 'None';
    const readingTime = timeMatch ? timeMatch[1].trim() : '~15 min';

    // Extract H1 title
    const h1Line = lines.find((l) => l.startsWith('# ')) || `# ${slug}`;
    const rawTitle = h1Line.replace(/^#\s+/, '').trim();
    const title = rawTitle.replace(/^\d{2}\.\s+/, '').trim();

    // Strip top breadcrumb blockquote (leading `>` lines) and trailing footer nav after last `---`
    let startIdx = 0;
    while (startIdx < lines.length && (lines[startIdx].startsWith('>') || lines[startIdx].trim() === '')) {
      startIdx++;
    }
    let endIdx = lines.length;
    for (let k = lines.length - 1; k >= Math.max(0, lines.length - 8); k--) {
      if (lines[k].trim() === '---') {
        const tail = lines.slice(k + 1).join(' ');
        if (tail.includes('Table of Contents') || tail.includes('Next:') || tail.includes('Previous') || tail.includes('←')) {
          endIdx = k;
          break;
        }
      }
    }

    const bodyMd = lines.slice(startIdx, endIdx).join('\n');
    const words = bodyMd.trim().split(/\s+/).length;
    totalWords += words;

    // Extract clean first intro paragraph for card summary
    const bodyLines = bodyMd.split(/\r?\n/);
    let summary = '';
    for (const bl of bodyLines) {
      const t = bl.trim();
      if (!t || t.startsWith('#') || t.startsWith('---') || t.startsWith('```') || t.startsWith('>') || t.startsWith('|')) {
        if (summary) break;
        continue;
      }
      summary = summary ? `${summary} ${t}` : t;
      if (summary.length > 180) break;
    }
    summary = stripInlineMarkdown(summary);
    if (summary.length > 185) {
      summary = `${summary.slice(0, 182).trimEnd()}…`;
    }

    const { html, headings } = renderMarkdown(bodyMd, absPath, true);
    const prevSlug = i > 0 ? path.basename(CHAPTER_FILES[i - 1], '.md') : null;
    const nextSlug = i < CHAPTER_FILES.length - 1 ? path.basename(CHAPTER_FILES[i + 1], '.md') : null;
    const labIds = LABS_BY_CHAPTER.get(slug) ?? [];

    const meta = {
      num,
      slug,
      title,
      summary,
      moduleId,
      moduleNumber: mod.number,
      moduleTitle: mod.title,
      prerequisites,
      readingTime,
      wordCount: words,
      lineCount: lines.length,
      headings,
      labIds,
      prevSlug,
      nextSlug,
      sourceRelPath: rel,
    };

    chaptersMeta.push(meta);

    await fs.writeFile(
      path.join(CHAPTERS_OUT_DIR, `${slug}.json`),
      JSON.stringify({ ...meta, html }),
      'utf-8'
    );

    searchItems.push({
      type: 'chapter',
      title: `${num}. ${title}`,
      subtitle: `Module ${mod.number}: ${mod.title} · ${readingTime}`,
      route: `#/chapter/${slug}`,
      keywords: `${num} ${title} ${mod.title} ${summary}`.toLowerCase(),
      badge: `Ch. ${num}`,
    });

    for (const h of headings) {
      if (h.level === 2 && !h.text.startsWith('8. Key Takeaways')) {
        searchItems.push({
          type: 'section',
          title: h.text,
          subtitle: `Ch. ${num} · ${title}`,
          route: `#/chapter/${slug}?section=${encodeURIComponent(h.id)}`,
          keywords: `${h.text} ${title} ${num}`.toLowerCase(),
          badge: `Ch. ${num}`,
        });
      }
    }
  }

  for (const lab of LABS) {
    searchItems.push({
      type: 'lab',
      title: lab.title,
      subtitle: lab.subtitle,
      route: `#/chapter/${lab.chapterSlug}?lab=${encodeURIComponent(lab.id)}`,
      keywords: `${lab.title} ${lab.subtitle} ${lab.badge} interactive simulator lab`.toLowerCase(),
      badge: 'Interactive Lab',
    });
  }

  // Parse GLOSSARY.md
  const glossaryPath = path.join(GUIDE_ROOT, 'GLOSSARY.md');
  const glossaryRaw = await fs.readFile(glossaryPath, 'utf-8');
  const glossaryEntries = [];
  let currentLetter = 'A';
  const gLines = glossaryRaw.split(/\r?\n/);

  for (let idx = 0; idx < gLines.length; idx++) {
    const line = gLines[idx];
    const letterMatch = line.match(/^##\s+([A-Z])\s*$/);
    if (letterMatch) {
      currentLetter = letterMatch[1];
      continue;
    }
    const termMatch = line.match(/^\*\*(.+?)\*\*\s*$/);
    if (termMatch) {
      const term = stripInlineMarkdown(termMatch[1]);
      const defLines = [];
      let j = idx + 1;
      while (j < gLines.length && gLines[j].trim() !== '' && !gLines[j].startsWith('---') && !gLines[j].startsWith('## ')) {
        defLines.push(gLines[j]);
        j++;
      }
      const defMd = defLines.join(' ').trim();
      const { html: defHtml } = renderMarkdown(defMd, glossaryPath, false);

      // Extract chapter refs from links
      const chRefs = [];
      for (const m of defMd.matchAll(/\[(\d{2})\]\(([^)]+\.md)\)/g)) {
        const chNum = m[1];
        const chSlug = path.basename(m[2], '.md');
        if (!chRefs.some((c) => c.slug === chSlug)) {
          chRefs.push({ num: chNum, slug: chSlug });
        }
      }

      const id = slugifyHeading(term);
      glossaryEntries.push({
        id,
        term,
        letter: currentLetter,
        definitionHtml: defHtml,
        definitionText: stripInlineMarkdown(defMd),
        chapters: chRefs,
      });

      searchItems.push({
        type: 'glossary',
        title: term,
        subtitle: stripInlineMarkdown(defMd).slice(0, 110),
        route: `#/glossary?term=${encodeURIComponent(id)}`,
        keywords: `${term} ${stripInlineMarkdown(defMd)} glossary definition`.toLowerCase(),
        badge: 'Glossary',
      });

      idx = j - 1;
    }
  }

  const modulesOut = MODULES.map((m) => ({
    ...m,
    chapterSlugs: chaptersMeta.filter((c) => c.moduleId === m.id).map((c) => c.slug),
  }));

  const manifest = {
    generatedAt: new Date().toISOString(),
    stats: {
      totalChapters: chaptersMeta.length,
      totalModules: modulesOut.length,
      totalWords,
      totalLines,
      totalGlossaryTerms: glossaryEntries.length,
      totalLabs: LABS.length,
    },
    modules: modulesOut,
    chapters: chaptersMeta,
    readingPaths: READING_PATHS,
    labs: LABS,
  };

  await fs.writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest), 'utf-8');
  await fs.writeFile(path.join(OUT_DIR, 'search-index.json'), JSON.stringify(searchItems), 'utf-8');
  await fs.writeFile(path.join(OUT_DIR, 'glossary.json'), JSON.stringify(glossaryEntries), 'utf-8');

  console.log(
    `Built ${chaptersMeta.length} chapters (${totalWords.toLocaleString()} words, ${mermaidCounter} Mermaid diagrams), ${glossaryEntries.length} glossary terms, and ${searchItems.length} search entries.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
