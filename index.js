var Game = function(){
    //Snake
    this.snake = [];
    this.snakeDirection;
    
    this.highscores = {
        "easy":0,
        "steroids":0,
        "slitherie":0
    };
    
    this.directions = {
        "up":{
            "coord":new Coord(0,-1),
            "keycodes":[38,87]
        },
        "down":{
            "coord":new Coord(0,1),
            "keycodes":[40,83]
        },
        "left":{
            "coord":new Coord(-1,0),
            "keycodes":[37,65]
        },
        "right":{
            "coord":new Coord(1,0),
            "keycodes":[39,68]
        }
    }
    
    //Game
    this.gameSpeed;
    
    this.defaultDifficulty = "slitherie";
    this.gameDifficulty;
    this.difficulty = {
        "easy":{
            "time":80,
            
            "foodProb":{
                "apple":11,
                "wall":6,
                "shrink":4
            },
            probArray:[],
            
            "startingApples":7,
            "startingWalls":7,
            "startingFood":7
        },
        "steroids":{
            "time":50,
            
            "foodProb":{
                "apple":8,
                "wall":8,
                "shrink":5
            },
            probArray:[],
            
            "startingApples":5,
            "startingWalls":10,
            "startingFood":8
        },
        "slitherie":{
            "time":40,
            
            "foodProb":{
                "apple":7,
                "wall":10,
                "shrink":4
            },
            probArray:[],
            
            "startingApples":4,
            "startingWalls":12,
            "startingFood":12
        }
    }; //milliseconds 

    this.gameTimer;
    
    this.gamePaused = false;
    
    this.gameSize = 30;
    
    //Food
    this.food = {};
    this.foodCoords = [];

    var i,j;
    
    this.init = function(_diff){        
        var self = this;
        
        //Snake
        this.snake = [];
        this.snakeDirection = this.directions["right"].coord;
        
        //Food
        this.food = {};
        this.foodCoords = [];
        
        this.startingApples = 3;
        this.startingRandFood = 10;
        
        //Difficulty
        this.gameDifficulty = (typeof _diff=="undefined" || _diff==null)?this.defaultDifficulty:_diff;
        this.gameSpeed = this.difficulty[this.gameDifficulty].time;
        
            //Difficulty Menu
            var menu = document.getElementById("difficulty_options");
            var out = "";
        
            for(i in this.difficulty){
                if(!this.difficulty.hasOwnProperty(i)) continue;
                var diffStr = i.toString().toTitleCase();
                
                out+= "<option value='"+diffStr+"'";
                out+=( (this.gameDifficulty.toString() == i.toString())?" selected ":"" );
                out+=">"+diffStr+"</option>";
            }
        
            menu.innerHTML = out;
        
            menu.addEventListener("focus",function(){ self.togglePause("pause"); })
            menu.addEventListener("blur",function(){ self.togglePause("play"); })
        
            menu.addEventListener("change",function(){
                menu.blur();
                
                self.gameOver("Difficulty Changed: "+this.value.toLowerCase(),this.value.toLowerCase());
            });
        
        //Highscores
        if(window.localStorage){
            if(typeof window.localStorage["highscores"] == "undefined"){
                window.localStorage["highscores"] = JSON.stringify(this.highscores);
            }
            else{
                this.highscores = JSON.parse(window.localStorage["highscores"]);
            }
        }
        
        this.updateHighscores();
        
        //Initialise Gameboard
        out = "<table id='gameboard'>";
        
        for(i=0;i<this.gameSize;i++){
            out+="<tr>"
            for(j=0;j<this.gameSize;j++){
                out+="<td id='cell_"+j+"_"+i+"'></td>";
            }
            out+="</tr>"
        }
        out+="</table>";
        
        document.getElementById("out").innerHTML = out;
        
        //Initialize Snake
        var _c = Math.floor((this.gameSize-1)/2);
        
        this.snake = [
            new Coord(_c-1,_c),
            new Coord(_c,_c),
            new Coord(_c+1,_c),
        ];
        
        //Food
        //Probability Array for random food
        this.difficulty[this.gameDifficulty].probArray = [];
        var foodProbObj = this.difficulty[this.gameDifficulty].foodProb;
        for(i in foodProbObj){
            if(!foodProbObj.hasOwnProperty(i)) continue;

            for(j=0;j<foodProbObj[i];j++){
                this.difficulty[this.gameDifficulty].probArray.push(i.toString());
            }
        }
        
        //Starting Food
        for(i=0;i<this.difficulty[this.gameDifficulty].startingApples;i++)
            this.spawnFood("eternal_apple");
        
        for(i=0;i<this.difficulty[this.gameDifficulty].startingWalls;i++)
            this.spawnFood("wall");
        
        for(i=0;i<this.difficulty[this.gameDifficulty].startingFood;i++){
            this.spawnFood();
        }
        
        //Event Listeners and Timers
        this.gameTimer = setInterval(function(){ self.nextFrame(); }, self.gameSpeed);
        this.gamePaused = false;
        
        window.addEventListener("keydown", function(e){ self.keyPress(e); } );
        
        console.log("New Game!");
    }
    
    this.render = function(){
        var x,y;
        
        //Snake
        for(i=0;i<this.snake.length;i++){
            x = this.snake[i].x;
            y = this.snake[i].y;
            
            document.getElementById("cell_"+x+"_"+y).className = (i==this.snake.length-1)?"snakehead":"snake";
        }
        
        this.highscores[this.gameDifficulty] = Math.max(this.highscores[this.gameDifficulty],this.snake.length);
        
        //Food
        for(i=0;i<this.foodCoords.length;i++){
            x = this.foodCoords[i].x;
            y = this.foodCoords[i].y;
            var type = this.food[this.foodCoords[i].print()];
            
            document.getElementById("cell_"+x+"_"+y).className = "food "+type; 
        }
    }
    
    this.nextFrame = function(){
        //Snake Movement
        var headCoord = this.snake[this.snake.length-1];
        var tailCoord = this.snake[0];
        
        var newHeadCoord = new Coord(headCoord.x+this.snakeDirection.x,headCoord.y+this.snakeDirection.y);
        var newX = newHeadCoord.x;
        var newY = newHeadCoord.y;
        
        var ind;
        
        //Gameover due to wall
        if( newX<0 || newX>=this.gameSize || newY<0 || newY>=this.gameSize || this.food[newHeadCoord.print()]=="wall"){ 
            this.gameOver("Stop banging the wall, fool!");
            return;
        }
        //Gameover due to self eat
        else if( newHeadCoord.inArray(this.snake) ){
            this.gameOver("Your tail very tasty meh?");
        }
        //Eats an Apple
        else if( this.food[newHeadCoord.print()]=="apple" || this.food[newHeadCoord.print()]=="eternal_apple" ){
            this.snake.push(newHeadCoord);
            
            //Spawn food back
            if(this.food[newHeadCoord.print()]=="eternal_apple"){
                this.spawnFood("eternal_apple");
            }
            else{
                this.spawnFood();
            }
                
            //Remove apple
            ind = newHeadCoord.inArray(this.foodCoords);
            this.foodCoords.splice(ind,1);
            delete this.food[newHeadCoord.print()];
        }
        //Eats a Shrink
        else if( this.food[newHeadCoord.print()]=="shrink" ){
            //Remove tail both from array and from visible board
            document.getElementById("cell_"+tailCoord.x+"_"+tailCoord.y).className = "";
            this.snake.shift(); 
            
            //Remove shrink
            ind = newHeadCoord.inArray(this.foodCoords);
            this.foodCoords.splice(ind,1);
            delete this.food[newHeadCoord.print()];
            
            //Gameover due to shrink to 0
            if( this.snake.length<=0 ){
                this.gameOver("Oops.. You went subatomic!");        
            }
        }
        else{ //Snake moves
            this.snake.push(newHeadCoord);
            
            //Remove tail both from array and from visible board
            this.snake.shift(); 
            document.getElementById("cell_"+tailCoord.x+"_"+tailCoord.y).className = "";
        }
        
        this.render();
    }
    
    this.togglePause = function(_forcedState){
        var self = this;
        
        switch(_forcedState){
            case "pause":
            case "paused":
                clearInterval(this.gameTimer);
                this.gamePaused = true;
                break;
            case "play":
            case "run":
            case "unpause":
                clearInterval(this.gameTimer);
                this.gameTimer = window.setInterval( function(){ self.nextFrame(); }, self.gameSpeed);
                this.gamePaused = false;
                break;
            default:
                if(this.gamePaused){
                    this.gameTimer = window.setInterval( function(){ self.nextFrame(); }, self.gameSpeed);
                    this.gamePaused = false;
                    
                    this.msg("Game Resumed");
                }
                else{
                    clearInterval(this.gameTimer);
                    this.gamePaused = true;
                    
                    this.msg("Game Paused");
                }
                break;
        }
    }
    
    this.keyPress = function(e){
        for(j in this.directions){
            if(!this.directions.hasOwnProperty(j)) continue;
            
            var dirStr = j.toString();
            var keyCodeArr = this.directions[dirStr].keycodes;
            
            for(i=0;i<keyCodeArr.length;i++){
                var dir = this.directions[dirStr].coord;
                if(e.keyCode == keyCodeArr[i] && ( this.snakeDirection.print()!=dir.opposingDirection().print() || this.snake.length == 1) ){ //Snake can't go into itself
                    this.snakeDirection = dir;
                    
                    console.log("Snake moving "+dirStr+" "+dir.print());
                }
            }
        }
        
        if(e.keyCode == 80){
            this.togglePause();
        }
    }
    
    this.spawnFood = function(_type,_coords){
        var coords = ( typeof _coords=="undefined" || _coords==null)?new Coord(0,0).randExcl(
            new Coord(0,0),
            new Coord(this.gameSize, this.gameSize),
            this.snake.concat(this.foodCoords)
        ):_coords;
        
        if( typeof _type=="undefined" || _type==null || _type == "random"){
            _type = this.difficulty[this.gameDifficulty].probArray[Math.floor(Math.random()*this.difficulty[this.gameDifficulty].probArray.length)];
        }
        
        if(coords!=null){
            this.foodCoords.push(coords);
            this.food[coords.print()] = _type;
            
            console.log("Spawned "+_type+" at: "+coords.print());
        }
    }
    
    this.updateHighscores = function(){
        if(window.localStorage){
            window.localStorage["highscores"] = JSON.stringify(this.highscores);
        }
        
        var out = "";
        
        for(var i in this.highscores){
            if( !this.highscores.hasOwnProperty(i) ) continue;
            out+="<div><h4>"+i.toString().toUpperCase()+"</h4><span> "+this.highscores[i]+"</span></div>";
        }
        
        document.getElementById("highscores").innerHTML = out;
    }
    
    this.gameOver = function(_msg,_diff){
        //alert(_msg);
        this.msg(_msg);
        console.log("Highscore: "+this.highscores[this.gameDifficulty]);
        
        this.updateHighscores();
        
        clearInterval(this.gameTimer);
        
        _diff = (typeof _diff == "undefined" || _diff==null)?this.gameDifficulty:_diff;
        this.init(_diff);
    }
    
    this.msg = function(_msg,_type,_timeout){
        this.currMsgBox = new MessageBox(_msg,_type,_timeout,this.prevMsgBox);
        this.currMsgBox.spawn();
        this.prevMsgBox = this.currMsgBox;
        
        console.log(this.currMsgBox.type.toString().toTitleCase()+" Message: "+_msg);
    }
}

