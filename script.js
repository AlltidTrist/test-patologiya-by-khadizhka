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
            
            // Прокручиваем только внутри навигации, не всю страницу
            if (!navContent.classList.contains('collapsed')) {
                setTimeout(() => {
                    // Прокручиваем только контейнер навигации, не всю страницу
                    try {
                        const itemTop = item.offsetTop;
                        const itemHeight = item.offsetHeight;
                        const navScrollTop = navContent.scrollTop;
                        const navHeight = navContent.clientHeight;
                        const navScrollHeight = navContent.scrollHeight;
                        
                        // Проверяем, виден ли элемент в навигации
                        const itemBottom = itemTop + itemHeight;
                        const visibleTop = navScrollTop;
                        const visibleBottom = navScrollTop + navHeight;
                        
                        if (itemTop < visibleTop || itemBottom > visibleBottom) {
                            // Прокручиваем только внутри навигации
                            const targetScroll = Math.max(0, Math.min(itemTop - 20, navScrollHeight - navHeight));
                            navContent.scrollTo({
                                top: targetScroll,
                                behavior: 'smooth'
                            });
                        }
                    } catch (e) {
                        // Игнорируем ошибки прокрутки
                    }
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
    
    // Инициализация чата
    initChat();
    
    // Инициализация поиска
    initSearch();
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
            console.warn('Firebase SDK не загружен. Используется упрощенный счетчик.');
            initSimpleCounter();
            return;
        }
        
        // Проверяем, что Firebase приложение инициализировано
        if (!firebase.apps || firebase.apps.length === 0) {
            console.warn('Firebase приложение не инициализировано. Используется упрощенный счетчик.');
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
        }).then(() => {
            console.log('Пользователь добавлен в онлайн');
            isOnline = true;
        }).catch((error) => {
            console.error('Ошибка добавления пользователя:', error);
            initSimpleCounter();
        });
        
        // Удаляем пользователя при закрытии страницы
        userRef.onDisconnect().remove().catch((error) => {
            console.error('Ошибка настройки onDisconnect:', error);
        });
        
        // Обновляем время последней активности каждые 10 секунд
        setInterval(() => {
            if (userRef && isOnline) {
                userRef.update({
                    lastSeen: firebase.database.ServerValue.TIMESTAMP
                }).catch((error) => {
                    console.error('Ошибка обновления активности:', error);
                });
            }
        }, 10000);
        
        // Слушаем изменения количества онлайн пользователей
        onlineUsersRef.on('value', (snapshot) => {
            try {
                if (snapshot.exists()) {
                    const users = snapshot.val();
                    const now = Date.now();
                    let count = 0;
                    
                    // Подсчитываем активных пользователей (активны в последние 30 секунд)
                    for (let key in users) {
                        if (users.hasOwnProperty(key)) {
                            const user = users[key];
                            if (user && user.online && user.lastSeen) {
                                const timeDiff = now - user.lastSeen;
                                if (timeDiff < 30000) { // 30 секунд
                                    count++;
                                }
                            }
                        }
                    }
                    
                    // Обновляем отображение
                    const onlineCountElement = document.getElementById('onlineCount');
                    if (onlineCountElement) {
                        onlineCountElement.textContent = count || 1;
                    }
                } else {
                    // Нет пользователей
                    const onlineCountElement = document.getElementById('onlineCount');
                    if (onlineCountElement) {
                        onlineCountElement.textContent = '1';
                    }
                }
            } catch (error) {
                console.error('Ошибка обработки данных Firebase:', error);
            }
        }, (error) => {
            console.error('Ошибка чтения данных Firebase:', error);
            initSimpleCounter();
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
        }).catch((error) => {
            console.error('Ошибка обновления активности пользователя:', error);
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

// Функции для чата
let chatUserName = null;
let chatMessagesRef = null;
let chatNameSet = false;

function initChat() {
    // Получаем сохраненное имя пользователя
    chatUserName = localStorage.getItem('chat_user_name');
    if (chatUserName) {
        chatNameSet = true;
        document.getElementById('chatNameInputWrapper').style.display = 'none';
        document.getElementById('chatMessageInputWrapper').style.display = 'flex';
    }
    
    // Обработчики для чата
    document.getElementById('chatSetNameBtn').addEventListener('click', setChatUserName);
    document.getElementById('chatSendBtn').addEventListener('click', sendChatMessage);
    document.getElementById('chatToggleBtn').addEventListener('click', toggleChat);
    document.getElementById('chatMessageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    document.getElementById('chatUserName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            setChatUserName();
        }
    });
    
    // Инициализация Firebase чата
    if (typeof firebase !== 'undefined' && firebase.database && firebase.apps && firebase.apps.length > 0) {
        initFirebaseChat();
    } else {
        console.warn('Firebase не инициализирован для чата');
    }
}

function setChatUserName() {
    const nameInput = document.getElementById('chatUserName');
    const name = nameInput.value.trim();
    
    if (name.length < 2) {
        alert('Имя должно содержать минимум 2 символа');
        return;
    }
    
    if (name.length > 20) {
        alert('Имя не должно превышать 20 символов');
        return;
    }
    
    chatUserName = name;
    chatNameSet = true;
    localStorage.setItem('chat_user_name', chatUserName);
    
    document.getElementById('chatNameInputWrapper').style.display = 'none';
    document.getElementById('chatMessageInputWrapper').style.display = 'flex';
    
    // Инициализируем чат после установки имени
    if (typeof firebase !== 'undefined' && firebase.database && firebase.apps && firebase.apps.length > 0) {
        initFirebaseChat();
    }
}

function initFirebaseChat() {
    if (!chatNameSet || !chatUserName) {
        return;
    }
    
    try {
        const database = firebase.database();
        chatMessagesRef = database.ref('chat_messages');
        
        // Загружаем последние 50 сообщений
        chatMessagesRef.limitToLast(50).on('value', (snapshot) => {
            const messagesContainer = document.getElementById('chatMessages');
            messagesContainer.innerHTML = '';
            
            if (snapshot.exists()) {
                const messages = snapshot.val();
                const messagesArray = [];
                
                // Преобразуем объект в массив
                for (let key in messages) {
                    if (messages.hasOwnProperty(key)) {
                        messagesArray.push({
                            id: key,
                            ...messages[key]
                        });
                    }
                }
                
                // Сортируем по времени
                messagesArray.sort((a, b) => a.timestamp - b.timestamp);
                
                // Отображаем сообщения
                messagesArray.forEach(msg => {
                    addMessageToChat(msg.userName, msg.text, msg.timestamp, msg.userName === chatUserName);
                });
            } else {
                messagesContainer.innerHTML = '<div class="chat-welcome">Пока нет сообщений. Будьте первым!</div>';
            }
            
            // Прокручиваем вниз
            scrollChatToBottom();
        });
        
    } catch (error) {
        console.error('Ошибка инициализации чата:', error);
    }
}

function sendChatMessage() {
    if (!chatNameSet || !chatUserName) {
        alert('Сначала введите ваше имя');
        return;
    }
    
    const messageInput = document.getElementById('chatMessageInput');
    const messageText = messageInput.value.trim();
    
    if (messageText.length === 0) {
        return;
    }
    
    if (messageText.length > 500) {
        alert('Сообщение не должно превышать 500 символов');
        return;
    }
    
    if (!chatMessagesRef) {
        alert('Чат не инициализирован. Обновите страницу.');
        return;
    }
    
    try {
        // Отправляем сообщение в Firebase
        chatMessagesRef.push({
            userName: chatUserName,
            text: messageText,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Очищаем поле ввода
        messageInput.value = '';
        
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
        alert('Не удалось отправить сообщение. Попробуйте еще раз.');
    }
}

function addMessageToChat(userName, text, timestamp, isOwn) {
    const messagesContainer = document.getElementById('chatMessages');
    
    // Удаляем приветственное сообщение, если оно есть
    const welcome = messagesContainer.querySelector('.chat-welcome');
    if (welcome) {
        welcome.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isOwn ? 'own' : 'other'}`;
    
    const time = new Date(timestamp);
    const timeString = time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="chat-message-name">${escapeHtml(userName)}</div>
        <div class="chat-message-text">${escapeHtml(text)}</div>
        <div class="chat-message-time">${timeString}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    scrollChatToBottom();
}

function scrollChatToBottom() {
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function toggleChat() {
    const chatContainer = document.getElementById('chatContainer');
    const toggleBtn = document.getElementById('chatToggleBtn');
    const isCollapsed = chatContainer.classList.contains('collapsed');
    
    if (isCollapsed) {
        // Разворачиваем чат
        chatContainer.classList.remove('collapsed');
        toggleBtn.textContent = '−';
        // Прокручиваем вниз при открытии
        setTimeout(() => {
            scrollChatToBottom();
        }, 100);
    } else {
        // Сворачиваем чат
        chatContainer.classList.add('collapsed');
        toggleBtn.textContent = '+';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Функции для поиска вопросов
function initSearch() {
    const openSearchBtn = document.getElementById('openSearchBtn');
    const closeSearchBtn = document.getElementById('closeSearchBtn');
    const searchModal = document.getElementById('searchModal');
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    
    // Открытие модального окна поиска
    openSearchBtn.addEventListener('click', () => {
        searchModal.classList.add('show');
        searchInput.focus();
    });
    
    // Закрытие модального окна
    closeSearchBtn.addEventListener('click', () => {
        searchModal.classList.remove('show');
    });
    
    // Закрытие при клике вне модального окна
    searchModal.addEventListener('click', (e) => {
        if (e.target === searchModal) {
            searchModal.classList.remove('show');
        }
    });
    
    // Поиск по кнопке
    searchBtn.addEventListener('click', performSearch);
    
    // Поиск по Enter
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim();
    const resultsContainer = document.getElementById('searchResults');
    const resultsInfo = document.getElementById('searchResultsInfo');
    
    if (searchTerm.length < 2) {
        resultsContainer.innerHTML = '<div class="search-placeholder">Введите минимум 2 символа для поиска</div>';
        resultsInfo.textContent = '';
        return;
    }
    
    // Нормализуем поисковый запрос
    const normalizedSearchTerm = normalizeText(searchTerm);
    const searchWords = normalizedSearchTerm.split(/\s+/).filter(word => word.length > 0);
    
    if (searchWords.length === 0) {
        resultsContainer.innerHTML = '<div class="search-placeholder">Введите корректный поисковый запрос</div>';
        resultsInfo.textContent = '';
        return;
    }
    
    // Поиск только по тексту вопроса
    const results = [];
    
    questions.forEach((question, index) => {
        const questionText = normalizeText(question.question);
        const questionNumber = index + 1;
        
        // Проверяем, содержатся ли все слова поискового запроса как целые слова в вопросе
        const allWordsMatch = searchWords.every(word => {
            // Используем границы слов для точного совпадения
            // Ищем слово как целое: перед ним должен быть не буквенный символ или начало строки,
            // после - не буквенный символ или конец строки
            const escapedWord = escapeRegex(word);
            // Используем проверку границ: перед словом - не буква/цифра или начало, после - не буква/цифра или конец
            // Поддерживаем кириллицу и латиницу
            const regex = new RegExp(`(^|[^а-яёa-z0-9])${escapedWord}([^а-яёa-z0-9]|$)`, 'i');
            return regex.test(questionText);
        });
        
        if (allWordsMatch) {
            // Вычисляем релевантность (количество совпадений целых слов)
            const matchCount = searchWords.reduce((count, word) => {
                const escapedWord = escapeRegex(word);
                const regex = new RegExp(`(^|[^а-яёa-z0-9])${escapedWord}([^а-яёa-z0-9]|$)`, 'gi');
                const matches = questionText.match(regex);
                return count + (matches ? matches.length : 0);
            }, 0);
            
            results.push({
                question: question,
                number: questionNumber,
                matchCount: matchCount,
                searchWords: searchWords
            });
        }
    });
    
    // Сортируем по релевантности (больше совпадений = выше)
    results.sort((a, b) => b.matchCount - a.matchCount);
    
    // Отображаем результаты
    displaySearchResults(results, searchTerm);
}

function normalizeText(text) {
    // Приводим к нижнему регистру и убираем лишние пробелы
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function escapeRegex(str) {
    // Экранируем специальные символы регулярных выражений
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function displaySearchResults(results, searchTerm) {
    const resultsContainer = document.getElementById('searchResults');
    const resultsInfo = document.getElementById('searchResultsInfo');
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="search-placeholder">Ничего не найдено по запросу "' + escapeHtml(searchTerm) + '"</div>';
        resultsInfo.textContent = 'Найдено: 0 вопросов';
        return;
    }
    
    resultsInfo.textContent = `Найдено: ${results.length} ${results.length === 1 ? 'вопрос' : results.length < 5 ? 'вопроса' : 'вопросов'}`;
    
    resultsContainer.innerHTML = '';
    
    results.forEach(result => {
        const question = result.question;
        const correctOption = question.options.find(opt => opt.letter === question.correct);
        const correctAnswerText = correctOption ? correctOption.text : 'Ответ не найден';
        const correctAnswerNumber = letterToNumber(question.correct);
        
        // Выделяем найденные слова в тексте вопроса
        const highlightedQuestion = highlightSearchTerms(question.question, result.searchWords);
        
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        
        resultItem.innerHTML = `
            <div class="search-result-header">
                <span class="search-result-number">Вопрос #${result.number}</span>
                <span class="search-result-category">${question.category}</span>
            </div>
            <div class="search-result-question">${highlightedQuestion}</div>
            <div class="search-result-answer">
                <div class="search-result-answer-label">✓ Правильный ответ (${correctAnswerNumber}):</div>
                <div class="search-result-answer-text">${escapeHtml(correctAnswerText)}</div>
            </div>
        `;
        
        resultsContainer.appendChild(resultItem);
    });
    
    // Прокручиваем вверх
    resultsContainer.scrollTop = 0;
}

function highlightSearchTerms(text, searchWords) {
    let highlightedText = escapeHtml(text);
    
    // Выделяем каждое слово из поискового запроса как целое слово
    searchWords.forEach(word => {
        // Экранируем специальные символы для regex
        const escapedWord = escapeRegex(word);
        // Создаем regex для поиска целого слова (с границами слов)
        // Используем группы захвата для сохранения границ
        const regex = new RegExp(`(^|[^а-яёa-z0-9])(${escapedWord})([^а-яёa-z0-9]|$)`, 'gi');
        // Заменяем найденные слова на выделенные версии, сохраняя границы
        highlightedText = highlightedText.replace(regex, (match, before, wordMatch, after) => {
            return before + '<mark>' + wordMatch + '</mark>' + after;
        });
    });
    
    return highlightedText;
}

