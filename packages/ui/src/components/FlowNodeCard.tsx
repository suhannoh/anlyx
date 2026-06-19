import type { NodeProps } from "@xyflow/react";

import { StatusBadge } from "./StatusBadge.js";
import type { AnlyxReactFlowNode } from "../flow/build-react-flow-model.js";

export function FlowNodeCard({ data, selected }: NodeProps<AnlyxReactFlowNode>): JSX.Element {
  const confidence = data.confidence ?? "unknown";

  return (
    <button
      className={[
        "anlyx-flow-node",
        `anlyx-flow-node--${data.type}`,
        `anlyx-flow-node--${data.flowRole}`,
        selected ? "anlyx-flow-node--selected" : ""
      ].join(" ")}
      onClick={() => data.onSelectNode?.(data.node)}
      type="button"
      aria-label={`Select node ${data.label}`}
    >
      <span className="anlyx-flow-node__type">{data.type}</span>
      <span className="anlyx-flow-node__label">{data.label}</span>
      <StatusBadge tone={confidence} label="confidence">
        {confidence}
      </StatusBadge>
    </button>
  );
}
