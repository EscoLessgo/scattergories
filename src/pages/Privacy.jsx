import React from 'react';
import { motion } from 'framer-motion';

export default function Privacy() {
    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_center,_#241c35_0%,_#130f1e_100%)] text-white p-8 overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl mx-auto space-y-6"
            >
                <h1 className="text-4xl font-black mb-8 bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-blue)]">
                    Privacy Policy
                </h1>

                <section>
                    <h2 className="text-2xl font-bold mb-2 text-white/90">1. Data Collection</h2>
                    <p className="text-white/60 leading-relaxed">
                        We collect minimal data necessary for the game to function:
                        <ul className="list-disc ml-6 mt-2 space-y-1">
                            <li>Nicknames provided during gameplay</li>
                            <li>Discord basic user information (only if you launch via Discord Activity)</li>
                            <li>Game session data (answers, scores) which is temporary</li>
                        </ul>
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-2 text-white/90">2. Data Usage</h2>
                    <p className="text-white/60 leading-relaxed">
                        Your data is used solely to facilitate the multiplayer game experience. We do not sell your personal data to third parties.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-2 text-white/90">3. Cookies & Storage</h2>
                    <p className="text-white/60 leading-relaxed">
                        We use Local Storage to save your nickname and avatar preference for your convenience. No tracking cookies are used.
                    </p>
                </section>

                <div className="pt-8 text-sm text-white/40">
                    Last updated: December 20, 2025
                </div>
            </motion.div>
        </div>
    );
}
