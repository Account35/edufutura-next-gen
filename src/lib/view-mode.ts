/**
 * Session-only "view as candidate" flags for admins/educators.
 * Kept in a standalone module so auth code can clear them without
 * importing React context (avoids circular imports).
 */

export const VIEW_MODE_STORAGE_KEY = 'admin_preview';
export const VIEW_MODE_RETURN_KEY = 'admin_preview_from';
export const VIEW_MODE_EVENT = 'adminPreviewChanged';

export const readViewModeFlag = (): boolean => {
  try {
    return sessionStorage.getItem(VIEW_MODE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

export const readViewModeReturnPath = (): string => {
  try {
    return sessionStorage.getItem(VIEW_MODE_RETURN_KEY) || '/admin';
  } catch {
    return '/admin';
  }
};

export const setViewModeFlag = (fromPath: string) => {
  try {
    sessionStorage.setItem(VIEW_MODE_STORAGE_KEY, '1');
    sessionStorage.setItem(VIEW_MODE_RETURN_KEY, fromPath || '/admin');
    window.dispatchEvent(
      new CustomEvent(VIEW_MODE_EVENT, {
        detail: { admin_preview: '1', from: fromPath || '/admin' },
      })
    );
  } catch {
    // ignore storage errors
  }
};

export const clearViewModeFlag = () => {
  try {
    sessionStorage.removeItem(VIEW_MODE_STORAGE_KEY);
    sessionStorage.removeItem(VIEW_MODE_RETURN_KEY);
    window.dispatchEvent(
      new CustomEvent(VIEW_MODE_EVENT, { detail: { admin_preview: '0' } })
    );
  } catch {
    // ignore storage errors
  }
};
