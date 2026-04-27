// Simple in-memory store representing the long-term memory pattern from 724-office
let store = {
  history: []
};

function getContext() {
  return store;
}

function saveContext(data) {
  store.history.push(data);
  // Keep only last 100
  if (store.history.length > 100) {
    store.history.shift();
  }
}

module.exports = { getContext, saveContext };
