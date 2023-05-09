import Helper from '@ember/component/helper';


export default class AffixHelper extends Helper {
  override compute([base], { prefix, suffix }) {
    return `${prefix ?? ''}${base}${suffix ?? ''}`;
  }
}
