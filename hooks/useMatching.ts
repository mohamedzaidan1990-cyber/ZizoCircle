export interface UserProfile {
  interests: string[];
  ageGroup: string;
  gender: string;
  location: string;
}

export interface MatchResult {
  score: number;
  sharedInterests: string[];
}

// Must stay in adjacency order — matches profile-setup.tsx AGE_GROUPS
const AGE_GROUPS = ['18–24', '25–32', '33–40', '41–50', '50+'];

// Qatar neighbourhood clusters — within-cluster gets half credit
const LOCATION_CLUSTERS: Record<string, string> = {
  'Lusail Marina': 'lusail',
  'Lusail City':   'lusail',
  'Fox Hills':     'lusail',
  'The Pearl':     'central',
  'West Bay':      'central',
  'Corniche':      'central',
  'Katara':        'cultural',
  'Msheireb':      'cultural',
};

// 60% weight — each shared interest contributes proportionally.
// Denominator is the larger set so having more interests never inflates the score.
function scoreInterests(
  a: string[],
  b: string[],
): { points: number; shared: string[] } {
  const setB = new Set(b.map(s => s.toLowerCase()));
  const shared = a.filter(s => setB.has(s.toLowerCase()));
  const denominator = Math.max(a.length, b.length, 1);
  return { points: (shared.length / denominator) * 60, shared };
}

// 25% weight — same group = full, one step apart = half, two or more = zero.
function scoreAgeGroup(groupA: string, groupB: string): number {
  const iA = AGE_GROUPS.indexOf(groupA);
  const iB = AGE_GROUPS.indexOf(groupB);
  if (iA === -1 || iB === -1) return 0;
  const gap = Math.abs(iA - iB);
  if (gap === 0) return 25;
  if (gap === 1) return 12.5;
  return 0;
}

// 15% weight — exact match = full, same neighbourhood cluster = half, different = zero.
function scoreLocation(locA: string, locB: string): number {
  if (locA.toLowerCase() === locB.toLowerCase()) return 15;
  const clusterA = LOCATION_CLUSTERS[locA];
  const clusterB = LOCATION_CLUSTERS[locB];
  if (clusterA && clusterA === clusterB) return 7.5;
  return 0;
}

export function calculateMatch(userA: UserProfile, userB: UserProfile): MatchResult {
  const { points: interestPoints, shared: sharedInterests } = scoreInterests(
    userA.interests,
    userB.interests,
  );
  const agePoints      = scoreAgeGroup(userA.ageGroup, userB.ageGroup);
  const locationPoints = scoreLocation(userA.location, userB.location);

  const raw   = interestPoints + agePoints + locationPoints;
  const score = Math.min(100, Math.max(0, Math.round(raw)));

  return { score, sharedInterests };
}
