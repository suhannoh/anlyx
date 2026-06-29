import { useMemo, useState } from "react";

import { Badge, Table } from "./ui.js";
import type { OverlayApiEvent } from "./types.js";

export function RecentApiEventsTable({
  events,
  selectedEventId
}: {
  events: OverlayApiEvent[];
  selectedEventId?: string | null;
}): JSX.Element {
  const [filter, setFilter] = useState<"action" | "background" | "all">("action");
  const actionEvents = useMemo(
    () => events.filter((event) => Boolean(event.triggeredBy)),
    [events]
  );
  const backgroundEvents = useMemo(() => events.filter((event) => !event.triggeredBy), [events]);
  const visibleEvents =
    filter === "action" ? actionEvents : filter === "background" ? backgroundEvents : events;
  const emptyText =
    filter === "action"
      ? "No user-action API requests yet."
      : filter === "background"
        ? "No background API requests observed."
        : "No API events observed yet.";

  return (
    <section className="anlyx-events-table-section">
      <div className="anlyx-events-table-head">
        <div>
          <h3>Recent API events</h3>
          <p>Action requests are primary. Background traffic stays quiet until selected.</p>
        </div>
        <div className="anlyx-events-filter" role="tablist" aria-label="Filter API events">
          <button
            aria-selected={filter === "action"}
            type="button"
            onClick={() => setFilter("action")}
          >
            Actions <span>{actionEvents.length}</span>
          </button>
          <button
            aria-selected={filter === "background"}
            type="button"
            onClick={() => setFilter("background")}
          >
            Background <span>{backgroundEvents.length}</span>
          </button>
          <button aria-selected={filter === "all"} type="button" onClick={() => setFilter("all")}>
            All <span>{events.length}</span>
          </button>
        </div>
      </div>
      {visibleEvents.length === 0 ? (
        <div className="anlyx-ov-empty">{emptyText}</div>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Path</th>
              <th>Status</th>
              <th>Match</th>
              <th>Source</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {visibleEvents.slice(0, 6).map((event) => (
              <tr
                key={event.id}
                className={event.id === selectedEventId ? "anlyx-events-table-row--selected" : ""}
                data-event-id={event.id}
                tabIndex={0}
                title="Inspect this API event"
              >
                <td>
                  <Badge tone="blue">{event.method}</Badge>
                </td>
                <td className="anlyx-events-table-path">{event.path}</td>
                <td>
                  <Badge tone={Number(event.status) >= 400 ? "amber" : "green"}>
                    {event.status}
                  </Badge>
                </td>
                <td>
                  <Badge tone={event.matchedEndpoint ? "green" : "amber"}>
                    {event.matchedEndpoint ? "matched" : "unmatched"}
                  </Badge>
                </td>
                <td>
                  <Badge tone={event.triggeredBy ? "blue" : "gray"}>
                    {event.triggeredBy
                      ? "action"
                      : event.source === "health"
                        ? "health"
                        : "background"}
                  </Badge>
                </td>
                <td>{event.durationMs}ms</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </section>
  );
}
