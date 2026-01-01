document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        
        // Create participants list with XSS protection
        let participantsList = '<li><em>No participants yet</em></li>';
        if (details.participants.length > 0) {
          const participantItems = details.participants.map(p => {
            const li = document.createElement('li');
            
            const span = document.createElement('span');
            span.className = 'participant-name';
            span.textContent = p; // Use textContent to prevent XSS
            
            const button = document.createElement('button');
            button.className = 'delete-btn';
            button.setAttribute('data-activity', name);
            button.setAttribute('data-email', p);
            button.setAttribute('title', 'Remove participant');
            // Use string concatenation instead of template literals for aria-label
            button.setAttribute('aria-label', 'Remove ' + p + ' from ' + name);
            button.textContent = '✕';
            
            li.appendChild(span);
            li.appendChild(button);
            
            return li.outerHTML;
          });
          participantsList = participantItems.join('');
        }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <strong>Participants:</strong>
            <ul class="participants-list">
              ${participantsList}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add delete button event listeners
        const deleteButtons = activityCard.querySelectorAll(".delete-btn");
        deleteButtons.forEach(btn => {
          btn.addEventListener("click", async (e) => {
            e.preventDefault();
            const activity = btn.getAttribute("data-activity");
            const email = btn.getAttribute("data-email");

            try {
              const response = await fetch(
                `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
                {
                  method: "POST",
                }
              );

              if (response.ok) {
                // Refresh the activities list
                fetchActivities();
              } else {
                const error = await response.json();
                alert(error.detail || "Failed to unregister participant");
              }
            } catch (error) {
              alert("Failed to unregister participant. Please try again.");
              console.error("Error unregistering:", error);
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh the activities list to show the new participant
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
