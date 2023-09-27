import { hbs } from "ember-cli-htmlbars";
import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render, settled } from "@ember/test-helpers";
import { defer } from "rsvp";
import sinon from "sinon";
import { setupTracking } from "ember-cli-pemberly-tracking/test-support";

module("Integration | Component | asset-loader@deferred-asset-loader", function (hooks) {
  setupRenderingTest(hooks);
  setupTracking(hooks);

  hooks.beforeEach(function () {
    // @ts-expect-error @rehearsal TODO TS2339: Property 'defer' does not exist on type 'TestContext'.
    this.defer = defer();
    // @ts-expect-error @rehearsal TODO TS2339: Property 'loadBundleStub' does not exist on type 'TestContext'.
    this.loadBundleStub = sinon.stub().returns(this.defer.promise);
    this.owner.register("service:asset-loader");
    const assetLoaderService = this.owner.lookup("service:asset-loader");
    // @ts-expect-error @rehearsal TODO TS2339: Property 'loadBundle' does not exist on type 'Service'.
    assetLoaderService.loadBundle = this.loadBundleStub;
  });

  /**
   * @Steps:
   *   ACTION render component in inline form
   *   ASSERT fulfilled component is not rendered yet
   *   ACTION wait for promise to resolve (we do it manually here)
   *   ASSERT asset-loader service was called with the correct bundle name
   *   ASSERT fulfilled component is rendered
   */
  test("it works in inline form", async function (assert) {
    assert.expect(3);

    await render(hbs`
      <AssetLoader$DeferredAssetLoader @bundle="custom-bundle" @fulfilledComponent={{component "artdeco-button" class="test-dummy-component"}}/>`);

    assert
      // @ts-expect-error @rehearsal TODO TS2339: Property 'dom' does not exist on type 'Assert'.
      .dom(".test-dummy-component")
      .doesNotExist("dummy is not initially rendered");

    // @ts-expect-error @rehearsal TODO TS2339: Property 'defer' does not exist on type 'TestContext'.
    this.defer.resolve({});
    await settled();

    assert.ok(
      // @ts-expect-error @rehearsal TODO TS2339: Property 'loadBundleStub' does not exist on type 'TestContext'.
      this.loadBundleStub.calledWithExactly("custom-bundle"),
      "asset-loader service was called with correct bundle name"
    );

    // @ts-expect-error @rehearsal TODO TS2339: Property 'dom' does not exist on type 'Assert'.
    assert.dom(".test-dummy-component").exists("dummy is rendered");
  });
});
