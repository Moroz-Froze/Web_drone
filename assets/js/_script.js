// Инициализация карты
const map = L.map('map', {
	attributionControl: false, // отключаем контрол атрибуции
}).setView([55.751244, 37.618423], 10); // Устанавливаем начальное положение карты (Москва) и уровень масштабирования

// Добавляем слой карты OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19, // Максимальный уровень масштабирования
	attribution: '', // Пустая атрибуция
}).addTo(map);

// Массив точек маршрута: первый - дрон, остальные - точки пути
let route = [];

// Массив для маркеров и переменная для линии маршрута
let markers = [];
// Переменная линии маршрута
let polyline = null;

// Иконка дрона (можно заменить на свою)
const droneIcon = L.icon({
	iconUrl: 'assets/img/drone.png', // Путь к изображению иконки дрона
	iconSize: [32, 32], // Размер иконки
	iconAnchor: [16, 16], // Точка привязки иконки
});

// Иконка флага
const flagIcon = L.icon({
	iconUrl: 'assets/img/flag.png', // Путь к изображению иконки флага
	iconSize: [40, 40], // Размер иконки
	iconAnchor: [22, 38], // Точка привязки иконки
});

// Функция обновления отображения маршрута
function updateRoute() {
	// Удаляем старые маркеры с карты
	markers.forEach(m => map.removeLayer(m));
	markers = []; // Сбрасываем массив маркеров

	if (polyline) {
		map.removeLayer(polyline); // Удаляем старую линию маршрута
		polyline = null; // Сбрасываем переменную
	}

	if (route.length === 0) return; // Если маршрут пуст, выходим из функции

	// Добавляем маркеры для каждой точки маршрута
	route.forEach((coord, index) => {
		let marker;
		if (index === 0) {
			// Если это первая точка - добавляем маркер дрона
			marker = L.marker(coord, { icon: droneIcon }).addTo(map);
		} else {
			// Для остальных точек - добавляем маркер флага
			marker = L.marker(coord, { icon: flagIcon }).addTo(map);
		}
		markers.push(marker); // Сохраняем маркер в массив
	});

	// Добавляем линию маршрута, если точек больше одной
	if (route.length > 1) {
		polyline = L.polyline(route, { color: 'blue' }).addTo(map); // Добавляем линию маршрута
	}
}

// Функция для обновления попапа
function updatePopup() {
	if (route.length > 0) {
		const point = route[route.length - 1]; // Получаем последнюю точку
		document.getElementById('lat').value = point[0];
		document.getElementById('lng').value = point[1];
		document.getElementById('popup').classList.add('active');
	} else {
		document.getElementById('popup').classList.remove('active');
	}
}

// Обработчик для изменения координат
document.getElementById('lat').addEventListener('input', (e) => {
	if (route.length > 0) {
		route[route.length - 1][0] = parseFloat(e.target.value); // Изменяем широту последней точки
		updateRoute(); // Обновляем маршрут на карте
	}
});

document.getElementById('lng').addEventListener('input', (e) => {
	if (route.length > 0) {
		route[route.length - 1][1] = parseFloat(e.target.value); // Изменяем долготу последней точки
		updateRoute(); // Обновляем маршрут на карте
	}
});

// Обработчик для удаления точки
document.getElementById('removePointBtn').addEventListener('click', () => {
	if (route.length > 0) {
		route.pop(); // Удаляем последнюю точку
		updatePopup(); // Обновляем попап
		updateRoute(); // Обновляем маршрут на карте
	}
});

// Обработка ПКМ - добавляем точку в маршрут
map.on('contextmenu', function(e) {
	const { lat, lng } = e.latlng; // Получаем координаты точки клика
	route.push([lat, lng]); // Добавляем точку маршрута
	updatePopup(); // Обновляем попап для последней точки
	updateRoute(); // Обновляем отображение маршрута
});

// Анимация движения дрона по маршруту
let flying = false; // Флаг для отслеживания состояния полета
async function flyRoute() {
	if (flying) return; // Если дрон уже в полете, выходим
	if (route.length < 2) {
		alert('Добавьте хотя бы одну точку маршрута (кроме дрона)'); // Уведомляем, если недостаточно точек
		return;
	}
	flying = true; // Устанавливаем флаг полета

	while (route.length > 1) {
		// Дрон стартует из route[0], летит к route[1]
		const start = route[0]; // Начальная точка
		const end = route[1]; // Конечная точка

		// Анимируем движение дрона от start к end
		await animateDroneMove(start, end);

		// Удаляем достигнутую точку (route[1])
		route.splice(1, 1); // Удаляем первую точку маршрута
		updateRoute(); // Обновляем отображение маршрута
	}
	
	if (route.length > 0) {
		// Запрашиваем погоду для новой позиции дрона
		const [lat, lng] = route[0];
		const weatherData = await getWeather(lat, lng);
		showWeather(weatherData);
	}

	flying = false; // Сбрасываем флаг полета
}

