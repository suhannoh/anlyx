import { Badge, Card } from "./ui.js";
import { MainFlowCanvas } from "./MainFlowCanvas.js";
import { RecentApiEventsTable } from "./RecentApiEventsTable.js";
import type { FlowDrawerProps, OverlayAction, OverlayApiEvent } from "./types.js";

export function FlowDrawer({
  selectedEvent,
  events,
  latestAction,
  loadError
}: FlowDrawerProps): JSX.Element {
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
        {latestAction ? <NoPrimaryRequest latestAction={latestAction} /> : <WaitingForAction />}
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

function WaitingForAction(): JSX.Element {
  return (
    <Card>
      <h3 className="anlyx-ov-section-title">Waiting</h3>
      <div className="anlyx-ov-empty">
        Use the app normally. Anlyx opens the main flow for requests caused by your direct action.
        Background requests stay in Recent API events until you select them.
      </div>
    </Card>
  );
}

function NoPrimaryRequest({ latestAction }: { latestAction: OverlayAction }): JSX.Element {
  return (
    <Card className="anlyx-no-primary-card">
      <div>
        <Badge tone="amber">No primary API captured</Badge>
        <h3>{formatAction(latestAction)}</h3>
        <p>{latestAction.selector ?? "No stable selector captured"}</p>
      </div>
      <div className="anlyx-no-primary-card__note">
        Only background account/auth checks were observed. They stay in Recent API events and do
        not replace the main flow.
      </div>
    </Card>
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
      <div className="anlyx-captured-request__summary">
        <span>
          <b>{event.matchedEndpoint ? "endpoint" : "browser"}</b>{" "}
          {event.matchedEndpoint ? `${event.matchedEndpoint.method} ${event.matchedEndpoint.path}` : event.path}
        </span>
        <span>
          <b>{getStatusLabel(event.status)}</b>
        </span>
        <span>{event.durationMs}ms{event.count && event.count > 1 ? ` · seen x${event.count}` : ""}</span>
        {event.matchedEndpoint?.confidence ? <span>confidence {event.matchedEndpoint.confidence}</span> : null}
        <span>{event.triggeredBy ? "user action" : event.source === "health" ? "health/background" : "background"}</span>
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
