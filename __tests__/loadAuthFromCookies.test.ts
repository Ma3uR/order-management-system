import { cookies } from 'next/headers';
import { loadAuthFromCookies } from '@/app/lib/utils/auth.server';
import pb from '@/app/lib/pocketbase';

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('@/app/lib/pocketbase', () => ({
  authStore: {
    isValid: false,
    loadFromCookie: jest.fn(),
  },
}));

describe('loadAuthFromCookies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset pb.authStore.isValid to false before each test
    pb.authStore.isValid = false;
  });

  it('should set pb.authStore.isValid to true with valid pb_auth cookie', async () => {
    const fakeCookieValue = 'fake_token';
    
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: fakeCookieValue })
    });

    pb.authStore.loadFromCookie = jest.fn().mockImplementation(() => {
      pb.authStore.isValid = true;
    });

    const result = await loadAuthFromCookies();
    expect(pb.authStore.loadFromCookie).toHaveBeenCalledWith('pb_auth=' + fakeCookieValue);
    expect(pb.authStore.isValid).toBe(true);
    expect(result).toBe(true);
  });

  it('should return false if no pb_auth cookie is present', async () => {
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(null)
    });

    const result = await loadAuthFromCookies();
    expect(result).toBe(false);
    expect(pb.authStore.loadFromCookie).not.toHaveBeenCalled();
  });

  it('should return false if pb_auth cookie has empty value', async () => {
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: '' })
    });

    const result = await loadAuthFromCookies();
    expect(result).toBe(false);
    expect(pb.authStore.loadFromCookie).not.toHaveBeenCalled();
  });

  it('should return false if pb_auth cookie value is null', async () => {
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: null })
    });

    const result = await loadAuthFromCookies();
    expect(result).toBe(false);
    expect(pb.authStore.loadFromCookie).not.toHaveBeenCalled();
  });

  it('should return false if pb.authStore.isValid remains false after loading cookie', async () => {
    const fakeCookieValue = 'invalid_token';
    
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: fakeCookieValue })
    });

    // Mock loadFromCookie to not set isValid to true (simulating invalid token)
    pb.authStore.loadFromCookie = jest.fn().mockImplementation(() => {
      pb.authStore.isValid = false;
    });

    const result = await loadAuthFromCookies();
    expect(pb.authStore.loadFromCookie).toHaveBeenCalledWith('pb_auth=' + fakeCookieValue);
    expect(pb.authStore.isValid).toBe(false);
    expect(result).toBe(false);
  });
});

