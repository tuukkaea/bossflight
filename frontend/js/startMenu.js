'use strict';

const API_URL = 'https://bossflights-api.up.railway.app:5000';

const startButton = document.getElementById('start');
const playerSetup = document.getElementById('player-setup');
const confirmButton = document.getElementById('start-game-confirm');
const nameInput = document.getElementById('player-name');
const difficultySelect = document.getElementById('difficulty');

const rulesButton = document.getElementById('rules');
const rulesMenu = document.getElementById('show-rules');

const aboutUsButton = document.getElementById('about-us');
const aboutUsMenu = document.getElementById('show-about-us');

const panelStage = document.getElementById('panel-stage');
const panelTemplates = document.getElementById('panel-templates');

const menuButtons = [startButton, rulesButton, aboutUsButton];
const sections = [
  { element: playerSetup, button: startButton },
  { element: rulesMenu, button: rulesButton },
  { element: aboutUsMenu, button: aboutUsButton },
];
let activeSection = null;

function setActiveButton(activeButton) {
  menuButtons.forEach((button) => {
    button.classList.toggle('active', button === activeButton);
  });
}

function hideAllSections() {
  sections.forEach(({ element }) => {
    element.classList.add('hidden');
    panelTemplates.appendChild(element);
  });
  panelStage.classList.add('hidden');
  panelStage.innerHTML = '';
}

function toggleSection(section, button) {
  if (activeSection === section) {
    hideAllSections();
    setActiveButton(null);
    activeSection = null;
    return;
  }

  hideAllSections();
  setActiveButton(button);
  panelStage.classList.remove('hidden');
  panelStage.appendChild(section);
  section.classList.remove('hidden');
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  activeSection = section;
}

startButton.addEventListener('click', function() {
  toggleSection(playerSetup, startButton);
  if (!playerSetup.classList.contains('hidden')) {
    nameInput.focus();
  }
});

rulesButton.addEventListener('click', function() {
  toggleSection(rulesMenu, rulesButton);
});

aboutUsButton.addEventListener('click', function() {
  toggleSection(aboutUsMenu, aboutUsButton);
});

hideAllSections();
setActiveButton(null);
activeSection = null;

confirmButton.addEventListener('click', async function() {
  const playerName = nameInput.value.trim();
  const difficulty = difficultySelect.value;

  if (playerName === '') {
    alert('Input name before starting game!!!');
    nameInput.focus();
    return;
  }

  confirmButton.disabled = true;
  confirmButton.textContent = 'Launching...';

  try {
    const response = await fetch(`${API_URL}/new_game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        difficulty: difficulty,
        player_name: playerName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend error:', errorData);
      alert('Backend error: ' + (errorData.error || 'Failed to create a new game.'));
      return;
    }

    const data = await response.json();
    const sessionId = data.session_id;

    if (!sessionId) {
      alert('Failed to create a new game session. Please try again.');
      return;
    }

    const params = new URLSearchParams({
      session_id: sessionId,
      player_name: playerName,
      difficulty: difficulty,
    });

    window.location.href = `game.html?${params.toString()}`;
  } catch (error) {
    console.error('Error sending data to backend:', error);
    alert('Unable to contact the game server. Please try again.');
  } finally {
    confirmButton.disabled = false;
    confirmButton.textContent = 'Launch Game';
  }
});
