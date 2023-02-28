/**
 * Author: Cristion Dominguez
 * Date: 8 April 2022
 */

// Canvas the cubes shall be rendered on
var canvas;
// WebGL context
var gl;

// Constant number utilized for quick calculation
const doublePI = 2 * Math.PI;

// Object containing the DOM of the light-relocate-button and the messages it should display
var lightRelocateButton = {
    htmlElement: null,
    followViewerMsg: 'Compel Light to Follow Viewer',
    moveToWorldPosMsg: 'Compel Light to Move to World Coordinates'
};
// Object containing the DOM of the light-orbit-button and the messages it should display
var lightOrbitButton = {
    htmlElement: null,
    startOrbitMsg: 'Orbit Light Around Object',
    stopOrbitMsg: 'Halt Light Orbit'
}

// Current lifetime of the loaded page
var pageLifetime = 0;
// Lifetime of the page on the last rendered frame
var timeAtLastFrame = 0;

// Lists of vertex coordinates, vertex normals, and the order in which the vertices are to be drawn (contains vertex indices)
var vertexCoordinates = [];
var vertexNormals = [];
var vertexOrder = [];

// Background color of the canvas and its variable location in the shaders
var backgroundColor = [0.05, 0.05, 0.05, 1];
var backgroundColor_Loc;

// Model view matrix and its variable location in the shaders
var modelView;
var modelView_Loc;

// Projection matrix and its variable location in the shaders
var projection;
var projection_Loc;

// Ambient, diffuse, and specular colors, and their variable locations in the shaders
var ambientColor, diffuseColor, specularColor;
var ambientColor_Loc, diffuseColor_Loc, specularColor_Loc;

// Variable location in the shaders for the light position in eye coordinates
var lightPosition_Loc;

// Variable location in the shaders for the shininess of a surface
var shininess_Loc;

// Boolean determining whether the surface normals should be displayed and its variable location in the shaders
var displaySurfaceNormals = false;
var isNormalLine_Loc;

// Object representing the base cylinder model to be rendered
var cylinderModel = {
    tEvaluations: 25,  // amount of vertices to place on the SOR curve
    thetaEvaluations: 25,  // amount of SOR curves around the y-axis

    scale: vec3(0.15, 1.5, 0.15),  // scale of cylinder model

    firstOrderIndex: -1,  // first index representing the cylinder in vertexOrder
    orderCount: -1,  // amount of indices claimed by the cylinder in vertexOrder

    firstVertexIndex: -1,  // first index representing the cylinder in vertexCoordinates
    vertexCount: -1,  // amount of verices claimed by the cylinder

    normalLines: {firstOrderIndex: -1, orderCount: -1},  // for lines representing the SOR's normals

    minMaxBox: null,  // minmax box of SOR

    material: {ambient: null, diffuse: null, specular: null, shininess: null},  // currently adopted material
    color: null  // color acquired by multiplying light properties to material
};

// Object representing the base ring model to be rendered
var ringModel = {
    majorRadius: 0.4,
    minorRadius: 0.04,
    
    tEvaluations: 25,
    thetaEvaluations: 35,

    firstOrderIndex: -1,
    orderCount: -1,

    firstVertexIndex: -1,
    vertexCount: -1,

    normalLines: {firstOrderIndex: -1, orderCount: -1},

    minMaxBox: null,

    material: {ambient: null, diffuse: null, specular: null, shininess: null},
    color: null,

};

// Utilized for the spinning animation
class Ring
{
    constructor(centerPosition, thetaOffset)
    {
        this.centerPosition = centerPosition;
        this.thetaOffset = thetaOffset;
    }
}
var rings = [];
var ringAmount = 1;

// Available light colors
var lightColors = {
    white: {ambient: vec4(0.2, 0.2, 0.2), diffuse: vec4(1.0, 1.0, 1.0), specular: vec4(1.0, 1.0, 1.0)},
    skyBlue: {ambient: vec4(0.1059, 0.16156, 0.1843), diffuse: vec4(0.5294, 0.8078, 0.9215), specular: vec4(0.5294, 0.8078, 0.9215)}
};

