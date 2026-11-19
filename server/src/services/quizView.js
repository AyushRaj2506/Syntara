function publicQuiz(quiz, participantId) {
  if (!quiz) return null;
  const { answers, ...view } = quiz;
  const myOption = answers?.[participantId]?.[quiz.currentIndex];
  return { ...view, ...(myOption !== undefined && { myOption }), questions: quiz.questions.map(({ correctIndex, ...question }) => question) };
}
module.exports = { publicQuiz };
