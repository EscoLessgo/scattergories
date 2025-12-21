import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class GlobalError extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', color: 'white', background: '#330000', height: '100vh', fontFamily: 'monospace' }}>
                    <h1>Something went wrong.</h1>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error && this.state.error.toString()}</pre>
                    <p>Check console for more details.</p>
                </div>
            );
        }

        return this.props.children;
    }
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <GlobalError>
            <App />
        </GlobalError>
    </React.StrictMode>,
)
