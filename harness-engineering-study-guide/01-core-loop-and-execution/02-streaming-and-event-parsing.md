> **Module 1: Core Loop & Execution** | Prerequisites: Chapter 01 | Reading Time: ~20 min
>
> [← 01. Agent Tool-Use Loop](./01-agent-tool-use-loop.md) | [Table of Contents](../README.md) | [03. Tool Schema Design & Structured Outputs →](./03-tool-schema-design-and-structured-outputs.md)

# 02. Streaming & Event Parsing

In Chapter 01, we treated `call_llm()` like a black box: send messages in, get a finished response out. If you build an agent that way—waiting for the entire response to arrive before showing anything—your user will stare at a frozen terminal for 15 to 45 seconds on every single turn, wondering whether the program crashed.

Modern LLM harnesses never wait for the full response. They consume a **live stream of incremental events** over HTTP, paint words and progress indicators on screen milliseconds after the model starts thinking, reassemble fragmented JSON tool arguments piece by piece, and let the user hit `Escape` the instant the agent heads in the wrong direction.

---

## 1. The Simple Idea: Listening to a Live Phone Call vs. Waiting for a Voicemail

Imagine calling a colleague to ask for directions to a restaurant.

- **Non-streaming (waiting for a voicemail):** Your colleague records a 30-second audio message. You sit in total silence for 30 seconds, unable to tell if they are even speaking—and if they start giving directions to the *wrong* restaurant in second 3, you cannot interrupt them until the whole recording finishes downloading.
- **Streaming (a live phone call):** You hear the very first word half a second after they start talking. You immediately know the line is alive, you can follow their train of thought in real time, and the moment they say *"Take Highway 9 north..."* you can jump in with *"Wait—I'm downtown, not by the airport!"*

**What breaks if you don't stream properly?**
1. **Terrible perceived latency:** Users assume an app is hung after ~2 seconds of silence, even if the model is faithfully writing a 2,000-token patch.
2. **HTTP timeouts:** Proxies, corporate firewalls, and load balancers often kill silent HTTP connections after 30–60 seconds with `504 Gateway Timeout`. Streaming keeps bytes flowing continuously.
3. **Broken tool calls:** When you *do* enable streaming, JSON tool arguments do not arrive as neat objects—they arrive chopped into tiny fragments like `{"pa`, `th": "src/`, `app.py"}`. If your parser mishandles chunks, UTF-8 characters, or interleaved blocks, your harness corrupts data or crashes mid-turn.

---

## 2. Why This Matters in a Real Agent Harness

Streaming is not just a pretty typewriter animation. In an agent harness, it directly impacts four engineering pillars:

- **Time-To-First-Token (TTFT):** The delay from sending the request until the first token arrives. Non-streaming forces the user to wait for **total generation time** (`TTFT + output_tokens / tokens_per_sec`). On a 1,500-token reasoning + patch turn, streaming cuts perceived wait time from ~25 seconds down to ~0.6 seconds.
- **Live Cancellation & Token Savings:** Every output token you generate costs money (typically 3x–5x more than input tokens). When a user sees the agent heading down the wrong path 100 tokens into a 2,000-token answer and hits `Ctrl+C`, aborting the HTTP stream immediately saves the remaining 1,900 output tokens and seconds of wasted time.
- **Rich Multi-Channel UI:** Frontier models emit *three* distinct streams in a single turn: **private thinking/reasoning**, **visible prose**, and **structured tool calls**. Your streaming parser separates these channels so the UI can show a collapsible *"Thinking..."* panel, live Markdown prose, and a clean `"Reading src/auth.py..."` badge—never raw JSON spaghetti.
- **Resilience Under Flaky Networks:** Long-running agent sessions *will* hit dropped Wi-Fi packets, mid-stream server overload errors, and slow terminal renderers. A solid stream parser handles malformed frames, disconnects, and backpressure without locking up or leaking memory.

---

## 3. The Big Picture

Here is how raw network bytes travel through a streaming harness from the LLM provider's server to your agent loop and terminal UI:

