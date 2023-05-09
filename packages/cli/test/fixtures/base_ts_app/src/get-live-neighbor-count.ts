// based on a given cell, return the number of live neighbors
export function getLiveNeighborCount(
  grid,
  coords,
  cellCharState
) {
  const [x, y] = coords;

  // 8 neighbors
  const neighbors = [
    [x - 1, y - 1],
    [x - 1, y],
    [x - 1, y + 1],
    [x, y - 1],
    [x, y + 1],
    [x + 1, y - 1],
    [x + 1, y],
    [x + 1, y + 1],
  ];

  // iterate over neighbors
  const liveNeighbors = neighbors.filter(([x, y]) => {
    // handle out of bounds
    if (x < 0 || y < 0 || x >= grid.length || y >= grid.length) {
      return false;
    }

    // if alive add a tally mark
    if (grid[x][y] === cellCharState[0]) {
      return true;
    }
  });

  return liveNeighbors.length;
}
