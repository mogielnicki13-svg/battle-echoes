// Minimal firebase mock
export const initializeApp = jest.fn(() => ({}));
export const getFirestore = jest.fn(() => ({}));
export const collection = jest.fn();
export const doc = jest.fn();
export const getDocs = jest.fn(() => Promise.resolve({ docs: [] }));
export const getDoc = jest.fn(() => Promise.resolve({ exists: () => false, data: () => null }));
export const setDoc = jest.fn(() => Promise.resolve());
export const updateDoc = jest.fn(() => Promise.resolve());
export const query = jest.fn();
export const where = jest.fn();
export const orderBy = jest.fn();
export const limit = jest.fn();
export default { initializeApp, getFirestore };
