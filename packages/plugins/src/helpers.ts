export function setProcessTTYto(setting: boolean): void {
  if (typeof process !== 'undefined') {
    process.stdout.isTTY = setting;
  }
}
