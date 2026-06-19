export function FlowLegend(): JSX.Element {
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
