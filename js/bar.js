/**
 * MVHS Schedule Tracker
 * Optimized & Refactored for Hallway TV Display
 */

const CONFIG = {
    WEATHER_API_KEY: "YOUR_OPENWEATHERMAP_API_KEY",
    CITY: "Highlands Ranch, CO",
    LAT: 39.5481,
    LON: -104.9739,
    SCHOOL_END_TIME: "14:50" // Default school end time
};

class ScheduleTracker {
    constructor() {
        this.schedules = [];
        this.weatherInterval = null;
        this.dateInterval = null;
    }

    async init() {
        this.setupClock();
        this.setupWeather();
        await this.loadSchedules();
        this.startUpdateLoop();
    }

    setupClock() {
        const update = () => {
            const now = new Date();

            // Date: MMM DD
            const dateDisplay = document.getElementById("date-display");
            if (dateDisplay) {
                dateDisplay.textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }

            // Time: HH:MM:SS (12h)
            const clockDisplay = document.getElementById("clock-display");
            if (clockDisplay) {
                let h = now.getHours();
                const m = String(now.getMinutes()).padStart(2, '0');
                const s = String(now.getSeconds()).padStart(2, '0');
                h = h % 12 || 12;
                clockDisplay.textContent = `${String(h).padStart(2, '0')}:${m}:${s}`;
            }

            // Total time remaining
            this.updateTotalTimeRemaining(now);
        };

        update();
        setInterval(update, 1000);
    }

    updateTotalTimeRemaining(now) {
        const [endH, endM] = CONFIG.SCHOOL_END_TIME.split(':').map(Number);
        const end = new Date(now);
        end.setHours(endH, endM, 0, 0);

        const diff = end - now;
        const element = document.querySelector(".total-time-remaining");
        if (element) {
            if (diff <= 0) {
                element.textContent = "0h 0m";
            } else {
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                element.textContent = `${h}h ${m}m`;
            }
        }
    }

