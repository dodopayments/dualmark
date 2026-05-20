import { cleanBody, joinLines, normalizeUnicode } from "@dualmark/core";
import type { BaseConverterConfig, CollectionEntry, Converter } from "./types.js";

export interface ApiReferenceConverterConfig extends BaseConverterConfig {
  basePath?: string;
}

export interface ApiReferenceField {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
}

export interface ApiReferenceParameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  type: string;
  required?: boolean;
  description?: string;
}

export interface ApiReferenceMediaType {
  contentType: string;
  schema?: string;
  fields?: ApiReferenceField[];
}

export interface ApiReferenceRequestBody {
  description?: string;
  required?: boolean;
  contents: ApiReferenceMediaType[];
}

export interface ApiReferenceResponse {
  status: string;
  description?: string;
  contents?: ApiReferenceMediaType[];
}

export interface ApiReferenceCodeSample {
  lang: string;
  label?: string;
  source: string;
}

export interface ApiReferenceEntryData {
  title: string;
  summary?: string;
  description?: string;
  method: string;
  path: string;
  pagePath?: string;
  tags?: string[];
  parameters?: ApiReferenceParameter[];
  requestBody?: ApiReferenceRequestBody;
  responses: ApiReferenceResponse[];
  codeSamples?: ApiReferenceCodeSample[];
}

type HttpMethod =
  | "get"
  | "put"
  | "post"
  | "delete"
  | "options"
  | "head"
  | "patch"
  | "trace";

interface OpenAPIReferenceObject {
  $ref: string;
}

interface OpenAPISchemaObject {
  title?: string;
  type?: string | string[];
  format?: string;
  description?: string;
  enum?: unknown[];
  const?: unknown;
  items?: OpenAPISchema;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  oneOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  allOf?: OpenAPISchema[];
  nullable?: boolean;
  additionalProperties?: boolean | OpenAPISchema;
}

type OpenAPISchema = OpenAPISchemaObject | OpenAPIReferenceObject;

interface OpenAPIMediaTypeObject {
  schema?: OpenAPISchema;
}

interface OpenAPIParameterObject {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  description?: string;
  required?: boolean;
  schema?: OpenAPISchema;
  content?: Record<string, OpenAPIMediaTypeObject>;
}

type OpenAPIParameter = OpenAPIParameterObject | OpenAPIReferenceObject;

interface OpenAPIRequestBodyObject {
  description?: string;
  required?: boolean;
  content?: Record<string, OpenAPIMediaTypeObject>;
}

type OpenAPIRequestBody = OpenAPIRequestBodyObject | OpenAPIReferenceObject;

interface OpenAPIResponseObject {
  description?: string;
  content?: Record<string, OpenAPIMediaTypeObject>;
}

type OpenAPIResponse = OpenAPIResponseObject | OpenAPIReferenceObject;

interface OpenAPICodeSampleObject {
  lang?: string;
  language?: string;
  label?: string;
  source?: string;
  sourceString?: string;
  code?: string;
}

interface OpenAPIOperationObject {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<string, OpenAPIResponse>;
  "x-codeSamples"?: OpenAPICodeSampleObject[];
}

interface OpenAPIPathItemObject {
  parameters?: OpenAPIParameter[];
  get?: OpenAPIOperationObject;
  put?: OpenAPIOperationObject;
  post?: OpenAPIOperationObject;
  delete?: OpenAPIOperationObject;
  options?: OpenAPIOperationObject;
  head?: OpenAPIOperationObject;
  patch?: OpenAPIOperationObject;
  trace?: OpenAPIOperationObject;
}

export interface OpenAPIDocument {
  openapi?: string;
  info?: {
    title?: string;
    version?: string;
  };
  paths: Record<string, OpenAPIPathItemObject>;
  components?: {
    schemas?: Record<string, OpenAPISchema>;
    parameters?: Record<string, OpenAPIParameter>;
    requestBodies?: Record<string, OpenAPIRequestBody>;
    responses?: Record<string, OpenAPIResponse>;
  };
}

