import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Box,
  Braces,
  Code2,
  Database,
  GitBranch,
  Globe2,
  Layers3,
  type LucideIcon
} from "lucide-react";
import { motion } from "motion/react";

import { StatusBadge } from "./StatusBadge.js";
import type { AnlyxReactFlowNode } from "../flow/build-react-flow-model.js";

export function FlowNodeCard({ data, selected }: NodeProps<AnlyxReactFlowNode>): JSX.Element {
  const confidence = data.confidence ?? "unknown";
  const Icon = getTypeIcon(data.type, data.flowRole);

  return (
    <motion.button
      animate={data.isReplayActive ? { scale: [1, 1.018, 1] } : { scale: 1 }}
      className={[
        "anlyx-flow-node",
        `anlyx-flow-node--${data.type}`,
        `anlyx-flow-node--${data.flowRole}`,
        data.isReplayActive ? "anlyx-flow-node--replay-active" : "",
        selected ? "anlyx-flow-node--selected" : ""
      ].join(" ")}
      onClick={() => data.onSelectNode?.(data.node)}
      type="button"
      aria-label={`Select node ${data.label}`}
      data-replay-active={String(Boolean(data.isReplayActive))}
      data-testid={`flow-node-${data.node.id}`}
      transition={{ duration: 1.35, repeat: data.isReplayActive ? Infinity : 0 }}
    >
      <Handle className="anlyx-flow-handle" position={Position.Left} type="target" />
      {data.isReplayActive ? <span className="anlyx-flow-node__pulse" aria-hidden="true" /> : null}
      <span className="anlyx-flow-node__header">
        <span className="anlyx-flow-node__icon" aria-hidden="true">
          <Icon size={14} strokeWidth={2.4} />
        </span>
        <span className="anlyx-flow-node__type">{data.type}</span>
      </span>
      <span className="anlyx-flow-node__label">{data.label}</span>
      <StatusBadge tone={confidence} label="confidence">
        {confidence}
      </StatusBadge>
      <Handle className="anlyx-flow-handle" position={Position.Right} type="source" />
    </motion.button>
  );
}

function getTypeIcon(type: string, flowRole: string): LucideIcon {
  if (flowRole === "sub") {
    return GitBranch;
  }

  switch (type) {
    case "endpoint":
      return Globe2;
    case "controller":
      return Code2;
    case "service":
      return Layers3;
    case "repository":
      return Braces;
    case "database":
      return Database;
    default:
      return Box;
  }
}