// Available materials
var materials = {
    silver: {ambient: vec4(0.753, 0.753, 0.753), diffuse: vec4(0.753, 0.753, 0.753), specular: vec4(0.753, 0.753, 0.753)},
    gold: {ambient: vec4(1, 0.8431, 0), diffuse: vec4(1, 0.8431, 0), specular: vec4(1, 0.8431, 0)},
    pthalo: {ambient: vec4(0.0706, 0.2078, 0.2078), diffuse: vec4(0.0706, 0.2078, 0.2078), specular: vec4(0.0706, 0.2078, 0.2078)},
    mauve: {ambient: vec4(0.8784, 0.6902, 1), diffuse: vec4(0.8784, 0.6902, 1), specular: vec4(0.8784, 0.6902, 1)}
};

// Light position and properties
var lightPosition = {inWorldCoords: true, coordinates: null};
var lightProperties = {ambient: null, diffuse: null, specular: null};

// Fields the light relocation animation
var lightRelocateAnimation = {
    active: false,
    totalTime: 1,
    elapsedTime: 0,
    initialPosition: null,
    finalPosition: null,
};

// Fields for the light orbit animation
var lightOrbitAnimation = {
    active: false,
    totalTime: 2,
    elapsedTime: 0,
    transferLocation: null,
    radius: 2,
    theta: 0
};

// Fields for the ring spin animation
var ringSpinAnimation = {
    totalTime: 2,
    elapsedTime: 0
};

// Properties for perspective
var perspectiveProperties = {
    fov: 60,
	aspect: 1,
	near: 0.1,
	far:  15
};

// Properties of the viewer (mousy code)
var viewer = {
	eye: vec3(0, 0, 3),
	at:  vec3(0.0, 0.0, 0.0),  
	up:  vec3(0.0, 1.0, 0.0),
	
	// for moving around object; set vals so at origin
	radius: null,
    theta: 0,
    phi: 0
};

// Properties of the mouse (mousy code)
var mouse = {
    prevX: 0,
    prevY: 0,

    leftDown: false,
    rightDown: false,
};

// Booleans determining whether to display the cylinders and/or rings
var displayCylinder, displayRings;

// Viewing matrix multiplied to any transformation matrices applied to rendered SORs
var lookAtMatrix;

/**
 * Prepares the web page for rendering SORs.
 */
