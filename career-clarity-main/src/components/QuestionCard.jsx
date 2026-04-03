import React from "react";

/**
 * QuestionCard Component
 * Displays a single question with 4 multiple choice options
 * Handles user selection and displays selected state
 */
const QuestionCard = ({ 
  question, 
  questionNumber, 
  totalQuestions, 
  selectedAnswer, 
  onSelectAnswer, 
  disabled = false,
  theme = "light",
}) => {
  const options = ["A", "B", "C", "D"];
  const isDark = theme === "dark";

  return (
    <div className="cc-fade-in">
      <div className="mb-6">
        {/* Question Header */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
              Question {questionNumber} of {totalQuestions}
            </h3>
            <div
              className={`text-sm font-medium px-3 py-1 rounded-full ${
                isDark ? "text-blue-100 bg-blue-500/20" : "text-indigo-600 bg-indigo-50"
              }`}
            >
              {Math.round((questionNumber / totalQuestions) * 100)}%
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-300"
              style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Text */}
        <div
          className={`rounded-xl p-5 mb-6 border ${
            isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
          }`}
        >
          <p className={`text-xl font-semibold leading-8 whitespace-pre-wrap break-words ${isDark ? "text-slate-100" : "text-slate-800"}`}>
          {question.question}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => !disabled && onSelectAnswer(option)}
              disabled={disabled}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                selectedAnswer === option
                  ? isDark
                    ? "border-indigo-400 bg-indigo-500/15 shadow-md"
                    : "border-indigo-500 bg-indigo-50 shadow-md"
                  : isDark
                    ? "border-slate-700 bg-slate-800 hover:border-indigo-400"
                    : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedAnswer === option
                      ? "border-indigo-500 bg-indigo-500"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {selectedAnswer === option && (
                    <span className="text-white text-sm font-bold">✓</span>
                  )}
                </div>
                <div>
                  <div className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{option}</div>
                  <div className={`leading-6 break-words ${isDark ? "text-slate-300" : "text-slate-700"}`}>{question.options[option]}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
