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
  generateQuestionSet(category) {
    let matchedCategories = [];
    if (category) {
      const catLower = category.toLowerCase();
      if (catLower === 'javascript') matchedCategories = ['JavaScript'];
      else if (catLower === 'react') matchedCategories = ['React'];
      else if (catLower === 'nodejs') matchedCategories = ['Node.js'];
      else if (catLower === 'git') matchedCategories = ['Git', 'GitHub'];
      else if (catLower === 'sys_design') matchedCategories = ['System Design'];
      else if (catLower === 'dsa') matchedCategories = ['DSA'];
      else if (catLower === 'web_dev' || catLower === 'webdevelopment') matchedCategories = ['Web Development'];
      else if (catLower === 'general_tech') matchedCategories = ['General Tech'];
      else {
        // Fallback mapping matching substring
        matchedCategories = [category];
      }
    }

    const difficulties = ['easy', 'medium', 'hard'];
    const finalSet = [];

    difficulties.forEach((diff) => {
      // 1. Filter by difficulty and matched categories
      let categoryQuestions = questions.filter(q => 
        q.difficulty === diff && 
        matchedCategories.some(c => q.category.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(q.category.toLowerCase()))
      );

      // Shuffle category questions to randomize selection
      categoryQuestions = this.shuffle(categoryQuestions);

      // 2. Select up to 5 questions
      let diffSet = categoryQuestions.slice(0, 5);

      // 3. Fallback: If not enough questions, pull from general pool of the same difficulty
      if (diffSet.length < 5) {
        let fallbackPool = questions.filter(q => 
          q.difficulty === diff && 
          !diffSet.some(existing => existing.id === q.id)
        );
        
        fallbackPool = this.shuffle(fallbackPool);
        const needed = 5 - diffSet.length;
        diffSet = [...diffSet, ...fallbackPool.slice(0, needed)];
      }

      // Add to final set (making sure it stays ordered)
      finalSet.push(...diffSet);
    });

    return finalSet;
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
