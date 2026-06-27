import { Component } from "react";
import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary] Caught error:", error.message);
    console.error("[ErrorBoundary] Component stack:", info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || "Unknown error";
      const isSupabase =
        msg.includes("supabaseUrl") ||
        msg.includes("Supabase credentials") ||
        msg.includes("VITE_SUPABASE");

      return (
        <div className="flex min-h-screen items-center justify-center bg-base-900 px-6">
          <div className="text-center max-w-md">
            <CircleAlert size={40} className="text-bad mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">
              {isSupabase ? "Configuration Required" : "Something went wrong"}
            </h1>
            <p className="text-sm text-slate-400 mb-6">
              {isSupabase
                ? "Supabase credentials are not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY at build time, then redeploy."
                : msg}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
