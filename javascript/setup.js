import {cards} from './cards.js'
import {utility} from './util.js'
import {CardManager} from './modules/card-manager.js'

const socket = io();

class Game {
    constructor(accessCode, reveals, size, deck, time, hasDreamWolf) {
        this.accessCode = accessCode;
        this.reveals = reveals;
        this.size = size;
        this.deck = deck;
        this.time = time;
        this.players = [];
        this.status = "lobby";
        this.hasDreamWolf = hasDreamWolf;
        this.endTime = null;
    }
}

const fullDeck = [];
let gameSize = 0;
let atLeastOnePlayer = false;

// register event listeners on buttons
document.getElementById("reset-btn").addEventListener("click", resetCardQuantities);
document.getElementById("create-btn").addEventListener("click", createGame);
document.getElementById("role-view-changer-gallery").addEventListener("click", function() { toggleViewChanger(false) });
document.getElementById("role-view-changer-list").addEventListener("click", function() { toggleViewChanger(true) });
document.getElementById("role-btn").addEventListener("click", function() { displayModal("role-modal", undefined) });
document.getElementById("edit-role-btn").addEventListener("click", function() { displayModal("edit-custom-roles-modal", undefined) });
document.getElementById("custom-role-form").addEventListener("submit", function(e) {
    addCustomCardToRoles(e);
});
Array.from(document.getElementsByClassName("close")).forEach(function(element) {
    element.addEventListener('click', closeModal);
});

// render all of the available cards to the user
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    document.getElementById("create-game-header").innerText = urlParams.get('reveals') === "true"
        ? "Create Reveal Game"
        : "Create No-Reveal Game";
    readInUserCustomRoles();
    renderAvailableCards(false);
};

function renderAvailableCards(isCondensed) {
    cards.sort(function(a, b) {
        return a.role.toUpperCase().localeCompare(b.role);
    });
    document.getElementById("card-select-good").innerHTML = "";
    document.getElementById("card-select-evil").innerHTML = "";
    document.getElementById("roles").innerHTML = "";
    document.getElementById("custom-roles").innerHTML = "";

    for (let i = 0; i < cards.length; i ++) {
        cards[i].team === "good"
            ? renderGoodRole(cards[i], i, isCondensed)
            : renderEvilRole(cards[i], i, isCondensed);
    }

    if (document.getElementById("custom-roles").getElementsByClassName("custom-role-edit").length === 0) {
        document.getElementById("custom-roles").innerHTML = "<h2>You haven't added any custom cards.</h2>";
    }

    let customCardGood = CardManager.constructCustomCardIndicator(isCondensed, "good");
    let customCardEvil = CardManager.constructCustomCardIndicator(isCondensed, "evil");
    document.getElementById("card-select-good").appendChild(customCardGood);
    document.getElementById("card-select-evil").appendChild(customCardEvil);
    customCardGood.addEventListener("click", function() {
        displayModal("custom-card-modal", "Good");
    });
    customCardEvil.addEventListener("click", function() {
        displayModal("custom-card-modal", "Evil");
    });
}

function renderGoodRole(cardInfo, i, isCondensed) {
    const card = CardManager.createCard(cardInfo);
    if (card.custom) {
        renderCustomRoleInModal(card, i);
    }
    fullDeck.push(card);

    document.getElementById("roles").appendChild(CardManager.constructModalRoleElement(card));
    if (isCondensed) {
        document.getElementById("card-select-good").appendChild(CardManager.constructCompactDeckBuilderElement(card, i));
        let cardLeft = document.getElementById("card-" + i).getElementsByClassName("compact-card-left")[0];
        let cardQuantity = document.getElementById("card-" + i).getElementsByClassName("card-quantity")[0];
        let cardRight = document.getElementById("card-" + i).getElementsByClassName("compact-card-right")[0];
        cardRight.addEventListener("click", function() { incrementCardQuantity(cardRight) }, true);
        cardLeft.addEventListener("click", function() { decrementCardQuantity(cardLeft) }, true);
        cardRight.card = card;
        cardRight.quantityEl = cardQuantity;
        cardLeft.card = card;
        cardLeft.quantityEl = cardQuantity;
    } else {
        document.getElementById("card-select-good").appendChild(CardManager.constructDeckBuilderElement(card, i));
        // Add event listeners to the top and bottom halves of the card to change the quantity.
        let cardTop = document.getElementById("card-" + i).getElementsByClassName("card-top")[0];
        let cardQuantity = document.getElementById("card-" + i).getElementsByClassName("card-quantity")[0];
        let cardBottom = document.getElementById("card-" + i).getElementsByClassName("card-bottom")[0];
        cardTop.addEventListener("click", function() { incrementCardQuantity(cardTop) }, false);
        cardBottom.addEventListener("click", function() { decrementCardQuantity(cardBottom) }, false);
        cardTop.card = card;
        cardTop.quantityEl = cardQuantity;
        cardBottom.card = card;
        cardBottom.quantityEl = cardQuantity;
    }
}

