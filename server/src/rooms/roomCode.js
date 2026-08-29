/** @import { Subject } from '../types/index.js' */

/** @type {Record<string, string>} */
const SUBJECT_PREFIXES = {
  'Data Structures': 'DSA',
  Algorithms: 'ALG',
  DBMS: 'DBS',
  'Operating Systems': 'OPS',
  'Computer Networks': 'NET',
  Mathematics: 'MTH',
  'Machine Learning': 'MLA',
  General: 'SYN',
  Custom: 'SYN',
  Chat: 'CHT',
};

// Unambiguous chars (removed 0/O, 1/I)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * @param {number} length
 * @returns {string}
 */
function randomSegment(length) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return result;
}

/**
 * @param {string} subject
 * @returns {string}
 */
function generateRoomCode(subject) {
  const prefix = SUBJECT_PREFIXES[subject] ?? 'SYN';
  return `${prefix}-${randomSegment(5)}`;
}

/**
 * @param {string} code
 * @returns {boolean}
 */
function validateRoomCodeFormat(code) {
  return /^[A-Z0-9]{2,5}-[A-Z0-9]{4,6}$/.test(code);
}

module.exports = { generateRoomCode, validateRoomCodeFormat };
