export function qs(selector, scope) {
  return (scope || document).querySelector(selector);
}

export function qsa(selector, scope) {
  return (scope || document).querySelectorAll(selector);
}

export function $on(target, type, callback, useCapture) {
  target.addEventListener(type, callback, !!useCapture);
}

export function $parent(element, tagName) {
  if (!element.parentNode) {
    return;
  }

  if (element.parentNode.tagName.toLowerCase() === tagName.toLowerCase()) {
    return element.parentNode;
  }

  return $parent(element.parentNode, tagName);
}

export function $delegate(target, selector, type, handler) {
  function dispatchEvent(event) {
    let targetElement = event.target;
    let potentialElements = qsa(selector, target);
    let hasMatch = Array.prototype.indexOf.call(potentialElements, targetElement) >= 0;

    if (hasMatch) {
      handler.call(targetElement, event);
    }
  }

  let useCapture = type === 'blur' || type === 'focus';
  $on(target, type, dispatchEvent, useCapture);
}
