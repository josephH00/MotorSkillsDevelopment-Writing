let db = `{"symbols":{"total":1,"mapping":["A"],"A":[{"x":-0.388,"y":-0.467,"section":1},{"x":-0.3505999999999999,"y":-0.3728000000000002,"section":1},{"x":-0.3131999999999998,"y":-0.2786000000000001,"section":1},{"x":-0.27580000000000016,"y":-0.18439999999999987,"section":1},{"x":-0.23839999999999964,"y":-0.09019999999999982,"section":1},{"x":-0.201,"y":0.004,"section":1},{"x":-0.1635999999999999,"y":0.09820000000000005,"section":1},{"x":-0.1261999999999998,"y":0.1924000000000001,"section":1},{"x":-0.08879999999999973,"y":0.2865999999999999,"section":1},{"x":-0.05140000000000009,"y":0.38079999999999997,"section":1},{"x":-0.014,"y":0.475,"section":1},{"x":0.02580000000000018,"y":0.38079999999999997,"section":2},{"x":0.06560000000000037,"y":0.2865999999999999,"section":2},{"x":0.10540000000000009,"y":0.1924000000000001,"section":2},{"x":0.14519999999999983,"y":0.09819999999999982,"section":2},{"x":0.185,"y":0.004,"section":2},{"x":0.2248000000000002,"y":-0.09020000000000004,"section":2},{"x":0.2645999999999999,"y":-0.1844000000000001,"section":2},{"x":0.3044000000000001,"y":-0.2786000000000001,"section":2},{"x":0.34419999999999984,"y":-0.3728000000000002,"section":2},{"x":0.384,"y":-0.467,"section":2},{"x":-0.236,"y":-0.147,"section":3},{"x":-0.194909090909091,"y":-0.14699999999999977,"section":3},{"x":-0.153818181818182,"y":-0.147,"section":3},{"x":-0.11272727272727298,"y":-0.147,"section":3},{"x":-0.07163636363636351,"y":-0.147,"section":3},{"x":-0.030545454545454504,"y":-0.147,"section":3},{"x":0.010545454545454504,"y":-0.147,"section":3},{"x":0.051636363636363515,"y":-0.147,"section":3},{"x":0.09272727272727298,"y":-0.147,"section":3},{"x":0.13381818181818197,"y":-0.147,"section":3},{"x":0.174909090909091,"y":-0.147,"section":3},{"x":0.216,"y":-0.147,"section":3}]}}`;
let userData;
let UIElements = [];

const maxDisplayedUserCards = 6; //Max of 6 to display in the top header

const defaultSaveStructure = { currentExercise: 0, gameAccuracy: 0, attempts: [] }; //The save structure that will be created for a new player: completed exercises, overall accuracy, attempt: attempt of specific letters / combo (based on coding in pointsDataset) & accuracy of that attempt & image of canvas
/*
  completed: The current exercise number
  accuracy: The overall accuracy of the game
  attempts:
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
const dynUIUUIDS = {
  TOPHEADER: 'TOPHEADER',
  UPPERACCURACY: 'UPPERACCURACY',
  USERCARD: 'USERCARD',
  DRAWINGAREA: 'DRAWINGAREA'
}
const dynamicUIAnimationState = {
  RUNNING: 'running', //During normal animation loop
  STOPPED: 'stopped',
  STARTUP: 'startup' //For when the animation / game is just loaded
}
class DynamicUI {
  constructor(UIElementClass, x, y, runCallback, startupCallback, configJSON) {
    this.UIElementClass = UIElementClass; //For identifying & finding elements

    this.config = configJSON;

    this.config.x = x;
    this.config.y = y;

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

  getConfig() {
    return this.config;
  }

  getElementClass() {
    return this.UIElementClass;
  }

  isThisElementClass(testElementClassID) {
    return (this.UIElementClass == testElementClassID);
  }
}

/* == */
function windowResized() {
  location.reload(); //Refresh the page when resized so scaling isn't messed up. TODO: Implement a better scaling / property retrieval system to dynamically account for changes in the window and update UI
}

