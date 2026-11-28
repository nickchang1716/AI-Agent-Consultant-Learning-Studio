import { describe, expect, it } from 'vitest';
import { mapAuthError, validateEmail, validatePassword, validateSignUp } from '../src/lib/authValidation';

describe('validateEmail', () => {
  it('合法 Email 通過，前後空白會被去除', () => {
    expect(validateEmail('a@b.co')).toBeNull();
    expect(validateEmail('  user@example.com  ')).toBeNull();
  });
  it('缺 @、無網域、空字串被拒絕', () => {
    expect(validateEmail('abc.example.com')).not.toBeNull();
    expect(validateEmail('a@b')).not.toBeNull();
    expect(validateEmail('a@.com')).not.toBeNull();
    expect(validateEmail('   ')).not.toBeNull();
  });
  it('超過 254 字元被拒絕', () => {
    expect(validateEmail(`${'a'.repeat(250)}@b.co`)).not.toBeNull();
    expect(validateEmail(`${'a'.repeat(240)}@b.co`)).toBeNull();
  });
});

describe('validatePassword', () => {
  it('少於 8 碼拒絕', () => {
    expect(validatePassword('abc123')).not.toBeNull();
    expect(validatePassword('abcd123')).not.toBeNull();
  });
  it('超過 72 碼拒絕，72 碼通過', () => {
    expect(validatePassword('a1'.repeat(37))).not.toBeNull();
    expect(validatePassword('a1'.repeat(36))).toBeNull();
  });
  it('多位元組字元以 bytes 計算：不足 72 字元但超過 72 bytes 也拒絕', () => {
    expect(validatePassword(`a1${'密'.repeat(24)}`)).not.toBeNull();
    expect(validatePassword(`a1${'密'.repeat(10)}`)).toBeNull();
  });
  it('純數字或純英文拒絕', () => {
    expect(validatePassword('12345678')).toContain('英文');
    expect(validatePassword('abcdefgh')).toContain('數字');
  });
  it('8~72 碼英數混合通過', () => {
    expect(validatePassword('abcd1234')).toBeNull();
    expect(validatePassword('Passw0rd!')).toBeNull();
  });
});

describe('validateSignUp', () => {
  it('兩次密碼不一致拒絕', () => {
    expect(validateSignUp('a@b.co', 'abcd1234', 'abcd12345')).toBe('兩次輸入的密碼不一致。');
  });
  it('依序檢查：Email 先於密碼', () => {
    expect(validateSignUp('bad', 'x', 'y')).toBe(validateEmail('bad'));
    expect(validateSignUp('a@b.co', 'short1', 'short1')).toBe(validatePassword('short1'));
  });
  it('全部合法通過', () => {
    expect(validateSignUp('a@b.co', 'abcd1234', 'abcd1234')).toBeNull();
  });
});

describe('mapAuthError', () => {
  it('登入失敗統一訊息，不洩漏帳號是否存在', () => {
    const a = mapAuthError('Invalid login credentials');
    expect(a).toBe('帳號或密碼錯誤，請重新確認。');
    expect(mapAuthError('invalid_credentials')).toBe(a);
    expect(a).not.toMatch(/不存在|找不到|未註冊/);
  });
  it('Email not confirmed', () => {
    expect(mapAuthError('Email not confirmed')).toContain('尚未完成信箱驗證');
  });
  it('User already registered', () => {
    expect(mapAuthError('User already registered')).toContain('已被註冊');
    expect(mapAuthError('A user has already been registered')).toContain('已被註冊');
  });
  it('Signups not allowed', () => {
    expect(mapAuthError('Signups not allowed for this instance')).toContain('暫停開放');
    expect(mapAuthError('Signup is disabled')).toContain('暫停開放');
  });
  it('rate limit', () => {
    expect(mapAuthError('email rate limit exceeded')).toContain('嘗試次數過多');
    expect(mapAuthError('Too many requests')).toContain('嘗試次數過多');
    expect(mapAuthError('over_request_rate_limit')).toContain('嘗試次數過多');
  });
  it('密碼強度 vs 新舊密碼相同', () => {
    expect(mapAuthError('Password should be at least 8 characters')).toContain('不符合強度');
    expect(mapAuthError('New password should be different from the old password.')).toContain('不可與目前密碼相同');
    expect(mapAuthError('same_password')).toContain('不可與目前密碼相同');
  });
  it('未知或空白錯誤不會顯示空白或 [object Object]', () => {
    expect(mapAuthError('')).toBe('發生未知錯誤，請稍後再試。');
    expect(mapAuthError('[object Object]')).toBe('發生未知錯誤，請稍後再試。');
    expect(mapAuthError('Something odd')).toContain('Something odd');
  });
});
