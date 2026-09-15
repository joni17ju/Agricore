/**
 * End-of-module quiz (Proposal conceptual framework, Stage 3: quizzes per module).
 * This is intentionally a plain quiz and is separate from the five mission games.
 */
import { useState } from 'react';
import Button from '../../common/Button.jsx';
import Icon from '../../common/Icon.jsx';
import { ProgressBar } from '../../common/Progress.jsx';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export default function QuizGame({ mission, onComplete }) {
  const { questions, title } = mission.scenarioData;
  const [index, setIndex] = useState(0);
  const [selections, setSelections] = useState({});
  const [checked, setChecked] = useState(false);

  const question = questions[index];
  const selected = selections[question.id];
  const isLast = index === questions.length - 1;
  const answeredCount = Object.keys(selections).length;

  const next = () => {
    if (isLast) {
      onComplete({ selections });
      return;
    }
    setIndex(index + 1);
    setChecked(false);
  };

  return (
    <div className="quiz-game">
      <header className="quiz-game__header">
        <span className="page-header__eyebrow">{title}</span>
        <div className="row">
          <strong>Question {index + 1} of {questions.length}</strong>
          <span className="spacer" />
          <span className="text-muted text-sm">{answeredCount} answered</span>
        </div>
        <ProgressBar value={((index + (checked ? 1 : 0)) / questions.length) * 100} size="sm" />
      </header>

      <section key={question.id} className="quiz-card-question anim-fade-up">
        <h2>{question.prompt}</h2>
        <div className="quiz-options" role="radiogroup">
          {question.options.map((option, optionIndex) => {
            const isSelected = selected === option.id;
            const isCorrect = option.id === question.correctOptionId;
            const state = checked ? (isCorrect ? 'is-correct' : isSelected ? 'is-wrong' : 'is-dim') : isSelected ? 'is-selected' : '';
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`quiz-option ${state}`}
                onClick={() => !checked && setSelections({ ...selections, [question.id]: option.id })}
                disabled={checked}
              >
                <span className="quiz-option__letter">{LETTERS[optionIndex]}</span>
                <span>{option.text}</span>
                {checked && isCorrect && <Icon name="check-circle" size={20} />}
                {checked && isSelected && !isCorrect && <Icon name="x-circle" size={20} />}
              </button>
            );
          })}
        </div>

        {checked && (
          <p className={`game-message ${selected === question.correctOptionId ? 'game-message--ok' : 'game-message--error'}`}>
            <Icon name={selected === question.correctOptionId ? 'check-circle' : 'info'} size={18} />
            {question.explanation}
          </p>
        )}

        <div className="game-actions">
          {checked ? (
            <Button size="lg" iconRight={isLast ? 'check' : 'arrow-right'} onClick={next}>
              {isLast ? 'Submit Quiz' : 'Next Question'}
            </Button>
          ) : (
            <Button size="lg" onClick={() => setChecked(true)} disabled={!selected}>Check Answer</Button>
          )}
        </div>
      </section>
    </div>
  );
}
