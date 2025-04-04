document.addEventListener('DOMContentLoaded', function() {
  const connectionsTableBody = document.querySelector('#connections-table tbody');
  const ratingsTableBody = document.querySelector('#ratings-table tbody');
  const averageRatingSpan = document.getElementById('average-rating');
  const totalRatingsSpan = document.getElementById('total-ratings');
  const refreshConnectionsBtn = document.getElementById('refresh-btn');
  const refreshRatingsBtn = document.getElementById('refresh-ratings-btn');

  async function fetchConnections() {
    try {
      const response = await fetch('/api/connections');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const connections = await response.json();
      
      connectionsTableBody.innerHTML = ''; // Clear existing rows
      
      if (connections.length === 0) {
        connectionsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">No active connections</td></tr>`;
        return;
      }
      
      connections.forEach(conn => {
        const tr = document.createElement('tr');
        
        let rowClass = '';
        let statusText = conn.status;
        if (conn.status === 'active' && conn.position === 1) {
          rowClass = 'queue-front';
        } else if (conn.status === 'paused') {
            rowClass = 'queue-paused'; // Add specific style for paused state
            statusText = 'active (paused)'; // More descriptive status
        } else if (conn.status === 'disconnected') {
          rowClass = 'queue-disconnected';
        }
        
        tr.className = rowClass;
        
        // Action buttons logic
        let actionButtons = `
          <button class="btn btn-promote" data-deviceid="${conn.deviceId}" ${conn.position === 1 ? 'disabled' : ''}>Promote</button>
          <button class="btn btn-demote" data-deviceid="${conn.deviceId}" ${conn.position === 1 && connections.length === 1 ? 'disabled' : ''}>Demote</button>
          <button class="btn btn-end-experience" data-deviceid="${conn.deviceId}">End Experience</button>
        `;
        
        // Add Pause/Resume buttons only for the user at position 1
        if (conn.position === 1 && conn.status !== 'disconnected') {
            if (conn.isTimerPaused) {
                actionButtons += `<button class="btn btn-resume-timer" data-deviceid="${conn.deviceId}">Resume Timer</button>`;
            } else {
                actionButtons += `<button class="btn btn-pause-timer" data-deviceid="${conn.deviceId}">Pause Timer</button>`;
            }
        }
        
        tr.innerHTML = `
          <td>${conn.position}</td>
          <td>${conn.deviceId}</td>
          <td>${statusText}</td>
          <td>${conn.confirmed ? 'Yes' : 'No'}</td>
          <td>${actionButtons}</td>
        `;
        connectionsTableBody.appendChild(tr);
      });
    } catch (error) {
      console.error('Error fetching connections:', error);
      connectionsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">
        Error loading connections: ${error.message || 'Network error'}
      </td></tr>`;
    }
  }

  async function fetchRatings() {
      try {
          const response = await fetch('/api/ratings');
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const ratingsData = await response.json();

          // Update summary
          averageRatingSpan.textContent = ratingsData.average ? ratingsData.average.toFixed(2) : 'N/A';
          totalRatingsSpan.textContent = ratingsData.count || 0;

          // Update table
          ratingsTableBody.innerHTML = ''; // Clear existing rows
          if (!ratingsData.list || ratingsData.list.length === 0) {
              ratingsTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center;">No ratings submitted yet.</td></tr>`;
              return;
          }

          ratingsData.list.forEach(rating => {
              const tr = document.createElement('tr');
              const timestamp = rating.timestamp ? new Date(rating.timestamp).toLocaleString() : 'N/A';
              tr.innerHTML = `
                  <td>${timestamp}</td>
                  <td>${'⭐'.repeat(rating.rating)} (${rating.rating}/5)</td>
                  <td>${rating.feedback || '-'}</td>
              `;
              ratingsTableBody.appendChild(tr);
          });

      } catch (error) {
          console.error('Error fetching ratings:', error);
          ratingsTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: red;">
              Error loading ratings: ${error.message || 'Network error'}
          </td></tr>`;
          averageRatingSpan.textContent = 'Error';
          totalRatingsSpan.textContent = 'Error';
      }
  }

  async function sendApiRequest(endpoint, deviceId) {
    try {
      // Construct URL ensuring deviceId is included if present
      const url = deviceId ? `${endpoint}?deviceId=${encodeURIComponent(deviceId)}` : endpoint;
      const response = await fetch(url, { method: 'POST' });
      const msg = await response.text();
      
      if (!response.ok) {
          alert(`Error: ${msg}`); // Show error message from server
      } else {
          alert(msg); // Show success message
      }
      
      // Refresh both connections and ratings after any action
      fetchConnections();
      fetchRatings(); 
      
    } catch (error) {
      console.error('Error sending API request:', error);
      alert(`Request failed: ${error.message}`);
    }
  }

  // Event listener for the connections table (using event delegation)
  connectionsTableBody.addEventListener('click', function(e) {
    const target = e.target;
    const deviceId = target.getAttribute('data-deviceid');

    if (target.classList.contains('btn-promote') && deviceId) {
      if (confirm('Are you sure you want to promote this user to the front?')) {
        sendApiRequest('/api/promote', deviceId);
      }
    }
    else if (target.classList.contains('btn-demote') && deviceId) {
      if (confirm('Are you sure you want to move this user to the back of the queue?')) {
        sendApiRequest('/api/demote', deviceId);
      }
    }
    else if (target.classList.contains('btn-end-experience') && deviceId) {
      if (confirm('Are you sure you want to end the experience for this user? This will remove them permanently.')) {
        sendApiRequest('/api/end-experience', deviceId);
      }
    }
    else if (target.classList.contains('btn-pause-timer') && deviceId) {
        // Confirmation might not be needed for pause/resume, but can be added
        sendApiRequest('/api/pause-timer', deviceId);
    }
    else if (target.classList.contains('btn-resume-timer') && deviceId) {
        sendApiRequest('/api/resume-timer', deviceId);
    }
  });

  // Add event listeners for refresh buttons
  if (refreshConnectionsBtn) {
    refreshConnectionsBtn.addEventListener('click', fetchConnections);
  } else {
    console.error('Connections refresh button not found');
  }

  if (refreshRatingsBtn) {
      refreshRatingsBtn.addEventListener('click', fetchRatings);
  } else {
      console.error('Ratings refresh button not found');
  }

  // Initial data fetch and auto-refresh for connections
  fetchConnections();
  fetchRatings(); // Initial ratings fetch
  setInterval(fetchConnections, 5000); // Auto-refresh connections every 5 seconds
  // Ratings don't need frequent auto-refresh unless desired
  // setInterval(fetchRatings, 60000); // Optional: Refresh ratings every minute
});
