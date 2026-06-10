/**
 * CrispProvider.jsx (named IntercomProvider for drop-in compatibility)
 *
 * Manages the Crisp live-chat lifecycle:
 *  - Loads the Crisp widget script once on mount
 *  - Identifies logged-in users (name, email) so chats are tagged in Crisp
 *  - Resets session on sign-out so the next visitor gets a clean chat
 *  - Tracks page views on every route change
 *
 * Website ID: 24487fc9-f080-4242-86c0-60686acbf816
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

const CRISP_WEBSITE_ID = "24487fc9-f080-4242-86c0-60686acbf816";

// ─── Safe wrapper ─────────────────────────────────────────────────────────
function crisp(method, ...args) {
  if (typeof window !== "undefined" && window.$crisp) {
    window.$crisp.push([method, ...args]);
  }
}

// ─── Component ────────────────────────────────────────────────────────────
export default function IntercomProvider({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  // Load Crisp script once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("crisp-script")) return; // already loaded

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    const s = document.createElement("script");
    s.id = "crisp-script";
    s.src = "https://client.crisp.chat/l.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  // Identify / reset when auth state changes
  useEffect(() => {
    if (user) {
      // Tag the conversation with the user's email and name
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User";

      crisp("set", "user:email", [user.email]);
      crisp("set", "user:nickname", [name]);
      crisp("set", "session:data", [[
        ["user_id",  user.id],
        ["plan",     user.user_metadata?.plan || "free"],
        ["app",      "RizeAI"],
      ]]);
    } else {
      // Visitor logged out — reset so their session isn't mixed with the next user
      if (window.$crisp && typeof window.$crisp.push === "function") {
        window.$crisp.push(["do", "session:reset"]);
      }
    }
  }, [user]);

  // Track page views on navigation
  useEffect(() => {
    crisp("do", "message:send", []); // no-op ping that updates Crisp's "current page" field
  }, [location.pathname]);

  return children;
}

/**
 * useCrisp() — trigger Crisp actions from any component.
 * Still exported as useIntercom for backward compatibility with App.jsx.
 *
 * Usage:
 *   const { showMessenger, trackEvent } = useIntercom();
 *   showMessenger();
 *   trackEvent("deal_saved", { arv: 350000 });
 */
export function useIntercom() {
  return {
    /** Open the Crisp chat window */
    showMessenger: () => crisp("do", "chat:open"),
    /** Hide the Crisp chat bubble */
    hide: () => crisp("do", "chat:hide"),
    /** Push a custom event into the Crisp session timeline */
    trackEvent: (name, metadata = {}) => {
      crisp("set", "session:event", [[
        [name, metadata, "blue"],
      ]]);
    },
  };
}
