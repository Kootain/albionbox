export function setToken(token: string) {
  localStorage.setItem('albion_erp_token', token);
  window.dispatchEvent(new Event('storage'));
}

export function clearToken() {
  localStorage.removeItem('albion_erp_token');
  window.dispatchEvent(new Event('storage'));
}

export function getToken() {
  return localStorage.getItem('albion_erp_token');
}
