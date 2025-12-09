'use strict';

const startButton = document.getElementById('start');
const playerSetup = document.getElementById('player-setup');
const confirmButton = document.getElementById('start-game-confirm');
const nameInput = document.getElementById('player-name');
const difficultySelect = document.getElementById('difficulty');

const rulesButton = document.getElementById('rules')
const rulesMenu = document.getElementById('show-rules')

const aboutUsButton = document.getElementById('about-us')
const aboutUsMenu = document.getElementById('show-about-us')

startButton.addEventListener('click', function() {
  rulesMenu.classList.add('hidden');
  aboutUsMenu.classList.add('hidden');

  playerSetup.classList.remove('hidden');
  nameInput.focus();
});

rulesButton.addEventListener('click', function() {
  playerSetup.classList.add('hidden');
  aboutUsMenu.classList.add('hidden');

  rulesMenu.classList.remove('hidden');
});

aboutUsButton.addEventListener('click', function() {
  rulesMenu.classList.add('hidden');
  playerSetup.classList.add('hidden');

  aboutUsMenu.classList.remove('hidden');
});

confirmButton.addEventListener('click', function() {
  const playerName = nameInput.value.trim();
  const difficulty = difficultySelect.value;

  if (playerName === '') {
    alert('Input name before starting game!!!');
    return;
  }

  console.log('Player name: ', playerName);
  console.log('Difficulty level: ', difficulty);


  const payload = {
    difficulty: difficulty,
    player_name: playerName,
  };

  fetch('http://127.0.0.1:5000/new_game', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),

  }).then(function(response) {
    if (!response.ok) {
      return response.json().then(function(errorData) {
        console.error('Backend error:', errorData);
        alert('Backend error: ' + errorData.error);
        throw new Error('Backend error');
      });
    }

    return response.json();

  }).then(function(data) {
    console.log('Server response:', data);
    const sessionId = data.session_id;
    console.log('New session id:', sessionId);

    // tallenna sessionId localStorageen ??
    // siirry seuraavalle sivulle:
    // window.location.href = 'game.html?session_id=' + sessionId; ??

  }).catch(function(error) {
    console.error('Error sending data to backend:', error);
  });
});

