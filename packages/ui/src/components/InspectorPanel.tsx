import type { FlowNode, PageStoryboard, ScanResult } from "@anlyx/core";

import { StatusBadge } from "./StatusBadge.js";

type InspectorPanelProps = {
  data: ScanResult;
  selectedNode: FlowNode | undefined;
};

export function InspectorPanel({ data, selectedNode }: InspectorPanelProps): JSX.Element {
  const linkedPages = selectedNode ? findLinkedPages(data, selectedNode.id) : [];

  return (
    <aside className="anlyx-inspector" role="complementary" aria-label="Inspector">
      <div className="anlyx-panel-heading">
        <p className="anlyx-eyebrow">Inspector</p>
        <h2>Selected Node</h2>
      </div>

      {selectedNode ? (
        <div className="anlyx-inspector-stack">
          <Field label="Type" value={selectedNode.type} />
          <Field label="Label" value={selectedNode.label} />
          <Field label="File path" value={selectedNode.filePath ?? "Unknown"} />
          <Field label="Line number" value={formatLineNumber(selectedNode.lineNumber)} />
          <div className="anlyx-field">
            <span className="anlyx-field__label">Confidence</span>
            <StatusBadge tone={selectedNode.confidence ?? "unknown"} label="confidence">
              {selectedNode.confidence ?? "unknown"}
            </StatusBadge>
          </div>
          <section className="anlyx-inspector-group" aria-label="Linked pages">
            <h3>Linked pages</h3>
            {linkedPages.length > 0 ? (
              <ul>
                {linkedPages.map((page) => (
                  <li key={page.id}>{page.route}</li>
                ))}
              </ul>
            ) : (
              <p>None</p>
            )}
          </section>
          <section className="anlyx-inspector-group" aria-label="Sub flows">
            <h3>Sub flows</h3>
            <p>{data.flows[0]?.subFlows.length ?? 0} collapsed</p>
          </section>
          <section className="anlyx-inspector-group" aria-label="DB tables">
            <h3>DB tables</h3>
            <p>{findDatabaseLabel(data) ?? "None"}</p>
          </section>
        </div>
      ) : (
        <p className="anlyx-empty">No node selected</p>
      )}
    </aside>
  );
}

function Field({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="anlyx-field">
      <span className="anlyx-field__label">{label}</span>
      <span className="anlyx-field__value">{value}</span>
    </div>
  );
}

function formatLineNumber(lineNumber: number | undefined): string {
  return lineNumber === undefined ? "Unknown" : String(lineNumber);
}

function findLinkedPages(data: ScanResult, nodeId: string): PageStoryboard[] {
  return data.pages.filter((page) =>
    page.apiCalls.some((apiCall) => apiCall.endpointId === nodeId)
  );
}

function findDatabaseLabel(data: ScanResult): string | undefined {
  return data.flows
    .flatMap((flow) => flow.nodes)
    .find((node) => node.type === "database")?.label;
}
