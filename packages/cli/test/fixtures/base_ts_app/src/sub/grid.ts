import { generateRandomGrid } from "../gen-random-grid";

export class Grid {
  generate(dimensions) {
    return generateRandomGrid(dimensions)
  }
}

