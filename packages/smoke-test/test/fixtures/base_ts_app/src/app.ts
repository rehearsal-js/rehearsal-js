/*
RULES:
1. Any live cell with fewer than two live neighbours dies, as if by underpopulation.
2. Any live cell with two or three live neighbours lives on to the next generation.
3. Any live cell with more than three live neighbours dies, as if by overpopulation.
4. Any dead cell with exactly three live neighbours becomes a live cell, as if by reproduction.

These rules, which compare the behavior of the automaton to real life, can be condensed into the following:

  Any live cell with two or three live neighbours survives.
  Any dead cell with three live neighbours becomes a live cell.
  All other live cells die in the next generation. Similarly, all other dead cells stay dead.
*/

import { stdout } from 'node:process';
import { generateRandomGrid } from './gen-random-grid.js';
import { applyRules } from './apply-rules.js';

// basic just grab the args if they exist
// assume the are valid and in the right order
// gridWidth, gridHeight, cellAliveState, cellDeadState
const [_bin, _file, ...args] = process.argv;

if (!args.length || args.length < 4) {
  throw new Error(
    'You must provide 4 arguments: gridWidth, gridHeight, cellAliveState, cellDeadState'
  );
}

const [gridWidth, gridHeight, cellAliveState, cellDeadState] = args;

// the initial grid to kick things off
const GRID_SEED = generateRandomGrid(
  [parseInt(gridWidth), parseInt(gridHeight)],
  [cellAliveState, cellDeadState]
);

// when to stop
const RUN_LIMIT = 500;
// remove the terminal cursor so the grid renders nicely
stdout.write('\x1b[?25l');

// update the grid recursively on interval
(function update(prevGrid, runTally = 0) {
  // set the stdout cursor to the top left
  stdout.cursorTo(0, 0);

  // write the grid to console
  console.log(`\n\nGeneration: ${runTally}`);
  console.table(prevGrid);

  // should we stop running
  if (runTally >= RUN_LIMIT) {
    // put the cursor back
    stdout.write('\x1b[?25h');
    return;
  }

  const [newGrid, totalLiveNeighbors] = applyRules(prevGrid, [cellAliveState, cellDeadState]);

  // if all of the cells are dead, stop running
  if (totalLiveNeighbors === 0) {
    console.log(`Within ${runTally} generations. All cells are dead`);
    // put the cursor back
    stdout.write('\x1b[?25h');
    return;
  }

  // add a tally mark
  runTally++;

  // recursively call update again within a fps interval so we can throttle the grid updates
  setTimeout(() => {
    update(newGrid, runTally);
  }, 150);
})(GRID_SEED);
