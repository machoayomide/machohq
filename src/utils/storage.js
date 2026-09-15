import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getData(key) {
  try {
    const val = await AsyncStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

export async function setData(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) { console.error('Storage error:', e); }
}

export async function removeData(key) {
  try { await AsyncStorage.removeItem(key); } catch {}
}

export const today = () => new Date().toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.max(0, Math.ceil((new Date(b) - new Date(a)) / 86400000));
export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};