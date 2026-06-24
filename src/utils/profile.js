const DEFAULT_PROFILE_URL = 'https://github.com';

export function getProfileDisplayData(profile) {
  return {
    avatarUrl:
      profile.avatar_url ||
      `https://github.com/identicons/${encodeURIComponent(profile.login)}.png`,
    name: profile.name || 'User Full Name Not Set',
    company: profile.company || 'Company Name Not Set',
    profileUrl: profile.html_url || DEFAULT_PROFILE_URL,
  };
}
