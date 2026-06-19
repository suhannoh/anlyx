export type ReplayPhase = "idle" | "request" | "response" | "complete";

export type ReplayStep = {
  phase: "request" | "response";
  nodeId: string;
  fromNodeId?: string;
  toNodeId?: string;
  index: number;
};

export function buildReplaySteps(mainPath: string[]): ReplayStep[] {
  if (mainPath.length === 0) {
    return [];
  }

  const requestSteps = mainPath.map((nodeId, index): ReplayStep => {
    const previousNodeId = mainPath[index - 1];

    return {
      phase: "request",
      nodeId,
      ...(previousNodeId ? { fromNodeId: previousNodeId, toNodeId: nodeId } : {}),
      index
    };
  });

  const responsePath = [...mainPath].reverse();
  const responseSteps = responsePath.map((nodeId, responseIndex): ReplayStep => {
    const previousNodeId = responsePath[responseIndex - 1];

    return {
      phase: "response",
      nodeId,
      ...(previousNodeId ? { fromNodeId: previousNodeId, toNodeId: nodeId } : {}),
      index: requestSteps.length + responseIndex
    };
  });

  return [...requestSteps, ...responseSteps];
}
