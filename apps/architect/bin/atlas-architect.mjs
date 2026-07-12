#!/usr/bin/env node
// ATLAS Harness Architect CLI.
//
//   atlas-architect prompt   --intake <file> [--out <file>]
//   atlas-architect generate --intake <file> --out <file> [--model <id>]
//   atlas-architect validate <doc.md>
//
// `prompt` assembles the full authoring prompt for ANY LLM (paste it into
// Claude Code, ChatGPT, DeepSeek...). `generate` calls the Anthropic API
// directly (ANTHROPIC_API_KEY) and validates the result. `validate` checks an
// existing document against the skeleton.

import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { assemblePrompt, loadIntake, systemPrompt, userPrompt } from "../src/assemble.mjs";
import { validateDocument } from "../src/validate.mjs";

const DEFAULT_MODEL = process.env.ATLAS_ARCHITECT_MODEL || "claude-opus-4-8";

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) args[a.slice(2)] = argv[++i];
    else args._.push(a);
  }
  return args;
}

function usage(code = 1) {
  console.error(
    "usage:\n" +
      "  atlas-architect prompt   --intake <file> [--out <file>]\n" +
      "  atlas-architect generate --intake <file> --out <file> [--model <id>]\n" +
      "  atlas-architect validate <doc.md>",
  );
  process.exit(code);
}

async function generate(intakePath, outPath, model) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();

  const intake = loadIntake(intakePath);
  process.stderr.write(`[architect] generating with ${model}...\n`);

  const stream = client.messages.stream({
    model,
    max_tokens: 64000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system: [{ type: "text", text: systemPrompt(), cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userPrompt(intake) }],
  });

  let chars = 0;
  stream.on("text", (delta) => {
    chars += delta.length;
    if (chars % 20000 < delta.length) process.stderr.write(`[architect] ${chars} chars...\n`);
  });

  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") {
    throw new Error("the model declined this request (stop_reason: refusal)");
  }
  if (message.stop_reason === "max_tokens") {
    process.stderr.write("[architect] warning: output hit max_tokens and may be truncated\n");
  }

  const doc = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const report = validateDocument(doc);
  writeFileSync(outPath, doc + "\n");
  process.stderr.write(
    `[architect] wrote ${outPath} (${doc.length} chars, ` +
      `${message.usage.output_tokens} output tokens)\n`,
  );
  printReport(report);
  if (!report.ok) process.exit(2);
}

function printReport({ ok, errors, warnings }) {
  for (const e of errors) console.error(`  ✗ ${e}`);
  for (const w of warnings) console.error(`  ⚠ ${w}`);
  console.error(ok ? "[architect] validation PASSED" : "[architect] validation FAILED");
}

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0];

if (cmd === "prompt") {
  if (!args.intake) usage();
  const prompt = assemblePrompt(args.intake);
  if (args.out) {
    writeFileSync(args.out, prompt);
    console.error(`[architect] wrote ${args.out} (${prompt.length} chars)`);
  } else {
    process.stdout.write(prompt);
  }
} else if (cmd === "generate") {
  if (!args.intake || !args.out) usage();
  generate(args.intake, args.out, args.model || DEFAULT_MODEL).catch((err) => {
    console.error(`[architect] error: ${err.message}`);
    process.exit(1);
  });
} else if (cmd === "validate") {
  const path = args._[1];
  if (!path) usage();
  printReport(validateDocument(readFileSync(path, "utf8")));
} else {
  usage(cmd ? 1 : 0);
}
