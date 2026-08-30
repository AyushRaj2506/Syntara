const { z } = require('zod');

const subjectEnum = z.enum([
  'Data Structures',
  'Algorithms',
  'DBMS',
  'Operating Systems',
  'Computer Networks',
  'Mathematics',
  'Machine Learning',
  'General',
  'Custom',
]);

const roomTypeEnum = z.enum(['STUDY', 'CHAT']);

const createRoomSchema = z.object({
  type: roomTypeEnum.default('STUDY'),
  name: z
    .string()
    .min(3, 'Room name must be at least 3 characters')
    .max(40, 'Room name must be at most 40 characters')
    .transform((s) => s.replace(/[\x00-\x1F\x7F]/g, '').trim()),
  subject: subjectEnum,
  customSubject: z
    .string()
    .min(2)
    .max(30)
    .transform((s) => s.replace(/[\x00-\x1F\x7F]/g, '').trim())
    .optional(),
  durationMin: z.number().int().min(5).max(1440),
  maxParticipants: z.number().int().min(2).max(100),
  displayName: z
    .string()
    .min(1)
    .max(24)
    .transform((s) => s.replace(/[\x00-\x1F\x7F]/g, '').trim()),
});

const joinRoomSchema = z.object({
  roomCode: z
    .string()
    .regex(/^[A-Z0-9]{2,5}-[A-Z0-9]{4,6}$/, 'Invalid room code format'),
  displayName: z
    .string()
    .min(1)
    .max(24)
    .transform((s) => s.replace(/[\x00-\x1F\x7F]/g, '').trim())
    .optional(),
  participantToken: z.string().uuid().optional(),
});

const chatSendSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1).max(2000).optional(),
  file: z.object({
    fileId: z.string(),
    fileName: z.string().max(255),
    fileSize: z.number().nonnegative(),
    fileType: z.string().max(100),
    url: z.string(),
  }).optional(),
}).refine(data => data.text || data.file, {
  message: "Either text or file must be provided"
});

const notesUpdateSchema = z.object({
  content: z.string().max(500000),
});

const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const whiteboardDrawSchema = z.object({
  strokeId: z.string().uuid(),
  points: z.array(pointSchema).max(2000),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).or(z.literal('eraser')),
  size: z.enum(['S', 'M', 'L']),
  done: z.boolean(),
});

const focusStartSchema = z.object({
  durationMin: z.number().int().min(5).max(480),
  breakMin: z.number().int().min(1).max(30).optional(),
});

const goalCreateSchema = z.object({
  text: z.string().min(1).max(200).transform((s) => s.trim()),
});

const goalUpdateSchema = z.object({
  goalId: z.string().uuid(),
  completed: z.boolean(),
});

const goalDeleteSchema = z.object({
  goalId: z.string().uuid(),
});

const quizQuestionSchema = z.object({
  questionId: z.string(),
  text: z.string().min(1).max(500),
  options: z.tuple([
    z.string().min(1).max(200),
    z.string().min(1).max(200),
    z.string().min(1).max(200),
    z.string().min(1).max(200),
  ]),
  correctIndex: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]),
  timerSec: z.number().int().min(10).max(60),
});

const quizStartSchema = z.object({
  questions: z.array(quizQuestionSchema).min(1).max(10),
});

const quizSubmitSchema = z.object({
  questionIndex: z.number().int().min(0).max(9),
  optionIndex: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]),
});

module.exports = {
  createRoomSchema,
  joinRoomSchema,
  chatSendSchema,
  notesUpdateSchema,
  whiteboardDrawSchema,
  focusStartSchema,
  goalCreateSchema,
  goalUpdateSchema,
  goalDeleteSchema,
  quizStartSchema,
  quizSubmitSchema,
};
