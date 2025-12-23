import { HashRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Home from './pages/Home';
import Room from './pages/Room';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import { AnimatePresence } from 'framer-motion';

function DebugOverlay() {
    const hasClient = !!import.meta.env.VITE_DISCORD_CLIENT_ID;
    const url = window.location.href;
    const [visible, setVisible] = useState(true);

    if (!visible) return null;

    return (
        <div style={{
            position: 'fixed', bottom: 10, right: 10, zIndex: 9999,
            background: 'rgba(0,0,0,0.8)', color: '#0f0', padding: '10px',
            borderRadius: '5px', fontSize: '10px', maxWidth: '300px',
            border: '1px solid #0f0', pointerEvents: 'none'
        }}>
            <h3 style={{ margin: 0, borderBottom: '1px solid #333' }}>Debug Info</h3>
            <div>ID: {hasClient ? 'Present' : 'MISSING'}</div>
            <div style={{ wordBreak: 'break-all' }}>URL: {url}</div>
            <div>Build Time: {new Date().toLocaleTimeString()}</div>
        </div>
    );
}

function App() {
    return (
        <HashRouter>
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <DebugOverlay />
                <AnimatePresence mode="wait">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/room/:roomId" element={<Room />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/privacy" element={<Privacy />} />
                    </Routes>
                </AnimatePresence>
            </div>
        </HashRouter>
    );
}

export default App;
