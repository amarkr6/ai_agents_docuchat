/**
 * FILE: main.tsx
 * PURPOSE: ENTRY POINT of the React app — mounts <App /> into index.html's #root div.
 *
 * StrictMode runs extra checks in development (it may call effects twice on
 * purpose to reveal bugs). It has no effect in the production build.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