window.onload = function init()
{
    // Acquire the canvas.
    canvas = document.getElementById('gl-canvas');
    
    // Create the WebGL context and if this process is not successful, display an error.
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert( "WebGL is not available." ); }

    // Notify that the canvas has been opened.
    console.log("Canvas has been opened.");

    // Set the viewport and the background color.
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(backgroundColor[0], backgroundColor[1], backgroundColor[2], backgroundColor[3]);
    
    // Enable the depth buffer to display the closer object.
    gl.enable(gl.DEPTH_TEST);

    // Define the shaders to utilize.
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Calculate aspect ratio.
    perspectiveProperties.aspect = canvas.width / canvas.height;

    // Construct the cylinder model.
    cylinderModel.firstVertexIndex = 0;
    cylinderModel.firstOrderIndex = 0;
    cylinderModel.minMaxBox = constructCylinder(cylinderModel.tEvaluations, cylinderModel.thetaEvaluations, vertexCoordinates, vertexNormals, vertexOrder);
    cylinderModel.orderCount = vertexOrder.length;
    cylinderModel.vertexCount = vertexCoordinates.length;

    // Construct the ring model.
    ringModel.firstVertexIndex = vertexCoordinates.length;
    ringModel.firstOrderIndex = vertexOrder.length;
    ringModel.minMaxBox = constructRing(ringModel.majorRadius, ringModel.minorRadius, ringModel.tEvaluations, ringModel.thetaEvaluations, vertexCoordinates, vertexNormals, vertexOrder);
    ringModel.orderCount = vertexOrder.length - ringModel.firstOrderIndex;
    ringModel.vertexCount = vertexCoordinates.length - ringModel.firstVertexIndex;

    // Construct the cylinder surface normal lines.
    cylinderModel.normalLines.firstOrderIndex = vertexOrder.length;
    constructSurfaceNormalLines(0.1, cylinderModel.firstVertexIndex, cylinderModel.firstVertexIndex + cylinderModel.vertexCount - 1, vertexCoordinates, vertexNormals, vertexOrder);
    cylinderModel.normalLines.orderCount = vertexOrder.length - cylinderModel.normalLines.firstOrderIndex;

    // Construct the ring surface normal lines.
    ringModel.normalLines.firstOrderIndex = vertexOrder.length;
    constructSurfaceNormalLines(0.02, ringModel.firstVertexIndex, ringModel.firstVertexIndex + ringModel.vertexCount - 1, vertexCoordinates, vertexNormals, vertexOrder);
    ringModel.normalLines.orderCount = vertexOrder.length - ringModel.normalLines.firstOrderIndex;

    // Create, bind, and load the index buffer.
    var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertexOrder), gl.STATIC_DRAW);

    // Create, bind, and load the vertex buffer.
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexCoordinates), gl.STATIC_DRAW);

    // Associate the vertex buffer to a vertex position attribute.
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Create, bind, and load the normal buffer.
    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexNormals), gl.STATIC_DRAW );
    
    // Associate the normal buffer to a vertex normal attribute.
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    // Acquire the locations of the uniforms in the shaders.
    ambientColor_Loc = gl.getUniformLocation(program, "ambientColor");
    diffuseColor_Loc = gl.getUniformLocation(program, "diffuseColor");
    specularColor_Loc = gl.getUniformLocation(program, "specularColor");

    lightPosition_Loc = gl.getUniformLocation(program, "lightPosition");
    
    shininess_Loc = gl.getUniformLocation(program, "shininess");

    modelView_Loc = gl.getUniformLocation(program, "modelView");
    projection_Loc = gl.getUniformLocation(program, "projection");

    isNormalLine_Loc = gl.getUniformLocation(program, 'isNormalLine');

    // Setup UI.
    // LIGHT COLOR
    var lightColorDropdown = document.getElementById('light-color-dropdown');
    lightProperties = lightColors[lightColorDropdown.value];
    lightColorDropdown.oninput = event => {
        lightProperties = lightColors[event.target.value];
        cylinderModel.color = calculateColor(lightProperties, cylinderModel.material);
        ringModel.color = calculateColor(lightProperties, ringModel.material);
    };
    lightRelocateButton.htmlElement = document.getElementById('light-relocate-button');
    lightOrbitButton.htmlElement = document.getElementById('light-orbit-button');

    // LIGHT RELOCATE ANIMATION
    var coordInputs = [document.getElementById('x-coordinate-input'), document.getElementById('y-coordinate-input'), document.getElementById('z-coordinate-input')];
    var minCoords = [+coordInputs[0].min, +coordInputs[1].min, +coordInputs[2].min];
    var maxCoords = [+coordInputs[0].max, +coordInputs[1].max, +coordInputs[2].max];
    lightPosition.coordinates = vec4(+coordInputs[0].value, +coordInputs[1].value, +coordInputs[2].value);
    lightRelocateButton.htmlElement.onclick = () => {
        lightOrbitAnimation.active = false;
        lightOrbitButton.htmlElement.innerText = lightOrbitButton.startOrbitMsg;

        var coordValues = vec3(+coordInputs[0].value, +coordInputs[1].value, +coordInputs[2].value);

        for (var i = 0; i < coordValues.length; i++)
        {
            if (coordValues[i] < minCoords[i])
            {
                coordValues[i] = minCoords[i];
                coordInputs[i].value = coordValues[i];
            }
            else if (coordValues[i] > maxCoords[i])
            {
                coordValues[i] = maxCoords[i];
                coordInputs[i].value = coordValues[i];
            }
        }

        if (lightPosition.inWorldCoords)
        {
            lightPosition.coordinates = multMatrixByVector(lookAtMatrix, lightPosition.coordinates);
            lightPosition.inWorldCoords = false;

            lightRelocateButton.htmlElement.innerText = lightRelocateButton.moveToWorldPosMsg;

            lightRelocateAnimation.finalPosition = vec4(0, 0, 0);
        }
        else
        {
            lightPosition.coordinates = multMatrixByVector(inverse(lookAtMatrix), lightPosition.coordinates);
            lightPosition.inWorldCoords = true;

            lightRelocateButton.htmlElement.innerText = lightRelocateButton.followViewerMsg;

            lightRelocateAnimation.finalPosition = vec4(coordValues);
        }

        lightRelocateButton.htmlElement.disabled = true;
        lightOrbitButton.htmlElement.disabled = true;

        lightRelocateAnimation.initialPosition = lightPosition.coordinates;
        lightRelocateAnimation.elapsedTime = 0;
        lightRelocateAnimation.active = true;
    };

    // ORBIT LIGHT ANIMATION
    lightOrbitButton.htmlElement.onclick = () => {
        if (!lightOrbitAnimation.active)
        {
            if (!lightPosition.inWorldCoords)
            {
                lightPosition.coordinates = multMatrixByVector(inverse(lookAtMatrix), lightPosition.coordinates);
                lightPosition.inWorldCoords = true;
    
                lightRelocateButton.htmlElement.innerText = lightRelocateButton.followViewerMsg;
            }

            lightRelocateButton.htmlElement.disabled = true;
            lightOrbitButton.htmlElement.disabled = true;

            lightOrbitButton.htmlElement.innerText = lightOrbitButton.stopOrbitMsg;
    
            lightRelocateAnimation.initialPosition = lightPosition.coordinates;
            lightRelocateAnimation.finalPosition = vec4(lightOrbitAnimation.radius, 0, 0);

            lightRelocateAnimation.elapsedTime = 0;
            lightOrbitAnimation.elapsedTime = 0;

            lightRelocateAnimation.active = true;
            lightOrbitAnimation.active = true;
        }
        else
        {
            lightOrbitButton.htmlElement.innerText = lightOrbitButton.startOrbitMsg;
            lightOrbitAnimation.active = false;
        }
            
    };

    // FOV
    var fovSlider = document.getElementById('fov-slider');
    perspectiveProperties.fov = +fovSlider.value;
    fovSlider.oninput = event => {
        perspectiveProperties.fov = +event.target.value;
    }

    // DISPLAY NORMALS
    document.getElementById('display-normals-button').onclick = event => {
        displaySurfaceNormals = displaySurfaceNormals == false ? true : false;

        if (displaySurfaceNormals)
            event.target.innerText = 'Hide Surface Normals';
        else
            event.target.innerText = 'Display Surface Normals';

    };

    // CYLINDER DISPLAY
    var cylinderCheckbox = document.getElementById('cylinder-checkbox');
    displayCylinder = cylinderCheckbox.checked;
    cylinderCheckbox.oninput = (event) => {
        displayCylinder = event.target.checked;
    };

    // CYLINDER COLOR
    var cylinderMaterialDropdown = document.getElementById('cylinder-material-dropdown');
    updateMaterial(cylinderModel.material, materials[cylinderMaterialDropdown.value]);
    cylinderModel.color = calculateColor(lightProperties, cylinderModel.material);
    cylinderMaterialDropdown.oninput = event => {
        updateMaterial(cylinderModel.material, materials[event.target.value]);
        cylinderModel.color = calculateColor(lightProperties, cylinderModel.material);
    };

    // CYLINDER SHININESS
    var cylinderShininessSlider = document.getElementById('cylinder-shininess-slider');
    cylinderModel.material.shininess = +cylinderShininessSlider.value;
    cylinderShininessSlider.oninput = event => {
        cylinderModel.material.shininess = +event.target.value;
    };

    // RING DISPLAY
    var ringCheckbox = document.getElementById('ring-checkbox');
    displayRings = ringCheckbox.checked;
    ringCheckbox.oninput = (event) => {
        displayRings = event.target.checked;
    };

    // RING AMOUNT
    var ringAmountSlider = document.getElementById('ring-amount-slider');
    ringAmount = +ringAmountSlider.value;
    alterRingsRendered();
    ringAmountSlider.oninput = event => {
        ringAmount = +event.target.value;
        alterRingsRendered();
    };

    // RING COLOR
    var ringMaterialDropdown = document.getElementById('ring-material-dropdown');
    updateMaterial(ringModel.material, materials[ringMaterialDropdown.value]);
    ringModel.color = calculateColor(lightProperties, ringModel.material);
    ringMaterialDropdown.oninput = (event) => {
        updateMaterial(ringModel.material, materials[event.target.value]);
        ringModel.color = calculateColor(lightProperties, ringModel.material);
    };

    // RING SHININESS
    var ringShininessSlider = document.getElementById('ring-shininess-slider');
    ringModel.material.shininess = +ringShininessSlider.value;
    ringShininessSlider.oninput = event => {
        ringModel.material.shininess = +event.target.value;
    };

    // Print essential info.
    console.log(`Cylinder Min-Max Box:`);
    console.log(cylinderModel.minMaxBox);
    console.log('Ring Min-Max Box');
    console.log(ringModel.minMaxBox);

	console.log(`Initial Eye Position: (${viewer.eye})`);
	console.log(`Initial At Position: (${viewer.at})`);
    console.log(`Initial Up Position: (${viewer.up})`);
    
	console.log(`Initial FOV: ${perspectiveProperties.fov}`);
    console.log(`Initial Aspect Ratio: ${perspectiveProperties.aspect}`);
    console.log(`Initial Perspective Near: ${perspectiveProperties.near}`);
    console.log(`Initial Perspective Far: ${perspectiveProperties.far}`);

    console.log(`Initial Light Position: (${lightPosition.coordinates}) in world coordinates`);

    // ===========
    // MOUSY CODE
    // ===========

    // init radius of sphere to move around object
	var diff = subtract(viewer.eye, viewer.at);
	viewer.radius = length(diff);

    // init modelview and projection 
    lookAtMatrix = lookAt(viewer.eye, viewer.at , viewer.up);
    projection = perspective(perspectiveProperties.fov, perspectiveProperties.aspect, perspectiveProperties.near, perspectiveProperties.far);

    // ========================== Camera control via mouse ============================================
	// There are 4 event listeners: onmouse down, up, leave, move
	//
	// on onmousedown event
	// check if left/right button not already down
	// if just pressed, flag event with mouse.leftdown/rightdown and stores current mouse location
    document.getElementById("gl-canvas").onmousedown = event =>
    {
        if(event.button == 0 && !mouse.leftDown)
        {
            mouse.leftDown = true;
            mouse.prevX = event.clientX;
            mouse.prevY = event.clientY;
        }
        else if (event.button == 2 && !mouse.rightDown)
        {
            mouse.rightDown = true;
            mouse.prevX = event.clientX;
            mouse.prevY = event.clientY;
        }
    };

	// onmouseup event
	// set flag for left or right mouse button to indicate that mouse is now up
    document.getElementById("gl-canvas").onmouseup = event =>
    {
        // Mouse is now up
        if (event.button == 0)
        {
            mouse.leftDown = false;
        }
        else if(event.button == 2)
        {
            mouse.rightDown = false;
        }

    };

	// onmouseleave event
	// if mouse leaves canvas, then set flags to indicate that mouse button no longer down.
	// This might not actually be the case, but it keeps input from the mouse when outside of app
	// from being recorded/used.
	// (When re-entering canvas, must re-click mouse button.)
    document.getElementById("gl-canvas").onmouseleave = event =>
    {
        // Mouse is now up
        mouse.leftDown = false;
        mouse.rightDown = false;
    };

	// onmousemove event
	// Move the camera based on mouse movement.
	// Record the change in the mouse location
	// If left mouse down, move the eye around the object based on this change
	// If right mouse down, move the eye closer/farther to zoom
	// If changes to eye made, then update modelview matrix

    document.getElementById("gl-canvas").onmousemove = event =>
    {
		// only record changes if mouse button down
		if (mouse.leftDown || mouse.rightDown) {
			
			// Get changes in x and y at this point in time
			var currentX = event.clientX;
			var currentY = event.clientY;
			
			// calculate change since last record
			var deltaX = event.clientX - mouse.prevX;
			var deltaY = event.clientY - mouse.prevY;
			
			// console.log("enter onmousemove with left/right button down");
			// console.log("viewer.eye = ",viewer.eye,"  viewer.at=",viewer.at,"  viewer.up=",viewer.up);
			// console.log("event clientX = ",currentX,"  clientY = ",currentY);
			// console.log("mouse.prevX = ",mouse.prevX,"  prevY = ",mouse.prevY);
			// console.log("change in mouse location deltaX = ",deltaX,"  deltaY = ",deltaY);

			// Compute camera rotation on left click and drag
			if (mouse.leftDown)
			{
				// console.log("onmousemove and leftDown is true");
				// console.log("theta=",viewer.theta,"  phi=",viewer.phi);
				
				// Perform rotation of the camera
				if (viewer.up[1] > 0)
				{
					viewer.theta -= 0.01 * deltaX;
					viewer.phi -= 0.01 * deltaY;
				}
				else
				{
					viewer.theta += 0.01 * deltaX;
					viewer.phi -= 0.01 * deltaY;
				}
				// console.log("incremented theta=",viewer.theta,"  phi=",viewer.phi);
				
				// Wrap the angles
				var twoPi = 6.28318530718;
				if (viewer.theta > twoPi)
				{
					viewer.theta -= twoPi;
				}
				else if (viewer.theta < 0)
				{
					viewer.theta += twoPi;
				}

				if (viewer.phi > twoPi)
				{
					viewer.phi -= twoPi;
				}
				else if (viewer.phi < 0)
				{
					viewer.phi += twoPi;
				}
				// console.log("wrapped  theta=",viewer.theta,"  phi=",viewer.phi);

			} // end mouse.leftdown
			else if(mouse.rightDown)
			{
				// console.log("onmousemove and rightDown is true");
				
				// Perform zooming; don't get too close           
				viewer.radius -= 0.01 * deltaX;
				viewer.radius = Math.max(0.1, viewer.radius);
			}
			
			//console.log("onmousemove make changes to viewer");
			
			// Recompute eye and up for camera
			var threePiOver2 = 4.71238898;
			var piOver2 = 1.57079632679;		
			var pi = 3.14159265359;
			
			//console.log("viewer.radius = ",viewer.radius);
			
			// pre-compute this value
			var r = viewer.radius * Math.sin(viewer.phi + piOver2);
			
			// eye on sphere with north pole at (0,1,0)
			// assume user init theta = phi = 0, so initialize to pi/2 for "better" view
			
			viewer.eye = vec3(r * Math.cos(viewer.theta + piOver2), viewer.radius * Math.cos(viewer.phi + piOver2), r * Math.sin(viewer.theta + piOver2));
			
			//add vector (at - origin) to move 
			for(k=0; k<3; k++)
				viewer.eye[k] = viewer.eye[k] + viewer.at[k];
			
			//console.log("theta=",viewer.theta,"  phi=",viewer.phi);
			//console.log("eye = ",viewer.eye[0],viewer.eye[1],viewer.eye[2]);
			//console.log("at = ",viewer.at[0],viewer.at[1],viewer.at[2]);
			//console.log(" ");
			
			// modify the up vector
			// flip the up vector to maintain line of sight cross product up to be to the right
			// true angle is phi + pi/2, so condition is if angle < 0 or > pi
			
			if (viewer.phi < piOver2 || viewer.phi > threePiOver2) {
				viewer.up = vec3(0.0, 1.0, 0.0);
			}
			else {
				viewer.up = vec3(0.0, -1.0, 0.0);
			}
			//console.log("up = ",viewer.up[0],viewer.up[1],viewer.up[2]);
			//console.log("update viewer.eye = ",viewer.eye,"  viewer.at=",viewer.at,"  viewer.up=",viewer.up);
			
			// Recompute the view
			lookAtMatrix = lookAt(vec3(viewer.eye), viewer.at, viewer.up);
			
			// console.log("Model View = ", modelView);
			 
			mouse.prevX = currentX;
			mouse.prevY = currentY;
			
			// console.log("onmousemove: made change");
			// console.log("viewer.eye = ",viewer.eye,"  viewer.at=",viewer.at,"  viewer.up=",viewer.up);
		
		} // end if button down
    }

    // Commence rendering.
    requestAnimFrame(render)
}

