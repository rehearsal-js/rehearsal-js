import { helper } from '@ember/component/helper';

function repeat(params) {
  return params[0].repeat(params[1]);
}

const repeatHelper = helper(repeat);

export default repeatHelper;
