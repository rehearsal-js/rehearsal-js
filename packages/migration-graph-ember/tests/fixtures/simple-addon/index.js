'use strict';

const { name } = require('./package');

module.exports = {
  name,
  isDevelopingAddon: () => true,
  includeTestsInHost: true,
};
