import React from 'react';
import { AlertCircle } from 'lucide-react';
import './ErrorBoundary.css';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught exception:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    // Optional: reload page to ensure clean state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary__content">
            <AlertCircle size={48} className="error-boundary__icon text-danger" />
            <h1 className="text-display">Something went wrong.</h1>
            <p className="text-body-lg text-secondary">
              The application encountered an unexpected error and could not continue.
            </p>
            {this.state.error && (
              <pre className="error-boundary__details">
                {this.state.error.toString()}
              </pre>
            )}
            <button className="btn btn--primary" onClick={this.handleRetry}>
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
