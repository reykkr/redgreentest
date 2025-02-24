document.addEventListener('DOMContentLoaded', function () {
    // --- DOM Elements ---
    const form = document.getElementById('quizForm');
    const versionLongueBtn = document.getElementById('versionLongue');
    const versionCourteBtn = document.getElementById('versionCourte');
    const categoriesDiv = document.getElementById('categories');
    const categoryButtons = document.querySelectorAll('.category-button');
    const quizSection = document.getElementById('quizSection');
    const quizContainer = document.getElementById('quizQuestions');
  
    document.getElementById('backHome').addEventListener('click', function() {
        window.location.href = "index.html";
      });

    // --- State Variables ---
    let testVersion = 'longue'; // default
    let selectedCategory = null; // only one allowed for short version
  
    // --- Helper: Map Button IDs to Category Names ---
    function mapCategory(buttonId) {
      switch (buttonId) {
        case 'viePro': return 'Vie Pro';
        case 'vieSexuelle': return 'Vie Sexuelle';
        case 'vieAmoureuse': return 'Vie Amoureuse';
        case 'vieSociale' : return 'Vie Sociale';
        case 'vieAmoureuse2' : return 'Vie Amoureuse 2';
        default: return buttonId;
      }
    }
  
    // --- Test Type Button Listeners ---
    versionLongueBtn.addEventListener('click', function () {
      testVersion = 'longue';
      versionLongueBtn.classList.add('active');
      versionCourteBtn.classList.remove('active');
      categoriesDiv.style.display = 'none';
    });
  
    versionCourteBtn.addEventListener('click', function () {
      testVersion = 'courte';
      versionCourteBtn.classList.add('active');
      versionLongueBtn.classList.remove('active');
      categoriesDiv.style.display = 'block';
    });
  
    // --- Category Selection (Only one allowed) ---
    categoryButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        // Deselect any previously selected category
        categoryButtons.forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        selectedCategory = this.id; // store the selected category button id
      });
    });
  
    // --- Form Submission ---
    form.addEventListener('submit', function (e) {
      e.preventDefault();
  
      // If short version, ensure a category has been selected.
      if (testVersion === 'courte' && !selectedCategory) {
        alert('Veuillez sélectionner une catégorie pour la version courte.');
        return;
      }
  
      // Hide the form and show the quiz section
      document.querySelector('.form-container').style.display = 'none';
      quizSection.style.display = 'block';
  
      loadQuestions(testVersion);
    });
  
    // --- Load Questions ---
    function loadQuestions(version) {
      fetch('data/questions.json')
        .then(response => response.json())
        .then(data => {
          let questions = [];
          if (version === 'courte') {
            const categoryName = mapCategory(selectedCategory);
            questions = data.filter(q =>
              q.category.toLowerCase() === categoryName.toLowerCase()
            );
            questions = questions.sort((a, b) => a.Priority - b.Priority);
          } else if (version === 'longue') {
            questions = data.sort(() => 0.5 - Math.random());
            // Optionally, slice to a specific number of questions:
            // questions = questions.slice(0, 50);
          }
          displayQuestions(questions);
        })
        .catch(err => console.error('Error loading questions:', err));
    }
  
    // --- Game Logic: Display Questions, Record Answers, Calculate Score ---
    function displayQuestions(questions) {
        let currentIndex = 0;
        const totalQuestions = questions.length;
        // Array for storing responses. Each entry is either:
        //   null – not answered,
        //   { answered: true, answerIndex, outcome } – if answered,
        //   { skipped: true } – if skipped.
        const userResponses = new Array(totalQuestions).fill(null);
        const progressText = document.getElementById("progress-text");
      
        function updateProgress() {
          progressText.textContent = `Progress: ${currentIndex + 1}/${totalQuestions}`;
        }
      
        function showQuestion() {
          quizContainer.innerHTML = '';
          // If we've gone past the last question, show results.
          if (currentIndex >= totalQuestions) {
            showResults();
            return;
          }
      
          updateProgress();
          const q = questions[currentIndex];
          const questionDiv = document.createElement('div');
          questionDiv.classList.add('question');
          questionDiv.innerHTML = `<h3>Question ${currentIndex + 1} / ${totalQuestions}</h3>
                                   <p>${q.question}</p>`;
      
          // Create answer buttons
          q.answers.forEach((answer, index) => {
            const answerBtn = document.createElement('button');
            answerBtn.textContent = answer;
            // Dans le gestionnaire d'événement du bouton de réponse :
            answerBtn.addEventListener('click', function () {
            const scoreBrut = q.outcomes[index];
            let resultat = scoreBrut;
            // Si le score brut est supérieur à 5, appliquer le multiplicateur en tant que pénalité
            if (scoreBrut > 4) {
            resultat = scoreBrut * q.multiplier;
            }
            userResponses[currentIndex] = { answered: true, answerIndex: index, outcome: resultat };
            currentIndex++;
            showQuestion();
            });
  
            questionDiv.appendChild(answerBtn);
          });
      
          // Create a container for navigation buttons (Back, End Test, Skip)
          const navContainer = document.createElement('div');
          navContainer.style.display = 'flex';
          navContainer.style.justifyContent = 'space-between';
          navContainer.style.alignItems = 'center';
          navContainer.style.marginTop = '15px';
      
          // Back Button
          const backBtn = document.createElement('button');
          backBtn.textContent = 'Back';
          if (currentIndex === 0) {
            backBtn.disabled = true;
          }
          backBtn.addEventListener('click', function () {
            if (currentIndex > 0) {
              // Reset the last response so its score is cleared
              currentIndex--;
              userResponses[currentIndex] = null;
              showQuestion();
            }
          });
      
          // End Test Button
          const endTestBtn = document.createElement('button');
          endTestBtn.textContent = 'End Test';
          endTestBtn.addEventListener('click', function () {
            // Immediately end test—only count questions up to currentIndex.
            showResults(true);
          });
      
          // Skip Button
          const skipBtn = document.createElement('button');
          skipBtn.textContent = 'Skip';
          skipBtn.addEventListener('click', function () {
            // Mark the current question as skipped so it isn't counted
            userResponses[currentIndex] = { skipped: true };
            currentIndex++;
            showQuestion();
          });
      
          // Append the navigation buttons to the container
          navContainer.appendChild(backBtn);
          navContainer.appendChild(endTestBtn);
          navContainer.appendChild(skipBtn);
          questionDiv.appendChild(navContainer);
          quizContainer.appendChild(questionDiv);
        }
      
        // Show results. If earlyEnd is true, only evaluate up to currentIndex.
        function showResults(earlyEnd = false) {
            let totalScore = 0, minTotal = 0, maxTotal = 0;
            const questionsToEvaluate = earlyEnd ? questions.slice(0, currentIndex) : questions;
          
            questionsToEvaluate.forEach((q, i) => {
              const response = userResponses[i];
              if (response && response.answered) {
                totalScore += response.outcome;
                // Les bornes restent les valeurs de base, sans multiplier par le multiplicateur
                const minOutcome = Math.min(...q.outcomes);
                const maxOutcome = Math.max(...q.outcomes);
                minTotal += minOutcome;
                maxTotal += maxOutcome;
              }
            });
          
            // Si aucune question n'a été répondue, afficher un message spécial.
            const answeredCount = questionsToEvaluate.filter((q, i) => userResponses[i] && userResponses[i].answered).length;
            if (answeredCount === 0 && questionsToEvaluate.length > 0) {
              quizContainer.innerHTML = `<h2>Résultats du Test</h2>
                <p>Tricheur ! Vous avez passé toutes les questions. Vous êtes 100% drapeau rouge !</p>`;
              addRestartButton();
              return;
            }
          
            let percentage = 0;
            if (maxTotal > minTotal) {
              percentage = ((totalScore - minTotal) / (maxTotal - minTotal)) * 100;
            }
            quizContainer.innerHTML = `
              <h2>Résultats du Test</h2>
              <p>Votre score : ${percentage.toFixed(2)}%</p>
            `;
            
            addRestartButton();
          }
          
          
          // Fonction pour ajouter le bouton de redémarrage
          function addRestartButton() {
            const restartBtn = document.createElement('button');
            restartBtn.textContent = 'Recommencer le test';
            restartBtn.style.display = 'block';
            restartBtn.style.margin = '20px auto 0';
            restartBtn.addEventListener('click', function () {
              // Affiche le formulaire et masque la section du quiz
              document.querySelector('.form-container').style.display = 'block';
              quizSection.style.display = 'none';
              // Réinitialise le formulaire et toutes les variables nécessaires
              form.reset();
            });
            quizContainer.appendChild(restartBtn);
          }
      
        showQuestion();
      }      
    });          
  