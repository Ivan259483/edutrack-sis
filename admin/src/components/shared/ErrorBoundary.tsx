import { Component, type ReactNode } from 'react';
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="p-8 space-y-4">
        <h1 className="text-xl font-bold">This page could not be loaded</h1>
        <p>
          Reload to try again. Reloading does not clear browser-stored records.
        </p>
        <button
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
          onClick={() => window.location.reload()}
        >
          Reload portal
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
