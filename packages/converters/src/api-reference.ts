import { cleanBody, joinLines, normalizeUnicode } from "@dualmark/core";
import type { BaseConverterConfig, CollectionEntry, Converter } from "./types.js";

export interface ApiReferenceConverterConfig extends BaseConverterConfig {
  basePath?: string;
}

export interface OpenAPISchema {
  type?: string | string[];
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema;
  required?: string[];
  description?: string;
  $ref?: string;
  [key: string]: unknown;
}

export interface OpenAPIParameter {
  name: string;
  in: string;
  required?: boolean;
  schema?: OpenAPISchema;
  description?: string;
  [key: string]: unknown;
}

export interface OpenAPIMediaType {
  schema?: OpenAPISchema;
  [key: string]: unknown;
}

export interface OpenAPIRequestBody {
  description?: string;
  content?: Record<string, OpenAPIMediaType>;
  required?: boolean;
  [key: string]: unknown;
}

export interface OpenAPIResponse {
  description?: string;
  content?: Record<string, OpenAPIMediaType>;
  [key: string]: unknown;
}

export interface OpenAPIOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<string, OpenAPIResponse>;
  "x-codeSamples"?: Array<{ lang: string; source: string; label?: string }>;
  [key: string]: unknown;
}

export interface ApiReferenceEntryData {
  title: string;
  summary?: string;
  description?: string;
  method: string;
  path: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<string, OpenAPIResponse>;
  codeSamples?: Array<{ lang: string; source: string; label?: string }>;
}

export function apiReferenceConverter(
  config: ApiReferenceConverterConfig,
): Converter<CollectionEntry<ApiReferenceEntryData>> {
  const basePath = config.basePath ?? "/docs";
  return (entry) => {
    const d = entry.data;

    const parts: string[] = [`# ${d.title}`];
    if (d.summary) {
      parts.push(`\n> ${d.summary}`);
    }

    parts.push("");
    parts.push(`- **Method**: ${d.method.toUpperCase()}`);
    parts.push(`- **Path**: \`${d.path}\``);
    parts.push(`- **URL**: ${config.siteUrl}${basePath}/${entry.id}`);

    if (d.description) {
      parts.push(`\n${d.description}`);
    }

    if (d.parameters && d.parameters.length > 0) {
      parts.push("\n## Parameters\n");
      parts.push("| Name | In | Type | Required | Description |");
      parts.push("| --- | --- | --- | --- | --- |");
      for (const p of d.parameters) {
        const typeStr = formatSchemaType(p.schema);
        const reqStr = p.required ? "Yes" : "No";
        const desc = p.description ? p.description.replace(/\n/g, " ") : "";
        parts.push(`| \`${escapeCell(p.name)}\` | ${escapeCell(p.in)} | ${escapeCell(typeStr)} | ${reqStr} | ${escapeCell(desc)} |`);
      }
    }

    if (d.requestBody) {
      parts.push("\n## Request Body\n");
      parts.push(formatRequestBody(d.requestBody));
    }

    if (d.responses && Object.keys(d.responses).length > 0) {
      parts.push("\n## Responses\n");
      parts.push(formatResponses(d.responses));
    }

    if (d.codeSamples && d.codeSamples.length > 0) {
      parts.push("\n## Code Samples\n");
      for (const cs of d.codeSamples) {
        if (cs.label) parts.push(`### ${cs.label}`);
        parts.push("```" + cs.lang);
        parts.push(cs.source);
        parts.push("```");
      }
    }

    const md = joinLines(
      ...parts,
      entry.body && "\n---",
      entry.body && `\n${cleanBody(entry.body)}`,
      config.brandFooter && "\n---",
      config.brandFooter && `\n${config.brandFooter}`,
    );
    return normalizeUnicode(md);
  };
}

function escapeCell(val?: string): string {
  return val ? String(val).replace(/\|/g, "\\|") : "";
}

function formatSchemaType(schema?: OpenAPISchema): string {
  if (!schema) return "Any";
  if (schema.$ref && typeof schema.$ref === "string") return `\`${schema.$ref}\``;
  let t = schema.type;
  if (Array.isArray(t)) {
    // OpenAPI 3.1 nullable
    t = t.join(" | ");
  }
  return t ? `\`${t}\`` : "Any";
}

