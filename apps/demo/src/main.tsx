import "../../../packages/ui/src/readme-demo/readme-demo.css";
import "./demo-page.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import logoSrc from "../../../docs/assets/brand/anlyx-logo-transparent.png";
import iconSrc from "../../../docs/assets/brand/anlyx-icon-transparent.png";
import fixtureEndpoints from "../../../fixtures/spring-next-sample/expected/endpoints.json";
import fixtureFlows from "../../../fixtures/spring-next-sample/expected/flows.json";
import { ReadmeDemoApp } from "../../../packages/ui/src/readme-demo/ReadmeDemoApp.js";

import type { Endpoint, EndpointFlow } from "@anlyx/core";

const detailEndpointId = "endpoint:get:/api/public/benefits/{id}";
const detailEndpoint = (fixtureEndpoints as Endpoint[]).find(
  (endpoint) => endpoint.id === detailEndpointId
);
const detailFlow = (fixtureFlows as EndpointFlow[]).find(
  (flow) => flow.endpointId === detailEndpointId
);

const root = document.getElementById("root");

if (!root) {
  throw new Error("Anlyx demo root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <ReadmeDemoApp
      eyebrow="Live demo"
      fixtureDetail={
        detailEndpoint && detailFlow ? { endpoint: detailEndpoint, flow: detailFlow } : null
      }
      iconSrc={iconSrc}
      logoSrc={logoSrc}
    />
  </StrictMode>
);
