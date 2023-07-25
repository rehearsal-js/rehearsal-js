export default class MyComponent {
  missingParamTypes(a, b): void {
    a = 1;
    b = 2;
  }

  containsUnsupportedDiagnostic() {
    return function () {
      console.log(this);
    }.bind(this);
  }
}
