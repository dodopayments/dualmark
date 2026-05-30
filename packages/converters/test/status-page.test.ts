import { describe, it, expect } from "vitest";
import { statusPageConverter } from "../src/index.js";

const convert = statusPageConverter({ siteUrl: "https://acme.test" });

describe("statusPageConverter", () => {
  it("renders a realistic status page snapshot", () => {
    const out = convert({
      id: "acme-cloud",
      data: {
        title: "Acme Cloud Status",
        url: "https://status.acme.test",
        overall: "degraded",
        components: [
          { name: "API", status: "degraded", uptime90d: 99.72 },
          { name: "Edge Network", status: "operational", uptime90d: 99.99 },
          { name: "Web Dashboard", status: "operational" },
          { name: "Billing", status: "partial outage", uptime90d: 98.88 },
        ],
        incidents: [
          {
            title: "Intermittent 5xx responses",
            date: "2026-05-08T14:12:00Z",
            resolved: false,
            summary: "We are investigating elevated error rates on API writes.",
          },
          {
            title: "Scheduled database maintenance",
            date: "2026-05-02T03:00:00Z",
            resolved: true,
            summary: "Maintenance completed; replicas are healthy.",
          },
          {
            title: "Billing webhook delays",
            date: "2026-04-25T21:45:00Z",
            resolved: true,
            summary: "Queue backlog cleared and processing is stable.",
          },
        ],
      },
    });

    expect(out).toMatchSnapshot();
  });

  it("renders minimal entry data (no url, no incidents, no components)", () => {
    const out = convert({
      id: "svc",
      data: {
        title: "Service status",
        overall: "operational",
        components: [],
      },
    });

    expect(out).toMatchSnapshot();
  });

  it("renders components with no incidents (empty incidents array)", () => {
    const out = convert({
      id: "platform",
      data: {
        title: "Platform status",
        url: "https://status.example.com",
        overall: "operational",
        components: [{ name: "API", status: "operational", uptime90d: 99.9 }],
        incidents: [],
      },
    });

    expect(out).toMatchSnapshot();
  });
});
