import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Room from './pages/Room';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import { AnimatePresence } from 'framer-motion';

function App() {
    return (
        <BrowserRouter>
            <AnimatePresence mode="wait">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/room/:roomId" element={<Room />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                </Routes>
            </AnimatePresence>
        </BrowserRouter>
    );
}

export default App;
