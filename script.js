document.addEventListener('DOMContentLoaded', function() {
  async function fetchConnections() {
    try {
      const response = await fetch('/api/connections');
      const connections = await response.json();
      const tbody = document.querySelector('#connections-table tbody');
      tbody.innerHTML = '';
      
      if (connections.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" style="text-align: center;">No active connections</td>`;
        tbody.appendChild(tr);
        return;
      }
      
      connections.forEach(conn => {
        const tr = document.createElement('tr');
        
        // Set row color based on status
        let rowClass = '';
        if (conn.status === 'active' && conn.position === 1) {
          rowClass = 'queue-front';
        } else if (conn.status === 'disconnected') {
          rowClass = 'queue-disconnected';
        }
        
        tr.className = rowClass;
        tr.innerHTML = `
          <td>${conn.position}</td>
          <td>${conn.deviceId}</td>
          <td>${conn.status}</td>
          <td>${conn.confirmed ? 'Yes' : 'No'}</td>
          <td>
            <button class="btn btn-promote" data-deviceid="${conn.deviceId}">Promote</button>
            <button class="btn btn-demote" data-deviceid="${conn.deviceId}">Demote</button>
            <button class="btn btn-disconnect" data-deviceid="${conn.deviceId}">Disconnect</button>
            <button class="btn btn-delete" data-deviceid="${conn.deviceId}">Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (error) {
      console.error('Error fetching connections:', error);
      // Show error message in the table
      const tbody = document.querySelector('#connections-table tbody');
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">
        Error loading data: ${error.message || 'Network error'}
      </td></tr>`;
    }
  }

  async function sendApiRequest(endpoint, deviceId) {
    try {
      const response = await fetch(endpoint + '?deviceId=' + encodeURIComponent(deviceId), { method: 'POST' });
      const msg = await response.text();
      alert(msg);
      fetchConnections();
    } catch (error) {
      console.error('Error sending API request:', error);
    }
  }

  document.querySelector('#connections-table').addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-promote')) {
      if (confirm('Are you sure you want to promote this user to the front of the queue?')) {
        const deviceId = e.target.getAttribute('data-deviceid');
        sendApiRequest('/api/promote', deviceId);
      }
    }
    if (e.target.classList.contains('btn-demote')) {
      if (confirm('Are you sure you want to move this user to the back of the queue?')) {
        const deviceId = e.target.getAttribute('data-deviceid');
        sendApiRequest('/api/demote', deviceId);
      }
    }
    if (e.target.classList.contains('btn-disconnect')) {
      if (confirm('Are you sure you want to disconnect this user? They will see a disconnection message.')) {
        const deviceId = e.target.getAttribute('data-deviceid');
        sendApiRequest('/api/disconnect', deviceId);
      }
    }
    if (e.target.classList.contains('btn-delete')) {
      if (confirm('Are you sure you want to completely remove this user from the queue? This action cannot be undone.')) {
        const deviceId = e.target.getAttribute('data-deviceid');
        sendApiRequest('/api/delete', deviceId);
      }
    }
  });

  // Make sure the refresh button exists and has an event listener
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', fetchConnections);
  } else {
    console.error('Refresh button not found in the DOM');
  }

  // Initial fetch and auto-refresh
  fetchConnections();
  setInterval(fetchConnections, 5000);
});

// Add a global state variable for pause status
let isGloballyPaused = false;

// Function to fetch queue data from the server
async function fetchQueueData() {
    try {
        const response = await fetch('/api/connections'); // Assuming this endpoint exists
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        populateQueueTable(data);
    } catch (error) {
        console.error('Error fetching queue data:', error);
        const tableBody = document.getElementById('queueTableBody');
        tableBody.innerHTML = '<tr><td colspan="5">Error loading queue data. Please try refreshing.</td></tr>';
        // Disable pause button on error
        document.getElementById('pauseResumeButton').disabled = true;
        document.getElementById('pauseStatus').style.display = 'none';
    }
}

