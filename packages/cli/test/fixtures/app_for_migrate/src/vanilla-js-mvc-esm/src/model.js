export class Model {
  /**
   * @param {Store} storage the storage object to use
   * */
  constructor(storage) {
    this.storage = storage;
  }

  /**
   * Creates a new todo model
   * @param {string} title The title of the task
   * @param {function} callback The callback to fire after the model is created
   * */
  create(title, callback) {
    title = title || '';
    callback = callback || function () {};

    const newItem = {
      title: title.trim(),
      completed: false
    };

    this.storage.save(newItem, callback);
  }

  /**
   * Finds and returns a model in storage. If no query is given it'll simply
   *
   * @param {string|number|object} query A query to match models against
   * @param {function} callback The callback to fire after the model is found
   *
   * @example
   * model.read(1, func); // Will find the model with an ID of 1
   * model.read('1'); // Same as above
   * Below will find a model with foo equalling bar and hello equalling world.
   * model.read({ foo: 'bar', hello: 'world' });
   * */
  read(query, callback) {
    const queryType = typeof query;
    callback = callback || function () {};

    if (queryType === 'function') {
      callback = query;
      return this.storage.findAll(callback);
    } else if (queryType === 'string' || queryType === 'number') {
      query = parseInt(query, 10);
      this.storage.find({ id: query }, callback);
    } else {
      this.storage.find(query, callback);
    }
  }

  /**
   * Will update the data of a todo item in storage based on the id it's given
   *
   * @param {number} id The ID of the element to update
   * @param {object} data The data to update, ex. {title: 'Buy some cookies'}
   * @param {function} callback The callback to fire after the update is complete
   * */
  update(id, data, callback) {
    this.storage.save(data, callback, id);
  }

  /**
   * Will remove an item from storage based on it's ID
   *
   * @param {number} id The ID of the item to remove
   * @param {function} callback The callback to fire after the removal is complete
   * */
  remove(id, callback) {
    this.storage.remove(id, callback);
  }

  /**
   * Will drop all storage
   *
   * @param {function} callback The callback to fire after the storage is dropped
   * */
  removeAll(callback) {
    this.storage.drop(callback);
  }

  /**
 * Returns a count of all todos
 */
  getCount(callback) {
    const todos = {
      active: 0,
      completed: 0,
      total: 0
    };

    this.storage.findAll(function (data) {
      data.forEach(function (todo) {
        if (todo.completed) {
          todos.completed++;
        } else {
          todos.active++;
        }

        todos.total++;
      });

      callback(todos);
    });
  }
}