function isParameterObject(value: unknown): value is OpenAPIParameterObject {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.in === "string" &&
    ["path", "query", "header", "cookie"].includes(value.in)
  );
}

const HTTP_METHODS: HttpMethod[] = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
];

const CODE_BLOCK_LANGUAGE_ALIASES: Record<string, string> = {
  curl: "bash",
  shell: "bash",
  sh: "bash",
  javascript: "ts",
  typescript: "ts",
  node: "ts",
  "node.js": "ts",
  csharp: "csharp",
  "c#": "csharp",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReferenceObject(value: unknown): value is OpenAPIReferenceObject {
  return isRecord(value) && typeof value.$ref === "string";
}

function asSchemaObject(schema: OpenAPISchema | undefined): OpenAPISchemaObject | undefined {
  return schema && !isReferenceObject(schema) ? schema : undefined;
}

function resolveReference(spec: OpenAPIDocument, ref: string): unknown {
  if (!ref.startsWith("#/")) return undefined;
  const segments = ref
    .slice(2)
    .split("/")
    .filter((segment) => segment.length > 0);

  let current: unknown = spec;
  for (const segment of segments) {
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
}

function resolveSchema(
  spec: OpenAPIDocument,
  schema: OpenAPISchema | undefined,
  seenRefs: Set<string> = new Set(),
): OpenAPISchemaObject | undefined {
  if (!schema) return undefined;
  if (!isReferenceObject(schema)) return schema;
  if (seenRefs.has(schema.$ref)) return undefined;
  seenRefs.add(schema.$ref);
  const resolved = resolveReference(spec, schema.$ref);
  if (isReferenceObject(resolved)) {
    return resolveSchema(spec, resolved, seenRefs);
  }
  return isRecord(resolved) ? (resolved as OpenAPISchemaObject) : undefined;
}

function resolveParameter(
  spec: OpenAPIDocument,
  parameter: OpenAPIParameter,
): OpenAPIParameterObject | undefined {
  if (!isReferenceObject(parameter)) return parameter;
  const resolved = resolveReference(spec, parameter.$ref);
  return isParameterObject(resolved) ? resolved : undefined;
}

function resolveRequestBody(
  spec: OpenAPIDocument,
  requestBody: OpenAPIRequestBody | undefined,
): OpenAPIRequestBodyObject | undefined {
  if (!requestBody) return undefined;
  if (!isReferenceObject(requestBody)) return requestBody;
  const resolved = resolveReference(spec, requestBody.$ref);
  return isRecord(resolved) ? (resolved as OpenAPIRequestBodyObject) : undefined;
}

function resolveResponse(
  spec: OpenAPIDocument,
  response: OpenAPIResponse,
): OpenAPIResponseObject | undefined {
  if (!isReferenceObject(response)) return response;
  const resolved = resolveReference(spec, response.$ref);
  return isRecord(resolved) ? (resolved as OpenAPIResponseObject) : undefined;
}

function stringifyEnumValue(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function formatTypeName(type: string, format?: string): string {
  return format ? `${type}(${format})` : type;
}

function renderSchemaSummary(spec: OpenAPIDocument, schema: OpenAPISchema | undefined): string {
  const resolved = resolveSchema(spec, schema);
  if (!resolved) return "unknown";

  if (resolved.allOf && resolved.allOf.length > 0) {
    return resolved.allOf.map((item) => renderSchemaSummary(spec, item)).join(" & ");
  }
  if (resolved.oneOf && resolved.oneOf.length > 0) {
    return `oneOf<${resolved.oneOf.map((item) => renderSchemaSummary(spec, item)).join(" | ")}>`;
  }
  if (resolved.anyOf && resolved.anyOf.length > 0) {
    return `anyOf<${resolved.anyOf.map((item) => renderSchemaSummary(spec, item)).join(" | ")}>`;
  }

  const rawType = resolved.type;
  const typeName = Array.isArray(rawType)
    ? rawType.join(" | ")
    : rawType ?? (resolved.properties ? "object" : resolved.items ? "array" : "unknown");

  let summary = typeName;
  if (typeName === "array") {
    summary = `array<${renderSchemaSummary(spec, resolved.items)}>`;
  } else if (typeName === "object" && resolved.additionalProperties === true) {
    summary = "object<string, unknown>";
  } else if (typeName === "object" && resolved.additionalProperties && resolved.additionalProperties !== true) {
    summary = `object<string, ${renderSchemaSummary(spec, resolved.additionalProperties)}>`;
  } else if (!Array.isArray(rawType) && typeof rawType === "string") {
    summary = formatTypeName(rawType, resolved.format);
  }

  if (resolved.enum && resolved.enum.length > 0) {
    summary += ` enum(${resolved.enum.map(stringifyEnumValue).join(", ")})`;
  } else if (resolved.const !== undefined) {
    summary += ` = ${stringifyEnumValue(resolved.const)}`;
  }

  if (resolved.nullable) {
    summary += " | null";
  }

  return summary;
}

function collectSchemaFields(
  spec: OpenAPIDocument,
  schema: OpenAPISchema | undefined,
  prefix = "",
): ApiReferenceField[] {
  const resolved = resolveSchema(spec, schema);
  if (!resolved) return [];

  if (resolved.allOf && resolved.allOf.length > 0) {
    return resolved.allOf.flatMap((item) => collectSchemaFields(spec, item, prefix));
  }
  if (resolved.oneOf && resolved.oneOf.length > 0) {
    return resolved.oneOf.flatMap((item) => collectSchemaFields(spec, item, prefix));
  }
  if (resolved.anyOf && resolved.anyOf.length > 0) {
    return resolved.anyOf.flatMap((item) => collectSchemaFields(spec, item, prefix));
  }

  if (resolved.type === "array" || resolved.items) {
    const arrayPrefix = prefix ? `${prefix}[]` : "[]";
    return collectSchemaFields(spec, resolved.items, arrayPrefix);
  }

  if (!resolved.properties || Object.keys(resolved.properties).length === 0) {
    return [];
  }

  const requiredFields = new Set(resolved.required ?? []);
  const fields: ApiReferenceField[] = [];
  for (const [propertyName, propertySchema] of Object.entries(resolved.properties)) {
    const fieldName = prefix ? `${prefix}.${propertyName}` : propertyName;
    const childResolved = resolveSchema(spec, propertySchema);
    fields.push({
      name: fieldName,
      type: renderSchemaSummary(spec, propertySchema),
      required: requiredFields.has(propertyName),
      description: childResolved?.description,
    });
    fields.push(...collectSchemaFields(spec, propertySchema, fieldName));
  }

  return fields;
}

function renderFieldsTable(fields: ApiReferenceField[]): string {
  if (fields.length === 0) return "";
  const rows = fields.map((field) => {
    const description = field.description ? field.description.replace(/\n+/g, " ") : "";
    return `| \`${field.name}\` | \`${field.type}\` | ${field.required ? "yes" : "no"} | ${description} |`;
  });
  return [
    "| Field | Type | Required | Description |",
    "| --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}

function renderParametersTable(parameters: ApiReferenceParameter[]): string {
  if (parameters.length === 0) return "";
  const rows = parameters.map((parameter) => {
    const description = parameter.description ? parameter.description.replace(/\n+/g, " ") : "";
    return `| \`${parameter.name}\` | \`${parameter.in}\` | \`${parameter.type}\` | ${parameter.required ? "yes" : "no"} | ${description} |`;
  });
  return [
    "| Name | In | Type | Required | Description |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}

function renderMediaTypeSection(content: ApiReferenceMediaType): string {
  const parts: string[] = [`### \`${content.contentType}\``];
  if (content.schema) {
    parts.push(`- **Schema**: \`${content.schema}\``);
  }
  if (content.fields && content.fields.length > 0) {
    parts.push("\n#### Fields\n");
    parts.push(renderFieldsTable(content.fields));
  }
  return parts.join("\n\n");
}

function renderRequestBodySection(requestBody: ApiReferenceRequestBody): string {
  const parts: string[] = ["## Request body"];
  if (requestBody.description) {
    parts.push(requestBody.description);
  }
  parts.push(`- **Required**: ${requestBody.required ? "yes" : "no"}`);
  for (const content of requestBody.contents) {
    parts.push(renderMediaTypeSection(content));
  }
  return parts.join("\n\n");
}

function renderResponsesSection(responses: ApiReferenceResponse[]): string {
  const parts: string[] = ["## Responses"];
  for (const response of responses) {
    parts.push(`### \`${response.status}\``);
    if (response.description) {
      parts.push(response.description);
    }
    for (const content of response.contents ?? []) {
      parts.push(renderMediaTypeSection(content));
    }
  }
  return parts.join("\n\n");
}

function normalizeCodeBlockLanguage(lang: string): string {
  const normalized = lang.trim().toLowerCase();
  return CODE_BLOCK_LANGUAGE_ALIASES[normalized] ?? normalized.replace(/[^a-z0-9#+-]/g, "");
}

function renderCodeSamplesSection(codeSamples: ApiReferenceCodeSample[]): string {
  const parts: string[] = ["## Code samples"];
  for (const sample of codeSamples) {
    const label = sample.label?.trim() || sample.lang;
    const language = normalizeCodeBlockLanguage(sample.lang);
    parts.push(`### ${label}`);
    parts.push(`\`\`\`${language}\n${sample.source.trim()}\n\`\`\``);
  }
  return parts.join("\n\n");
}

function resolvePageUrl(
  config: ApiReferenceConverterConfig,
  entry: CollectionEntry<ApiReferenceEntryData>,
): string {
  const customPath = entry.data.pagePath?.trim();
  if (customPath) {
    if (/^https?:\/\//.test(customPath)) return customPath;
    return `${config.siteUrl}${customPath.startsWith("/") ? customPath : `/${customPath}`}`;
  }
  const basePath = config.basePath ?? "/api";
  return `${config.siteUrl}${basePath}/${entry.id}`;
}

export function apiReferenceConverter(
  config: ApiReferenceConverterConfig,
): Converter<CollectionEntry<ApiReferenceEntryData>> {
  return (entry) => {
    const data = entry.data;
    const parts: string[] = [];

    parts.push(
      joinLines(
        `# ${data.title}`,
        data.summary && `\n> ${data.summary}`,
        "",
        `- **Method**: \`${data.method.toUpperCase()}\``,
        `- **Path**: \`${data.path}\``,
        `- **URL**: ${resolvePageUrl(config, entry)}`,
        data.tags && data.tags.length > 0 && `- **Tags**: ${data.tags.join(", ")}`,
      ),
    );

    if (data.description) {
      parts.push(`\n${data.description}`);
    }

    if (data.parameters && data.parameters.length > 0) {
      parts.push(`\n## Parameters\n\n${renderParametersTable(data.parameters)}`);
    }

    if (data.requestBody) {
      parts.push(`\n${renderRequestBodySection(data.requestBody)}`);
    }

    parts.push(`\n${renderResponsesSection(data.responses)}`);

    if (data.codeSamples && data.codeSamples.length > 0) {
      parts.push(`\n${renderCodeSamplesSection(data.codeSamples)}`);
    }

    if (entry.body) {
      parts.push(`\n---\n\n${cleanBody(entry.body)}`);
    }

    if (config.brandFooter) {
      parts.push(`\n---\n${config.brandFooter}`);
    }

    return normalizeUnicode(parts.join("\n"));
  };
}

function collectParameters(
  spec: OpenAPIDocument,
  pathItem: OpenAPIPathItemObject,
  operation: OpenAPIOperationObject,
): ApiReferenceParameter[] {
  const merged = new Map<string, OpenAPIParameterObject>();
  for (const candidate of [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])]) {
    const parameter = resolveParameter(spec, candidate);
    if (!parameter) continue;
    merged.set(`${parameter.in}:${parameter.name}`, parameter);
  }

  return [...merged.values()].map((parameter) => {
    const firstContentSchema = parameter.content
      ? Object.values(parameter.content)[0]?.schema
      : undefined;
    return {
      name: parameter.name,
      in: parameter.in,
      type: renderSchemaSummary(spec, parameter.schema ?? firstContentSchema),
      required: parameter.in === "path" ? true : parameter.required ?? false,
      description: parameter.description,
    };
  });
}

function collectMediaTypes(
  spec: OpenAPIDocument,
  content: Record<string, OpenAPIMediaTypeObject> | undefined,
): ApiReferenceMediaType[] {
  if (!content) return [];
  return Object.entries(content).map(([contentType, media]) => {
    const fields = collectSchemaFields(spec, media.schema);
    return {
      contentType,
      schema: renderSchemaSummary(spec, media.schema),
      fields: fields.length > 0 ? fields : undefined,
    };
  });
}

function collectResponses(
  spec: OpenAPIDocument,
  responses: Record<string, OpenAPIResponse> | undefined,
): ApiReferenceResponse[] {
  if (!responses) return [];
  return Object.entries(responses).map(([status, candidate]) => {
    const response = resolveResponse(spec, candidate);
    return {
      status,
      description: response?.description,
      contents: collectMediaTypes(spec, response?.content),
    };
  });
}

function collectCodeSamples(operation: OpenAPIOperationObject): ApiReferenceCodeSample[] | undefined {
  const samples = operation["x-codeSamples"];
  if (!samples || samples.length === 0) return undefined;

  const normalized = samples.flatMap((sample) => {
    const lang = sample.lang ?? sample.language;
    const source = sample.source ?? sample.sourceString ?? sample.code;
    if (!lang || !source) return [];
    return [
      {
        lang,
        label: sample.label,
        source,
      },
    ];
  });

  return normalized.length > 0 ? normalized : undefined;
}

function findOperation(
  spec: OpenAPIDocument,
  operationId: string,
): {
  path: string;
  method: HttpMethod;
  pathItem: OpenAPIPathItemObject;
  operation: OpenAPIOperationObject;
} | undefined {
  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (operation?.operationId === operationId) {
        return { path, method, pathItem, operation };
      }
    }
  }
  return undefined;
}

export function fromOpenAPI(
  spec: OpenAPIDocument,
  operationId: string,
): CollectionEntry<ApiReferenceEntryData> {
  const match = findOperation(spec, operationId);
  if (!match) {
    throw new Error(`OpenAPI operation not found: ${operationId}`);
  }

  const requestBody = resolveRequestBody(spec, match.operation.requestBody);
  const title = match.operation.summary?.trim() || `${match.method.toUpperCase()} ${match.path}`;

  return {
    id: operationId,
    data: {
      title,
      summary: match.operation.summary?.trim(),
      description: match.operation.description?.trim(),
      method: match.method.toUpperCase(),
      path: match.path,
      tags: match.operation.tags,
      parameters: collectParameters(spec, match.pathItem, match.operation),
      requestBody: requestBody
        ? {
            description: requestBody.description,
            required: requestBody.required,
            contents: collectMediaTypes(spec, requestBody.content),
          }
        : undefined,
      responses: collectResponses(spec, match.operation.responses),
      codeSamples: collectCodeSamples(match.operation),
    },
  };
}
