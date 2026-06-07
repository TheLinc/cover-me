"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d1117",
          fontFamily: "system-ui, sans-serif",
          color: "#e2e8f0",
        }}
      >
        <div style={{ textAlign: "center", padding: "0 24px" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Something went wrong.
          </h2>
          <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 24 }}>
            We've been notified. Try again or come back shortly.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "10px 20px",
              background: "#6366f1",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
