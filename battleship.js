/**
 * Name: Elena
 * Last Name: Chekredji
 * Student Number: 501133464
 */
document.addEventListener('DOMContentLoaded', function() {
    const canvas1 = document.getElementById('battleshipCanvasUser');
    const ctx1 = canvas1.getContext('2d');
    const canvas2 = document.getElementById('battleshipCanvasPC');
    const ctx2 = canvas2.getContext('2d');
    const gridSize = 10;
    const cellSize = canvas1.width / gridSize;

    // Initialize ships for PC and User
    let shipsPC = [];
    let shipsUser = [];

    // Game state variables
    let originalX, originalY;
    let isGameRunning = false; // Whether the game is currently being played
    let countUserHits = 0;
    let countUserMisses = 0;
    let countPCHits = 0;
    let countPCMisses = 0;
    let isPlayerTurn = true;
    let gameJustEnded = false;

    // Drag and Drop variables
    let selectedShip = null;
    let offsetX, offsetY;

    // Arrays representing the user's and PC's grid + ship locations
    const arraySize = 10; // Define the size of the array
    let userGrid = Array.from({ length: arraySize }, () => Array(arraySize).fill(0));
    let pcGrid = Array.from({ length: arraySize }, () => Array(arraySize).fill(0));
    let hitsToPC = Array.from({ length: arraySize }, () => Array(arraySize).fill(0));
    let hitsToUser = Array.from({ length: arraySize }, () => Array(arraySize).fill(0));

    const startGameButton = document.getElementById('startGame');
    const resetGameButton = document.getElementById('resetGame');

    /**
     * Adds an event listener to the 'Start Game' button.
     * When clicked, it sets the game state to running and initiates the start of the game.
     */
    startGameButton.addEventListener('click', function() {
        isGameRunning = true;
        startGame();
    });

    /**
     * Adds an event listener to the 'Reset Game' button.
     * When clicked, it resets the game state and reloads the current page to start anew.
     */    
    resetGameButton.addEventListener('click', function() {
        isGameRunning = false;
        location.reload(true); // Reloads the current page
        startGame();
    });

    /**
     * Adds a general mouse down event listener to the entire document.
     * This listener helps the user along with helpful messages if they are 
     * clicking in the wrong place.
     */
    document.addEventListener('mousedown', function(event) {
        // Check if the game has not started yet
        if (!isGameRunning) {
            // Obtain the bounding rectangle of the user's canvas
            const rect = canvas1.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            // Validate the mouse click is outside the bounds of the user's canvas and not on the start or reset buttons
            if (!(mouseX >= 0 && mouseX <= rect.width && mouseY >= 0 && mouseY <= rect.height) &&
                !(startGameButton.contains(event.target)) && !(resetGameButton.contains(event.target))) {
                showMessage("Move the ships on the users board, or click Play to start!");
            }
        } else {
            // Game is running; focus is on attacking the PC's board
            // Obtain the bounding rectangle of the PC's canvas
            const rect = canvas2.getBoundingClientRect();
            // Calculate mouse position relative to the PC's canvas
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            // Validate the mouse click is outside the bounds of the PC's canvas
            if (!(mouseX >= 0 && mouseX <= rect.width && mouseY >= 0 && mouseY <= rect.height)) {
                // Provide feedback to attack the PC's board if click is outside the PC's board
                showMessage("Click on PC board to attack!");
            }
        }
        if (!(resetGameButton.contains(event.target)) && gameJustEnded) {
            showMessage("Game has ended. Click Reset to play again!");
        }
    });

    /**
     * Event listener for mouse down on the user's canvas. 
     * This function is responsible for initiating the drag-and-drop process for ship placement before the game starts.
     */
    canvas1.addEventListener('mousedown', function(event) {
        // Only allow ship selection and movement if the game has not started
        if (!isGameRunning && !gameJustEnded) {
            // Get the bounding rectangle of the user's canvas to calculate mouse position
            const rect = canvas1.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            // Check if the mouse click is within the bounds of the canvas
            if (mouseX >= 0 && mouseX <= rect.width && mouseY >= 0 && mouseY <= rect.height) {
                selectedShip = shipsUser.find(ship => {
                    for (let i = 0; i < ship.size; i++) {
                        const shipX = ship.isHorizontal ? ship.x + i : ship.x;
                        const shipY = ship.isHorizontal ? ship.y : ship.y + i;
                        // Check if the mouse click is within the bounds of a ship
                        if (mouseX >= shipX * cellSize && mouseX < (shipX + 1) * cellSize && mouseY >= shipY * cellSize && mouseY < (shipY + 1) * cellSize) {
                            offsetX = mouseX - shipX * cellSize;
                            offsetY = mouseY - shipY * cellSize;
                            return true; // Ship found
                        }
                    }
                    return false; // No ship found at mouse click
                });
                // If a ship has been selected, prepare it for dragging
                if (selectedShip) {
                    isDragging = true;
                    originalX = selectedShip.x;
                    originalY = selectedShip.y;
                    
                    clearShipFromGrid(selectedShip);
                    drawBoardUser();
                }
            } else {
                // If the click is outside the canvas bounds, inform the user to click within the board
                showMessage("Please click on the user board to move your ships.");
            }
        }
    });

    /**
     * Clears the specified ship's position from the user grid.
     * 
     * This function is used when a ship is being moved, and its current position needs to be cleared
     * to allow for its repositioning without leaving behind a "ghost" image of its previous location.
     * 
     * @param {Object} ship - The ship object that needs to be cleared from the grid. The ship object
     *                        contains properties such as its size, orientation (horizontal or vertical),
     *                        and its starting grid coordinates (x, y).
     */
    function clearShipFromGrid(ship) {
        // Iterate over each segment of the ship based on its size
        for (let i = 0; i < ship.size; i++) {
            // Calculate the grid coordinates for this segment of the ship
            const x = ship.isHorizontal ? ship.x + i : ship.x;
            const y = ship.isHorizontal ? ship.y : ship.y + i;
            // Set the grid cell at these coordinates to 0, indicating it is now empty
            userGrid[y][x] = 0; 
        }
    }

    /**
     * Event listener for mousemove over canvas1.
     * This function updates the position of a selected ship as it is being dragged across the grid.
     * It ensures that the ship's new position snaps to the grid and is valid before redrawing the ship.
     */
    canvas1.addEventListener('mousemove', function(event) {
        // Only proceed if the game is not running and a ship is currently selected
        if (!isGameRunning && selectedShip) {
            // Calculate mouse position relative to the canvas
            const rect = canvas1.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            // Calculate the ship's new position on the grid
            const newGridX = Math.floor((mouseX - offsetX) / cellSize);
            const newGridY = Math.floor((mouseY - offsetY) / cellSize);
            

            if (isValidPosition(newGridX, newGridY, selectedShip.isHorizontal, selectedShip.size, userGrid, gridSize)) {
                selectedShip.x = newGridX;
                selectedShip.y = newGridY;
                drawBoardUser(); 
            }
        }
    });

    /**
     * Additional event listener for mousemove over canvas1.
     * Redraws the board to show the ship in its "lifted" state as it is being dragged,
     * but only if a ship is selected, being dragged, and the game is not running.
     */
    canvas1.addEventListener('mousemove', function() {
        if (selectedShip && isDragging && !isGameRunning) {
            // Redraw the board with the ship in its "lifted" state
            drawBoardUser(); 
        }
    });

    /**
     * Event listener for the 'mouseup' action on canvas1.
     * It places the selected ship at its new position if the position is valid.
     * If the position is not valid, it reverts the ship to its original position.
     * This event listener only activates if a ship is currently selected and the game has not started.
     */
    canvas1.addEventListener('mouseup', function() {
        if (selectedShip && !isGameRunning) {
            // Check if the new position is valid for the selected ship
            const isValid = isValidPosition(selectedShip.x, selectedShip.y, selectedShip.isHorizontal, selectedShip.size, userGrid, gridSize);
            if (isValid) {
                // Update the grid with the new position of the ship
                updateUserGrid();
            } else {
                // Revert to the original position if the new position is not valid
                selectedShip.x = originalX;
                selectedShip.y = originalY;
                updateUserGrid();
            }
            // Clear the selection and redraw the board with the ship placed
            selectedShip = null;
            drawBoardUser();
        }
    });

    /**
     * Validates if the new position for a ship is within the grid and not overlapping with other ships.
     * 
     * @param {number} newX - The new x-coordinate for the ship's position.
     * @param {number} newY - The new y-coordinate for the ship's position.
     * @param {boolean} isHorizontal - Whether the ship is placed horizontally.
     * @param {number} shipSize - The size of the ship.
     * @param {Array} userGrid - The grid representing user's ship placements.
     * @param {number} gridSize - The size of the grid.
     * @return {boolean} True if the new position is valid, false otherwise.
     */
    function isValidPosition(newX, newY, isHorizontal, shipSize, userGrid, gridSize) {
        // Ensure the ship does not go out of bounds
        if (newX < 0 || newY < 0) return false;
        // Check if the ship goes out of bounds depending on its orientation
        if (isHorizontal && (newX + shipSize > gridSize)) return false;
        if (!isHorizontal && (newY + shipSize > gridSize)) return false;
        
        // Ensure the ship does not overlap with other ships
        for (let i = 0; i < shipSize; i++) {
            const checkX = isHorizontal ? newX + i : newX;
            const checkY = isHorizontal ? newY : newY + i;
            if (checkX < 0 || checkX >= gridSize || checkY < 0 || checkY >= gridSize || userGrid[checkY][checkX] === 1) return false;
        }

        return true; // The position is valid and the ship can be placed
    }

    /**
     * Draws the user's board with ships and grid.
     * Highlights the selected ship if it is being dragged.
     */
    function drawBoardUser() {
        ctx1.clearRect(0, 0, canvas1.width, canvas1.height);
        ctx1.strokeStyle = '#d3d3d3';
        ctx1.lineWidth = 1;

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                ctx1.strokeRect(i * cellSize, j * cellSize, cellSize, cellSize);
            }
        }

        // Draw ships
        shipsUser.forEach(ship => {
            // Highlight the ship being dragged
            ctx1.fillStyle = ship === selectedShip && isDragging ? 'rgba(0, 0, 0, 0.5)' : 'black';
            for (let i = 0; i < ship.size; i++) {
                let x = ship.x + (ship.isHorizontal ? i : 0);
                let y = ship.y + (ship.isHorizontal ? 0 : i);
                ctx1.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }

            // Draw a border around the ship for better visibility
            ctx1.strokeStyle = 'grey';
            ctx1.lineWidth = 1;
            let borderX = ship.x * cellSize - ctx1.lineWidth / 2;
            let borderY = ship.y * cellSize - ctx1.lineWidth / 2;
            let borderWidth = ship.isHorizontal ? ship.size * cellSize + ctx1.lineWidth : cellSize + ctx1.lineWidth;
            let borderHeight = ship.isHorizontal ? cellSize + ctx1.lineWidth : ship.size * cellSize + ctx1.lineWidth;
            ctx1.strokeRect(borderX, borderY, borderWidth, borderHeight);
        });
    }

    /**
     * Draws the PC's (opponent's) board.
     * The grid is identical to the user's board but without ships shown.
     */
    function drawBoardPC() {
        ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
        ctx2.strokeStyle = '#d3d3d3';
        ctx2.lineWidth = 1;
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                ctx2.strokeRect(i * cellSize, j * cellSize, cellSize, cellSize);
            }
        }
    }

    /**
     * Handles clicks on the PC's board to simulate attacks.
     * Checks if the game is running and if it's the player's turn.
     * Validates the click location and updates the game state accordingly.
     */
    function handleCanvasClickUser(event) {
        // Early return if not player's turn or game not running
        if (!isPlayerTurn || !isGameRunning) return;

        // Calculate click position
        const rect = canvas2.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const gridX = Math.floor(x / cellSize);
        const gridY = Math.floor(y / cellSize);

        // Prevent action on previously targeted locations
        if (hitsToPC[gridY][gridX] !== 0) {
            showMessage("This location has already been targeted!");
            return;
        }

        // Check for ship hits
        const shipHit = shipsPC.some(ship => {
            for (let i = 0; i < ship.size; i++) {
                const shipX = ship.isHorizontal ? ship.x + i : ship.x;
                const shipY = ship.isHorizontal ? ship.y : ship.y + i;
                if (gridX === shipX && gridY === shipY) {
                    return true;
                }
            }
            return false;
        });

        // Update game state based on hit or miss
        if (shipHit) {
            hitsToPC[gridY][gridX] = -1;
            ctx2.fillStyle = 'red';
            ctx2.fillRect(gridX * cellSize, gridY * cellSize, cellSize, cellSize);
            checkFullShipSunk(shipsPC, hitsToPC, ctx2);
            countUserHits++;
            updateDisplay();
        } else {
            hitsToPC[gridY][gridX] = -2;
            ctx2.fillStyle = 'lightblue';
            ctx2.fillRect(gridX * cellSize, gridY * cellSize, cellSize, cellSize);
            countUserMisses++;
            updateDisplay();
        }
        
        if (!checkGameState() && hitsToPC[gridY][gridX] !== -1) {
            isPlayerTurn = false;
            setTimeout(pcMove, 700);
        }
    }       
    
    /**
     * Checks if a full ship has been sunk and updates the canvas accordingly.
     * @param {Array} ships - The array of ships to check.
     * @param {Array} hits - The array tracking hits on ships.
     * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
     */
    function checkFullShipSunk(ships, hits,ctx) {
        let sunkShips = [];
        ships.forEach(ship => {
            let eachShipSunk = true;
            for (let i = 0; i < ship.size; i++) {
                const shipX = ship.isHorizontal ? ship.x + i : ship.x;
                const shipY = ship.isHorizontal ? ship.y : ship.y + i;
                if (hits[shipY][shipX] !== -1) {
                    eachShipSunk = false;
                    break;
                }
            }
            if (eachShipSunk) {
                sunkShips.push(ship);
            } 
        });

        sunkShips.forEach(ship => {
            for(let i=0; i<ship.size; i++){
             if(ship.isHorizontal){
                 ctx.fillStyle = 'purple';
                 ctx.fillRect((ship.x + i) * cellSize, ship.y * cellSize, cellSize, cellSize);
             }
             else {
                 ctx.fillStyle = 'purple';
                 ctx.fillRect(ship.x * cellSize, (ship.y + i) * cellSize, cellSize, cellSize);
             }
            }
         });
        
    }

    /**
     * Simulates the PC's move by selecting a random valid target and updating the game state.
     */
    function pcMove() {
        // Prevent PC's move if the game has ended
        if (!isGameRunning) {
            return; 
        }
    
        // Simple logic for PC's turn: choose a random, valid move
        let x, y, validMove;
        do {
            x = Math.floor(Math.random() * 10);
            y = Math.floor(Math.random() * 10);
            validMove = isValidMove(x, y);
        } while (!validMove);
    
        const gridX = x;
        const gridY = y;
        //console.log('PC move:', gridX, gridY);

        const shipHit = shipsUser.some(ship => {
            for (let i = 0; i < ship.size; i++) {
                const shipX = ship.isHorizontal ? ship.x + i : ship.x;
                const shipY = ship.isHorizontal ? ship.y : ship.y + i;
                if (gridX === shipX && gridY === shipY) {
                    return true;
                }
            }
            return false;
        });

        if (hitsToUser[gridY][gridX] === 0) {
            if (shipHit) {
                hitsToUser[gridY][gridX] = -1; 
                ctx1.fillStyle = 'red';
                ctx1.fillRect(gridX * cellSize, gridY * cellSize, cellSize, cellSize);
                checkFullShipSunk(shipsUser, hitsToUser, ctx1); 
                countPCHits++;
                updateDisplay();
            } else {
                hitsToUser[gridY][gridX] = -2;
                ctx1.fillStyle = 'lightblue';
                ctx1.fillRect(gridX * cellSize, gridY * cellSize, cellSize, cellSize);
                countPCMisses++;
                updateDisplay();    
            }
        }    
        // Check for end of game or switch turns
        if (checkGameState()) {
            endGame();
            return;
        }
    
        // Switch back to the player's turn
        if(hitsToUser[gridY][gridX] !== -1) {
            isPlayerTurn = true;
        }
        else {
            setTimeout(pcMove, 1000)
        }
        
    }

    /**
     * Checks if a move is valid based on the player's turn and the target cell's status.
     * For the player's turn, it checks the PC's grid; for the PC's turn, it checks the user's grid.
     * @param {number} x - The x coordinate of the target cell.
     * @param {number} y - The y coordinate of the target cell.
     * @returns {boolean} True if the cell has not been targeted yet, false otherwise.
     */
    function isValidMove(x, y) {
        if(isPlayerTurn){
            return hitsToPC[y][x] === 0;
        }
        else {
            return hitsToUser[y][x] === 0;
        }
    }
    
    /**
     * Checks if the game has reached a win/lose condition.
     * If either player or the PC reaches 14 hits, the game ends, signaling a win or loss.
     * Alerts the user with "Game Over" and stops the game.
     * @returns {boolean} True if the game should end, false if it should continue.
     */
    function checkGameState() {
        if (countUserHits === 14) {
            alert("Game Over: Player 1 Wins!");
            isGameRunning = false; 
            gameJustEnded = true;
            return true; 
        } else if (countPCHits === 14) {
            alert("Game Over: Player 2 Wins!");
            isGameRunning = false; 
            gameJustEnded = true;
            return true; 
        }
        return false; 
    }
    
    /**
     * Initializes the game by generating random positions for both the user's and the PC's ships.
     * Sets the ships on the board and prepares the game for starting.
     */
    function initGame() {
        // Sizes of the ships
        const shipsSizes = [2, 4, 3, 3, 2]; 
        shipsPC = shipsSizes.map(shipSize => {
            let position = generateRandomShipPosition(gridSize, shipSize, pcGrid);
            return {...position, size: shipSize}; 
        });
        //console.log(shipsPC);
        shipsUser = shipsSizes.map(shipSize => {
            let position = generateRandomShipPosition(gridSize, shipSize, userGrid);
            return {...position, size: shipSize}; 
        });
        //console.log(shipsUser);
        

        drawBoardUser();
        drawBoardPC();

    }

    initGame();

    /**
     * Starts the game by setting the game state to running and disabling the start button.
     * Listens for user's actions (clicks) on the PC's board to make moves.
     */
    function startGame() {
        isGameRunning = true;
        isPlayerTurn = true;
        startGameButton.disabled = true; 
        canvas2.addEventListener('click', handleCanvasClickUser);
    }

    /**
     * Generates a random position for a ship on the user's grid.
     * @param {number} gridSize - The size of the grid.
     * @param {number} shipSize - The size of the ship.
     * @returns An object containing the ship's starting x and y coordinates and its orientation.
     */
    function generateRandomShipPosition(gridSize, shipSize, grid) {
        let isHorizontal = Math.random() > 0.5;
        let positionOccupied;
        let x, y;

        do {
            isHorizontal = Math.random() > 0.5;
            if (isHorizontal) {
                x = Math.floor(Math.random() * (gridSize - shipSize));
                y = Math.floor(Math.random() * gridSize);
            } else {
                x = Math.floor(Math.random() * gridSize);
                y = Math.floor(Math.random() * (gridSize - shipSize));
            }
            // Check if the randomly chosen position is already occupied by another ship
            positionOccupied = isPositionOccupied(x, y, isHorizontal, shipSize, grid);
        } while (positionOccupied); 
        // Place the ship on the grid
        for (let i = 0; i < shipSize; i++) {
            if (isHorizontal) {
                grid[y][x + i] = 1;
            } else {
                grid[y + i][x] = 1;
            }
        }
      
        return { x, y, isHorizontal };
      }
    
    /**
     * Checks if a given position on a grid is already occupied by a ship.
     * @param {number} x - The x-coordinate of the position to check.
     * @param {number} y - The y-coordinate of the position to check.
     * @param {boolean} isHorizontal - Whether the ship is placed horizontally.
     * @param {number} shipSize - The size of the ship.
     * @param {Array<Array<number>>} grid - The grid to check for occupied positions.
     * @returns {boolean} - True if the position is occupied, false otherwise.
     */
      function isPositionOccupied(x, y, isHorizontal, shipSize, grid) {
        for (let i = 0; i < shipSize; i++) {
            if (isHorizontal) {
                if (grid[y][x + i] === 1) return true;
            } else {
                if (grid[y + i][x] === 1) return true;
            }
        }
        return false;
    }

    /**
     * Updates the display to show the current counts of hits and misses for both the user and the PC.
     */
    function updateDisplay() {
        document.getElementById('userHits').textContent = countUserHits;
        document.getElementById('userMisses').textContent = countUserMisses;
        document.getElementById('pcHits').textContent = countPCHits;
        document.getElementById('pcMisses').textContent = countPCMisses;
    }

    /**
     * Clears and updates the user grid based on the current positions of all ships.
     */
    function updateUserGrid() {
        userGrid = userGrid.map(row => row.fill(0));
        shipsUser.forEach(ship => {
            for (let i = 0; i < ship.size; i++) {
                const posX = ship.isHorizontal ? ship.x + i : ship.x;
                const posY = ship.isHorizontal ? ship.y : ship.y + i;
                userGrid[posY][posX] = 1;
            }
        });
    }

    /**
     * Displays a temporary message to the user.
     * @param {string} message - The message to display.
     */
    function showMessage(message) {
        const messageDisplay = document.getElementById('message-display');
        messageDisplay.textContent = message;
        messageDisplay.style.display = 'block';
        setTimeout(() => {
            messageDisplay.style.display = 'none';
        }, 3000);
    }
});


