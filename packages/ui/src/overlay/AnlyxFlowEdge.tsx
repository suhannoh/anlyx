import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

type EdgeData = {
  tone?: "blue" | "violet" | "amber" | "gray";
};

export function AnlyxFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data
}: EdgeProps): JSX.Element {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 14
  });
  const tone = ((data as EdgeData | undefined)?.tone ?? "blue").toLowerCase();

  return (
    <BaseEdge
      id={id}
      className={`anlyx-flow-rf-edge anlyx-flow-rf-edge--${tone}`}
      path={edgePath}
      {...(markerEnd ? { markerEnd } : {})}
    />
  );
}
