import Anthropic from "@anthropic-ai/sdk";
import { requireSupabaseAdmin, TABLES } from "@/lib/supabase";
import { buildSystemPrompt } from "@/lib/chat/system-prompt";
import { req, ORG_ID, WORKSPACE_ID, requireAutomationId, kognitosRunUrl } from "@/lib/kognitos";
import { normalizeRun, stateLabel } from "@/lib/transforms";
import type { RawRun } from "@/lib/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const TOOLS: Anthropic.Tool[] = [
  {
    name: "list_runs",
    description:
      "List recent claim processing batches with their status, patient count, and total charges. Returns the most recent 20 batches by default.",
    input_schema: {
      type: "object" as const,
      properties: {
        page_size: {
          type: "number",
          description: "Number of batches to return (max 50)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_run",
    description:
      "Get full details for a specific claim processing batch, including patient information, email delivery status, CMS-1450 claim data, and PDF files.",
    input_schema: {
      type: "object" as const,
      properties: {
        run_id: {
          type: "string",
          description: "The batch/run ID to look up",
        },
      },
      required: ["run_id"],
    },
  },
  {
    name: "get_automation",
    description:
      "Get information about the Provider Claims Processor automation including its code, connections, and configuration.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  const AUTOMATION_ID = requireAutomationId();
  const prefix = `/organizations/${ORG_ID}/workspaces/${WORKSPACE_ID}/automations/${AUTOMATION_ID}`;

  switch (name) {
    case "list_runs": {
      const pageSize = (input.page_size as number) || 20;
      const res = await req(`${prefix}/runs?pageSize=${pageSize}`);
      if (!res.ok) return `API error: ${res.status}`;
      const data = await res.json();
      const rawRuns: RawRun[] = data.runs ?? [];
      const runs = rawRuns.map((r) => {
        const runId = r.name.split("/").pop()!;
        const normalized = normalizeRun(r, kognitosRunUrl(runId));
        return {
          id: normalized.id,
          status: stateLabel(normalized.state),
          patients: normalized.patients.length,
          totalCharges: normalized.patients.reduce((s, p) => s + p.totalCharges, 0),
          createdAt: normalized.createdAt,
          emailRecipient: normalized.emailRecipient,
        };
      });
      return JSON.stringify(runs, null, 2);
    }

    case "get_run": {
      const runId = input.run_id as string;
      const res = await req(`${prefix}/runs/${runId}`);
      if (!res.ok) return `API error: ${res.status}`;
      const raw: RawRun = await res.json();
      const run = normalizeRun(raw, kognitosRunUrl(runId));
      return JSON.stringify(
        {
          id: run.id,
          status: stateLabel(run.state),
          createdAt: run.createdAt,
          patients: run.patients,
          emailStatuses: run.emailStatuses,
          pdfCount: run.pdfCount,
          totalCharges: run.patients.reduce((s, p) => s + p.totalCharges, 0),
        },
        null,
        2
      );
    }

    case "get_automation": {
      const res = await req(prefix);
      if (!res.ok) return `API error: ${res.status}`;
      const data = await res.json();
      return JSON.stringify(
        {
          display_name: data.display_name,
          english_code: data.english_code,
          connections: data.connections,
          input_specs: data.input_specs,
        },
        null,
        2
      );
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

export async function POST(request: Request) {
  const { sessionId, message } = await request.json();

  if (!sessionId || !message) {
    return new Response(
      JSON.stringify({ error: "sessionId and message are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  await requireSupabaseAdmin().from(TABLES.messages).insert({
    session_id: sessionId,
    role: "user",
    content: message,
  });

  const { data: history } = await requireSupabaseAdmin()
    .from(TABLES.messages)
    .select("role, content, tool_call")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const filtered = (history ?? []).map((m) => ({
    role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
    content: m.content as string,
  }));

  const merged: Anthropic.MessageParam[] = [];
  for (const msg of filtered) {
    const last = merged[merged.length - 1];
    if (last && last.role === msg.role) {
      last.content = (last.content as string) + "\n\n" + msg.content;
    } else {
      merged.push({ ...msg });
    }
  }

  const systemPrompt = await buildSystemPrompt();

  const encoder = new TextEncoder();
  const sseStream = new ReadableStream({
    async start(controller) {
      let streamClosed = false;
      const send = (data: Record<string, unknown>) => {
        if (streamClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          streamClosed = true;
        }
      };

      try {
        let currentMessages = merged;
        let fullResponse = "";
        let iteration = 0;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (iteration > 0 && fullResponse.length > 0) {
            fullResponse += "\n\n";
            send({ type: "text", content: "\n\n" });
          }

          const stream = anthropic.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: systemPrompt,
            tools: TOOLS,
            messages: currentMessages,
          });

          stream.on("text", (text) => {
            fullResponse += text;
            send({ type: "text", content: text });
          });

          const finalMessage = await stream.finalMessage();

          const toolBlocks = finalMessage.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
          );

          if (toolBlocks.length === 0) break;

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of toolBlocks) {
            send({ type: "tool_use", name: block.name, input: block.input as Record<string, unknown> });

            let result: string;
            try {
              result = await executeTool(block.name, block.input as Record<string, unknown>);
            } catch (e) {
              result = `Tool error: ${e instanceof Error ? e.message : "Unknown error"}`;
            }

            send({ type: "tool_result", name: block.name, result: result.slice(0, 200) });
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
          }

          currentMessages = [
            ...currentMessages,
            { role: "assistant", content: finalMessage.content },
            { role: "user", content: toolResults },
          ];
          iteration++;
        }

        await requireSupabaseAdmin().from(TABLES.messages).insert({
          session_id: sessionId,
          role: "assistant",
          content: fullResponse || "",
        });

        const { count } = await requireSupabaseAdmin()
          .from(TABLES.messages)
          .select("id", { count: "exact", head: true })
          .eq("session_id", sessionId);

        const isFirstExchange = count !== null && count <= 2;

        const titlePromise = isFirstExchange
          ? anthropic.messages
              .create({
                model: "claude-sonnet-4-20250514",
                max_tokens: 30,
                messages: [
                  {
                    role: "user",
                    content: `Generate a short title (max 6 words) for a chat that starts with this message. Return ONLY the title, no quotes or punctuation.\n\nUser message: ${message}`,
                  },
                ],
              })
              .then((r) => {
                const block = r.content[0];
                return block.type === "text" ? block.text.trim() : message.slice(0, 60);
              })
              .catch(() => message.slice(0, 60))
          : null;

        const updateFields: Record<string, string> = {
          updated_at: new Date().toISOString(),
        };

        if (titlePromise) {
          updateFields.title = await titlePromise;
        }

        await requireSupabaseAdmin()
          .from(TABLES.sessions)
          .update(updateFields)
          .eq("id", sessionId);

        send({ type: "done" });
        controller.close();
      } catch (err) {
        console.error("[chat] Stream error:", err);
        try {
          send({ type: "error", content: err instanceof Error ? err.message : "Unknown error" });
        } catch { /* controller already closed */ }
        controller.close();
      }
    },
  });

  return new Response(sseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
