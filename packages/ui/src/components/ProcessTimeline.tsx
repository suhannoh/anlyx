import type { EndpointFlow } from "@anlyx/core";

import type { ReplayStep } from "../replay/build-replay-steps.js";
import type { ReplayLiteState } from "../replay/use-replay-lite.js";

export type ProcessTimelineProps = {
  flow: EndpointFlow | undefined;
  steps: ReplayStep[];
  state: ReplayLiteState;
};

export function ProcessTimeline({ flow, steps, state }: ProcessTimelineProps): JSX.Element {
  const nodeById = new Map(flow?.nodes.map((node) => [node.id, node]) ?? []);
  const isComplete = state.phase === "complete";

  return (
    <section className="anlyx-process-timeline" aria-label="Process Flow timeline">
      <div className="anlyx-process-timeline__header">
        <span>Inferred request path</span>
        <span>{steps.length} replay steps</span>
      </div>
      <ol className="anlyx-process-timeline__rail">
        {steps.map((step, index) => {
          const node = nodeById.get(step.nodeId);
          const isActive =
            state.phase !== "idle" &&
            state.phase !== "complete" &&
            state.currentStepIndex === index;
          const isCompleted =
            state.phase === "complete" ||
            (state.phase !== "idle" && state.currentStepIndex > index);

          return (
            <li
              className={[
                "anlyx-process-step",
                `anlyx-process-step--${step.phase}`,
                isActive ? "anlyx-process-step--active" : "",
                isCompleted ? "anlyx-process-step--complete" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              key={`${step.phase}:${step.nodeId}:${index}`}
            >
              <span className="anlyx-process-step__dot" aria-hidden="true" />
              <span className="anlyx-process-step__phase">
                {step.phase === "request" ? "Request" : "Response"}
              </span>
              <span className="anlyx-process-step__label">
                {formatStepLabel(node?.type, step.phase)}
              </span>
              <span className="anlyx-process-step__node">{node?.label ?? step.nodeId}</span>
            </li>
          );
        })}
        <li
          className={[
            "anlyx-process-step",
            "anlyx-process-step--complete-stop",
            isComplete ? "anlyx-process-step--active" : ""
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span className="anlyx-process-step__dot" aria-hidden="true" />
          <span className="anlyx-process-step__phase">Complete</span>
          <span className="anlyx-process-step__label">Client</span>
          <span className="anlyx-process-step__node">Response delivered</span>
        </li>
      </ol>
    </section>
  );
}

function formatStepLabel(type: string | undefined, phase: ReplayStep["phase"]): string {
  const suffix = phase === "response" ? " Return" : "";

  switch (type) {
    case "endpoint":
      return phase === "response" ? "Endpoint Return" : "Endpoint";
    case "controller":
      return `Controller${suffix}`;
    case "service":
      return `Service${suffix}`;
    case "repository":
      return `Repository${suffix}`;
    case "database":
      return phase === "response" ? "Database Result" : "Database";
    default:
      return "Flow Node";
  }
}
