function publicQuiz(quiz) {
  if (!quiz) return null;
  const { answers, ...view } = quiz;
  return { ...view, questions: quiz.questions.map(({ correctIndex, ...question }) => question) };
}
module.exports = { publicQuiz };
