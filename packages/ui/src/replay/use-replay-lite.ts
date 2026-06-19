import { useCallback, useEffect, useMemo, useState } from "react";

import { buildReplaySteps, type ReplayPhase, type ReplayStep } from "./build-replay-steps.js";

export type ReplayLiteState = {
  phase: ReplayPhase;
  isPlaying: boolean;
  activeNodeId?: string;
  activeEdge?: { from: string; to: string };
  currentStepIndex: number;
};

export type UseReplayLiteOptions = {
  mainPath: string[];
  loop?: boolean;
  intervalMs?: number;
};

export type UseReplayLiteResult = {
  state: ReplayLiteState;
  steps: ReplayStep[];
  loop: boolean;
  play: () => void;
  pause: () => void;
  restart: () => void;
  toggleLoop: () => void;
};

export function useReplayLite({
  mainPath,
  loop: initialLoop = false,
  intervalMs = 800
}: UseReplayLiteOptions): UseReplayLiteResult {
  const steps = useMemo(() => buildReplaySteps(mainPath), [mainPath]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [phase, setPhase] = useState<ReplayPhase>("idle");
  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoop] = useState(initialLoop);

  useEffect(() => {
    setCurrentStepIndex(0);
    setPhase("idle");
    setIsPlaying(false);
  }, [steps]);

  const play = useCallback(() => {
    if (steps.length === 0) {
      return;
    }

    setCurrentStepIndex((current) =>
      phase === "complete" || current >= steps.length ? 0 : current
    );
    setPhase((currentPhase) => {
      if (currentPhase === "complete") {
        return steps[0]!.phase;
      }

      return steps[currentStepIndex]?.phase ?? steps[0]!.phase;
    });
    setIsPlaying(true);
  }, [currentStepIndex, phase, steps]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const restart = useCallback(() => {
    setCurrentStepIndex(0);
    setPhase(steps[0]?.phase ?? "idle");
    setIsPlaying(false);
  }, [steps]);

  const toggleLoop = useCallback(() => {
    setLoop((current) => !current);
  }, []);

  useEffect(() => {
    if (!isPlaying || steps.length === 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCurrentStepIndex((current) => {
        const next = current + 1;

        if (next >= steps.length) {
          if (loop) {
            setPhase(steps[0]!.phase);
            return 0;
          }

          setIsPlaying(false);
          setPhase("complete");
          return current;
        }

        setPhase(steps[next]!.phase);
        return next;
      });
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [intervalMs, isPlaying, loop, steps]);

  const currentStep =
    phase === "idle" || phase === "complete" ? undefined : steps[currentStepIndex];

  return {
    state: toReplayState({
      currentStep,
      currentStepIndex,
      isPlaying,
      phase
    }),
    steps,
    loop,
    play,
    pause,
    restart,
    toggleLoop
  };
}

function toReplayState(options: {
  currentStep: ReplayStep | undefined;
  currentStepIndex: number;
  isPlaying: boolean;
  phase: ReplayPhase;
}): ReplayLiteState {
  return {
    phase: options.phase,
    isPlaying: options.isPlaying,
    currentStepIndex: options.currentStepIndex,
    ...(options.currentStep
      ? {
          activeNodeId: options.currentStep.nodeId,
          ...(options.currentStep.fromNodeId && options.currentStep.toNodeId
            ? {
                activeEdge: {
                  from: options.currentStep.fromNodeId,
                  to: options.currentStep.toNodeId
                }
              }
            : {})
        }
      : {})
  };
}
