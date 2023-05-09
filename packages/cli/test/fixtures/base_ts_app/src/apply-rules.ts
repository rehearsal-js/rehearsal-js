import {
  getLiveNeighborCount,
} from './get-live-neighbor-count.js';

export function applyRules(grid, cellCharState) {
  // clone the grid for the next generation
  const newGrid = grid.map((row) => [...row]);
  // keep track if all of the cells are dead and exit if so
  let totalLiveNeighbors = 0;

  // iterate over each cell, apply the rules and update cell state
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const cellState = grid[y][x];
      const liveNeighborCount = getLiveNeighborCount(
        grid,
        [y, x],
        [cellCharState[0], cellCharState[1]]
      );

      totalLiveNeighbors += liveNeighborCount;

      // check the current cell state and apply the rules
      if (cellState === cellCharState[0]) {
        if (liveNeighborCount < 2 || liveNeighborCount > 3) {
          // dead
          newGrid[y][x] = cellCharState[1];
        }

        if (liveNeighborCount == 2 || liveNeighborCount == 3) {
          // alive
          newGrid[y][x] = cellCharState[0];
        }
      } else {
        if (liveNeighborCount == 3) {
          // alive
          newGrid[y][x] = cellCharState[0];
        }
      }
    }
  }

  return [newGrid, totalLiveNeighbors];
}
