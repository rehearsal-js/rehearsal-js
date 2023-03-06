/**
 * Takes a model and view and acts as the controller between them
 *
 * @constructor
 * @param {Model} model The model instance
 * @param {View} view The view instance
 */

class Controller {
  constructor(model, view) {
    this.model = model;
    this.view = view;

    this.view.bind('newTodo', title => this.addItem(title));
    this.view.bind('itemEdit', item => this.editItem(item.id));
    this.view.bind('itemEditDone', item => this.editItemSave(item.id, item.title));
    this.view.bind('itemEditCancel', item => this.editItemCancel(item.id));
    this.view.bind('itemRemove', item => this.removeItem(item.id));
    this.view.bind('itemToggle', item => this.toggleComplete(item.id, item.completed));
    this.view.bind('removeCompleted', () => this.removeCompletedItems());
    this.view.bind('toggleAll', status => this.toggleAll(status.completed));
  }

  /**
   * Loads and initialises the view
   *  @param {string} 'active' | 'completed'
   * */
  setView(locationHash) {
    const route = locationHash.split('/')[1];
    const page = route || '';
    this._updateFilterState(page);
  }

  /**
   * An event to fire on load. Will get all items and display them in the todo-list
   * */
  showAll() {
    this.model.read(data => this.view.render('showEntries', data));
  }

  /**
   * Renders all active tasks
   * */
  showActive() {
    this.model.read({ completed: false }, data => this.view.render('showEntries', data));
  }

  /**
   * Renders all completed tasks
   * */
  showCompleted() {
    this.model.read({ completed: true }, data => this.view.render('showEntries', data));
  }

  /**
   * An event to fire whenever you want to add an item. Simply pass in the event
   * object and it'll handle the DOM insertion and saving of the new item.
   * */
  addItem(title) {
    if (title.trim() === '') {
      return;
    }

    this.model.create(title, () => {
      this.view.render('clearNewTodo');
      this._filter(true);
    });
  }

  /**
   * Triggers the item editing mode.
   * */
  editItem(id) {
    this.model.read(id, data => this.view.render('editItem', { id, title: data[0].title }));
  }

  /**
   * Finishes the item editing mode successfully.
   * */
  editItemSave(id, title) {
    let self = this;
    title = title.trim();

    if (title.length !== 0) {
      self.model.update(id, {title: title}, function () {
        self.view.render('editItemDone', {id: id, title: title});
      });
    } else {
      self.removeItem(id);
    }
  }

  /**
   * Cancels the item editing mode.
   * */
  editItemCancel(id) {
    this.model.read(id, data => this.view.render('editItemDone', { id, title: data[0].title }));
  }

/**
 * By giving it an ID it'll find the DOM element matching that ID,
 * remove it from the DOM and also remove it from storage.
 *
 * @param {number} id The ID of the item to remove from the DOM and storage
 */
  removeItem(id) {
    let self = this;
    self.model.remove(id, () => self.view.render('removeItem', id));
    self._filter();
  }

  /**
   * Will remove all completed items from the DOM and storage.
   * */
  removeCompletedItems() {
    let self = this;
    self.model.read({ completed: true }, data => {
      data.forEach(item => self.removeItem(item.id));
    });
  }

/**
 * Give it an ID of a model and a checkbox and it will update the item
 * in storage based on the checkbox's state.
 *
 * @param {number} id The ID of the element to complete or uncomplete
 * @param {object} completed The checkbox to check the state of complete or not
 * @param {boolean|undefined} silent Prevent re-filtering the todo items
 */
  toggleComplete(id, completed) {
    let self = this;
    self.model.update(id, { completed: completed }, function () {
      self.view.render('elementComplete', {
        id: id,
        completed: completed
      });
    });

    if (!silent) {
      self._filter();
    }
  }

  /**
   * Will toggle ALL checkboxes' on/off state and completeness of models.
   * Just pass in the event object.
   * */
  toggleAll(completed) {
    let self = this;
    self.model.read({ completed: !completed }, data => {
      data.forEach(item => self.toggleComplete(item.id, completed, true));
    });

    self._filter();
  }

  /**
   * Updates the pieces of the page which change depending on the remaining
   * number of todos.
   * */
  _updateCount() {
    let self = this;
    self.model.getCount(function (todos) {
      self.view.render('updateElementCount', todos.active);
      self.view.render('clearCompletedButton', {
        completed: todos.completed,
        visible: todos.completed > 0
      });

      self.view.render('toggleAll', {checked: todos.completed === todos.total});
      self.view.render('contentBlockVisibility', {visible: todos.total > 0});
    });
  }

/**
 * Re-filters the todo items, based on the active route.
 * @param {boolean|undefined} force  forces a re-painting of todo items.
 */
  _filter(completed) {
    let activeRoute = this._activeRoute.charAt(0).toUpperCase() + this._activeRoute.substr(1);

    // Update the elements on the page, which change with each completed todo
    this._updateCount();

    // If the last active route isn't "All", or we're switching routes, we
    // re-create the todo item elements, calling:
    //   this.show[All|Active|Completed]();
    if (force || this._lastActiveRoute !== 'All' || this._lastActiveRoute !== activeRoute) {
      this['show' + activeRoute]();
    }

    this._lastActiveRoute = activeRoute;
  }

  /**
   * Simply updates the filter nav's selected states
   * */
  _updateFilterState(currentPage) {
    // Store a reference to the active route, allowing us to re-filter todo
    // items as they are marked complete or incomplete.
    this._activeRoute = currentPage;

    if (currentPage === '') {
      this._activeRoute = 'All';
    }

    this._filter();

    this.view.render('setFilter', currentPage);
  }
}
