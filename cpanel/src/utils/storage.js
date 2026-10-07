export function readStorage(key, fallbackValue) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

export function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
