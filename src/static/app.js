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
        
        // Create activity name heading
        const heading = document.createElement('h4');
        heading.textContent = name;
        activityCard.appendChild(heading);
        
        // Create description paragraph
        const descPara = document.createElement('p');
        descPara.textContent = details.description;
        activityCard.appendChild(descPara);
        
        // Create schedule paragraph
        const schedulePara = document.createElement('p');
        const scheduleStrong = document.createElement('strong');
        scheduleStrong.textContent = 'Schedule: ';
        schedulePara.appendChild(scheduleStrong);
        schedulePara.appendChild(document.createTextNode(details.schedule));
        activityCard.appendChild(schedulePara);
        
        // Create availability paragraph
        const availPara = document.createElement('p');
        const availStrong = document.createElement('strong');
        availStrong.textContent = 'Availability: ';
        availPara.appendChild(availStrong);
        availPara.appendChild(document.createTextNode(spotsLeft + ' spots left'));
        activityCard.appendChild(availPara);
        
        // Create participants section
        const participantsDiv = document.createElement('div');
        participantsDiv.className = 'participants-section';
        
        const participantsLabel = document.createElement('strong');
        participantsLabel.textContent = 'Participants:';
        participantsDiv.appendChild(participantsLabel);
        
        const participantsList = document.createElement('ul');
        participantsList.className = 'participants-list';
        
        if (details.participants.length > 0) {
          details.participants.forEach(p => {
            const li = document.createElement('li');
            
            const span = document.createElement('span');
            span.className = 'participant-name';
            span.textContent = p;
            
            const button = document.createElement('button');
            button.className = 'delete-btn';
            button.setAttribute('data-activity', name);
            button.setAttribute('data-email', p);
            button.setAttribute('title', 'Remove participant');
            button.setAttribute('aria-label', 'Remove ' + p + ' from ' + name);
            button.textContent = '✕';
            
            // Add click event listener
            button.addEventListener("click", async (e) => {
              e.preventDefault();
              const activity = button.getAttribute("data-activity");
              const email = button.getAttribute("data-email");

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
            
            li.appendChild(span);
            li.appendChild(button);
            participantsList.appendChild(li);
          });
        } else {
          const li = document.createElement('li');
          const em = document.createElement('em');
          em.textContent = 'No participants yet';
          li.appendChild(em);
          participantsList.appendChild(li);
        }
        
        participantsDiv.appendChild(participantsList);
        activityCard.appendChild(participantsDiv);

        activitiesList.appendChild(activityCard);

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
