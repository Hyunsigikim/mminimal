document.addEventListener('DOMContentLoaded', function() {
    // Initialize map
    const map = L.map('map').setView([37.5665, 126.9780], 10);

    // Add tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
    }).addTo(map);

    // Click handler for map
    let currentMarker = null;
    map.on('click', function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        if (currentMarker) {
            map.removeLayer(currentMarker);
        }

        currentMarker = L.marker([lat, lng]).addTo(map);

        const latInput = document.querySelector('input[name="latitude"]');
        const lngInput = document.querySelector('input[name="longitude"]');
        if (latInput) latInput.value = lat.toFixed(6);
        if (lngInput) lngInput.value = lng.toFixed(6);

        console.log('Map clicked at:', lat, lng);
    });

    // Add board markers
    const boardData = <%- JSON.stringify(boards) %>;

    boardData.forEach(function(board) {
        const lat = board.latitude || 0;
        const lng = board.longitude || 0;

        if (lat === 0 && lng === 0) {
            const marker = L.marker([37.5665, 126.9780]);
            marker.addTo(map);
            marker.bindPopup('<strong>' + board.name + '</strong><br>No location set<br><a href="/boards/' + board._id + '/posts">View Posts</a>');
            marker.on('dblclick', function() {
                window.location.href = '/boards/' + board._id + '/posts';
            });
        } else {
            const marker = L.marker([lat, lng]);
            marker.addTo(map);
            marker.bindPopup('<strong>' + board.name + '</strong><br>' + (board.description || 'No description') + '<br><a href="/boards/' + board._id + '/posts">View Posts</a>');
            marker.on('dblclick', function() {
                window.location.href = '/boards/' + board._id + '/posts';
            });
        }
    });

    // Fit bounds
    if (boardData.length > 0) {
        setTimeout(function() {
            const bounds = [];
            boardData.forEach(function(board) {
                const lat = board.latitude || 0;
                const lng = board.longitude || 0;
                if (lat !== 0 || lng !== 0) {
                    bounds.push([lat, lng]);
                } else {
                    bounds.push([37.5665, 126.9780]);
                }
            });
            if (bounds.length > 0) {
                map.fitBounds(bounds);
            }
        }, 100);
    }
});
