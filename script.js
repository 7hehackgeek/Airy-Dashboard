document.addEventListener('DOMContentLoaded', function() {
  async function fetchConnections() {
    try {
      const response = await fetch('/api/connections');
      const connections = await response.json();
      const tbody = document.querySelector('#connections-table tbody');
      tbody.innerHTML = '';
      
      if (connections.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="4" style="text-align: center;">No active connections</td>`;
        tbody.appendChild(tr);
        return;
      }
      
      connections.forEach(conn => {
        const tr = document.createElement('tr');
        
        // Set row color based on position (only front user highlighted)
        let rowClass = '';
        if (conn.position === 1) {
          rowClass = 'queue-front';
        }
        
        tr.className = rowClass;
        tr.innerHTML = `
          <td>${conn.position}</td>
          <td>${conn.deviceId}</td>
          <td>${conn.confirmed ? 'Yes' : 'No'}</td>
          <td>
            <button class="btn btn-promote" data-deviceid="${conn.deviceId}">Promote</button>
            <button class="btn btn-demote" data-deviceid="${conn.deviceId}">Demote</button>
            <button class="btn btn-delete" data-deviceid="${conn.deviceId}">Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (error) {
      console.error('Error fetching connections:', error);
      // Show error message in the table
      const tbody = document.querySelector('#connections-table tbody');
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">
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
