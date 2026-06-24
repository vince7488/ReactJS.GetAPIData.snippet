import { describe, expect, it } from 'vitest';
import { getProfileDisplayData } from './profile';

describe('getProfileDisplayData', () => {
  it('uses GitHub profile values when they are present', () => {
    const result = getProfileDisplayData({
      avatar_url: 'https://example.com/avatar.png',
      company: 'Example Co.',
      html_url: 'https://github.com/example',
      login: 'example',
      name: 'Example User',
    });

    expect(result).toEqual({
      avatarUrl: 'https://example.com/avatar.png',
      company: 'Example Co.',
      name: 'Example User',
      profileUrl: 'https://github.com/example',
    });
  });

  it('provides readable fallbacks for missing optional values', () => {
    const result = getProfileDisplayData({ login: 'octocat' });

    expect(result.name).toBe('User Full Name Not Set');
    expect(result.company).toBe('Company Name Not Set');
    expect(result.profileUrl).toBe('https://github.com');
    expect(result.avatarUrl).toContain('octocat');
  });
});
