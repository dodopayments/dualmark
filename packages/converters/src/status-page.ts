import { cleanBody, fmtDate, joinLines, normalizeUnicode } from "@dualmark/core";
import type { BaseConverterConfig, CollectionEntry, Converter } from "./types.js";

export type StatusPageOverallStatus =
  | "operational"
  | "degraded"
  | "partial-outage"
  | "major-outage";

export interface StatusPageComponent {
  name: string;
  status: string;
  uptime90d?: number;
}

export interface StatusPageIncident {
  title: string;
  date: string;
  resolved: boolean;
  summary: string;
}

export interface StatusPageConverterConfig extends BaseConverterConfig {
  /** Collection URL prefix (e.g. `/status`). Set automatically by framework adapters. */
  basePath?: string;
}

export interface StatusPageEntryData {
  title: string;
  /** Canonical status page URL. When omitted or blank, defaults to `siteUrl + basePath + / + entry.id`. */
  url?: string;
  overall: StatusPageOverallStatus;
  components: StatusPageComponent[];
  incidents?: StatusPageIncident[];
}

type IncidentGroup = "ongoing" | "resolved";

const OVERALL_LABEL: Record<StatusPageOverallStatus, string> = {
  operational: "Operational",
  degraded: "Degraded",
  "partial-outage": "Partial outage",
  "major-outage": "Major outage",
};

const INCIDENT_ORDER: IncidentGroup[] = ["ongoing", "resolved"];
const INCIDENT_HEADING: Record<IncidentGroup, string> = {
  ongoing: "Ongoing incidents",
  resolved: "Resolved incidents",
};

function formatUptime90d(uptime: number): string {
  if (!Number.isFinite(uptime)) return String(uptime);
  return `${uptime.toFixed(2)}%`;
}

function formatIncidentDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return fmtDate(parsed);
}

function sortIncidentsNewestFirst(incidents: StatusPageIncident[]): StatusPageIncident[] {
  return [...incidents].sort((a, b) => {
    const aTime = new Date(a.date).getTime();
    const bTime = new Date(b.date).getTime();
    const aVal = Number.isNaN(aTime) ? -Infinity : aTime;
    const bVal = Number.isNaN(bTime) ? -Infinity : bTime;
    return bVal - aVal;
  });
}

export function statusPageConverter(
  config: StatusPageConverterConfig,
): Converter<CollectionEntry<StatusPageEntryData>> {
  return (entry) => {
    const d = entry.data;
    const overallLabel = OVERALL_LABEL[d.overall];
    const basePathTrim = config.basePath?.replace(/\/$/, "") ?? "";
    const site = config.siteUrl.replace(/\/$/, "");
    const resolvedUrl =
      d.url !== undefined && d.url.trim() !== ""
        ? d.url
        : basePathTrim
          ? `${site}${basePathTrim.startsWith("/") ? basePathTrim : `/${basePathTrim}`}/${entry.id}`
          : `${site}/${entry.id}`;

    const components = d.components.map((component) => {
      const uptime =
        typeof component.uptime90d === "number"
          ? ` (90d uptime ${formatUptime90d(component.uptime90d)})`
          : "";
      return `- **${component.name}**: ${component.status}${uptime}`;
    });

    const incidents = sortIncidentsNewestFirst(d.incidents ?? []);
    const grouped = new Map<IncidentGroup, string[]>();
    for (const incident of incidents) {
      const key: IncidentGroup = incident.resolved ? "resolved" : "ongoing";
      const list = grouped.get(key) ?? [];
      const date = formatIncidentDate(incident.date);
      list.push(`- **${incident.title}** (${date}): ${incident.summary}`);
      grouped.set(key, list);
    }

    let incidentsSection = "\n## Incidents\n\nNo incidents reported.";
    if (incidents.length > 0) {
      const sections: string[] = [];
      for (const key of INCIDENT_ORDER) {
        const items = grouped.get(key);
        if (items && items.length > 0) {
          sections.push(`\n\n### ${INCIDENT_HEADING[key]}\n\n${items.join("\n")}`);
        }
      }
      incidentsSection = `\n## Incidents${sections.join("")}`;
    }

    const md = joinLines(
      `# ${d.title}`,
      `\n> ${overallLabel}\n`,
      `- **Overall**: ${overallLabel}`,
      `- **URL**: ${resolvedUrl}`,
      "\n## Components\n\n" +
        (components.length > 0 ? components.join("\n") : "No components listed."),
      incidentsSection,
      entry.body && "\n---",
      entry.body && `\n${cleanBody(entry.body)}`,
      config.brandFooter && "\n---",
      config.brandFooter && `\n${config.brandFooter}`,
    );

    return normalizeUnicode(md);
  };
}
