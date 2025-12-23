export const safeStorage = {
    getItem: (key) => {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn('localStorage access denied/failed:', e);
            return null;
        }
    },
    setItem: (key, value) => {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn('localStorage access denied/failed:', e);
        }
    },
    removeItem: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('localStorage access denied/failed:', e);
        }
    }
};