/* == */
function createUserCard(CN, specificAccuracy, imgPreview, specificType, overallAccuracy) { //(Card number, Accuracy, Image preview [Base64 STRING, get from img.canvas.toDataURL(), for a p5js image 'img'], Type, Overall accuracy)

  for(let i = 0; i < UIElements.length; i++) //Inserts into specific position
    if(UIElements[i].isThisElementClass(dynUIUUIDS.USERCARD) == true)
      if(UIElements[i].getConfig().cardNumber >= CN) {
        //UIElements[i].config.cardNumber = UIElements[i].config.cardNumber + 1; /** Quick Fix: Doesn't increment in the updateCardNumber()? Why? */
        UIElements[i].config.updateCardNumber( UIElements[i].config.cardNumber +1 ); //Pushes cards with the same number up or higher up 1
      }

  UIElements.push( new DynamicUI(dynUIUUIDS.USERCARD, 0, 0, function() {
    /* Draw Card outline */
    fill(color(251, 251, 251));
    rect(this.config.x + this.config.XYSpacer.x, this.config.y + this.config.XYSpacer.y, this.config.width + 1, this.config.height + 1);

    line(this.config.x + this.config.XYSpacer.x + this.config.width * 0.70, this.config.y + this.config.XYSpacer.y,
      this.config.x + this.config.XYSpacer.x + this.config.width * 0.70, this.config.y + this.config.XYSpacer.y + this.config.height); //Create vertical divider at 70% of the width of the card
    
    for(let j = 1; j < 3; j++)
      line(this.config.x + this.config.XYSpacer.x + this.config.width * 0.70, this.config.y + this.config.XYSpacer.y + this.config.height * j/3,
        this.config.x + this.config.XYSpacer.x + this.config.width, this.config.y + this.config.XYSpacer.y + this.config.height * j/3); //Create three horizontal dividers on the right side of the card
      
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
        this.config.x + this.config.XYSpacer.x + this.config.width * 0.70 + this.config.width * (1 - 0.70)/2 - textWidth(statusBoxLabel)/2,
        this.config.y + this.config.XYSpacer.y + this.config.height * j/3 + textAscent()
      ); //Places it at + j/3 * height to adjust to the bound of the n-th status box

      let statusBoxData = statusBoxesTextInfo[j].data; //Render the status box data
      if(statusBoxesTextInfo[j].colorText == true) //Only color the data section of the status box if specified (used for showing pass/fail on the accuracy %'s)
        fill(  ( (statusBoxData >= this.config.accuracyPassFailPercentCutoff) ? color(63, 146, 9) : color(196, 22, 27) )  ) //If the accuracy is at the specified cutoff or better mark it green, else mark it red
      if(statusBoxesTextInfo[j].formatPercent == true) //Format percent
        statusBoxData = parseFloat(100 * statusBoxData).toFixed(0) + "%"; //'Pretty prints' the accuracy percentage, formatted as XX% instead of 0.XX
      text(statusBoxData,
        this.config.x + this.config.XYSpacer.x + this.config.width * 0.70 + this.config.width * (1 - 0.70)/2 - textWidth(statusBoxData)/2,
        this.config.y + this.config.XYSpacer.y + this.config.height * j/3 + 2.75 * textAscent()); //Places the text below the attempt accuracy label with some extra room at the bottom
      fill(color(51, 51, 51)); //Reset colors
    }
    
    //Render image preview
    if(this.config.cardImage != null) { //Only render when available
      fill(color(0, 0, 0));
      rect( //Outline the preview
        this.config.x + this.config.XYSpacer.x + (this.config.width * 0.70 /2 - this.config.cardImage.width/2) - 1,
        this.config.y + this.config.XYSpacer.y + (this.config.height/2 - this.config.cardImage.height/2) - 1,
        this.config.cardImage.width + 1,
        this.config.cardImage.height + 1
      );
      image(this.config.cardImage, 
        this.config.x + this.config.XYSpacer.x + (this.config.width * 0.70 /2 - this.config.cardImage.width/2),    //Center preview in the left side of card
        this.config.y + this.config.XYSpacer.y + (this.config.height/2 - this.config.cardImage.height/2)   //Center preview in middle y-axis of the card
      );
    }
  }, function() {
      this.config.updateCardNumber(this.config.cardNumber); //Updates the position & card number with respect to the new CN
      loadImage( this.config.thisAttemptPreviewImage, img => { //Load image for this attempt from the userData
        img.resize(0, this.config.height * 0.80); //Scale the image to the 80% of the card height
        this.config.cardImage = img;
      } );
  },
  {
      cardImage: null, //p5.js Image object that holds the image preview
      cardNumber: CN, //Since we are counting from the top of the array down we need to subtract by that upper length so the cards will be ordered 1, 2, 3, 4... instead of 6, 5, 4, 3...

      thisAttemptAccuracy: specificAccuracy,
      thisAttemptPreviewImage: imgPreview,
      thisAttemptExerciseType: specificType,
      overallExerciseAccuracy: overallAccuracy,

      width: Math.floor(windowWidth * 3/4 / 6), //The width of the card. 6 cards in a 3/4 chunk of the screen
      height: Math.floor( windowHeight / 8 - 2 * (windowHeight / 8 / 16) ), //The height of the card. This will center the card in between the top of the screen & the top bar
      XYSpacer: { x: 8, y: floor(windowHeight / 8 / 16) }, //This is the amount that is added to the x & y values of the card to space it in the middle of the top bar & from the edge

      uiTextSize: 9, //Default text size for 1920x1080 @ default/no scaling

      accuracyPassFailPercentCutoff: 0.80, //The cutoff for passing or failing the accuracy (displayed green or red on the card), 80%

      updateCardNumber: function(newCN) { //Updates the card number & position
        this.cardNumber = newCN;
        this.x = (this.width + this.XYSpacer.x) * this.cardNumber;
        return;
      }
  }
  ) );

  let elementsToDelete = []
  for(let i = 0; i < UIElements.length; i++) //Purge elements outside of displayable range
    if(UIElements[i].isThisElementClass(dynUIUUIDS.USERCARD) == true)
      if(UIElements[i].getConfig().cardNumber >= maxDisplayedUserCards)
        elementsToDelete.push(i);

  for(let i = 0; i < elementsToDelete.length; i++)
    UIElements.splice(elementsToDelete[i], 1); //Remove the designated element that is over the bounds
}

