import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { investigatorInstructions } from "./prompts.mjs";
import { publicScenario, scenarios } from "./scenarios.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function runLiveAgent(scenario, options = {}) {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for a live run. Use `npm run evaluate:replay` for credential-free verification.");

  const model = options.model ?? process.env.OPENAI_MODEL ?? "gpt-5.6-luna";
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const visible = publicScenario(scenario);
  const trace = [];
  let previousResponseId;
  let input = `Investigate ${scenario.id}: ${scenario.title}. Alert: ${scenario.symptom}. Begin by inspecting the available telemetry.`;

  for (let turn = 0; turn < 10; turn += 1) {
    const body = {
      model,
      instructions: investigatorInstructions,
      input,
      previous_response_id: previousResponseId,
      tools: toolDefinitions,
      store: false,
    };
    if (!previousResponseId) delete body.previous_response_id;
    trace.push({ at: new Date().toISOString(), type: "model_input", turn, body: redactBody(body) });

    const response = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Responses API ${response.status}: ${await response.text()}`);
    const payload = await response.json();
    previousResponseId = payload.id;
    trace.push({ at: new Date().toISOString(), type: "model_output", turn, id: payload.id, output: payload.output, usage: payload.usage });

    const calls = (payload.output ?? []).filter((item) => item.type === "function_call");
    if (calls.length === 0) {
      const finalText = extractText(payload);
      return { finalText, trace, usage: payload.usage, model };
    }

    input = calls.map((call) => {
      const args = safeJson(call.arguments);
      const output = executeTool(call.name, args, visible);
      trace.push({ at: new Date().toISOString(), type: "tool_result", turn, callId: call.call_id, name: call.name, arguments: args, output });
      return { type: "function_call_output", call_id: call.call_id, output: JSON.stringify(output) };
    });
  }
  throw new Error("Live agent exceeded the 10-turn safety limit.");
}

export async function runFeaturedLive() {
  const result = await runLiveAgent(scenarios[0]);
  const dir = path.join(root, "artifacts", "trajectories");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${scenarios[0].id.toLowerCase()}-live.jsonl`);
  await writeFile(file, `${result.trace.map((item, index) => JSON.stringify({ sequence: index + 1, ...item })).join("\n")}\n`);
  console.log(result.finalText);
  console.log(`\nTrajectory: ${path.relative(root, file)}`);
}

const toolDefinitions = [
  tool("inventory_telemetry", "List services, topology, and available evidence types.", {}),
  tool("query_metrics", "Compare anomaly timing and error rates across candidate services.", { service: stringProperty("Optional service filter") }, ["service"]),
  tool("query_logs", "Search incident-window logs for a service or phrase.", { query: stringProperty("Service or search phrase") }, ["query"]),
  tool("inspect_trace", "Inspect the representative failing distributed trace.", {}),
  tool("inspect_changes", "List changes near the incident start time.", {}),
  tool("get_allowed_actions", "List the recovery actions permitted in this incident sandbox.", {}),
];

function executeTool(name, args, scenario) {
  if (name === "inventory_telemetry") return { topology: scenario.topology, services: scenario.candidates.map((item) => item.service), sources: ["metrics", "logs", "traces", "changes", "action catalog"] };
  if (name === "query_metrics") return scenario.candidates.filter((item) => !args.service || item.service === args.service);
  if (name === "query_logs") return scenario.logs.filter((line) => line.toLowerCase().includes(String(args.query).toLowerCase()) || scenario.candidates.some((item) => String(args.query).includes(item.service)));
  if (name === "inspect_trace") return scenario.trace;
  if (name === "inspect_changes") return scenario.changes;
  if (name === "get_allowed_actions") return scenario.allowedActions.map((action, index) => ({ id: `A-${index + 1}`, action, requiresApproval: true, mode: "sandbox" }));
  return { error: `Unknown tool ${name}` };
}

function tool(name, description, properties, required = []) {
  return { type: "function", name, description, strict: true, parameters: { type: "object", properties, required, additionalProperties: false } };
}
function stringProperty(description) { return { type: ["string", "null"], description }; }
function safeJson(value) { try { return JSON.parse(value || "{}"); } catch { return {}; } }
function extractText(payload) { return payload.output_text ?? (payload.output ?? []).flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text ?? ""; }
function redactBody(body) { return { ...body, input: typeof body.input === "string" ? body.input : body.input }; }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runFeaturedLive().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
