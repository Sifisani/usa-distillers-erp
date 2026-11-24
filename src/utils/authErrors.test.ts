import test from 'node:test';
import assert from 'node:assert/strict';
import { getFriendlyAuthError } from './authErrors.ts';

test('maps Firebase Auth error codes to friendly messages without leaking raw details', () => {
  assert.equal(
    getFriendlyAuthError({ code: 'auth/invalid-credential' }),
    'The email or password you entered is incorrect. Please check your details and try again.'
  );
  assert.equal(
    getFriendlyAuthError({ code: 'auth/popup-blocked' }),
    'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.'
  );
  assert.equal(
    getFriendlyAuthError({ code: 'auth/too-many-requests' }),
    'Sign-in is temporarily paused after several attempts. Please wait a moment and try again.'
  );
  assert.equal(
    getFriendlyAuthError({ code: 'auth/network-request-failed' }),
    'We could not reach the sign-in service. Check your connection and try again.'
  );
});

test('maps client validation sentinels cleanly and sanitizes unknown errors', () => {
  assert.equal(
    getFriendlyAuthError(new Error('STAFF_NAME_REQUIRED')),
    'Please enter your full staff name.'
  );
  assert.equal(
    getFriendlyAuthError(new Error('PROD_REGISTRATION_DISABLED')),
    'Self-service account creation is disabled in production. Contact your system administrator to provision an account.'
  );
  assert.equal(
    getFriendlyAuthError(new Error('PROD_PREVIEW_DISABLED')),
    'Staff role preview is disabled in production. Sign in with your company account.'
  );

  const sanitized = getFriendlyAuthError(new Error('Firebase: internal token secret=xyz123'));
  assert.equal(
    sanitized,
    'We could not complete sign-in. Please try again or contact your system administrator.'
  );
  assert.ok(!sanitized.includes('secret=xyz123'));
});
