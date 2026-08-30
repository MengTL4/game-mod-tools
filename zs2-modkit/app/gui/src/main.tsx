import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@rpgmv-modkit/ui/style.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
