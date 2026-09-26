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
          background: "#F2EADB",
          fontFamily: "system-ui, sans-serif",
          color: "#1C1A17",
        }}
      >
        <div style={{ textAlign: "center", padding: "0 24px" }}>
          <h2 style={{ fontSize: 28, fontWeight: 500, fontFamily: "Georgia, serif", marginBottom: 8 }}>
            Something went wrong.
          </h2>
          <p style={{ fontSize: 14, color: "#5E574C", marginBottom: 24 }}>
            We've been notified. Try again or come back shortly.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "10px 20px",
              background: "#C4321F",
              color: "#F2EADB",
              border: "none",
              borderRadius: 3,
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
