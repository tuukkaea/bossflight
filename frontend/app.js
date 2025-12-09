import { calculateDistance, calculateBearing, getCompassDirection } from './utils.js';
import { initializeCustomMap, createPurpleMarker } from './map.js';



let map;

let gameData = null

let currentChallenge = null

async function fetchDatabase() {
    try {
        let response = await fetch('database.json');
        if (!response.ok) {
            throw new Error('Network err ' + response.statusText);
        }
        let data = await response.json();
        return data;
    } catch (error) {
        console.error('error:', error);
    }
}


function renderAirportsOnMap(airports) {
    const purpleMarker = createPurpleMarker();
    
    airports.forEach(airport => {
        const marker = L.marker([airport.latitude, airport.longitude], { icon: purpleMarker })
            .addTo(map);
        
        const popupContent = `
            <div class="airport-popup">
                <b>${airport.name}</b>
                <p class="airport-code">${airport.iata_code} / ${airport.icao_code}</p>
                <p class="airport-location">${airport.city}, ${airport.country_code}</p>
                <button class="fly-button" onclick="flyToAirport(${airport.id})">
                     Fly Here
                </button>
            </div>
        `;
        
        marker.bindPopup(popupContent);
    });
}



function initializeGame() {
    map = initializeCustomMap('map');
    

    fetchDatabase().then(data => {
        console.log('db:', data);
        renderAirportsOnMap(data.airports);
        gameData = data
        updatePlayerData(data.players[0], data.airports, data.players_airports); 
        showRandomChallenge()
        
    });
}

function updatePlayerData(player, airports, playersAirports){
    const playerName = document.getElementById('player-name');
    playerName.textContent = player.name

    const batteryLevel = document.getElementById('player-battery');
    batteryLevel.textContent = player.battery_level + '%'

    const playerDifficulty = document.getElementById('difficulty');
    playerDifficulty.textContent = player.difficulty_level

    const playerLocation = document.getElementById('current-location');
    const currentAirport = airports.find(airport => airport.id === player.current_location);
 
    playerLocation.textContent = currentAirport.name

    const destinationsVisited = document.getElementById('destinations-visited');
    const visitedCount = playersAirports.filter(pa => pa.player_id === player.id && pa.visited_at !== null).length;
    destinationsVisited.textContent = visitedCount 


    const distanceToBoss = document.getElementById('distance');
    const bossAirportData = playersAirports.find(pa => pa.player_id === player.id && pa.is_boss_airport === true);
    

    if (bossAirportData && currentAirport) {
        const bossAirport = airports.find(a => a.ident === bossAirportData.airport_ident);
        if (bossAirport) {
            const distance = calculateDistance(
                currentAirport.latitude_deg, 
                currentAirport.longitude_deg,
                bossAirport.latitude_deg,
                bossAirport.longitude_deg
            );
            distanceToBoss.textContent = Math.round(distance) + ' km';
            
            const directionElement = document.getElementById('direction');
            const bearing = calculateBearing(
                currentAirport.latitude_deg,
                currentAirport.longitude_deg,
                bossAirport.latitude_deg,
                bossAirport.longitude_deg
            );
            const compassDirection = getCompassDirection(bearing);
            directionElement.textContent = compassDirection;
            
            const compassArrow = document.getElementById('compass-arrow');
            if (compassArrow) {

                const adjustedRotation = bearing - 90;
                compassArrow.style.transform = `rotate(${adjustedRotation}deg)`;
            }
        }
    } 
}

function showRandomChallenge(){
    const challengeSection = document.getElementById('challenge-section')

    const challengeQuestion = document.getElementById('challenge-question')

    const openAnswerSection = document.getElementById('open-answer-section')

    const multipleChoiceSection = document.getElementById('multiple-choice-section')

    const challengeType = Math.random() > 0.5 ? "open" : "multiple_choice"; 
    if (challengeType === "open" && gameData.question_tasks.length > 0){
        const randomQuestion = gameData.question_tasks[Math.floor(Math.random()*gameData.question_tasks.length)];
        currentChallenge = {
            type:"open",
            data:randomQuestion
        }
        challengeQuestion.textContent = randomQuestion.question
        openAnswerSection.style.display ="block"
        multipleChoiceSection.style.display ="none"
    }
    
    else if(gameData.multiple_choice_questions.length>0){
        const randomMultipleChoiceQuestion = gameData.multiple_choice_questions[Math.floor(Math.random()*gameData.multiple_choice_questions.length)];
        currentChallenge = {
            type:"multiple_choice",
            data:randomMultipleChoiceQuestion
        }
        challengeQuestion.textContent = randomMultipleChoiceQuestion.question
        openAnswerSection.style.display ="none"
        multipleChoiceSection.style.display ="block"

        const answerOptions = document.getElementById('answer-choice-options')
        randomMultipleChoiceQuestion.answers.forEach(answer=>{
            const button = document.createElement("button")
            button.textContent = answer.answer
            button.className = "answer-option"
            button.onclick = () => submitMultiplechoiceAnswer(answer.is_correct)
            answerOptions.appendChild(button)

        })
    }


     
    }

function submitMultiplechoiceAnswer(isCorrect){
    answerOptions.innerHTML = "";
    const resultElement = document.getElementById('challenge-result')
    const buttons = document.querySelectorAll(".answer-option")
    if(isCorrect){
        resultElement.textContent = "Correct answer!"
        resultElement.className = "challenge-result correct"
    } else {
        const correctAnswer = currentChallenge.data.answers.find(a=>a.is_correct)
        resultElement.textContent = "Incorrect answer!"
        resultElement.className = "challenge-result incorrect"
    }
}

window.submitOpenAnswer = function(){
    console.log("toimiiko")
    const resultElement = document.getElementById('challenge-result')
    const userAnswer = document.getElementById('answer-input').value.trim()
    if (!userAnswer){
        alert("Answer the question!")
        return
    }
    const correctAnswer = currentChallenge.data.correct_answer.toLowerCase()
    const isCorrect = userAnswer.toLowerCase() === correctAnswer

    if(isCorrect){
        resultElement.textContent = "Correct answer!"
        resultElement.className = "challenge-result correct"
    } else {
        resultElement.textContent = "Incorrect answer! The correct answer is: " + currentChallenge.data.correct_answer
        resultElement.className = "challenge-result incorrect"
    }
    resultElement.style.display = "block"
}



initializeGame();