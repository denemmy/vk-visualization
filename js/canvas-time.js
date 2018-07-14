
var canvas_time_module = (function() {

	var ctm = {};
    
    var canvas = null;
    var context = null;

    var canvasD = null;
    var canvasM = null;
    var canvasY = null;

    var centerX = 0;
    var centerY = 0;

    var containerH = 0;
    var containerW = 0;

    var inited = false;

    var scaleD = 10;
    var scaleM = 6;
    var scaleY = 0.5;

    var curMonth = -1;
    var prevMonth = -1;
    var nextMonth = -1;

    var daysInMonth = 0;
    var daysInPrevMonth = 0;

    var minYear = 1990;
	var maxYear = 2050;

    var canvasDWidth;
    var canvasMWidth;
    var canvasYWidth;

    var canvasDHeight;
    var canvasMHeight;
    var canvasYHeight;

    var canvasWidth;
    var canvasHeight;

    var cWidth;
    var cPrevWidth;
    var cActualWidth;
    var cActualPrevWidth;

    var quality = 3;

    function preRenderD() {

    	var dCenterY = canvasDHeight / 2;

    	var contextD = canvasD.getContext('2d');
        optimizeQuality(canvasD, contextD);

    	contextD.font = '9pt tahoma';
        contextD.textAlign = 'center';
        contextD.fillStyle = '#DDD';
        contextD.strokeStyle = '#DDD';

        /*contextD.beginPath();
        contextD.moveTo(0, dCenterY);
        contextD.lineTo(canvasD.width, dCenterY);        
        contextD.stroke();*/        

        var segmentDayLen = canvasDWidth / 31.0;
        var segmentHLen = segmentDayLen / 24.0;        

        contextD.beginPath();
        for(var i = 0; i < 32; i++) {

        	var x = i * segmentDayLen;
        	var y0 = dCenterY + 4;
        	var y1 = dCenterY - 4;

	        contextD.moveTo(x, y0);
	        contextD.lineTo(x, y1);

	        for(var k = 1; k < 24; k++) {

	        	var x1 = x + k * segmentHLen;
	        	var y0 = dCenterY + 2;
        		var y1 = dCenterY - 2;

	        	contextD.moveTo(x1, y0);
	        	contextD.lineTo(x1, y1);	        	
	        }

	        if(i < 31) {
	        	var x2 = x + segmentDayLen / 2;
	        	var y2 = dCenterY - 5;
	        	contextD.fillText((i + 1).toString(), x2, y2);
	        }	        
        }
        contextD.stroke();
    }

    function preRenderM() {

    	var mCenterY = canvasMHeight / 2;

    	var contextM = canvasM.getContext('2d');
        optimizeQuality(canvasM, contextM);

    	contextM.font = '9pt tahoma';
        contextM.textAlign = 'center';
        contextM.fillStyle = '#EEE';
        contextM.strokeStyle = '#EEE';

        /*contextM.beginPath();
        contextM.moveTo(0, mCenterY);
        contextM.lineTo(canvasM.width, mCenterY);        
        contextM.stroke();*/

        var segmentMonthLen = canvasMWidth / 12.0;
        var segmentDLen = segmentMonthLen / 31.0;
        

        contextM.beginPath();
        for(var i = 0; i < 13; i++) {

        	var x = i * segmentMonthLen;
        	var y0 = mCenterY + 4;
        	var y1 = mCenterY - 4;

	        contextM.moveTo(x, y0);
	        contextM.lineTo(x, y1);

	        for(var k = 1; k < 31; k++) {

	        	var x1 = x + k * segmentDLen;
	        	var y0 = mCenterY + 2;
        		var y1 = mCenterY - 2;

	        	contextM.moveTo(x1, y0);
	        	contextM.lineTo(x1, y1);	        	
	        }

	        if(i < 12) {
	        	var x2 = x + segmentMonthLen / 2;
	        	var y2 = mCenterY - 7;
	        	contextM.fillText(months[i], x2, y2);
	        }	        
        }
        contextM.stroke();
    }

    function preRenderY() {
    	
    	var range = maxYear - minYear;

    	var yCenterY = canvasYHeight / 2;

    	var contextY = canvasY.getContext('2d');
        optimizeQuality(canvasY, contextY);

    	contextY.font = '9pt tahoma';
        contextY.textAlign = 'center';
        contextY.fillStyle = '#EEE';
        contextY.strokeStyle = '#EEE';

        var segmentYearLen = canvasYWidth / range;
        var segmentMonthLen = segmentYearLen / 30.0;        

        contextY.beginPath();
        for(var i = 0; i < range; i++) {

        	var year = i + minYear;
        	var x = i * segmentYearLen;
        	var y0 = yCenterY + 4;
        	var y1 = yCenterY - 4;

	        contextY.moveTo(x, y0);
	        contextY.lineTo(x, y1);

	        for(var k = 1; k < 30; k++) {

	        	var x1 = x + k * segmentMonthLen;
	        	var y0 = yCenterY + 2;
        		var y1 = yCenterY - 2;

	        	contextY.moveTo(x1, y0);
	        	contextY.lineTo(x1, y1);	        	
	        }

	        if(i < range - 1) {
	        	var x2 = x + segmentYearLen / 2;
	        	var y2 = yCenterY - 5;
	        	contextY.fillText(year.toString(), x2, y2);
	        }	        
        }
        contextY.stroke();
    }

    function preRender() {

    	canvasD = document.createElement("canvas");
    	canvasM = document.createElement("canvas");
    	canvasY = document.createElement("canvas");

    	canvasD.width = scaleD * containerW;
    	canvasM.width = scaleM * containerW;
    	canvasY.width = scaleY * (maxYear - minYear) * containerW;

    	canvasD.height = containerH / 3;
    	canvasM.height = containerH / 3;
    	canvasY.height = containerH / 3;

        canvasDWidth = canvasD.width;
        canvasMWidth = canvasM.width;
        canvasYWidth = canvasY.width;

        canvasDHeight = canvasD.height;
        canvasMHeight = canvasM.height;
        canvasYHeight = canvasY.height;

        preRenderD();
        preRenderM();
        preRenderY();
    }

    ctm.init = function() {
    
        canvas = document.getElementById("canvas-time");
        container = $("#date-slider");

        containerH = container.height();
        containerW = 370;

        centerX = containerW / 2;
        centerY = containerH / 2;

        canvas.width = 400;
        canvas.height = 300;

        context = canvas.getContext("2d");

        optimizeQuality(canvas, context);               

        preRender();

        inited = true;

        ctm.mouseDown = false;

        bindHandlers();
    };

    function bindHandlers() {
        $('html').mousemove(handleMouseMove);
        $('#time-options').mousedown(handleMouseDown);
        $('html').mouseup(handleMouseUp);
    }

    function unbindHandlers() {
        $('html').unbind('mousemove', handleMouseMove);
        $('#time-options').unbind('mousedown', handleMouseDown);
        $('html').unbind('mouseup', handleMouseUp);
    }

    ctm.draw = function(time) {

    	if(!inited) return;

    	context.clearRect(0, 0, canvas.width, canvas.height);

    	var date = new Date(time * 1000);
    	var year = date.getFullYear();
    	var month = date.getMonth(); 	/*0-11*/
        var day = date.getDate() - 1;	/*0-30*/
        var hour = date.getHours();
        var min = date.getMinutes();
        var sec = date.getSeconds();

        if(month != curMonth) {
        	//month changed
        	prevMonth = (month - 1) % 12;
        	curMonth = month;
        	nextMonth = (month + 1) % 12;
        	daysInMonth = getDaysInMonth(nextMonth, year);
        	daysInPrevMonth = getDaysInMonth(curMonth, year);
            cActualWidth = daysInMonth * canvasD.width / 31.0;
            cPrevActualWidth = daysInPrevMonth * canvasD.width / 31.0;
        	cWidth = daysInMonth * canvasDWidth / 31.0;
            cPrevWidth = daysInPrevMonth * canvasDWidth / 31.0;
        }

        //day
        var dayOffset = ((day * 24 + hour) * 60 + min);
        var maxDayOffset = 31 * 24 * 60;

    	var offsetX = -canvasDWidth * dayOffset / maxDayOffset + centerX;
    	var offsetY = 5;

    	if(offsetX > 0) {
    		//draw previous month's days
    		var offsetPrevX = offsetX - cPrevWidth;
    		context.drawImage(canvasD, 0, 0, cPrevActualWidth, canvasD.height,
    		offsetPrevX, offsetY, cPrevWidth, canvasDHeight);
    	}

    	context.drawImage(canvasD, 0, 0, cActualWidth, canvasD.height,
    		offsetX, offsetY, cWidth, canvasDHeight);

    	if(offsetX + cWidth < containerW) {
    		//draw next month's days
    		var offsetNextX = offsetX + cWidth;
    		context.drawImage(canvasD, offsetNextX, offsetY, canvasDWidth, canvasDHeight);
    	}    	

    	//month
    	var dayM = day * 31.0 / daysInMonth;
    	var monthOffset = ((month * 31 + dayM) * 24 + hour);
    	var maxMonthOffset = 12 * 31 * 24;

    	var offsetX = -canvasMWidth * monthOffset / maxMonthOffset + centerX;
    	var offsetY = containerH / 3 + 10;

    	if(offsetX > 0) {
    		//draw previous years's months
    		var offsetPrevX = offsetX - canvasMWidth;
    		context.drawImage(canvasM, offsetPrevX, offsetY, canvasMWidth, canvasMHeight);
    	}

    	context.drawImage(canvasM, offsetX, offsetY, canvasMWidth, canvasMHeight);

    	if(offsetX + canvasMWidth < containerW) {
    		//draw next years's months
    		var offsetNextX = offsetX + canvasMWidth;
    		context.drawImage(canvasM, offsetNextX, offsetY, canvasMWidth, canvasMHeight);
    	}

    	//year
    	var yearOffset = (((year - minYear) * 12 + month) * 31 + day) * 24 + hour;
    	var maxYearOffset = (maxYear - minYear) * 12 * 31 * 24;
    	var offsetX = -canvasYWidth * yearOffset / maxYearOffset + centerX;
    	var offsetY = 2.5 * containerH / 3;
    	context.drawImage(canvasY, offsetX, offsetY, canvasYWidth, canvasYHeight);

    	//draw triangle
    	context.fillStyle = '#EEE';
    	context.strokeStyle = '#EEE';
    	context.lineWidth = 0.2;

    	context.beginPath();
    	context.moveTo(centerX - 5, 1);
    	context.lineTo(centerX + 5, 1);
    	context.lineTo(centerX, 10);
    	context.lineTo(centerX - 5, 1);
    	context.fill();

    	context.beginPath();
    	context.moveTo(centerX, 1);
    	context.lineTo(centerX, containerH - 1);
    	context.stroke();
    };

	function handleMouseMove(evt) {
    	if(ctm.mouseDown) {
    		//dragging
    		var deltaX = evt.clientX - ctm.mousePosX;
    		var deltaY = evt.offsetY - ctm.mousePosY;

    		var deltaTime; //in seconds
    		if(ctm.dragArea == 'days') {
    			//var deltaDays = deltaX * 31.0 / canvasD.width;
    			deltaTime = -deltaX * 3600 * 24 * 31.0 / canvasDWidth;
    		}
    		else if(ctm.dragArea == 'months') {
    			deltaTime = -deltaX * 3600 * 24 * 31.0 * 12.0 / canvasMWidth;
    		}
    		else if(ctm.dragArea == 'years') {
    			deltaTime = -deltaX * 3600 * 24 * 31.0 * 12.0 * (maxYear - minYear) / canvasYWidth;
    		}
    		anim_m = app.animation_module;
    		anim_m.changeTime(anim_m.getTime() + deltaTime);

    		ctm.mousePosX = evt.clientX;
    		ctm.mousePosY = evt.offsetY;
    	}
    };

    function handleMouseDown(evt) {
    	ctm.mouseDown = true;
    	ctm.mousePosX = evt.clientX;
    	ctm.mousePosY = evt.offsetY;

    	if(ctm.mousePosY < containerH / 3) {
    		ctm.dragArea = 'days';
    	}
    	else if(ctm.mousePosY < containerH * 2 / 3) {
    		ctm.dragArea = 'months';
    	}
    	else {
    		ctm.dragArea = 'years';
    	}
    	ctm.isPaused = app.animation_module.paused;
    	app.pauseAnimation();	
    };

    function handleMouseUp(evt) {
    	if(ctm.mouseDown) {
    		if(!ctm.isPaused) {
				app.continueAnimation();
    		}
    	}
    	ctm.mouseDown = false;
    };

    ctm.clearData = function() {
        unbindHandlers();
        
        canvas = null;
        context = null;

        canvasD = null;
        canvasM = null;
        canvasY = null;
    }

    return ctm;

})();


