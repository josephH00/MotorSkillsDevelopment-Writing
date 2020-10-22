let db = null;
let userData;
let UIElements = [];

const defaultSaveStructure = { progress: 0, accuracy: 0, completed: 0}; //The save structure that will be created for a new player

/* == */
const gameStates = {
  DATAINIT: 'datainit',
  STARTUPUI: 'startupui',
  GAME_DYNUSERUPDATE: 'dynuserupdate', //Dynamic UI user update (aka main game content)
  GAME_UPDATEUSERSCORE: 'updateuserscore',
  GAME_GETNEWTASK: 'getnewtask' //Loads the next task / thing to draw
}
let gameState = gameStates.DATAINIT;

/* == */
const dynamicUIAnimationState = {
  RUNNING: 'running', //During normal animation loop
  STOPPED: 'stopped',
  STARTUP: 'startup' //For when the animation / game is just loaded
}
class DynamicUI {
  constructor(x, y, runCallback, startupCallback, configJSON) {
    this.x = x;
    this.y = y;

    this.config = configJSON;

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
    userData = defaultSaveStructure;
    storeItem( "drawingUserProgress", JSON.stringify(userData) ); //TODO: Figure out implementation
  }
}

function setup() {
  gameState = gameStates.STARTUPUI; //preload() is called under the DATAINIT state & will automatically transition to the setup() when synchronously finished

  createCanvas(windowWidth, windowHeight);

  //Top header
  UIElements.push( new DynamicUI(0,0, function(d) {
      fill(color(238, 238, 238));
      rect(this.x, this.y, this.config.width, this.config.height);
    }, function(d) {},
    {
      width: windowWidth + 1,
      height: windowHeight / 12
    }
  ) );

  //Progress indicator
  UIElements.push( new DynamicUI(0, 0, function() {
      textSize(this.config.uiTextSize);
      
      this.x = windowWidth - textWidth("Accuracy: XX%  "); //Adjust x at runtime based on size

      let buffer = { x: textWidth(" "), y: textAscent() * 3/4 } //Create buffer btw. box & text
      let sizeBox = { w: windowWidth - this.x - buffer.x, h: textAscent() + buffer.y }

      fill(color(247, 247, 247));
      rect(this.x - buffer.x, this.y, sizeBox.w, sizeBox.h); //Set space for rect

      fill(color(51, 51, 51));
      text("Accuracy: " + userData.accuracy.toString() + "% ", this.x, this.y+textAscent() + buffer.y/2);
    }, function() {},
    {
      uiTextSize: 14,
    }
  ) );

  gameState = gameStates.GAME_DYNUSERUPDATE;
}

function draw() {
  background(220);
  for(let i = 0; i < UIElements.length; i++) {
    UIElements[i].tick();
  }

  switch(gameState) { //Handle states
    default:
      break;
  }
}