const ColorHash = require(`color-hash`);
const colorHash = new ColorHash({
  lightness: [0.5, 0.6],
  saturation: [0.5, 0.6, 0.7],
  hash: str => Array.from(str).reduce((acc, char, index) => {
    return acc + ((char.charCodeAt() * (index + 1)) ** 2);
  }, 0),
});


/**
 * A data store for the fixture register.
 */
class Register {
  /**
   * Create a new register instance.
   * @param {Object} manufacturers An object of all known manufacturers like specified by the manufacturer schema.
   * @param {Object|null} register A register object to start with.
   */
  constructor(manufacturers, register) {
    if (register) {
      this.filesystem = register.filesystem;
      this.manufacturers = register.manufacturers;
      this.categories = register.categories;
      this.contributors = register.contributors;
      this.rdm = register.rdm;
      this.colors = register.colors;
    }
    else {
      this.filesystem = {};
      this.manufacturers = {};
      this.categories = {};
      this.contributors = {};
      this.rdm = {};
      this.colors = {};
    }

    this._manufacturerData = manufacturers;
  }

  /**
   * Add manufacturer information to the register.
   * @param {String} manKey The manufacturer key.
   * @param {Object} manufacturer The manufacturer data like specified by the manufacturer schema.
   */
  addManufacturer(manKey, manufacturer) {
    if (!(manKey in this.manufacturers)) {
      this.manufacturers[manKey] = [];
      this.colors[manKey] = colorHash.hex(manKey);
    }

    const rdmId = this._manufacturerData[manKey].rdmId;
    if (rdmId && !(rdmId in this.rdm)) {
      this.rdm[rdmId] = {
        key: manKey,
        models: {},
      };
    }
  }

  /**
   * Add fixture redirect information to the register.
   * @param {String} manKey The manufacturer key.
   * @param {String} fixKey The fixture (redirect) key.
   * @param {Object} redirectData The redirect data like specified by the fixture redirect schema.
   * @param {Object} redirectToData The fixture data of the redirectTo fixture like specified by the fixture schema.
   */
  addFixtureRedirect(manKey, fixKey, redirectData, redirectToData) {
    this.filesystem[`${manKey}/${fixKey}`] = {
      name: redirectData.name,
      redirectTo: redirectData.redirectTo,
      reason: redirectData.reason,
    };

    if (redirectData.reason === `SameAsDifferentBrand`) {
      // add to manufacturer register
      this._addFixtureToManufacturer(manKey, fixKey);

      // add to category register
      redirectToData.categories.forEach(category => {
        this._addFixtureToCategory(manKey, fixKey, category);
      });
    }
  }

  /**
   * Add fixture redirect information to the register.
   * @param {String} manKey The manufacturer key.
   * @param {String} fixKey The fixture (redirect) key.
   * @param {Object} fixData The fixture data like specified by the fixture schema.
   */
  addFixture(manKey, fixKey, fixData) {
    let lastAction = `modified`;
    let lastActionDate = fixData.meta.lastModifyDate;
    if (fixData.meta.lastModifyDate === fixData.meta.createDate) {
      lastAction = `created`;
    }
    else if (`importPlugin` in fixData.meta && new Date(fixData.meta.lastModifyDate) <= new Date(fixData.meta.importPlugin.date)) {
      lastAction = `imported`;
      lastActionDate = fixData.meta.importPlugin.date;
    }

    // add to filesystem register
    this.filesystem[`${manKey}/${fixKey}`] = {
      name: fixData.name,
      lastActionDate,
      lastAction,
    };

    // add to manufacturer register
    this._addFixtureToManufacturer(manKey, fixKey);

    // add to category register
    fixData.categories.forEach(category => {
      this._addFixtureToCategory(manKey, fixKey, category);
    });

    // add to contributor register
    fixData.meta.authors.forEach(contributor => {
      this._addFixtureToContributor(manKey, fixKey, contributor, lastActionDate);
    });

    // add to rdm register
    if (`rdm` in fixData && `rdmId` in this._manufacturerData[manKey]) {
      const rdmManufacturerId = this._manufacturerData[manKey].rdmId;
      const rdmModelId = fixData.rdm.modelId;
      this.rdm[rdmManufacturerId].models[rdmModelId] = fixKey;
    }
  }

  /**
   * @private
   * @param {String} manKey The manufacturer key.
   * @param {String} fixKey The fixture (redirect) key.
   */
  _addFixtureToManufacturer(manKey, fixKey) {
    if (!(manKey in this.manufacturers)) {
      this.manufacturers[manKey] = [];
    }
    this.manufacturers[manKey].push(fixKey);
  }

