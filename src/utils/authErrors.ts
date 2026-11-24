export function getFriendlyAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('auth/unauthorized-domain')) {
    return 'Sign-in is not available from this workspace yet. Please contact your system administrator to approve this access point.';
  }
  if (message.includes('auth/popup-blocked')) {
    return 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.';
  }
  if (message.includes('auth/popup-closed-by-user')) {
    return 'Sign-in was cancelled before it was completed.';
  }
  if (
    message.includes('auth/invalid-credential') ||
    message.includes('auth/wrong-password') ||
    message.includes('auth/user-not-found')
  ) {
    return 'The email or password you entered is incorrect. Please check your details and try again.';
  }
  if (message.includes('auth/email-already-in-use')) {
    return 'An account already exists for this email address. Sign in instead or contact your administrator.';
  }
  if (message.includes('auth/weak-password')) {
    return 'Choose a stronger password with at least six characters.';
  }
  if (message.includes('auth/network-request-failed')) {
    return 'We could not reach the sign-in service. Check your connection and try again.';
  }
  if (message.includes('auth/too-many-requests')) {
    return 'Sign-in is temporarily paused after several attempts. Please wait a moment and try again.';
  }

  return 'We could not complete sign-in. Please try again or contact your system administrator.';
}
