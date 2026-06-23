import { Badge, Card } from "./ui.js";
import { MainFlowCanvas } from "./MainFlowCanvas.js";
import { RecentApiEventsTable } from "./RecentApiEventsTable.js";
import type { FlowDrawerProps, OverlayAction, OverlayApiEvent } from "./types.js";

export function FlowDrawer({ selectedEvent, events, loadError }: FlowDrawerProps): JSX.Element {
  if (loadError) {
    return (
      <div className="anlyx-flow-drawer-body">
        <Card>
          <h3 className="anlyx-ov-section-title">Report data</h3>
          <div className="anlyx-ov-empty">{loadError}</div>
        </Card>
      </div>
    );
  }

  if (!selectedEvent) {
    return (
      <div className="anlyx-flow-drawer-body">
        <Card>
          <h3 className="anlyx-ov-section-title">Waiting</h3>
          <div className="anlyx-ov-empty">
            Use the app normally. Anlyx opens the main flow for requests caused by your direct
            action. Background requests stay in Recent API events until you select them.
          </div>
        </Card>
        <RecentApiEventsTable events={events} selectedEventId={null} />
      </div>
    );
  }

  return (
    <div className="anlyx-flow-drawer-body">
      <CapturedRequest event={selectedEvent} />
      {selectedEvent.matchedEndpoint ? (
        <MainFlowCanvas
          flow={selectedEvent.matchedFlow}
          method={selectedEvent.method}
          path={selectedEvent.path}
          status={selectedEvent.status}
          {...(selectedEvent.matchedEndpoint.confidence
            ? { endpointConfidence: selectedEvent.matchedEndpoint.confidence }
            : {})}
        />
      ) : (
        <Card className="anlyx-unmatched-card">
          <h3>No scanned endpoint matched</h3>
          <p>Anlyx saw this browser request, but no scanned endpoint path matched it.</p>
        </Card>
      )}
      <RecentApiEventsTable events={events} selectedEventId={selectedEvent.id} />
    </div>
  );
}

function CapturedRequest({ event }: { event: OverlayApiEvent }): JSX.Element {
  const matched = Boolean(event.matchedEndpoint);
  return (
    <Card className="anlyx-captured-request">
      <div className="anlyx-captured-request__top">
        <div>
          <h3>Captured request</h3>
          <div className="anlyx-captured-request__path">
            <Badge tone="blue">{event.method}</Badge>
            <strong>{event.path}</strong>
          </div>
        </div>
        <Badge tone={matched ? "green" : "amber"}>{matched ? "matched" : "unmatched"}</Badge>
      </div>
      <div className="anlyx-captured-request__meta">
        {event.matchedEndpoint ? (
          <Badge tone="gray">
            endpoint {event.matchedEndpoint.method} {event.matchedEndpoint.path}
          </Badge>
        ) : null}
        <Badge tone={Number(event.status) >= 400 ? "amber" : "green"}>{getStatusLabel(event.status)}</Badge>
        <Badge tone="gray">{event.durationMs}ms</Badge>
        {event.count && event.count > 1 ? <Badge tone="gray">seen x{event.count}</Badge> : null}
        {event.matchedEndpoint?.confidence ? (
          <Badge tone="green">confidence {event.matchedEndpoint.confidence}</Badge>
        ) : null}
        <Badge tone={event.triggeredBy ? "blue" : "gray"}>
          {event.triggeredBy ? "user action" : event.source === "health" ? "health/background" : "background"}
        </Badge>
      </div>
      <div className="anlyx-captured-request__steps">
        <CapturedStep
          label="Action"
          title={event.triggeredBy ? formatAction(event.triggeredBy) : "No user action captured"}
          detail={event.triggeredBy?.selector ?? "Request may have fired on page load"}
          tone={event.triggeredBy ? "blue" : "amber"}
        />
        <CapturedStep
          label="Request"
          title={`${event.method} ${event.path}`}
          detail={matched ? "Matched scanned endpoint" : "No scanned endpoint matched"}
          tone={matched ? "green" : "amber"}
        />
        <CapturedStep
          label="Result"
          title={getStatusLabel(event.status)}
          detail={`${event.durationMs}ms${event.count && event.count > 1 ? ` · seen x${event.count}` : ""}`}
          tone={Number(event.status) >= 400 ? "amber" : "green"}
        />
      </div>
    </Card>
  );
}

function CapturedStep({
  label,
  title,
  detail,
  tone
}: {
  label: string;
  title: string;
  detail: string;
  tone: "blue" | "green" | "amber";
}): JSX.Element {
  return (
    <div className={`anlyx-captured-step anlyx-captured-step--${tone}`}>
      <span className="anlyx-captured-step__dot" />
      <div>
        <p>{label}</p>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

function formatAction(action: OverlayAction): string {
  return `${action.type ?? "Action"} ${action.label ?? "unnamed element"}`;
}

function getStatusLabel(status: string | number): string {
  const numeric = Number(status);
  if (numeric === 401) {
    return "login required · 401";
  }
  if (numeric === 403) {
    return "permission denied · 403";
  }
  if (numeric >= 500) {
    return `server error · ${status}`;
  }
  if (numeric >= 400) {
    return `client error · ${status}`;
  }
  if (numeric >= 200) {
    return `success · ${status}`;
  }
  return `status ${status}`;
}
