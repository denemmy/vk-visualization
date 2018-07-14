
var animation_webgl = new function() {

    var cmm = this;

    var timeCoeff;
    var canvas = null;
    var context = null;

    var ballSpeedCoeff;

    var startDragOffset = {};
    var dragOffset = {};

    var mousePos = {};
    var lastMousePos = {};
    var canvasMousePos = {};
    var canvasLastMousePos = {};
    var mouseDown;

    var isDragging = false;
    var draggingObject;
    var overMsg = null;
    var overObject = null;

    var msgUids;
    var msgMids;
    var msgDate;
    var msgOut;

    var inited = false;

    var objRefByUid;
    var objects;

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

    //Three JS
    var scene;
    var camera;
    var renderer;
    var containerH;
    var containerW;
    var controls;
    var projector;

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

    var useControls = true;

    var requestAnimationFrameId = null;

    //tree for optimization
    var quadTree;

    //message balls buffer
    var msgBallsBuffer;
    var lastBufferIndex;
    var bufferSize = 5000;

    //particle system
    var particles;                      //geometry
    var particleMaterial;               //material
    var particleSystem;                 //particle system

    //object selected cloud
    var particlesSelected;              //geometry
    var particlesSelectedMaterial;      //material
    var particlesSelectedSystem;        //particle system

    //over message sprite
    var overMsgDefaultSprite;

    //point cloud
    var particlesCloud;                 //geometry
    var particlesCloudMaterial;         //material
    var particlesCloudSystem;           //particle system

    function MsgBall() {

        //create vertex
        var ball = new THREE.Vector3();

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

        ball.init = function(sourceObj, destObj, velX, velY, msg) {
            ball.sourceObj = sourceObj;

            ball.x = sourceObj.position.x;
            ball.y = sourceObj.position.y;
            ball.z = 0.5;

            ball.velX = velX;
            ball.velY = velY;
            ball.destObj = destObj;

            ball.destX = destObj.position.x;
            ball.destY = destObj.position.y;

            ball.msg = msg;

            ball.distance = Math.sqrt((ball.destX - ball.x)*(ball.destX - ball.x) +
                + (ball.destY - ball.y)*(ball.destY - ball.y));
            ball.velocity = Math.sqrt(ball.velX * ball.velX + ball.velY * ball.velY);

            ball.isDead = false;

            ball.time = 0;
            ball.stepsPassed = 0;

            ball.MIN_DISTANCE = destObj.radius;
        }

        ball.isArrived = function() {
            if(ball.isDead) {
                return true;
            }
            return ball.distance <= ball.MIN_DISTANCE;
        }

        ball.step = function(deltaTime) {

            ball.time = ball.time + deltaTime;

            ball.destX = ball.destObj.position.x;
            ball.destY = ball.destObj.position.y;

            var vecX = ball.destX - ball.x;
            var vecY = ball.destY - ball.y;
            ball.distance = Math.sqrt(vecX * vecX + vecY * vecY);
            vecX = vecX / ball.distance;
            vecY = vecY / ball.distance;

            //main force
            //var forceCoeff = 0.015;
            var forceCoeff = 0.03;
            ball.forceX = deltaTime * forceCoeff * vecX;
            ball.forceY = deltaTime * forceCoeff * vecY;

            //friction force
            //var frictionFroceCoeff = 0.05;
            var frictionFroceCoeff = 0.04;
            var frictionForceX = -ball.velX * frictionFroceCoeff;
            var frictionForceY = -ball.velY * frictionFroceCoeff;

            //noise force
            var noiseForceProj = ball.magnitude * Math.sin(ball.w_coeff * ball.time + ball.phase);
            var noiseForceX = noiseForceProj * (vecY);
            var noiseForceY = noiseForceProj * (-vecX);

            if(ball.distance < ball.DISTANCE_TO_FADE_NOISE_FORCES) {
                noiseForceX = 0;
                noiseForceY = 0;
            }

            //result force
            var resultForceX = ball.forceX + frictionForceX + noiseForceX;
            var resultForceY = ball.forceY + frictionForceY + noiseForceY;

            ball.velX += animSpeedCoeff * resultForceX;
            ball.velY += animSpeedCoeff * resultForceY;


            var velocityCoeff = 0.04;
            ball.x += animSpeedCoeff * deltaTime * velocityCoeff * (ball.velX);
            ball.y += animSpeedCoeff * deltaTime * velocityCoeff * (ball.velY);

            ball.stepsPassed++;
            if(ball.stepsPassed >= ball.maxAge) {
                ball.isDead = true;
            }
        }
        return ball;
    }

    function loadMsgBallsTexture() {

        var quality = 1;

        var canvas = document.createElement('canvas');
        canvas.width = quality * ballRadius * 2;
        canvas.height = quality * ballRadius * 2;
        var context = canvas.getContext('2d');
        context.scale(quality, quality);

        //drawing
        var color = "#658AB0";

        //blue circle
        context.beginPath();
        context.arc(ballRadius, ballRadius, ballRadius, 0, 2*Math.PI, false);
        context.fillStyle = blue;
        context.fill();

        // blue texture
        var texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        var material = new THREE.SpriteMaterial({map:texture});
        MsgBall.prototype.defaultTexture = texture;
        MsgBall.prototype.defaultMaterial = material;


        canvas = document.createElement('canvas');
        canvas.width = quality * ballRadius * 2;
        canvas.height = quality * ballRadius * 2;
        context = canvas.getContext('2d');
        context.scale(quality, quality);

        //red circle
        context.beginPath();
        context.arc(ballRadius, ballRadius, ballRadius, 0, 2*Math.PI, false);
        context.fillStyle = red;
        context.fill();

        texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        material = new THREE.SpriteMaterial({map:texture});
        MsgBall.prototype.defaultTextureRed = texture;
        MsgBall.prototype.defaultMaterialRed = material;
        MsgBall.prototype.defaultMsgBallRed = new THREE.Sprite(material);
    }

    function Object(x, y, radius) {

        var obj;
        var width, height;
        var borderWidth = 4;
        height = width = 2 * radius + 2 * borderWidth;
        var centerX = Math.round(width / 2);
        var centerY = Math.round(height / 2);

        if(!Object.prototype.isDefaultImgLoaded) {

            var quality = 1;

            var canvas = document.createElement('canvas');
            canvas.width = quality * width
            canvas.height = quality * height;
            var context = canvas.getContext('2d');
            context.scale(quality, quality);

            //drawing
            var color = __randomColor();

            //circle image
            context.beginPath();
            context.arc(centerX, centerY, radius, 0, 2 * Math.PI, true);
            context.fillStyle = "#658AB0";
            context.fill();

            //draw border
            context.beginPath();
            context.arc(centerX, centerX, radius, 0, 2 * Math.PI, true);
            context.strokeStyle = "#152A50";
            context.lineWidth = borderWidth;
            context.stroke();

            // return;
            var texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            var material = new THREE.SpriteMaterial({map:texture});
            obj = new THREE.Sprite(material);
        }
        else {
            //blue circle
            var quality = 1;

            var canvas = document.createElement('canvas');
            canvas.width = quality * width
            canvas.height = quality * height;
            var context = canvas.getContext('2d');
            context.scale(quality, quality);

            //drawing
            //draw image
            context.save();
            context.beginPath();
            context.arc(centerX, centerY, radius, 0, 2 * Math.PI, true);
            context.closePath();
            context.clip();
            context.drawImage(Object.prototype.defaultImg, borderWidth, borderWidth, 2 * radius, 2 * radius);
            context.restore();

            //draw border
            context.beginPath();
            context.arc(centerX, centerX, radius, 0, 2 * Math.PI, true);
            context.strokeStyle = "#152A50";
            context.lineWidth = borderWidth;
            context.stroke();

            // return;
            var texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            var material = new THREE.SpriteMaterial({map:texture});
            obj = new THREE.Sprite(material);
        }

        obj.borderWidth = 4;
        obj.height = obj.width = 2 * radius + 2 * obj.borderWidth;
        obj.centerX = Math.round(obj.width / 2);
        obj.centerY = Math.round(obj.height / 2);

        obj.scale.set(obj.width, obj.height, 1);
        obj.position.set(x, y, 1);

        obj.userId = '';
        obj.radius = radius;

        obj.isActive = true;
        obj.msgNum = 0;
        obj.msgNumPassed = 0;

        obj.velX = 0;
        obj.velY = 0;
        obj.forceX = 0;
        obj.forceY = 0;
        obj.checkedAlready = false;

        obj.isDragging = false;
        obj.isPrerender = false;
        obj.isMain = false;

        obj.isImg = false;
        obj.isDefaultImg = false;

        obj.contains = function(posX, posY) {
            var obj = this;
            var vecX = obj.position.x - posX;
            var vecY = obj.position.y - posY;
            var distance2 = vecX * vecX + vecY * vecY;
            return distance2 <= obj.radius * obj.radius;
        }

        obj.getQuadTreeInfo = function(index) {
            return {
                x: obj.position.x - 300,
                y: obj.position.y - 300,
                width: 600,
                height: 600,
                index: index
            }
        }

        obj.setDefaultImage = function() {

            if(!Object.prototype.isDefaultImgLoaded) return;

            var quality = 1;

            var canvas = document.createElement('canvas');
            canvas.width = quality * obj.width
            canvas.height = quality * obj.height;
            var context = canvas.getContext('2d');
            context.scale(quality, quality);

            //drawing

            //draw image
            context.save();
            context.beginPath();
            context.arc(obj.centerX, obj.centerY, obj.radius, 0, 2 * Math.PI, true);
            context.closePath();
            context.clip();
            context.drawImage(Object.prototype.defaultImg, obj.borderWidth, obj.borderWidth, 2 * obj.radius, 2 * obj.radius);
            context.restore();

            //draw border
            context.beginPath();
            context.arc(obj.centerX, obj.centerX, obj.radius, 0, 2 * Math.PI, true);
            context.strokeStyle = "#152A50";
            context.lineWidth = obj.borderWidth;
            context.stroke();

            // return;
            var texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            obj.material.map = texture;
            obj.material.map.needsUpdate = true;

            obj.isDefaultImg = true;
        }

        obj.loadTextureImage = function(src, delay) {
            //working
            obj.img = new Image();
            obj.img.crossOrigin = "anonymous";
            obj.img.onload = function() {
                //return;
                var quality = 1;

                var canvas = document.createElement('canvas');
                canvas.width = quality * obj.width
                canvas.height = quality * obj.height;
                var context = canvas.getContext('2d');
                context.scale(quality, quality);

                //drawing

                //draw image
                context.save();
                context.beginPath();
                context.arc(obj.centerX, obj.centerY, obj.radius, 0, 2 * Math.PI, true);
                context.closePath();
                context.clip();
                context.drawImage(obj.img, obj.borderWidth, obj.borderWidth, 2 * obj.radius, 2 * obj.radius);
                context.restore();

                //draw border
                context.beginPath();
                context.arc(obj.centerX, obj.centerX, obj.radius, 0, 2 * Math.PI, true);
                context.strokeStyle = "#152A50";
                context.lineWidth = obj.borderWidth;
                context.stroke();

                // return;
                var texture = new THREE.Texture(canvas);
                texture.needsUpdate = true;
                obj.material.map = texture;
                obj.material.map.needsUpdate = true;

                obj.isImg = true;
            }

            if(delay) {
                setTimeout(function() {
                    obj.img.src = src;
                }, delay);
            }
            else {
                obj.img.src = src;
            }
        }

        return obj;
    }

    function loadObjectDefaultImage() {
        Object.prototype.isDefaultImgLoaded = false;
        var img = new Image();
        img.onload = function() {

            Object.prototype.defaultImg = img;
            Object.prototype.isDefaultImgLoaded = true;

            if(!mainObject.isImg && !mainObject.isDefaultImg) {
                mainObject.setDefaultImage();
            }

            for(var i  = 0; i < objects.length; i++) {
                if(objects[i].isImg || objects[i].isDefaultImg) {
                    continue;
                }
                else {
                    objects[i].setDefaultImage();
                }
            }

        }
        img.src = settings.DEFAULT_IMAGE_100_SRC;
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

        //user settings
        maxBallsOnPage = userSettings.maxMsgNumAnim;
        maxObjectsNum = userSettings.maxUsersNumAnim;

        //bind handlers
        bindHandlers();

        //load default texture for objects
        //Object.prototype.isDefaultTextureLoaded = false;
        //loadObjectDefaultTexture();
        loadObjectDefaultImage();
        loadMsgBallsTexture();

        initScene();
        initValues();
        initData();
        initObjects();
        initMsgBallsBuffer();
        initParticleSelected();
        //initPointCloud();
        //prerender message ball

        //change time
        cmm.changeTimeF(startTimeFraсtion);
        inited = true;
    }

    function initScene() {
        var width = containerW;
        var height = containerH;

        //create scene
        scene = new THREE.Scene();
        //scene.fog = new THREE.FogExp2( 0x000000, 0.0007 );

        //create camera
        camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 10, 5000 );
        camera.position.z = 3000;

        //camera = new THREE.OrthographicCamera( -width / 2, width / 2, height / 2, - height / 2, 0.1, 1000 );
        //camera.position.z = 5;
        //camera.lookAt(scene.position);

        //create renderer (webgl or regular canvas)
        if(detectWebGL()) {
            renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
        }
        else {
            renderer = new THREE.CanvasRenderer({ canvas: canvas, alpha: true });
        }
        renderer.setSize( window.innerWidth, window.innerHeight );

        //create controls (control camera position using mouse)
        if(useControls) {
            controls = new ZoomAndPanControls(camera, canvas);
        }

        //create projector
        projector = new THREE.Projector();
    }

    function initValues() {

        timeCoeff = 100000;
        var value = ui.speedSlider.slider('value');
        timeCoeff = $.fn.speedSliderConvert(value);
        animSpeedCoeff = getAnimCoeff(timeCoeff);
        animSpeedCoeffSave = animSpeedCoeff;

        startTimeFraсtion = 0.6;
        ballSpeedCoeff = 8;

        requestAnimationFrameId = null;

        mousePos = {
            x: 99999,
            y: 99999
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

        treeGraphics = null;

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

        objects = [];
        objRefByUid = {};

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
            if(cmm.topUids.length >= maxObjectsNum) {
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
        scene.add(mainObject);
        mainObject.loadTextureImage(account.profile.photo_100, 100);

        var objectsNum = cmm.topUids.length;
        objects = [];
        objRefByUid = {};
        cmm.graduallyAddObjects(10, objectsNum);
        return;
    }

    function initMsgBallsBuffer() {
        //create buffer
        msgBallsBuffer = [];

        //create 3 particles geometry
        particles = [];
        particles[0] = new THREE.Geometry();
        particles[1] = new THREE.Geometry();
        particles[2] = new THREE.Geometry();

        //create 3 materails of different size
        particleMaterial = [];
        particleMaterial[0] = new THREE.PointCloudMaterial({
            color: 0xFFFFFF,
            size: 8,
            map: MsgBall.prototype.defaultTexture,
            blending: THREE.NormalBlending,
            transparent: true,
            opacity: 0.5
        });
        particleMaterial[1] = new THREE.PointCloudMaterial({
            color: 0xFFFFFF,
            size: 12,
            map: MsgBall.prototype.defaultTexture,
            blending: THREE.NormalBlending,
            transparent: true,
            opacity: 0.5
        });
        particleMaterial[2] = new THREE.PointCloudMaterial({
            color: 0xFFFFFF,
            size: 5,
            map: MsgBall.prototype.defaultTexture,
            blending: THREE.NormalBlending,
            transparent: true,
            opacity: 0.5
        });

        //init geomerty

        for(var i = 0; i < bufferSize; i++) {
            var particle = new MsgBall();
            msgBallsBuffer.push(particle);
            particles[i % 3].vertices.push(particle);
        }

        particleSystem = [];
        particleSystem[0] = new THREE.PointCloud(particles[0], particleMaterial[0]);
        particleSystem[0].frustrumCulled = true;
        particleSystem[0].sortParticles = true;
        scene.add(particleSystem[0]);

        particleSystem[1] = new THREE.PointCloud(particles[1], particleMaterial[1]);
        particleSystem[1].frustrumCulled = true;
        particleSystem[1].sortParticles = true;
        scene.add(particleSystem[1]);

        particleSystem[2] = new THREE.PointCloud(particles[2], particleMaterial[2]);
        particleSystem[2].frustrumCulled = true;
        particleSystem[2].sortParticles = true;
        scene.add(particleSystem[2]);

        lastBufferIndex = 0;

        particleSystem[0].geometry.__dirtyVertices = true;
        particleSystem[1].geometry.__dirtyVertices = true;
        particleSystem[2].geometry.__dirtyVertices = true;

        //add to scene over msg sprite
        scene.add(MsgBall.prototype.defaultMsgBallRed);
        MsgBall.prototype.defaultMsgBallRed.visible = false;
    }

    function initParticleSelected() {
        //selected cloud
        var count = 20;
        particlesSelected = new THREE.Geometry();

        var angle = 0;
        var radius = 35;
        for(var i = 0; i < count; i++) {
            angle = i * 2 * Math.PI / count;
            var x = Math.cos(angle) * radius;
            var y = Math.sin(angle) * radius;
            var z = 0.5;
            var vertex = new THREE.Vector3(x, y, z);
            particlesSelected.vertices.push(vertex);
        }

        particlesSelectedMaterial = new THREE.PointCloudMaterial({
            color: 0x152A50,
            size: 10,
            map: MsgBall.prototype.defaultTexture,
            blending: THREE.NormalBlending,
            transparent: true,
            opacity: 0.5
        });

        particlesSelectedSystem = new THREE.PointCloud(particlesSelected, particlesSelectedMaterial);
        scene.add(particlesSelectedSystem);
        particlesSelectedSystem.scale.set(1, 1, 1);
        particlesSelectedSystem.visible = false;
    }

    function initPointCloud() {

        //selected cloud
        var count = 1500;
        particlesCloud = new THREE.Geometry();

        var maxRadius = 3500;
        for(var i = 0; i < count; i++) {
            var t = uniformRandom(0, 2 * Math.PI);
            var radius = Math.random() * maxRadius;
            var x = Math.cos(t) * radius;
            var y = Math.sin(t) * radius;
            var z = uniformRandom(200, 5000);
            var vertex = new THREE.Vector3(x, y, z);
            particlesCloud.vertices.push(vertex);
        }

        particlesCloudMaterial = new THREE.PointCloudMaterial({
            color: 0x152A50,
            size: 5,
            map: MsgBall.prototype.defaultTexture,
            blending: THREE.NormalBlending,
            transparent: true,
            opacity: 0.5
        });

        particlesCloudSystem = new THREE.PointCloud(particlesCloud, particlesCloudMaterial);
        //scene.add(particlesCloudSystem);
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
        fpsValues = [];
        objRefByUid = {};
        msgBallsBuffer = [];

        mainObject = null;
        overObject = null;
        draggingObject = null;
        overMsg = null;

        canvas = null;
        context = null;

        quadTree = null;

        //clear Object prototype data
        Object.prototype.defaultImg = null;

        //clear MsgBall prototype data
        MsgBall.prototype.defaultTexture = null;
        MsgBall.prototype.defaultMaterial = null;
        MsgBall.prototype.defaultTextureRed = null;
        MsgBall.prototype.defaultMaterialRed = null;
        MsgBall.prototype.defaultMsgBallRed = null;

        //clear scene
        scene = null
        camera = null
        renderer = null
        containerH = null
        containerW = null
        controls = null
        projector = null

        //clear particle systems
        particles = null;
        particleMaterial = null;
        particleSystem = null;
        particlesSelected = null;
        particlesSelectedMaterial = null;
        particlesSelectedSystem = null;

        particlesCloud = null;
        particlesCloudMaterial = null;
        particlesCloudSystem = null;

        overMsgDefaultSprite = null;

        //unbind handles
        unbindHandlers();

        inited = false;
    }

    cmm.resize = function(width, height) {
        if(!inited) return;
        containerW = width;
        containerH = height;

        camera.aspect = containerW / containerH;
        camera.updateProjectionMatrix();

        renderer.setSize(containerW, containerH);
        controls.resize(width, height);
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
            for(var i = value; i < objects.length; i++) {
                scene.remove(objects[i]);
            }
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
                object.loadTextureImage(photo_100, delay);

                objRefByUid[object.userId] = object;
                objects.push(object);
                scene.add(object);
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

    cmm.toScreenCoordinates = function(x, y) {
        return controls.project({x:x, y:y, z:0});
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
        updateObjectsOvered();

        //draw functions
        draw();

        //update controls
        if(useControls) {
            var updated = controls.update();
            if(updated && ui.isMsgBoxVisible) {
                ui.updatePopupMsgPos();
            }
        }

        //compute current date
        if(!cmm.finished) {
            time = timeElapsed / 1000.0 + cmm.startTimeOffset + cmm.firstMsgDate;
        }

        //update page DOM elements
        pageUpdate(renderDelta);
        updateOtherCanvas(renderDelta);
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

    function updateOtherCanvas(renderDelta) {
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

    //update functions
    function updateStage(deltaTime) {
        //clear quadTree
        quadTree.clear();

        //clear forces and put objects to quadTree
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
        //updatePointCloud(deltaTime);
    }

    function updateObjects(deltaTime) {

        //compute forces
        var dirX, dirY, distance, distance2, forceCoeff;
        var forceX, forceY;
        var frictionForceCoeff, frictionForceX, frictionForceY;

        // var stride = regularGrid.stride;
        // for(var i = 0; i < cellNum; i++)
        // {
        //     cellIndex = i;
        //     objectsCell = regularGrid.getObjects(cellIndex);
        //     objectsLeftUpCell = regularGrid.getObjects(cellIndex - stride + 1);
        //     objectsRightCell = regularGrid.getObjects(cellIndex + 1);
        //     objectsRightDownCell = regularGrid.getObjects(cellIndex + stride + 1)
        //     objectsDownCell = regularGrid.getObjects(cellIndex + stride);
        // }


        for(var i = 0; i < objects.length; i++) {

            var nearestObjects = quadTree.retrieve(objects[i].getQuadTreeInfo(i));

            //interaction between nearest objects
            for(var k = 0; k < nearestObjects.length; k++) {

                var objIndex = nearestObjects[k].index;
                var nearObj = objects[objIndex];

                if(nearObj.checkedAlready) {
                    continue;
                }

                dirX = objects[i].position.x - nearObj.position.x;
                dirY = objects[i].position.y - nearObj.position.y;

                distance2 = dirX * dirX + dirY * dirY

                // if(distance2 < 1) distance2 = 1.0;
                // if(distance2 > 300000) {
                //     continue;
                // }

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


            // for(var j = i + 1; j < objects.length; j++) {

            //     dirX = objects[i].x - objects[j].x;
            //     dirY = objects[i].y - objects[j].y;
            //     distance2 = dirX * dirX + dirY * dirY;
            //     if(distance2 <= 100) distance2 = 100.0;
            //     forceCoeff = 300;
            //     forceX = forceCoeff * dirX / distance2;
            //     forceY = forceCoeff * dirY / distance2;

            //     objects[i].forceX += forceX;
            //     objects[i].forceY += forceY;

            //     objects[j].forceX += -forceX;
            //     objects[j].forceY += -forceY;

            // }

            if(objects[i].isDragging) {
                continue;
            }

            //interaction with main ball
            dirX = objects[i].position.x - mainObject.position.x;
            dirY = objects[i].position.y - mainObject.position.y;
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
            objects[i].position.x += objects[i].velX;
            objects[i].position.y += objects[i].velY;
        }

        //main object
        if(!mainObject.isDragging) {
            //interaction with main ball
            var gCenterX = 0, gCenterY = 0;
            dirX = mainObject.position.x - gCenterX;
            dirY = mainObject.position.y - gCenterY;
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
            mainObject.position.x += mainObject.velX;
            mainObject.position.y += mainObject.velY;
        }
    }

    function updateMsgBalls(deltaTime) {
        //message balls

        particleSystem[0].geometry.__dirtyVertices = true;
        particleSystem[1].geometry.__dirtyVertices = true;
        particleSystem[2].geometry.__dirtyVertices = true;
        // var h = ( 360 * ( 1.0 + time / 100 ) % 360 ) / 360;
        // particleMaterial.color.setHSL( h, 0.5, 0.8 );

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

        // local variables
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
                msgBallsBuffer[lastBufferIndex].z = 0.5 //make visible

                lastBufferIndex++;
                msgBallsToAdd--;
            }
            if(objRefByUid[uid]) {
                objRefByUid[uid].msgNumPassed++;
            }
            msgPassed++;
        }
    }

    function updateObjectsOvered() {
        if(overObject != null) {
            particlesSelectedSystem.rotation.z += 0.02;
            particlesSelectedSystem.position.copy(overObject.position);
            if(overObject == mainObject) {
                particlesSelectedSystem.scale.set(2, 2, 1);
            }
            else {
                particlesSelectedSystem.scale.set(1, 1, 1);
            }
        }
    }

    function updatePointCloud() {
        particlesCloudSystem.rotation.z += 0.01;
    }

    //draw function
    function draw() {
        renderer.render(scene, camera);
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
        mousePos.x = evt.pageX;
        mousePos.y = evt.pageY;
        controls.zoom(delta, mousePos);
        ui.updatePopupMsgPos();
    }

    function handleMouseDown(evt) {

        mouseDown = true;
        isDragging = false;

        mousePos.x = evt.pageX;
        mousePos.y = evt.pageY;

        lastMousePos.x = evt.pageX;
        lastMousePos.y = evt.pageY;

        canvasMousePos = controls.unproject(mousePos.x, mousePos.y);

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

        if(evt.pageX == mousePos.x && evt.pageY == mousePos.y) {
           //bug in Chrome, actiually mouse didn't move
           return;
        }

        mousePos.x = evt.pageX;
        mousePos.y = evt.pageY;

        canvasMousePos = controls.unproject(mousePos.x, mousePos.y);

        if(mouseDown) {

            if(draggingObject) {

                //draggingObject.position.add(canvasMousePos.sub(canvasLastMousePos));

                //canvasLastMousePos.copy(canvasMousePos);

                draggingObject.position.x += (canvasMousePos.x - canvasLastMousePos.x);
                draggingObject.position.y += (canvasMousePos.y - canvasLastMousePos.y);

                canvasLastMousePos.x = canvasMousePos.x;
                canvasLastMousePos.y = canvasMousePos.y;
            }
            else {
                isDragging = true;
                controls.pan(lastMousePos, mousePos);
            }

            lastMousePos.x = mousePos.x;
            lastMousePos.y = mousePos.y;
        }
        else {

            //save previous object
            var overObjectLast = overObject;
            overObject = null;

            if(mainObject.contains(canvasMousePos.x, canvasMousePos.y)) {
                //mouse on main object
                overObject = mainObject;
            }
            else {
                //for each object
                for(var i = 0; i < objects.length; i++) {
                    if(objects[i].contains(canvasMousePos.x, canvasMousePos.y)) {
                        //found
                        overObject = objects[i];
                        break;
                    }
                }
            }

            if(overObject != overObjectLast) {
                //changed
                if(overObjectLast != null) {
                    // overObjectLast.scale.x /= 1.5;
                    // overObjectLast.scale.y /= 1.5;
                    ui.hideContactBox(300);
                }
                if(overObject != null) {
                    var data = overObject;
                    particlesSelectedSystem.visible = true;
                    // overObject.scale.x *= 1.5;
                    // overObject.scale.y *= 1.5;
                    ui.showContactBox(0, data);
                }
                else {
                    particlesSelectedSystem.visible = false;
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
                        MsgBall.prototype.defaultMsgBallRed.position.set(overMsg.x, overMsg.y, overMsg.z);
                        MsgBall.prototype.defaultMsgBallRed.scale.set(10, 10, 1);
                        MsgBall.prototype.defaultMsgBallRed.visible = true;
                    }
                    else {
                        MsgBall.prototype.defaultMsgBallRed.visible = false;
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
        cmm.resize(window.innerWidth, window.innerHeight);
    }
}