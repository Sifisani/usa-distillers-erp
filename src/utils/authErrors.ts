/**
 * Maps raw Firebase Auth and client authentication errors to safe,
 * user-friendly messages without exposing tokens, internal codes, or PII.
 */
export function getFriendlyAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';
  const rawMessage = error instanceof Error ? error.message : String(error ?? '');
  const combined = `${code} ${rawMessage}`;

  if (combined.includes('auth/unauthorized-domain')) {
    return 'Sign-in is not available from this workspace yet. Please contact your system administrator to approve this access point.';
  }

  if (combined.includes('auth/popup-blocked')) {
    return 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.';
  }

  if (combined.includes('auth/popup-closed-by-user') || combined.includes('auth/cancelled-popup-request')) {
    return 'Sign-in was cancelled before it was completed.';
  }

  if (
    combined.includes('auth/invalid-credential') ||
    combined.includes('auth/wrong-password') ||
    combined.includes('auth/user-not-found')
  ) {
    return 'The email or password you entered is incorrect. Please check your details and try again.';
  }

  if (combined.includes('auth/invalid-email')) {
    return 'Please enter a valid company email address.';
  }

  if (combined.includes('auth/email-already-in-use')) {
    return 'An account already exists for this email address. Sign in instead or contact your administrator.';
  }

  if (combined.includes('auth/weak-password')) {
    return 'Choose a stronger password with at least six characters.';
  }

  if (combined.includes('auth/user-disabled')) {
    return 'This account has been disabled. Please contact your system administrator.';
  }

  if (combined.includes('auth/operation-not-allowed')) {
    return 'This sign-in method is not enabled for this workspace. Contact your system administrator.';
  }

  if (combined.includes('auth/network-request-failed')) {
    return 'We could not reach the sign-in service. Check your connection and try again.';
  }

  if (combined.includes('auth/too-many-requests')) {
    return 'Sign-in is temporarily paused after several attempts. Please wait a moment and try again.';
  }

  // Safe explicit client validation messages (never pass raw Firebase stacks)
  if (rawMessage === 'STAFF_NAME_REQUIRED') {
    return 'Please enter your full staff name.';
  }

  if (rawMessage === 'PROD_REGISTRATION_DISABLED') {
    return 'Self-service account creation is disabled in production. Contact your system administrator to provision an account.';
  }

  if (rawMessage === 'PROD_PREVIEW_DISABLED') {
    return 'Staff role preview is disabled in production. Sign in with your company account.';
  }

  return 'We could not complete sign-in. Please try again or contact your system administrator.';
}
