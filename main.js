
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
    
        const monthMap = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };

        const musicEntries = [];
        const otherEntries = [];
        
        preText
            .split('\n')
            .forEach(line => {
                const match = line.match(/(\S+)\s+(\d{2}-[A-Za-z]{3}-\d{4} \d{2}:\d{2})/);
                if (!match) return;
        
                const [_, filename, datetime] = match;
                const [dateStr, timeStr] = datetime.split(' ');
                const [day, monthStr, year] = dateStr.split('-');
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
                const formattedDate = new Intl.DateTimeFormat('en-US', options).format(utcDate);
        
                const decodedName = decodeURIComponent(filename);
                if (decodedName.match(/\.(mp3|wav)$/i)) {
                    musicEntries.push([decodedName, formattedDate]);
                } else {
                    otherEntries.push([decodedName, formattedDate]);
                }
            });
    
        const table = document.getElementById('tracktable').querySelector('tbody');
        const prevBtn = document.getElementById('prev');
        const nextBtn = document.getElementById('next');
        const nowplaying = document.getElementById('nowplaying');
    
        document.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                sortBy(th.dataset.sort);
            });
        });
    
        async function getDuration(url, index) {
            return new Promise((resolve) => {
                const a = new Audio();
                a.src = url;
                a.addEventListener('loadedmetadata', () => {
                    const dur = a.duration;
                    const track = playlist.find(t => t.url === url);
                    if (track) track.duration = dur;
                    resolve(dur);
                });
                a.onerror = () => resolve(null);
            });
        }        
    
        function updateTotalDurationDisplay() {
            const total = playlist.reduce((sum, track) => sum + (track.duration || 0), 0);
            const mins = Math.floor(total / 60);
            const secs = Math.floor(total % 60).toString().padStart(2, '0');
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
                let av, bv;
            
                if (key === 'date') {
                    av = new Date(a[key]);
                    bv = new Date(b[key]);
                } else if (key === 'duration') {
                    av = a[key];
                    bv = b[key];
                } else {
                    av = a[key].toLowerCase();
                    bv = b[key].toLowerCase();
                }
            
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
            
                const numCell = row.insertCell();
                numCell.textContent = index + 1; // Dynamic numbering
            
                const nameCell = row.insertCell();
                nameCell.textContent = track.name;
            
                const durCell = row.insertCell();
                durCell.textContent = track.duration
                ? `${Math.floor(track.duration / 60)}:${String(Math.floor(track.duration % 60)).padStart(2, '0')}`
                : '—';
            
                const dateCell = row.insertCell();
                dateCell.textContent = track.date;

                const downloadCell = row.insertCell();
                const link = document.createElement('a');
                link.style.color = 'lightgreen';
                link.href = track.url;
                link.textContent = 'Download';
                downloadCell.appendChild(link);
            });
        }
    
        for (const [file, date] of musicEntries) {
            const url = base + decodeURIComponent(file);
            const name = decodeURIComponent(file);
            playlist.push({ name, url, date: date || '', duration: '…' });
        }

        const otherDiv = document.getElementById('otherFiles');
        if (otherEntries.length == 0) {
            otherDiv.style.display = 'none';
        }
        otherEntries.forEach(([file, date]) => {
            const link = document.createElement('a');
            link.href = base + encodeURIComponent(file);
            link.style.color = 'lightgreen';
            link.textContent = `${file} (${date})`;
            otherDiv.appendChild(link);
        });
    
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
        });

        Promise.all(
            playlist.map((track, index) => getDuration(track.url, index))
        ).then(() => {
            renderTable(); // ✅ draw with correct durations
            updateTotalDurationDisplay(); // ✅ totals now correct
        });
    
        function load(index) {
            i = index;
            player.src = `${playlist[i].url}?v=${Date.now()}`;
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
    
        sortBy._dir = 'desc';
        sortBy('name');
        if (playlist.length) load(0);
    }
    
    getPlaylist();    

    // Get folder name from URL
    const folder = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop());

    // Set page title
    document.title = folder;

    // Optionally update visible heading too
    const heading = document.getElementById('nowplaying');
    if (heading) heading.textContent = folder;
}