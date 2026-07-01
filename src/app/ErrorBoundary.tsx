import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error?: Error;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("PG OS runtime error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-pgos-bg px-6 text-pgos-text">
        <section className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-card">
          <p className="text-sm font-semibold text-red-700">Runtime recovery</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">PG OS needs a refresh</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The current page hit an unexpected runtime error. Refreshing will reload the latest production bundle and keep backend controls unchanged.
          </p>
          <div className="mt-5 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {this.state.error.message || "Unknown runtime error"}
          </div>
          <button
            className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            type="button"
            onClick={() => window.location.reload()}
          >
            Refresh workspace
          </button>
        </section>
      </main>
    );
  }
}
