
function init () {
    // Register service worker for PWA functionality
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('Service Worker registered successfully:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
    
    let totalSeconds = 0;
    const totalDisplay = document.getElementById('totalDuration');
    const player = document.getElementById('player');
    
    let playlist = [];
    let customOrder = []; // Store custom order indices
    
    let firstPlayHandled = false;
    
    // Drag and drop variables
    let draggedElement = null;
    let draggedIndex = null;
    
    // Load custom order from localStorage
    function loadCustomOrder() {
        const saved = localStorage.getItem('playlistOrder');
        if (saved) {
            try {
                customOrder = JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to parse saved playlist order:', e);
                customOrder = [];
            }
        }
    }
    
    // Save custom order to localStorage
    function saveCustomOrder() {
        localStorage.setItem('playlistOrder', JSON.stringify(customOrder));
    }
    
    // Get the actual playlist index from custom order
    function getPlaylistIndex(displayIndex) {
        if (customOrder.length > 0 && customOrder[displayIndex] !== undefined) {
            return customOrder[displayIndex];
        }
        return displayIndex;
    }
    
    // Get the display index from playlist index
    function getDisplayIndex(playlistIndex) {
        if (customOrder.length > 0) {
            const displayIndex = customOrder.indexOf(playlistIndex);
            return displayIndex !== -1 ? displayIndex : playlistIndex;
        }
        return playlistIndex;
    }
    
    // Drag and drop event handlers (will be moved inside getPlaylist function)
    let handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd;

    document.getElementById('toggleAnalyzerBtn').onclick = toggleAnalyzer;
    
    player.addEventListener('play', () => {
        if (!firstPlayHandled) {
            firstPlayHandled = true;
            // Trigger click on currently selected row
            const currentRow = document.querySelector(`tr[data-index="${i}"]`);
            if (currentRow) currentRow.click();
        }
    }, { once: true });
    
    // Add mobile-specific audio handling
    player.addEventListener('pause', () => {
        // On mobile, check if pause was due to AudioContext suspension
        if (window.globalAudioContext && window.globalAudioContext.state === 'suspended') {
            console.log('Audio paused due to AudioContext suspension');
        }
    });
    
    // Handle audio resumption when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && player.paused && window.globalAudioContext) {
            // Try to resume audio if it was paused due to suspension
            if (window.globalAudioContext.state === 'running') {
                player.play().catch(err => console.warn('Failed to resume audio:', err));
            }
        }
    });
    
    // Enhanced audio session handling for background playback
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => {
            player.play();
        });
        
        navigator.mediaSession.setActionHandler('pause', () => {
            player.pause();
        });
        
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            if (playlist.length > 0) {
                load((i - 1 + playlist.length) % playlist.length);
            }
        });
        
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            if (playlist.length > 0) {
                load((i + 1) % playlist.length);
            }
        });
        
        // Update media session metadata when track changes
        function updateMediaSession() {
            if (playlist.length > 0 && playlist[i]) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: playlist[i].name,
                    artist: 'Audio Player',
                    album: 'Playlist',
                    artwork: [
                        {
                            src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiMwMDAwMDAiLz4KPHBhdGggZD0iTTk2IDQ4QzY5LjQ5IDQ4IDQ4IDY5LjQ5IDQ4IDk2czIxLjQ5IDQ4IDQ4IDQ4IDQ4LTQ4IDQ4LTQ4LTIxLjQ5LTQ4LTQ4LTQ4em0wIDY0Yy04LjgzIDAtMTYtNy4xNy0xNi0xNnM3LjE3LTE2IDE2LTE2IDE2IDcuMTcgMTYgMTYtNy4xNyAxNi0xNiAxNnoiIGZpbGw9IiNmZmZmZmYiLz4KPHBhdGggZD0iTTk2IDEyOGMtMTcuNjcgMC0zMiAxNC4zMy0zMiAzMnMxNC4zMyAzMiAzMiAzMiAzMi0xNC4zMyAzMi0zMi0xNC4zMy0zMi0zMi0zMnoiIGZpbGw9IiNmZmZmZmYiLz4KPC9zdmc+Cg==',
                            sizes: '192x192',
                            type: 'image/svg+xml'
                        }
                    ]
                });
            }
        }
        
        // Update playback state
        function updatePlaybackState() {
            navigator.mediaSession.playbackState = player.paused ? 'paused' : 'playing';
        }
        
        // Add event listeners for media session updates
        player.addEventListener('play', updatePlaybackState);
        player.addEventListener('pause', updatePlaybackState);
        player.addEventListener('ended', updatePlaybackState);
    }
    
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
            
            // Determine which tracks to display and in what order
            const tracksToDisplay = customOrder.length > 0 
                ? customOrder.map(playlistIndex => ({ track: playlist[playlistIndex], playlistIndex }))
                : playlist.map((track, index) => ({ track, playlistIndex: index }));
            
            tracksToDisplay.forEach(({ track, playlistIndex }, displayIndex) => {
                const row = table.insertRow();
                row.dataset.index = displayIndex;
                row.dataset.playlistIndex = playlistIndex;
                
                // Add drag and drop attributes
                row.draggable = true;
                row.addEventListener('dragstart', handleDragStart);
                row.addEventListener('dragover', handleDragOver);
                row.addEventListener('dragleave', handleDragLeave);
                row.addEventListener('drop', handleDrop);
                row.addEventListener('dragend', handleDragEnd);
                
                if (playlistIndex === i) row.classList.add('current');
                row.onclick = () => load(playlistIndex);
            
                const numCell = row.insertCell();
                numCell.textContent = displayIndex + 1; // Dynamic numbering
            
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
            
            // Update media session metadata
            if (typeof updateMediaSession === 'function') {
                updateMediaSession();
            }
        }
    
        function updateUI() {
            [...table.rows].forEach((row) => {
                const playlistIndex = parseInt(row.dataset.playlistIndex);
                row.classList.toggle('current', playlistIndex === i);
            });
        }
    
        prevBtn.onclick = () => {
            const currentDisplayIndex = getDisplayIndex(i);
            const prevDisplayIndex = (currentDisplayIndex - 1 + playlist.length) % playlist.length;
            const prevPlaylistIndex = getPlaylistIndex(prevDisplayIndex);
            load(prevPlaylistIndex);
        };
        
        nextBtn.onclick = () => {
            const currentDisplayIndex = getDisplayIndex(i);
            const nextDisplayIndex = (currentDisplayIndex + 1) % playlist.length;
            const nextPlaylistIndex = getPlaylistIndex(nextDisplayIndex);
            load(nextPlaylistIndex);
        };
        
        player.onended = () => {
            const currentDisplayIndex = getDisplayIndex(i);
            const nextDisplayIndex = (currentDisplayIndex + 1) % playlist.length;
            const nextPlaylistIndex = getPlaylistIndex(nextDisplayIndex);
            load(nextPlaylistIndex);
        };
    
        // Load custom order from localStorage
        loadCustomOrder();
        
        // Define drag and drop handlers inside getPlaylist where renderTable is accessible
        handleDragStart = function(e) {
            draggedElement = e.target.closest('tr');
            draggedIndex = parseInt(draggedElement.dataset.index);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', draggedElement.outerHTML);
            draggedElement.classList.add('dragging');
        };
        
        handleDragOver = function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const targetRow = e.target.closest('tr');
            if (targetRow && targetRow !== draggedElement) {
                const rect = targetRow.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                
                // Remove existing drop indicators
                document.querySelectorAll('.drop-above, .drop-below').forEach(el => {
                    el.classList.remove('drop-above', 'drop-below');
                });
                
                if (e.clientY < midpoint) {
                    targetRow.classList.add('drop-above');
                } else {
                    targetRow.classList.add('drop-below');
                }
            }
        };
        
        handleDragLeave = function(e) {
            const targetRow = e.target.closest('tr');
            if (targetRow) {
                targetRow.classList.remove('drop-above', 'drop-below');
            }
        };
        
        handleDrop = function(e) {
            e.preventDefault();
            
            const targetRow = e.target.closest('tr');
            if (!targetRow || !draggedElement || draggedIndex === null) return;
            
            const targetIndex = parseInt(targetRow.dataset.index);
            if (draggedIndex === targetIndex) return;
            
            const rect = targetRow.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            const dropAbove = e.clientY < midpoint;
            
            // Calculate new custom order
            const draggedPlaylistIndex = getPlaylistIndex(draggedIndex);
            const targetPlaylistIndex = getPlaylistIndex(targetIndex);
            
            // Remove dragged item from custom order
            const newCustomOrder = customOrder.filter(index => index !== draggedPlaylistIndex);
            
            // Find target position in custom order
            const targetCustomIndex = newCustomOrder.indexOf(targetPlaylistIndex);
            
            if (targetCustomIndex !== -1) {
                // Insert at target position
                const insertIndex = dropAbove ? targetCustomIndex : targetCustomIndex + 1;
                newCustomOrder.splice(insertIndex, 0, draggedPlaylistIndex);
            } else {
                // Target not in custom order, add to end
                newCustomOrder.push(draggedPlaylistIndex);
            }
            
            customOrder = newCustomOrder;
            saveCustomOrder();
            
            // Clean up visual indicators
            document.querySelectorAll('.drop-above, .drop-below, .dragging').forEach(el => {
                el.classList.remove('drop-above', 'drop-below', 'dragging');
            });
            
            // Re-render table with new order
            renderTable();
            
            // Update current track index if needed
            const currentPlaylistIndex = getPlaylistIndex(i);
            i = getDisplayIndex(currentPlaylistIndex);
            updateUI();
            
            draggedElement = null;
            draggedIndex = null;
        };
        
        handleDragEnd = function(e) {
            // Clean up visual indicators
            document.querySelectorAll('.drop-above', '.drop-below', '.dragging').forEach(el => {
                el.classList.remove('drop-above', 'drop-below', 'dragging');
            });
            
            draggedElement = null;
            draggedIndex = null;
        };
        
        // Add reset order button functionality
        document.getElementById('resetOrder').onclick = () => {
            customOrder = [];
            localStorage.removeItem('playlistOrder');
            renderTable();
            updateUI();
        };
        
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