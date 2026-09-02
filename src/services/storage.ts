import AsyncStorage from '@react-native-async-storage/async-storage';

// Cross-platform key-value persistence.
// Uses AsyncStorage (localStorage-backed on web) so selections survive reloads.

export async function storageGet(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function storageSet(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // ignore persistence failures
  }
}

export async function storageRemove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore persistence failures
  }
}
