document.addEventListener('DOMContentLoaded', function() {
    const currentTzInput = document.getElementById('current-tz');
    const setCurrentBtn = document.getElementById('set-current');
    const newTzInput = document.getElementById('new-tz');
    const addBtn = document.getElementById('add-btn');
    const timesBody = document.getElementById('times-body');
    const showDateEl = document.getElementById('show-date');
    const darkModeEl = document.getElementById('dark-mode');
    const sunMoonEl = document.getElementById('sun-moon');

    let currentTz = localStorage.getItem('currentTz') || 'Europe/Prague';
    let locations = JSON.parse(localStorage.getItem('locations')) || [];
    let timeFormat = localStorage.getItem('timeFormat') || '24';
    let showDate = localStorage.getItem('showDate') === 'true';
    let darkMode = localStorage.getItem('darkMode') !== 'false'; // default true

    // Load from URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('currentTz')) currentTz = urlParams.get('currentTz');
    if (urlParams.has('locations')) locations = urlParams.get('locations').split(',').filter(tz => tz);
    if (urlParams.has('timeFormat')) timeFormat = urlParams.get('timeFormat');
    if (urlParams.has('showDate')) showDate = urlParams.get('showDate') === 'true';

    // Validate and filter locations
    locations = locations.filter(tz => {
        try {
            new Date().toLocaleString('en-US', {timeZone: tz});
            return true;
        } catch {
            console.warn(`Removing invalid time zone: ${tz}`);
            return false;
        }
    });
    localStorage.setItem('locations', JSON.stringify(locations));

    // Validate currentTz
    try {
        new Date().toLocaleString('en-US', {timeZone: currentTz});
    } catch {
        console.warn(`Invalid current time zone: ${currentTz}, resetting to Europe/Prague`);
        currentTz = 'Europe/Prague';
        localStorage.setItem('currentTz', currentTz);
    }

    // Populate datalist with time zones
    const datalist = document.getElementById('timezones');
    if (datalist) {
        const timeZones = Intl.supportedValuesOf('timeZone');
        timeZones.forEach(tz => {
            const option = document.createElement('option');
            option.value = tz;
            datalist.appendChild(option);
        });

        // Add Bali
        const baliOption1 = document.createElement('option');
        baliOption1.value = 'Asia/Makassar';
        datalist.appendChild(baliOption1);
        const baliOption2 = document.createElement('option');
        baliOption2.value = 'Asia/Bali';
        datalist.appendChild(baliOption2);
        const baliOption3 = document.createElement('option');
        baliOption3.value = 'Bali';
        datalist.appendChild(baliOption3);
    } else {
        console.error('Datalist element not found');
    }

    // Set initial format and showDate
    document.querySelector(`input[name="format"][value="${timeFormat}"]`).checked = true;
    if (showDateEl) showDateEl.checked = showDate;
    if (darkModeEl) darkModeEl.checked = darkMode;
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');

    currentTzInput.value = currentTz;

    function normalizeTz(tz) {
        if (tz === 'Bali' || tz === 'Asia/Bali') return 'Asia/Makassar';
        return tz;
    }

    function updateSunMoon(hour) {
        const x = (hour / 24) * 100;
        const y = 20 + 20 * Math.cos((hour / 24) * 2 * Math.PI);
        sunMoonEl.style.left = `${x}vw`;
        sunMoonEl.style.top = `${y}vh`;

        const isDay = hour >= 6 && hour <= 18;
        sunMoonEl.style.background = isDay ? 'yellow' : 'white';
        sunMoonEl.style.boxShadow = isDay ? '0 0 20px rgba(255, 255, 0, 0.5)' : '0 0 20px rgba(255, 255, 255, 0.5)';
        sunMoonEl.style.filter = isDay ? 'blur(20px)' : 'blur(0px)';

        // Update background
        const lightBg = '#fce79d';
        const darkBg = '#1a1a1a';
        const midBg = '#87ceeb'; // sky blue for day
        if (isDay) {
            document.body.style.background = `linear-gradient(to bottom, ${midBg}, ${lightBg})`;
        } else {
            document.body.style.background = `linear-gradient(to bottom, ${darkBg}, #000)`;
        }
    }

    function displayTz(tz) {
        if (tz === 'Asia/Makassar') return 'Asia/Bali';
        return tz;
    }

    function formatLocation(tz) {
        const parts = tz.split('/');
        if (parts.length === 2) {
            const region = parts[0];
            const city = parts[1].replace(/_/g, ' ');
            return `${city} <small>${region}</small>`;
        }
        return tz;
    }

    function getTimeOptions(tz) {
        if (showDate) {
            return { timeZone: tz, hour12: timeFormat === '12' };
        } else {
            return { timeZone: tz, hour: 'numeric', minute: 'numeric', hour12: timeFormat === '12' };
        }
    }

    function updateURL() {
        const params = new URLSearchParams();
        params.set('currentTz', currentTz);
        params.set('locations', locations.join(','));
        params.set('timeFormat', timeFormat);
        params.set('showDate', showDate.toString());
        const newURL = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, '', newURL);
    }

    function updateTimes() {
        const now = new Date();
        let currentHour;
        try {
            currentHour = parseInt(now.toLocaleString('en-US', {timeZone: currentTz, hour: 'numeric', hour12: false}));
        } catch (e) {
            console.error(`Error getting hour for ${currentTz}:`, e);
            currentHour = 12; // fallback
        }

        // Update sun-moon position and background
        updateSunMoon(currentHour);

        timesBody.innerHTML = '';

        // Current location row
        try {
            const currentRow = timesBody.insertRow();
            const cell = currentRow.insertCell();
            cell.innerHTML = formatLocation(displayTz(currentTz));
            const timeCell = currentRow.insertCell();
            if (showDate) {
                const full = now.toLocaleString('en-US', getTimeOptions(currentTz));
                const parts = full.split(', ');
                if (parts.length > 1) {
                    timeCell.innerHTML = `<small>${parts[0]}</small><br>${parts.slice(1).join(', ')}`;
                } else {
                    timeCell.textContent = full;
                }
            } else {
                timeCell.textContent = now.toLocaleString('en-US', getTimeOptions(currentTz));
            }
            for (let h of [9, 12, 18]) {
                const timeAtH = new Date(now.getTime() + (h - currentHour) * 3600000);
                timeAtH.setMinutes(0, 0, 0);
                const cellH = currentRow.insertCell();
                if (showDate) {
                    const full = timeAtH.toLocaleString('en-US', getTimeOptions(currentTz));
                    const parts = full.split(', ');
                    if (parts.length > 1) {
                        cellH.innerHTML = `<small>${parts[0]}</small><br>${parts.slice(1).join(', ')}`;
                    } else {
                        cellH.textContent = full;
                    }
                } else {
                    cellH.textContent = timeAtH.toLocaleString('en-US', getTimeOptions(currentTz));
                }
            }
            currentRow.insertCell().textContent = '';
        } catch (e) {
            console.error(`Error with current time zone ${currentTz}:`, e);
        }

        // Other locations
        locations.forEach((tz, index) => {
            try {
                const row = timesBody.insertRow();
                const cell = row.insertCell();
                cell.innerHTML = formatLocation(displayTz(tz));
                const timeCell = row.insertCell();
                if (showDate) {
                    const full = now.toLocaleString('en-US', getTimeOptions(tz));
                    const parts = full.split(', ');
                    if (parts.length > 1) {
                        timeCell.innerHTML = `<small>${parts[0]}</small><br>${parts.slice(1).join(', ')}`;
                    } else {
                        timeCell.textContent = full;
                    }
                } else {
                    timeCell.textContent = now.toLocaleString('en-US', getTimeOptions(tz));
                }
                for (let h of [9, 12, 18]) {
                    const timeAtH = new Date(now.getTime() + (h - currentHour) * 3600000);
                    timeAtH.setMinutes(0, 0, 0);
                    const cellH = row.insertCell();
                    if (showDate) {
                        const full = timeAtH.toLocaleString('en-US', getTimeOptions(tz));
                        const parts = full.split(', ');
                        if (parts.length > 1) {
                            cellH.innerHTML = `<small>${parts[0]}</small><br>${parts.slice(1).join(', ')}`;
                        } else {
                            cellH.textContent = full;
                        }
                    } else {
                        cellH.textContent = timeAtH.toLocaleString('en-US', getTimeOptions(tz));
                    }
                }
                const actionCell = row.insertCell();
                const removeBtn = document.createElement('button');
                removeBtn.innerHTML = '×';
                removeBtn.title = 'Remove';
                removeBtn.onclick = () => removeLocation(tz);
                actionCell.appendChild(removeBtn);
                const dragIcon = document.createElement('span');
                dragIcon.className = 'drag-icon';
                dragIcon.textContent = '⋮⋮';
                actionCell.appendChild(dragIcon);

                // Drag and drop
                row.draggable = true;
                row.dataset.index = index;
                row.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', index);
                });
                row.addEventListener('dragover', (e) => {
                    e.preventDefault();
                });
                row.addEventListener('drop', (e) => {
                    e.preventDefault();
                    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    const targetIndex = parseInt(e.target.closest('tr').dataset.index);
                    if (draggedIndex !== targetIndex && !isNaN(targetIndex)) {
                        const draggedTz = locations.splice(draggedIndex, 1)[0];
                        locations.splice(targetIndex, 0, draggedTz);
                        localStorage.setItem('locations', JSON.stringify(locations));
                        updateTimes();
                        updateURL();
                    }
                });
            } catch (e) {
                console.error(`Error with time zone ${tz}:`, e);
            }
        });
    }

    setCurrentBtn.addEventListener('click', function() {
        let tz = currentTzInput.value.trim();
        if (!tz) return;
        tz = normalizeTz(tz);
        try {
            new Date().toLocaleString('en-US', {timeZone: tz});
        } catch {
            alert(`"${tz}" is not a valid time zone. Please select from the suggestions.`);
            return;
        }
        currentTz = tz;
        localStorage.setItem('currentTz', currentTz);
        updateTimes();
        updateURL();
    });

    addBtn.addEventListener('click', function() {
        let tz = newTzInput.value.trim();
        if (!tz) return;
        tz = normalizeTz(tz);
        try {
            new Date().toLocaleString('en-US', {timeZone: tz});
        } catch {
            alert(`"${tz}" is not a valid time zone. Please select from the suggestions.`);
            return;
        }
        if (!locations.includes(tz)) {
            locations.push(tz);
            localStorage.setItem('locations', JSON.stringify(locations));
            newTzInput.value = '';
            updateTimes();
            updateURL();
        }
    });

    window.removeLocation = function(tz) {
        locations = locations.filter(l => l !== tz);
        localStorage.setItem('locations', JSON.stringify(locations));
        updateTimes();
        updateURL();
    };

    // Format change listener
    document.querySelectorAll('input[name="format"]').forEach(radio => {
        radio.addEventListener('change', function() {
            timeFormat = this.value;
            localStorage.setItem('timeFormat', timeFormat);
            updateTimes();
            updateURL();
        });
    });

    // Show date change listener
    if (showDateEl) {
        showDateEl.addEventListener('change', function() {
            showDate = this.checked;
            localStorage.setItem('showDate', showDate);
            updateTimes();
            updateURL();
        });
    }

    // Dark mode change listener
    if (darkModeEl) {
        darkModeEl.addEventListener('change', function() {
            darkMode = this.checked;
            localStorage.setItem('darkMode', darkMode);
            document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
        });
    }

    updateTimes();
    setInterval(updateTimes, 60000);

    // Share functions
    window.shareOnFacebook = function() {
        updateURL();
        const url = encodeURIComponent(window.location.href);
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    };

    window.shareOnTwitter = function() {
        updateURL();
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent('Check out this time zone app!');
        window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
    };

    window.shareOnLinkedIn = function() {
        updateURL();
        const url = encodeURIComponent(window.location.href);
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
    };

    window.copyLink = function() {
        updateURL();
        const url = window.location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                alert('Link copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy: ', err);
                fallbackCopyTextToClipboard(url);
            });
        } else {
            fallbackCopyTextToClipboard(url);
        }
    };

    function fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                alert('Link copied to clipboard!');
            } else {
                alert('Failed to copy link');
            }
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            alert('Failed to copy link');
        }
        document.body.removeChild(textArea);
    }
});
