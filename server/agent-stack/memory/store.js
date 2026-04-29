// Simple in-memory store representing the long-term memory pattern from 724-office
function createStore() {
  const store = {
    history: []
  };

  return {
    getContext: () => store,
    saveContext: (data) => {
      store.history.push(data);
      // Keep only last 100
      if (store.history.length > 100) {
        store.history.shift();
      }
    }
  };
}

// Default instance for backward compatibility
const defaultStore = createStore();

module.exports = {
  getContext: defaultStore.getContext,
  saveContext: defaultStore.saveContext,
  createStore // Export factory for testing
};
