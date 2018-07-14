var ZoomAndPanControls = function(camera, domElement) {
	controls = {};

	controls.staticZoom = false;
	controls.dynamicDampingFactor = 0.35;
	controls.zoomSpeed = 0.8;
	controls.maxZoom = 3000;
	controls.minZoom = 400;

	var _camera = camera;
	var _domElement = domElement;

	var containerW = window.innerWidth;
	var containerH = window.innerHeight;

	var projector = new THREE.Projector();

	var _zoomStart = 0;
	var _zoomEnd = 0;

	var _pan = new THREE.Vector3();

	var _EPS = 0.00001;
	
	var _zoomUpdate = false;
	var _panUpdate = false;

	var _mousePos = {};

	controls.zoom = function(wheelDelta, mousePos) {
		var delta = - 0.01 * event.wheelDelta / 40;
		_zoomEnd += delta;
		_mousePos.x = mousePos.x;
		_mousePos.y = mousePos.y;
		_zoomUpdate = true;
	}

	function zoomProccess() {

		//zoom factor
		var factor = 1.0 + (_zoomEnd - _zoomStart) * controls.zoomSpeed;

		//projection of mouse position on the XY plane
		var mouseProjection = controls.unproject(_mousePos.x, _mousePos.y);

		//move camera along the direction vector
		var dir = new THREE.Vector3();
		dir.subVectors(_camera.position, mouseProjection);
		var pos = dir.multiplyScalar(factor).add(mouseProjection);

		var isValidArea = (pos.z >= controls.minZoom) && (pos.z <= controls.maxZoom);
		if(isValidArea) {
			_camera.position.copy(pos);
		}
		else if(pos.z < controls.minZoom) {
			_camera.position.z = controls.minZoom;
			_zoomStart = _zoomEnd;
			_zoomUpdate = false;
			return;
		}
		else {
			_camera.position.z = controls.maxZoom;
			_zoomStart = _zoomEnd;
			_zoomUpdate = false;
			return;
		}		

		if(controls.staticZoom) {
			_zoomStart = _zoomEnd;
			_zoomUpdate = false;
		}
		else {
			_zoomStart += ( _zoomEnd - _zoomStart ) * controls.dynamicDampingFactor;
			if(Math.abs(_zoomEnd - _zoomStart) < _EPS) {
				_zoomStart = _zoomEnd;
				_zoomUpdate = false;
			}
		}		
	}

	controls.pan = function(mouseStart, mouseEnd) {
		var mouseStartProject = controls.unproject(mouseStart.x, mouseStart.y);
		var mouseEndProject = controls.unproject(mouseEnd.x, mouseEnd.y);
		_pan.subVectors(mouseStartProject, mouseEndProject);
		_panUpdate = true;
	}

	function panProcess()
	{
		_panUpdate = false;
		_camera.position.add(_pan);		
	}

	controls.unproject = function(posX, posY) {
		var vecX = 2 * (posX / containerW) - 1;
		var vecY = - 2 * (posY / containerH) + 1;
		var vector = new THREE.Vector3(vecX, vecY, 0.5);
		projector.unprojectVector(vector, _camera);
		var dir = vector.sub(_camera.position).normalize();
		var distance = - _camera.position.z / dir.z;
        var pos = _camera.position.clone().add( dir.multiplyScalar( distance ) );
        return pos;
	}

	controls.project = function(vector) {
        
        var widthHalf = Math.round(containerW / 2), heightHalf = Math.round(containerH / 2);

        var vectorWorld = new THREE.Vector3();
        vectorWorld.set(vector.x, vector.y, vector.z);
        projector.projectVector( vectorWorld, camera );

        var x = ( vectorWorld.x * widthHalf ) + widthHalf;
        var y = - ( vectorWorld.y * heightHalf ) + heightHalf;
        return {x: x, y: y};
    }

    controls.resize = function(width, height) {
    	containerW = width;
    	containerH = height;
    }

    controls.update = function() {
    	//update only if neccessary

    	var updated = false;
    	if(_zoomUpdate) {
    		zoomProccess();
    		updated = true;
    	}
    	if(_panUpdate) {
    		panProcess();
    		updated = true;
    	}

    	return updated;
    }

	return controls;
}