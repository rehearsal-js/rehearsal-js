import Route from '@ember/routing/route';

export default class ClassicRoute extends Route {
  override async model() {
    return { foo: 'hi' };
  }
}
