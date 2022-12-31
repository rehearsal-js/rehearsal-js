
interface GitDescribe {
  tag: string;
  count: number;
  sha: string;
  dirty: boolean;
}

/* @ts-expect-error @rehearsal TODO TS2451: Cannot redeclare block-scoped variable 'VERSION_PATTERN'. */
const VERSION_PATTERN = /_(\d+\.\d+\.\d+)/;






/* @ts-expect-error @rehearsal TODO TS2393: Duplicate function implementation. */
function timestamp(inSeconds = false): number {
  return inSeconds ? Date.now() / 1000 : Date.now();
}

/* @ts-expect-error @rehearsal TODO TS2393: Duplicate function implementation. */
function parseLongDescribe(desc: string): GitDescribe {
  const result = /^(.+)-(\d+)-g([a-f0-9]+)(?:-(dirty))?$/.exec(desc);

  if (!result) {
    throw Error(`Unable to parse ${desc} as a long description`);
  }

  const [, tag, count, sha, dirty] = result;

  return {
    tag,
    count: parseInt(count, 10),
    sha,
    dirty: !!dirty,
  };
}

/* @ts-expect-error @rehearsal TODO TS2393: Duplicate function implementation. */
function normalizeVersionString(versionString: string): string {
  if (VERSION_PATTERN.test(versionString)) {
    const result = VERSION_PATTERN.exec(versionString);
    return result ? result[1] : versionString;
  }
  return versionString;
}
