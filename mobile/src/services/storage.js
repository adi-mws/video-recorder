import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'mern_jwt_token';
const SERVER_URL_KEY = 'mern_server_url';

export async function getStoredToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setStoredToken(token) {
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

export async function getStoredServerUrl() {
  return AsyncStorage.getItem(SERVER_URL_KEY);
}

export async function setStoredServerUrl(url) {
  if (url) {
    await AsyncStorage.setItem(SERVER_URL_KEY, url);
  } else {
    await AsyncStorage.removeItem(SERVER_URL_KEY);
  }
}

