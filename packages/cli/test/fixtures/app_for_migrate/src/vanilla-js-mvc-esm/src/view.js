import {
  qs,
  qsa,
  $on,
  $parent,
  $delegate
} from './helpers.js';

export class View {
  constructor(template) {
    this.template = template;

    this.ENTER_KEY = 13;
    this.ESCAPE_KEY = 27;

    this.$todoList = qs('.todo-list');
    this.$todoItemCounter = qs('.todo-count');
    this.$clearCompleted = qs('.clear-completed');
    this.$main = qs('.main');
    this.$footer = qs('.footer');
    this.$toggleAll = qs('.toggle-all');
    this.$newTodo = qs('.new-todo');
  }

  _removeItem(id) {
    let elem = qs('[data-id="' + id + '"]');
    if (elem) {
      this.$todoList.removeChild(elem);
    }
  }

  _clearCompletedButton(completedCount, visible) {
    this.$clearCompleted.innerHTML = this.template.clearCompletedButton(completedCount);
    this.$clearCompleted.style.display = visible ? 'block' : 'none';
  }

  _setFilter(currentPage) {
    qsa('.filters .selected').forEach(el => el.className = '');
    qs('.filters [href="#/' + currentPage + '"]').className = 'selected';
  }

  _elementComplete(id, completed) {
    let listItem = qs('[data-id="' + id + '"]');
    if (!listItem) {
      return;
    }
    listItem.className = completed ? 'completed' : '';
    qsa('input', listItem).forEach(el => el.checked = completed);
  }

  _editItemDone(id, title) {
    let listItem = qs('[data-id="' + id + '"]');
    let input = qs('input.edit', listItem);
    listItem.removeChild(input);
    listItem.className = listItem.className.replace('editing', '');
    qsa('label', listItem).forEach(el => el.textContent = title);
  }

  render(viewCmd, parameter) {
    let self = this;
    let viewCommands = {
      showEntries: function () {
        self.$todoList.innerHTML = self.template.show(parameter);
      },
      removeItem: function () {
        self._removeItem(parameter);
      },
      updateElementCount: function () {
        self.$todoItemCounter.innerHTML = self.template.itemCounter(parameter);
      },
      clearCompletedButton: function () {
        self._clearCompletedButton(parameter.completed, parameter.visible);
      },
      contentBlockVisibility: function () {
        self.$main.style.display = self.$footer.style.display = parameter.visible ? 'block' : 'none';
      },
      toggleAll: function () {
        self.$toggleAll.checked = parameter.checked;
      },
      setFilter: function () {
        self._setFilter(parameter);
      },
      clearNewTodo: function () {
        self.$newTodo.value = '';
      },
      elementComplete: function () {
        self._elementComplete(parameter.id, parameter.completed);
      },
      editItem: function () {
        let listItem = qs('[data-id="' + parameter.id + '"]');
        listItem.className = listItem.className + ' editing';
        let input = document.createElement('input');
        input.className = 'edit';
        listItem.appendChild(input);
        input.focus();
      },
      editItemDone: function () {
        self._editItemDone(parameter.id, parameter.title);
      }
    };
    viewCommands[viewCmd]();
  }

  bind(event, handler) {
    let self = this;
    if (event === 'newTodo') {
      $on(self.$newTodo, 'change', function () {
        handler(self.$newTodo.value);
      });
    } else if (event === 'removeCompleted') {
      $on(self.$clearCompleted, 'click', function () {
        handler();
      });
    } else if (event === 'toggleAll') {
      $on(self.$toggleAll, 'click', function () {
        handler({completed: this.checked});
      });
    } else if (event === 'itemEdit') {
      $delegate(self.$todoList, 'li label', 'dblclick', function () {
        handler({id: self._itemId(this)});
      });
    } else if (event === 'itemRemove') {
      $delegate(self.$todoList, '.destroy', 'click', function () {
        handler({id: self._itemId(this)});
      });
    } else if (event === 'itemToggle') {
      $delegate(self.$todoList, '.toggle', 'click', function () {
        handler({
          id: self._itemId(this),
          completed: this.checked
        });
      });
    } else if (event === 'itemEditDone') {
      $delegate(self.$todoList, 'li .edit', 'blur', function () {
        if (!this.dataset.iscanceled) {
          handler({
            id: self._itemId(this),
            title: this.value
          });
        }
      });
      $delegate(self.$todoList, 'li .edit', 'keypress', function (event) {
        if (event.keyCode === self.ENTER_KEY) {
          // Remove the cursor from the input when you hit enter just like if it were a real form
          this.blur();
        }
      });
    } else if (event === 'itemEditCancel') {
      $delegate(self.$todoList, 'li .edit', 'keyup', function (event) {
        if (event.keyCode === self.ESCAPE_KEY) {
          this.dataset.iscanceled = true;
          this.blur();
          handler({id: self._itemId(this)});
        }
      });
    }
  }

  _itemId(element) {
    let li = $parent(element, 'li');
    return parseInt(li.dataset.id, 10);
  }

  _bindItemEditCancel(handler) {
    let self = this;
    $delegate(self.$todoList, 'li .edit', 'keyup', function (event) {
      if (event.keyCode === self.ESCAPE_KEY) {
        this.dataset.iscanceled = true;
        this.blur();

        handler({id: self._itemId(this)});
      }
    });
  }
}
