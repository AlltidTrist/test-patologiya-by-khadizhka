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
if (typeof firebase !== 'undefined') {
    try {
        firebase.initializeApp(firebaseConfig);
        console.log('Firebase инициализирован успешно');
    } catch (error) {
        console.error('Ошибка инициализации Firebase:', error);
    }
} else {
    console.warn('Firebase SDK не загружен');
}