// Firebase конфигурация
const firebaseConfig = {
    apiKey: "AIzaSyCN4jczMlU-HikQb3_4Ub3RokBYEy96mbU",
    authDomain: "test-patologiya-counter.firebaseapp.com",
    databaseURL: "https://test-patologiya-counter-default-rtdb.firebaseio.com",
    projectId: "test-patologiya-counter",
    storageBucket: "test-patologiya-counter.firebasestorage.app",
    messagingSenderId: "337495881620",
    appId: "1:337495881620:web:81f6b3d049913702878181"
};

// Инициализация Firebase (compat версия для совместимости)
// Ждем полной загрузки Firebase SDK
(function() {
    function initFirebase() {
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length === 0) {
            try {
                firebase.initializeApp(firebaseConfig);
                console.log('Firebase инициализирован успешно');
                window.firebaseInitialized = true;
            } catch (error) {
                console.error('Ошибка инициализации Firebase:', error);
                window.firebaseInitialized = false;
            }
        } else if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            console.log('Firebase уже инициализирован');
            window.firebaseInitialized = true;
        } else {
            // Повторяем попытку через 100мс, если Firebase еще не загружен
            setTimeout(initFirebase, 100);
        }
    }
    
    // Запускаем инициализацию после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFirebase);
    } else {
        initFirebase();
    }
})();