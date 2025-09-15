const express = require('express'); // Подключаем библиотеку Express
const path = require('path'); // Подключаем библиотеку для работы с путями
const fs = require('fs'); // Подключаем библиотеку для работы с файловой системой
const app = express(); // Создаем экземпляр приложения Express
const PORT = process.env.PORT || 3000; // Устанавливаем порт для сервера

// Указываем Express обслуживать статические файлы из корня проекта
app.use(express.static(path.join(__dirname))); // Обслуживаем статические файлы

// Маршрут для корневой страницы
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // Отправляем файл index.html при запросе на корень
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`); // Выводим сообщение о запуске сервера
    console.log(`Откройте в браузере http://localhost:${PORT}`); // Инструкция для доступа к приложению
});
