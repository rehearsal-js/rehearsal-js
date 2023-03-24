function printType(num1: any): void {
  if (typeof num1 === "number") {
    console.log("is a number");
  } else if (typeof num1 === "string") {
    console.log("is a string");
  } else if (Array.isArray(num1)) {
    console.log("is an array");
  } else if (num1 === null) {
    console.log("is null");
  } else if (typeof num1 === "object") {
    console.log("is an object");
  } else {
    console.log("we do not know");
  }
}

printType(5);
