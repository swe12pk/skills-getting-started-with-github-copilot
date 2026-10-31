document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function addParticipant(participantsList, email) {
    const participantItem = document.createElement("li");
    participantItem.className = "participant-item";

    const participantEmail = document.createElement("span");
    participantEmail.textContent = email;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "participant-delete";
    deleteButton.setAttribute("aria-label", `Unregister ${email}`);
    deleteButton.title = `Unregister ${email}`;
    deleteButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Zm3 2v8h2v-8H9Zm4 0v8h2v-8h-2Z"/>
      </svg>
    `;

    participantItem.append(participantEmail, deleteButton);
    participantsList.appendChild(participantItem);
  }

  function updateActivityAvailability(activityCard, participantCount) {
    const spotsLeft = Number(activityCard.dataset.maxParticipants) - participantCount;
    activityCard.querySelector(".activity-availability").textContent =
      `${spotsLeft} spots left`;
  }

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
        activityCard.dataset.activity = name;
        activityCard.dataset.maxParticipants = details.max_participants;

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> <span class="activity-availability">${spotsLeft} spots left</span></p>
        `;

        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";
        const participantsHeading = document.createElement("h5");
        participantsHeading.textContent = "Participants";
        const participantsList = document.createElement("ul");
        participantsList.className = "participants-list";

        details.participants.forEach((participant) => {
          addParticipant(participantsList, participant);
        });

        participantsSection.append(participantsHeading, participantsList);

        if (details.participants.length === 0) {
          const emptyState = document.createElement("p");
          emptyState.className = "participants-empty";
          emptyState.textContent = "Be the first to sign up!";
          participantsSection.appendChild(emptyState);
        }

        activityCard.appendChild(participantsSection);
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

  activitiesList.addEventListener("click", async (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const deleteButton = target?.closest(".participant-delete");
    if (!deleteButton) {
      return;
    }

    const activityCard = deleteButton.closest(".activity-card");
    const participantItem = deleteButton.closest(".participant-item");
    const email = participantItem.querySelector("span").textContent;
    const activity = activityCard.dataset.activity;

    if (!window.confirm(`Unregister ${email} from ${activity}?`)) {
      return;
    }

    deleteButton.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        messageDiv.textContent = result.detail || "Unable to unregister participant";
        messageDiv.className = "error";
      } else {
        participantItem.remove();
        const participantsList = activityCard.querySelector(".participants-list");
        updateActivityAvailability(activityCard, participantsList.children.length);

        if (participantsList.children.length === 0) {
          const emptyState = document.createElement("p");
          emptyState.className = "participants-empty";
          emptyState.textContent = "Be the first to sign up!";
          participantsList.after(emptyState);
        }

        messageDiv.textContent = result.message;
        messageDiv.className = "success";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister participant. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering participant:", error);
    } finally {
      if (deleteButton.isConnected) {
        deleteButton.disabled = false;
      }
    }
  });

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

        const activityCard = Array.from(activitiesList.children).find(
          (card) => card.dataset.activity === activity
        );

        if (activityCard) {
          const participantsList = activityCard.querySelector(".participants-list");
          addParticipant(participantsList, email);
          activityCard.querySelector(".participants-empty")?.remove();
          updateActivityAvailability(activityCard, participantsList.children.length);
        }
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