interface FlattenedField {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

function flattenSchema(schema?: OpenAPISchema, prefix = ""): FlattenedField[] {
  if (!schema) return [];
  if (schema.$ref && typeof schema.$ref === "string") return [];

  const fields: FlattenedField[] = [];
  if (schema.type === "object" && schema.properties) {
    const reqSet = new Set(schema.required || []);
    for (const [key, prop] of Object.entries(schema.properties)) {
      const propName = prefix ? `${prefix}.${key}` : key;
      const typeStr = formatSchemaType(prop);
      fields.push({
        name: propName,
        type: typeStr,
        required: reqSet.has(key),
        description: prop.description ? prop.description.replace(/\n/g, " ") : "",
      });
      // recurse
      if (prop.type === "object" && prop.properties) {
        fields.push(...flattenSchema(prop, propName));
      } else if (prop.type === "array" && prop.items && typeof prop.items === "object") {
        if (prop.items.type === "object" && prop.items.properties) {
          fields.push(...flattenSchema(prop.items, `${propName}[]`));
        }
      }
    }
  } else if (schema.type === "array" && schema.items && typeof schema.items === "object") {
    if (schema.items.type === "object" && schema.items.properties) {
      fields.push(...flattenSchema(schema.items, `${prefix ? prefix + "[]" : "[]"}`));
    }
  }
  return fields;
}

function formatRequestBody(reqBody: OpenAPIRequestBody): string {
  let out = "";
  if (reqBody.description) {
    out += reqBody.description + "\n\n";
  }
  if (reqBody.content) {
    for (const [mediaType, media] of Object.entries(reqBody.content)) {
      out += `**Content-Type**: \`${mediaType}\`\n\n`;
      if (media.schema) {
        const fields = flattenSchema(media.schema);
        if (fields.length > 0) {
          out += "| Name | Type | Required | Description |\n";
          out += "| --- | --- | --- | --- |\n";
          for (const f of fields) {
            const reqStr = f.required ? "Yes" : "No";
            out += `| \`${escapeCell(f.name)}\` | ${escapeCell(f.type)} | ${reqStr} | ${escapeCell(f.description)} |\n`;
          }
          out += "\n";
        }
      }
    }
  }
  return out.trim();
}

function formatResponses(responses: Record<string, OpenAPIResponse>): string {
  let out = "";
  for (const [code, info] of Object.entries(responses)) {
    out += `### ${code}\n\n`;
    if (info.description) {
      out += `${info.description}\n\n`;
    }
    if (info.content) {
      for (const [mediaType, media] of Object.entries(info.content)) {
        out += `**Content-Type**: \`${mediaType}\`\n\n`;
        if (media.schema) {
          const fields = flattenSchema(media.schema);
          if (fields.length > 0) {
            out += "| Name | Type | Required | Description |\n";
            out += "| --- | --- | --- | --- |\n";
            for (const f of fields) {
              const reqStr = f.required ? "Yes" : "No";
              out += `| \`${escapeCell(f.name)}\` | ${escapeCell(f.type)} | ${reqStr} | ${escapeCell(f.description)} |\n`;
            }
            out += "\n";
          }
        }
      }
    }
  }
  return out.trim();
}

export function fromOpenAPI(spec: any, operationId: string): CollectionEntry<ApiReferenceEntryData> {
  if (!spec || !spec.paths) throw new Error("Dualmark: Invalid OpenAPI spec");

  const allOps: string[] = [];
  let foundPath: string | null = null;
  let foundMethod: string | null = null;
  let foundOp: OpenAPIOperation | null = null;
  let foundPathItem: any = null;

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(pathItem as any)) {
      if (
        typeof operation === "object" &&
        operation !== null &&
        "operationId" in operation &&
        typeof (operation as any).operationId === "string"
      ) {
        allOps.push((operation as any).operationId);
        if ((operation as any).operationId === operationId) {
          foundPath = path;
          foundMethod = method;
          foundOp = operation as OpenAPIOperation;
          foundPathItem = pathItem;
        }
      }
    }
  }

  if (!foundOp) {
    throw new Error(
      `Dualmark: operationId '${operationId}' not found. Available ids: ${allOps.join(", ")}`,
    );
  }

  const resolveRef = (obj: any, seen = new Set<string>()): any => {
    if (!obj || typeof obj !== "object") return obj;
    if (obj.$ref && typeof obj.$ref === "string") {
      if (seen.has(obj.$ref)) {
        return { $ref: obj.$ref }; // Stop circular recursion
      }
      seen.add(obj.$ref);
      let target = spec;
      const parts = obj.$ref.replace(/^#\//, "").split("/");
      for (const part of parts) {
        if (target && part in target) {
          target = target[part];
        } else {
          target = undefined;
          break;
        }
      }
      return target ? resolveRef(target, new Set(seen)) : obj;
    }
    const resolved: any = Array.isArray(obj) ? [] : {};
    for (const [k, v] of Object.entries(obj)) {
      resolved[k] = resolveRef(v, new Set(seen));
    }
    return resolved;
  };

  const pathParams = Array.isArray(foundPathItem.parameters)
    ? foundPathItem.parameters.map((p: any) => resolveRef(p))
    : [];
  const opParams = Array.isArray(foundOp.parameters)
    ? foundOp.parameters.map((p: any) => resolveRef(p))
    : [];

  const mergedParams = [...pathParams];
  for (const p of opParams) {
    const idx = mergedParams.findIndex((x) => x.name === p.name && x.in === p.in);
    if (idx >= 0) mergedParams[idx] = p;
    else mergedParams.push(p);
  }

  return {
    id: operationId,
    data: {
      title: foundOp.summary || operationId,
      summary: foundOp.summary !== (foundOp.summary || operationId) ? foundOp.summary : undefined,
      description: foundOp.description,
      method: foundMethod as string,
      path: foundPath as string,
      tags: foundOp.tags,
      parameters: mergedParams.length > 0 ? mergedParams : undefined,
      requestBody: resolveRef(foundOp.requestBody),
      responses: resolveRef(foundOp.responses),
      codeSamples: foundOp["x-codeSamples"] || [],
    },
  };
}
