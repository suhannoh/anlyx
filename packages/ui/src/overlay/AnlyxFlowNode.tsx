import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Box, Code2, Database, Globe2, Layers3, LockKeyhole, ShieldCheck } from "lucide-react";

import { Badge, Card, Tooltip } from "./ui.js";

export type AnlyxFlowNodeData = {
  kind: "api" | "controller" | "service" | "repository" | "database" | "auth" | "result";
  label: string;
  value: string;
  sub?: string;
  badge: string;
  accent: "blue" | "green" | "amber" | "violet" | "gray";
  fullValue?: string;
  step?: string;
  state?: "taken" | "blocked" | "scanned";
};

export function AnlyxFlowNode({ data }: NodeProps): JSX.Element {
  const nodeData = data as AnlyxFlowNodeData;
  const Icon = getIcon(nodeData.kind);
  const state = nodeData.state ?? "taken";

  return (
    <Card
      className={`anlyx-flow-rf-node anlyx-flow-rf-node--${nodeData.accent} anlyx-flow-rf-node--${state}`}
    >
      <Handle className="anlyx-flow-rf-handle" position={Position.Left} type="target" />
      <div className="anlyx-flow-rf-node__top">
        <span className="anlyx-flow-rf-node__icon" aria-hidden="true">
          <Icon size={14} strokeWidth={2.25} />
        </span>
        <span className="anlyx-flow-rf-node__label">{nodeData.label}</span>
        {nodeData.step ? <span className="anlyx-flow-rf-node__step">{nodeData.step}</span> : null}
      </div>
      <Tooltip content={nodeData.fullValue ?? nodeData.value}>
        <p className="anlyx-flow-rf-node__value">{nodeData.value}</p>
      </Tooltip>
      {nodeData.sub ? <p className="anlyx-flow-rf-node__sub">{nodeData.sub}</p> : null}
      <Badge tone={nodeData.accent === "violet" ? "violet" : nodeData.accent}>
        {nodeData.badge}
      </Badge>
      <Handle className="anlyx-flow-rf-handle" position={Position.Right} type="source" />
    </Card>
  );
}

function getIcon(kind: AnlyxFlowNodeData["kind"]) {
  switch (kind) {
    case "api":
      return Globe2;
    case "controller":
      return Code2;
    case "service":
      return Layers3;
    case "repository":
      return Box;
    case "database":
      return Database;
    case "auth":
      return LockKeyhole;
    case "result":
      return ShieldCheck;
  }
}
