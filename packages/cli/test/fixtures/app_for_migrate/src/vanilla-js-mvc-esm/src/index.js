/*global window, document */

import { Model } from './model.js';
import { View } from './view.js';
import { Controller } from './controller.js';
import { Store } from './store.js';
import { Template } from './template.js';
import { $on } from './helpers.js';

/**
 * Sets up a brand new Todo list.
 *
 * @param {string} name The name of your new to do list.
 */
class Todo {
  constructor(name) {
    this.storage = new Store(name);
    this.model = new Model(this.storage);
    this.template = new Template();
    this.view = new View(this.template);
    this.controller = new Controller(this.model, this.view);
  }
}

const todo = new Todo('todos-vanillajs');

function setView() {
  todo.controller.setView(document.location.hash);
}


$on(window, 'load', setView);
$on(window, 'hashchange', setView);
