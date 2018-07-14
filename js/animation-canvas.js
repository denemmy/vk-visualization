
var animation_canvas = new function() {

    var cmm = this;

    var containerH;
    var containerW;

    var timeCoeff;
    var canvas = null;
    var context = null;

    var ballSpeedCoeff;

    var scale;
    var startDragOffset = {};
    var dragOffset = {};

    var mousePos = {};
    var lastMousePos = {};
    var canvasMousePos = {};
    var canvasLastMousePos = {};
    var mouseDown;
    var translatePos = {};

    var isDragging = false;
    var draggingObject;
    var overMsg = null;
    var overObject = null;

    var msgUids;
    var msgMids;
    var msgDate;
    var msgOut;

    var inited = false;

    var mainObject;
    var objects;
    var objRefByUid;

    var renderDelta;
    var renderTimeEnd;
    var renderTimeStart;
    var renderTimeElased;

    var timeElapsed;
    var time;
    var msgPassed;

    var animSpeedCoeff;
    var animSpeedCoeffSave;

    var maxBallsOnPage;
    var maxObjectsNum;

    //constants
    var blue = "#658AB0";
    var red = "#EF2B36";
    var yellow = "#EFEF36";
    var green = "#2BA336";

    var startTimeFraсtion = 0.5;
    var ballRadius = 6;

    var minTimeCoeff = 0.01;
    var minAnimSpeedCoeff = 0.01;

    var scaleMultiplier = 0.8;
    var maxScale = 2;
    var minScale = 0.1;
    var initialScale = 0.13;

    var fpsValues = [];
    var fpsAverage = 60.0;

    var requestAnimationFrameId = null;

    //tree for optimization
    var quadTree;

    //message balls buffer
    var msgBallsBuffer;
    var lastBufferIndex;
    var bufferSize = 5000;

    function MsgBall() {

        var ball = this;
        ball.radius = uniformRandom(3, 5);

        ball.sourceObj = null;
        ball.destObj = null;

        ball.velX = 0;
        ball.velY = 0;

        ball.msg = null;

        ball.distance = 0;
        ball.velocity = 0;

        ball.MIN_DISTANCE = 100;
        ball.DISTANCE_TO_FADE_NOISE_FORCES = 200;

        ball.isDead = true;

        //time params
        ball.time = 0;
        ball.maxAge = uniformRandom(1200, 1500);            //max number of steps
        ball.stepsPassed = 0;                               //number of steps passed

        //local movement
        ball.magnitude = 0.1;
        ball.w_coeff = uniformRandom(0.0008, 0.001);
        ball.phase = Math.random() * Math.PI;

        return ball;
    }

    MsgBall.prototype.draw = function(context) {
        context.beginPath();
        context.arc(this.x, this.y, this.radius,
            0, 2*Math.PI, false);
        context.fillStyle = this.color;
        context.fill();
    }

    MsgBall.prototype.isArrived = function() {
        if(this.isDead) {
            return true;
        }
        return this.distance <= this.MIN_DISTANCE;
    }

    MsgBall.prototype.step = function(deltaTime) {

        this.time = this.time + deltaTime;

        this.destX = this.destObj.x;
        this.destY = this.destObj.y;

        var vecX = this.destX - this.x;
        var vecY = this.destY - this.y;
        this.distance = Math.sqrt(vecX * vecX + vecY * vecY);
        vecX = vecX / this.distance;
        vecY = vecY / this.distance;

        //main force
        //var forceCoeff = 0.015;
        var forceCoeff = 0.03;
        this.forceX = deltaTime * forceCoeff * vecX;
        this.forceY = deltaTime * forceCoeff * vecY;

        //friction force
        //var frictionFroceCoeff = 0.05;
        var frictionFroceCoeff = 0.04;
        var frictionForceX = -this.velX * frictionFroceCoeff;
        var frictionForceY = -this.velY * frictionFroceCoeff;

        //noise force
        var noiseForceProj = this.magnitude * Math.sin(this.w_coeff * this.time + this.phase);
        var noiseForceX = noiseForceProj * (vecY);
        var noiseForceY = noiseForceProj * (-vecX);

        if(this.distance < this.DISTANCE_TO_FADE_NOISE_FORCES) {
            noiseForceX = 0;
            noiseForceY = 0;
        }

        //result force
        var resultForceX = this.forceX + frictionForceX + noiseForceX;
        var resultForceY = this.forceY + frictionForceY + noiseForceY;

        this.velX += animSpeedCoeff * resultForceX;
        this.velY += animSpeedCoeff * resultForceY;


        var velocityCoeff = 0.04;
        this.x += animSpeedCoeff * deltaTime * velocityCoeff * (this.velX);
        this.y += animSpeedCoeff * deltaTime * velocityCoeff * (this.velY);

        this.stepsPassed++;
        if(this.stepsPassed >= this.maxAge) {
            this.isDead = true;
        }
    }

    MsgBall.prototype.init = function(sourceObj, destObj, velX, velY, msg) {
        ball = this;
        ball.sourceObj = sourceObj;

        ball.x = sourceObj.x;
        ball.y = sourceObj.y;

        ball.velX = velX;
        ball.velY = velY;
        ball.destObj = destObj;

        ball.destX = destObj.x;
        ball.destY = destObj.y;

        ball.msg = msg;

        ball.distance = Math.sqrt((ball.destX - ball.x)*(ball.destX - ball.x) +
            + (ball.destY - ball.y)*(ball.destY - ball.y));
        ball.velocity = Math.sqrt(ball.velX * ball.velX + ball.velY * ball.velY);

        ball.isDead = false;

        ball.time = 0;
        ball.stepsPassed = 0;

        ball.MIN_DISTANCE = destObj.radius;
    }

    function prepareMsgBallsPreRender() {
        var canvas = document.createElement('canvas');
        MsgBall.prototype.preCanvas = [];
        MsgBall.prototype.preContext = [];

        //blue message ball
        MsgBall.prototype.preCanvas[0] = canvas;

        var quality = 3;

        canvas.width = quality * 2 * ballRadius;
        canvas.height = quality * 2 * ballRadius;

        var context = canvas.getContext('2d');
        context.scale(quality, quality);
        MsgBall.prototype.preContext[0] = context;
        context.globalAlpha = 0.8;

        //render
        context.beginPath();
        context.arc(ballRadius, ballRadius, ballRadius, 0, 2*Math.PI, false);
        context.fillStyle = '#658AB0';
        // context.fillStyle = '#fff';
        context.fill();

        //red message ball
        var canvas = document.createElement('canvas');
        MsgBall.prototype.preCanvas[1] = canvas;

        canvas.width = quality * 4 * ballRadius;
        canvas.height = quality * 4 * ballRadius;

        var context = canvas.getContext('2d');
        context.scale(quality, quality);
        MsgBall.prototype.preContext[1] = context;

        //render
        context.beginPath();
        context.arc(2 * ballRadius, 2 * ballRadius, ballRadius, 0, 2*Math.PI, false);
        context.fillStyle = '#EF2B36';
        context.fill();

        context.beginPath();
        context.arc(2 * ballRadius, 2 * ballRadius, 2 * ballRadius - 2, 0, 2 * Math.PI, false);
        context.strokeStyle = "#EF2B36";
        context.lineWidth = 2;
        context.stroke();
    }

    function Object(x, y, radius) {

        var obj = this;

        obj.x = x;
        obj.y = y;
        obj.userId = '';
        obj.isImg = false;
        obj.radius = radius;
        //obj.color = "#658AB0";
        obj.color = __randomColor();
        obj.isActive = true;
        obj.msgNum = 0;
        obj.msgNumPassed = 0;

        obj.velX = 0;
        obj.velY = 0;
        obj.forceX = 0;
        obj.forceY = 0;

        obj.isDragging = false;
        obj.isPrerender = false;
        obj.isMain = false;

        obj.borderWidth = 4;

        // function preparePreRender() {

        //     var imgSize = 2 * obj.radius;
        //     var quality = 5;
        //     obj.preCanvas = document.createElement('canvas');
        //     obj.preCanvas.width = quality * (imgSize + 2 * obj.borderWidth);
        //     obj.preCanvas.height = quality * (imgSize + 2 * obj.borderWidth);
        //     obj.preContext = obj.preCanvas.getContext('2d');
        //     obj.preContext.scale(quality, quality);

        //     //optimizeQuality(obj.preCanvas, obj.preContext);

        //     var centerX = obj.radius + obj.borderWidth;
        //     var centerY = obj.radius + obj.borderWidth;

        //     //draw light
        //     /*obj.preContext.globalCompositeOperation = "lighter";
        //     var grd = obj.preContext.createRadialGradient(centerX, centerY, 10, centerX, centerY, obj.radius);
        //     grd.addColorStop(0, "white");
        //     grd.addColorStop(0.5, "transparent");
        //     obj.preContext.beginPath();
        //     obj.preContext.arc(centerX, centerY, obj.radius, 0, 2*Math.PI, true);
        //     obj.preContext.fillStyle = grd;
        //     obj.preContext.fill();*/

        //     //draw image
        //     obj.preContext.save();
        //     obj.preContext.beginPath();
        //     obj.preContext.arc(centerX, centerY, obj.radius, 0, 2 * Math.PI, true);
        //     obj.preContext.closePath();
        //     obj.preContext.clip();
        //     obj.preContext.drawImage(obj.img, obj.borderWidth, obj.borderWidth, imgSize, imgSize);
        //     obj.preContext.restore();

        //     //draw border
        //     obj.preContext.beginPath();
        //     obj.preContext.arc(centerX, centerY, obj.radius, 0, 2 * Math.PI, true);
        //     obj.preContext.strokeStyle = "#152A50";
        //     obj.preContext.lineWidth = obj.borderWidth;
        //     obj.preContext.stroke();

        //     obj.isPrerender = true;
        // }

        // obj.loadImg = function(imgSrc, callback) {
        //     console.log('load image');

        //     obj.img = new Image();
        //     obj.img.onload = function() {
        //         obj.isImg = true;
        //         if(obj.reloadTimeoutId) {
        //             clearTimeout(obj.reloadTimeoutId);
        //         }
        //         preparePreRender.call(obj);
        //         if(callback) {
        //             callback();
        //         }
        //     }

        //     //try to reload image after 1000 ms
        //     obj.reloadTimes = 0;
        //     obj.reloadTimeoutId = setTimeout(function() {
        //         if(!obj.isImg){
        //             console.log('trying to reload image');
        //             obj.reloadTimes++;
        //             if(reloadTimes > settings.RELOAD_IMAGE_MAX_TIMES) {
        //                 ob.loadImg('images/')
        //             }
        //             else {
        //                 obj.loadImg(imgSrc);
        //             }
        //         }
        //     }, settings.RELOAD_IMAGE_INTERVAL);

        //     obj.img.src = imgSrc;
        // }

        // obj.draw = function(context) {

        //     if(!obj.isActive)
        //         return;

        //     var imgSize = obj.radius * 2;

        //     if(obj.isImg) {

        //         if(obj.isPrerender) {
        //             var dstWidth = 2 * obj.radius + obj.borderWidth;
        //             var dstHeight = dstWidth;
        //             var srcWidth = obj.preCanvas.width;
        //             var srcHeight = obj.preCanvas.height;
        //             var x = obj.x - dstWidth / 2;
        //             var y = obj.y - dstHeight / 2;
        //             context.drawImage(obj.preCanvas, x, y, dstWidth, dstHeight);
        //         }
        //         else {
        //             //draw image
        //             context.save();
        //             context.beginPath();
        //             context.arc(obj.x, obj.y, imgSize / 2, 0, 2 * Math.PI, true);
        //             context.closePath();
        //             context.clip();
        //             context.drawImage(obj.img, obj.x - obj.radius, obj.y - obj.radius, imgSize, imgSize);
        //             context.restore();

        //             //draw border
        //             context.beginPath();
        //             context.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI, true);
        //             context.strokeStyle = "#152A50";
        //             context.lineWidth = 4;
        //             context.stroke();
        //         }

        //     }
        //     else if(obj.isPrerenderDefault) {
        //         var dstWidth = 2 * obj.radius + obj.borderWidth;
        //         var dstHeight = dstWidth;
        //         var srcWidth = obj.preCanvasDefault.width;
        //         var srcHeight = obj.preCanvasDefault.height;
        //         var x = obj.x - dstWidth / 2;
        //         var y = obj.y - dstHeight / 2;
        //         context.drawImage(obj.preCanvasDefault, x, y, dstWidth, dstHeight);
        //     }
        //     else {
        //         context.beginPath();
        //         context.arc(obj.x, obj.y, obj.radius,
        //             0, 2*Math.PI, false);
        //         context.fillStyle = obj.color;
        //         context.fill();

        //         context.beginPath();
        //         context.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI, true);
        //         context.strokeStyle = "#152A50";
        //         context.lineWidth = 4;
        //         context.stroke();
        //     }
        // }

        // obj.contains = function(posX, posY) {
        //     var vecX = obj.x - posX;
        //     var vecY = obj.y - posY;
        //     var distance2 = vecX * vecX + vecY * vecY;
        //     return distance2 <= obj.radius * obj.radius;
        // }
    }

    Object.prototype.preparePreRender = function() {
        var obj = this;
        var imgSize = 2 * obj.radius;
        var quality = 5;
        obj.preCanvas = document.createElement('canvas');
        obj.preCanvas.width = quality * (imgSize + 2 * obj.borderWidth);
        obj.preCanvas.height = quality * (imgSize + 2 * obj.borderWidth);
        obj.preContext = obj.preCanvas.getContext('2d');
        obj.preContext.scale(quality, quality);

        //optimizeQuality(obj.preCanvas, obj.preContext);

        var centerX = obj.radius + obj.borderWidth;
        var centerY = obj.radius + obj.borderWidth;

        //draw light
        /*obj.preContext.globalCompositeOperation = "lighter";
        var grd = obj.preContext.createRadialGradient(centerX, centerY, 10, centerX, centerY, obj.radius);
        grd.addColorStop(0, "white");
        grd.addColorStop(0.5, "transparent");
        obj.preContext.beginPath();
        obj.preContext.arc(centerX, centerY, obj.radius, 0, 2*Math.PI, true);
        obj.preContext.fillStyle = grd;
        obj.preContext.fill();*/

        //draw image
        obj.preContext.save();
        obj.preContext.beginPath();
        obj.preContext.arc(centerX, centerY, obj.radius, 0, 2 * Math.PI, true);
        obj.preContext.closePath();
        obj.preContext.clip();
        obj.preContext.drawImage(obj.img, obj.borderWidth, obj.borderWidth, imgSize, imgSize);
        obj.preContext.restore();

        //draw border
        obj.preContext.beginPath();
        obj.preContext.arc(centerX, centerY, obj.radius, 0, 2 * Math.PI, true);
        obj.preContext.strokeStyle = "#152A50";
        obj.preContext.lineWidth = obj.borderWidth;
        obj.preContext.stroke();

        obj.isPrerender = true;
    }

    Object.prototype.loadImg = function(imgSrc, delay) {

        var obj = this;
        obj.img = new Image();
        obj.img.crossOrigin = "anonymous";
        obj.img.onload = function() {
            obj.isImg = true;
            if(obj.reloadTimeoutId) {
                clearTimeout(obj.reloadTimeoutId);
            }
            obj.preparePreRender();
        }

        //try to reload image after 1000 ms
        obj.reloadTimes = 0;
        obj.reloadTimeoutId = setTimeout(function() {
            if(!obj.isImg){
                obj.reloadTimes++;
                if(reloadTimes > settings.RELOAD_IMAGE_MAX_TIMES) {
                    ob.loadImg('images/camera_100.gif');
                }
                else {
                    obj.loadImg(imgSrc);
                }
            }
        }, settings.RELOAD_IMAGE_INTERVAL);

        if(delay) {
            setTimeout(function() {
                obj.img.src = imgSrc;
            }, delay);
        }
        else {
            obj.img.src = imgSrc;
        }
    }

    Object.prototype.draw = function(context) {

        var obj = this;
        if(!obj.isActive)
                return;

        var imgSize = obj.radius * 2;

        if(obj.isImg) {

            if(obj.isPrerender) {
                var dstWidth = 2 * obj.radius + obj.borderWidth;
                var dstHeight = dstWidth;
                var srcWidth = obj.preCanvas.width;
                var srcHeight = obj.preCanvas.height;
                var x = obj.x - Math.round(dstWidth / 2);
                var y = obj.y - Math.round(dstHeight / 2);
                context.drawImage(obj.preCanvas, x, y, dstWidth, dstHeight);
            }
            else {
                //draw image
                context.save();
                context.beginPath();
                context.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI, true);
                context.closePath();
                context.clip();
                context.drawImage(obj.img, obj.x - obj.radius, obj.y - obj.radius, imgSize, imgSize);
                context.restore();

                //draw border
                context.beginPath();
                context.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI, true);
                context.strokeStyle = "#152A50";
                context.lineWidth = 4;
                context.stroke();
            }

        }
        else if(obj.isPrerenderDefault) {
            var dstWidth = 2 * obj.radius + obj.borderWidth;
            var dstHeight = dstWidth;
            var srcWidth = obj.preCanvasDefault.width;
            var srcHeight = obj.preCanvasDefault.height;
            var x = obj.x - Math.round(dstWidth / 2);
            var y = obj.y - Math.round(dstHeight / 2);
            context.drawImage(obj.preCanvasDefault, x, y, dstWidth, dstHeight);
        }
        else {
            var globalA = context.globalAlpha;
            context.globalAlpha = 0.1;
            context.beginPath();
            context.arc(obj.x, obj.y, obj.radius,
                0, 2*Math.PI, false);
            context.fillStyle = obj.color;
            context.fill();
            context.globalAlpha = globalA;

            // context.beginPath();
            // context.arc(obj.x, obj.y, obj.radius, 0, 2 * Math.PI, true);
            // context.strokeStyle = "#152A50";
            // context.lineWidth = 4;
            // context.stroke();
        }
    }

    Object.prototype.contains = function(posX, posY) {
        var obj = this;
        var vecX = obj.x - posX;
        var vecY = obj.y - posY;
        var distance2 = vecX * vecX + vecY * vecY;
        return distance2 <= obj.radius * obj.radius;
    }

    Object.prototype.getQuadTreeInfo = function(index) {
        return {
            x: this.x - 300,
            y: this.y - 300,
            width: 600,
            height: 600,
            index: index
        }
    }

    function loadObjectDefaultImg() {
        Object.prototype.defaultImg = new Image();
        var defaultImg = Object.prototype.defaultImg;

        Object.prototype.isDefaultImgLoaded = false;
        defaultImg.onload = function() {
            Object.prototype.isDefaultImgLoaded = true;
            preRenderObjectDefaultImg();
        }
        defaultImg.src = settings.DEFAULT_IMAGE_100_SRC;
    }

    function preRenderObjectDefaultImg() {
        var borderWidth = 4;
        var radius = 25;
        var imgSize = 2 * radius;
        var quality = 5;

        Object.prototype.preCanvasDefault = document.createElement('canvas');
        var canvas = Object.prototype.preCanvasDefault;
        Object.prototype.preCanvasDefault.width = quality * (imgSize + 2 * borderWidth);
        Object.prototype.preCanvasDefault.height = quality * (imgSize + 2 * borderWidth);
        Object.prototype.preContextDefault = canvas.getContext('2d');
        var context = Object.prototype.preContextDefault;
        Object.prototype.preContextDefault.scale(quality, quality);

        var centerX = radius + borderWidth;
        var centerY = radius + borderWidth;

        //draw image
        context.save();
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, 2 * Math.PI, true);
        context.closePath();
        context.clip();
        context.drawImage(Object.prototype.defaultImg, borderWidth, borderWidth, imgSize, imgSize);
        context.restore();

        //draw border
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, 2 * Math.PI, true);
        context.strokeStyle = "#152A50";
        context.lineWidth = borderWidth;
        context.stroke();

        Object.prototype.isPrerenderDefault = true;
    }

    cmm.start = function(timeCoeffNew) {
        if(!inited) return;
        renderTimeStart = new Date();
        timeCoeff = timeCoeffNew;
        animSpeedCoeff = getAnimCoeff(timeCoeff);
        cmm.stopped = false;
        animate();
    }

    cmm.continue = function(timeCoeffNew) {
        if(!inited) return;
        if(!cmm.paused) return;
        if(cmm.starting || cmm.stopping) {
            return;
        }
        timeCoeff = timeCoeffNew;
        animSpeedCoeff = getAnimCoeff(timeCoeff);
        cmm.paused = false;
        app.onAnimationContinued();
    }

    cmm.pause = function() {
        if(!inited) return;
        if(cmm.paused) return;
        if(cmm.starting || cmm.stopping) {
            return;
        }
        timeCoeff = 0.0;
        cmm.paused = true;
        app.onAnimationPaused();
    }

    cmm.stop = function() {
        if(!inited) return;
        cmm.stopped = true;
        if(requestAnimationFrameId) {
            cancelAnimationFrame(requestAnimationFrameId);
            requestAnimationFrameId = null;
        }
    }

    cmm.init = function() {

        canvas = document.getElementById('canvas-main');

        containerW = window.innerWidth;
        containerH = window.innerHeight;
        canvas.width = containerW;
        canvas.height = containerH;

        context = canvas.getContext('2d');
        //optimize canvas size and scale for better visualization
        optimizeQuality(canvas, context);
        context.imageSmoothingEnabled = true;

        maxBallsOnPage = userSettings.maxMsgNumAnim;
        maxObjectsNum = userSettings.maxUsersNumAnim;

        bindHandlers();

        initValues();
        initData();
        initObjects();
        initMsgBallsBuffer();
        //prerender message ball
        prepareMsgBallsPreRender();
        //load default image for objects
        Object.prototype.isDefaultImgLoaded = false;
        Object.prototype.isPrerenderDefault = false;
        loadObjectDefaultImg();

        //change time
        cmm.changeTimeF(startTimeFraсtion);
        inited = true;
    }

    cmm.graduallyAddObjects = function (value, maxValue) {
        var rnd = 500 + 3000 * Math.round();
        cmm.setObjectsNum(value);
        if(value < maxValue) {
            setTimeout(function() {
                value += min(10, maxValue - value);
                cmm.graduallyAddObjects(value, maxValue);
            }, rnd);
        }
    }

    cmm.clearData = function() {

        //delete references only
        msgUids = [];
        msgMids = [];
        msgDate = [];
        msgOut  = [];

        cmm.topUids = [];
        objects = [];
        msgBallsBuffer = [];
        fpsValues = [];
        objRefByUid = {};

        mainObject = null;
        overObject = null;
        draggingObject = null;
        overMsg = null;

        canvas = null;
        context = null;

        quadTree = null;

        MsgBall.prototype.preCanvas = [];
        MsgBall.prototype.preContext = [];

        Object.prototype.preCanvasDefault = null;
        Object.prototype.preContextDefault = null;

        Object.prototype.defaultImg = null;

        //unbind handles
        unbindHandlers();

        inited = false;
    }

    cmm.resize = function(width, height) {
    	if(!inited) return;
    	containerW = width;
        containerH = height;

        canvas.width = containerW;
        canvas.height = containerH;

        optimizeQuality(canvas, context);

        translatePos = {
        	x: width / 2,
        	y: height / 2
        }
    }

    function bindHandlers() {

        $('#canvas-main').mousemove(handleMouseMove);
        $('#canvas-main').mouseout(handleMouseOut);
        $('#canvas-main').click(handleMouseClick);
        $('#canvas-main').bind('mousewheel', handleMouseWheel);
        $('#canvas-main').mousedown(handleMouseDown);
        $('#canvas-main').mouseup(handleMouseUp);
        $('#canvas-main').mouseover(handleMouseOver);
        $('body').keyup(handleKeyUp);
        $(window).resize(handleResize);
    }

    function unbindHandlers() {

        $('#canvas-main').unbind('mousemove', handleMouseMove);
        $('#canvas-main').unbind('mouseout', handleMouseOut);
        $('#canvas-main').unbind('click', handleMouseClick);
        $('#canvas-main').unbind('mousewheel', handleMouseWheel);
        $('#canvas-main').unbind('mousedown', handleMouseDown);
        $('#canvas-main').unbind('mouseup', handleMouseUp);
        $('#canvas-main').unbind('mouseover', handleMouseOver);
        $('body').unbind('keyup', handleKeyUp);
        $(window).unbind('resize', handleResize);
    }

    function initValues() {

        timeCoeff = 100000;
        var value = ui.speedSlider.slider('value');
        timeCoeff = $.fn.speedSliderConvert(value);
        animSpeedCoeff = getAnimCoeff(timeCoeff);
        animSpeedCoeffSave = animSpeedCoeff;

        startTimeFraсtion = 0.6;
        ballSpeedCoeff = 8;

        scale = initialScale;

        requestAnimationFrameId = null;

        mousePos = {
            x: 99999,
            y: 99999
        };

        translatePos = {
            x: containerW / 2,
            y: containerH / 2
        };

        var maxLevels = 4;
        var maxObjectsOnLevel = 50;
        var maxWindowWidth = containerW / minScale;
        var maxWindowHeight = containerH / minScale;
        var maxSideWidth = max(maxWindowWidth, maxWindowHeight);
        var halfSideWidth = Math.round(maxSideWidth / 2);
        quadTree = new Quadtree({
            x: -halfSideWidth,
            y: -halfSideWidth,
            width: maxSideWidth,
            height: maxSideWidth
        }, maxObjectsOnLevel, maxLevels);

        mouseDown = false;
        draggingObject = null;
        overMsg = null;
        overObject = null;
        isDragging = false;
        cmm.finished = false;

        cmm.paused = false;
        cmm.stopped = false;

        cmm.starting = false;
        cmm.stopping = false;

        timeElapsed = 0;
        time = 0;

        renderTimeElased = 0;

        msgPassed = 0;

        msgBallsBuffer = [];

        fpsValues = [];
        fpsAverage = 60.0;
    }

    function initData() {
        //init data (copy references)
        msgUids = dm.msgData.uids;
        msgMids = dm.msgData.mids;
        msgDate = dm.msgData.date;
        msgOut  = dm.msgData.out;

        //messages viewed at current moment
        msgPassed = 0;
        //first message date, period length
        cmm.firstMsgDate = dm.startDate;
        cmm.periodLen = dm.periodLen;
        //create topUids (more constrains)
        cmm.topUids = [];
        var uid, msgNum;
        for(var i = 0; i < dm.topUids.length; i++) {
            uid = dm.topUids[i];
            cmm.topUids.push(uid);
            if(cmm.topUids.length > maxObjectsNum) {
                break;
            }
        }
    }

    function initObjects() {

        var centerPointX = 0;
        var centerPointY = 0;

        //create main object
        mainObject = new Object(centerPointX, centerPointY, 50);
        mainObject.userId = 'self';
        mainObject.firstName = account.profile.first_name;
        mainObject.lastName = account.profile.last_name;
        mainObject.screenName = account.profile.screen_name;
        mainObject.msgNum = msgOut.length;
        mainObject.outMsgNum = nonzeroNumber(msgOut);
        mainObject.inMsgNum = mainObject.msgNum - mainObject.outMsgNum;
        mainObject.isMain = true;
        mainObject.loadImg(account.profile.photo_100);

        var objectsNum = cmm.topUids.length;

        //create other objects
        objRefByUid = {};
        objects = [];

        cmm.graduallyAddObjects(10, objectsNum);
        return;

        var angle = 0;
        var angleStep = 2 *Math.PI / objectsNum;
        var radiusX = 1000;
        var radiusY = 1000;
        var x, y, angle, object, uid;
        for(var i = 0; i < cmm.topUids.length; i++) {
            x = radiusX * Math.cos(angle);
            y = radiusY * Math.sin(angle);
            angle += angleStep;
            //x = uniformRandom(-radiusX, radiusX);
            //y = uniformRandom(-radiusY, radiusY);
            object = new Object(x, y, 25);
            uid = cmm.topUids[i];
            object.userId = uid.toString();
            object.msgNum = dm.uidMsgs[uid].length;

            //compute oucoming message number
            object.outMsgNum = 0;
            for(var k = 0; k < object.msgNum; k++) {
                var idx = dm.uidMsgs[uid][k];
                var out = msgOut[idx];
                if(out) object.outMsgNum++;
            }

            object.inMsgNum = object.msgNum - object.outMsgNum;
            objRefByUid[object.userId] = object;
            objects.push(object);
        }

        //push users data to objects
        var uid, object;
        var imgNumLoaded = 0;
        for(var i = 0; i < cmm.topUids.length; i++) {
            uid = cmm.topUids[i];
            object = objRefByUid[uid];
            //assumption: usersData is arranged accordingly
            var idx = dm.usersDataRefByUid[uid];
            object.firstName = dm.usersData[idx].first_name;
            object.lastName = dm.usersData[idx].last_name;
            object.screenName = dm.usersData[idx].screen_name;
            object.loadImg(dm.usersData[idx].photo_100);
        }
    }

    function initMsgBallsBuffer() {
        //create buffer
        msgBallsBuffer = [];

        //init geomerty
        for(var i = 0; i < bufferSize; i++) {
            var particle = new MsgBall();
            msgBallsBuffer.push(particle);
        }
        lastBufferIndex = 0;
    }

    cmm.changeTime = function(timeNew) {
        if(timeNew < cmm.firstMsgDate) {
            timeNew = cmm.firstMsgDate;
        }
        else if(timeNew > cmm.firstMsgDate + cmm.periodLen) {
            timeNew = cmm.firstMsgDate + cmm.periodLen;
        }

        var fraction = (timeNew - cmm.firstMsgDate) / cmm.periodLen;
        cmm.changeTimeF(fraction);
    }

    cmm.changeTimeF = function(fraction) {

        if(fraction < 1) {
            cmm.finished = false;
        }

        renderTimeElased = 0;
        cmm.startTimeOffset = Math.round(fraction * cmm.periodLen);
        time = cmm.firstMsgDate + cmm.startTimeOffset;

        $.each(objRefByUid, function(key, value) {
            value.msgNumPassed = 0;
        });

        timeElapsed = 0;
        msgPassed = 0;

        while(msgPassed < msgDate.length && msgDate[msgPassed] <= time) {
            uid = msgUids[msgPassed];
            if(objRefByUid[uid]) {
                objRefByUid[uid].msgNumPassed++;
            }
            msgPassed++;
        }
    }

    cmm.getTime = function() {
        return time;
    }

    cmm.changeTimeCoeff = function(value) {
    	if(cmm.starting || cmm.stopping) {
            return;
        }
        timeCoeff = value;
        animSpeedCoeff = getAnimCoeff(timeCoeff);
    }

    cmm.setMaxBallsNum = function(value) {
        maxBallsOnPage = value;
    }

    cmm.setObjectsNum = function(value) {
        maxObjectsNum = value;

        if(objects.length > value) {
            //descrease objects number
            objects.length = value;
            cmm.topUids.length = min(value, cmm.topUids.length);
        }
        else if(objects.length < value) {
            //increase objects number
            var count = min(dm.topUids.length, value)
            for(var i = cmm.topUids.length; i < count; i++) {
                uid = dm.topUids[i];
                cmm.topUids.push(uid);
                if(cmm.topUids.length >= maxObjectsNum) {
                    break;
                }
            }
            //add new objects
            var angle = 0;
            var objectsToAdd = count - objects.length;
            var angleStep = 2 * Math.PI / objectsToAdd;
            var radiusX = 1800;
            var radiusY = 1800;
            var x, y, angle, object, uid;
            var diff = cmm.topUids.length - objects.length;
            var idxStart = objects.length, idxEnd = objects.length + objectsToAdd;
            for(var i = idxStart; i < idxEnd; i++) {
                var trnd =  Math.random();
                var tempRadius = uniformRandom(1300, 1600);
                x = tempRadius * Math.cos(2 * Math.PI * trnd);
                y = tempRadius * Math.sin(2 * Math.PI * trnd);
                angle += angleStep;
                object = new Object(x, y, 25);
                uid = cmm.topUids[i % cmm.topUids.length];
                object.userId = uid.toString();
                object.msgNum = dm.uidMsgs[uid].length;

                //compute oucoming message number and messages already passed
                object.outMsgNum = 0;
                object.msgNumPassed = 0;
                for(var k = 0; k < object.msgNum; k++) {
                    var idx = dm.uidMsgs[uid][k];

                    var out = msgOut[idx];
                    var date = msgDate[idx];

                    if(out) object.outMsgNum++;

                    if(date < time) {
                        object.msgNumPassed++;
                    }
                }
                //compute incoming message number
                object.inMsgNum = object.msgNum - object.outMsgNum;

                //index to usersData
                var idx = dm.usersDataRefByUid[uid];
                object.firstName = dm.usersData[idx].first_name;
                object.lastName = dm.usersData[idx].last_name;
                object.screenName = dm.usersData[idx].screen_name;

                var photo_100 = dm.usersData[idx].photo_100;
                var delay = 400 + 10 * diff * Math.random();
                object.loadImg(photo_100, delay);

                objRefByUid[object.userId] = object;
                objects.push(object);
            }
        }
    }

    function getAnimCoeff(timeCoeff) {
        if(cmm.maxTimeCoeff == undefined) {
            cmm.maxTimeCoeff = $.fn.speedSliderConvert(ui.speedSliderMaxValue);
        }
        return 0.8 + 1.4 * timeCoeff / cmm.maxTimeCoeff;
    }

    cmm.pauseSmoothly = function(msec, callback) {
        if(!inited) return;
        if(cmm.paused) {
            return;
        }
        if(cmm.starting || cmm.stopping) {
            return;
        }
        app.onAnimationPaused();
        cmm.stopping = true;

        animSpeedCoeffSave = animSpeedCoeff;

        var num = Math.floor(msec / 25);

        var coeffs = {};
        coeffs.timeMultiplier = Math.pow(minTimeCoeff / timeCoeff, 25.0 / msec);
        coeffs.animMultiplier = Math.pow(minAnimSpeedCoeff / animSpeedCoeffSave, 25.0 / msec);

        setTimeout(smoothlyFrame, 5, num, coeffs, function() {
            animSpeedCoeff = 0.0;
            timeCoeff = 0.0;
            cmm.stopping = false;
            cmm.paused = true;
            callback();
        });
    }

    cmm.continueSmoothly = function(timeCoeffNew, msec, callback) {
        if(!inited) return;
        if(!cmm.paused) {
            return;
        }
        if(cmm.starting || cmm.stopping) {
            return;
        }
        app.onAnimationContinued();
        cmm.starting = true;
        cmm.paused = false;

        var num = Math.floor(msec / 25);

        timeCoeff = minTimeCoeff;
        animSpeedCoeff = minAnimSpeedCoeff;
        animSpeedCoeffNew = getAnimCoeff(timeCoeffNew);

        var coeffs = {};
        coeffs.animMultiplier = Math.pow(animSpeedCoeffNew / minAnimSpeedCoeff, 25.0 / msec);
        coeffs.timeMultiplier = Math.pow(timeCoeffNew / minTimeCoeff, 25.0 / msec);

        setTimeout(smoothlyFrame, 5, num, coeffs, function() {
            cmm.starting = false;
            timeCoeff = timeCoeffNew;
            animSpeedCoeff = animSpeedCoeffNew;
            callback();
        });
    }

    function smoothlyFrame(num, coeffs, callback) {
        if(num > 0) {
            animSpeedCoeff *= coeffs.animMultiplier;
            timeCoeff *= coeffs.timeMultiplier;
            num--;
            setTimeout(smoothlyFrame, 25, num, coeffs, callback);
        }
        else {
            callback();
        }
    }

    function animate() {

        if(cmm.stopped) {
            return;
        }

        requestAnimationFrameId = requestAnimationFrame(animate);

        //is finished
        if(time - cmm.firstMsgDate >= cmm.periodLen + 100) {
            cmm.finished = true;

        }
        if(cmm.finished && lastBufferIndex == 0) {
            app.onVisualizationFinished();
        }

        //calculate time
        renderTimeEnd = new Date();
        renderDelta = renderTimeEnd - (renderTimeStart || renderTimeEnd);

        if(renderDelta >= 100) {
            renderDelta = 100;
        }

        renderTimeElased = renderDelta + renderTimeElased;
        timeElapsed = timeCoeff * renderDelta + timeElapsed;
        renderTimeStart = renderTimeEnd;

        computeFps(renderDelta);

        //update objects
        if(!cmm.paused) {
            updateStage(renderDelta);
        }

        //draw
        draw(context);

        //compute current date
        if(!cmm.finished) {
            time = timeElapsed / 1000.0 + cmm.startTimeOffset + cmm.firstMsgDate;
        }

        //update page DOM elements
        pageUpdate(renderDelta);
        updateOverCanvas(renderDelta);
    }

    function pageUpdate(renderDelta) {

        var updateInterval = 50;

        if(cmm.pageTimeElapsed == undefined) {
            cmm.pageTimeElapsed = 99999;
        }

        if(cmm.pageTimeElapsed > updateInterval) {
            var fraction = 1.0 * (time - cmm.firstMsgDate) / cmm.periodLen;
            var params = {fraction:fraction, time:time, fps:fpsAverage};
            app.onFrameUpdated(params);
            cmm.pageTimeElapsed = 0;
        }

        cmm.pageTimeElapsed += renderDelta;
    }

    function updateOverCanvas(renderDelta) {
        var updateInterval = 1000 / 60.0;

        if(cmm.tTimeElapsed == undefined) {
            cmm.tTimeElapsed = 99999;
        }

        if(cmm.tTimeElapsed > updateInterval) {
            if(ui.isDateMenuVisible) {
                canvas_time_module.draw(time);
            }
            if(ui.isContactBoxVisible) {
                canvas_mini_chart.draw(time);
            }
            cmm.tTimeElapsed = 0;
        }

        cmm.tTimeElapsed += renderDelta;
    }

    function computeFps(renderDelta) {

        var fps;
        if(renderDelta == 0) {
            fps = 60;
        }
        else {
            fps = 1000 / renderDelta;
        }

        //put new value
        var fpsCountToAverage = 10;
        if(fpsValues.length > fpsCountToAverage)
            fpsValues.shift();
        fpsValues.push(fps);

        //compute average fps
        fpsAverage = 0;
        for(var i = 0; i < fpsValues.length; i++) {

            fpsAverage += fpsValues[i];
        }
        fpsAverage /= fpsValues.length;
    }

    function updateStage(deltaTime) {
        //clear quadTree
        quadTree.clear();

        //clear forces
        for(var i = 0; i < objects.length; i++) {
            objects[i].forceX = 0;
            objects[i].forceY = 0;
            quadTree.insert(objects[i].getQuadTreeInfo(i));
            objects[i].checkedAlready = false;
        }
        mainObject.forceX = 0;
        mainObject.forceY = 0;

        updateMsgBalls(deltaTime); //first update msg balls
        updateObjects(deltaTime);
    }

    function updateObjects(deltaTime) {

        //compute forces
        var dirX, dirY, distance, distance2, forceCoeff;
        var forceX, forceY;
        var frictionForceCoeff, frictionForceX, frictionForceY;
        for(var i = 0; i < objects.length; i++) {

            var nearestObjects = quadTree.retrieve(objects[i].getQuadTreeInfo(i));

            //interaction between objects
            for(var k = 0; k < nearestObjects.length; k++) {

                var objIndex = nearestObjects[k].index;
                var nearObj = objects[objIndex];

                if(nearObj.checkedAlready) {
                    continue;
                }

                dirX = objects[i].x - nearObj.x;
                dirY = objects[i].y - nearObj.y;

                distance2 = dirX * dirX + dirY * dirY;

                // if(distance2 <= 100) distance2 = 100.0;
                // forceCoeff = 300;
                // forceX = forceCoeff * dirX / distance2;
                // forceY = forceCoeff * dirY / distance2;

                var distance4 = distance2 * distance2;
                if(distance4 <= 10000000) distance4 = 10000000.0;
                forceCoeff = 5000000;

                forceX = forceCoeff * dirX / distance4;
                forceY = forceCoeff * dirY / distance4;

                objects[i].forceX += forceX;
                objects[i].forceY += forceY;

                nearObj.forceX += -forceX;
                nearObj.forceY += -forceY;

            }

            objects[i].checkedAlready = true;

            if(objects[i].isDragging) {
                continue;
            }

            //interaction with main ball
            dirX = objects[i].x - mainObject.x;
            dirY = objects[i].y - mainObject.y;
            distance2 = dirX * dirX + dirY * dirY;
            if(distance2 <= 2500) distance2 = 2500.0;
            distance = Math.sqrt(distance2);

            //force away
            forceCoeff = 50000;
            forceX = forceCoeff * dirX / Math.pow(distance, 2);
            forceY = forceCoeff * dirY / Math.pow(distance, 2);

            objects[i].forceX += forceX;
            objects[i].forceY += forceY;

            //friction force
            frictionForceCoeff = 0.4;
            frictionForceX = -objects[i].velX * frictionForceCoeff;
            frictionForceY = -objects[i].velY * frictionForceCoeff;

            objects[i].forceX += frictionForceX;
            objects[i].forceY += frictionForceY;

            //gravity force
            forceCoeff = 0.005 * Math.log(1 + 0.1 * (objects[i].msgNumPassed + 10));
            forceX = forceCoeff * (-dirX) * Math.log(distance);
            forceY = forceCoeff * (-dirY) * Math.log(distance);

            objects[i].forceX += forceX;
            objects[i].forceY += forceY;

        }

         var maxForceValue = 100;

        //compute velocity and movement
        for(var i = 0; i < objects.length; i++) {

            if(objects[i].isDragging) {
                continue;
            }

            //max force
            if(objects[i].forceX > maxForceValue) {
                objects[i].forceX =  maxForceValue
            }
            else if(objects[i].forceX < -maxForceValue) {
                objects[i].forceX =  -maxForceValue
            }

            if(objects[i].forceY > maxForceValue) {
                objects[i].forceY =  maxForceValue
            }
            else if(objects[i].forceY < -maxForceValue) {
                objects[i].forceY =  -maxForceValue
            }

            //velocity
            objects[i].velX += objects[i].forceX;
            objects[i].velY += objects[i].forceY;
            //movement
            objects[i].x += objects[i].velX;
            objects[i].y += objects[i].velY;
        }

        //main object
        if(!mainObject.isDragging) {
            //interaction with main ball
            var gCenterX = 0, gCenterY = 0;
            dirX = mainObject.x - gCenterX;
            dirY = mainObject.y - gCenterY;
            distance2 = dirX * dirX + dirY * dirY;
            if(distance2 <= 2500) distance2 = 2500.0;
            distance = Math.sqrt(distance2);
            //gravity force
            forceCoeff = 0.005;
            forceX = forceCoeff * (-dirX) * Math.log(1 + distance);
            forceY = forceCoeff * (-dirY) * Math.log(1 + distance);

            mainObject.forceX += forceX;
            mainObject.forceY += forceY;

            //friction force
            frictionForceCoeff = 0.4;
            frictionForceX = -mainObject.velX * frictionForceCoeff;
            frictionForceY = -mainObject.velY * frictionForceCoeff;

            mainObject.forceX += frictionForceX;
            mainObject.forceY += frictionForceY;
            //velocity
            mainObject.velX += mainObject.forceX;
            mainObject.velY += mainObject.forceY;
            //movement
            mainObject.x += mainObject.velX;
            mainObject.y += mainObject.velY;
        }
    }

    function updateMsgBalls(deltaTime) {

        for(var i = 0; i < lastBufferIndex;) {
            msgBallsBuffer[i].step(deltaTime);
            if(msgBallsBuffer[i].isArrived() == true) {

                //add force to dest object
                msgBallsBuffer[i].destObj.forceX += 0.01 * msgBallsBuffer[i].velX;
                msgBallsBuffer[i].destObj.forceY += 0.01 * msgBallsBuffer[i].velY;
                msgBallsBuffer[i].x = 100000 //make invisible

                //swap (!important) last element and current
                var msgBallTemp = msgBallsBuffer[i];
                msgBallsBuffer[i] = msgBallsBuffer[lastBufferIndex - 1];
                msgBallsBuffer[lastBufferIndex - 1] = msgBallTemp;
                //delete last (it was current) element
                lastBufferIndex--;
            }
            else {
                i++;
            }
        }

        //add new message balls
        var msgBallsToAdd = (maxBallsOnPage - lastBufferIndex);

        var uid, canAdd;
        var t, dirX, dirY, rnd, initalVelocity;
        var velX, velY;
        var msg, ballTemp;
        while(msgPassed < msgDate.length && msgDate[msgPassed] <= time) {
            uid = msgUids[msgPassed];
            canAdd = msgBallsToAdd > 0 && lastBufferIndex < bufferSize;
            if(objRefByUid[uid] && canAdd) {
                //random velocity direction
                t = uniformRandom(0, 2*Math.PI);
                dirX = Math.cos(t);
                dirY = Math.sin(t);

                rnd = Math.random();
                initalVelocity = rnd * ballSpeedCoeff;
                velX = Math.round(initalVelocity * dirX + 0);
                velY = Math.round(initalVelocity * dirY + 0);

                msg = {};
                msg.out = msgOut[msgPassed];
                msg.index = msgPassed;

                if(msgOut[msgPassed]) {
                    msgBallsBuffer[lastBufferIndex].init(mainObject, objRefByUid[uid], velX, velY, msg);
                }
                else {
                    msgBallsBuffer[lastBufferIndex].init(objRefByUid[uid], mainObject, velX, velY, msg);
                }

                lastBufferIndex++;
                msgBallsToAdd--;
            }
            if(objRefByUid[uid]) {
                objRefByUid[uid].msgNumPassed++;
            }
            msgPassed++;
        }
    }

    function draw(context) {

        clearCanvas(context);

        context.save();
        context.translate(translatePos.x, translatePos.y);
        context.scale(scale, scale);

        //draw message balls
        var preCanvas, width, height;
        for(var i = 0; i < lastBufferIndex; i++) {
            preCanvas = msgBallsBuffer[i].preCanvas[0];
            width = 2 * msgBallsBuffer[i].radius;
            height = 2 * msgBallsBuffer[i].radius;
            context.drawImage(preCanvas, msgBallsBuffer[i].x - width / 2, msgBallsBuffer[i].y - height / 2, width, height);
            /*context.beginPath();
            context.arc(msgBallsBuffer[i].x, msgBallsBuffer[i].y, msgBallsBuffer[i].radius,
                0, 2*Math.PI, false);
            context.fillStyle = msgBallsBuffer[i].color;
            context.fill();*/
        }

        if(overMsg != null) {
            preCanvas = overMsg.preCanvas[1];
            width = 4 * overMsg.radius;
            height = 4 * overMsg.radius;
            context.drawImage(preCanvas, overMsg.x - width / 2, overMsg.y - height / 2, width, height);
        }


        mainObject.draw(context);

        for(var i = 0; i < objects.length; i++) {
            objects[i].draw(context);
        }

        if(overObject != null) {
            //draw border
            context.beginPath();
            context.arc(overObject.x, overObject.y, overObject.radius - 2, 0, 2 * Math.PI, true);
            //context.strokeStyle = "#152A50";
            context.strokeStyle = "#658AB0";
            context.lineWidth = 4;
            context.stroke();
        }

        context.restore();
    }

    function clearCanvas(context) {
        //context.fillStyle = "rgba(250, 250, 250, 0.5)";
        //context.fillRect(0, 0, canvas.width, canvas.height);
        context.clearRect(0, 0, canvas.width, canvas.height);
    }

    cmm.toScreenCoordinates = function(x, y) {
        var pos = {};
        pos.x = (x * scale + translatePos.x);
        pos.y = (y * scale + translatePos.y);
        return pos;
    }

    cmm.toCanvasCoordinates = function(x, y) {
        var pos = {};
        pos.x = (x - translatePos.x) / scale;
        pos.y = (y - translatePos.y) / scale;
        return pos;
    }

    //event handlers
    function handleMouseOut() {
        mousePos.x = 99999;
        mousePos.y = 99999;
        if(draggingObject) {
            draggingObject.isDragging = false;
        }
        mouseDown = false;
        draggingObject = null;
    }

    function handleMouseWheel(e) {
        var evt = e.originalEvent;
        var delta = evt.wheelDelta;
        var x = (evt.x - translatePos.x) / scale;
        var y = (evt.y - translatePos.y) / scale;
        var scaleOld = scale;
        if(delta > 0) {
            scale /= scaleMultiplier;
        }
        else {
            scale *= scaleMultiplier;
        }
        if(scale < minScale) {
        	scale = minScale;
        }
        else if(scale > maxScale) {
        	scale = maxScale;
        }
        translatePos.x += (scaleOld - scale) * x;
        translatePos.y += (scaleOld - scale) * y;
        ui.updatePopupMsgPos();
    }

    function handleMouseDown(evt) {

        mouseDown = true;
        isDragging = false;

        mousePos.x = evt.clientX;
        mousePos.y = evt.clientY;
        lastMousePos.x = evt.clientX;
        lastMousePos.y = evt.clientY;
        //mouse position in canvas coord
        canvasMousePos.x = (evt.clientX - translatePos.x) / scale;
        canvasMousePos.y = (evt.clientY - translatePos.y) / scale;

        canvasLastMousePos.x = canvasMousePos.x;
        canvasLastMousePos.y = canvasMousePos.y;

        draggingObject = null;

        if(!cmm.paused && !cmm.stopping) {

            if(overObject != null) {
                draggingObject = overObject;
                draggingObject.isDragging = true;
            }
        }
    }

    function handleMouseUp(evt) {

        canvasMousePos.x = (evt.clientX - translatePos.x) / scale;
        canvasMousePos.y = (evt.clientY - translatePos.y) / scale;

        if(!isDragging) {
            //clicked event
            if(cmm.paused) {

                if(overMsg != null) {

                    var pos = {
                       x: overMsg.x,
                       y: overMsg.y
                    };

                    var index = overMsg.msg.index;
                    var mid = msgMids[index];

                    var sourceObjTmp = overMsg.sourceObj;
                    var destObjTmp = overMsg.destObj;
                    vk.loadOneMessage(mid, function(midLoaded, msgBody) {
                        if(mid != midLoaded){
                            return;
                        }
                        var params = {
                            msg: msgBody,
                            userFrom: sourceObjTmp,
                            userTo: destObjTmp
                        }
                        ui.setPopupMsgData(params);
                    }, function() {

                    });

                    var params = {
                        msg: '...',
                        userFrom: overMsg.sourceObj,
                        userTo: overMsg.destObj
                    }

                    ui.hidePopupMsg();
                    ui.setPopupMsgData(params);
                    ui.showPopupMsg(pos);
                    evt.stopPropagation();

                }
            }

        }
        else {
            evt.stopPropagation();
        }
        if(draggingObject) {
            evt.stopPropagation();
            draggingObject.isDragging = false;
        }
        if(overObject != null) {
            ui.showContactBox(0, overObject, true);
            evt.stopPropagation();
        }
        isDragging = false;
        mouseDown = false;
        draggingObject = null;
    }

    function handleMouseMove(evt) {

        if(evt.clientX == mousePos.x && evt.clientY == mousePos.y) {
           //bug in Chrome, actiually mouse didn't move
           return;
        }

        mousePos.x = evt.clientX;
        mousePos.y = evt.clientY;
        canvasMousePos.x = (evt.clientX - translatePos.x) / scale;
        canvasMousePos.y = (evt.clientY - translatePos.y) / scale;
        if(mouseDown) {
            if(draggingObject) {
                draggingObject.x = draggingObject.x + (mousePos.x - lastMousePos.x) / scale;
                draggingObject.y = draggingObject.y + (mousePos.y - lastMousePos.y) / scale;

                var velX = (mousePos.x - lastMousePos.x) / scale;
                var velY = (mousePos.y - lastMousePos.y) / scale;

                //draggingObject.velX = Math.abs(velX) < 20 ? velX : 20 * sign(velX);
                //draggingObject.velY = Math.abs(velY) < 20 ? velY : 20 * sign(velY);
                canvasLastMousePos.x = canvasMousePos.x;
                canvasLastMousePos.y = canvasMousePos.y;
            }
            else {
                //dragging canvas
                isDragging = true;
                translatePos.x = translatePos.x + mousePos.x - lastMousePos.x;
                translatePos.y = translatePos.y + mousePos.y - lastMousePos.y;

                ui.updatePopupMsgPos();
            }
            lastMousePos.x = mousePos.x;
            lastMousePos.y = mousePos.y;
        }
        else {

            var overObjectLast = overObject;
            overObject = null;
            if(mainObject.contains(canvasMousePos.x, canvasMousePos.y)) {
                overObject = mainObject;
            }
            else {
               for(var i = 0; i < objects.length; i++) {
                    if(objects[i].contains(canvasMousePos.x, canvasMousePos.y)) {
                        overObject = objects[i];
                    }
                }
            }
            if(overObject != overObjectLast) {

                if(overObject == null) {
                    ui.hideContactBox(300);
                }
                else {
                    var data = overObject;
                    ui.showContactBox(0, data);
                }
            }

            //save previous msg ball
            var overMsgOld = overMsg;
            overMsg = null;

            if(cmm.paused && overObject == null) {
                //if animation paused and mouse is not over some object
                var vecX, vecY, distance2;

                //for each msg ball
                for(var i = 0; i < lastBufferIndex; i++) {
                    //compute distance between mouse position and msg ball position
                    vecX = canvasMousePos.x - msgBallsBuffer[i].x;
                    vecY = canvasMousePos.y - msgBallsBuffer[i].y;
                    distance2 = vecX * vecX + vecY * vecY;

                    if(distance2 <= msgBallsBuffer[i].radius * msgBallsBuffer[i].radius) {
                        //found
                        overMsg = msgBallsBuffer[i];
                        //finish searching
                        break;
                    }
                }

                if(overMsg != overMsgOld) {
                    //msg ball changed
                    if(overMsgOld != null) {
                        //reset previous
                    }
                    if(overMsg != null) {
                        //set current
                    }
                }
            }
        }
    }

    function handleMouseOver(evt) {
        if(draggingObject) {
            draggingObject.isDragging = false;
        }
        mouseDown = false;
        draggingObject = null;
        isDragging = false;
    }

    function handleKeyUp(evt) {
        if(evt.keyCode == 32) {
            //space
            if(draggingObject) {
                draggingObject.isDragging = false;
                draggingObject = null;
                isDragging = false;
            }
            if(overMsg != null) {
                overMsg = null;
            }
            ui.hidePopupMsg(300);
            if(cmm.paused) {
                app.continueAnimation(300);
            }
            else {
                app.pauseAnimation(300);
            }
        }
    }

    function handleMouseClick(evt) {
        evt.stopPropagation();
    }

    function handleResize() {
        cmm.resize(document.body.clientWidth, document.body.clientHeight)
    }
}
