document.addEventListener('DOMContentLoaded', () => {

    const uploadView = document.getElementById('upload-view');
    const quizView = document.getElementById('quiz-view');
    const resultsView = document.getElementById('results-view');

    const fileInput = document.getElementById('file-input');
    const uploadBtn = document.getElementById('upload-btn');

    const questionCounter = document.getElementById('question-counter');
    const questionText = document.getElementById('question-text');
    const answersContainer = document.getElementById('answers-container');
    const nextBtn = document.getElementById('next-btn');

    const scoreText = document.getElementById('score-text');

    const restartBtn = document.getElementById('restart-btn');

    const exitBtn = document.getElementById('exit-btn');

    const infoDialog = document.getElementById('info-dialog');
    const infoBtn = document.getElementById('info-btn');
    const closeDialogBtn = document.getElementById('close-dialog-btn');

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const appTitle = document.getElementById('app-title');
    const quizRestartBtn = document.getElementById('quiz-restart-btn');
    const quizFooter = document.getElementById('quiz-footer');

    function initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

        document.documentElement.setAttribute('data-theme', theme);
        if (themeToggleBtn) {
            themeToggleBtn.querySelector('span').textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
        }

        const savedAmoled = localStorage.getItem('amoled') === 'true';
        if (savedAmoled) {
            document.documentElement.setAttribute('data-amoled', 'true');
        } else {
            document.documentElement.removeAttribute('data-amoled');
        }

        const amoledToggle = document.getElementById('amoled-toggle');
        if (amoledToggle) {
            amoledToggle.checked = savedAmoled;
        }
    }

    function toggleTheme() {
        const html = document.documentElement;
        const isDark = html.getAttribute('data-theme') === 'dark';
        html.setAttribute('data-theme', isDark ? 'light' : 'dark');
        themeToggleBtn.querySelector('span').textContent = isDark ? 'dark_mode' : 'light_mode';
        localStorage.setItem('theme', isDark ? 'light' : 'dark');
    }

    initializeTheme();

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    const amoledToggle = document.getElementById('amoled-toggle');
    if (amoledToggle) {
        amoledToggle.addEventListener('change', (e) => {
            const isAmoled = e.target.checked;
            if (isAmoled) {
                document.documentElement.setAttribute('data-amoled', 'true');
            } else {
                document.documentElement.removeAttribute('data-amoled');
            }
            localStorage.setItem('amoled', isAmoled);
        });
    }

    function createBooleanSetting(elementId, storageKey) {
        const toggle = document.getElementById(elementId);
        let value = localStorage.getItem(storageKey) === 'true';

        if (toggle) {
            toggle.checked = value;
            toggle.addEventListener('change', (e) => {
                value = e.target.checked;
                localStorage.setItem(storageKey, value);
            });
        }

        return {
            get: () => value,
            set: (newValue) => {
                value = newValue;
                localStorage.setItem(storageKey, value);
                if (toggle) toggle.checked = value;
            }
        };
    }

    const shuffleAnswersSetting = createBooleanSetting('shuffle-answers-toggle', 'shuffle_answers');
    const shuffleQuestionsSetting = createBooleanSetting('shuffle-questions-toggle', 'shuffle_questions');
    const autoCheckSetting = createBooleanSetting('auto-check-toggle', 'auto_check');
    const autoSkipSetting = createBooleanSetting('auto-skip-toggle', 'auto_skip');

    function updateDisabledSettings() {
        const autoCheckToggle = document.getElementById('auto-check-toggle');

        if (infiniteModeToggle) {
            const settingItem = infiniteModeToggle.closest('.setting-item');
            if (testMode) {
                infiniteModeToggle.disabled = true;
                if (settingItem) settingItem.classList.add('disabled');
            } else {
                infiniteModeToggle.disabled = false;
                if (settingItem) settingItem.classList.remove('disabled');
            }
        }

        if (autoCheckToggle) {
            const settingItem = autoCheckToggle.closest('.setting-item');
            if (testMode) {
                autoCheckToggle.disabled = true;
                if (settingItem) settingItem.classList.add('disabled');
            } else {
                autoCheckToggle.disabled = false;
                if (settingItem) settingItem.classList.remove('disabled');
            }
        }

        const autoSkipToggle = document.getElementById('auto-skip-toggle');
        if (autoSkipToggle) {
            const settingItem = autoSkipToggle.closest('.setting-item');
            if (testMode) {
                autoSkipToggle.disabled = true;
                if (settingItem) settingItem.classList.add('disabled');
            } else {
                autoSkipToggle.disabled = false;
                if (settingItem) settingItem.classList.remove('disabled');
            }
        }
    }

    const testModeToggle = document.getElementById('test-mode-toggle');
    let testMode = localStorage.getItem('test_mode') === 'true';

    if (testModeToggle) {
        testModeToggle.checked = testMode;
        testModeToggle.addEventListener('change', (e) => {
            testMode = e.target.checked;
            localStorage.setItem('test_mode', testMode);
            loadSavedTests();
            updateAppTitle();
            updateDisabledSettings();
        });
    }

    const infiniteModeToggle = document.getElementById('infinite-mode-toggle');
    let infiniteMode = localStorage.getItem('infinite_mode') === 'true';

    if (infiniteModeToggle) {
        infiniteModeToggle.checked = infiniteMode;
        infiniteModeToggle.addEventListener('change', (e) => {
            infiniteMode = e.target.checked;
            localStorage.setItem('infinite_mode', infiniteMode);

            if (quizRestartBtn && !quizView.classList.contains('hidden')) {
                quizRestartBtn.classList.toggle('hidden', infiniteMode);
            }
        });
    }

    updateDisabledSettings();

    function updateAppTitle() {
        if (!appTitle) return;
        if (quizView && !quizView.classList.contains('hidden')) {
            return;
        }

        if (testMode) {
            appTitle.innerHTML = '<span class="material-symbols-outlined icon-inherit">assignment_late</span> Tryb Testu';
            appTitle.classList.add('app-title-test-mode');
        } else {
            appTitle.textContent = 'Teścik';
            appTitle.classList.remove('app-title-test-mode');
        }
    }

    let questions = [];
    let quizQueue = [];
    let masteredCount = 0;
    let score = 0;
    let selectedAnswerIndices = new Set();
    let testTitle = null;
    let currentTestId = null;
    let autoSkipTimerId = null;

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function isAnswerCorrect(correctIndices, selectedIndices) {
        if (correctIndices.length !== selectedIndices.size) return false;
        return correctIndices.every(i => selectedIndices.has(i));
    }

    function setupDialogClickOutside(dialog) {
        dialog.addEventListener('click', (e) => {
            const rect = dialog.getBoundingClientRect();
            const isInDialog = rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
                rect.left <= e.clientX && e.clientX <= rect.left + rect.width;
            if (!isInDialog) {
                closeDialog(dialog);
            }
        });
    }

    function closeDialog(dialog) {
        dialog.classList.add('closing');
        dialog.addEventListener('animationend', () => {
            dialog.classList.remove('closing');
            dialog.close();
        }, { once: true });
    }

    function transitionToNextQuestion() {
        const questionCard = document.querySelector('.question-card');
        questionCard.classList.add('card-exit');
        questionCard.addEventListener('animationend', () => {
            questionCard.classList.remove('card-exit');
            renderQuestion();
            questionCard.classList.add('card-enter');
            questionCard.addEventListener('animationend', () => {
                questionCard.classList.remove('card-enter');
            }, { once: true });
        }, { once: true });
    }

    function saveProgress(questionIndex) {
        if (!currentTestId) return;
        const key = `quiz_progress_${currentTestId}`;
        const progress = JSON.parse(localStorage.getItem(key) || '{"masteredIndices": []}');
        if (!progress.masteredIndices.includes(questionIndex)) {
            progress.masteredIndices.push(questionIndex);
        }
        progress.masteredCount = progress.masteredIndices.length;
        progress.lastUpdated = new Date().toISOString();
        localStorage.setItem(key, JSON.stringify(progress));
    }

    function loadProgress() {
        if (!currentTestId) return null;
        return JSON.parse(localStorage.getItem(`quiz_progress_${currentTestId}`) || 'null');
    }

    function clearProgress() {
        if (!currentTestId) return;
        localStorage.removeItem(`quiz_progress_${currentTestId}`);
    }

    function saveTestSession(currentScore, queue) {
        if (!currentTestId) return;
        const key = `test_session_${currentTestId}`;
        const queueIndices = queue.map(q => questions.indexOf(q));
        const session = {
            score: currentScore,
            queueIndices: queueIndices,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem(key, JSON.stringify(session));
    }

    function loadTestSession() {
        if (!currentTestId) return null;
        return JSON.parse(localStorage.getItem(`test_session_${currentTestId}`) || 'null');
    }

    function clearTestSession() {
        if (!currentTestId) return;
        localStorage.removeItem(`test_session_${currentTestId}`);
    }

    if (infoBtn && infoDialog) {
        infoBtn.addEventListener('click', () => {
            infoDialog.showModal();
        });

        closeDialogBtn.addEventListener('click', () => {
            closeDialog(infoDialog);
        });

        setupDialogClickOutside(infoDialog);
    }

    const aboutDialog = document.getElementById('about-dialog');
    const aboutBtn = document.getElementById('about-btn');
    const closeAboutBtn = document.getElementById('close-about-btn');

    if (aboutBtn && aboutDialog) {
        aboutBtn.addEventListener('click', () => {
            aboutDialog.showModal();
        });

        if (closeAboutBtn) {
            closeAboutBtn.addEventListener('click', () => {
                closeDialog(aboutDialog);
            });
        }

        setupDialogClickOutside(aboutDialog);
    }

    const settingsDialog = document.getElementById('settings-dialog');
    const settingsBtn = document.getElementById('settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');

    if (settingsBtn && settingsDialog) {
        settingsBtn.addEventListener('click', () => {
            settingsDialog.showModal();
        });

        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                closeDialog(settingsDialog);
            });
        }

        setupDialogClickOutside(settingsDialog);
    }

    const exportBtn = document.getElementById('export-data-btn');
    const importBtn = document.getElementById('import-data-btn');
    const importInput = document.getElementById('import-file-input');

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const data = {
                saved_tests: JSON.parse(localStorage.getItem('saved_tests') || '[]'),
                settings: {
                    theme: localStorage.getItem('theme'),
                    infinite_mode: localStorage.getItem('infinite_mode'),
                    amoled: localStorage.getItem('amoled'),
                    test_mode: localStorage.getItem('test_mode'),
                    shuffle_questions: localStorage.getItem('shuffle_questions'),
                    shuffle_answers: localStorage.getItem('shuffle_answers'),
                    auto_check: localStorage.getItem('auto_check'),
                    auto_skip: localStorage.getItem('auto_skip')
                },
                progress: {},
                timestamp: Date.now()
            };

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('quiz_progress_') || key.startsWith('test_session_')) {
                    data.progress[key] = JSON.parse(localStorage.getItem(key));
                }
            }

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().split('T')[0];
            a.download = `tescik_backup_${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    if (importBtn && importInput) {
        importBtn.addEventListener('click', () => importInput.click());

        importInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);

                    if (!data.saved_tests) {
                        alert("Nieprawidłowy plik kopii zapasowej (brak saved_tests).");
                        return;
                    }

                    showConfirm(
                        "Przywróć dane",
                        "Ta operacja nadpisze wszystkie obecne testy i postępy. Strona zostanie odświeżona. Czy kontynuować?",
                        () => {
                            localStorage.removeItem('saved_tests');
                            const keysToRemove = [];
                            for (let i = 0; i < localStorage.length; i++) {
                                const key = localStorage.key(i);
                                if (key.startsWith('quiz_progress_') || key.startsWith('test_session_')) {
                                    keysToRemove.push(key);
                                }
                            }
                            keysToRemove.forEach(k => localStorage.removeItem(k));
                            if (data.settings) {
                                if (data.settings.theme) localStorage.setItem('theme', data.settings.theme);
                                if (data.settings.infinite_mode) localStorage.setItem('infinite_mode', data.settings.infinite_mode);
                                if (data.settings.amoled) localStorage.setItem('amoled', data.settings.amoled);
                                if (data.settings.test_mode) localStorage.setItem('test_mode', data.settings.test_mode);
                                if (data.settings.shuffle_questions) localStorage.setItem('shuffle_questions', data.settings.shuffle_questions);
                                if (data.settings.shuffle_answers) localStorage.setItem('shuffle_answers', data.settings.shuffle_answers);
                                if (data.settings.auto_check) localStorage.setItem('auto_check', data.settings.auto_check);
                                if (data.settings.auto_skip) localStorage.setItem('auto_skip', data.settings.auto_skip);
                            }

                            localStorage.setItem('saved_tests', JSON.stringify(data.saved_tests));

                            if (data.progress) {
                                Object.keys(data.progress).forEach(key => {
                                    localStorage.setItem(key, JSON.stringify(data.progress[key]));
                                });
                            }

                            window.location.reload();
                        }
                    );
                } catch (err) {
                    console.error(err);
                    alert("Błąd podczas wczytywania pliku: " + err.message);
                }
                e.target.value = '';
            };
            reader.readAsText(file);
        });
    }

    const deleteAllRow = document.getElementById('delete-all-row');
    if (deleteAllRow) {
        deleteAllRow.addEventListener('click', () => {
            showConfirm(
                "Usuń wszystkie testy",
                "Czy na pewno chcesz usunąć wszystkie zapisane testy? Tej operacji nie można cofnąć.",
                () => {
                    const tests = JSON.parse(localStorage.getItem('saved_tests') || '[]');
                    tests.forEach(test => {
                        localStorage.removeItem(`quiz_progress_${test.id}`);
                        localStorage.removeItem(`test_session_${test.id}`);
                    });
                    localStorage.removeItem('saved_tests');
                    loadSavedTests();
                }
            );
        });
    }

    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
        fileInput.value = '';
    });

    const uploadCard = document.querySelector('.upload-card');

    uploadCard.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadCard.style.backgroundColor = 'var(--md-sys-color-secondary-container)';
    });

    uploadCard.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadCard.style.backgroundColor = '';
    });

    uploadCard.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadCard.style.backgroundColor = '';
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (autoSkipTimerId) {
            clearTimeout(autoSkipTimerId);
            autoSkipTimerId = null;
            quizFooter.classList.remove('auto-skip-active');
        }

        const q = quizQueue[0];
        const isMultiAnswer = q && q.correctIndices.length > 1;

        if (testMode) {
            if (isAnswerCorrect(q.correctIndices, selectedAnswerIndices)) {
                score++;
            }

            quizQueue.shift();

            saveTestSession(score, quizQueue);

            if (quizQueue.length > 0) {
                transitionToNextQuestion();
            } else {
                showResults();
            }

        } else {
            if (isMultiAnswer && nextBtn.textContent === 'Sprawdź') {
                verifyAndShowResult(q);
                return;
            }

            quizQueue.shift();
            if (quizQueue.length > 0) {
                transitionToNextQuestion();
            } else {
                showResults();
            }
        }
    });

    restartBtn.addEventListener('click', () => {
        clearProgress();
        clearTestSession();
        startQuiz();
    });

    const confirmDialog = document.getElementById('confirm-dialog');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');

    let onConfirmCallback = null;

    if (confirmDialog) {
        confirmCancelBtn.addEventListener('click', () => {
            closeDialog(confirmDialog);
            onConfirmCallback = null;
        });

        confirmOkBtn.addEventListener('click', () => {
            closeDialog(confirmDialog);
            if (onConfirmCallback) {
                onConfirmCallback();
                onConfirmCallback = null;
            }
        });

        setupDialogClickOutside(confirmDialog);
    }

    function showConfirm(title, message, callback) {
        if (!confirmDialog) {
            if (confirm(message)) callback();
            return;
        }
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        onConfirmCallback = callback;
        confirmDialog.showModal();
    }

    if (exitBtn) {
        exitBtn.addEventListener('click', () => {
            showView(uploadView);
            questions = [];
            testTitle = null;
            currentTestId = null;
            loadSavedTests();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (quizView.classList.contains('hidden')) return;

        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!nextBtn.disabled) {
                nextBtn.click();
            }
            return;
        }

        if (e.key >= '1' && e.key <= '9') {
            const index = parseInt(e.key) - 1;
            const buttons = answersContainer.querySelectorAll('.answer-option');

            if (index < buttons.length) {
                const btn = buttons[index];
                if (!btn.disabled) {
                    if (quizQueue.length > 0) {
                        const currentQuestion = quizQueue[0];
                        const originalIndex = parseInt(btn.dataset.originalIndex);
                        handleAnswerSelect(originalIndex, btn, currentQuestion);
                    }
                }
            }
        }
    });

    function handleFileUpload(file) {
        if (file.type !== "text/plain" && !file.name.endsWith('.txt')) {
            alert("Proszę wgrać plik .txt");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            testTitle = null;
            const parsedQuestions = parseQuestions(content);
            if (parsedQuestions.length > 0) {
                saveTest(testTitle, parsedQuestions);
            } else {
                alert("Nie udało się znaleźć pytań w pliku. Sprawdź format.");
            }
        };
        reader.readAsText(file);
    }

    function parseQuestions(text) {
        const lines = text.split('\n');
        const parsed = [];
        let currentQuestion = null;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            const marker = trimmed.charAt(0);
            const content = trimmed.substring(1).trim();

            if (marker === '$') {
                testTitle = content;
            } else if (marker === '?') {
                if (currentQuestion) {
                    parsed.push(currentQuestion);
                }
                currentQuestion = {
                    text: content,
                    answers: [],
                    correctIndices: []
                };
            } else if ((marker === '-' || marker === '+') && currentQuestion) {
                currentQuestion.answers.push(content);
                if (marker === '+') {
                    currentQuestion.correctIndices.push(currentQuestion.answers.length - 1);
                }
            }
        });

        if (currentQuestion) {
            parsed.push(currentQuestion);
        }

        return parsed.filter(q => q.answers.length > 0);
    }

    function startQuiz() {
        questions.forEach(q => {
            if (q.correctIndex !== undefined && !q.correctIndices) {
                q.correctIndices = q.correctIndex >= 0 ? [q.correctIndex] : [];
            }
        });

        const savedProgress = loadProgress();
        const masteredSet = new Set(savedProgress?.masteredIndices || []);

        if (testMode) {
            const session = loadTestSession();
            if (session && session.queueIndices && session.queueIndices.length > 0) {
                quizQueue = session.queueIndices.map(idx => questions[idx]).filter(q => q !== undefined);
                score = session.score || 0;
                masteredCount = 0;
            } else {
                const remainingQuestions = questions.filter((_, idx) => !masteredSet.has(idx));

                if (shuffleQuestionsSetting.get()) {
                    quizQueue = shuffleArray([...remainingQuestions]);
                } else {
                    quizQueue = [...remainingQuestions];
                }
                score = 0;
            }
        } else {
            let remainingQuestions;

            if (infiniteMode) {
                remainingQuestions = [...questions];
            } else {
                remainingQuestions = questions.filter((_, idx) => !masteredSet.has(idx));
            }

            if (remainingQuestions.length === 0) {
                if (testTitle) {
                    appTitle.textContent = testTitle;
                }
                showResults();
                return;
            }

            if (shuffleQuestionsSetting.get()) {
                quizQueue = shuffleArray([...remainingQuestions]);
            } else {
                quizQueue = [...remainingQuestions];
            }
            masteredCount = savedProgress?.masteredCount || 0;
            score = 0;
        }

        appTitle.classList.remove('app-title-test-mode');
        if (testTitle) {
            appTitle.textContent = testTitle;
        } else {
            appTitle.textContent = 'Teścik';
        }

        showView(quizView);
        renderQuestion();
    }

    function renderQuestion() {
        const q = quizQueue[0];
        const isMultiAnswer = q.correctIndices.length > 1;

        if (testMode) {
            const completed = questions.length - quizQueue.length;
            questionCounter.textContent = `Pytanie: ${completed + 1} / ${questions.length}`;
        } else {
            if (infiniteMode) {
                questionCounter.textContent = "Tryb nieskończony";
            } else {
                questionCounter.textContent = `Zaliczono: ${masteredCount} / ${questions.length}`;
            }
        }
        questionText.textContent = q.text;

        answersContainer.innerHTML = '';
        selectedAnswerIndices.clear();
        nextBtn.disabled = true;

        if (testMode) {
            nextBtn.textContent = 'Dalej';
        } else {
            nextBtn.textContent = isMultiAnswer ? 'Sprawdź' : 'Dalej';
        }

        let indices = q.answers.map((_, i) => i);
        if (shuffleAnswersSetting.get()) {
            indices = shuffleArray(indices);
        }

        indices.forEach(originalIndex => {
            const ans = q.answers[originalIndex];
            const btn = document.createElement('button');
            btn.classList.add('answer-option');
            if (isMultiAnswer) btn.classList.add('multi-select');
            btn.textContent = ans;
            btn.dataset.originalIndex = originalIndex;
            btn.onclick = () => handleAnswerSelect(originalIndex, btn, q);
            answersContainer.appendChild(btn);
        });
    }

    function handleAnswerSelect(index, btnElement, question) {
        const isMultiAnswer = question.correctIndices.length > 1;

        if (isMultiAnswer) {
            if (selectedAnswerIndices.has(index)) {
                selectedAnswerIndices.delete(index);
                btnElement.classList.remove('selected');
            } else {
                selectedAnswerIndices.add(index);
                btnElement.classList.add('selected');
            }

            if (!testMode && autoCheckSetting.get() && selectedAnswerIndices.size === question.correctIndices.length) {
                verifyAndShowResult(question);
                return;
            }

            nextBtn.disabled = selectedAnswerIndices.size === 0;
        } else {
            if (testMode) {
                if (selectedAnswerIndices.has(index)) return;

                selectedAnswerIndices.clear();
                const allBtns = answersContainer.querySelectorAll('.answer-option');
                allBtns.forEach(btn => btn.classList.remove('selected'));

                selectedAnswerIndices.add(index);
                btnElement.classList.add('selected');
                nextBtn.disabled = false;
            } else {
                if (selectedAnswerIndices.size > 0) return;
                selectedAnswerIndices.add(index);
                verifyAndShowResult(question);
            }
        }
    }

    function verifyAndShowResult(question) {
        const buttons = answersContainer.querySelectorAll('.answer-option');
        const correctSet = new Set(question.correctIndices);
        const isCorrect = isAnswerCorrect(question.correctIndices, selectedAnswerIndices);

        buttons.forEach((btn) => {
            const idx = parseInt(btn.dataset.originalIndex);
            if (correctSet.has(idx)) btn.classList.add('correct');
            if (selectedAnswerIndices.has(idx) && !correctSet.has(idx)) btn.classList.add('wrong');
            btn.disabled = true;
        });

        if (isCorrect) {
            masteredCount++;
            score++;
            const originalIndex = questions.indexOf(question);

            if (!infiniteMode) {
                saveProgress(originalIndex);
            } else {
                if (shuffleQuestionsSetting.get()) {
                    const randomIndex = Math.floor(Math.random() * (quizQueue.length + 1));
                    quizQueue.splice(randomIndex, 0, question);
                } else {
                    quizQueue.push(question);
                }
            }
        } else {
            if (infiniteMode && shuffleQuestionsSetting.get()) {
                const randomIndex = Math.floor(Math.random() * (quizQueue.length + 1));
                quizQueue.splice(randomIndex, 0, question);
            } else {
                quizQueue.push(question);
            }
        }

        nextBtn.textContent = 'Dalej';
        nextBtn.disabled = false;

        if (isCorrect && autoSkipSetting.get()) {
            nextBtn.disabled = true;
            quizFooter.classList.remove('auto-skip-active');
            void quizFooter.offsetWidth;
            quizFooter.classList.add('auto-skip-active');

            autoSkipTimerId = setTimeout(() => {
                quizFooter.classList.remove('auto-skip-active');
                quizQueue.shift();
                if (quizQueue.length > 0) {
                    transitionToNextQuestion();
                } else {
                    showResults();
                }
            }, 750);
        }
    }

    function showResults() {
        clearTestSession();
        showView(resultsView);

        if (testMode) {
            const total = questions.length;
            const percent = Math.round((score / total) * 100);

            let message = "";
            if (percent === 100) message = "Świetnie! Mistrzowska wiedza!";
            else if (percent >= 80) message = "Bardzo dobrze!";
            else if (percent >= 50) message = "Pewnie zaliczone, ale warto powtórzyć.";
            else message = "Musisz jeszcze poćwiczyć.";

            scoreText.innerHTML = `Wynik: <b>${score} / ${total}</b> (${percent}%)<br><span class="score-message">${message}</span>`;
        } else {
            scoreText.textContent = "Wszystkie pytania zaliczone!";
        }
    }

    if (quizRestartBtn) {
        quizRestartBtn.addEventListener('click', () => {
            const title = testMode ? "Restart sesji" : "Restart postępu";
            const msg = testMode
                ? "Czy na pewno chcesz zrestartować test? Utracisz postęp bieżącej sesji."
                : "Czy na pewno chcesz zacząć od nowa? Postęp zostanie wyzerowany.";

            showConfirm(title, msg, () => {
                if (testMode) clearTestSession();
                clearProgress();
                startQuiz();
            });
        });
    }

    function showView(viewElement) {
        [uploadView, quizView, resultsView].forEach(v => {
            v.classList.add('hidden');
            v.classList.remove('active');
        });
        viewElement.classList.remove('hidden');
        viewElement.classList.add('active');

        if (viewElement === quizView) {
            quizFooter.classList.remove('hidden');
        } else {
            quizFooter.classList.add('hidden');
        }

        if (viewElement === uploadView) {
            updateAppTitle();
        }

        if (quizRestartBtn) {
            quizRestartBtn.classList.toggle('hidden', viewElement !== quizView || infiniteMode);
        }

        if (exitBtn) {
            exitBtn.classList.toggle('hidden', viewElement === uploadView);
        }

        const isUploadView = viewElement === uploadView;
        [themeToggleBtn, aboutBtn, settingsBtn].forEach(btn => {
            if (btn) btn.classList.toggle('hidden', !isUploadView);
        });
    }

    function saveTest(title, questionsData) {
        const tests = JSON.parse(localStorage.getItem('saved_tests') || '[]');
        const now = new Date();
        const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

        const newTest = {
            id: Date.now(),
            title: title || `Test ${formattedDate}`,
            questions: questionsData,
            date: formattedDate
        };
        tests.push(newTest);
        localStorage.setItem('saved_tests', JSON.stringify(tests));
        loadSavedTests();
    }

    function loadSavedTests() {
        const tests = JSON.parse(localStorage.getItem('saved_tests') || '[]');
        renderSavedTests(tests);
    }

    function deleteTest(id, event) {
        event.stopPropagation();
        showConfirm("Usuń test", "Czy na pewno chcesz usunąć ten test?", () => {
            const tests = JSON.parse(localStorage.getItem('saved_tests') || '[]');
            const updatedTests = tests.filter(t => t.id !== id);
            localStorage.setItem('saved_tests', JSON.stringify(updatedTests));
            loadSavedTests();
        });
    }

    function renderSavedTests(tests) {
        const container = document.getElementById('saved-tests-container');
        if (!container) return;

        container.innerHTML = '';

        tests.forEach(test => {
            const card = document.createElement('div');
            card.className = 'saved-test-card';
            card.onclick = () => {
                currentTestId = test.id;
                questions = test.questions;
                testTitle = test.title;
                startQuiz();
            };

            const title = document.createElement('div');
            title.className = 'saved-test-title';
            title.textContent = test.title;

            const progressKey = `quiz_progress_${test.id}`;
            const progress = JSON.parse(localStorage.getItem(progressKey) || 'null');

            const sessionKey = `test_session_${test.id}`;
            const session = JSON.parse(localStorage.getItem(sessionKey) || 'null');

            const info = document.createElement('div');
            info.className = 'saved-test-info';

            if (testMode && session && session.queueIndices) {
                const total = test.questions.length;
                const completed = total - session.queueIndices.length;
                info.innerHTML = `<span class="text-primary">W trakcie testu: ${completed}/${total}</span> • ${test.date}`;

                const restartBtn = document.createElement('button');
                restartBtn.className = 'restart-test-btn';
                restartBtn.title = 'Zrestartuj sesję testu';
                restartBtn.innerHTML = '<span class="material-symbols-outlined">refresh</span>';
                restartBtn.onclick = (e) => {
                    e.stopPropagation();
                    showConfirm("Restart sesji", "Czy chcesz zrestartować ten test? Utracisz postęp bieżącej sesji.", () => {
                        localStorage.removeItem(sessionKey);
                        loadSavedTests();
                    });
                };
                card.appendChild(restartBtn);

            } else if (progress && progress.masteredCount > 0) {
                info.textContent = `Zaliczono: ${progress.masteredCount}/${test.questions.length} • ${test.date}`;
            } else {
                info.textContent = `${test.questions.length} pytań • ${test.date}`;
            }

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-test-btn';
            deleteBtn.innerHTML = '<span class="material-symbols-outlined">delete</span>';
            deleteBtn.onclick = (e) => deleteTest(test.id, e);

            card.appendChild(deleteBtn);
            card.appendChild(title);
            card.appendChild(info);
            container.appendChild(card);
        });
    }

    loadSavedTests();
    updateAppTitle();
});