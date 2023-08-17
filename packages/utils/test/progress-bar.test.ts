import { describe, expect, test } from 'vitest';
import { ProgressBar } from '../src/index.js';

describe('progress bar', () => {
  test('workflow, real mode', async () => {
    const progress = new ProgressBar(3);

    expect(progress.done).toEqual(0);
    expect(progress.left).toEqual(3);
    expect(progress.secondsPassed).toEqual(0);
    expect(progress.timePassed).toEqual('00:00:00');
    expect(progress.secondsLeft).toEqual(0);
    expect(progress.timeLeft).toEqual('00:00:00');
    expect(progress.currentProgress(30)).toEqual(0);
    expect(progress.printBar(20)).toEqual('--------------------');

    await new Promise((r) => setTimeout(r, 1000));

    progress.increment();

    expect(progress.done).toEqual(1);
    expect(progress.left).toEqual(2);
    expect(progress.secondsPassed).toEqual(1);
    expect(progress.timePassed).toEqual('00:00:01');
    expect(progress.secondsLeft).toEqual(3);
    expect(progress.timeLeft).toEqual('00:00:03');
    expect(progress.currentProgress(30)).toEqual(10);
    expect(progress.printBar(20)).toEqual('======--------------');

    progress.increment();

    expect(progress.done).toEqual(2);
    expect(progress.left).toEqual(1);
    expect(progress.secondsPassed).toEqual(1);
    expect(progress.timePassed).toEqual('00:00:01');
    expect(progress.secondsLeft).toEqual(1);
    expect(progress.timeLeft).toEqual('00:00:01');
    expect(progress.currentProgress(30)).toEqual(20);
    expect(progress.printBar(20)).toEqual('=============-------');

    progress.increment();

    expect(progress.done).toEqual(3);
    expect(progress.left).toEqual(0);
    expect(progress.secondsPassed).toEqual(1);
    expect(progress.timePassed).toEqual('00:00:01');
    expect(progress.secondsLeft).toEqual(0);
    expect(progress.timeLeft).toEqual('00:00:00');
    expect(progress.currentProgress(30)).toEqual(30);
    expect(progress.printBar(20)).toEqual('====================');

    progress.increment();

    expect(progress.done).toEqual(3);
    expect(progress.left).toEqual(0);
    expect(progress.secondsPassed).toEqual(1);
    expect(progress.timePassed).toEqual('00:00:01');
    expect(progress.secondsLeft).toEqual(0);
    expect(progress.timeLeft).toEqual('00:00:00');
    expect(progress.currentProgress(30)).toEqual(30);
    expect(progress.printBar(20)).toEqual('====================');
  });

  test('workflow, test mode', async () => {
    const progress = new ProgressBar(3, true);

    expect(progress.done).toEqual(0);
    expect(progress.left).toEqual(3);
    expect(progress.secondsPassed).toEqual(0);
    expect(progress.timePassed).toEqual('00:00:00');
    expect(progress.secondsLeft).toEqual(0);
    expect(progress.timeLeft).toEqual('00:00:00');
    expect(progress.currentProgress(30)).toEqual(0);
    expect(progress.printBar(20)).toEqual('--------------------');

    await new Promise((r) => setTimeout(r, 1000));

    progress.increment();

    expect(progress.done).toEqual(1);
    expect(progress.left).toEqual(2);
    expect(progress.secondsPassed).toEqual(0);
    expect(progress.timePassed).toEqual('00:00:00');
    expect(progress.secondsLeft).toEqual(0);
    expect(progress.timeLeft).toEqual('00:00:00');
    expect(progress.currentProgress(30)).toEqual(10);
    expect(progress.printBar(20)).toEqual('======--------------');
  });

  test('reset', () => {
    const progress = new ProgressBar(3);

    expect(progress.done).toEqual(0);
    expect(progress.left).toEqual(3);
    expect(progress.secondsPassed).toEqual(0);
    expect(progress.timePassed).toEqual('00:00:00');
    expect(progress.secondsLeft).toEqual(0);
    expect(progress.timeLeft).toEqual('00:00:00');
    expect(progress.currentProgress(30)).toEqual(0);
    expect(progress.printBar(20)).toEqual('--------------------');

    progress.increment();
    progress.increment();

    progress.reset(50);

    expect(progress.done).toEqual(0);
    expect(progress.left).toEqual(50);
    expect(progress.secondsPassed).toEqual(0);
    expect(progress.timePassed).toEqual('00:00:00');
    expect(progress.secondsLeft).toEqual(0);
    expect(progress.timeLeft).toEqual('00:00:00');
    expect(progress.currentProgress(30)).toEqual(0);
    expect(progress.printBar(20)).toEqual('--------------------');
  });
});
