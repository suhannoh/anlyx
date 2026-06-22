import { Badge, Table } from "./ui.js";
import type { OverlayApiEvent } from "./types.js";

export function RecentApiEventsTable({
  events
}: {
  events: OverlayApiEvent[];
}): JSX.Element {
  return (
    <section className="anlyx-events-table-section">
      <div className="anlyx-events-table-head">
        <h3>Recent API events</h3>
      </div>
      {events.length === 0 ? (
        <div className="anlyx-ov-empty">No API events observed yet.</div>
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
            {events.slice(0, 6).map((event) => (
              <tr key={event.id} data-event-id={event.id} tabIndex={0} title="Inspect this API event">
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
                    {event.triggeredBy ? "action" : event.source === "health" ? "health" : "background"}
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
