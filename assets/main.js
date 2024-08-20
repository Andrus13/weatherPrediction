// input focus
const inputField = document.querySelector('.inputWrapper input'),
      inputWrapper = document.querySelector('.inputWrapper');

inputField.addEventListener('focus', () => {
    inputWrapper.classList.add('focused');
});

inputField.addEventListener('blur', () => {
    inputField.value.length > 0 ? false : inputWrapper.classList.remove('focused');
});

// Autocomplete initializatio
function initialize() {
    const options = {
        types: ['(cities)'],
        componentRestrictions: { country: "ua" }
    };
    
    new google.maps.places.Autocomplete(inputField, options);
}

// city validation
const inputBtn = document.getElementById('searchBtn');
const allertText = document.getElementById('allertText');

function checkCity(event) {
    const currentBlock = event.currentTarget;
    
    if (inputField.value.length > 0) {
        const autocompleteService = new google.maps.places.AutocompleteService();
        const request = {
            input: inputField.value,
            types: ['(cities)']
        };

        autocompleteService.getPlacePredictions(request, function(predictions, status) {
            let city = inputField.value.includes(",") ? inputField.value.split(',')[0] : inputField.value;
            status === google.maps.places.PlacesServiceStatus.OK && predictions.length > 0
                ? (allertText.classList.add('hidden'), (currentBlock === inputBtn) ? getWeaher(city) : addRecordToLocalStorage())
                : allertText.classList.remove('hidden');
        });
    } else {
        allertText.classList.remove('hidden');
    }
}

// geting IP
function getIp() {
    fetch('https://api.ipstack.com/check?access_key=0a6d12ea299d314518d202d0dd31d697')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      
      console.log('Current City:', data.city);
      console.log('Country Code:', data.country_code);
      
      getWeather(data.city);
    })
    .catch(error => console.error('Что-то пошло не так:', error));
}

// period togglers
function hideCards(element) {
    const container = element.closest('.weather-block');

    container.querySelectorAll('.card-container .card').forEach((item, index) => {
        if (index > 0) item.classList.add("hidden");
    });
    
    container.querySelectorAll('canvas').forEach((item, index) => {
        index > 0 ? item.classList.add("hidden") : item.classList.remove("hidden");
    });

    document.querySelectorAll('.period li').forEach(li => li.classList.remove('active'));
    element.classList.add('active');
}

function openCards(element) {
    const container = element.closest('.weather-block');

    container.querySelectorAll('.card-container .hidden').forEach(el => el.classList.remove("hidden"));

    container.querySelectorAll('canvas').forEach((item, index) => {
        index === 0 ? item.classList.add("hidden") : item.classList.remove("hidden");
    });

    document.querySelectorAll('.period li').forEach(li => li.classList.remove('active'));
    element.classList.add('active');
}



