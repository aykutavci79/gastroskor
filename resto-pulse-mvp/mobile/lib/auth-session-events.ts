type AuthFailureHandler = () => void | Promise<void>;

let authFailureHandler: AuthFailureHandler | null = null;

export function setAuthFailureHandler(handler: AuthFailureHandler | null) {
  authFailureHandler = handler;
}

export async function notifyAuthFailure() {
  if (!authFailureHandler) return;
  await authFailureHandler();
}
