import { relative, resolve } from 'path';
import { sync } from 'fast-glob';
import { getInternalPackages } from '@rehearsal/migration-graph-ember';
import debug from 'debug';

import { Graph } from './utils/graph';
import { GraphNode } from './utils/graph-node';
import type { Arguments, Package, PackageNode } from './types';

const DEBUG_CALLBACK = debug('rehearsal:migration-graph');
const ROOT_PATH = process.cwd(); // getMpLocation();
const EXCLUDED_PACKAGES = ['test-harness'];
let ARGV: Arguments;

const parser = yargs.options({
  addons: {
    describe: 'Comma separated string of the addons to parse (ie. --addons global-utils, ...)',
    type: 'string',
  },
  interactive: {
    describe: 'Uses interactive mode',
    alias: 'i',
    type: 'boolean',
  },
  conversionLevel: {
    describe: "How much of a conversion are we talkin' here?",
    choices: ['full', 'source-only', 'source-and-tests'],
    default: 'source-only',
  },
  conversionExclusions: {
    describe:
      'A comma separated list of glob patterns for things that should NOT be considered for conversion',
    type: 'string',
  },
  includeDupes: {
    describe: 'Include duplicate entries in the output',
    type: 'boolean',
    default: false,
  },
  maxDepth: {
    describe: 'The maximum depth to traverse the dependency graph',
    type: 'number',
    default: 100,
  },
  output: {
    describe: 'the format of the output, JSON or DEBUG',
    type: 'string',
    default: 'DEBUG',
  },
});

function getChoices(addons: { [name: string]: Package }): string[] {
  const keys = Object.keys(addons);
  return keys.map((name: string) => {
    const addon: Package = addons[name];
    return {
      name: name,
      value: name,
      hint: relative(process.cwd(), addon.path),
    };
  });
}

function createPromptModule() {
  const discovered = getInternalPackages(ROOT_PATH).mappingsByAddonName;

  const choices = getChoices(discovered);

  return new Enquirer().prompt({
    name: 'addons',
    type: 'autocomplete',
    choices,
    scroll: true,
    sort: true,
    // limit isn't defined in the type yet: https://github.com/enquirer/enquirer/issues/95
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    limit: 10,
    maxChoices: 10,
    // misspelling in typedef prevents normal use: https://github.com/enquirer/enquirer/issues/318
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    multiple: true,
    message: 'Addon to get package dependencies',
    validate(selected) {
      if (!selected || selected.length === 0) {
        return "You have't selected any addons yet";
      }

      return true;
    },
    footer() {
      return `(${chalk.cyan.bold('<up>')} + ${chalk.cyan.bold(
        '<down>'
      )} to scroll, ${chalk.cyan.bold('<space>')} to select, type to filter, ${chalk.cyan.bold(
        '<enter>'
      )} to run)`;
    },
  });
}

function getExplicitPackageDependencies(pkg: Package): Package[] {
  const { mappingsByAddonName, mappingsByLocation } = getInternalPackages(ROOT_PATH);

  let explicitDependencies: Package[] = [];

  if (pkg.dependencies) {
    explicitDependencies = explicitDependencies.concat(
      ...(Object.keys(pkg.dependencies)?.map((depName) => mappingsByAddonName[depName]) ?? [])
    );
  }

  if (pkg.devDependencies) {
    explicitDependencies = explicitDependencies.concat(
      ...(Object.keys(pkg.devDependencies)?.map((devDepName) => mappingsByAddonName[devDepName]) ??
        [])
    );
  }

  if (pkg?.addonPaths?.length) {
    // get the package by location
    explicitDependencies = explicitDependencies.concat(
      pkg.addonPaths.map((addonPath) => mappingsByLocation[resolve(pkg.path, addonPath)])
    );
  }

  // TODO: read service calls and add them as dependencies

  return explicitDependencies.filter((dep) => !!dep && !EXCLUDED_PACKAGES.includes(dep.name));
}

