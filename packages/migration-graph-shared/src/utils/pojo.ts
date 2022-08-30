/* eslint-disable @typescript-eslint/no-explicit-any */
export function setNestedPropertyValue(obj: any, fields: any, val: any): any {
  let cur = obj;
  const last = fields.pop();

  fields.forEach(function loop(field: any) {
    cur[field] = {};
    cur = cur[field];
  });

  cur[last] = val;

  return obj;
}

export function removeNestedPropertyValue(obj: any, fields: Array<string> = []): any {
  let cur = obj;

  const last = fields.pop();

  if (!last) {
    throw new Error(
      'Unable to remove nested property value in object; parameter fields is empty. '
    );
  }

  fields.forEach((field: string) => {
    cur = cur[field];
  });

  delete cur[last];

  return obj;
}
