const SESSION_STORAGE_KEY = 'albionbox_session_token';

export const sessionStore = {
  get() {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  },
  set(token: string) {
    localStorage.setItem(SESSION_STORAGE_KEY, token);
    window.dispatchEvent(new CustomEvent('albionbox:session-change'));
  },
  clear() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('albionbox:session-change'));
  },
};
