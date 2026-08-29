/**
 * @typedef {'Data Structures'|'Algorithms'|'DBMS'|'Operating Systems'|'Computer Networks'|'Mathematics'|'Machine Learning'|'General'|'Custom'} Subject
 */

/**
 * @typedef {Object} Participant
 * @property {string} participantId
 * @property {string} token - reconnection secret, never sent to other clients
 * @property {string} displayName
 * @property {boolean} isHost
 * @property {'connected'|'reconnecting'} status
 * @property {number} joinedAt
 * @property {string} socketId
 * @property {boolean} isFocusing
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {'user'|'system'} type
 * @property {string} [participantId]
 * @property {string} [displayName]
 * @property {string} text
 * @property {number} createdAt
 */

/**
 * @typedef {Object} StrokePoint
 * @property {number} x - normalized 0..1
 * @property {number} y - normalized 0..1
 */

/**
 * @typedef {Object} Stroke
 * @property {string} strokeId
 * @property {string} participantId
 * @property {string} color
 * @property {'S'|'M'|'L'} size
 * @property {StrokePoint[]} points
 */

/**
 * @typedef {Object} FocusSession
 * @property {'READY'|'FOCUSING'|'BREAK'|'COMPLETED'} status
 * @property {number} durationMin
 * @property {number} [breakMin]
 * @property {number} [startedAt]
 * @property {number} [endsAt]
 * @property {number} participantsAtStart
 * @property {string} startedBy
 */

/**
 * @typedef {Object} Goal
 * @property {string} goalId
 * @property {string} text
 * @property {boolean} completed
 * @property {string} createdBy
 * @property {number} createdAt
 */

/**
 * @typedef {Object} QuizQuestion
 * @property {string} questionId
 * @property {string} text
 * @property {[string,string,string,string]} options
 * @property {0|1|2|3} correctIndex
 * @property {number} timerSec
 */

/**
 * @typedef {Object} QuizState
 * @property {QuizQuestion[]} questions
 * @property {number} currentIndex
 * @property {'IN_PROGRESS'|'COMPLETED'} status
 * @property {Record<string,Record<number,number>>} answers
 * @property {string} startedBy
 * @property {number} [questionEndsAt]
 */

/**
 * @typedef {Object} Room
 * @property {string} roomId
 * @property {string} roomCode
 * @property {string} name
 * @property {Subject} subject
 * @property {string} [customSubject]
 * @property {number} createdAt
 * @property {number} expiresAt
 * @property {number} durationMin
 * @property {number} maxParticipants
 * @property {string} hostId
 * @property {Record<string,Participant>} participants
 * @property {ChatMessage[]} messages
 * @property {string} sharedNotes
 * @property {Stroke[]} whiteboardState
 * @property {FocusSession|null} focusSession
 * @property {Goal[]} goals
 * @property {QuizState|null} quizState
 */

module.exports = {};
