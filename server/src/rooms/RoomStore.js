/** @import { Room, Participant } from '../types/index.js' */

/**
 * In-memory room store. Single source of truth for all room state.
 */
class RoomStore {
  constructor() {
    /** @type {Map<string, Room>} roomId → Room */
    this.rooms = new Map();
    /** @type {Map<string, string>} roomCode.toUpperCase() → roomId */
    this.codeToId = new Map();
  }

  /** @param {Room} room */
  create(room) {
    this.rooms.set(room.roomId, room);
    this.codeToId.set(room.roomCode.toUpperCase(), room.roomId);
  }

  /** @param {string} roomId @returns {Room|undefined} */
  getById(roomId) {
    return this.rooms.get(roomId);
  }

  /** @param {string} roomCode @returns {Room|undefined} */
  getByCode(roomCode) {
    const id = this.codeToId.get(roomCode.toUpperCase());
    return id ? this.rooms.get(id) : undefined;
  }

  /** @param {string} roomCode @returns {boolean} */
  codeExists(roomCode) {
    return this.codeToId.has(roomCode.toUpperCase());
  }

  /** @param {string} roomId */
  delete(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      this.codeToId.delete(room.roomCode.toUpperCase());
      this.rooms.delete(roomId);
    }
  }

  /** @returns {Room[]} */
  all() {
    return Array.from(this.rooms.values());
  }

  /**
   * @param {string} roomId
   * @param {Participant} participant
   * @returns {boolean}
   */
  addParticipant(roomId, participant) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    room.participants[participant.participantId] = participant;
    return true;
  }

  /**
   * @param {string} roomId
   * @param {string} participantId
   * @returns {boolean}
   */
  removeParticipant(roomId, participantId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    delete room.participants[participantId];
    return true;
  }

  /**
   * @param {string} roomId
   * @param {string} participantId
   * @param {Partial<Participant>} update
   * @returns {boolean}
   */
  updateParticipant(roomId, participantId, update) {
    const room = this.rooms.get(roomId);
    if (!room || !room.participants[participantId]) return false;
    room.participants[participantId] = {
      ...room.participants[participantId],
      ...update,
    };
    return true;
  }

  /**
   * @param {string} roomId
   * @param {string} token
   * @returns {Participant|undefined}
   */
  findParticipantByToken(roomId, token) {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    return Object.values(room.participants).find((p) => p.token === token);
  }

  /**
   * @param {string} roomId
   * @param {string} socketId
   * @returns {Participant|undefined}
   */
  findParticipantBySocket(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    return Object.values(room.participants).find((p) => p.socketId === socketId);
  }

  /**
   * Returns a safe public view of the room (participant tokens stripped).
   * @param {Room} room
   */
  toPublicRoom(room) {
    const publicParticipants = {};
    for (const [id, p] of Object.entries(room.participants)) {
      const { token: _t, ...pub } = p;
      publicParticipants[id] = pub;
    }
    return { ...room, participants: publicParticipants };
  }

  /** @param {string} roomId @returns {number} */
  participantCount(roomId) {
    const room = this.rooms.get(roomId);
    return room ? Object.keys(room.participants).length : 0;
  }

  /** @param {string} roomId @returns {number} */
  connectedCount(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return 0;
    return Object.values(room.participants).filter(
      (p) => p.status === 'connected'
    ).length;
  }
}

const roomStore = new RoomStore();
module.exports = { roomStore };
