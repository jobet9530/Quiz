const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

let db;

(async () => {
  db = await open({
    filename: './quiz.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    ${usersTableSQL}
    ${quizzesTableSQL}
    ${questionsTableSQL}
    ${scoresTableSQL}
  `);

  await seedDatabase();
})();

const usersTableSQL = `
  CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    username TEXT NOT NULL,
    password TEXT NOT NULL
  );
`;

const quizzesTableSQL = `
  CREATE TABLE IF NOT EXISTS quizzes (
    quiz_id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
  );
`;

const questionsTableSQL = `
  CREATE TABLE IF NOT EXISTS questions (
    question_id INTEGER PRIMARY KEY,
    quiz_id INTEGER,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option CHAR(1) NOT NULL,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id)
  );
`;

const scoresTableSQL = `
  CREATE TABLE IF NOT EXISTS scores (
    score_id INTEGER PRIMARY KEY,
    user_id INTEGER,
    quiz_id INTEGER,
    score INTEGER NOT NULL,
    taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id)
  );
`;

const seedDatabase = async () => {
  try {
    const data = JSON.parse(fs.readFileSync('quizData.json', 'utf-8'));

    if (data.users) {
      for (const user of data.users) {
        await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [user.username, user.password]);
      }
    }

    if (data.quizzes) {
      for (const quiz of data.quizzes) {
        const { title, description, user_id } = quiz;
        await db.run('INSERT INTO quizzes (title, description, user_id) VALUES (?, ?, ?)', [title, description, user_id]);
        const quizId = await db.get('SELECT last_insert_rowid()');

        if (quiz.questions) {
          for (const question of quiz.questions) {
            const { question_text, option_a, option_b, option_c, option_d, correct_option } = question;
            await db.run('INSERT INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [quizId, question_text, option_a, option_b, option_c, option_d, correct_option]);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});