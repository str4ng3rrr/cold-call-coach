import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: 'var(--bg)',
        }}>
          <div style={{
            maxWidth: '480px',
            padding: '32px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
          }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '18px', color: 'var(--danger)' }}>
              Something went wrong
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.hash = ''
                window.location.reload()
              }}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'var(--accent)',
                color: 'var(--text-inverse)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Reload App
            </button>
            {this.state.error && (
              <details style={{ marginTop: '16px', textAlign: 'left' }}>
                <summary style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  Error details
                </summary>
                <pre style={{
                  marginTop: '8px',
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  fontSize: '11px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  color: '#ef4444',
                }}>
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
