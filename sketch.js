let db = null;
let userData;
let UIElements = [];

const defaultSaveStructure = { completed: 0, accuracy: 0, attempts: [] }; //The save structure that will be created for a new player: completed exercises, overall accuracy, attempt: attempt of specific letters / combo (based on coding in pointsDataset) & accuracy of that attempt & image of canvas
/*
  exercise:
    exercise type (as defined in pointsDataset)               userData.attempts[i].type
    exercise specific accuracy                                userData.attempts[i].accuracy
    overall exercise accuracy                                 userData.attempts[i].overallAccuracy
    preview image (base64 encoded png [png from saveFrame])   userData.attempts[i].preview,
*/

/* == */
const textScaling = {
  initWH: 2267, //The initial width + height of the screen size (1920 x 1080 running Google Chrome with default settings + Bookmark bar)
  fontScalingFactor: 1.25, //Scale by 1.25x per window increase from the base size
  scale: function(ogSize) { //Scaling function will increase the text size by a scaling factor as the screen size increases from 1920x1080 and decreases as it gets smaller
    return ogSize + ogSize * ((windowWidth + windowHeight) / this.initWH - 1) * this.fontScalingFactor;
  }
}

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

function windowResized() {
  location.reload(); //Refresh the page when resized so scaling isn't messed up. TODO: Implement a better scaling / property retrieval system to dynamically account for changes in the window and update UI
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
  frameRate(60);

  //Top header
  UIElements.push( new DynamicUI(0,0, function(d) {
      fill(color(238, 238, 238));
      rect(this.x, this.y, this.config.width, this.config.height);
    }, function(d) {},
    {
      width: windowWidth + 1,
      height: windowHeight / 8
    }
  ) );

  //Accuracy indicator
  UIElements.push( new DynamicUI(0, 0, function() {
      textSize(this.config.uiTextSize);
      
      this.x = windowWidth - textWidth("Accuracy: XX%  "); //Adjust x at runtime based on size of the text

      let buffer = { x: textWidth(" "), y: textAscent() * 3/4 } //Create buffer between box & text
      let sizeBox = { w: windowWidth - this.x - buffer.x, h: textAscent() + buffer.y }

      fill(color(247, 247, 247));
      rect(this.x - buffer.x, this.y, sizeBox.w, sizeBox.h); //Set space for rect

      fill(color(51, 51, 51));
      text("Accuracy: " + userData.accuracy.toString() + "% ", this.x, this.y + textAscent() + buffer.y/2);
    }, function() {},
    {
      uiTextSize: 14,
    }
  ) );


  saveFrames("", "png", 0.1, 60, function(data) { /* ******** TEMP: IMPROMPTU UNTIL SAVING SYSTEM IS IMPLEMENTED ******** */
    for(let i = 0; i < 6; i++)
      userData.attempts.push({ type: String.fromCharCode(97 + i), accuracy:Math.random(), overallAccuracy: Math.random(), preview: data[0].imageData }); /* TEMP: INSERT SIMULATED DATA */

  //Load previous attempts from userData if available
  for(let i = userData.attempts.length - 1; i > userData.attempts.length - 6 - 1; i--) { //Show the last 6 cards (attempts) that were pushed to the storage

    UIElements.push( new DynamicUI(0, 0, function() {
        /* Draw Card outline */
        fill(color(251, 251, 251));
        rect(this.x + this.config.XYSpacer.x, this.y + this.config.XYSpacer.y, this.config.width + 1, this.config.height + 1);

        line(this.x + this.config.XYSpacer.x + this.config.width * 0.70, this.y + this.config.XYSpacer.y,
          this.x + this.config.XYSpacer.x + this.config.width * 0.70, this.y + this.config.XYSpacer.y + this.config.height); //Create vertical divider at 70% of the width of the card
        
        for(let j = 1; j < 3; j++)
          line(this.x + this.config.XYSpacer.x + this.config.width * 0.70, this.y + this.config.XYSpacer.y + this.config.height * j/3,
            this.x + this.config.XYSpacer.x + this.config.width, this.y + this.config.XYSpacer.y + this.config.height * j/3); //Create three horizontal dividers on the right side of the card
          
        /* Draw status boxes on the right */
        textSize(textScaling.scale(this.config.uiTextSize));
        fill(color(51, 51, 51));

        //Iterating an array and setting configuration options for the status boxes like this reduces the amount of long and repetitive code that would have happened without it, 
        //  {label:Upper section label, data: Lower section data, colorText: To color the data's text based on defined pass/fail cutoff, formatPercent: Makes decimal percents look 'pretty'}
        let statusBoxesTextInfo = [ 
          {label: "This Attempt", data: this.config.thisAttemptAccuracy,      colorText: true,  formatPercent: true}, //Top status box
          {label: "Overall",      data: this.config.overallExerciseAccuracy,  colorText: true,  formatPercent: true}, //Middle status box
          {label: "Type",         data: this.config.thisAttemptExerciseType,  colorText: false, formatPercent: false} //Bottom status box
        ];

        for(let j = 0; j < statusBoxesTextInfo.length; j++) {
          let statusBoxLabel = statusBoxesTextInfo[j].label; //Render the status box label
          text(statusBoxLabel, 
            this.x + this.config.XYSpacer.x + this.config.width * 0.70 + this.config.width * (1 - 0.70)/2 - textWidth(statusBoxLabel)/2,
            this.y + this.config.XYSpacer.y + this.config.height * j/3 + textAscent()
          ); //Places it at + j/3 * height to adjust to the bound of the n-th status box

          let statusBoxData = statusBoxesTextInfo[j].data; //Render the status box data
          if(statusBoxesTextInfo[j].colorText == true) //Only color the data section of the status box if specified (used for showing pass/fail on the accuracy %'s)
            fill(  ( (statusBoxData >= this.config.accuracyPassFailPercentCutoff) ? color(63, 146, 9) : color(196, 22, 27) )  ) //If the accuracy is at the specified cutoff or better mark it green, else mark it red
          if(statusBoxesTextInfo[j].formatPercent == true) //Format percent
            statusBoxData = parseFloat(100 * statusBoxData).toFixed(0) + "%"; //'Pretty prints' the accuracy percentage, formatted as XX% instead of 0.XX
          text(statusBoxData,
            this.x + this.config.XYSpacer.x + this.config.width * 0.70 + this.config.width * (1 - 0.70)/2 - textWidth(statusBoxData)/2,
            this.y + this.config.XYSpacer.y + this.config.height * j/3 + 2.75 * textAscent()); //Places the text below the attempt accuracy label with some extra room at the bottom
          fill(color(51, 51, 51)); //Reset colors
        }
        
        //Render image preview
        if(this.config.cardImage != null) { //Only render when available
          fill(color(0, 0, 0));
          rect( //Outline the preview
            this.x + this.config.XYSpacer.x + (this.config.width * 0.70 /2 - this.config.cardImage.width/2) - 1,
            this.y + this.config.XYSpacer.y + (this.config.height/2 - this.config.cardImage.height/2) - 1,
            this.config.cardImage.width + 1,
            this.config.cardImage.height + 1
          );
          image(this.config.cardImage, 
            this.x + this.config.XYSpacer.x + (this.config.width * 0.70 /2 - this.config.cardImage.width/2),    //Center preview in the left side of card
            this.y + this.config.XYSpacer.y + (this.config.height/2 - this.config.cardImage.height/2)   //Center preview in middle y-axis of the card
          );
        }
      }, function() {
        this.x = this.x + (this.config.width + this.config.XYSpacer.x) * this.config.cardNumber
        loadImage( this.config.thisAttemptPreviewImage, img => { //Load image for this attempt from the userData
          img.resize(0, this.config.height * 0.80); //Scale the image to the 80% of the card height
          this.config.cardImage = img;
        } );
      },
      {
        cardImage: null, //p5.js Image object that holds the image preview
        cardNumber: userData.attempts.length - (i + 1), //Since we are counting from the top of the array down we need to subtract by that upper length so the cards will be ordered 1, 2, 3, 4... instead of 6, 5, 4, 3...

        thisAttemptAccuracy: userData.attempts[i].accuracy,
        thisAttemptPreviewImage: userData.attempts[i].preview,
        thisAttemptExerciseType: userData.attempts[i].type,
        overallExerciseAccuracy: userData.attempts[i].overallAccuracy,

        width: Math.floor(windowWidth * 3/4 / 6), //The width of the card. 6 cards in a 3/4 chunk of the screen
        height: Math.floor( windowHeight / 8 - 2 * (windowHeight / 8 / 16) ), //The height of the card. This will center the card in between the top of the screen & the top bar
        XYSpacer: { x: 8, y: floor(windowHeight / 8 / 16) }, //This is the amount that is added to the x & y values of the card to space it in the middle of the top bar & from the edge

        uiTextSize: 9, //Default text size for 1920x1080 @ default/no scaling

        accuracyPassFailPercentCutoff: 0.80 //The cutoff for passing or failing the accuracy (displayed green or red on the card), 80%
      }
    ) );
  }

  }); /* TEMP: END OF SAVEFRAME CALLBACK */

  


  

  gameState = gameStates.GAME_DYNUSERUPDATE;
}

function draw() {
  background(255);
  for(let i = 0; i < UIElements.length; i++) {
    UIElements[i].tick();
  }

  switch(gameState) { //Handle states
    default:
      break;
  }
}