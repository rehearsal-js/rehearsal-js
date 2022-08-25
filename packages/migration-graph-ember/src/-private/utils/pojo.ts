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

export function removeNestedPropertyValue(obj: any, fields: any): any {
  let cur = obj;
  const last = fields.pop();

  fields.forEach(function loop(field: any) {
    cur = cur[field];
  });

  delete cur[last];

  return obj;
}
