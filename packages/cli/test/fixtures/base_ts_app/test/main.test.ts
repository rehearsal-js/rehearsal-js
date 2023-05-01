/**
 * THIS FIXTURE SHOULD NOT HAVE TYPES AS REHEARSAL WILL PROVIDE THEM
 */


import { describe, expect, test } from 'vitest';
import {
  getLiveNeighborCount,
} from '../src/get-live-neighbor-count.js';
import {
  generateRandomGrid,
} from '../src/gen-random-grid.js';
import {
  applyRules,
} from '../src/apply-rules.js';


describe('generateRandomGrid()', () => {
  test('grid should be a square', () => {
    const grid = generateRandomGrid([2, 2]);
    expect(grid.length).toBe(2);
    expect(grid[0].length).toBe(2);
  });
  test('grid should be a rectangle', () => {
    const grid = generateRandomGrid([10, 3]);
    expect(grid.length).toBe(3);
    expect(grid[0].length).toBe(10);
  });
  test('grid cells should all be the same', () => {
    const grid = generateRandomGrid([5, 6], ['P', 'P']);
    expect(grid).toMatchSnapshot();
  });
});

describe('applyRules()', () => {
  test('the new grid should have all cells alive', () => {
    const dimensions = [4, 4];
    // set every cell to be alive
    const cellCharState = ['X', 'X'];
    const grid = generateRandomGrid(dimensions, cellCharState);
    const [newGrid, totalLiveNeighbors] = applyRules(grid, cellCharState);

    expect(newGrid).toMatchSnapshot();
    expect(totalLiveNeighbors).toBe(84);
  });
});

describe('getLiveNeighborCount()', () => {
  test('center cell should return all neighbors alive', () => {
    const dimensions = [5, 5];
    const cellCharState = ['X', 'X'];
    const grid = generateRandomGrid(dimensions, cellCharState);
    const neighbors = getLiveNeighborCount(grid, [2, 2], cellCharState);
    expect(neighbors).toBe(8);
  });
});
