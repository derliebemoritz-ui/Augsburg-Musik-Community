/** Fisher-Yates-Shuffle (unveränderte Gewichtung, für die Genre-Reihenfolge). */
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Gewichtete Zufalls-Permutation ohne Zurücklegen (Efraimidis-Spirakis-
 * Verfahren): jedem Element wird der Schlüssel `random() ** (1/weight)`
 * zugewiesen, absteigend sortiert ergibt das eine gewichtete Reihenfolge.
 * Tracks mit höherem Gewicht landen im Erwartungswert weiter vorne bzw.
 * werden bei mehreren Ziehungen häufiger früh gewählt.
 */
export function weightedShuffle<T>(items: T[], getWeight: (item: T) => number): T[] {
  return items
    .map((item) => ({
      item,
      key: Math.pow(Math.random(), 1 / Math.max(getWeight(item), 0.0001)),
    }))
    .sort((a, b) => b.key - a.key)
    .map((entry) => entry.item);
}
