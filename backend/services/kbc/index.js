const questions = require('./questions');

// Service layer for Code KBC gameplay logic
class KbcService {
  constructor() {
    this.name = "CodeKbcService";
  }

  // Shuffle helper to ensure variety in gameplay
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Generates a 15-question set for a Code KBC game run.
   * Progression structure:
   * - Q1 to Q5: Easy (5 questions)
   * - Q6 to Q10: Medium (5 questions)
   * - Q11 to Q15: Hard (5 questions)
   * Fallback: If the selected category lacks questions in a difficulty tier,
   * we fill it from the general tech / web development question pool.
   */
  async generateQuestionSet(category) {
    const { generateMixedQuestionSet } = require('./questionProvider');
    return await generateMixedQuestionSet(category);
  }

  // Verification method for client selections
  verifyAnswer(questionId, selectedIndex) {
    const q = questions.find(item => item.id === questionId);
    if (!q) {
      return { isCorrect: false, error: "Question not found" };
    }
    return {
      isCorrect: q.correctAnswer === selectedIndex,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    };
  }
}

module.exports = new KbcService();
