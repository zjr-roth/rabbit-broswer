/**
 * Browser-compatible storage service using localStorage instead of Electron Store
 */

const STORAGE_KEY = 'rabbit_app_history';
const MAX_HISTORY_ITEMS = 20;

// Get history from localStorage
const getHistory = async () => {
  try {
    const storedHistory = localStorage.getItem(STORAGE_KEY);
    return storedHistory ? JSON.parse(storedHistory) : [];
  } catch (error) {
    console.error('Failed to get history from localStorage:', error);
    return [];
  }
};

// Save history to localStorage
const saveHistory = async (history) => {
  try {
    // Ensure we only save the most recent items
    const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
    return true;
  } catch (error) {
    console.error('Failed to save history to localStorage:', error);
    return false;
  }
};

// Add a new entry to history
const addToHistory = async (entry) => {
  try {
    const currentHistory = await getHistory();
    const updatedHistory = [entry, ...currentHistory].slice(0, MAX_HISTORY_ITEMS);
    return await saveHistory(updatedHistory);
  } catch (error) {
    console.error('Failed to add to history:', error);
    return false;
  }
};

// Clear all history
const clearHistory = async () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear history:', error);
    return false;
  }
};

// Export storage service API (same interface as original)
export default {
  getHistory,
  saveHistory,
  addToHistory,
  clearHistory
};