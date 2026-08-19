const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readAll(name) {
  const raw = fs.readFileSync(filePath(name), 'utf8');
  return JSON.parse(raw || '[]');
}

function writeAll(name, items) {
  fs.writeFileSync(filePath(name), JSON.stringify(items, null, 2));
}

function findById(name, id) {
  return readAll(name).find((item) => item.id === id);
}

function insert(name, item) {
  const items = readAll(name);
  const record = { id: crypto.randomUUID(), ...item };
  items.push(record);
  writeAll(name, items);
  return record;
}

function update(name, id, changes) {
  const items = readAll(name);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...changes };
  writeAll(name, items);
  return items[index];
}

function remove(name, id) {
  const items = readAll(name);
  const next = items.filter((item) => item.id !== id);
  writeAll(name, next);
  return next.length !== items.length;
}

function readObject(name) {
  const raw = fs.readFileSync(filePath(name), 'utf8');
  return JSON.parse(raw || '{}');
}

function writeObject(name, obj) {
  fs.writeFileSync(filePath(name), JSON.stringify(obj, null, 2));
}

module.exports = { readAll, writeAll, findById, insert, update, remove, readObject, writeObject };
