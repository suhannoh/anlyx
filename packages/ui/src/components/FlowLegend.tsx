export type FlowLegendProps = {
  variant?: "structure" | "process";
};

export function FlowLegend({ variant = "structure" }: FlowLegendProps): JSX.Element {
  if (variant === "process") {
    return (
      <div className="anlyx-flow-legend" aria-label="Flow legend">
        <span>
          <i className="anlyx-flow-legend__mark anlyx-flow-legend__mark--main" />
          Request
        </span>
        <span>
          <i className="anlyx-flow-legend__mark anlyx-flow-legend__mark--response" />
          Response
        </span>
        <span>
          <i className="anlyx-flow-legend__mark anlyx-flow-legend__mark--sub" />
          Branch calls
        </span>
      </div>
    );
  }

  return (
    <div className="anlyx-flow-legend" aria-label="Flow legend">
      <span>
        <i className="anlyx-flow-legend__mark anlyx-flow-legend__mark--main" />
        Main Flow
      </span>
      <span>
        <i className="anlyx-flow-legend__mark anlyx-flow-legend__mark--sub" />
        Sub Flow
      </span>
      <span>
        <i className="anlyx-flow-legend__mark anlyx-flow-legend__mark--unknown" />
        Unknown
      </span>
    </div>
  );
}
