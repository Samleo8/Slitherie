var Game = function(){
    //Snake
    this.snake = [];
    this.snakeDirection;
    
    this.highscores = {
        "normal":3,
        "steroids":3,
        "slitherie":3
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
        "normal":{
            "time":500,
            
            "foodProb":{
                "apple":9,
                "wall":4,
                "shrink":2
            },
            probArray:[],
            
            "startingApples":5,
            "startingWalls":5,
            "startingFood":5
        },
        "steroids":{
            "time":80,
            
            "foodProb":{
                "apple":6,
                "wall":6,
                "shrink":3
            },
            probArray:[],
            
            "startingApples":3,
            "startingWalls":8,
            "startingFood":6
        },
        "slitherie":{
            "time":60,
            
            "foodProb":{
                "apple":4,
                "wall":8,
                "shrink":3
            },
            probArray:[],
            
            "startingApples":2,
            "startingWalls":10,
            "startingFood":10
        }
    }; //milliseconds 
    
    this.gameTimer;
    
    this.gameSize = 25;
    
    //Food
    this.food = {};
    this.foodCoords = [];

    var i,j;
    
    this.init = function(_diff){        
        //Snake
        this.snake = [];
        this.snakeDirection = this.directions["right"].coord;
        
        //Food
        this.food = {};
        this.foodCoords = [];
        
        this.startingApples = 3;
        this.startingRandFood = 10;
        
        //Difficulty
        this.gameDifficulty = (typeof _diff=="undefined")?this.defaultDifficulty:_diff;
        this.gameSpeed = this.difficulty[this.gameDifficulty].time;
        
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
        var out = "<table id='gameboard'>";
        
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
        var self = this;
        this.gameTimer = setInterval(function(){ self.nextFrame(); }, this.gameSpeed);
        
        window.addEventListener("keydown", function(e){ self.keyPress(e); } );
        
        this.msg("New Game!");
    }
    
    this.render = function(){
        var x,y;
        
        //Snake
        for(i=0;i<this.snake.length;i++){
            x = this.snake[i].x;
            y = this.snake[i].y;
            
            document.getElementById("cell_"+x+"_"+y).className = "snake";    
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
        
        if(e.keyCode == 32){
            clearInterval(this.gameTimer);
        }
    }
    
    this.spawnFood = function(_type,_coords){
        var coords = ( typeof _coords=="undefined")?new Coord(0,0).randExcl(
            new Coord(0,0),
            new Coord(this.gameSize, this.gameSize),
            this.snake.concat(this.foodCoords)
        ):_coords;
        
        if( typeof _type=="undefined" || _type == "random"){
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
    
    this.gameOver = function(_msg){
        //alert(_msg);
        this.msg(_msg);
        this.msg("Highscore: "+this.highscores[this.gameDifficulty]);
        
        this.updateHighscores();
        
        clearInterval(this.gameTimer);
        
        this.init();
    }
    
    this.msg = function(_msg){
        console.log(_msg);
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


var game = new Game();
window.addEventListener("load",function(){ game.init(); },false);