/**
 * Renders the objects in the canvas.
 * @param {Number} now lifetime of page after load 
 */
function render(now)
{
    // Clear the screen and depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Convert current time to seconds.
    pageLifetime = now * 0.001;
    // Subtract the previous time from the current time.
    var deltaTime = pageLifetime - timeAtLastFrame;
    // Remember the current time for the next frame.
    timeAtLastFrame = pageLifetime;

    // Check for light relocate animation.
    if (lightRelocateAnimation.active)
    {
        lightPosition.coordinates = lerpVec(lightRelocateAnimation.initialPosition, lightRelocateAnimation.finalPosition, lightRelocateAnimation.elapsedTime / lightRelocateAnimation.totalTime);

        if (lightRelocateAnimation.elapsedTime > lightRelocateAnimation.totalTime)
        {
            lightRelocateButton.htmlElement.disabled = false;
            lightOrbitButton.htmlElement.disabled = false;

            lightRelocateAnimation.active = false;
        }
        else
            lightRelocateAnimation.elapsedTime += deltaTime;
    }

    // Check for light orbit animation.
    if (lightOrbitAnimation.active && !lightRelocateAnimation.active)
    {
        lightOrbitAnimation.theta = (lightOrbitAnimation.elapsedTime / lightOrbitAnimation.totalTime) * doublePI;

        lightPosition.coordinates = vec4(lightOrbitAnimation.radius * Math.cos(lightOrbitAnimation.theta), 0, lightOrbitAnimation.radius * Math.sin(lightOrbitAnimation.theta));

        if (lightOrbitAnimation.elapsedTime > lightOrbitAnimation.totalTime)
            lightOrbitAnimation.elapsedTime = 0;
        else
            lightOrbitAnimation.elapsedTime += deltaTime;
    }

    // Check whether the light is utilizing world or eye coordinates.
    if (lightPosition.inWorldCoords)
    {
        gl.uniform4fv(lightPosition_Loc, multMatrixByVector(lookAtMatrix, lightPosition.coordinates));
    }
    else
    {
        gl.uniform4fv(lightPosition_Loc, lightPosition.coordinates);
    }

    // Calculate projection matrix and send.
    projection = perspective(perspectiveProperties.fov, perspectiveProperties.aspect, perspectiveProperties.near, perspectiveProperties.far);
    gl.uniformMatrix4fv(projection_Loc, false, flatten(projection));

    // Check if cylinder should be displayed.
    if (displayCylinder)
    {
        modelView = mult(lookAtMatrix, scalem(cylinderModel.scale));
        
        gl.uniformMatrix4fv(modelView_Loc, false, flatten(modelView));
        gl.uniform4fv(ambientColor_Loc, cylinderModel.color.ambient);
        gl.uniform4fv(diffuseColor_Loc, cylinderModel.color.diffuse);
        gl.uniform4fv(specularColor_Loc, cylinderModel.color.specular);
        gl.uniform1f(shininess_Loc, cylinderModel.material.shininess);
        gl.uniform1i(isNormalLine_Loc, false); // MAYBE
        gl.drawElements(gl.TRIANGLES, cylinderModel.orderCount, gl.UNSIGNED_SHORT, 2 * cylinderModel.firstOrderIndex);

        if (displaySurfaceNormals)
        {
            gl.uniform1i(isNormalLine_Loc, true);
            gl.drawElements(gl.LINES, cylinderModel.normalLines.orderCount, gl.UNSIGNED_SHORT, 2 * cylinderModel.normalLines.firstOrderIndex);
        }
    }
    
    // Check if ring should be displayed.
    if (displayRings)
    {
        gl.uniform4fv(ambientColor_Loc, ringModel.color.ambient);
        gl.uniform4fv(diffuseColor_Loc, ringModel.color.diffuse);
        gl.uniform4fv(specularColor_Loc, ringModel.color.specular);
        gl.uniform1f(shininess_Loc, ringModel.material.shininess);

        var theta = lerpNumber(0, 360, ringSpinAnimation.elapsedTime / ringSpinAnimation.totalTime);
        for(var i = 0; i < ringAmount; i++)
        {
            var ring = rings[i];

            modelView = mult(lookAtMatrix, rotate(theta + ring.thetaOffset, 0, 1, 0));
            modelView = mult(modelView, translate(ring.centerPosition));

            gl.uniformMatrix4fv(modelView_Loc, false, flatten(modelView));
            gl.uniform1i(isNormalLine_Loc, false);  // MAYBE

            gl.drawElements(gl.TRIANGLES, ringModel.orderCount, gl.UNSIGNED_SHORT, 2 * ringModel.firstOrderIndex);

            if (displaySurfaceNormals)
            {
                gl.uniform1i(isNormalLine_Loc, true);
                gl.drawElements(gl.LINES, ringModel.normalLines.orderCount, gl.UNSIGNED_SHORT, 2 * ringModel.normalLines.firstOrderIndex);
            }
        }
        
        ringSpinAnimation.elapsedTime += deltaTime;
        if (ringSpinAnimation.elapsedTime > ringSpinAnimation.totalTime)
        {
            ringSpinAnimation.elapsedTime = 0;
        }
    }

    // Render the scene again.
    requestAnimFrame(render);
}

