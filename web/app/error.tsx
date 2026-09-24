"use client";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const login = /expired|credential|token/i.test(error.message);
  return (
    <div style={{ maxWidth: 720, display: "grid", gap: 12 }}>
      <h1 style={{ font: "var(--type-h1)", margin: 0 }}>{login ? "The app's AWS login has expired" : "Something went wrong"}</h1>
      <p style={{ color: "var(--text-2)", margin: 0 }}>
        {login ? "Run aws login --profile fundsentinel, restart with npm run dev:aws, then retry." : error.message}
      </p>
      <button onClick={reset} style={{ justifySelf: "start", padding: "8px 14px" }}>Retry</button>
    </div>
  );
}