function createDrawingArea() {
  UIElements.push( new DynamicUI(dynUIUUIDS.DRAWINGAREA, width/2, height/2, function(d) {
    let elapsedTime = new Date().getTime() - this.config.t1;
    this.config.t1 = new Date().getTime();
    
    this.config.internalTick(elapsedTime)
    
    this.config.drawSketchZone();
  
    this.config.drawPoints(this.config.drawDebugLines);
  
    
    this.config.handlePointMapping();
    }, function(d) {
      //Load the newest exercise
      let newDataIndex = userData.currentExercise;
      let targetIndex = db["symbols"].mapping[newDataIndex];
      let preprocessUD = db["symbols"][targetIndex];
      
      this.config.drawingExerciseType = targetIndex;

      for(let j = 0; j < preprocessUD.length; j++ ) {
        let CCSPointXY = this.config.CCSJSONRelativeToAbs(
          preprocessUD[j]["x"],
          preprocessUD[j]["y"]
        ); //Convert JSON relative to absolute based on the sketchZone

        let px = CCSPointXY.x;
        let py = CCSPointXY.y;

        let pSection = preprocessUD[j]["section"];
        this.config.pointsArray.push({x:px, y:py, distPointAndMouse: null, mappedPoint: null, section: pSection})
      }
      this.config.preComputePointGeometry(); //Precomputes geometric info
    },
    {
      t1: new Date().getTime(),
      sketchZone: {width: 500, height:500},
      mouseArray: [],
      pointsArray: [],
      internalTickCounter: 0,

      automaticMappedPointsPercentageCutoff: 0.85, //85% cut off when the stage ends
      mouseSpeed: 70, //70 ms per each point to draw
      drawDebugLines: false, //Draws the slopes & boundaries for the point association

      drawingExerciseType: null, //This is the type of the exercise pulled from the db when the element is loaded

      CCSJSONRelativeToAbs: function(rx, ry) { //Converts the relative points in the JSON
        return {
          x: this.sketchZone.width/2 * rx * 2, //Scale by 2x, there must be some scaling factor that I've built into the rendering that doesn't work *just right*
          y: this.sketchZone.height/2 * ry * 2
        };
      },
      
      CCSX: function(x, targetX) {
        if(targetX == null)
          return width/2 + x;
        else
          return targetX/2 + x
      },
      CCSY: function(y, targetY) {
        if(targetY == null)
          return height/2 - y; //The y-axis is inverted
        else
          return targetY/2 - y;
      },
      oCCS: function(o, targetX, targetY) { //Convert coordinate systems from relative [-1, 1] to absolute of an object
        if(targetX == null && targetY == null)
          return { x: this.CCSX(o.x), y: this.CCSY(o.y) };
        else
          return { x: this.CCSX(o.x, targetX), y: this.CCSY(o.y, targetY) };
      },
      oDist: function(a, b) {
        return Math.hypot(b.x - a.x, b.y - a.y);
      },
      oComputeGeometryInfo: function(a, b) {
        let dY = this.CCSY(b.y) - this.CCSY(a.y); //Delta Y
        let dX = this.CCSX(b.x) - this.CCSX(a.x); //Delta X
        if(dX == 0) return { slope: null, dx: dX, dy: dY };
        return { slope: dY / dX, dx: dX, dy: dY, distanceToNextPoint: Math.sqrt(Math.pow(dX,2) + Math.pow(dY, 2)) }; //Slope between the current point and the next point, Delta X's & Y's, and distance
      },
    
      internalTick: function(elapsedTime) {
        this.internalTickCounter = this.internalTickCounter + elapsedTime;
        if(this.internalTickCounter >= this.mouseSpeed) {
          this.internalTickCounter = 0;
          if(mouseIsPressed && (movedX != 0 || movedY != 0))
            this.mouseArray.push({x: mouseX, y: mouseY});
        }
      },
      calculateStatistics: function() { //Calculate the statistics & accuracy of the drawing
        let averageDrawnLength = 0;
        let PALength = 0; //Points that aren't null
        let averageDistBetweenPoints = 0;
        for(let i = 0; i < this.pointsArray.length; i++)
          if(this.pointsArray[i].distPointAndMouse != null) {
            averageDrawnLength += this.pointsArray[i].distPointAndMouse;
            averageDistBetweenPoints += this.pointsArray[i].preComputedSlope.distanceToNextPoint;
            PALength++;
          }
      
        let acc = Math.abs(1-( averageDrawnLength/PALength/(averageDistBetweenPoints/2) )); //Computes accuracy of the drawn points based on the (average distance between points)/2
        let pM = PALength/this.pointsArray.length; //The percentage of data points that are mapped to drawn points (eg. 93%)
        return {  accuracy: acc, pointsMapped: pM  }
      },
      preComputePointGeometry: function() {
        for(let i = 0; i < this.pointsArray.length; i++) { 
          if(i+1 < this.pointsArray.length) { //Calculate up to the last element
      
            if (this.pointsArray[i].section == this.pointsArray[i+1].section) { //Within the same section
              let cPnPSlope = this.oComputeGeometryInfo(this.pointsArray[i], this.pointsArray[i+1]);
              this.pointsArray[i].preComputedSlope = cPnPSlope; //{ slope:, dx:, dy: , distanceToNextPoint: }
            }
            else this.pointsArray[i].preComputedSlope = this.pointsArray[i-1].preComputedSlope; //Compute for the ending point of the section, the value will be the same as the previous point
      
          }
          else this.pointsArray[i].preComputedSlope = this.pointsArray[i-1].preComputedSlope; //Compute for the ending point of the array
        }
      },
      drawSketchZone: function() {
        line(width/2 - this.sketchZone.width/2, height/2 - this.sketchZone.height/2,
          width/2 + this.sketchZone.width/2, height/2 - this.sketchZone.height/2);
        line(width/2 - this.sketchZone.width/2, height/2 + this.sketchZone.height/2,
          width/2 + this.sketchZone.width/2, height/2 + this.sketchZone.height/2);
        line(width/2 - this.sketchZone.width/2, height/2 - this.sketchZone.height/2,
          width/2 - this.sketchZone.width/2, height/2 + this.sketchZone.height/2);
        line(width/2 + this.sketchZone.width/2, height/2 - this.sketchZone.height/2,
          width/2 + this.sketchZone.width/2, height/2 + this.sketchZone.height/2);
        
        if(isNaN(this.calculateStatistics().accuracy) == false) {
          rect(width/2 - this.sketchZone.width/2, height/2 + this.sketchZone.height/2, textWidth("Accuracy: ##% Completed: ##%"), textAscent("W"));
          text("Accuracy: " + (100 * this.calculateStatistics().accuracy).toFixed(0) + "%" + " Completed: " + (100 * this.calculateStatistics().pointsMapped).toFixed(0) + "%", width/2 - this.sketchZone.width/2, height/2 + this.sketchZone.height/2 + textAscent("W")*0.9);
        }
      },
      drawPoints: function(drawDebug) {
        fill(color(0,0,0));
        for(let i = 0; i < this.mouseArray.length; i++)
          ellipse(this.mouseArray[i].x, this.mouseArray[i].y, 4, 4); //Mouse Points
      
        for(let i = 0; i < this.pointsArray.length; i++) {
          ellipse(this.CCSX(this.pointsArray[i].x), this.CCSY(this.pointsArray[i].y), 4, 4); //Reference Points
          
          if(drawDebug == false) continue; //If the draw debug value is set to false then the slope & bounding lines for the points won't be drawn
          line(this.CCSX(this.pointsArray[i].x), this.CCSY(this.pointsArray[i].y), this.CCSX(this.pointsArray[i].x) + this.pointsArray[i].preComputedSlope.dx*.50, this.CCSY(this.pointsArray[i].y) + this.pointsArray[i].preComputedSlope.dy*.50); //Draw line of derivative of point
      
          line(this.CCSX(this.pointsArray[i].x) + this.pointsArray[i].preComputedSlope.slope*this.pointsArray[i].preComputedSlope.dx, 
            this.CCSY(this.pointsArray[i].y) - this.pointsArray[i].preComputedSlope.slope*this.pointsArray[i].preComputedSlope.dy, 
            this.CCSX(this.pointsArray[i].x) - this.pointsArray[i].preComputedSlope.slope*this.pointsArray[i].preComputedSlope.dx, 
            this.CCSY(this.pointsArray[i].y) + this.pointsArray[i].preComputedSlope.slope*this.pointsArray[i].preComputedSlope.dy); //Draw inverse of derivative
          //DRAW INVERSE OF SLOPE ^^^^^
        }
      },
      handlePointMapping: function() {
        for(let i = 0; i < this.pointsArray.length; i++) {
    
          let possibleOverlappingPointAreas = []; //Sometimes a mouse point might overlap with multiple reference points that fall within their bounding boxes
          for(let j = 0; j < this.mouseArray.length; j++) {
            let px = this.CCSX(this.pointsArray[i].x);
            let py = this.CCSY(this.pointsArray[i].y);
      
            let mx = this.mouseArray[j].x;
            let my = this.mouseArray[j].y;
      
            let distPointAndMouse = this.oDist(this.oCCS(this.pointsArray[i]), this.mouseArray[j]); //Distance between the predefined point & the mouse point
            
            let thisPointPreComputedSlope = this.pointsArray[i].preComputedSlope; //Find the precomputed direction & slope data from the current point
            
            let nextPointPreComputedSlope = null; //Find the precomputed direction & slope data from the next point
            let p2x = null;
            let p2y = null;
            if(i+1 < this.pointsArray.length) {
              if(this.pointsArray[i].section == this.pointsArray[i+1].section) { //Only get the slope for that section
                nextPointPreComputedSlope = this.pointsArray[i+1].preComputedSlope;
                p2x = this.CCSX(this.pointsArray[i+1].x);
                p2y = this.CCSY(this.pointsArray[i+1].y);
              } else {
                nextPointPreComputedSlope = this.pointsArray[i-1].preComputedSlope; //Else, just use the slope of the previous point (should be the same and continue forward)
                p2x = this.CCSX(this.pointsArray[i-1].x);
                p2y = this.CCSY(this.pointsArray[i-1].y);
              } 
            } else
              continue; //If at the end of the points array just skip it, there's nothing that can be done (this should just repeatedly skip the j loop until it ends)
            
            function boundaryYEqu(oX, oY, nX, oSlope) { return oSlope*(nX - oX) + oY; } //Computes the Y value of the slope of the two boundary lines (from this point to the next point), aka y=mx
      
            if(distPointAndMouse < 4*thisPointPreComputedSlope.distanceToNextPoint) { //We write left to right, so any point should be more right to the reference
              let withinY1Bound = (my < boundaryYEqu(px, py, mx, -thisPointPreComputedSlope.slope)); //i point
              let withinY2Bound = (my > boundaryYEqu(p2x, p2y, mx, -nextPointPreComputedSlope.slope)); //i+1 point
      
              if( (  (withinY1Bound == true && withinY2Bound == true) || (withinY1Bound == false && withinY2Bound == false)  )
                  || (  px < mx && mx < p2x && thisPointPreComputedSlope.slope == 0 ) ) { //Will render if within the correct Y bounds, if the points are upside down both will be false otherwise both will be true. Or if the slope is 0 (horizontal) & within the correct x bounds between points
                
                possibleOverlappingPointAreas.push( {referencePointIndex: i, mousePointIndex: j, RToMDist: distPointAndMouse} ); //Add to list when a point falls within the bounds of the reference points
              }
      
            }
            if(this.pointsArray[i].mappedPoint != null)
              line(this.CCSX(this.pointsArray[i].x), this.CCSY(this.pointsArray[i].y), this.mouseArray[this.pointsArray[i].mappedPoint].x, this.mouseArray[this.pointsArray[i].mappedPoint].y);
          }
      
          //Handles mouse points that can be mapped to a reference point
          if(possibleOverlappingPointAreas.length != 0) { //Handles the segmentation of the rays
            
            //Record points that haven't been previously recorded or those that can be replaced by points who have a distance to the reference
            possibleOverlappingPointAreas.sort(function(a, b){
              return a.RToMDist - b.RToMDist;
            }); //Sort array by distance between mouse & reference points
            if(this.pointsArray[i].mappedPoint == null || this.pointsArray[i].distPointAndMouse > possibleOverlappingPointAreas[0].RToMDist) {
              this.pointsArray[i].mappedPoint = possibleOverlappingPointAreas[0].mousePointIndex; //Overwrites previous values (if any) for that point
              this.pointsArray[i].distPointAndMouse = possibleOverlappingPointAreas[0].RToMDist;
            }
      
          }
            
        }
      },
    }

  ) );
}

