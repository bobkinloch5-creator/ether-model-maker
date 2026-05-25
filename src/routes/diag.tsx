import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/diag")({
  head: () => ({
    meta: [
      { title: "Diagnostics — KingDavez Studios (Beta)" },
      { name: "description", content: "Internal environment diagnostics for KingDavez Studios infrastructure." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DiagComponent,
});

function DiagComponent() {
  const envVars = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_LM_STUDIO_URL: import.meta.env.VITE_LM_STUDIO_URL,
    VITE_OLLAMA_MODEL: import.meta.env.VITE_OLLAMA_MODEL,
    VITE_SHAPE_E_URL: import.meta.env.VITE_SHAPE_E_URL,
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "monospace", color: "#fff", background: "#000", minHeight: "100vh" }}>
      <h1>Production Diagnostic Environment</h1>
      <pre>{JSON.stringify(envVars, null, 2)}</pre>
    </div>
  );
}
