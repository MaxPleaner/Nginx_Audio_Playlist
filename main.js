function init () {
    let totalSeconds = 0;
    const totalDisplay = document.getElementById('totalDuration');
    const player = document.getElementById('player');
    
    let playlist = [];
    
    let firstPlayHandled = false;

    document.getElementById('toggleAnalyzerBtn').onclick = toggleAnalyzer;
    
    player.addEventListener('play', () => {
        if (!firstPlayHandled) {
            firstPlayHandled = true;
            // Trigger click on currently selected row
            const currentRow = document.querySelector(`tr[data-index="${i}"]`);
            if (currentRow) currentRow.click();
        }
    }, { once: true });
    
    let i = 0;
    
    async function getPlaylist() {
        const base = location.pathname.replace(/\/$/, '') + '/tracks/';
        const res = await fetch(base);
        const html = await res.text();
    
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const preText = doc.querySelector('pre')?.textContent.trim() || '';
    
        const entries = preText
            .split('\n')
            .filter(line => line.match(/\.(mp3|wav)\b/i))
            .map(line => {
                const match = line.match(/(\S+\.(?:mp3|wav))\s+(\d{2}-[A-Za-z]{3}-\d{4} \d{2}:\d{2})/);
                if (!match) return null;
                const [_, filename, datetime] = match;
                const [dateStr, timeStr] = datetime.split(' ');
                const [day, monthStr, year] = dateStr.split('-');
                const monthMap = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
                const [hour, minute] = timeStr.split(':').map(Number);
                const utcDate = new Date(Date.UTC(+year, monthMap[monthStr], +day, hour, minute));
                const options = {
                    timeZone: 'America/Los_Angeles',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                };
                const formatted = new Intl.DateTimeFormat('en-US', options).format(utcDate);
                return [decodeURIComponent(filename), formatted];
            })
            .filter(Boolean);
    
        const table = document.getElementById('tracktable').querySelector('tbody');
        const prevBtn = document.getElementById('prev');
        const nextBtn = document.getElementById('next');
        const nowplaying = document.getElementById('nowplaying');
    
        document.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                sortBy(th.dataset.sort);
            });
        });
    
        async function getDuration(url) {
            return new Promise((resolve) => {
                const a = new Audio();
                a.src = url;
                a.addEventListener('loadedmetadata', () => {
                    const dur = a.duration;
                    totalSeconds += dur;
                    const minutes = Math.floor(dur / 60);
                    const seconds = Math.floor(dur % 60).toString().padStart(2, '0');
                    updateTotalDurationDisplay();
                    resolve(`${minutes}:${seconds}`);
                });
                a.onerror = () => resolve('—');
            });
        }
    
        function updateTotalDurationDisplay() {
            const mins = Math.floor(totalSeconds / 60);
            const secs = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
            totalDisplay.textContent = `Total Duration: ${mins}:${secs}`;
        }
    
        function sortBy(key) {
            const dir = sortBy._dir = sortBy._dir === 'asc' ? 'desc' : 'asc';
            document.querySelectorAll('th.sortable').forEach(th => {
                th.classList.remove('sorted-asc', 'sorted-desc');
            });
            const th = document.querySelector(`th[data-sort="${key}"]`);
            if (th) th.classList.add(`sorted-${dir}`);
    
            playlist.sort((a, b) => {
                const av = key === 'date' ? new Date(a[key]) : a[key].toLowerCase();
                const bv = key === 'date' ? new Date(b[key]) : b[key].toLowerCase();
                return dir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
            });
    
            renderTable();
        }
    
        function renderTable() {
            table.innerHTML = '';
            playlist.forEach((track, index) => {
                const row = table.insertRow();
                row.dataset.index = index;
                if (index === i) row.classList.add('current');
                row.onclick = () => load(index);
    
                const nameCell = row.insertCell();
                nameCell.textContent = track.name;
    
                const durCell = row.insertCell();
                durCell.textContent = track.duration;
    
                const dateCell = row.insertCell();
                dateCell.textContent = track.date;
            });
        }
    
        for (const [file, date] of entries) {
            const url = base + decodeURIComponent(file);
            const name = decodeURIComponent(file);
            playlist.push({ name, url, date: date || '', duration: '…' });
        }
    
        playlist.forEach((track, index) => {
            const row = table.insertRow();
            row.dataset.index = index;
    
            const nameCell = row.insertCell();
            nameCell.textContent = track.name;
    
            const durCell = row.insertCell();
            durCell.textContent = '…';
    
            const dateCell = row.insertCell();
            dateCell.textContent = track.date;
    
            row.onclick = () => load(index);
    
            getDuration(track.url).then(dur => {
                durCell.textContent = dur;
                playlist[index].duration = dur;
            });
        });
    
        function load(index) {
            i = index;
            player.src = playlist[i].url;
            player.play().catch(err => console.warn('Playback failed:', err));
            nowplaying.textContent = 'Now Playing: ' + playlist[i].name;
            updateUI();
            analyzeTrack(player); // Refresh analyzer on track change
        }
    
        function updateUI() {
            [...table.rows].forEach((row, idx) => {
                row.classList.toggle('current', idx === i);
            });
        }
    
        prevBtn.onclick = () => load((i - 1 + playlist.length) % playlist.length);
        nextBtn.onclick = () => load((i + 1) % playlist.length);
        player.onended = () => load((i + 1) % playlist.length);
    
        sortBy._dir = 'asc';
        sortBy('date');
        if (playlist.length) load(0);
    }
    
    getPlaylist();    
}