"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class PlannerPreviewErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="lux-pdf-error" role="alert">
          Client preview failed to load: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}