function preload() {
  db = JSON.parse(db);
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
  UIElements.push( new DynamicUI(dynUIUUIDS.TOPHEADER, 0, 0, function(d) {
      fill(color(238, 238, 238));
      rect(this.config.x, this.config.y, this.config.width, this.config.height);
    }, function(d) {},
    {
      width: windowWidth + 1,
      height: windowHeight / 8
    }
  ) );

  //Accuracy indicator
  UIElements.push( new DynamicUI(dynUIUUIDS.UPPERACCURACY, 0, 0, function() {
      textSize(this.config.uiTextSize);
      
      this.config.x = windowWidth - textWidth("Accuracy: XX%  "); //Adjust x at runtime based on size of the text

      let buffer = { x: textWidth(" "), y: textAscent() * 3/4 } //Create buffer between box & text
      let sizeBox = { w: windowWidth - this.config.x - buffer.x, h: textAscent() + buffer.y }

      fill(color(247, 247, 247));
      rect(this.config.x - buffer.x, this.config.y, sizeBox.w, sizeBox.h); //Set space for rect

      fill(color(51, 51, 51));
      text("Accuracy: " + (100 * userData.gameAccuracy).toFixed(0) + "% ", this.config.x, this.config.y + textAscent() + buffer.y/2);
    }, function() {},
    {
      uiTextSize: 14,
    }
  ) );

  //Load previous attempts from userData if available
  if(userData.attempts.length > 0)
    for(let i = userData.attempts.length - 1; i > userData.attempts.length - maxDisplayedUserCards - 1 && i >= 0; i--) { //Show the last 6 cards (attempts) that were pushed to the storage
      createUserCard(
        userData.attempts.length - (i + 1), //Card number
        userData.attempts[i].accuracy,
        userData.attempts[i].preview,
        userData.attempts[i].type,
        userData.attempts[i].overallAccuracy
      );
    }

  //Create drawing area
  createDrawingArea();


  gameState = gameStates.GAME_DYNUSERUPDATE;
}

