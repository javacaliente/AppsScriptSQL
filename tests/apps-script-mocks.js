'use strict';

class MockRange {
  constructor(sheet, row, column, rowCount, columnCount) {
    if (row < 1 || column < 1 || rowCount < 1 || columnCount < 1) {
      throw new RangeError('Range coordinates and dimensions must be positive');
    }

    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.rowCount = rowCount;
    this.columnCount = columnCount;
  }

  getValue() {
    return this.sheet.readCell(this.row, this.column);
  }

  getValues() {
    var values = [];

    for (var rowOffset = 0; rowOffset < this.rowCount; rowOffset++) {
      var row = [];
      for (var columnOffset = 0; columnOffset < this.columnCount; columnOffset++) {
        row.push(this.sheet.readCell(this.row + rowOffset, this.column + columnOffset));
      }
      values.push(row);
    }

    return values;
  }

  setValue(value) {
    this.sheet.writeCell(this.row, this.column, value);
    return this;
  }

  setValues(values) {
    if (!Array.isArray(values) || values.length !== this.rowCount) {
      throw new RangeError('Values must match the range row count');
    }

    for (var rowOffset = 0; rowOffset < this.rowCount; rowOffset++) {
      if (!Array.isArray(values[rowOffset]) || values[rowOffset].length !== this.columnCount) {
        throw new RangeError('Values must match the range column count');
      }

      for (var columnOffset = 0; columnOffset < this.columnCount; columnOffset++) {
        this.sheet.writeCell(
          this.row + rowOffset,
          this.column + columnOffset,
          values[rowOffset][columnOffset]
        );
      }
    }

    return this;
  }
}

class MockSheet {
  constructor(name, rows) {
    this.name = name;
    this.rows = cloneRows(rows || []);
  }

  getName() {
    return this.name;
  }

  getLastRow() {
    for (var rowIndex = this.rows.length - 1; rowIndex >= 0; rowIndex--) {
      if (this.rows[rowIndex].some(isPopulated)) {
        return rowIndex + 1;
      }
    }

    return 0;
  }

  getLastColumn() {
    var lastColumn = 0;

    this.rows.forEach(function(row) {
      for (var columnIndex = row.length - 1; columnIndex >= 0; columnIndex--) {
        if (isPopulated(row[columnIndex])) {
          lastColumn = Math.max(lastColumn, columnIndex + 1);
          break;
        }
      }
    });

    return lastColumn;
  }

  getRange(row, column, rowCount, columnCount) {
    return new MockRange(
      this,
      row,
      column,
      rowCount === undefined ? 1 : rowCount,
      columnCount === undefined ? 1 : columnCount
    );
  }

  appendRow(values) {
    var destinationRow = this.getLastRow() + 1;
    for (var columnIndex = 0; columnIndex < values.length; columnIndex++) {
      this.writeCell(destinationRow, columnIndex + 1, values[columnIndex]);
    }
    return this;
  }

  deleteRow(rowPosition) {
    if (rowPosition < 1) {
      throw new RangeError('Row position must be positive');
    }
    this.rows.splice(rowPosition - 1, 1);
    return this;
  }

  deleteRows(rowPosition, howMany) {
    if (rowPosition < 1 || howMany < 1) {
      throw new RangeError('Row position and count must be positive');
    }
    this.rows.splice(rowPosition - 1, howMany);
    return this;
  }

  readCell(row, column) {
    var sourceRow = this.rows[row - 1];
    if (!sourceRow || sourceRow[column - 1] === undefined || sourceRow[column - 1] === null) {
      return '';
    }
    return sourceRow[column - 1];
  }

  writeCell(row, column, value) {
    while (this.rows.length < row) {
      this.rows.push([]);
    }
    while (this.rows[row - 1].length < column) {
      this.rows[row - 1].push('');
    }
    this.rows[row - 1][column - 1] = value;
  }

  snapshot() {
    return cloneRows(this.rows);
  }
}

class MockSpreadsheet {
  constructor(id, sheets) {
    this.id = id;
    this.sheets = sheets || [];
  }

  getId() {
    return this.id;
  }

  getSheetByName(name) {
    for (var index = 0; index < this.sheets.length; index++) {
      if (this.sheets[index].getName() === name) {
        return this.sheets[index];
      }
    }
    return null;
  }

  getSheets() {
    return this.sheets.slice();
  }

  insertSheet(name) {
    var sheet = new MockSheet(name, []);
    this.sheets.push(sheet);
    return sheet;
  }

  deleteSheet(sheet) {
    var index = this.sheets.indexOf(sheet);
    if (index === -1) {
      throw new Error('Sheet does not belong to this spreadsheet');
    }
    this.sheets.splice(index, 1);
  }
}

function createAppsScriptEnvironment(fixtures) {
  var spreadsheets = new Map();

  Object.keys(fixtures || {}).forEach(function(spreadsheetId) {
    var sheets = Object.keys(fixtures[spreadsheetId]).map(function(sheetName) {
      return new MockSheet(sheetName, fixtures[spreadsheetId][sheetName]);
    });
    spreadsheets.set(spreadsheetId, new MockSpreadsheet(spreadsheetId, sheets));
  });

  var nextSpreadsheetId = 1;
  var SpreadsheetApp = {
    openById: function(id) {
      if (!spreadsheets.has(id)) {
        throw new Error('Spreadsheet not found: ' + id);
      }
      return spreadsheets.get(id);
    },
    create: function(name) {
      var id = 'created-' + nextSpreadsheetId++;
      var spreadsheet = new MockSpreadsheet(id, [new MockSheet('Sheet1', [])]);
      spreadsheet.name = name;
      spreadsheets.set(id, spreadsheet);
      return spreadsheet;
    }
  };

  return {
    SpreadsheetApp: SpreadsheetApp,
    DriveApp: {},
    getSheet: function(spreadsheetId, sheetName) {
      return SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
    }
  };
}

function cloneRows(rows) {
  return rows.map(function(row) {
    return row.slice();
  });
}

function isPopulated(value) {
  return value !== '' && value !== null && value !== undefined;
}

module.exports = {
  createAppsScriptEnvironment: createAppsScriptEnvironment
};
