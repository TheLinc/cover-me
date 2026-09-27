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
          background: "#F5F3F2",
          fontFamily: "system-ui, sans-serif",
          color: "#1E1B4B",
        }}
      >
        <div style={{ textAlign: "center", padding: "0 24px" }}>
          <h2 style={{ fontSize: 28, fontWeight: 500, marginBottom: 8 }}>
            Something went wrong.
          </h2>
          <p style={{ fontSize: 14, color: "#5A534D", marginBottom: 24 }}>
            We've been notified. Try again or come back shortly.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "10px 20px",
              background: "#4F46E5",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 999,
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
