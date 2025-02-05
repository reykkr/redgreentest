document.addEventListener('DOMContentLoaded', function () { 
    const typeTestSelect = document.getElementById('typeTest');
    const categoriesDiv = document.getElementById('categories');
    const form = document.getElementById('quizForm');
    const quizSection = document.getElementById('quizSection');
    const quizContainer = document.getElementById('quizQuestions');

    // Handle type of test selection
    typeTestSelect.addEventListener('change', function () {
        if (this.value === 'courte') {
            categoriesDiv.classList.remove('hidden');
        } else {
            categoriesDiv.classList.add('hidden');
        }
    });

    // Handle form submission
    form.addEventListener('submit', function (event) {
        event.preventDefault();

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        console.log("Form data submitted:", data);

        document.querySelector('.form-container').style.display = 'none';
        quizSection.style.display = 'block';

        loadQuestions(data);
    });

    function loadQuestions(formData) {
        fetch('data/questions.json')
            .then(response => response.json())
            .then(data => {
                let questions = [];
                if (formData.typeTest === 'longue') {
                    questions = getRandomQuestions(data, 45);
                } else if (formData.typeTest === 'courte') {
                    if (formData.categoriesList === 'vie_pro') {
                        questions = getCategoryQuestions(data, 'Vie pro', 25);
                    } else if (formData.categoriesList === 'vie_amoureuse') {
                        questions = getCategoryQuestions(data, 'Vie Amoureuse', 25);
                    } else if (formData.categoriesList === 'vie_sexuelle') {
                        // For Vie Sexuelle, use 35 ordered questions based on the Priority field.
                        questions = getCategoryQuestions(data, 'Vie Sexuelle', 35, true);
                    } else {
                        const vieproQuestions = getCategoryQuestions(data, 'Vie Pro', 10);
                        const vieAmoureuseQuestions = getCategoryQuestions(data, 'Vie Amoureuse', 10);
                        const vieSexuelleQuestions = getCategoryQuestions(data, 'Vie Sexuelle', 10);
                        questions = [...vieproQuestions, ...vieAmoureuseQuestions, ...vieSexuelleQuestions];
                    }
                }
                displayQuestions(questions);
            })
            .catch(error => console.error('Error loading questions:', error));
    }

    function getRandomQuestions(data, numQuestions) {
        return data.sort(() => 0.5 - Math.random()).slice(0, numQuestions);
    }

    function getCategoryQuestions(data, category, numQuestions, orderByPriority = false) {
    const filtered = data.filter(question => question.category.toLowerCase() === category.toLowerCase());
    if (orderByPriority) {
        // Sort ascending by the Priority property
        filtered.sort((a, b) => a.Priority - b.Priority);
        return filtered.slice(0, numQuestions);
    } else {
        return filtered.sort(() => 0.5 - Math.random()).slice(0, numQuestions);
    }
}

    function displayQuestions(questions) {
        let currentQuestionIndex = 0;
        const totalQuestions = questions.length;
        // Array to hold responses for each question.
        // Each entry can be:
        //   null - not answered yet,
        //   { answered: true, answerIndex: Number, outcome: Number } - if answered,
        //   { skipped: true } - if skipped.
        const userResponses = new Array(totalQuestions).fill(null);

        function updateProgress() {
            const progressText = document.getElementById("progress-text");
            progressText.textContent = `Progress: ${currentQuestionIndex + 1}/${totalQuestions}`;
        }

        function loadQuestion() {
            quizContainer.innerHTML = '';
            const question = questions[currentQuestionIndex];
        
            const questionElement = document.createElement('div');
            questionElement.classList.add('question');
        
            // Create the question text container
            const questionTextContainer = document.createElement('div');
            questionTextContainer.classList.add('question-text');
            questionTextContainer.innerHTML = `<strong>Question ${currentQuestionIndex + 1}:</strong> ${question.question}`;
            questionElement.appendChild(questionTextContainer);
        
            // Create the answers container
            const answersContainer = document.createElement('div');
            answersContainer.classList.add('answers-container');
        
            // Loop through the answers; no labels are added as they are already provided in the data.
            question.answers.forEach((answer, index) => {
                const answerButton = document.createElement('button');
                answerButton.textContent = answer;
                answerButton.onclick = () => handleAnswer(index);
                answersContainer.appendChild(answerButton);
            });
            questionElement.appendChild(answersContainer);
        
            // Create the navigation (Back and Skip) buttons container
            const navContainer = document.createElement('div');
            navContainer.classList.add('nav-buttons');
        
            const backButton = document.createElement('button');
            backButton.textContent = 'Back';
            backButton.disabled = currentQuestionIndex === 0;
            backButton.onclick = goBack;
            navContainer.appendChild(backButton);
        
            const skipButton = document.createElement('button');
            skipButton.textContent = 'Skip';
            skipButton.onclick = skipQuestion;
            navContainer.appendChild(skipButton);
        
            questionElement.appendChild(navContainer);
            quizContainer.appendChild(questionElement);
            updateProgress();
        }
        
        function handleAnswer(answerIndex) {
            const question = questions[currentQuestionIndex];
            const outcome = question.outcomes[answerIndex] * question.multiplier;
            // Record the answer response
            userResponses[currentQuestionIndex] = { answered: true, answerIndex, outcome };

            // Move to the next question or show result if this was the last
            if (currentQuestionIndex < totalQuestions - 1) {
                currentQuestionIndex++;
                loadQuestion();
            } else {
                showResult();
            }
        }

        function skipQuestion() {
            // Mark this question as skipped so it is not included in scoring
            userResponses[currentQuestionIndex] = { skipped: true };

            if (currentQuestionIndex < totalQuestions - 1) {
                currentQuestionIndex++;
                loadQuestion();
            } else {
                showResult();
            }
        }

        function goBack() {
            if (currentQuestionIndex > 0) {
                // When going back, clear the previous answer (or skip) so its score resets
                currentQuestionIndex--;
                userResponses[currentQuestionIndex] = null;
                loadQuestion();
            }
        }

        function showResult() {
            // Recalculate scores only from answered (non-skipped) questions
            let userScore = 0;
            let mainMinScore = 0;
            let mainMaxScore = 0;
            let categoryScores = {};
            let categoryMinScores = {};
            let categoryMaxScores = {};

            questions.forEach((question, i) => {
                const response = userResponses[i];
                if (response && response.answered) {
                    const minOutcome = Math.min(...question.outcomes) * question.multiplier;
                    const maxOutcome = Math.max(...question.outcomes) * question.multiplier;
                    userScore += response.outcome;
                    mainMinScore += minOutcome;
                    mainMaxScore += maxOutcome;

                    if (!categoryScores[question.category]) {
                        categoryScores[question.category] = 0;
                        categoryMinScores[question.category] = 0;
                        categoryMaxScores[question.category] = 0;
                    }
                    categoryScores[question.category] += response.outcome;
                    categoryMinScores[question.category] += minOutcome;
                    categoryMaxScores[question.category] += maxOutcome;
                }
            });

            let mainRedFlagPercentage = 0;
            if (mainMaxScore > mainMinScore) {
                mainRedFlagPercentage = ((userScore - mainMinScore) / (mainMaxScore - mainMinScore)) * 100;
            }
            mainRedFlagPercentage = Math.min(100, Math.max(0, mainRedFlagPercentage));

            const categoryResults = Object.keys(categoryScores).map((category) => {
                const catMin = categoryMinScores[category] || 0;
                const catMax = categoryMaxScores[category] || 0;
                const catScore = categoryScores[category] || 0;
                let categoryPercentage = 0;
                if (catMax > catMin) {
                    categoryPercentage = ((catScore - catMin) / (catMax - catMin)) * 100;
                }
                return {
                    category,
                    percentage: Math.min(100, Math.max(0, categoryPercentage)),
                };
            });

            quizContainer.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <h2>Résultats du Test</h2>
                    <p><strong>Pourcentage global de drapeau rouge:</strong></p>
                    <div style="font-size: 2em; font-weight: bold; color: ${getColorForPercentage(mainRedFlagPercentage)};">
                        ${mainRedFlagPercentage.toFixed(2)}%
                    </div>
                    <h3>Résultats par catégorie</h3>
                    <ul style="list-style: none; padding: 0;">
                        ${categoryResults.map(result => `
                            <li style="margin-bottom: 10px;">
                                <strong>${result.category}:</strong>
                                <span style="font-size: 1.5em; font-weight: bold; color: ${getColorForPercentage(result.percentage)};">
                                    ${result.percentage.toFixed(2)}%
                                </span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        loadQuestion();
    }

    function getColorForPercentage(percentage) {
        if (percentage > 75) return "#FF4C4C"; // Red for high risk
        if (percentage > 50) return "#FFA500"; // Orange for medium risk
        if (percentage > 25) return "#FFD700"; // Yellow for low-medium risk
        return "#4CAF50"; // Green for low risk
    }
});
