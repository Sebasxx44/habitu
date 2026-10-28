import assert from 'node:assert/strict';
import test from 'node:test';
import { accountPath, safeReturnPath } from '@/modules/auth/services/returnPath.ts';

test('authentication keeps a local booking destination and rejects external redirects', () => {
  assert.equal(safeReturnPath('/cliente/book?service_id=42&branch_id=3#confirm'), '/cliente/book?service_id=42&branch_id=3#confirm');
  for (const path of ['https://evil.test', '//evil.test', '/\\evil.test', '/login?returnTo=/login', '/register', '/path\nlocation']) assert.equal(safeReturnPath(path), null);
  assert.equal(accountPath('/register', '?returnTo=%2Fcliente%2Fbook%3Fservice_id%3D42'), '/register?returnTo=%2Fcliente%2Fbook%3Fservice_id%3D42');
});
