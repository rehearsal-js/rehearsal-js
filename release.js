// exec with `node release.js [major|minor|patch|prerelease|version] [alpha|beta|etc]`

const { execSync } = require('node:child_process');
const { argv } = require('node:process');
const semver = require('semver');
const { version } = require('./packages/cli/package.json');

const [_bin, _file, ...args] = argv;
const [release, prerelease] = args;

const invalidVersionMessage =
  'specify a version OR version increment "major", "minor", "patch" OR "prerelease" with prerelease identifier eg. "alpha", "beta"';

if (args.length < 1 || args.length >= 3) {
  throw new Error(invalidVersionMessage);
}

const newVersion = getNewReleaseVersion();

function getNewReleaseVersion() {
  if (
    release === 'major' ||
    release === 'minor' ||
    release === 'patch' ||
    release === 'prerelease'
  ) {
    return semver.inc(version, release, prerelease);
  } else if (semver.valid(release)) {
    return release;
  }
}

// confirm the version is good
console.log(`The current version is ${version}`);
console.log(`The new version will be ${newVersion}`);

// wait for user to confirm
const rl = require('node:readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Is this correct? YES will publish. NO will abort. (y/n) ', (answer) => {
  if (answer.toLocaleLowerCase() === 'y' || answer.toLocaleLowerCase() === 'yes') {
    console.log('Releasing...\n\n');
    publish();
  } else {
    console.log('Aborting release');
  }
  rl.close();
});

function publish() {
  // git reset
  const gitReset = `git reset --hard`;
  console.log(gitReset);
  execSync(gitReset);

  // git clean
  const gitClean = `git clean -fdx`;
  console.log(gitClean);
  execSync(gitClean);

  // replace the version in package json on all packages with version
  const bumpVersion = `pnpm -r version ${newVersion} --exact --no-git-tag-version`;
  console.log(bumpVersion);
  execSync(bumpVersion);

  // pnpm install recursive
  const pnpmInstall = `pnpm -r install`;
  console.log(pnpmInstall);
  execSync(pnpmInstall);

  // pnpm build recursive
  const pnpmBuild = `pnpm -r build`;
  console.log(pnpmBuild);
  execSync(pnpmBuild);

  // pnpm test
  const pnpmTest = `pnpm test`;
  console.log(pnpmTest);
  execSync(pnpmTest);

  // generate a changelog
  const pnpmChangelog = `pnpm changelog`;
  console.log(pnpmChangelog);
  execSync(pnpmChangelog);

  // commit everything
  const gitCommit = `git commit -am "release: ${newVersion}"`;
  console.log(gitCommit);
  execSync(gitCommit);

  // push it
  const gitPush = `git push`;
  console.log(gitPush);
  execSync(gitPush);

  // git tag
  const gitTag = `git tag ${version}`;
  console.log(gitTag);
  execSync(gitTag);

  // push tags
  const gitPushTags = `git push origin --tags`;
  console.log(gitPushTags);
  execSync(gitPushTags);

  // publish
  const pnpmPublish = `pnpm -r publish`;
  console.log(pnpmPublish);
  execSync(pnpmPublish);

  // done
  console.log(`Released ${newVersion} has been published`);
}