// 
// written by Jesus C.
//
function multMatrixByVector(matrix, vector)
{
    let newVector = []; // holder for new vector
    for ( let i = 0; i < matrix.length; i++ ) // for the number of rows of the matrix how many sub vectors it has
    {
        let newVectorValue = 0; // start with 0 for the new value of each index
        for ( let j = 0; j < vector.length; j++ )  // for the length of the vector which is the same as the matrix row length
        newVectorValue += matrix[i][j] * vector[j]; // get the value of the new row from multiplying each row value against each vector row value and adding them together
        newVector.push(newVectorValue); // push the sum of those values to the index of the new
    }
    return newVector;
}

function lerpVec(a, b, t)
{
    if (a.length == 2 && b.length == 2)
    {
        return vec2(lerpNumber(a[0], b[0], t),
                    lerpNumber(a[1], b[1], t));
    }
    else if (a.length == 3 && b.length == 3)
    {
        return vec3(lerpNumber(a[0], b[0], t),
                    lerpNumber(a[1], b[1], t),
                    lerpNumber(a[2], b[2], t));
    }
    else if (a.length == 4 && b.length == 4)
    {
        return vec4(lerpNumber(a[0], b[0], t),
                    lerpNumber(a[1], b[1], t),
                    lerpNumber(a[2], b[2], t),
                    lerpNumber(a[3], b[3], t));
    }
}

