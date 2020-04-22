import { roles } from './roles.js'
import { utility } from './util.js'
import { CardManager } from './modules/card-manager.js';


const cardManager = new CardManager();
const socket = io();
const finishedArtArray = ["Villager", "Werewolf", "Seer", "Shadow", "Hunter", "Mason", "Minion", "Sorcerer", "Dream Wolf"];

class Game {
    constructor(accessCode, size, deck, time) {
        this.accessCode = accessCode;
        this.size = size;
        this.deck = deck;
        this.time = time;
        this.players = [];
        this.status = "lobby";
        this.endTime = null;
    }
}

const fullDeck = [];
let gameSize = 0;
let atLeastOnePlayer = false;


// register event listeners on buttons
document.getElementById("reset-btn").addEventListener("click", resetCardQuantities);
document.getElementById("create-btn").addEventListener("click", createGame);
document.getElementById("role-btn").addEventListener("click", function() { displayModal("role-modal") });
document.getElementById("custom-role-form").addEventListener("submit", function(e) {
    addCustomRole(e);
});
Array.from(document.getElementsByClassName("close")).forEach(function(element) {
    element.addEventListener('click', closeModal);
});

// render all of the available cards to the user
window.onload = function() { 
    renderAvailableCards();
};

function renderAvailableCards() {
    for (let i = 0; i < roles.length; i ++) {
        const card = cardManager.createCard(roles[i]);

        fullDeck.push(card);

        document.getElementById("roles").appendChild(cardManager.constructModalRoleElement(card));
        document.getElementById("card-select").appendChild(cardManager.constructDeckBuilderElement(card));

        // Add event listeners to the top and bottom halves of the card to change the quantity. 
        let cardTop = document.getElementById("card-" + i).getElementsByClassName("card-top")[0];
        let cardQuantity = document.getElementById("card-" + i).getElementsByClassName("card-quantity")[0];
        let cardBottom = document.getElementById("card-" + i).getElementsByClassName("card-bottom")[0];
        cardTop.addEventListener("click", incrementCardQuantity, false);
        cardBottom.addEventListener("click", decrementCardQuantity, false);
        cardTop.card = card;
        cardTop.quantityEl = cardQuantity;
        cardBottom.card = card;
        cardBottom.quantityEl = cardQuantity;
    }

    const customCard = cardManager.constructCustomCardIndicator();
    customCard.addEventListener("click", function() {
        displayModal("custom-card-modal");
    });
    document.getElementById("card-select").appendChild(customCard);
}

function addCustomRole(e) {
    e.preventDefault();
    let role = {
        role: document.getElementById("custom-role-name").value,
        team: document.getElementById("custom-role-team").value,
        description: document.getElementById("custom-role-desc").value,
        isTypeOfWerewolf: document.getElementById("custom-role-wolf").checked,
        custom: true
    };
    roles.push(role);
    document.getElementById("card-select").innerHTML = "";
    document.getElementById("roles").innerHTML = "";
    renderAvailableCards();
    closeModal();
}


function incrementCardQuantity(e) {
    if(e.target.card.quantity < 25) {
        e.target.card.quantity += 1;
    }
    e.target.quantityEl.innerHTML = e.target.card.quantity;
    updateGameSize();
}

function decrementCardQuantity(e) {
    if(e.target.card.quantity > 0) {
        e.target.card.quantity -= 1;
    }
    e.target.quantityEl.innerHTML = e.target.card.quantity;
    updateGameSize();
}

function updateGameSize() {
    gameSize = 0;
    for (let card of fullDeck) {
        gameSize += card.quantity;
    }
    document.getElementById("game-size").innerText = gameSize + " Players";
    atLeastOnePlayer = gameSize > 0;
    return gameSize;
}

function resetCardQuantities() {
    for (let card of fullDeck) {
        card.quantity = 0;
    }
    updateGameSize();
    Array.prototype.filter.call(document.getElementsByClassName("card-quantity"), function(quantities){
        return quantities.innerHTML = 0;
    });
}

function displayModal(modalId) {
    document.getElementById(modalId).classList.remove("hidden");
    document.getElementById("app-content").classList.add("hidden");
}

function closeModal() {
    document.getElementById("role-modal").classList.add("hidden");
    document.getElementById("custom-card-modal").classList.add("hidden");
    document.getElementById("app-content").classList.remove("hidden");
}

function buildDeckFromQuantities() {
    let playerDeck = [];
    for (const card of fullDeck) {
        for (let i = 0; i < card.quantity; i++) {
            let newCard = new Card(card.role, card.team, card.description, card.isTypeOfWerewolf);
            newCard.id = utility.generateID();
            playerDeck.push(newCard);
        }
    }
    return playerDeck;
}

function createGame() {
    if (document.getElementById("name").value.length > 0 && atLeastOnePlayer) {
        // generate 6 digit access code
        let code = "";
        let charPool = "abcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 6; i++) {
            code += charPool[utility.getRandomInt(36)]
        }

        // generate unique player Id for session
        let id = utility.generateID();
        sessionStorage.setItem("id", id);

        // player who creates the game is the host
        sessionStorage.setItem("host", true);

        // send a new game to the server, and then join it
        const playerInfo = {name: document.getElementById("name").value, code: code, id: id};
        const game = new Game(
            code,
            gameSize,
            buildDeckFromQuantities(),
            Math.ceil(document.getElementById("time").value)
            );
        socket.emit('newGame', game, function() {
            socket.emit('joinGame', playerInfo);
            sessionStorage.setItem('code', code);
            window.location.replace('/' + code);
        });
    } else {
        document.getElementById("some-error").innerText = "There are problems with your above setup.";
        if (!atLeastOnePlayer) {
            document.getElementById("game-size").classList.add("error");
            document.getElementById("size-error").innerText = "Add at least one card";
        } else {
            document.getElementById("game-size").classList.remove("error");
            document.getElementById("size-error").innerText = "";
        }
        document.getElementById("name").classList.add("error");
        document.getElementById("name-error").innerText = "Name is required.";
    }
}