// query
function getWeaher(city) {
    fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=e795752a371583744e0d50427dac0443&units=metric`)
        .then(response => response.json())
        .then(data => {
            
            console.log(data.cod);   
            const idBlock = document.querySelectorAll('.weather-block').length;
            const cityName = document.querySelector(`.weather-block${idBlock} .period`);
            const cityBlock = document.querySelector(`.weather-block${idBlock} .block-row`);
            cityBlock.innerHTML = '<div class="nav-trash hidden"></div>';
            
            if (data.cod !== '404') {
                cityBlock.innerHTML = `<div class="nav-city">${city}</div><div class="nav-trash hidden"></div>`;
                cityName.insertAdjacentElement('afterend', cityBlock);
            }            
                
            const container = document.querySelector(`.card-container${idBlock}`);
            container.innerHTML = '';
            const days = {};

            data.list.forEach(forecast => {
                const dateObj = new Date(forecast.dt * 1000);
                const date = dateObj.toLocaleDateString();
                const weekday = dateObj.toLocaleDateString('en-EN', { weekday: 'long' });
                const hours = dateObj.getHours();

                if (!days[date]) {
                    days[date] = { weekday, morning: [], day: [], evening: [] };
                }

                if (hours < 9) {
                    days[date].morning.push(forecast);
                } else if (hours >= 9 && hours <= 18) {
                    days[date].day.push(forecast);
                } else {
                    days[date].evening.push(forecast);
                }
            });

            const calculateAverages = (forecasts) => {
                const total = forecasts.length;
                const averages = {
                    temp: 0,
                    humidity: 0,
                    windSpeed: 0,
                    description: ''
                };

                forecasts.forEach((forecast, index) => {
                    averages.temp += forecast.main.temp;
                    averages.humidity += forecast.main.humidity;
                    averages.windSpeed += forecast.wind.speed;

                    if (index === total - 1) {
                        averages.description = forecast.weather[0].description;
                    }
                });

                return {
                    temp: averages.temp / total,
                    humidity: averages.humidity / total,
                    windSpeed: averages.windSpeed / total,
                    description: averages.description
                };
            };

            Object.keys(days).forEach((date, index) => {
                const { weekday, morning, day, evening } = days[date];
                const morningAvg = calculateAverages(morning);
                const dayAvg = calculateAverages(day);
                const eveningAvg = calculateAverages(evening);
                const isVisible = index === 0;

                const cardInstance = new CardConstructor(date, weekday, morningAvg, dayAvg, eveningAvg, isVisible);
                container.appendChild(cardInstance.createCard());
            });

            const today = Object.keys(days)[0];
            const todayForecasts = [...days[today].morning, ...days[today].day, ...days[today].evening];
             
            clearCharts(idBlock);
            renderDailyWeatherChart(todayForecasts, idBlock);
            renderWeeklyWeatherChart(days, idBlock);

            document.querySelectorAll('.period li').forEach(e => {
                e.addEventListener('click', () => {
                    const isOneDayView = e.getAttribute("value") === "one";
                    isOneDayView ? hideCards(e) : openCards(e);
                });
            });

            inputField.value = '';
            inputField.focus();
        })
        .catch(error => console.error('Ошибка:', error));
}

// weather cards
class CardConstructor {
    constructor(date, weekday, morningAvg, dayAvg, eveningAvg, isVisible = false) {
        this.date = date;
        this.weekday = weekday;
        this.morningAvg = morningAvg;
        this.dayAvg = dayAvg;
        this.eveningAvg = eveningAvg;
        this.isVisible = isVisible;
    }

    createBlock(data, periodName, periodClass) {

        if (!data || isNaN(data.temp)) {
            return null;
        }

        const blockBody = document.createElement('div');
        blockBody.className = `card-body ${periodClass}`;

        blockBody.innerHTML = `
                            <div class="card-section">
                                <span class="card-body-text"><span class="card-data">${periodName}</span></span>
                            </div>
                            <div class="card-section">
                                <span class="card-body-text">Погода: <span class="card-data">${data.description}</span></span>
                            </div>
                            <div class="card-section">
                                <span class="card-body-text">Тепература: <span class="card-data">${data.temp.toFixed(1)}°C</span></span></span>
                            </div>
                            <div class="card-section">
                                <span class="card-body-text">Вологість: <span class="card-data">${data.humidity.toFixed(1)}%</span></span>
                            </div>
                            <div class="card-section">
                                <span class="card-body-text">Швидкість вітру: <span class="card-data">${data.windSpeed.toFixed(1)} м/с</span>
                            </div>
        `;

        return blockBody;
    }

    createCard() {
        const card = document.createElement('div');
        card.className = 'card';

        if (!this.isVisible) {
            card.classList.add('hidden');
        }
        
        card.innerHTML += `<div class="card-title">Date: </br><span class="card-data">${this.weekday}, ${this.date}</span></div>`;

        const morningBlock = this.createBlock(this.morningAvg, 'Morning', 'morn');
        if (morningBlock) card.appendChild(morningBlock);

        const dayBlock = this.createBlock(this.dayAvg, 'Afternoon ', 'day');
        if (dayBlock) card.appendChild(dayBlock);

        const eveningBlock = this.createBlock(this.eveningAvg, 'Evening', 'even');
        if (eveningBlock) card.appendChild(eveningBlock);

        return card;
    }
}

// Charts render
function renderDailyWeatherChart(data, id) {
    const ctx = document.getElementById(`dailyWeatherChart${id}`).getContext('2d');
    
    if (ctx.chart) {
        ctx.chart.destroy();
    }

    const labels = data.map(forecast => {
        const date = new Date(forecast.dt * 1000);
        return date.getHours() + ':00';
    });

    const temperatures = data.map(forecast => forecast.main.temp.toFixed(1));

    ctx.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperature (°C)',
                data: temperatures,
                backgroundColor: 'transparent',
                borderColor: '#000000',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

function renderWeeklyWeatherChart(days, id) {
    const ctx = document.getElementById(`weeklyWeatherChart${id}`).getContext('2d');
    
    if (ctx.chart) {
        ctx.chart.destroy();
    }

    const labels = Object.keys(days).map(dateString => {
        const [day, month, year] = dateString.split('.').map(Number);
        const dateObj = new Date(year, month - 1, day);
        return dateObj.toLocaleDateString('en-EN', { weekday: 'short' });
    });

    const temperatures = Object.keys(days).map(date => {
        const allForecasts = [...days[date].morning, ...days[date].day, ...days[date].evening];
        const total = allForecasts.length;
        const avgTemp = allForecasts.reduce((sum, forecast) => sum + forecast.main.temp, 0) / total;
        return avgTemp.toFixed(1);
    });

    ctx.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Temperature (°C)',
                data: temperatures,
                backgroundColor: 'transparent',
                borderColor: '#000000',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

function clearCharts(id) {
    const dailyChartCanvas = document.getElementById(`dailyWeatherChart${id}`);
    const weeklyChartCanvas = document.getElementById(`weeklyWeatherChart${id}`);

    if (dailyChartCanvas.chart) {
        dailyChartCanvas.chart.destroy();
        dailyChartCanvas.chart = null;
    }
    
    if (weeklyChartCanvas.chart) {
        weeklyChartCanvas.chart.destroy();
        weeklyChartCanvas.chart = null; 
    }
}

// create weather blocks
function createWeatherBlock() {
    const blocks = document.querySelectorAll('.weather-block');
    if (blocks.length == 5) {
        showNotification('Переполнено. Нельзя добавить больше 5 записей.');
        return
    }
    const blockId = blocks.length + 1;

    const newBlock = document.createElement('div');
    newBlock.classList.add('weather-block');
    newBlock.classList.add(`weather-block${blockId}`);

    newBlock.innerHTML = `
        <div class="simple-block">
            <div class="nav">
                <ul class="period">
                    <li class="active" value="one">День</li>
                    <li value="five">Неділя</li>
                </ul>
                <div class="block-row"><div class="nav-trash hidden"></div></div>
            </div>
            <div class="card-container card-container${blockId}"></div>
        </div>
        <div class="simple-block">
            <canvas id="dailyWeatherChart${blockId}"></canvas>
            <canvas id="weeklyWeatherChart${blockId}" class="hidden"></canvas>
        </div>
    `;

    blocks[0].insertAdjacentElement('beforebegin', newBlock);

    const navTrash = document.querySelectorAll('.nav-trash');    
    
    navTrash.forEach((e, index) => {
        if (index !== 0) {
            e.classList.remove('hidden');
        };
    });

    navTrash.forEach( e => e.addEventListener('click', (event) => {
        event.stopPropagation();
        delAlert.classList.remove('hidden');  
        trash = e.closest('.weather-block');
    }));

}


function addRecordToLocalStorage() {
    const city = inputField.value.includes(",") ? inputField.value.split(',')[0] : inputField.value;
    const records = Object.keys(localStorage);

    const storedCities = Object.values(localStorage).map(item => JSON.parse(item).city.toLowerCase());
    if (storedCities.includes(city.toLowerCase())) {
        showNotification('Такой город уже существует!');
        return
    } 

    if (records.length >= 5) {
        showNotification('Переполнено. Нельзя добавить больше 5 записей.');
        return;
    }

    const id = records.length ? Math.max(...records.map(Number)) + 1 : 0;

    localStorage.setItem(id, JSON.stringify({ city }));
    console.log(localStorage)

    updateChipsBlock();
}

function updateChipsBlock() {
    const chipsBlock = document.querySelector('.chips');
    chipsBlock.innerHTML = '';

    const records = Object.keys(localStorage).map(key => ({
        id: key,
        city: JSON.parse(localStorage.getItem(key)).city
    }));

    records.forEach(record => {
        const listItem = document.createElement('li');
        listItem.id = record.id;
        listItem.innerHTML = `${record.city}<span class="closeBtn"></span>`;
        chipsBlock.appendChild(listItem);
    });

    chipsBlock.querySelectorAll('.closeBtn').forEach(btn => {
        btn.addEventListener('click', (event) => {
            event.stopPropagation();
            const listItem = btn.parentElement;
            const id = listItem.id;

            localStorage.removeItem(id);
            updateChipsBlock();
        });
    });

    const chips = document.querySelectorAll('.chips li');
            chips.forEach( e => e.addEventListener('click', () => {
                inputField.value = '';
                inputField.value = e.textContent;
                inputField.focus();
            }));
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

inputBtn.addEventListener('click', checkCity);

document.querySelector('.addTab').addEventListener('click', createWeatherBlock);

window.addEventListener('load', initialize);

window.addEventListener('load', getIp);

const delAlert = document.querySelector('.delAlert');
const successBlock = document.querySelector('.success');
const delBtn = delAlert.querySelector('.agreeBtn');
const closeBtn = delAlert.querySelector('.closeBtn');
const modal = delAlert.querySelector('.delAlert-block .block-column');
let trash;

delBtn.addEventListener('click', (e) =>  {
    e.stopPropagation();
    trash.remove();
    delAlert.classList.add('hidden');
    successBlock.classList.remove('hidden');
    
    setTimeout(() => {
        successBlock.classList.add('hidden');
    }, 3000);
 });

closeBtn.addEventListener('click', (e) => (e.stopPropagation(),delAlert.classList.add('hidden')));

delAlert.addEventListener('click', (e) =>  {
    if (e.target == delAlert) delAlert.classList.add('hidden');
});


const saveBtn = document.querySelector('#saveBtn');
saveBtn.addEventListener('click', checkCity)

window.addEventListener('load', updateChipsBlock);