function draw() {
  background(255);
  for(let i = 0; i < UIElements.length; i++) {
    UIElements[i].tick();
  }

  switch(gameState) { //Handle state logic

    case gameStates.GAME_DYNUSERUPDATE:
      for(let i = 0; i < UIElements.length; i++) {
        let cUI = UIElements[i]; //Current UI Element
        let cUIConf = cUI.getConfig();
        if(cUI.isThisElementClass(dynUIUUIDS.DRAWINGAREA) == true) { //Find the drawing area element

          console.log("PM ", cUIConf.calculateStatistics().pointsMapped)

          if(cUIConf.calculateStatistics().pointsMapped >= cUIConf.automaticMappedPointsPercentageCutoff) { //Switch at the designated cutoff
            gameState = gameStates.GAME_GETNEWTASK; //Update user data & UI
          }
        }
      }
      break;

    case gameStates.GAME_GETNEWTASK:
      /* Create new user card */
      let cUI = null; //Get the drawing area's UI Element to get screenshot bounds
      let cUIConf = null;
      for(let i = 0; i < UIElements.length; i++) //Search & find the drawing area element
        if(UIElements[i].isThisElementClass(dynUIUUIDS.DRAWINGAREA) == true) {
          cUI = UIElements[i];
          cUIConf = cUI.getConfig();
        }
      
      let sketchZoneImage = get(
        width/2 - cUIConf.sketchZone.width/2,
        height/2 - cUIConf.sketchZone.height/2,
        cUIConf.sketchZone.width,
        cUIConf.sketchZone.height + textAscent("W") + 1
      ).canvas.toDataURL(); //Grab sketch zone & convert to Base64 string for storage and loading

      let exerciseStats = cUIConf.calculateStatistics();
      let exerciseType = cUIConf.drawingExerciseType;

      let overallAccuracyNumerator = 0;
      let overallAccuracyTotalNumberOfAttempts = 0;
      for(let i = 0; i < userData.attempts.length; i++) { //Recalculate overall accuracy with new data
        if(userData.attempts[i].type == exerciseType) { //Only if it's the same type of exercise
          overallAccuracyNumerator = overallAccuracyNumerator + userData.attempts[i].accuracy;
          overallAccuracyTotalNumberOfAttempts++;
        }
      }
      let overallAccuracy = ( overallAccuracyNumerator + exerciseStats.accuracy ) / ( overallAccuracyTotalNumberOfAttempts + 1 ); //Add in the new score for the drawing area

      createUserCard(0, exerciseStats.accuracy, sketchZoneImage, exerciseType, overallAccuracy); //Inserts new card at the beginning of the stack
      
      /* Update userData & local storage */
      if(userData.currentExercise + 1 >= db["symbols"].total) //Roll back to the first exercise if it is bigger than the max
        userData.currentExercise = 0;
      else  
        userData.currentExercise++

      userData.attempts.push({
        type: exerciseType,
        accuracy: exerciseStats.accuracy,
        overallAccuracy: overallAccuracy,
        preview: sketchZoneImage
      });

      let gameAccuracy = 0; //Update game-wide accuracy
      for(let i = 0; i < userData.attempts.length; i++) {
        gameAccuracy = gameAccuracy + userData.attempts[i].accuracy;
      }
      userData.gameAccuracy = gameAccuracy / userData.attempts.length;

      storeItem( "drawingUserProgress", JSON.stringify(userData) ); //Update local storage

      /* Recreate the drawing area for the next problem */
      for(let i = 0; i < UIElements.length; i++)
        if(UIElements[i].isThisElementClass(dynUIUUIDS.DRAWINGAREA) == true)
          UIElements.splice(i, 1); //Remove the current drawing area

      createDrawingArea(); //Reinitialize

      gameState = gameStates.GAME_DYNUSERUPDATE;
      break;

    default:
      break;
  }
}