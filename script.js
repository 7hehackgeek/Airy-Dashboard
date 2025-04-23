// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyB56hW3EY5Z9h-pCROpus4JfIHWfO-RFWo",
    authDomain: "airy-7c2b7.firebaseapp.com",
    databaseURL: "https://airy-7c2b7-default-rtdb.firebaseio.com",
    projectId: "airy-7c2b7",
    storageBucket: "airy-7c2b7.firebasestorage.app",
    messagingSenderId: "36806953957",
    appId: "1:36806953957:web:9fbebec33db109b70f7d0c",
    measurementId: "G-NM4T0FGJXF"
  };
  

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const ratingsRef = database.ref('ratings');

const ratingsLogBody = document.getElementById('ratingsLogBody');
const ratingsChartCanvas = document.getElementById('ratingsChart');
let ratingsChart; // Variable to hold the chart instance

// --- Helper Functions ---

// Format Firebase timestamp (milliseconds since epoch) into a readable string
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString(); // Adjust format as needed (e.g., toLocaleDateString, toLocaleTimeString)
}

// Render a single rating log row
function renderRatingRow(key, ratingData) {
    const row = document.createElement('tr');
    row.setAttribute('data-key', key); // Store key for deletion

    const timestampCell = document.createElement('td');
    timestampCell.textContent = formatTimestamp(ratingData.timestamp);

    const ratingCell = document.createElement('td');
    // Display stars instead of just the number
    ratingCell.innerHTML = '&#9733;'.repeat(ratingData.rating); // Filled star character
    ratingCell.style.color = 'var(--color-yellow-bright)'; // Use brand yellow

    const actionCell = document.createElement('td');
    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-btn');
    deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>'; // Font Awesome trash icon
    deleteButton.onclick = () => deleteRating(key);
    actionCell.appendChild(deleteButton);

    row.appendChild(timestampCell);
    row.appendChild(ratingCell);
    row.appendChild(actionCell);

    // Prepend new ratings to the top
    ratingsLogBody.prepend(row);
}

// Delete a rating entry
function deleteRating(key) {
  if (confirm('Are you sure you want to delete this rating?')) {
    ratingsRef.child(key).remove()
      .then(() => {
        console.log(`Rating ${key} deleted successfully.`);
        // Remove the row from the table visually
        const rowToRemove = ratingsLogBody.querySelector(`tr[data-key="${key}"]`);
        if (rowToRemove) {
            rowToRemove.remove();
        }
        // No need to manually update chart here, the 'value' listener will handle it
      })
      .catch((error) => {
        console.error(`Error deleting rating ${key}:`, error);
        alert('Failed to delete rating. See console for details.');
      });
  }
}

// Update or Initialize Chart
function updateChart(ratingsData) {
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    // Check if ratingsData is null or empty
    if (ratingsData) {
         Object.values(ratingsData).forEach(item => {
            if (item && item.rating >= 1 && item.rating <= 5) {
                ratingCounts[item.rating]++;
            }
        });
    }


    const chartData = {
        labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'],
        datasets: [{
            label: 'Number of Ratings',
            data: Object.values(ratingCounts),
            backgroundColor: [ // Use brand colors
                'rgba(232, 197, 20, 0.6)', // Yellow Bright (semi-transparent)
                'rgba(122, 217, 224, 0.6)',// Blue Light
                'rgba(71, 144, 206, 0.6)', // Blue Medium
                'rgba(23, 68, 134, 0.6)',  // Blue Dark
                'rgba(232, 197, 20, 0.8)', // Yellow Bright (more opaque)
            ],
            borderColor: [
                'rgba(232, 197, 20, 1)',
                'rgba(122, 217, 224, 1)',
                'rgba(71, 144, 206, 1)',
                'rgba(23, 68, 134, 1)',
                'rgba(232, 197, 20, 1)',
            ],
            borderWidth: 1
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false, // Important to allow height control via CSS/container
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    color: 'var(--color-text-medium)', // Y-axis labels color
                     stepSize: 1 // Ensure integer steps for counts
                },
                grid: {
                    color: 'var(--color-border)' // Grid line color
                }
            },
            x: {
                ticks: {
                    color: 'var(--color-text-light)' // X-axis labels color
                },
                grid: {
                    display: false // Hide vertical grid lines
                }
            }
        },
        plugins: {
            legend: {
                display: false // Hide the legend
            }
        }
    };

    if (ratingsChart) {
        // Update existing chart
        ratingsChart.data = chartData;
        ratingsChart.options = chartOptions; // Re-apply options if they change
        ratingsChart.update();
    } else {
        // Create new chart
        ratingsChart = new Chart(ratingsChartCanvas, {
            type: 'bar',
            data: chartData,
            options: chartOptions
        });
    }
}


// --- Firebase Listeners ---

// Initial load and subsequent updates
ratingsRef.on('value', (snapshot) => {
    ratingsLogBody.innerHTML = ''; // Clear existing logs before re-rendering
    const ratingsData = snapshot.val();

    if (ratingsData) {
         // Sort entries by timestamp descending (newest first)
        const sortedKeys = Object.keys(ratingsData).sort((a, b) => {
            return ratingsData[b].timestamp - ratingsData[a].timestamp;
        });

        sortedKeys.forEach(key => {
            renderRatingRow(key, ratingsData[key]);
        });

        // Update chart with all current data
        updateChart(ratingsData);

    } else {
        ratingsLogBody.innerHTML = '<tr><td colspan="3" class="placeholder">No ratings submitted yet.</td></tr>';
         // Update chart with empty data
        updateChart(null);
    }
});


// Optional: More granular updates if needed (value listener is often sufficient)
/*
ratingsRef.on('child_added', (snapshot) => {
    console.log('Rating added:', snapshot.key);
    // Note: 'value' listener already handles rendering, so adding here might duplicate.
    // If performance becomes an issue with large datasets, switch from 'value'
    // to 'child_added', 'child_changed', 'child_removed' individually.
    // renderRatingRow(snapshot.key, snapshot.val());
    // updateChart(); // Trigger chart update
});

ratingsRef.on('child_removed', (snapshot) => {
    console.log('Rating removed:', snapshot.key);
    // Note: 'value' listener handles this. Visual removal done in deleteRating.
    // const rowToRemove = ratingsLogBody.querySelector(`tr[data-key="${snapshot.key}"]`);
    // if (rowToRemove) {
    //     rowToRemove.remove();
    // }
    // updateChart(); // Trigger chart update
});
*/

console.log("Ratings Dashboard Initialized.");