function renderEvilRole(cardInfo, i, isCondensed) {
    const card = CardManager.createCard(cardInfo);
    if (card.custom) {
        renderCustomRoleInModal(card, i);
    }
    fullDeck.push(card);

    document.getElementById("roles").appendChild(CardManager.constructModalRoleElement(card));
    if (isCondensed) {
        document.getElementById("card-select-evil").appendChild(CardManager.constructCompactDeckBuilderElement(card, i));
        let cardLeft = document.getElementById("card-" + i).getElementsByClassName("compact-card-left")[0];
        let cardQuantity = document.getElementById("card-" + i).getElementsByClassName("card-quantity")[0];
        let cardRight = document.getElementById("card-" + i).getElementsByClassName("compact-card-right")[0];
        cardRight.addEventListener("click", function() { incrementCardQuantity(cardRight) }, false);
        cardLeft.addEventListener("click", function() { decrementCardQuantity(cardLeft) }, false);
        cardRight.card = card;
        cardRight.quantityEl = cardQuantity;
        cardLeft.card = card;
        cardLeft.quantityEl = cardQuantity;
    } else {
        document.getElementById("card-select-evil").appendChild(CardManager.constructDeckBuilderElement(card, i));
        // Add event listeners to the top and bottom halves of the card to change the quantity.
        let cardTop = document.getElementById("card-" + i).getElementsByClassName("card-top")[0];
        let cardQuantity = document.getElementById("card-" + i).getElementsByClassName("card-quantity")[0];
        let cardBottom = document.getElementById("card-" + i).getElementsByClassName("card-bottom")[0];
        cardTop.addEventListener("click", function() { incrementCardQuantity(cardTop) }, false);
        cardBottom.addEventListener("click", function() { decrementCardQuantity(cardBottom) }, false);
        cardTop.card = card;
        cardTop.quantityEl = cardQuantity;
        cardBottom.card = card;
        cardBottom.quantityEl = cardQuantity;
    }
}

function addCustomCardToRoles(e) {
    e.preventDefault();
    if (!cards.find((card) => card.role === document.getElementById("custom-role-name").value)) {
        let newCard = {
            role: document.getElementById("custom-role-name").value,
            team: document.getElementById("custom-role-team").value,
            description: document.getElementById("custom-role-desc").value,
            isTypeOfWerewolf: document.getElementById("custom-role-wolf").checked,
            custom: true,
            saved: document.getElementById("custom-role-remember").checked
        };
        cards.push(newCard);
        renderAvailableCards(document.getElementById("role-view-changer-list").classList.contains("selected"));

        if (newCard.saved === true) {
            let existingRoles = localStorage.getItem("play-werewolf-custom-roles");
            if (existingRoles !== null) {
                let rolesArray;
                try {
                    rolesArray = JSON.parse(existingRoles);
                } catch (e) {
                    console.error(e.message);
                }
                if (rolesArray) {
                    rolesArray.push(newCard);
                }
                localStorage.setItem("play-werewolf-custom-roles", JSON.stringify(rolesArray));
            } else {
                localStorage.setItem("play-werewolf-custom-roles", JSON.stringify(new Array(newCard)));
            }
        }
        updateCustomRoleModal();
        closeModal();
        document.getElementById("custom-role-form").reset();
    } else {
        alert("A custom or standard card already exists with that name!")
    }
}

function updateCustomRoleModal() {
    document.getElementById("custom-roles").innerHTML = "";
    for (let i = 0; i < cards.length; i++){
        if (cards[i].custom) {
            renderCustomRoleInModal(cards[i], i);
        }
    }
}

function readInUserCustomRoles() {
    let expectedKeys = ["role", "description", "team", "isTypeOfWerewolf", "custom", "saved"];
    let userCustomRoles = utility.validateCustomRolesJsonObject("play-werewolf-custom-roles", expectedKeys);
    if (userCustomRoles) {
        for (let i = 0; i < userCustomRoles.length; i++) {
            cards.push(userCustomRoles[i]);
        }
    }
}