    async setupWeather() {
        const weatherDisplay = document.getElementById("weather-display");
        const fetchWeather = async () => {
            if (CONFIG.WEATHER_API_KEY === "YOUR_OPENWEATHERMAP_API_KEY") {
                if (weatherDisplay) weatherDisplay.textContent = "72°";
                return;
            }
            try {
                const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${CONFIG.LAT}&lon=${CONFIG.LON}&appid=${CONFIG.WEATHER_API_KEY}&units=imperial`);
                const data = await res.json();
                if (weatherDisplay) weatherDisplay.textContent = `${Math.round(data.main.temp)}°`;
            } catch (e) {
                console.error("Weather fetch failed", e);
            }
        };

        fetchWeather();
        this.weatherInterval = setInterval(fetchWeather, 600000); // 10 mins
    }

    async loadSchedules() {
        try {
            const res = await fetch('api/schedules.json');
            const data = await res.json();
            const now = new Date();
            const dateStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
            const special = data.schedules.find(s => s.date === dateStr);

            if (special) {
                this.schedules = special.times.map(t => this.parseScheduleString(t));
            } else {
                this.schedules = this.getDefaultSchedules(now.getDay());
            }
        } catch (e) {
            console.warn("Failed to load schedules from API, using defaults", e);
            this.schedules = this.getDefaultSchedules(new Date().getDay());
        }
    }

    parseScheduleString(str) {
        // Format: start;name;end,start;name;end...
        return str.split(',').map(p => {
            const [start, name, end] = p.split(';');
            return { start, name, end };
        });
    }

    getDefaultSchedules(day) {
        let s1 = "", s2 = "";
        switch (day) {
            case 1: case 3: // Mon/Wed
                s1 = "07:45;Period 1;09:19,09:19;Passing;09:24,09:24;Period 2;10:58,10:58;A Lunch;11:32,11:32;Passing;11:37,11:37;Period 3;13:11,13:11;Passing;13:16,13:16;Period 4;14:50";
                s2 = "07:45;Period 1;09:19,09:19;Passing;09:24,09:24;Period 2;10:58;Passing;11:03,11:03;Period 3;12:37,12:37;B Lunch;13:11,13:11;Passing;13:16,13:16;Period 4;14:50";
                break;
            case 2: case 4: // Tue/Thu
                const et = day === 2 ? "S.A.S." : "Eagle Time";
                s1 = `08:05;Period 5;09:39,09:39;Homeroom;09:49,09:49;${et};10:56,10:56;A Lunch;11:32,11:32;Passing;11:37,11:37;Period 6;13:11,13:11;Passing;13:16,13:16;Period 7;14:50`;
                s2 = `08:05;Period 5;09:39,09:39;Homeroom;09:49,09:49;${et};10:56;Passing;11:01,11:01;Period 6;12:35,12:35;B Lunch;13:11,13:11;Passing;13:16,13:16;Period 7;14:50`;
                break;
            case 5: // Fri
                s1 = "07:45;Period 1;08:36,08:36;Passing;08:41,08:41;Period 2;09:32,09:32;Passing;09:37,09:37;Period 3;10:28,10:28;Passing;10:33,10:33;Period 4;11:24,11:24;A Lunch;12:02,12:02;Passing;12:07,12:07;Period 5;12:58,12:58;Passing;13:03,13:03;Period 6;13:54,13:54;Passing;13:59,13:59;Period 7;14:50";
                s2 = "07:45;Period 1;08:36,08:36;Passing;08:41,08:41;Period 2;09:32,09:32;Passing;09:37,09:37;Period 3;10:28,10:28;Passing;10:33,10:33;Period 4;11:24;Passing;11:29,11:29;Period 5;12:20,12:20;B Lunch;12:58,12:58;Passing;13:03,13:03;Period 6;13:54,13:54;Passing;13:59,13:59;Period 7;14:50";
                break;
            default:
                s1 = "00:00;Weekend;23:59";
                s2 = "00:00;Weekend;23:59";
        }
        return [this.parseScheduleString(s1), this.parseScheduleString(s2)];
    }

    parseTime(timeStr, baseDate) {
        const [h, m] = timeStr.split(':').map(Number);
        const d = new Date(baseDate);
        d.setHours(h, m, 0, 0);
        return d;
    }

    startUpdateLoop() {
        const loop = () => {
            this.updateUI();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    updateUI() {
        const now = new Date();
        let allFinished = true;

        this.schedules.forEach((periods, idx) => {
            const container = document.querySelectorAll('.progress_container')[idx];
            const titleEl = document.querySelectorAll('.period')[idx];
            const barEl = container.querySelector('.progress_bar');
            const timeEl = container.querySelector('.progress_time');
            const wrapper = container.parentElement;

            const currentPeriod = periods.find(p => {
                const start = this.parseTime(p.start, now);
                const end = this.parseTime(p.end, now);
                return now >= start && now < end;
            });

            const lastPeriod = periods[periods.length - 1];
            const dayEnd = this.parseTime(lastPeriod.end, now);

            if (now < dayEnd) {
                allFinished = false;
                if (currentPeriod) {
                    wrapper.style.display = 'block';
                    titleEl.textContent = currentPeriod.name;

                    const start = this.parseTime(currentPeriod.start, now);
                    const end = this.parseTime(currentPeriod.end, now);
                    const total = end - start;
                    const elapsed = now - start;
                    const percent = Math.min(100, (elapsed / total) * 100);

                    barEl.style.width = `${percent}%`;

                    const remaining = Math.max(0, Math.floor((end - now) / 1000));
                    const rm = Math.floor(remaining / 60);
                    const rs = remaining % 60;
                    timeEl.textContent = rm > 0 ? `${rm}m ${rs}s` : `${rs}s`;
                } else {
                    // Between periods or before school
                    const nextPeriod = periods.find(p => this.parseTime(p.start, now) > now);
                    if (nextPeriod) {
                        wrapper.style.display = 'block';
                        titleEl.textContent = `Next: ${nextPeriod.name}`;
                        barEl.style.width = '0%';
                        const start = this.parseTime(nextPeriod.start, now);
                        const remaining = Math.max(0, Math.floor((start - now) / 1000));
                        const rh = Math.floor(remaining / 3600);
                        const rm = Math.floor((remaining % 3600) / 60);
                        timeEl.textContent = rh > 0 ? `${rh}h ${rm}m` : `${rm}m`;
                    } else {
                         wrapper.style.display = 'none';
                    }
                }
            } else {
                wrapper.style.display = 'none';
            }
        });

        const endEl = document.getElementById('end');
        if (allFinished) {
            endEl.style.display = 'block';
        } else {
            endEl.style.display = 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const tracker = new ScheduleTracker();
    tracker.init();
});