var MessageBox = function(_msg,_type,_timeout,_prevMsgBox){
    this.fadeTimeout = 350; //ms
    this.defaultTimeout = 1000; //ms
    
    this.msg = (typeof _msg == "undefined")?null:_msg.toString();
    
    this.type = (typeof _type == "undefined" || _type==null)?"info":_type;
    this.timeout = (typeof _timeout == "undefined" || _timeout==null)?this.defaultTimeout:_timeout;
    
    this.prevMsgBox = (typeof _prevMsgBox == "undefined")?null:_prevMsgBox;
    
    this.spawn = function(){
        //if(this.prevMsgBox!=null) this.prevMsgBox.destroy();
            
        if(this.msg == null) return;
        
        this.msgHolder = document.createElement("div");
        this.msgHolder.className = "message_holder";
        
        this.msgbox = document.createElement("div");
        this.msgbox.className = "message_box appear "+this.type;
        this.msgbox.innerHTML = this.msg;

        this.msgHolder.appendChild(this.msgbox);
        document.getElementById("global_message_holder").appendChild(this.msgHolder);

        var self = this;

        this.disappearTimer = window.setTimeout(function(){
            window.clearTimeout(self.disappearTimer);
            self.msgbox.className = self.msgbox.className.replaceAll(" appear "," disappear ");
            self.fadeTimer = window.setTimeout(function(){
                self.destroy();
            },self.fadeTimeout);
        },self.timeout);
    };
    
    this.destroy = function(){
        window.clearTimeout(this.fadeTimer);
        
        if(this.msgHolder.parentElement!=null) this.msgHolder.parentElement.removeChild(this.msgHolder);

        delete this;
    }
}

var Coord = function(_x,_y){
    this.x = _x;
    this.y = _y;
    
    this.randExcl = function(lw_lim, up_lim, excl_array){
        for(i=0;i<100000;i++){
            var randX = Math.floor( lw_lim.x + Math.random()*(up_lim.x-lw_lim.x) );
            var randY = Math.floor( lw_lim.y + Math.random()*(up_lim.y-lw_lim.y) );
        
            if( !(new Coord(randX,randY)).inArray(excl_array) ) return new Coord(randX,randY);
        }
        
        return null;
    }
    
    this.match = function(_coord){
        return ( _coord.x==this.x && _coord.y==this.y );
    }
    
    this.inArray = function(_arr){
        for(var i=0;i<_arr.length;i++){
            if( this.match(_arr[i]) ) return i;
        }
        
        return false;
    }
    
    this.opposingDirection = function(){
        return new Coord(-this.x, -this.y);
    }
    
    this.print = function(){
        return "("+this.x+","+this.y+")";
    }
}

//PROTOTYPE
String.prototype.toTitleCase = function(){
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

String.prototype.replaceAll = function(target,replacement){
    return this.split(target).join(replacement);
}

//GAME
var game = new Game();
window.addEventListener("load",function(){ game.init(); },false);