function renderCustomRoleInModal(card, index) {
    let roleElement = document.createElement("div");
    let editRemoveContainer = document.createElement("div");
    let roleLabel = document.createElement("div");
    let roleName = document.createElement("p");
    let remove = document.createElement("img");
    let edit = document.createElement("img");
    let editForm = buildRoleEditForm(index);

    roleName.innerText = card.role;
    remove.setAttribute("src", "../assets/images/delete.svg");
    remove.setAttribute("title", "Delete");
    remove.addEventListener("click", function() { removeCustomRole(card.role) });

    edit.setAttribute("src", "../assets/images/pencil_green.svg");
    edit.setAttribute("title", "Edit");
    edit.addEventListener("click", function(e) { toggleEditForm(e, index) });
    roleElement.setAttribute("class", "custom-role-edit");

    editRemoveContainer.appendChild(remove);
    editRemoveContainer.appendChild(edit);
    roleLabel.appendChild(roleName);
    roleLabel.appendChild(editRemoveContainer);
    roleElement.appendChild(roleLabel);
    roleElement.appendChild(editForm);

    document.getElementById("custom-roles").appendChild(roleElement);

    document.getElementById("edit-form-" + index).addEventListener("submit", function(e) {
        updateCustomRole(e, index);
    });
}

function toggleEditForm(event, index) {
    event.preventDefault();
    let displayRule = document.getElementById("edit-form-" + index).style.display;
    document.getElementById("edit-form-" + index).style.display = displayRule === "none" ? "block" : "none";

    if (document.getElementById("edit-form-" + index).style.display === "block") {
        populateEditRoleForm(cards[index], index);
    }
}

function toggleViewChanger(isCondensed) {

    if (isCondensed) {
        document.getElementById("role-view-changer-gallery").classList.remove("selected");
        document.getElementById("role-view-changer-list").classList.add("selected");
    } else {
        document.getElementById("role-view-changer-gallery").classList.add("selected");
        document.getElementById("role-view-changer-list").classList.remove("selected");
    }
    renderAvailableCards(isCondensed);
}

function buildRoleEditForm(index) {
    let infoForm = document.createElement("div");
    infoForm.style.display = "none";
    infoForm.setAttribute("id", "edit-form-" + index);
    infoForm.innerHTML =
        "<form class=\"edit-role-form\" id=\"edit-role-form-" + index + "\">" +
            "<label for=\"edit-role-desc-" + index + "\">Description</label>" +
            "<textarea rows=\"3\" id=\"edit-role-desc-" + index + "\" required></textarea>" +
            "<label for=\"edit-role-team-" + index + "\">Team</label>" +
            "<select id=\"edit-role-team-" + index + "\">" +
                "<option value=\"good\">Good</option>" +
                "<option value=\"evil\">Evil</option>" +
            "</select>" +
            "<div class=\"checkbox\">" +
                "<input type=\"checkbox\" id=\"edit-role-wolf-" + index + "\">" +
                "<label for=\"edit-role-wolf-" + index + "\">Werewolf role (counts for parity)</label>" +
            "</div>" +
            "<div class=\"checkbox\">" +
                "<input type=\"checkbox\" id=\"edit-role-remember-" + index + "\">" +
                "<label for=\"edit-role-remember-" + index + "\">Remember this role for later (uses cookies)</label>" +
            "</div>" +
            "<br><br>" +
            "<input type=\"submit\" class=\"app-btn\" value=\"Update\">" +
        "</form>";
    return infoForm;
}

function populateEditRoleForm(card, index) {
    document.getElementById("edit-role-desc-" + index).value = card.description;
    document.getElementById("edit-role-team-" + index).value = card.team;
    document.getElementById("edit-role-wolf-" + index).checked = card.isTypeOfWerewolf;
    document.getElementById("edit-role-remember-" + index).checked = card.saved;
}