```text
  LLM API Server (HTTP 200, Content-Type: text/event-stream)
         |
         |  Raw TCP byte chunks (arbitrary boundaries, may split UTF-8 or lines!)
         v
  +-------------------------------------------------------------------+
  | 1. Byte Decoder + Line / SSE Frame Parser                         |
  |    - TextDecoder({ stream: true }) handles split multi-byte UTF-8 |
  |    - Buffers until blank line (\n\n) -> emits { event, data }     |
  +---------------------------------+---------------------------------+
                                    |  Parsed SSE JSON payloads
                                    v
  +-------------------------------------------------------------------+
  | 2. Block Demultiplexer & Accumulator (State per block index)      |
  |    +-------------------+-------------------+-------------------+  |
  |    | Thinking Buffer   | Text Buffer       | Tool Args Buffer  |  |
  |    | (text + signature)| (visible prose)   | (raw JSON string) |  |
  |    +---------+---------+---------+---------+---------+---------+  |
  +--------------|-------------------|-------------------|------------+
                 |                   |                   |
                 v                   v                   v
        [UI: Thinking Pane]  [UI: Markdown Stream]  [Wait for block_stop
                                                     -> JSON.parse(buf)
                                                     -> Tool Dispatcher]
```

The golden rule of streaming parsers is **strict separation of layers**: Layer 1 only cares about HTTP/SSE framing; Layer 2 translates provider-specific events into a normalized stream and assembles complete blocks; Layer 3 (UI + agent loop) consumes clean typed events.

---

## 4. Deep Dive: Subtopic by Subtopic

### 4.1 Why Streaming Matters: TTFT, Perceived Latency, and Live Cancellation

Let's put numbers on the difference streaming makes. Suppose a model takes **0.7 seconds** to start generating (TTFT) and streams at **60 tokens per second**. For a single turn that generates 600 tokens of thinking + 300 tokens of explanation + 300 tokens of code edit (1,200 output tokens total):

| Metric | Non-Streaming (`stream: false`) | Streaming (`stream: true`) |
| :--- | :--- | :--- |
| **Time until user sees *anything*** | **20.7 seconds** (0.7s + 1200/60) | **0.7 seconds** (TTFT) |
| **Time until user can cancel a bad trajectory** | After all 20.7s are spent | Immediately (e.g., at 1.5s) |
| **Risk of 30s proxy idle timeout** | High on long code generations | Near zero (bytes + `ping` keepalives flow continuously) |
| **Total wall-clock time to finish** | 20.7 seconds | 20.7 seconds (same total time, vastly better UX) |

Streaming does not make the GPU run faster—it makes the **latency transparent** and gives both the human and the harness real-time visibility into what the model is doing.

---

### 4.2 Server-Sent Events (SSE) and HTTP Chunked Streams From Scratch

Nearly every major LLM API (Anthropic Messages, OpenAI Responses, Gemini `streamGenerateContent?alt=sse`, and local servers like vLLM/Ollama/llama.cpp) streams responses using **Server-Sent Events (SSE)** over **HTTP chunked transfer encoding**.

> **Plain-English definitions:**
> - **HTTP Chunked Transfer Encoding:** Normally an HTTP response tells you its exact byte length up front (`Content-Length: 4096`). When streaming, the server doesn't know how long the answer will be, so it sends `Transfer-Encoding: chunked` (or HTTP/2 data frames) and ships small chunks of bytes as soon as they are ready.
> - **Server-Sent Events (SSE):** A dead-simple, plain-text protocol sent over a single one-way HTTP response (`Content-Type: text/event-stream`). Each event is a few `field: value` lines separated by a **blank line** (`\n\n` or `\r\n\r\n`).

Here is what real raw SSE wire text looks like coming off Anthropic's Messages API:

```text
event: message_start
data: {"type":"message_start","message":{"id":"msg_01X","role":"assistant","usage":{"input_tokens":412,"output_tokens":1}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Let me check "}}

event: ping
data: {"type":"ping"}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"your config."}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":9}}

event: message_stop
data: {"type":"message_stop"}

```

