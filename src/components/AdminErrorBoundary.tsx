import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  /** Optional route label shown in the error surface. */
  routeLabel?: string;
}

interface State {
  error: Error | null;
}

/**
 * Error boundary wrapping admin routes. Catches render-time exceptions
 * so a failed hook or crashed component doesn't black-screen the whole
 * admin shell. Offers Retry (remount children) and Back-to-Admin.
 *
 * Intentionally a class component — hooks can't implement
 * componentDidCatch / getDerivedStateFromError. No external deps so we
 * don't pay for react-error-boundary just for this one surface.
 */
export default class AdminErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      "[AdminErrorBoundary] captured:",
      error,
      info?.componentStack
    );
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  handleBack = () => {
    // Soft-nav via location so we don't pull in useNavigate and create
    // a hooks dependency in a class component.
    window.location.assign("/admin");
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-100">
                  Something broke on this admin screen.
                </div>
                {this.props.routeLabel && (
                  <div className="text-[11px] text-zinc-500">
                    {this.props.routeLabel}
                  </div>
                )}
              </div>
            </div>
            <pre className="max-h-40 overflow-auto rounded bg-zinc-950 p-2.5 text-[11px] text-zinc-400 whitespace-pre-wrap">
              {this.state.error.message || String(this.state.error)}
            </pre>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={this.handleRetry}>
                Retry
              </Button>
              <Button size="sm" variant="ghost" onClick={this.handleBack}>
                Back to /admin
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
