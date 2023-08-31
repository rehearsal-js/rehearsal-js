export class ProgressBar {
  private itemsTotal = 0;
  private itemsDone = 0;

  private timeStart = 0;
  private timeAverage = 0;
  private timeLast = Infinity;

  private testMode = false;

  constructor(total: number, testMode?: boolean) {
    this.testMode = !!testMode;
    this.reset(total);
  }

  get now(): number {
    return this.testMode ? 0 : Date.now();
  }

  get total(): number {
    return this.itemsTotal;
  }

  get done(): number {
    return this.itemsDone;
  }

  get left(): number {
    return this.itemsTotal - this.itemsDone;
  }

  get secondsPassed(): number {
    return Math.floor((this.timeLast - this.timeStart) / 1000);
  }

  get timePassed(): string {
    return this.secondsToTime(this.secondsPassed);
  }

  get secondsLeft(): number {
    return Math.ceil((this.timeAverage * this.left) / 1000);
  }

  get timeLeft(): string {
    return this.secondsToTime(this.secondsLeft);
  }

  reset(total: number): void {
    this.itemsTotal = total;
    this.itemsDone = 0;
    this.timeStart = this.now;
    this.timeAverage = 0;
    this.timeLast = this.now;
  }

  increment(): void {
    if (this.itemsDone === this.itemsTotal) {
      return;
    }

    const timeNow = this.now;
    const timeAfterIncrement = timeNow - this.timeLast;

    this.timeAverage =
      (this.timeAverage * this.itemsDone + timeAfterIncrement) / (this.itemsDone + 1);

    this.itemsDone += 1;
    this.timeLast = timeNow;
  }

  currentProgress(base = 100): number {
    return this.itemsDone > this.itemsTotal
      ? base
      : Math.floor((this.itemsDone * base) / this.itemsTotal);
  }

  printBar(base = 100, fillSymbol = '=', emptySymbol = '-'): string {
    const progress = this.currentProgress(base);
    return `${fillSymbol.repeat(progress)}${emptySymbol.repeat(base - progress)}`;
  }

  private secondsToTime(seconds: number): string {
    const time = new Date(0);
    time.setSeconds(seconds);
    const iso = time.toISOString();

    return iso.substring(11, 14) === '00' ? iso.substring(14, 19) : iso.substring(11, 19);
  }
}
