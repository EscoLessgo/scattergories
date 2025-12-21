import React from 'react';
import { motion } from 'framer-motion';

export default function Terms() {
    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_center,_#241c35_0%,_#130f1e_100%)] text-white p-8 overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl mx-auto space-y-6"
            >
                <h1 className="text-4xl font-black mb-8 bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-blue)]">
                    Terms of Service
                </h1>

                <section>
                    <h2 className="text-2xl font-bold mb-2 text-white/90">1. Acceptance</h2>
                    <p className="text-white/60 leading-relaxed">By accessing Letter Litter, you agree to be bound by these Terms of Service.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-2 text-white/90">2. Usage</h2>
                    <p className="text-white/60 leading-relaxed">
                        You agree to use this service only for lawful purposes. You are responsible for any user-generated content (nicknames, answers) you submit.
                        We reserve the right to remove content or ban users for inappropriate behavior.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-2 text-white/90">3. Disclaimer</h2>
                    <p className="text-white/60 leading-relaxed">
                        The service is provided "as is" without warranties of any kind. We are not liable for any damages arising from the use of this service.
                    </p>
                </section>

                <div className="pt-8 text-sm text-white/40">
                    Last updated: December 20, 2025
                </div>
            </motion.div>
        </div>
    );
}