Look at the exact SSE framing rules (defined by the WHATWG HTML Living Standard) that trip up hand-rolled parsers:

1. **TCP chunks do NOT align with SSE events.** One `read()` from the socket might deliver *half* of a JSON line, or *three* complete SSE events stuck together. You **must** keep a rolling string buffer and split on `\n\n` (normalizing `\r\n` and `\r` first).
2. **Multi-byte UTF-8 characters can be split across chunk boundaries!** An emoji like `🚀` or a CJK character takes 3–4 bytes in UTF-8. If chunk 1 ends after byte 2 and chunk 2 starts with byte 3, decoding each chunk independently turns it into the `U+FFFD` replacement character (garbled `?` boxes). Always use a stateful streaming decoder (`TextDecoder("utf-8")` with `{ stream: true }` in JS/TS, or `codecs.getincrementaldecoder("utf-8")()` in Python).
3. **Lines starting with `:` are comments** (often used as keepalives like `: ping`). Ignore them silently.
4. **Multiple `data:` lines in one event** must be joined with `\n` before parsing.
5. **The single leading space** after `data:` is optional and stripped (e.g., `data: {"a":1}` and `data:{"a":1}` both yield `{"a":1}`), while any *second* space is preserved.

#### Comparing the Three Major Provider SSE Streams (2025–2026)