function removeCustomRole(name) {
    if (confirm("Delete this role?")) {
        let matchingCards = cards.filter((card) => card.role === name);
        matchingCards.forEach((card) => {
            cards.splice(cards.indexOf(card), 1);
        });
        let expectedKeys = ["role", "description", "team", "isTypeOfWerewolf", "custom", "saved"];
        let userCustomRoles = utility.validateCustomRolesJsonObject("play-werewolf-custom-roles", expectedKeys);
        if (userCustomRoles) {
            userCustomRoles = userCustomRoles.filter((card) => card.role !== name);
            localStorage.setItem("play-werewolf-custom-roles", JSON.stringify(userCustomRoles));
        }
        updateCustomRoleModal();
        renderAvailableCards(document.getElementById("role-view-changer-list").classList.contains("selected"));
    }
}

function updateCustomRole(event, index) {
    event.preventDefault();
    if (index >= 0 && index < cards.length) {
        let cardToUpdate = cards[index];
        cardToUpdate.team = document.getElementById("edit-role-team-" + index).value;
        cardToUpdate.description = document.getElementById("edit-role-desc-" + index).value;
        cardToUpdate.isTypeOfWerewolf = document.getElementById("edit-role-wolf-" + index).checked;
        cardToUpdate.saved = document.getElementById("edit-role-remember-" + index).checked;

        removeOrAddSavedRoleIfNeeded(cardToUpdate);
        toggleEditForm(event, index);
        renderAvailableCards(document.getElementById("role-view-changer-list").classList.contains("selected"));
    }
}

function removeOrAddSavedRoleIfNeeded(card) {
    let expectedKeys = ["role", "description", "team", "isTypeOfWerewolf", "custom", "saved"];
    let userCustomRoles = utility.validateCustomRolesJsonObject("play-werewolf-custom-roles", expectedKeys);
    if (userCustomRoles) {
        if (card.saved) {
            let roleToUpdate = userCustomRoles.find((savedCard) => savedCard.role === card.role);
            if (roleToUpdate) {
                userCustomRoles[userCustomRoles.indexOf(roleToUpdate)] = card;
            } else {
                userCustomRoles.push(card);
            }
            localStorage.setItem("play-werewolf-custom-roles", JSON.stringify(userCustomRoles));
        } else {
            let roleToRemove = userCustomRoles.find((savedCard) => savedCard.role === card.role);
            if (roleToRemove) {
                userCustomRoles.splice(userCustomRoles.indexOf(roleToRemove), 1);
                localStorage.setItem("play-werewolf-custom-roles", JSON.stringify(userCustomRoles));
            }
        }
    }
}


function incrementCardQuantity(e) {
    if(e.card.quantity < 25) {
        e.card.quantity += 1;
    }
    e.quantityEl.innerHTML = e.card.quantity;
    updateGameSize();
}

function decrementCardQuantity(e) {
    if(e.card.quantity > 0) {
        e.card.quantity -= 1;
    }
    e.quantityEl.innerHTML = e.card.quantity;
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

function displayModal(modalId, teamForCustomRole) {
    if (teamForCustomRole === "Good") {
        document.getElementById("option-evil").removeAttribute("selected");
        document.getElementById("option-good").setAttribute("selected", "selected");
    }
    if (teamForCustomRole === "Evil") {
        document.getElementById("option-good").removeAttribute("selected");
        document.getElementById("option-evil").setAttribute("selected", "selected");
    }
    document.getElementById(modalId).classList.remove("hidden");
    document.getElementById("app-content").classList.add("hidden");
}

function closeModal() {
    document.getElementById("role-modal").classList.add("hidden");
    document.getElementById("custom-card-modal").classList.add("hidden");
    document.getElementById("edit-custom-roles-modal").classList.add("hidden");
    document.getElementById("app-content").classList.remove("hidden");
}

function buildDeckFromQuantities() {
    let playerDeck = [];
    for (const card of fullDeck) {
        for (let i = 0; i < card.quantity; i++) {
            card.id = utility.generateID();
            playerDeck.push(card);
        }
    }
    return playerDeck;
}

function createGame() {
    if (document.getElementById("name").value.length > 0 && atLeastOnePlayer) {
        const urlParams = new URLSearchParams(window.location.search);
        const revealParam = urlParams.get('reveals');

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
        let gameDeck = buildDeckFromQuantities();
        const game = new Game(
            code,
            revealParam === "true",
            gameSize,
            gameDeck,
            Math.ceil(document.getElementById("time").value),
            gameDeck.find((card) => card.role === "Dream Wolf") !== undefined
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
        } else {
            document.getElementById("game-size").classList.remove("error");
        }
        document.getElementById("name").classList.add("error");
        document.getElementById("name-error").innerText = "Name is required.";
    }
}
