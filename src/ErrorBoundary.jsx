/**
 * Root-level Error Boundary.
 *
 * Catches any render-tree exception from any route. Without it, a single
 * thrown error in any component results in a blank white page with the only
 * clue being whatever ended up in the browser console.
 *
 * With it:
 *   - Users see a clear error UI instead of a void
 *   - The error + stack are visible on-screen (so we can debug from screenshots)
 *   - One-click reload to recover
 *   - The error is also pushed to Supabase via logError (already wired)
 */
import { Component } from "react";
import { logError } from "./lib/errors";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // Fire-and-forget log to Supabase
    try {
      logError({
        mechanism: "react_error_boundary",
        message: error?.message || String(error),
        stack: error?.stack,
        extra: { componentStack: info?.componentStack?.slice(0, 1000) },
      });
    } catch {}
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        minHeight: "100vh", background: "#07090f", color: "var(--text)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24
      }}>
        <div style={{
          maxWidth: 720, width: "100%",
          background: "#0d1119", border: "1px solid rgba(242,92,92,0.4)",
          borderLeft: "4px solid var(--red)",
          borderRadius: 6, padding: "24px 28px"
        }}>
          <div style={{
            fontFamily: "'Fira Code', ui-monospace, monospace",
            fontSize: 10.5, fontWeight: 700, color: "var(--red)",
            letterSpacing: "0.8px", marginBottom: 8,
          }}>
            ▸ RENDER ERROR · APP CRASHED
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: "-0.3px" }}>
            Something broke during render.
          </div>
          <div style={{ fontSize: 13, color: "var(--sub)", lineHeight: 1.6, marginBottom: 16 }}>
            The page failed to render. The error has been logged. Reload to recover — if it persists,
            the message below pinpoints what went wrong.
          </div>
          <div style={{
            background: "#07090f", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 4, padding: "12px 14px", marginBottom: 14,
            fontFamily: "'Fira Code', ui-monospace, monospace",
            fontSize: 12, color: "var(--red)", overflow: "auto", maxHeight: 240
          }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{String(this.state.error?.message || this.state.error)}</div>
            {this.state.error?.stack && (
              <pre style={{ margin: 0, color: "var(--sub)", fontSize: 11, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {String(this.state.error.stack).split("\n").slice(0, 8).join("\n")}
              </pre>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "var(--green)", color: "#07090f", border: "none",
                borderRadius: 4, padding: "10px 16px",
                fontFamily: "'Fira Code', ui-monospace, monospace", fontSize: 11.5,
                fontWeight: 700, letterSpacing: "0.6px", cursor: "pointer"
              }}>
              ▸ RELOAD PAGE
            </button>
            <a
              href="/"
              style={{
                background: "transparent", color: "var(--sub)",
                border: "1px solid rgba(255,255,255,0.07)", borderRadius: 4,
                padding: "10px 16px",
                fontFamily: "'Fira Code', ui-monospace, monospace", fontSize: 11.5,
                fontWeight: 700, letterSpacing: "0.6px",
                textDecoration: "none", display: "inline-flex", alignItems: "center"
              }}>
              ← HOME
            </a>
          </div>
        </div>
      </div>
    );
  }
}