// Function to populate the queue table with data
function populateQueueTable(data) {
    const tableBody = document.getElementById('queueTableBody');
    tableBody.innerHTML = ''; // Clear existing data

    // Determine pause state (NEEDS SERVER SUPPORT)
    // Assuming the server adds an `isPaused` boolean to the first user object if the queue is paused
    isGloballyPaused = data.length > 0 && data[0].isPaused === true;
    updatePauseButton(data.length === 0); // Update based on paused state and if queue is empty

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">Queue is currently empty.</td></tr>';
        return;
    }

    data.forEach(user => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = user.position;
        row.insertCell().textContent = user.deviceId;
        row.insertCell().textContent = user.status;
        row.insertCell().textContent = user.confirmed ? 'Yes' : 'No';

        // Actions cell
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button onclick="promoteUser('${user.deviceId}')" ${user.position === 1 ? 'disabled' : ''}>Promote</button>
            <button onclick="demoteUser('${user.deviceId}')" ${user.position === 1 || data.length <= 1 ? 'disabled' : ''}>Demote</button>
            <button onclick="disconnectUser('${user.deviceId}')">Disconnect</button>
            <button onclick="deleteUser('${user.deviceId}')">Delete</button>
            <button onclick="endExperience('${user.deviceId}')" class="danger">End Exp.</button>
        `; // Added End Experience button
    });
}

// --- Functions for Queue Actions (Promote, Demote, Disconnect, Delete) ---
// Keep existing functions: promoteUser, demoteUser, disconnectUser, deleteUser
async function promoteUser(deviceId) {
    await sendAction('promote', deviceId);
}

async function demoteUser(deviceId) {
    await sendAction('demote', deviceId);
}

async function disconnectUser(deviceId) {
    await sendAction('disconnect', deviceId);
}

async function deleteUser(deviceId) {
    if (confirm(`Are you sure you want to DELETE user ${deviceId}? This cannot be undone.`)) {
        await sendAction('delete', deviceId);
    }
}

async function sendAction(action, deviceId) {
    try {
        const response = await fetch(`/api/${action}?deviceId=${deviceId}`, { method: 'POST' });
        if (response.ok) {
            console.log(`Action ${action} successful for ${deviceId}`);
            fetchQueueData(); // Refresh the queue
        } else {
            alert(`Error performing action ${action}: ${await response.text()}`);
        }
    } catch (error) {
        alert(`Fetch error performing action ${action}: ${error}`);
    }
}

// --- NEW Functions for Pause/Resume and End Experience ---

// Update Pause/Resume Button State
function updatePauseButton(isEmpty) {
     const pauseButton = document.getElementById('pauseResumeButton');
     const pauseStatus = document.getElementById('pauseStatus');

     if (isEmpty) {
         pauseButton.textContent = 'Pause Queue';
         pauseButton.disabled = true;
         pauseStatus.style.display = 'none';
     } else if (isGloballyPaused) {
         pauseButton.textContent = 'Resume Queue';
         pauseButton.disabled = false;
         pauseStatus.style.display = 'inline';
     } else {
         pauseButton.textContent = 'Pause Queue';
         pauseButton.disabled = false;
         pauseStatus.style.display = 'none';
     }
}

// Toggle Pause/Resume
async function togglePause() {
    const url = isGloballyPaused ? '/api/resumeQueue' : '/api/pauseQueue';
    const actionText = isGloballyPaused ? 'resume' : 'pause';
    try {
        const response = await fetch(url, { method: 'POST' });
        if (response.ok) {
            console.log(`Queue ${actionText} successful`);
            // Optimistically update UI
            isGloballyPaused = !isGloballyPaused;
            updatePauseButton(false); // Assume not empty if button was clickable
            fetchQueueData(); // Fetch data to confirm state
        } else {
            alert(`Error trying to ${actionText} queue: ${await response.text()}`);
        }
    } catch (error) {
        alert(`Fetch error trying to ${actionText} queue: ${error}`);
    }
}

// End User Experience
async function endExperience(deviceId) {
    if (!confirm(`Are you sure you want to end the experience for device ${deviceId}? The user will be disconnected.`)) {
        return;
    }
    try {
        const response = await fetch(`/api/endExperience?deviceId=${deviceId}`, { method: 'POST' });
        if (response.ok) {
            console.log(`Experience ended for ${deviceId}`);
            fetchQueueData(); // Refresh queue view
        } else {
            alert(`Error ending experience: ${await response.text()}`);
        }
    } catch (error) {
        alert(`Fetch error ending experience: ${error}`);
    }
}

// --- Functions for Ratings Tab ---

async function fetchRatings() {
    try {
        const response = await fetch('/api/ratings');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const ratings = await response.json();
        populateRatingsTable(ratings);
    } catch (error) {
        console.error('Error fetching ratings:', error);
        const tableBody = document.getElementById('ratingsTableBody');
        tableBody.innerHTML = '<tr><td colspan="3">Error loading ratings. Please try refreshing.</td></tr>';
    }
}

function populateRatingsTable(ratings) {
    const tableBody = document.getElementById('ratingsTableBody');
    tableBody.innerHTML = ''; // Clear existing ratings

    if (!ratings || ratings.length === 0) {
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 3; // Span across all columns
        cell.textContent = 'No ratings submitted yet.';
        return;
    }

    // Sort by timestamp descending (newest first)
    ratings.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    ratings.forEach(rating => {
        const row = tableBody.insertRow();
        const timeCell = row.insertCell();
        const ratingCell = row.insertCell();
        const deviceIdCell = row.insertCell();

        // Format timestamp
        const timestamp = rating.timestamp ? new Date(rating.timestamp).toLocaleString() : 'N/A';
        timeCell.textContent = timestamp;

        ratingCell.textContent = rating.rating ? '⭐'.repeat(rating.rating) : 'N/A'; // Display stars
        deviceIdCell.textContent = rating.deviceId || 'N/A';
    });
}

// --- Tab Switching Logic ---

function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablink");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";

    // Load ratings when the ratings tab is opened
    if (tabName === 'Ratings') {
         fetchRatings();
    }
}

// Initial data fetch when the page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchQueueData();
    // Optional: Fetch ratings on initial load as well
    // fetchRatings();
});

// Optional: Set interval to refresh queue data periodically
// setInterval(fetchQueueData, 5000); // Refresh every 5 seconds