function lerpNumber(a, b, t)
{
    return t >= 1 ? b : a + (b - a) * t;
}

function updateMaterial(oldMaterial, newMaterial)
{
    oldMaterial.ambient = newMaterial.ambient;
    oldMaterial.diffuse = newMaterial.diffuse;
    oldMaterial.specular = newMaterial.specular;
}

function calculateColor(light, material)
{
    var color = {};
    color.ambient = mult(light.ambient, material.ambient);
    color.diffuse = mult(light.diffuse, material.diffuse);
    color.specular = mult(light.specular, material.specular);
    return color;
}

function alterRingsRendered()
{
    rings = [];

    var xPosition = ringModel.majorRadius - ringModel.minorRadius - cylinderModel.scale[0];
    for(var i = 1; i < ringAmount + 1; i++)
    {
        var yPosRatio = (i - 0.5) / ringAmount;
        var yPosition = lerpNumber(-cylinderModel.scale[1], cylinderModel.scale[1], yPosRatio);
        var ringPosition = vec3(xPosition, yPosition, 0);

        var thetaRatio = ringAmount == 1 ? 0.5 : (i - 1) / (ringAmount - 1);
        var thetaOffset = lerpNumber(0, 180, thetaRatio);
        
        rings.push(new Ring(ringPosition, thetaOffset));
    }
}