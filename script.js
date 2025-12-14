// Глобальные переменные
let questions = [];
let currentQuestionIndex = 0;
let filteredQuestions = [];
let userAnswers = {}; // { questionIndex: selectedOption }
let stats = {
    correct: 0,
    incorrect: 0,
    skipped: 0
};
let testStartTime = null; // Время начала теста

// Счетчик онлайн пользователей
let onlineUsers = 0;
const ONLINE_STORAGE_KEY = 'online_users';
const USER_ID_KEY = 'user_id';
const LAST_ACTIVITY_KEY = 'last_activity';
const ACTIVITY_TIMEOUT = 30000; // 30 секунд - время неактивности для удаления из списка

// Функция преобразования буквы в цифру для отображения
function letterToNumber(letter) {
    const mapping = {
        'a': '1',
        'b': '2',
        'c': '3',
        'd': '4',
        'e': '5'
    };
    return mapping[letter.toLowerCase()] || letter;
}

// Функция преобразования цифры в букву (для обратной конвертации, если нужно)
function numberToLetter(number) {
    const mapping = {
        '1': 'a',
        '2': 'b',
        '3': 'c',
        '4': 'd',
        '5': 'e'
    };
    return mapping[number] || number;
}

// Загрузка вопросов
async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        questions = await response.json();
        
        // Проверяем, указаны ли правильные ответы
        // Если правильный ответ не указан (null), нужно указать его вручную в JSON файле
        questions.forEach((q, index) => {
            if (q.correct === null || q.correct === undefined) {
                console.warn(`Вопрос ${index + 1}: правильный ответ не указан. Укажите его в поле "correct" в JSON файле.`);
                // Временно устанавливаем первый вариант (замените на правильный ответ в JSON)
                q.correct = q.options[0]?.letter || 'a';
            }
        });
        
        filteredQuestions = [...questions];
        // Засекаем время начала теста
        testStartTime = Date.now();
        updateQuestionCounter();
        createQuestionsNavigation();
        displayQuestion();
        updateStats();
    } catch (error) {
        console.error('Ошибка загрузки вопросов:', error);
        document.getElementById('questionText').textContent = 'Ошибка загрузки вопросов. Убедитесь, что файл questions.json существует.';
    }
}

// Фильтрация по категории
function filterByCategory(category) {
    if (category === 'all') {
        filteredQuestions = [...questions];
    } else {
        filteredQuestions = questions.filter(q => q.category === category);
    }
    currentQuestionIndex = 0;
    userAnswers = {};
    stats = { correct: 0, incorrect: 0, skipped: 0 };
    // Сбрасываем время начала теста при смене категории
    testStartTime = Date.now();
    updateQuestionCounter();
    createQuestionsNavigation();
    displayQuestion();
    updateStats();
}

// Отображение вопроса
function displayQuestion() {
    if (filteredQuestions.length === 0) {
        document.getElementById('questionText').textContent = 'Вопросы не найдены';
        return;
    }
    
    const question = filteredQuestions[currentQuestionIndex];
    
    // Обновляем заголовок
    document.getElementById('questionId').textContent = `Вопрос #${currentQuestionIndex + 1}`;
    document.getElementById('categoryBadge').textContent = question.category;
    
    // Обновляем текст вопроса
    document.getElementById('questionText').textContent = question.question;
    
    // Создаем варианты ответов
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    question.options.forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.dataset.letter = option.letter;
        
        const letterDiv = document.createElement('div');
        letterDiv.className = 'option-letter';
        // Отображаем цифру (1-5) вместо буквы (a-e) для соответствия формату файлов
        letterDiv.textContent = letterToNumber(option.letter);
        
        const textDiv = document.createElement('div');
        textDiv.className = 'option-text';
        textDiv.textContent = option.text;
        
        optionDiv.appendChild(letterDiv);
        optionDiv.appendChild(textDiv);
        
        // Обработчик клика
        optionDiv.addEventListener('click', () => selectOption(option.letter));
        
        optionsContainer.appendChild(optionDiv);
    });
    
    // Восстанавливаем выбранный ответ и показываем правильность, если вопрос уже пройден
    const selectedAnswer = userAnswers[currentQuestionIndex];
    const feedback = document.getElementById('feedback');
    
    if (selectedAnswer) {
        // Вопрос уже пройден - показываем результаты
        const selectedOption = optionsContainer.querySelector(`[data-letter="${selectedAnswer}"]`);
        const correctOption = optionsContainer.querySelector(`[data-letter="${question.correct}"]`);
        
        // Показываем правильный ответ (зеленым)
        if (correctOption) {
            correctOption.classList.add('correct');
        }
        
        // Проверяем правильность выбранного ответа
        const isCorrect = selectedAnswer === question.correct;
        
        if (isCorrect) {
            // Правильный ответ - подсвечиваем зеленым
            if (selectedOption) {
                selectedOption.classList.add('correct', 'selected');
            }
            feedback.textContent = '✓ Правильно!';
            feedback.className = 'feedback show correct';
        } else {
            // Неправильный ответ - подсвечиваем красным
            if (selectedOption) {
                selectedOption.classList.add('incorrect', 'selected');
            }
            feedback.textContent = '✗ Неправильно';
            feedback.className = 'feedback show incorrect';
        }
        
        // Блокируем все варианты, так как вопрос уже пройден
        optionsContainer.querySelectorAll('.option').forEach(opt => {
            opt.classList.add('disabled');
        });
    } else {
        // Вопрос еще не пройден - скрываем обратную связь
        feedback.classList.remove('show', 'correct', 'incorrect');
    }
    
    // Обновляем кнопки навигации
    document.getElementById('prevBtn').disabled = currentQuestionIndex === 0;
    document.getElementById('nextBtn').disabled = currentQuestionIndex === filteredQuestions.length - 1;
    
    // Обновляем прогресс
    updateProgress();
    
    // Обновляем навигацию
    updateQuestionsNavigation();
}

