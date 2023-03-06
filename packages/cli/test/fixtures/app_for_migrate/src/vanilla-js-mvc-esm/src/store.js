export class Store {
  constructor(name, callback) {
    callback = callback || function () {};
    this._dbName = name;
    if (!localStorage.getItem(name)) {
      const todos = [];
      localStorage.setItem(name, JSON.stringify(todos));
    }
    callback.call(this, JSON.parse(localStorage.getItem(name)));
  }

  /**
   * Finds items based on a query given as a JS object
   *
   * @param {object} query The query to match against (i.e. {foo: 'bar'})
   * */
  find(query, callback) {
    if (!callback) {
      return;
    }
    const todos = JSON.parse(localStorage.getItem(this._dbName));
    callback.call(this, todos.filter(function (todo) {
      for (let q in query) {
        if (query[q] !== todo[q]) {
          return false;
        }
      }
      return true;
    }));
  }

  /**
   *
   * Will retrieve all data from the collection
   *
   * @param {function} callback The callback to fire upon retrieving data
   * */
  findAll(callback) {
    callback = callback || function () {};
    callback.call(this, JSON.parse(localStorage.getItem(this._dbName)));
  }

  /**
   * Will save the given data to the DB. If no item exists it will create a new
   *
   * item, otherwise it'll simply update an existing item's properties
   *
   * @param {object} updateData The data to save back into the DB
   * @param {function} callback The callback to fire after saving
   * @param {number} id An optional param to enter an ID of an item to update
   * */
  save(updateData, callback, id) {
    const data = JSON.parse(localStorage.getItem(this._dbName));
    callback = callback || function () {};
    // If an ID was actually given, find the item and update each property
    if (id) {
      for (let i = 0; i < data.length; i++) {
        if (data[i].id === id) {
          for (let key in updateData) {
            data[i][key] = updateData[key];
          }
          break;
        }
      }
      localStorage.setItem(this._dbName, JSON.stringify(data));
      callback.call(this, data);
    } else {
      // Generate an ID
      updateData.id = new Date().getTime();
      data.push(updateData);
      localStorage.setItem(this._dbName, JSON.stringify(data));
      callback.call(this, [updateData]);
    }
  }

  /**
   * Will remove an item from the Store based on its ID
   *
   * @param {number} id The ID of the item you want to remove
   * @param {function} callback The callback to fire after saving
   * */
  remove(id, callback) {
    const data = JSON.parse(localStorage.getItem(this._dbName));
    for (let i = 0; i < data.length; i++) {
      if (data[i].id == id) {
        data.splice(i, 1);
        break;
      }
    }
    localStorage.setItem(this._dbName, JSON.stringify(data));
    callback.call(this, data);
  }

  /**
   * Will drop all storage and start fresh
   *
   * @param {function} callback The callback to fire after dropping the data
   * */
  drop(callback) {
    const data = [];
    localStorage.setItem(this._dbName, JSON.stringify(data));
    callback.call(this, data);
  }
}
