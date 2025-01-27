document.addEventListener('DOMContentLoaded', function () {
    const typeTestSelect = document.getElementById('typeTest');
    const categoriesDiv = document.getElementById('categories');
    const form = document.getElementById('quizForm');
    const quizSection = document.getElementById('quizSection');
    const quizContainer = document.getElementById('quizQuestions');

    let mainMinScore = 0;
    let mainMaxScore = 0;
    let userScore = 0;
    let categoryScores = {};
    let categoryMinScores = {};
    let categoryMaxScores = {};

    // Handle the type of test selection
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
                    if (formData.categoriesList === 'vie_sociale') {
                        questions = getCategoryQuestions(data, 'Vie Sociale', 25);
                    } else if (formData.categoriesList === 'vie_amoureuse') {
                        questions = getCategoryQuestions(data, 'Vie Amoureuse', 25);
                    } else if (formData.categoriesList === 'vie_sexuelle') {
                        questions = getCategoryQuestions(data, 'Vie Sexuelle', 25);
                    } else {
                        const vieSocialeQuestions = getCategoryQuestions(data, 'Vie Sociale', 10);
                        const vieAmoureuseQuestions = getCategoryQuestions(data, 'Vie Amoureuse', 10);
                        const vieSexuelleQuestions = getCategoryQuestions(data, 'Vie Sexuelle', 10);
                        questions = [...vieSocialeQuestions, ...vieAmoureuseQuestions, ...vieSexuelleQuestions];
                    }
                }

                // Calculate min and max scores
                questions.forEach((question) => {
                    if (!question.outcomes || question.outcomes.length === 0 || typeof question.multiplier !== "number") {
                        console.error("Invalid question data:", question);
                        return;
                    }
                
                    const minOutcome = Math.min(...question.outcomes); // Find the smallest outcome
                    const maxOutcome = Math.max(...question.outcomes); // Find the largest outcome
                
                    mainMinScore += minOutcome * question.multiplier;
                    mainMaxScore += maxOutcome * question.multiplier;
                
                    if (!categoryMinScores[question.category]) {
                        categoryMinScores[question.category] = 0;
                        categoryMaxScores[question.category] = 0;
                        categoryScores[question.category] = 0;
                    }
                
                    categoryMinScores[question.category] += minOutcome * question.multiplier;
                    categoryMaxScores[question.category] += maxOutcome * question.multiplier;
                });

                displayQuestions(questions);
            })
            .catch(error => console.error('Error loading questions:', error));
    }

    function getRandomQuestions(data, numQuestions) {
        return data.sort(() => 0.5 - Math.random()).slice(0, numQuestions);
    }

    function getCategoryQuestions(data, category, numQuestions) {
        const filtered = data.filter(question => question.category === category);
        return filtered.sort(() => 0.5 - Math.random()).slice(0, numQuestions);
    }

    function displayQuestions(questions) {
        let currentQuestionIndex = 0;
        const totalQuestions = questions.length;
    
        // Function to update progress
        function updateProgress() {
            const progressText = document.getElementById("progress-text");
            progressText.textContent = `Progress: ${currentQuestionIndex + 1}/${totalQuestions}`;
        }
    
        // Function to load the current question
        function loadQuestion() {
            quizContainer.innerHTML = '';
            const question = questions[currentQuestionIndex];
    
            const questionElement = document.createElement('div');
            questionElement.classList.add('question');
            questionElement.innerHTML = `
                <p><strong>Question ${currentQuestionIndex + 1}:</strong> ${question.question}</p>
            `;
    
            question.answers.forEach((answer, index) => {
                const answerButton = document.createElement('button');
                answerButton.textContent = answer;
                answerButton.onclick = () => handleAnswer(index);
                questionElement.appendChild(answerButton);
            });
    
            quizContainer.appendChild(questionElement);
    
            // Update progress after loading the question
            updateProgress();
        }
    
        // Function to handle answer selection
        function handleAnswer(answerIndex) {
            const question = questions[currentQuestionIndex];
            const category = question.category;
            const outcome = question.outcomes[answerIndex] * question.multiplier;
    
            userScore += outcome;
    
            if (!categoryScores[category]) {
                categoryScores[category] = 0;
            }
            categoryScores[category] += outcome;
    
            currentQuestionIndex++;
            if (currentQuestionIndex < questions.length) {
                loadQuestion();
            } else {
                showResult();
            }
        }
    
        // Load the first question
        loadQuestion();
    }
    

    

    function showResult() {
        let mainRedFlagPercentage = 0;
        if (mainMaxScore > mainMinScore) {
            mainRedFlagPercentage = ((userScore - mainMinScore) / (mainMaxScore - mainMinScore)) * 100;
        }
        mainRedFlagPercentage = Math.min(100, Math.max(0, mainRedFlagPercentage));
    
        const categoryResults = Object.keys(categoryScores).map((category) => {
            const categoryMinScore = categoryMinScores[category] || 0;
            const categoryMaxScore = categoryMaxScores[category] || 0;
            const categoryScore = categoryScores[category] || 0;
    
            let categoryPercentage = 0;
            if (categoryMaxScore > categoryMinScore) {
                categoryPercentage = ((categoryScore - categoryMinScore) / (categoryMaxScore - categoryMinScore)) * 100;
            }
            return { 
                category, 
                percentage: Math.min(100, Math.max(0, categoryPercentage)),
            };
        });
    
        // Display the results in a polished format
        quizContainer.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <h2>Résultats du Test</h2>
                <p><strong>Pourcentage global de drapeau rouge:</strong></p>
                <div style="font-size: 2em; font-weight: bold; color: ${getColorForPercentage(mainRedFlagPercentage)};">
                    ${mainRedFlagPercentage.toFixed(2)}%
                </div>
                <h3>Résultats par catégorie</h3>
                <ul style="list-style: none; padding: 0;">
                    ${categoryResults
                        .map(
                            (result) =>
                                `<li style="margin-bottom: 10px;">
                                    <strong>${result.category}:</strong> 
                                    <span style="font-size: 1.5em; font-weight: bold; color: ${getColorForPercentage(result.percentage)};">
                                        ${result.percentage.toFixed(2)}%
                                    </span>
                                </li>`
                        )
                        .join('')}
                </ul>
            </div>
        `;
    }
    
    // Function to determine the color based on percentage
    function getColorForPercentage(percentage) {
        if (percentage > 75) return "#FF4C4C"; // Red for high risk
        if (percentage > 50) return "#FFA500"; // Orange for medium risk
        if (percentage > 25) return "#FFD700"; // Yellow for low-medium risk
        return "#4CAF50"; // Green for low risk
    }
    
    
});