// COMMENT from @hank
// this function may be able to be re-worked to just search inside the
// `addon` folder, as that is the only place TS code can live in an addon.
// Current approach is also fine, this is a nitpick comment.
function analyzeTypescriptConversionForPackage(pkg: Package) {
  const fastGlobConfig = {
    absolute: true,
    cwd: pkg.path,
    ignore: ['**/node_modules/**'],
  };
  // ignore a tests directory if we only want to consider the source
  if (ARGV.conversionLevel === 'source-only') {
    fastGlobConfig.ignore.push('**/tests/**');
  }

  // ignore some common .js files unless considering "full" conversion
  if (ARGV.conversionLevel !== 'full') {
    fastGlobConfig.ignore.push(
      ...['.ember-cli.js', 'ember-cli-build.js', 'ember-config.js', 'index.js', 'testem.js']
    );
  }

  // add any custom exclusions to the list
  if (ARGV.conversionExclusions) {
    fastGlobConfig.ignore.push(...ARGV.conversionExclusions.split(','));
  }

  // if there's a tsconfig
  const hasTSConfig = sync('tsconfig.json', fastGlobConfig);
  // if there aren't any .js files in addon (minus the ignore list)
  const hasJS = sync('**/*.js', fastGlobConfig);

  if (!!hasTSConfig?.length && !hasJS?.length) {
    return true;
  }
  return false;
}

function buildAnalyzedPackageTree(
  currentNode: GraphNode<PackageNode>,
  graph: Graph<PackageNode>,
  depth = 1
): Graph<PackageNode> {
  const explicitDependencies = getExplicitPackageDependencies(currentNode.content.pkg);
  explicitDependencies.forEach((pkgDep) => {
    const depNode = graph.addNode({
      key: pkgDep.path,
      pkg: pkgDep,
      converted: analyzeTypescriptConversionForPackage(pkgDep),
    });
    graph.addEdge(currentNode, depNode);
    if (depth < ARGV.maxDepth) {
      buildAnalyzedPackageTree(depNode, graph, depth + 1);
    }
  });
  return graph;
}

function reportAnalysis(entry: GraphNode<PackageNode>, graph: Graph<PackageNode>): void {
  // debug

  if (ARGV.output === 'DEBUG') {
    const sortedNodes: GraphNode<PackageNode>[] = graph.topSort();
    const pkgName: string = entry?.content?.pkg.name ?? '';

    console.log(
      `Order of conversion for ${chalk.bold(pkgName)}. ${chalk.red(
        'RED'
      )}: need conversion. ${chalk.green(
        'GREEN'
      )}: has been converted (according to conversionLevel)`
    );
    const reportedNodes: Set<string> = new Set();

    let taskNumber = 1;

    sortedNodes.forEach((node) => {
      const packageData = node.content;
      const packageName = packageData.pkg.name;
      const duplicate = reportedNodes.has(packageName) ? `${chalk.blue.bold('DUPLICATE')}` : '';

      if (!ARGV.includeDupes && !!duplicate.length) {
        return;
      }

      const relativePath = relative(process.cwd(), packageData.pkg.path);

      let taskString = `${taskNumber++}. ${packageData.pkg.name} (./${relativePath})`;
      const parentPkgName = node.parent?.content?.pkg.name;
      taskString = taskString.concat(`${chalk.white(` parent: ${parentPkgName}`)}`);

      if (ARGV.includeDupes && !!duplicate.length) {
        taskString = taskString.concat(` ${duplicate}`);
      }

      if (packageData.converted) {
        console.log(`${chalk.green(taskString)}`);
      } else {
        console.log(`${chalk.red(taskString)}`);
      }
      reportedNodes.add(packageName);
    });
  }
}

async function getPaths(): Promise<Package[]> {
  const { mappingsByAddonName } = getInternalPackages(ROOT_PATH);

  if (ARGV.interactive) {
    // COMMENT from @hank: believe this typecast below is the best we can do since Enquirer.prompt's
    // return type is Promise<object>, and we can't assign a Record<> to an object
    // because Record is a narrower type
    const { addons } = (await createPromptModule()) as Record<string, string[]>;
    return addons?.map((addonName) => mappingsByAddonName[addonName]) || [];
  }

  if (ARGV.addons) {
    return Promise.resolve(
      ARGV.addons.split(',').map((addonName) => mappingsByAddonName[addonName]) || []
    );
  }

  return Promise.reject(new Error('No paths selected'));
}

export async function getMigrationGraph() {
  const packages = await getPaths();
  // loop through each package
  const graph = new Graph<PackageNode>();
  packages.forEach((pkg) => {
    const entry = graph.addNode({
      key: pkg.path,
      pkg,
      converted: analyzeTypescriptConversionForPackage(pkg),
    });
    const analyzedTree = buildAnalyzedPackageTree(entry, graph);
    reportAnalysis(entry, analyzedTree);
  });
}
