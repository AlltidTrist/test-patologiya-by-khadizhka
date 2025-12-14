# Инструкция по настройке Firebase для счетчика онлайн пользователей

## Шаг 1: Создание проекта в Firebase

1. Перейдите на https://console.firebase.google.com/
2. Нажмите "Добавить проект" (Add project)
3. Введите название проекта (например: "test-patologiya-counter")
4. Следуйте инструкциям для создания проекта
5. Отключите Google Analytics (не обязательно, но можно для простоты)

## Шаг 2: Создание Realtime Database

1. В меню слева выберите "Realtime Database"
2. Нажмите "Создать базу данных" (Create Database)
3. Выберите регион (например: us-central1)
4. Выберите режим безопасности: **"Начать в тестовом режиме"** (Start in test mode)
   - Это позволит читать и записывать данные без аутентификации
   - **Внимание**: Для продакшена нужно настроить правила безопасности!

## Шаг 3: Получение конфигурации

1. В меню слева выберите "Project settings" (⚙️ рядом с "Project Overview")
2. Прокрутите вниз до раздела "Your apps"
3. Нажмите на иконку `</>` (Web)
4. Введите название приложения (например: "test-patologiya")
5. Скопируйте конфигурацию Firebase

## Шаг 4: Настройка файла firebase-config.js

1. Откройте файл `firebase-config.js`
2. Замените значения на ваши из Firebase Console:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSy...", // Ваш API Key
    authDomain: "your-project-id.firebaseapp.com",
    databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};
```

## Шаг 5: Настройка правил безопасности (ВАЖНО! Без этого счетчик не будет работать!)

1. В Firebase Console перейдите в **"Realtime Database"** → **"Rules"**
2. **УДАЛИТЕ** все существующие правила
3. **ЗАМЕНИТЕ** их на следующие правила:

```json
{
  "rules": {
    "online_users": {
      ".read": true,
      ".write": true
    },
    "chat_messages": {
      ".read": true,
      ".write": true,
      ".indexOn": ["timestamp"]
    }
  }
}
```

**ИЛИ** более безопасный вариант (рекомендуется):

```json
{
  "rules": {
    "online_users": {
      "$userId": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['online', 'lastSeen']) && newData.child('online').isBoolean() && newData.child('lastSeen').isNumber()"
      }
    },
    "chat_messages": {
      "$messageId": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['userName', 'text', 'timestamp']) && newData.child('userName').isString() && newData.child('text').isString() && newData.child('timestamp').isNumber() && newData.child('text').val().length <= 500 && newData.child('userName').val().length <= 20"
      },
      ".indexOn": ["timestamp"]
    }
  }
}
```

4. Нажмите **"Publish"** (Опубликовать)

**ВАЖНО:** После изменения правил может потребоваться несколько секунд, чтобы они вступили в силу. Обновите страницу сайта через 10-15 секунд.

**Если ошибка "permission_denied" все еще появляется:**
- Убедитесь, что вы нажали "Publish" после изменения правил
- Проверьте, что вы редактируете правила для правильной базы данных (если у вас несколько баз данных)
- Попробуйте временно использовать тестовый режим (Start in test mode), но помните, что это менее безопасно

## Шаг 6: Проверка работы

1. Откройте сайт в браузере
2. Откройте консоль разработчика (F12)
3. Проверьте, нет ли ошибок
4. Откройте сайт в нескольких вкладках/браузерах
5. Счетчик должен показывать точное количество активных пользователей

## Важные замечания

- **Бесплатный план Firebase** включает:
  - 1 GB хранения
  - 10 GB трафика в месяц
  - 100 одновременных подключений
  - Этого достаточно для небольшого сайта

- **Безопасность**: Текущие правила позволяют всем читать и писать данные. Для продакшена рекомендуется:
  - Ограничить запись только авторизованным пользователям
  - Или использовать более строгие правила валидации

## Альтернатива: Если не хотите использовать Firebase

Если вы не хотите настраивать Firebase, текущий код автоматически переключится на упрощенный счетчик на основе localStorage (примерное значение).

