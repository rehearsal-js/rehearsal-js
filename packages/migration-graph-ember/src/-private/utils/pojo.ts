export function setNestedPropertyValue(obj: any, fields: any, val: any) {
  let cur = obj;
  const last = fields.pop();

  fields.forEach(function loop(field: any) {
    cur[field] = {};
    cur = cur[field];
  });

  cur[last] = val;

  return obj;
}

export function removeNestedPropertyValue(obj: any, fields: any) {
  let cur = obj;
  const last = fields.pop();

  fields.forEach(function loop(field: any) {
    cur = cur[field];
  });

  delete cur[last];

  return obj;
}
