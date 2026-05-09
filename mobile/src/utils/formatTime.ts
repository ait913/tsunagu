export function formatTime(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) {
    return "—";
  }

  const wholeSeconds = Math.max(0, Math.floor(sec));
  const minutes = Math.floor(wholeSeconds / 60);
  const seconds = wholeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
