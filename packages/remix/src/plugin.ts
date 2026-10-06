import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import type { Plugin } from "vite";
import { resolveConfig } from "./config-validation.js";
import { createRouteSpecs, GENERATED_MARKER, type GeneratedRouteSpec } from "./routes.js";
import type { DualmarkRemixConfig } from "./types.js";

export type DualmarkRemixPlugin = Plugin;

function toPosixPath(pathname: string): string {
  return pathname.split(sep).join("/");
}

function stripImportExtension(specifier: string): string {
  return specifier.replace(/\.(c|m)?(t|j)sx?$/, "");
}

function importSpecifier(fromFile: string, targetFile: string): string {
  const fromDir = dirname(fromFile);
  let specifier = toPosixPath(relative(fromDir, targetFile));
  if (!specifier.startsWith(".")) specifier = `./${specifier}`;
  return stripImportExtension(specifier);
}

function writeGeneratedFile(filePath: string, source: string): void {
  if (existsSync(filePath)) {
    const current = readFileSync(filePath, "utf8");
    if (!current.startsWith(GENERATED_MARKER)) {
      throw new Error(`[@dualmark/remix] Refusing to overwrite user-authored route file: ${filePath}`);
    }
  }
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, source, "utf8");
}

function collectGeneratedRouteFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const generated: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      generated.push(...collectGeneratedRouteFiles(entryPath));
      continue;
    }
    if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".js")) continue;
    if (readFileSync(entryPath, "utf8").startsWith(GENERATED_MARKER)) {
      generated.push(entryPath);
    }
  }
  return generated;
}

function removeStaleGeneratedFiles(dir: string, activeFiles: ReadonlySet<string>): void {
  for (const filePath of collectGeneratedRouteFiles(dir)) {
    if (!activeFiles.has(filePath)) rmSync(filePath);
  }
}

export function generateDualmarkRoutes(
  input: DualmarkRemixConfig,
  projectRoot: string,
): readonly GeneratedRouteSpec[] {
  const resolved = resolveConfig(input);
  const generatedDir = resolve(projectRoot, resolved.generatedDir);
  const configPath = resolve(projectRoot, resolved.configPath);
  const configImport = importSpecifier(join(generatedDir, "__generated__.ts"), configPath);
  const specs = createRouteSpecs(input, configImport);
  const activeFiles = new Set(specs.map((spec) => join(generatedDir, spec.fileName)));
  removeStaleGeneratedFiles(generatedDir, activeFiles);
  for (const spec of specs) {
    writeGeneratedFile(join(generatedDir, spec.fileName), spec.source);
  }
  return specs;
}

export function dualmarkRemix(input: DualmarkRemixConfig): DualmarkRemixPlugin {
  let projectRoot = process.cwd();
  return {
    name: "@dualmark/remix",
    enforce: "pre",
    config(config) {
      projectRoot = resolve(process.cwd(), config.root ?? ".");
      generateDualmarkRoutes(input, projectRoot);
    },
    configResolved(config) {
      projectRoot = config.root;
    },
    buildStart() {
      generateDualmarkRoutes(input, projectRoot);
    },
  };
}