  /**
   * @private
   * @param {String} manKey The manufacturer key.
   * @param {String} fixKey The fixture (redirect) key.
   * @param {String} category The category to add this fixture to.
   */
  _addFixtureToCategory(manKey, fixKey, category) {
    if (!(category in this.categories)) {
      this.categories[category] = [];
    }
    this.categories[category].push(`${manKey}/${fixKey}`);
  }

  /**
   * @private
   * @param {String} manKey The manufacturer key.
   * @param {String} fixKey The fixture (redirect) key.
   * @param {String} contributor The contributor to add this fixture to.
   * @param {String} lastActionDate The most recent action of the added fixture.
   */
  _addFixtureToContributor(manKey, fixKey, contributor, lastActionDate) {
    if (!(contributor in this.contributors)) {
      this.contributors[contributor] = {
        lastActionDate,
        fixtures: [`${manKey}/${fixKey}`],
      };
    }
    else {
      this.contributors[contributor].fixtures.push(`${manKey}/${fixKey}`);

      if (lastActionDate > this.contributors[contributor].lastActionDate) {
        this.contributors[contributor].lastActionDate = lastActionDate;
      }
    }
  }

  /**
   * @returns {Object} The sorted register.
   */
  getAsSortedObject() {
    const sortedRegister = {
      filesystem: getObjectSortedByKeys(this.filesystem),
      manufacturers: getObjectSortedByKeys(this.manufacturers, fixtures => fixtures.sort(localeSort)),
      categories: getObjectSortedByKeys(this.categories, fixtures => fixtures.sort(localeSort)),
      contributors: {},
      rdm: {},
      colors: getObjectSortedByKeys(this.colors),
      lastUpdated: [],
    };

    // copy sorted contributors into register
    const sortedContributors = Object.keys(this.contributors).sort((nameA, nameB) => {
      const lastActionA = this.contributors[nameA].lastActionDate;
      const lastActionB = this.contributors[nameB].lastActionDate;

      // people with more recent contributions should come first
      if (lastActionA !== lastActionB) {
        return lastActionA > lastActionB ? -1 : 1;
      }

      return localeSort(nameA, nameB);
    }).filter(contributor => contributor !== `Anonymous`);
    sortedContributors.forEach(contributor => {
      sortedRegister.contributors[contributor] = {
        lastActionDate: this.contributors[contributor].lastActionDate,
        fixtures: this.contributors[contributor].fixtures.sort(localeSort),
      };
    });

    // if the dates are the same, the last action with higher priority
    // (which appears first in this array) is sorted before the other fixture
    const lastActionPriority = [`created`, `imported`, `modified`];

    // add fixture list sorted by lastActionDate
    sortedRegister.lastUpdated = Object.keys(this.filesystem).filter(
      fixKey => `lastActionDate` in this.filesystem[fixKey],
    ).sort((fixKeyA, fixKeyB) => {
      const fixA = this.filesystem[fixKeyA];
      const fixB = this.filesystem[fixKeyB];

      // most recently edited fixtures should come first
      const dateDelta = new Date(fixB.lastActionDate) - new Date(fixA.lastActionDate);
      if (dateDelta !== 0) {
        return dateDelta;
      }

      // if date is the same, look at what changed
      const actionDelta = lastActionPriority.indexOf(fixA.lastAction) - lastActionPriority.indexOf(fixB.lastAction);
      if (actionDelta !== 0) {
        return actionDelta;
      }

      return localeSort(fixKeyA, fixKeyB);
    });

    // copy sorted RDM data into register
    for (const manId of Object.keys(this.rdm).sort(localeSort)) {
      sortedRegister.rdm[manId] = {
        key: this.rdm[manId].key,
        models: getObjectSortedByKeys(this.rdm[manId].models),
      };
    }

    return sortedRegister;
  }
}

/**
 * @callback ItemMapFunction
 * @param {*} value
 * @returns {*}
 */

/**
 * @param {Object} obj The object to sort.
 * @param {ItemMapFunction|null} itemMapFunction A function to be invoked for every object value to process it (useful to sort array values).
 * @returns {Object} A new object with the same entries, sorted by keys.
 */
function getObjectSortedByKeys(obj, itemMapFunction) {
  const sortedObj = {};
  const keys = Object.keys(obj).sort(localeSort);

  for (const key of keys) {
    if (itemMapFunction) {
      sortedObj[key] = itemMapFunction(obj[key]);
    }
    else {
      sortedObj[key] = obj[key];
    }
  }

  return sortedObj;
}

/**
 * Function to pass into Array.sort().
 * @param {String} a The first string.
 * @param {String} b The second string.
 * @returns {Number} A number indicating the order of the two strings.
 */
function localeSort(a, b) {
  return a.localeCompare(b, `en`, {
    numeric: true,
  });
}

module.exports = {
  Register,
  getObjectSortedByKeys,
};
