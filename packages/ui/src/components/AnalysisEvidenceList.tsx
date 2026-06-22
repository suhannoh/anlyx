import type { AnalysisEvidence, ConfidenceLevel, FlowNode } from "@anlyx/core";
import { CheckCircle2, CircleHelp, Info, TriangleAlert, type LucideIcon } from "lucide-react";

import { StatusBadge } from "./StatusBadge.js";

export type AnalysisEvidenceListProps = {
  node: FlowNode;
};

export function AnalysisEvidenceList({ node }: AnalysisEvidenceListProps): JSX.Element {
  const evidence = getEvidence(node);

  return (
    <section className="anlyx-inspector-group" aria-label="Analysis evidence">
      <h3>Analysis evidence</h3>
      <ul className="anlyx-evidence-list">
        {evidence.map((item, index) => {
          const Icon = getEvidenceIcon(item.confidence ?? node.confidence ?? "unknown");

          return (
            <li key={`${item.label}:${index}`}>
              <Icon size={14} strokeWidth={2.5} />
              <span>
                <strong>{item.label}</strong>
                {item.detail ? <em>{item.detail}</em> : null}
              </span>
              <StatusBadge tone={item.confidence ?? node.confidence ?? "unknown"}>
                {item.confidence ?? node.confidence ?? "unknown"}
              </StatusBadge>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function getEvidence(node: FlowNode): AnalysisEvidence[] {
  if (node.evidence && node.evidence.length > 0) {
    return node.evidence;
  }

  if (node.type === "unknown") {
    return [
      {
        label: "Analysis stopped",
        detail: "Anlyx could not resolve this code element from the scanned source.",
        confidence: "unknown"
      }
    ];
  }

  if (node.type === "database") {
    return [
      {
        label: "Database table inferred",
        detail: "Derived from repository entity metadata or entity naming fallback.",
        confidence: node.confidence ?? "unknown"
      }
    ];
  }

  if (node.type === "endpoint") {
    return [
      {
        label: "Endpoint matched",
        detail: "Derived from the backend adapter endpoint list.",
        confidence: node.confidence ?? "unknown"
      }
    ];
  }

  return [
    {
      label: "Code node resolved",
      detail: "Resolved from the scanned static flow graph.",
      confidence: node.confidence ?? "unknown"
    }
  ];
}

function getEvidenceIcon(confidence: ConfidenceLevel): LucideIcon {
  if (confidence === "high") {
    return CheckCircle2;
  }

  if (confidence === "medium") {
    return Info;
  }

  if (confidence === "low") {
    return TriangleAlert;
  }

  return CircleHelp;
}