| Lifecycle Stage | Anthropic Messages API | OpenAI Responses API | Gemini API (`?alt=sse`) |
| :--- | :--- | :--- | :--- |
| **Stream opens** | `message_start` | `response.created`, `response.in_progress` | First `GenerateContentResponse` chunk |
| **Block / item starts** | `content_block_start` (gives `index`, `type`, tool `id`/`name`) | `response.output_item.added` (gives `output_index`, `item.type`, `call_id`, `name`) | First part with `thought: true`, `text`, or `functionCall` |
| **Text delta** | `content_block_delta` (`delta.type == "text_delta"`) | `response.output_text.delta` (`event.delta`) | `candidates[0].content.parts[].text` |
| **Tool arguments delta** | `content_block_delta` (`delta.type == "input_json_delta"`, `delta.partial_json`) | `response.function_call_arguments.delta` (`event.delta`) | `functionCall` part (complete object or streamed partial args depending on mode) |
| **Thinking delta** | `content_block_delta` (`thinking_delta` + `signature_delta`) | `response.reasoning_summary_text.delta` / reasoning item | Part with `thought: true` + `thoughtSignature` |
| **Block / item ends** | `content_block_stop` | `response.output_item.done` (Note: don't rely solely on `function_call_arguments.done`) | Next part / final candidate |
| **Final stop & usage** | `message_delta` (`stop_reason`, `usage`) → `message_stop` | `response.completed` or `response.incomplete` | Chunk with `finishReason` + `usageMetadata` |

---

### 4.3 Reassembling Incremental JSON Deltas for Tool Arguments

When an LLM calls a tool during streaming, it does **not** emit a valid JSON object on every event. It emits raw string fragments—sometimes a single character or half a key name at a time!

Look at a real Anthropic `tool_use` stream:

```text
event: content_block_start
data: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_01P9","name":"edit_file","input":{}}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\"pa"}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"th\": \"src/auth.py\", \"li"}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"ne\": 42}"}}

event: content_block_stop
data: {"type":"content_block_stop","index":1}
```

Notice four subtle traps here:

1. **Key your buffers by block `index` (or `item_id`), NOT a single global string!**
   A model can emit multiple tool calls in one turn (Chapter 04: Parallel Tool Calling), and in some APIs deltas for different items carry distinct `index` / `output_index` numbers. Storing buffers in a map `buffers[index]` guarantees fragments from Tool A never bleed into Tool B.
2. **Wait for `content_block_stop` / `response.output_item.done` before running `JSON.parse()` for execution.**
   Never execute a tool from a half-accumulated JSON buffer. Only parse once the block closes *and* the overall stream did not end in truncation (`max_tokens` / `incomplete`).
3. **Handle empty-argument tools gracefully!**
   When a model calls a zero-argument tool like `get_git_status()`, some providers emit **zero** `input_json_delta` events—so your buffer is `""` (empty string) when `content_block_stop` arrives! Calling `JSON.parse("")` throws a syntax error. Always treat `buf.trim() === ""` as `{}`.
4. **Optional UX polish — Partial JSON preview:**
   When the model is streaming a 400-line file write inside `write_file(path, content)`, waiting 8 seconds with no UI movement feels slow. Some harnesses show a live preview using a *lenient partial JSON extractor* (only for display—never for actual execution!) or stream a simple byte counter (`"Writing src/auth.py... 1.4 KB"`).

---

### 4.4 Separating Thinking/Reasoning Blocks, Visible Text, and Tool Call Blocks

Modern reasoning models do not just output text and tool calls—they emit **structured reasoning blocks** before (or between) actions. A single assistant turn can contain all three block types in order:

```text
Block 0: [thinking]   "The test fails with 200 instead of 401. Let me check jwt.py..."
Block 1: [text]       "I'll inspect the JWT verification logic in `src/auth/jwt.py`."
Block 2: [tool_use]   read_file(path="src/auth/jwt.py", start_line=1, end_line=80)
```

Your streaming parser must route each block type cleanly—and obey **provider-specific preservation rules** that catch almost every developer the first time they integrate thinking models:

1. **Anthropic Extended Thinking (`thinking_delta` + `signature_delta` + `redacted_thinking`):**
   - Thinking text streams via `thinking_delta`. Right before `content_block_stop`, Anthropic sends a cryptographic **`signature_delta`**.
   - Occasionally, safety systems encrypt part of a thinking block and return a `redacted_thinking` block containing opaque `data`.
   - **Mandatory rule:** When continuing a multi-turn tool-use loop, you **must preserve thinking blocks (including their exact `signature` and any `redacted_thinking` blocks) verbatim** in the assistant message you send back to the API. Modifying a single whitespace character or dropping the signature breaks cryptographic verification and causes `400 Bad Request`!
2. **Gemini Thinking (`thought: true` + `thoughtSignature`):**
   - Gemini marks reasoning parts with `thought: true` and attaches an opaque `thoughtSignature` field to parts in multi-turn tool-calling flows.
   - **Mandatory rule:** Never strip `thoughtSignature` or merge a part that carries a signature with a regular text part that does not. Keep the original part objects intact when passing history back on the next loop turn.
3. **OpenAI Responses API (`reasoning` items):**
   - Reasoning items appear in `output` alongside `message` and `function_call` items (and may include encrypted reasoning content for stateless zero-data-retention setups). Preserve reasoning items when passing conversation state forward within the same model family.
4. **UI separation:**
   - Route `thinking` deltas to a dimmed, collapsible UI widget (or hide them when `--quiet` is enabled).
   - Route `text` deltas to the primary Markdown renderer.
   - Route `tool_use` start/stop events to compact status cards (`⚙ Running pytest...`) rather than dumping raw JSON keys at the user.

---

### 4.5 Handling Malformed Chunks, Mid-Stream Disconnects, and Backpressure

In local testing on fast Wi-Fi, streams finish cleanly 99.9% of the time. In real-world use across thousands of sessions, five ugly failure modes happen constantly:

#### 1. Inline `error` Events Inside an HTTP `200 OK` Stream
With SSE, the server sends HTTP headers (`200 OK`) *before* generation begins. If the GPU cluster hits an overload error 4 seconds later, the server **cannot change the HTTP status code to 529 or 500**! Instead, it sends an inline SSE error event:

```text
event: error
data: {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}
```

If your harness only checks `response.status === 200`, it will miss mid-stream errors completely. Always inspect `event === "error"` (or `payload.type === "error"` / `response.failed`) and feed it into your retry logic (Chapter 05).

#### 2. Mid-Stream Disconnects & Silent Truncation
Sometimes the TCP connection drops cleanly (EOF) *before* `message_stop` or `response.completed` arrives—no exception thrown, the iterator simply ends!
- **Defense:** Track an explicit boolean `receivedTerminalEvent` (set to `true` only on `message_stop`, `response.completed`, `response.incomplete`, or a Gemini chunk with a non-empty `finishReason`). If the stream ends with `receivedTerminalEvent === false`, treat it as a **premature disconnect** (retryable network failure), never as a normal `end_turn`!

#### 3. The OpenAI Responses API Truncation Quirk
When hitting `max_output_tokens` mid-function-call, individual `output_item.done` events can occasionally fire before the outer `response.incomplete` event—meaning a tool argument string may be syntactically cut off even when its item closed.
- **Defense:** Always wrap `JSON.parse(argBuffer)` in a `try/catch` *and* check the overall response's final `status` / `stop_reason` before dispatching any tool calls. Never assume `strict: true` prevents mid-stream token-limit truncation!

#### 4. Malformed JSON Chunks
Reverse proxies, corporate SSL interceptors, or custom OpenAI-compatible local servers occasionally inject HTML error pages or garbled lines into an SSE stream.
- **Defense:** Guard `JSON.parse(data)` per frame. Log the raw bad frame to your debug transcript, surface a structured `StreamParseError` (distinct from a tool error), and decide whether to retry the request.

#### 5. Backpressure (Slow Consumers vs. Fast Token Streams)
> **Plain-English definition:** **Backpressure** is what happens when the producer (the LLM API streaming 150 tokens/sec) sends data faster than the consumer (for example, a terminal UI re-rendering complex syntax-highlighted Markdown on every single token) can process it.

If you blindly trigger a full terminal redraw on every single `text_delta` event:
- CPU spikes to 100%, the terminal flickers wildly, and event queues pile up in RAM so cancellation feels laggy.
- **Defense (two simple rules):**
  1. **Use pull-based async iteration** (`for await (const chunk of response.body)`) so TCP flow control naturally slows reading if the consumer pauses.
  2. **Coalesce UI renders to a fixed frame budget** (e.g., buffer incoming text deltas in a string and flush to the terminal at most every **16–33ms**, ~30–60 FPS—we dive into TUI rendering in Chapter 34). Keep protocol parsing instant, and throttle only the screen redraws!

---

## 5. How Real Harnesses Do It

- **Claude Code:** Streams Anthropic Messages SSE events and maintains a clean internal event bus separating thinking deltas, assistant prose, and tool-use input blocks. It preserves thinking blocks and their cryptographic `signature` verbatim across multi-turn tool calls, shows live spinners while tool JSON arguments stream in, and immediately aborts the underlying HTTP stream via `AbortController` when the user presses `Escape`.
- **OpenAI Codex CLI:** Consumes OpenAI Responses API SSE streams (`response.output_item.added`, `response.output_text.delta`, `response.function_call_arguments.delta`, `response.output_item.done`, `response.completed`) inside its Rust core engine, converting them into strongly typed internal `Event` enums pushed over an async channel to the TUI—cleanly decoupling network parsing from terminal rendering and frame throttling.
- **Gemini CLI:** Wraps Gemini's streaming API in a `Turn` stream generator inside `packages/core` that yields normalized `GeminiEventType` events (`Content`, `Thought`, `ToolCallRequest`, `Error`, `Finished`). It carefully retains `thoughtSignature` metadata on streamed parts so multi-turn tool calls stay valid, and detects empty or premature stream endings for automatic retry.
- **OpenCode:** Normalizes streaming events across Anthropic, OpenAI, Gemini, and local OpenAI-compatible providers into one unified internal part stream (`text`, `reasoning`, `tool-call`), coalescing rapid deltas before persisting updates and rendering in the TUI.

---

## 6. Common Pitfalls & Failure Modes

| Pitfall | What Goes Wrong | How to Prevent It |
| :--- | :--- | :--- |
| **1. Decoding each TCP chunk with `.toString("utf8")`** | Splits a multi-byte UTF-8 emoji or non-ASCII character across two chunks, producing `U+FFFD` replacement-character corruption in code edits! | Always use a streaming decoder (`new TextDecoder("utf-8")` with `{ stream: true }` or Python's `codecs.getincrementaldecoder("utf-8")()`). |
| **2. Assuming one TCP chunk = one SSE event** | Crashes with `JSON.parse` errors as soon as a large tool call splits across two network packets. | Accumulate decoded text in a line/frame buffer and only emit events on blank-line boundaries (`\n\n`). |
| **3. Stripping or editing `thinking` signatures** | Multi-turn tool loops suddenly fail with `400 Bad Request` on Anthropic or Gemini thinking models. | Store thinking text + `signature` / `thoughtSignature` / `redacted_thinking` untouched in the canonical assistant message. |
| **4. Calling `JSON.parse("")` on zero-arg tools** | Tools with no required parameters often emit zero `input_json_delta` chunks, crashing naive parsers on `content_block_stop`. | Default empty/whitespace argument buffers to `{}` before parsing. |
| **5. Ignoring premature EOF** | Network drop mid-stream makes the loop think the model finished naturally, hiding half the answer or skipping tool calls. | Require an explicit terminal event (`message_stop` / `response.completed` / `finishReason`) before treating a turn as complete. |
| **6. Redrawing the UI on every single token** | Terminal flickers, CPU pegs at 100%, and `Ctrl+C` lags behind buffered deltas. | Decouple stream ingestion from rendering; batch UI redraws to ~30–60 FPS (16–33ms intervals). |

---

## 7. Build It Yourself: Mini-Lab

Here is a self-contained, dependency-free **TypeScript** streaming parser that takes a raw `Response.body` (`ReadableStream<Uint8Array>`) from an Anthropic-style SSE endpoint, handles split UTF-8 bytes and arbitrary TCP chunk boundaries, separates thinking/text/tool blocks, preserves thinking signatures, detects premature disconnects, and emits clean typed events for your UI and agent loop.

```typescript
// Minimal, production-grade SSE frame parser + block reassembler (zero dependencies)

export type HarnessStreamEvent =
  | { type: "thinking_delta"; text: string }
  | { type: "text_delta"; text: string }
  | { type: "tool_start"; index: number; id: string; name: string }
  | { type: "tool_ready"; id: string; name: string; input: Record<string, unknown> }
  | { type: "turn_complete"; stopReason: string; assistantBlocks: unknown[] }
  | { type: "stream_error"; message: string; retryable: boolean };

interface RawSseFrame {
  event: string;
  data: string;
}

/** Layer 1: Raw byte stream -> clean SSE frames (UTF-8 & chunk-boundary safe). */
async function* parseSseFrames(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<RawSseFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8"); // Stateful streaming decoder!
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) break;
      const { value, done } = await reader.read();
      if (done) break;

      // { stream: true } prevents corrupting multi-byte UTF-8 characters split across chunks.
      buffer += decoder.decode(value, { stream: true });
      // Normalize \r\n and standalone \r into \n per WHATWG SSE spec.
      buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

      let splitIdx: number;
      while ((splitIdx = buffer.indexOf("\n\n")) !== -1) {
        const rawBlock = buffer.slice(0, splitIdx);
        buffer = buffer.slice(splitIdx + 2);

        let eventName = "message";
        const dataLines: string[] = [];

        for (const line of rawBlock.split("\n")) {
          if (line.startsWith(":") || line === "") continue; // Comment / keepalive
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            // Strip at most ONE leading space after "data:"
            const payload = line.slice(5);
            dataLines.push(payload.startsWith(" ") ? payload.slice(1) : payload);
          }
        }

        if (dataLines.length > 0) {
          yield { event: eventName, data: dataLines.join("\n") };
        }
      }
    }

    // Flush any remaining decoder bytes on clean stream end.
    buffer += decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

interface ActiveBlock {
  type: "thinking" | "redacted_thinking" | "text" | "tool_use";
  id?: string;
  name?: string;
  textBuf: string;
  jsonBuf: string;
  signatureBuf: string;
  redactedData?: string;
}

/** Layer 2: SSE frames -> separated channels + complete, API-ready assistant blocks. */
export async function* parseAnthropicStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<HarnessStreamEvent> {
  const activeBlocks = new Map<number, ActiveBlock>();
  const finishedBlocks: unknown[] = [];
  let stopReason = "unknown";
  let receivedMessageStop = false;

  for await (const frame of parseSseFrames(body, signal)) {
    if (frame.event === "ping") continue;

    let payload: any;
    try {
      payload = JSON.parse(frame.data);
    } catch {
      yield {
        type: "stream_error",
        message: `Malformed JSON in SSE frame '${frame.event}': ${frame.data.slice(0, 120)}`,
        retryable: true,
      };
      return;
    }

    if (frame.event === "error" || payload.type === "error") {
      const errType = payload.error?.type ?? "unknown_error";
      const retryable = errType === "overloaded_error" || errType === "rate_limit_error";
      yield {
        type: "stream_error",
        message: payload.error?.message ?? "Mid-stream provider error",
        retryable,
      };
      return;
    }

    switch (payload.type) {
      case "content_block_start": {
        const idx: number = payload.index;
        const cb = payload.content_block;
        activeBlocks.set(idx, {
          type: cb.type,
          id: cb.id,
          name: cb.name,
          textBuf: cb.text ?? cb.thinking ?? "",
          jsonBuf: "",
          signatureBuf: cb.signature ?? "",
          redactedData: cb.data,
        });
        if (cb.type === "tool_use") {
          yield { type: "tool_start", index: idx, id: cb.id, name: cb.name };
        }
        break;
      }

      case "content_block_delta": {
        const block = activeBlocks.get(payload.index);
        if (!block) break;
        const delta = payload.delta;

        if (delta.type === "text_delta") {
          block.textBuf += delta.text;
          yield { type: "text_delta", text: delta.text };
        } else if (delta.type === "thinking_delta") {
          block.textBuf += delta.thinking;
          yield { type: "thinking_delta", text: delta.thinking };
        } else if (delta.type === "signature_delta") {
          // Crucial: keep cryptographic signature intact for multi-turn tool loops!
          block.signatureBuf += delta.signature;
        } else if (delta.type === "input_json_delta") {
          block.jsonBuf += delta.partial_json;
        }
        break;
      }

      case "content_block_stop": {
        const block = activeBlocks.get(payload.index);
        if (!block) break;
        activeBlocks.delete(payload.index);

        if (block.type === "text") {
          finishedBlocks.push({ type: "text", text: block.textBuf });
        } else if (block.type === "thinking") {
          finishedBlocks.push({
            type: "thinking",
            thinking: block.textBuf,
            signature: block.signatureBuf,
          });
        } else if (block.type === "redacted_thinking") {
          finishedBlocks.push({ type: "redacted_thinking", data: block.redactedData });
        } else if (block.type === "tool_use") {
          let parsedInput: Record<string, unknown> = {};
          const trimmed = block.jsonBuf.trim();
          if (trimmed.length > 0) {
            try {
              parsedInput = JSON.parse(trimmed);
            } catch {
              // Happens if truncated by max_tokens; let turn_complete inspect stopReason!
              yield {
                type: "stream_error",
                message: `Incomplete tool JSON for '${block.name}' (possible max_tokens truncation).`,
                retryable: false,
              };
              return;
            }
          }
          finishedBlocks.push({
            type: "tool_use",
            id: block.id,
            name: block.name,
            input: parsedInput,
          });
          yield { type: "tool_ready", id: block.id!, name: block.name!, input: parsedInput };
        }
        break;
      }

      case "message_delta": {
        if (payload.delta?.stop_reason) stopReason = payload.delta.stop_reason;
        break;
      }

      case "message_stop": {
        receivedMessageStop = true;
        break;
      }
    }
  }

  if (signal?.aborted) return;

  if (!receivedMessageStop) {
    yield {
      type: "stream_error",
      message: "Stream closed unexpectedly before message_stop (mid-stream disconnect).",
      retryable: true,
    };
    return;
  }

  yield { type: "turn_complete", stopReason, assistantBlocks: finishedBlocks };
}
```

Notice how clean the separation is: `parseSseFrames` knows *nothing* about LLMs, `parseAnthropicStream` knows *nothing* about terminals, and your UI + loop get strongly typed events with zero leaked JSON fragments or broken UTF-8 bytes.

---

## 8. Key Takeaways & Quick Self-Check

- **Streaming fixes perceived latency, timeouts, and cancellation**—cutting wait time from total generation time down to Time-To-First-Token (TTFT) and letting users stop bad runs early.
- **Respect the wire protocol.** Buffer TCP chunks until blank-line SSE boundaries (`\n\n`) and always decode bytes with a stateful UTF-8 streaming decoder.
- **Buffer tool JSON deltas per block index.** Only parse arguments once the block finishes (treating empty strings as `{}`), and always guard `JSON.parse()` against mid-stream truncation.
- **Preserve thinking blocks and signatures verbatim.** Route thinking, visible prose, and tool calls to separate UI surfaces, but send thinking blocks + cryptographic signatures back untouched in multi-turn histories.
- **Detect silent failures explicitly.** Watch for inline SSE `error` events inside `200 OK` responses, verify a terminal event arrived before trusting EOF, and throttle UI redraws to avoid backpressure stalls.

### Quick Self-Check

**1. Why can a streaming LLM request fail *after* the server already returned HTTP `200 OK`?**
<details>
<summary>Show Answer</summary>
In Server-Sent Events (SSE), the HTTP status line and headers are sent immediately when the stream opens—before the model finishes generating tokens. If the backend hits an overload or internal failure mid-generation, it cannot retroactively change the HTTP status code; instead, it emits an inline SSE <code>error</code> event or drops the TCP connection before sending the terminal event.
</details>

**2. A model calls two tools in parallel during a single streamed turn. What bug happens if you accumulate `input_json_delta` fragments into a single `let toolJson = ""` variable?**
<details>
<summary>Show Answer</summary>
If deltas or lifecycles for the two tool calls overlap or aren't reset cleanly per block index, fragments from Tool 1 and Tool 2 concatenate into invalid JSON like <code>{"path":"a.py"}{"path":"b.py"}</code>, causing <code>JSON.parse()</code> to throw. Always key your argument buffers by block <code>index</code> (or <code>item_id</code>).
</details>

**3. Why must you keep `signature` (Anthropic) or `thoughtSignature` (Gemini) untouched when storing streamed thinking blocks in conversation history?**
<details>
<summary>Show Answer</summary>
Providers use those cryptographic/opaque signatures to verify that reasoning blocks passed back in multi-turn tool-use loops actually came from the model and were not tampered with or merged improperly. Stripping, editing, or concatenating them with unsigned blocks causes subsequent API turns to fail validation.
</details>

**4. What happens if your terminal UI runs a full Markdown re-layout synchronously on every single `text_delta` event from a fast 150-token/sec model?**
<details>
<summary>Show Answer</summary>
It creates severe consumer backpressure: the UI thread saturates CPU, the terminal flickers, and pending chunks pile up so user cancellation feels sluggish. The fix is to decouple ingestion from rendering by buffering text deltas and flushing UI redraws on a steady 16–33ms (~30–60 FPS) cadence.
</details>

---

[← 01. Agent Tool-Use Loop](./01-agent-tool-use-loop.md) | [Table of Contents](../README.md) | [03. Tool Schema Design & Structured Outputs →](./03-tool-schema-design-and-structured-outputs.md)
