// Level Designer Data Archive Storage Utility
const STORAGE_KEY = 'td_director_data_archive_v1';

export const INITIAL_ARCHIVE_DATA = [
  {
    id: 'run-sample-1',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    sessionType: 'real_gameplay',
    levelName: 'Twin Valleys',
    status: 'victory',
    totalTimeSeconds: 248,
    setupTimeSeconds: 154,
    battleTimeSeconds: 94,
    phasesCompleted: 4,
    totalPhases: 4,
    startingGold: 550,
    goldEarned: 1340,
    goldSpent: 1680,
    netEndGold: 210,
    shieldsRemaining: 2,
    maxShields: 3,
    leaks: 1,
    enemiesSpawned: 58,
    enemiesDefeated: 57,
    towersPlacedCount: 11,
    categoryBreakdown: {
      physical: { count: 5, spent: 780, percent: 46.4 },
      magical: { count: 3, spent: 480, percent: 28.6 },
      support: { count: 1, spent: 180, percent: 10.7 },
      economy: { count: 1, spent: 140, percent: 8.3 },
      cryo: { count: 1, spent: 100, percent: 6.0 }
    },
    buffDebuffMetrics: {
      pylonDpsBoostPct: 22.5,
      cryoSlowTimeSeconds: 42.0,
      harvesterBonusGold: 160,
      shieldsAbsorbed: 1
    },
    difficultyCurveImpact: {
      expectedTTK: 6.8,
      actualTTK: 7.4,
      armorMitigationPct: 28.4,
      magicMitigationPct: 18.2,
      difficultyRating: 'Balanced - Medium Tension'
    },
    designerNotes: 'Solid chokepoint funneling. Cryo + Gatling synergy at midgate prevented Phase 3 swarm breach.'
  }
];

export function getArchiveRuns() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ARCHIVE_DATA));
      return INITIAL_ARCHIVE_DATA;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read archive runs:', err);
    return INITIAL_ARCHIVE_DATA;
  }
}

export function saveArchiveRun(runData) {
  try {
    const existing = getArchiveRuns();
    const newRun = {
      id: `run-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      ...runData
    };
    const updated = [newRun, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newRun;
  } catch (err) {
    console.error('Failed to save archive run:', err);
    return null;
  }
}

export function deleteArchiveRun(id) {
  try {
    const existing = getArchiveRuns();
    const updated = existing.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to delete archive run:', err);
    return [];
  }
}

export function clearArchive() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  } catch (err) {
    console.error('Failed to clear archive:', err);
    return [];
  }
}
