interface GetDrillDisplayNumberArgs {
  isMcPractice: boolean;
  qnum?: number | string | null;
  currentIndex: number;
}

export function getDrillDisplayNumber({
  isMcPractice,
  qnum,
  currentIndex,
}: GetDrillDisplayNumberArgs): number {
  if (isMcPractice) {
    return currentIndex + 1;
  }

  const qnumNum = Number(qnum);
  return Number.isFinite(qnumNum) && qnumNum > 0
    ? qnumNum
    : currentIndex + 1;
}
