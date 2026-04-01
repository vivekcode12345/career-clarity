import { useEffect, useMemo, useState } from "react";
import Loader from "../components/Loader";
import { getQuickTest, submitQuickTest } from "../services/testService";

function QuickTest() {
	const [questions, setQuestions] = useState([]);
	const [answers, setAnswers] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isPreparingAnalysis, setIsPreparingAnalysis] = useState(false);
	const [hasAttempted, setHasAttempted] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	
	useEffect(() => {
		const fetchQuestions = async () => {
			try {
				const data = await getQuickTest();
				if (data.attempted) {
					setHasAttempted(true);
					setSuccessMessage(data.message || "You have already attempted the quick test.");
					setQuestions([]);
					return;
				}
				setQuestions(data.questions);
			} catch (err) {
				console.error(err);
			}
		};

		fetchQuestions();
	}, []);

	const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
	const progress = questions.length
		? Math.round((answeredCount / questions.length) * 100)
		: 0;

	const onSelectOption = (questionId, option) => {
		setAnswers((prev) => ({ ...prev, [questionId]: option }));
	};

	const onSubmit = async (event) => {
		event.preventDefault();
		setErrorMessage("");
		setSuccessMessage("");

		if (hasAttempted) {
			setErrorMessage("You have already attempted the quick test.");
			return;
		}

		if (answeredCount < questions.length) {
			setErrorMessage("Please answer all questions before submitting.");
			return;
		}

		setIsSubmitting(true);
		try {
			await submitQuickTest(answers);
			setSuccessMessage("Test submitted successfully.");

			setIsPreparingAnalysis(true);
			const answerLines = questions.map((questionItem) => {
				const selectedOptionKey = answers[questionItem.id];
				const selectedOptionLabel =
					questionItem.options?.[selectedOptionKey] ?? selectedOptionKey;
				return `- ${questionItem.question}: ${selectedOptionLabel}`;
			});

			const analysisPrompt = [
				"I just completed the quick test. Please analyze my responses and provide:",
				"1) key strengths,",
				"2) areas to improve,",
				"3) suitable career directions,",
				"4) next steps.",
				"",
				"My responses:",
				...answerLines,
			].join("\n");

			window.setTimeout(() => {
				window.dispatchEvent(
					new CustomEvent("careerclarity:open-chatbot", {
						detail: { initialMessage: analysisPrompt },
					})
				);
				setIsPreparingAnalysis(false);
			}, 1200);
		} catch (error) {
			if (error.response?.data?.attempted) {
				setHasAttempted(true);
				setSuccessMessage(error.response?.data?.message || "You have already attempted the quick test.");
				setIsPreparingAnalysis(false);
				return;
			}
			setErrorMessage(error.response?.data?.message || "Submission failed. Please try again.");
			setIsPreparingAnalysis(false);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="space-y-8">
			{/* Header Card */}
			<div className="cc-fade-in relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-purple-500 to-indigo-600 p-8 text-white shadow-xl sm:p-10">
				<div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
				<div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-white/10 blur-3xl"></div>

				<div className="relative">
					<p className="text-sm font-semibold uppercase tracking-widest text-purple-100">Career Assessment</p>
					<h1 className="mt-2 text-4xl font-extrabold">Quick Test 🧠</h1>
					<p className="mt-3 text-lg text-purple-100">
						Answer questions to discover your strengths and get career insights
					</p>
				</div>
			</div>

			{/* Progress Tracker */}
			<div className="cc-fade-in rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200" style={{ animationDelay: "100ms" }}>
				<div className="flex items-center justify-between mb-3">
					<h3 className="font-semibold text-slate-900">📝 Test Progress</h3>
					<span className="text-xl font-bold text-indigo-600">{progress}%</span>
				</div>
				<div className="relative h-3 rounded-full bg-slate-100 overflow-hidden">
					<div
						className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 transition-all duration-300 ease-out"
						style={{ width: `${progress}%` }}
					/>
				</div>
				<p className="mt-3 text-sm text-slate-600">
					{answeredCount} of {questions.length} questions answered
				</p>
			</div>

			{hasAttempted ? (
				<div className="cc-fade-in rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-6 shadow-md" style={{ animationDelay: "150ms" }}>
					<div className="flex gap-3">
						<div className="text-2xl">✅</div>
						<div>
							<p className="font-semibold text-amber-900">Test Already Completed</p>
							<p className="mt-1 text-sm text-amber-800">
								You have already attempted this test. Check your personalized career recommendations and analysis in the chatbot.
							</p>
						</div>
					</div>
				</div>
			) : (
				<form onSubmit={onSubmit} className="space-y-6">
					{/* Questions */}
					{questions.map((item, index) => (
						<div
							key={item.id}
							className="cc-fade-in rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-md transition hover:border-indigo-300 hover:shadow-lg"
							style={{ animationDelay: `${200 + index * 50}ms` }}
						>
							<fieldset className="space-y-4">
								<legend className="mb-4 text-base font-bold text-slate-900">
									<span className="inline-flex items-center justify-center mr-3 h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-semibold">
										{index + 1}
									</span>
									{item.question}
								</legend>

								<div className="grid gap-3 sm:grid-cols-2">
									{Object.entries(item.options).map(([key, value]) => (
										<label
											key={key}
											className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition ${
												answers[item.id] === key
													? "border-indigo-600 bg-indigo-50 shadow-md"
													: "border-slate-200 bg-white hover:border-indigo-300"
											}`}
										>
											<input
												type="radio"
												name={`q-${item.id}`}
												value={key}
												checked={answers[item.id] === key}
												onChange={() => onSelectOption(item.id, key)}
												className="h-5 w-5 cursor-pointer accent-indigo-600"
											/>
											<span className="text-sm font-medium text-slate-700">{value}</span>
										</label>
									))}
								</div>
							</fieldset>
						</div>
					))}

					{/* Messages */}
					{errorMessage && (
						<div className="cc-fade-in rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
							⚠️ {errorMessage}
						</div>
					)}

					{successMessage && (
						<div className="cc-fade-in rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
							✓ {successMessage}
						</div>
					)}

					{/* Submit Button */}
					<button
						type="submit"
						disabled={isSubmitting || isPreparingAnalysis || hasAttempted || answeredCount < questions.length}
						className="cc-cta w-full flex items-center justify-center disabled:opacity-70 shadow-lg"
					>
						{isSubmitting || isPreparingAnalysis ? (
							<Loader
								label={isPreparingAnalysis ? "Preparing analysis..." : "Submitting..."}
								size="sm"
							/>
						) : answeredCount < questions.length ? (
							"⏸️ Answer all questions first"
						) : (
							"🚀 Submit & Get Analysis"
						)}
					</button>
				</form>
			)}
		</div>
	);
}

export default QuickTest;