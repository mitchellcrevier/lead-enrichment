const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

function parseCSV(buffer) {
  return parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

function generateCSV(rows) {
  return stringify(rows, { header: true });
}

module.exports = { parseCSV, generateCSV };
