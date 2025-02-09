document.addEventListener('DOMContentLoaded', function() {
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
          <td>${conn.status}</td>
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
      const deviceId = e.target.getAttribute('data-deviceid');
      sendApiRequest('/api/promote', deviceId);
    }
    if (e.target.classList.contains('btn-demote')) {
      const deviceId = e.target.getAttribute('data-deviceid');
      sendApiRequest('/api/demote', deviceId);
    }
    if (e.target.classList.contains('btn-disconnect')) {
      const deviceId = e.target.getAttribute('data-deviceid');
      sendApiRequest('/api/disconnect', deviceId);
    }
    if (e.target.classList.contains('btn-delete')) {
      const deviceId = e.target.getAttribute('data-deviceid');
      sendApiRequest('/api/delete', deviceId);
    }
  });

  fetchConnections();
  setInterval(fetchConnections, 5000);
});
