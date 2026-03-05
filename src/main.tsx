import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <ToastContainer
      position="top-center"
      closeButton={false}
      hideProgressBar={true}
      newestOnTop={true}
      draggable={false}
      pauseOnHover={true}
      style={{ pointerEvents: "none", zIndex: 9999 }}
      toastStyle={{
        minHeight: "40px",
        width: "auto",
        height: "auto",
        fontSize: "14px",
        lineHeight: "1.35",
        fontWeight: 500,
        letterSpacing: "0.01em",
        borderRadius: "10px",
        background: "#ffffff",
        color: "#000000",
        border: "1px solid #e5e7eb",
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.14)",
        padding: "6px 8px",
      }}
    />
  </StrictMode>,
);
