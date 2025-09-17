// Массив точек маршрута
let route = [];
let markers = [];
let polyline = null;

// Ваш API ключ от OpenWeatherMap
const OPENWEATHER_API_KEY = 'cb8723b66e281db17415d06fa61bae51';

// Инициализация карты
const map = L.map('map', {
	attributionControl: false,
}).setView([55.751244, 37.618423], 10);

// Добавляем слой карты OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '',
}).addTo(map);

// Иконка дрона
const droneIcon = L.icon({
	iconUrl: 'assets/img/drone.png',
	iconSize: [32, 32],
	iconAnchor: [16, 16],
});

// Иконка флага
const flagIcon = L.icon({
	iconUrl: 'assets/img/flag.png',
	iconSize: [40, 40],
	iconAnchor: [22, 38],
});

// Функция для получения данных о погоде
async function getWeatherData(lat, lon) {
	try {
		const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=ru`);
		const data = await response.json();
		return data;
	} catch (error) {
		console.error('Ошибка при получении данных о погоде:', error);
		return null;
	}
}

// Функция для отображения погоды
function showWeatherPopup(lat, lon) {
	const weatherPopup = document.getElementById('weather-popup');
	const weatherInfo = document.getElementById('weather-info');

	weatherPopup.classList.add('active');
	weatherInfo.innerHTML = '<p>Загрузка данных о погоде...</p>';

	getWeatherData(lat, lon).then(weatherData => {
		if (weatherData && weatherData.cod === 200) {
			const weatherHtml = `
												<p><strong>Температура:</strong> ${Math.round(weatherData.main.temp)}°C</p>
												<p><strong>Ощущается как:</strong> ${Math.round(weatherData.main.feels_like)}°C</p>
												<p><strong>Погода:</strong> ${weatherData.weather[0].description}</p>
												<p><strong>Влажность:</strong> ${weatherData.main.humidity}%</p>
												<p><strong>Ветер:</strong> ${weatherData.wind.speed} м/с</p>
												<p><strong>Давление:</strong> ${Math.round(weatherData.main.pressure * 0.750062)} мм рт. ст.</p>
										`;
			weatherInfo.innerHTML = weatherHtml;
		} else {
			weatherInfo.innerHTML = '<p>Не удалось получить данные о погоде</p>';
		}
	});
}

// Обработчик закрытия попапа с погодой
document.getElementById('close-weather-popup').addEventListener('click', () => {
	document.getElementById('weather-popup').classList.remove('active');
});

// Функция обновления отображения маршрута
function updateRoute() {
	markers.forEach(m => map.removeLayer(m));
	markers = [];

	if (polyline) {
		map.removeLayer(polyline);
		polyline = null;
	}

	if (route.length === 0) return;

	route.forEach((coord, index) => {
		let marker;
		if (index === 0) {
			marker = L.marker(coord, { icon: droneIcon }).addTo(map);
			marker.on('click', () => {
				showWeatherPopup(coord[0], coord[1]);
			});
		} else {
			marker = L.marker(coord, { icon: flagIcon }).addTo(map);
		}
		markers.push(marker);
	});

	if (route.length > 1) {
		polyline = L.polyline(route, { color: 'blue' }).addTo(map);
	}
}

// Функция для обновления попапа с координатами
function updatePopup() {
	if (route.length > 0) {
		const point = route[route.length - 1];
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
		route[route.length - 1][0] = parseFloat(e.target.value);
		updateRoute();
	}
});

document.getElementById('lng').addEventListener('input', (e) => {
	if (route.length > 0) {
		route[route.length - 1][1] = parseFloat(e.target.value);
		updateRoute();
	}
});

// Обработчик для удаления точки
document.getElementById('removePointBtn').addEventListener('click', () => {
	if (route.length > 0) {
		route.pop();
		updatePopup();
		updateRoute();
	}
});

// Обработка ПКМ - добавляем точка в маршрут
map.on('contextmenu', function(e) {
	const { lat, lng } = e.latlng;
	route.push([lat, lng]);
	updatePopup();
	updateRoute();
});

// Анимация движения дрона по маршруту
let flying = false;
async function flyRoute() {
	if (flying) return;
	if (route.length < 2) {
		alert('Добавьте хотя бы одну точку маршрута (кроме дрона)');
		return;
	}
	flying = true;

	while (route.length > 1) {
		const start = route[0];
		const end = route[1];

		await animateDroneMove(start, end);

		// После достижения точки показываем погоду
		showWeatherPopup(end[0], end[1]);

		route.splice(1, 1);
		updateRoute();
	}

	flying = false;
}

// Функция анимации движения дрона
function animateDroneMove(start, end) {
	return new Promise(resolve => {
		const duration = 2000;
		const steps = 60;
		let step = 0;

		function interpolate(a, b, t) {
			return a + (b - a) * t;
		}

		function move() {
			step++;
			const t = step / steps;
			const lat = interpolate(start[0], end[0], t);
			const lng = interpolate(start[1], end[1], t);

			route[0] = [lat, lng];
			updateRoute();

			if (step < steps) {
				requestAnimationFrame(move);
			} else {
				resolve();
			}
		}

		move();
	});
}

// Кнопка "Старт полёта"
document.getElementById('startBtn').addEventListener('click', flyRoute);

// Сохранение маршрута в файл
document.getElementById('saveBtn').addEventListener('click', () => {
	if (route.length === 0) {
		alert('Маршрут пуст');
		return;
	}
	const dataStr = JSON.stringify(route);
	const blob = new Blob([dataStr], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.href = url;
	a.download = 'route.json';
	a.click();

	URL.revokeObjectURL(url);
});

// Загрузка маршрута из файла
document.getElementById('loadBtn').addEventListener('click', () => {
	const fileInput = document.createElement('input');
	fileInput.type = 'file';
	fileInput.accept = '.json';

	fileInput.onchange = (e) => {
		const file = e.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = function(event) {
			try {
				const loadedRoute = JSON.parse(event.target.result);
				if (
					Array.isArray(loadedRoute) &&
					loadedRoute.every(
						p =>
						Array.isArray(p) &&
						p.length === 2 &&
						typeof p[0] === 'number' &&
						typeof p[1] === 'number'
					)
				) {
					route = loadedRoute;
					updateRoute();
					updatePopup();
					alert('Маршрут загружен');
				} else {
					alert('Неверный формат файла');
				}
			} catch (err) {
				alert('Ошибка при чтении файла');
			}
		};
		reader.readAsText(file);
	};

	fileInput.click();
});

// Обработчик кнопки погоды
document.getElementById('weatherBtn').addEventListener('click', () => {
	if (route.length > 0) {
		showWeatherPopup(route[0][0], route[0][1]);
	} else {
		alert('Дрон не размещен на карте');
	}
});