// Выбор варианта ответа
function selectOption(letter) {
    const question = filteredQuestions[currentQuestionIndex];
    const optionsContainer = document.getElementById('optionsContainer');
    const feedback = document.getElementById('feedback');
    
    // Убираем предыдущий выбор
    optionsContainer.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected', 'correct', 'incorrect', 'disabled');
    });
    
    // Отмечаем выбранный вариант
    const selectedOption = optionsContainer.querySelector(`[data-letter="${letter}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
    
    // Сохраняем ответ
    userAnswers[currentQuestionIndex] = letter;
    
    // Проверяем правильность
    const isCorrect = letter === question.correct;
    
    // Показываем результат
    if (isCorrect) {
        selectedOption.classList.add('correct');
        feedback.textContent = '✓ Правильно!';
        feedback.className = 'feedback show correct';
        
        // Обновляем статистику
        if (!question.answered) {
            stats.correct++;
            question.answered = true;
        }
    } else {
        selectedOption.classList.add('incorrect');
        feedback.textContent = '✗ Неправильно';
        feedback.className = 'feedback show incorrect';
        
        // Показываем правильный ответ
        const correctOption = optionsContainer.querySelector(`[data-letter="${question.correct}"]`);
        if (correctOption) {
            correctOption.classList.add('correct');
        }
        
        // Обновляем статистику
        if (!question.answered) {
            stats.incorrect++;
            question.answered = true;
        }
    }
    
    // Блокируем все варианты
    optionsContainer.querySelectorAll('.option').forEach(opt => {
        opt.classList.add('disabled');
    });
    
    updateStats();
    updateQuestionsNavigation();
}

// Навигация
function nextQuestion() {
    if (currentQuestionIndex < filteredQuestions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
    }
}

// Обновление счетчика вопросов
function updateQuestionCounter() {
    document.getElementById('questionNumber').textContent = currentQuestionIndex + 1;
    document.getElementById('totalQuestions').textContent = filteredQuestions.length;
}

// Обновление прогресса
function updateProgress() {
    const progress = ((currentQuestionIndex + 1) / filteredQuestions.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
}

// Обновление статистики
function updateStats() {
    // Пересчитываем статистику
    stats.correct = 0;
    stats.incorrect = 0;
    stats.skipped = 0;
    
    filteredQuestions.forEach((q, index) => {
        const answer = userAnswers[index];
        if (answer) {
            if (answer === q.correct) {
                stats.correct++;
            } else {
                stats.incorrect++;
            }
        } else {
            stats.skipped++;
        }
    });
    
    document.getElementById('correctCount').textContent = stats.correct;
    document.getElementById('incorrectCount').textContent = stats.incorrect;
    document.getElementById('skippedCount').textContent = stats.skipped;
}

// Форматирование времени в формат ММ:СС или ЧЧ:ММ:СС
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else {
        return `${minutes}:${String(secs).padStart(2, '0')}`;
    }
}

// Показ результатов теста
function showResults() {
    updateStats();
    
    const total = filteredQuestions.length;
    const correct = stats.correct;
    const incorrect = stats.incorrect;
    const answered = correct + incorrect;
    const percentage = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    
    // Вычисляем время прохождения
    let elapsedTime = '0:00';
    if (testStartTime) {
        const elapsedSeconds = Math.floor((Date.now() - testStartTime) / 1000);
        elapsedTime = formatTime(elapsedSeconds);
    }
    
    // Обновляем значения в модальном окне
    document.getElementById('resultCorrect').textContent = correct;
    document.getElementById('resultIncorrect').textContent = incorrect;
    document.getElementById('resultTime').textContent = elapsedTime;
    document.getElementById('resultPercentage').textContent = percentage + '%';
    
    // Определяем сообщение в зависимости от процента
    const messageDiv = document.getElementById('resultMessage');
    let message = '';
    let messageClass = '';
    
    if (percentage === 100) {
        message = 'Ахуеть, отойди от детского трупа';
        messageClass = 'perfect';
    } else if (percentage >= 95) {
        message = 'Брайтанчик ну ты вообще молодец, но надо еще поработать, хз';
        messageClass = 'excellent';
    } else if (percentage >= 80) {
        message = '30 минутный перерыв на тик ток, ты заслужил!';
        messageClass = 'good';
    } else if (percentage >= 60) {
        message = 'Очень плохо, ты вообще готовился?';
        messageClass = 'good';
    } else if (percentage >= 40) {
        message = 'ФАААААААА... Ты ничего не сдашь пэпэ, брайтанчик, заканчивай и открывай тик ток, оно вообще тебе не надо, медицина не твое';
        messageClass = 'good';
    } else if (percentage <= 30) {
        message = 'Не, Братьишь, ты именно вообще ничего не понимаешь';
        messageClass = 'bad';
    }else  {
        message = 'Еще раз давай, кимипиньтяо';
        messageClass = 'good';
    }
    
    messageDiv.textContent = message;
    messageDiv.className = 'result-message ' + messageClass;
    
    // Показываем модальное окно
    document.getElementById('resultsModal').classList.add('show');
}

// Закрытие модального окна
function closeResults() {
    document.getElementById('resultsModal').classList.remove('show');
}

// Создание навигации по вопросам
function createQuestionsNavigation() {
    const navGrid = document.getElementById('navGrid');
    navGrid.innerHTML = '';
    
    filteredQuestions.forEach((question, index) => {
        const navItem = document.createElement('div');
        navItem.className = 'nav-question-item';
        navItem.textContent = index + 1;
        navItem.dataset.index = index;
        
        navItem.addEventListener('click', () => {
            currentQuestionIndex = index;
            displayQuestion();
        });
        
        navGrid.appendChild(navItem);
    });
    
    updateQuestionsNavigation();
}

// Обновление навигации по вопросам
function updateQuestionsNavigation() {
    const navItems = document.querySelectorAll('.nav-question-item');
    const navContent = document.getElementById('navContent');
    
    navItems.forEach((item, index) => {
        // Убираем все классы статуса
        item.classList.remove('current', 'answered-correct', 'answered-incorrect');
        
        // Текущий вопрос
        if (index === currentQuestionIndex) {
            item.classList.add('current');
            
            // Прокручиваем к текущему вопросу, если навигация развернута
            if (!navContent.classList.contains('collapsed')) {
                setTimeout(() => {
                    item.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'nearest'
                    });
                }, 100);
            }
        }
        
        // Проверяем статус ответа
        const answer = userAnswers[index];
        if (answer) {
            const question = filteredQuestions[index];
            if (answer === question.correct) {
                item.classList.add('answered-correct');
            } else {
                item.classList.add('answered-incorrect');
            }
        }
    });
}

// Переход к вопросу
function goToQuestion(index) {
    if (index >= 0 && index < filteredQuestions.length) {
        currentQuestionIndex = index;
        displayQuestion();
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    // Загрузка вопросов
    loadQuestions();
    
    // Обработчики кнопок
    document.getElementById('nextBtn').addEventListener('click', nextQuestion);
    document.getElementById('prevBtn').addEventListener('click', prevQuestion);
    
    // Обработчик фильтра категорий
    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        filterByCategory(e.target.value);
    });
    
    // Кнопка сворачивания/разворачивания навигации
    const toggleNavBtn = document.getElementById('toggleNavBtn');
    const navContent = document.getElementById('navContent');
    
    toggleNavBtn.addEventListener('click', () => {
        navContent.classList.toggle('collapsed');
        toggleNavBtn.textContent = navContent.classList.contains('collapsed') ? 'Развернуть' : 'Свернуть';
    });
    
    // Кнопка завершения теста
    document.getElementById('finishTestBtn').addEventListener('click', showResults);
    
    // Кнопка закрытия результатов
    document.getElementById('closeResultsBtn').addEventListener('click', closeResults);
    
    // Закрытие модального окна при клике вне его
    document.getElementById('resultsModal').addEventListener('click', (e) => {
        if (e.target.id === 'resultsModal') {
            closeResults();
        }
    });
    
    // Навигация клавиатурой
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            nextQuestion();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            prevQuestion();
        } else if (e.key === 'Escape') {
            closeResults();
        }
    });
    
    // Инициализация счетчика онлайн
    initOnlineCounter();
});

// Функции для счетчика онлайн пользователей с Firebase
let userId = null;
let userRef = null;
let onlineUsersRef = null;
let isOnline = false;

function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function initOnlineCounter() {
    try {
        // Проверяем, инициализирован ли Firebase
        if (typeof firebase === 'undefined' || !firebase.database) {
            console.warn('Firebase не инициализирован. Используется упрощенный счетчик.');
            initSimpleCounter();
            return;
        }

        const database = firebase.database();
        
        // Генерируем или получаем ID пользователя
        userId = localStorage.getItem('user_id');
        if (!userId) {
            userId = generateUserId();
            localStorage.setItem('user_id', userId);
        }
        
        // Ссылки на Firebase
        userRef = database.ref('online_users/' + userId);
        onlineUsersRef = database.ref('online_users');
        
        // Устанавливаем пользователя как онлайн
        userRef.set({
            online: true,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Удаляем пользователя при закрытии страницы
        userRef.onDisconnect().remove();
        
        // Обновляем время последней активности каждые 10 секунд
        setInterval(() => {
            if (userRef && isOnline) {
                userRef.update({
                    lastSeen: firebase.database.ServerValue.TIMESTAMP
                });
            }
        }, 10000);
        
        // Слушаем изменения количества онлайн пользователей
        onlineUsersRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const users = snapshot.val();
                const now = Date.now();
                let count = 0;
                
                // Подсчитываем активных пользователей (активны в последние 30 секунд)
                for (let key in users) {
                    const user = users[key];
                    if (user.online && user.lastSeen) {
                        const timeDiff = now - user.lastSeen;
                        if (timeDiff < 30000) { // 30 секунд
                            count++;
                        }
                    }
                }
                
                // Обновляем отображение
                const onlineCountElement = document.getElementById('onlineCount');
                if (onlineCountElement) {
                    onlineCountElement.textContent = count;
                }
                
                isOnline = true;
            } else {
                // Нет пользователей
                const onlineCountElement = document.getElementById('onlineCount');
                if (onlineCountElement) {
                    onlineCountElement.textContent = '1';
                }
            }
        });
        
        // Обновляем активность при действиях пользователя
        ['mousemove', 'keypress', 'scroll', 'click', 'touchstart'].forEach(event => {
            document.addEventListener(event, updateUserActivity, { passive: true });
        });
        
    } catch (error) {
        console.error('Ошибка инициализации Firebase счетчика:', error);
        initSimpleCounter();
    }
}

function updateUserActivity() {
    if (userRef && isOnline) {
        userRef.update({
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
    }
}

// Упрощенный счетчик для случая, если Firebase не настроен
function initSimpleCounter() {
    const now = Date.now();
    const storedCount = localStorage.getItem('estimated_online');
    let onlineUsers;
    
    if (storedCount) {
        const count = parseInt(storedCount);
        const lastUpdate = parseInt(localStorage.getItem('last_online_update') || '0');
        const timeDiff = now - lastUpdate;
        
        if (timeDiff > 10000) {
            const variation = Math.floor(Math.random() * 3) - 1;
            onlineUsers = Math.max(1, count + variation);
            localStorage.setItem('estimated_online', onlineUsers.toString());
            localStorage.setItem('last_online_update', now.toString());
        } else {
            onlineUsers = count;
        }
    } else {
        onlineUsers = Math.floor(Math.random() * 5) + 1;
        localStorage.setItem('estimated_online', onlineUsers.toString());
        localStorage.setItem('last_online_update', now.toString());
    }
    
    const onlineCountElement = document.getElementById('onlineCount');
    if (onlineCountElement) {
        onlineCountElement.textContent = onlineUsers;
    }
    
    // Обновляем каждые 5 секунд
    setInterval(() => {
        const stored = localStorage.getItem('estimated_online');
        if (stored) {
            const count = parseInt(stored);
            const variation = Math.floor(Math.random() * 3) - 1;
            const newCount = Math.max(1, count + variation);
            localStorage.setItem('estimated_online', newCount.toString());
            localStorage.setItem('last_online_update', Date.now().toString());
            if (onlineCountElement) {
                onlineCountElement.textContent = newCount;
            }
        }
    }, 5000);
}

