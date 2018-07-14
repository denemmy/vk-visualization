var test_webgl = new function() {

	var testWebGL = this;

	var stopped;
	var requestAnimFrameId;

	var canvas;

	var containerW;
	var containerH;
	var aspectRatio;

	testWebGL.init = function()
	{
		debugLog('test webgl init');

		$('body').html('<div id="canvas-container"><canvas id="canvas-test"></canvas></div>');

		canvas = document.getElementById('canvas-test');
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		canvas.style.width = window.innerWidth + "px";
		canvas.style.height = window.innerHeight + "px";

		canvas.style.position = "absolute";
		canvas.style.top = "0px";
		canvas.style.left = "0px"

		var container = document.getElementById('canvas-container');
		container.style.overflow = "hidden";
		container.style.position = "relative";
		container.style.width = "100%";
		container.style.height = "100%";


		containerW = window.innerWidth;
        containerH = window.innerHeight;
        aspectRatio = containerW / containerH;

        stopped = true;
        requestAnimFrameId =  null;

        initScene();

	}

	testWebGL.start = function()
	{
		if(stopped) {
			stopped = false;
			animate();
		}
		
	}

	testWebGL.stop = function()
	{
		if(!stopped) {
			stopped = true;
			if(requestAnimationFrameId) {
	            cancelAnimationFrame(requestAnimationFrameId);
	            requestAnimationFrameId = null;
	        }
		}
	}	

	function initScene()
	{
		var width = containerW;
		var height = containerH;

		scene = new THREE.Scene();
        //camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
        camera = new THREE.OrthographicCamera( -width / 2, width / 2, height / 2, - height / 2, 1, 15 );
        camera.position.z = 10;
        //camera.lookAt(scene.position);

        renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
        renderer.setSize( window.innerWidth, window.innerHeight );

        // material for sprite
        var material = new THREE.SpriteMaterial({
        	map: THREE.ImageUtils.loadTexture('images/camera_100.gif', undefined, initSprites)        	
        }); 

        //materail for plane
        // var material = new THREE.MeshPhongMaterial({
        // 	map: THREE.ImageUtils.loadTexture('images/camera_100.gif')
        // });
                
        // //plane
        // var plane = new THREE.Mesh(new THREE.PlaneGeometry( 1, 1 ), material);
        // plane.overdraw = true;
        // scene.add(plane);

        var directionalLight = new THREE.DirectionalLight(0xffffff);
        directionalLight.position.set(1, 1, 1).normalize();
        // add to the scene
        //scene.add(directionalLight);

        // add subtle ambient lighting
        var ambientLight = new THREE.AmbientLight(0xffffff);
        //scene.add(ambientLight);
	}

	function initSprites(texture)
	{
		var material = new THREE.SpriteMaterial({map:texture});
        var img_width = material.map.image.width;
        var img_height = material.map.image.height;
		// sprite
        var sprite = new THREE.Sprite(material);
        //sprite.position.set( 50, 50, 0 );
		sprite.scale.set( 50, 50, 1 );
        scene.add(sprite);
	}

	function render()
	{
		renderer.render(scene, camera);
	}

	function animate()
	{
		if(stopped) {
			return;
		}

		requestAnimFrameId = requestAnimationFrame(animate);
		
		render();
	}

	return testWebGL;

}