// Функция анимации движения дрона от start до end
// Возвращает Promise, который резолвится, когда дрон достигнет точки
function animateDroneMove(start, end) {
	return new Promise(resolve => {
		const duration = 2000; // 2 секунды на переход
		const steps = 60; // количество шагов анимации
		let step = 0; // Текущий шаг анимации

		// Интерполяция координат
		function interpolate(a, b, t) {
			return a + (b - a) * t; // Линейная интерполяция
		}

		function move() {
			step++; // Увеличиваем шаг
			const t = step / steps; // Вычисляем нормализованное значение времени
			const lat = interpolate(start[0], end[0], t); // Вычисляем новую широту
			const lng = interpolate(start[1], end[1], t); // Вычисляем новую долготу

			// Обновляем позицию дрона (route[0])
			route[0] = [lat, lng]; // Обновляем координаты дрона
			updateRoute(); // Обновляем отображение маршрута

			if (step < steps) {
				requestAnimationFrame(move); // Запрашиваем следующий кадр анимации
			} else {
				// Конец анимации
				resolve(); // Завершаем Promise
			}
		}

		move(); // Запускаем движение
	});
}

// Кнопка "Старт полёта"
document.getElementById('startBtn').addEventListener('click', flyRoute); // Обработчик события для старта полета

// Сохранение маршрута в файл
document.getElementById('saveBtn').addEventListener('click', () => {
	if (route.length === 0) {
		alert('Маршрут пуст'); // Уведомляем, если маршрут пуст
		return;
	}
	const dataStr = JSON.stringify(route); // Преобразуем маршрут в строку JSON
	const blob = new Blob([dataStr], { type: 'application/json' }); // Создаем Blob для файла
	const url = URL.createObjectURL(blob); // Создаем URL для скачивания

	const a = document.createElement('a'); // Создаем элемент <a> для скачивания
	a.href = url; // Устанавливаем ссылку на Blob
	a.download = 'route.json'; // Указываем имя файла
	a.click(); // Имитируем клик для скачивания

	URL.revokeObjectURL(url); // Освобождаем память
});

// Загрузка маршрута из файла
document.getElementById('loadBtn').addEventListener('click', () => {
	const fileInput = document.createElement('input'); // Создаем временный элемент input
	fileInput.type = 'file'; // Устанавливаем тип input
	fileInput.accept = '.json'; // Ограничиваем выбор файлов только JSON

	// Обработчик для выбора файла
	fileInput.onchange = (e) => {
		const file = e.target.files[0]; // Получаем загруженный файл
		if (!file) return; // Если файл не выбран, выходим

		const reader = new FileReader(); // Создаем FileReader для чтения файла
		reader.onload = function(event) {
			try {
				const loadedRoute = JSON.parse(event.target.result); // Парсим содержимое файла
				if (
					Array.isArray(loadedRoute) &&
					loadedRoute.every(
						p =>
						Array.isArray(p) &&
						p.length === 2 &&
						typeof p[0] === 'number' &&
						typeof p[1] === 'number' // Проверяем формат загруженного маршрута
					)
				) {
					route = loadedRoute; // Сохраняем загруженный маршрут
					updateRoute(); // Обновляем отображение маршрута
					updatePopup(); // Обновляем попап для последней точки
					alert('Маршрут загружен'); // Уведомляем о загрузке
				} else {
					alert('Неверный формат файла'); // Уведомляем о некорректном формате
				}
			} catch (err) {
				alert('Ошибка при чтении файла'); // Уведомляем об ошибке
			}
		};
		reader.readAsText(file); // Читаем файл как текст
	};

	fileInput.click(); // Имитируем клик для открытия диалогового окна выбора файла
});

async function getWeather(lat, lng) {
	const apiKey = 'YOUR_API_KEY';
	const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=ru`;

	try {
		const response = await fetch(url);
		const data = await response.json();
		return data;
	} catch (error) {
		console.error('Ошибка получения погоды:', error);
		return null;
	}
}

function showWeather(weatherData) {
	const weatherPopup = document.getElementById('weather-popup');
	const weatherInfo = document.getElementById('weather-info');

	if (weatherData) {
		// Форматируем данные о погоде
		weatherInfo.innerHTML = `
						<p>Температура: ${weatherData.main.temp} °C</p>
						<p>Ощущается как: ${weatherData.main.feels_like} °C</p>
						<p>Погода: ${weatherData.weather[0].description}</p>
						<p>Влажность: ${weatherData.main.humidity}%</p>
						<p>Ветер: ${weatherData.wind.speed} м/с</p>
				`;
	} else {
		weatherInfo.innerHTML = 'Не удалось получить данные о погоде';
	}

	weatherPopup.classList.add('active');
}

document.getElementById('weatherBtn').addEventListener('click', async () => {
    if (route.length === 0) {
        alert('Дрон не размещен');
        return;
    }

    // Берем текущие координаты дрона
    const [lat, lng] = route[0];
    const weatherData = await getWeather(lat, lng);
    showWeather(weatherData);
});

document.getElementById('close-weather-popup').addEventListener('click', () => {
    document.getElementById('weather-popup').classList.remove('active');
});
