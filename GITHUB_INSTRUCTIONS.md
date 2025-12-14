# Инструкция по загрузке на GitHub

## ✅ Локальный репозиторий готов!

Теперь нужно создать репозиторий на GitHub и подключить его.

## Шаг 1: Создание репозитория на GitHub

1. Откройте https://github.com и войдите в аккаунт
2. Нажмите кнопку **"+"** в правом верхнем углу → **"New repository"**
3. Заполните форму:
   - **Repository name:** `test-patologiya-by-khadizhka`
   - **Description:** `Тесты по патологической анатомии`
   - Выберите **Public** (публичный)
   - **НЕ** ставьте галочки на "Add a README file", "Add .gitignore", "Choose a license"
4. Нажмите **"Create repository"**

## Шаг 2: Подключение локального репозитория к GitHub

После создания репозитория GitHub покажет инструкции. Выполните эти команды в терминале:

```bash
git remote add origin https://github.com/ВАШ_USERNAME/test-patologiya-by-khadizhka.git
git branch -M main
git push -u origin main
```

**Замените `ВАШ_USERNAME` на ваш логин GitHub!**

## Шаг 3: Авторизация

При первом push GitHub может попросить авторизацию:
- Используйте Personal Access Token (рекомендуется)
- Или используйте GitHub CLI

## Альтернативный способ (через GitHub Desktop)

Если команды не работают, используйте GitHub Desktop:
1. Скачайте GitHub Desktop: https://desktop.github.com
2. Откройте GitHub Desktop
3. File → Add Local Repository
4. Выберите папку с проектом
5. Publish repository → введите название `test-patologiya-by-khadizhka`
6. Нажмите Publish

## После загрузки

Ваш репозиторий будет доступен по адресу:
`https://github.com/ВАШ_USERNAME/test-patologiya-by-khadizhka`

## Включение GitHub Pages (опционально)

Чтобы сайт был доступен как веб-страница:
1. Перейдите в Settings репозитория
2. В левом меню найдите "Pages"
3. В "Source" выберите "main" branch
4. Нажмите "Save"
5. Сайт будет доступен по адресу:
   `https://ВАШ_USERNAME.github.io/test-patologiya-by-khadizhka`

