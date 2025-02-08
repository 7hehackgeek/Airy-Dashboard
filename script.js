document.addEventListener('DOMContentLoaded', function() {
    // Fetch and display connections
    async function fetchConnections() {
      try {
        const response = await fetch('/api/connections');
        const connections = await response.json();
        const tbody = document.querySelector('#connections-table tbody');
        tbody.innerHTML = '';
        connections.forEach(conn => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${conn.position}</td>
            <td>${conn.deviceId}</td>
            <td>${conn.confirmed ? 'Yes' : 'No'}</td>
            <td>
              <button class="btn btn-promote" data-deviceid="${conn.deviceId}">Promote</button>
              <button class="btn btn-remove" data-deviceid="${conn.deviceId}">Remove</button>
            </td>
          `;
          tbody.appendChild(tr);
        });
      } catch (error) {
        console.error('Error fetching connections:', error);
      }
    }
  
    // Remove a connection
    async function removeConnection(deviceId) {
      try {
        const response = await fetch('/api/remove?deviceId=' + encodeURIComponent(deviceId), { method: 'POST' });
        const msg = await response.text();
        alert(msg);
        fetchConnections();
      } catch (error) {
        console.error('Error removing connection:', error);
      }
    }
  
    // Promote a connection
    async function promoteConnection(deviceId) {
      try {
        const response = await fetch('/api/promote?deviceId=' + encodeURIComponent(deviceId), { method: 'POST' });
        const msg = await response.text();
        alert(msg);
        fetchConnections();
      } catch (error) {
        console.error('Error promoting connection:', error);
      }
    }
  
    // Delegate events on the table for button clicks
    document.querySelector('#connections-table').addEventListener('click', function(e) {
      if (e.target.classList.contains('btn-remove')) {
        const deviceId = e.target.getAttribute('data-deviceid');
        removeConnection(deviceId);
      }
      if (e.target.classList.contains('btn-promote')) {
        const deviceId = e.target.getAttribute('data-deviceid');
        promoteConnection(deviceId);
      }
    });
  
    // Initial fetch and refresh every 5 seconds
    fetchConnections();
    setInterval(fetchConnections, 5000);
  });
  