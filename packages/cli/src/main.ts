import { verifyUrl, formatTextReport, formatJsonReportV1 } from "./verify.js";

interface ParsedArgs {
  command: "verify" | "help" | "version";
  url?: string;
  json?: boolean;
  quiet?: boolean;
  colorMode?: "on" | "off";
  skipNegotiation?: boolean;
  timeoutMs?: number;
}

function parseArgs(argv: ReadonlyArray<string>): ParsedArgs {
  const args = argv.slice(2);
  if (args.length === 0 || args[0] === "help" || args[0] === "--help" || args[0] === "-h") {
    return { command: "help" };
  }
  if (args[0] === "--version" || args[0] === "-v" || args[0] === "version") {
    return { command: "version" };
  }
  if (args[0] !== "verify") {
    return { command: "help" };
  }
  if (args.slice(1).some((a) => a === "--help" || a === "-h" || a === "help")) {
    return { command: "help" };
  }
  let url: string | undefined;
  let json = false;
  let quiet = false;
  let colorMode: "on" | "off" | undefined;
  let skipNegotiation = false;
  let timeoutMs: number | undefined;
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === "--json") {
      json = true;
    } else if (a === "--quiet") {
      quiet = true;
    } else if (a === "--color") {
      colorMode = "on";
    } else if (a === "--no-color") {
      colorMode = "off";
    } else if (a === "--skip-negotiation") {
      skipNegotiation = true;
    } else if (a === "--timeout") {
      const next = args[i + 1];
      if (next) {
        timeoutMs = Number.parseInt(next, 10);
        i++;
      }
    } else if (a && !a.startsWith("-")) {
      url = a;
    }
  }
  return { command: "verify", url, json, quiet, colorMode, skipNegotiation, timeoutMs };
}

function printHelp(): void {
  process.stdout.write(
    [
      "dualmark — AEO conformance test runner",
      "",
      "Usage:",
      "  dualmark verify <url> [--json] [--quiet] [--color|--no-color] [--skip-negotiation] [--timeout <ms>]",
      "  dualmark version",
      "  dualmark help",
      "",
      "Examples:",
      "  dualmark verify https://example.com/blog/hello",
      "  dualmark verify https://example.com/blog/hello.md --skip-negotiation",
      "  dualmark verify https://example.com --json",
      "",
      "Exit codes:",
      "  0  pass (score >= 80% of max)",
      "  1  fail (score below threshold or required check failure)",
      "  2  CLI usage error",
      "",
    ].join("\n"),
  );
}

export async function main(argv: ReadonlyArray<string>): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.command === "help") {
    printHelp();
    return 0;
  }
  if (parsed.command === "version") {
    process.stdout.write("0.1.0\n");
    return 0;
  }
  if (!parsed.url) {
    process.stderr.write("error: missing <url>\n\n");
    printHelp();
    return 2;
  }

  try {
    new URL(parsed.url);
  } catch {
    process.stderr.write(`error: invalid URL: ${parsed.url}\n`);
    return 2;
  }

  if (parsed.json && (parsed.quiet || parsed.colorMode === "on")) {
    process.stderr.write("error: --json cannot be combined with --quiet or color flags\n");
    return 2;
  }

  const report = await verifyUrl(parsed.url, {
    skipNegotiation: parsed.skipNegotiation,
    timeoutMs: parsed.timeoutMs,
  });

  const ratio = report.maxScore > 0 ? report.score / report.maxScore : 0;
  const hasRequiredFailures = report.failed.some((check) => check.severity === "required");
  const exitCode = ratio >= 0.8 && !hasRequiredFailures ? 0 : 1;

  if (parsed.json) {
    process.stdout.write(JSON.stringify(formatJsonReportV1(report), null, 2) + "\n");
  } else if (!parsed.quiet || exitCode !== 0) {
    process.stdout.write(formatTextReport(report) + "\n");
  } else {
    // Quiet mode suppresses successful reports.
  }

  return exitCode;
}
