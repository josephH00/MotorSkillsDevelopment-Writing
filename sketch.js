let db = null;
let userData;
let UIElements = [];
let gameState = null;

/* == */
const gameStates = {
  DATAINIT: 'datainit',
  STARTUPUI: 'startupui',
  GAME_DYNUSERUPDATE: 'dynuserupdate', //Dynamic UI user update (aka main game content)
  GAME_UPDATEUSERSCORE: 'updateuserscore',
  GAME_GETNEWTASK: 'getnewtask' //Loads the next task / thing to draw
}

/* == */
const dynamicUIAnimationState = {
  RUNNING: 'running', //During normal animation loop
  STOPPED: 'stopped',
  STARTUP: 'startup' //For when the animation / game is just loaded
}
class DynamicUI {
  constructor(x, y, w, h, runCallback, startupCallback) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;

    this.runCallback = runCallback;
    this.startupCallback = startupCallback;

    this.state = dynamicUIAnimationState.STARTUP; //Default state of the UI element
  }
  
  tick(delta) {
    switch(this.state) {

      case dynamicUIAnimationState.STOPPED: //End if the UI animation has stopped
        return;

      case dynamicUIAnimationState.RUNNING:
        push(); //Create unique drawing state/preference (so the stuff in the callback won't leak out)
        this.runCallback(delta);
        pop();
        break;
      
      case dynamicUIAnimationState.STARTUP:
        push(); //Create unique drawing state/preference (so the stuff in the callback won't leak out)
        this.startupCallback(delta);
        pop();
        this.state = dynamicUIAnimationState.RUNNING;
        break;
    }
  }
}


function preload() {
  db = loadJSON("pointsDataset.json", () => {}, () => {
    console.log("Couldn't load dataset using JSON file\nFalling back to web host");
    this._decrementPreload(); //Undocumented function so nonblocking methods in preload() don't hang the whole program 
  }); //TODO: Replace final version with JSON string and parse() it

  userData = getItem('drawingUserProgress'); //Load Key:value pair from the persistent local storage (As stringified JSON)
  if(userData != null && typeof(userData) !== "undefined") {
    userData = JSON.parse(userData); //Convert existing value to JSON Object
  } else {
    console.log("Creating new user profile");
    storeItem( "drawingUserProgress", JSON.stringify({ progress: 0, accuracy: 0, completed: 0}) ); //TODO: Figure out implementation
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  //Top header
  UIElements.push( new DynamicUI(0,0, windowWidth+1, windowHeight/12, function(d) {
      fill(color(238, 238, 238));
      rect(this.x, this.y, this.width, this.height);
    }, function(d) {} 
  ) );
}

function draw() {
  background(220);
  for(let i = 0; i < UIElements.length; i++) {
    UIElements[i].tick();
  }
}