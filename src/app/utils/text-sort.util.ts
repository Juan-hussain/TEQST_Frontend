export function extractNumericPrefix(title: string): number | null {
  const match = title.trim().match(/^(\d+)(?=[._-]|\s|$)/);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

export function compareTextTitlesNumerically(aTitle: string, bTitle: string): number {
  const aNum = extractNumericPrefix(aTitle);
  const bNum = extractNumericPrefix(bTitle);

  if (aNum !== null && bNum !== null && aNum !== bNum) {
    return aNum - bNum;
  }

  if (aNum !== null && bNum === null) {
    return -1;
  }

  if (aNum === null && bNum !== null) {
    return 1;
  }

  return aTitle.localeCompare(bTitle, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export function sortTextsNumerically<T extends {title: string}>(texts: T[]): T[] {
  return [...texts].sort((a, b) => compareTextTitlesNumerically(a.title, b.title));
}
