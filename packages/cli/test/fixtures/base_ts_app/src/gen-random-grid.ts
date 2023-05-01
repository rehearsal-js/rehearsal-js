// generate a random grid based on a set dimension and random alive/dead cells
export function generateRandomGrid(
  dimensions,
  chars = ['▄', ' ']
) {
  const grid = [];

  // create the grid
  for (let y = 0; y < dimensions[1]; y++) {
    const row = [];
    for (let x = 0; x < dimensions[0]; x++) {
      if (Math.random() > 0.5) {
        row.push(chars[0]);
      } else {
        row.push(chars[1]);
      }
    }

    grid.push(row);
  }

  return grid;
}
