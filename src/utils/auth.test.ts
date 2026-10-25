import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, generateOtp, formatBangladeshiPhone } from './auth.js';

test('hashPassword hashes input consistently and verifyPassword validates', () => {
  const hash = hashPassword('mySecretPass123');
  assert.ok(hash !== 'mySecretPass123');
  assert.equal(verifyPassword('mySecretPass123', hash), true);
  assert.equal(verifyPassword('wrongPass', hash), false);
});

test('generateOtp produces a 6-digit numeric string', () => {
  const otp = generateOtp();
  assert.equal(otp.length, 6);
  assert.ok(/^\d{6}$/.test(otp));
});

test('formatBangladeshiPhone formats 11-digit local numbers to international E.164', () => {
  const formatted1 = formatBangladeshiPhone('01712345678');
  assert.equal(formatted1.isValid, true);
  assert.equal(formatted1.formatted, '+8801712345678');

  const formatted2 = formatBangladeshiPhone('+8801812345678');
  assert.equal(formatted2.isValid, true);
  assert.equal(formatted2.formatted, '+8801812345678');

  const invalid = formatBangladeshiPhone('12345');
  assert.equal(invalid.isValid, false);
});
