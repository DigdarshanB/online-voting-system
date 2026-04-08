/**
 * Centralised access-token helpers.
 *
 * Every read / write of the voter JWT goes through here so that
 * the storage key is defined exactly once.
 */

const TOKEN_KEY = "access_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
