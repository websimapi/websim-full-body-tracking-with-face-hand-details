import { config } from './config.js';
import { initBodyTracking, updateBodyMesh, hideBodyMesh, POSE_CONNECTIONS } from './bodyTracking.js';
import { initFaceTracking, updateFaceMesh, hideFaceMesh, FACEMESH_TESSELATION, FACEMESH_CONTOURS } from './faceTracking.js';
import { initHandTracking, updateHandMesh, hideHandMesh, HAND_CONNECTIONS } from './handTracking.js';
import { createBone, updateBone, createTerrain } from './utils.js';

// Global references to MediaPipe objects now loaded via script tags
const Holistic = window.Holistic;
const drawConnectors = window.drawConnectors;
const drawLandmarks = window.drawLandmarks;
const Camera = window.Camera;
const THREE = window.THREE;

// DOM Elements
const video = document.getElementById('webcam');
const canvas = document.getElementById('output-canvas');
const ctx = canvas.getContext('2d');
const statusElement = document.getElementById('status');
const sceneContainer = document.getElementById('scene-container');

// Control checkboxes
const showBodyCheckbox = document.getElementById('show-body');
const showFaceCheckbox = document.getElementById('show-face');
const showHandsCheckbox = document.getElementById('show-hands');

// Tracking state
let holistic;
let camera;

// Three.js objects
let scene, renderer, camera3D;
let bodyMesh = {};
let faceMesh = {};
let leftHandMesh = {};
let rightHandMesh = {};
let terrain = {};
let characterGroup;
let previousHeadYaw = 0;
let previousLeftWristY = 0;
let previousRightWristY = 0;

// Initialize the application
async function init() {
    try {
        statusElement.textContent = "Initializing holistic model...";
        
        // Initialize the holistic model
        holistic = new Holistic({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/${file}`;
            }
        });
        
        // Configure the model with settings from config.js
        holistic.setOptions(config.modelSettings);
        
        // Set up the callback for processing results
        holistic.onResults(onResults);
        
        // Set up the camera
        camera = new Camera(video, {
            onFrame: async () => {
                await holistic.send({image: video});
            },
            width: config.camera.width,
            height: config.camera.height,
            fps: config.camera.fps
        });
        
        // Initialize Three.js scene
        initThreeJS();
        
        // Start the camera
        await camera.start();
        
        // Resize canvas to match video dimensions
        resizeCanvasToDisplaySize();
        
        statusElement.textContent = "Tracking active";
    } catch (error) {
        console.error("Error initializing:", error);
        statusElement.textContent = "Error: " + error.message;
    }
}

// Initialize Three.js scene
function initThreeJS() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(config.threeJS.background);

    // Create camera
    camera3D = new THREE.PerspectiveCamera(75, sceneContainer.clientWidth / sceneContainer.clientHeight, 0.1, 1000);
    camera3D.position.set(0, 2, 6);
    camera3D.lookAt(0, 0, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
    sceneContainer.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 1, 2);
    scene.add(directionalLight);
    
    // Create terrain
    terrain = createTerrain(scene, THREE, config);
    
    // Create character group to contain all body parts
    characterGroup = new THREE.Group();
    scene.add(characterGroup);

    // Initialize avatar meshes
    bodyMesh = initBodyTracking(characterGroup, THREE, config);
    faceMesh = initFaceTracking(characterGroup, THREE, config);
    leftHandMesh = initHandTracking(characterGroup, THREE, config, 'left');
    rightHandMesh = initHandTracking(characterGroup, THREE, config, 'right');
    
    // Position character on terrain
    characterGroup.position.set(0, terrain.getHeightAt(0, 0) + 1, 0);

    // Handle window resize
    window.addEventListener('resize', () => {
        camera3D.aspect = sceneContainer.clientWidth / sceneContainer.clientHeight;
        camera3D.updateProjectionMatrix();
        renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
    });

    // Add orbit controls
    const controls = new THREE.OrbitControls(camera3D, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 15;
    controls.maxPolarAngle = Math.PI / 2;

    // Start animation loop
    animate();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera3D);
}

// Handle window resize
window.addEventListener('resize', resizeCanvasToDisplaySize);

function resizeCanvasToDisplaySize() {
    const vidWidth = video.clientWidth;
    const vidHeight = video.clientHeight;
    
    canvas.width = vidWidth;
    canvas.height = vidHeight;
}

// Update the 3D scene with new pose data
function updateThreeJSPose(results) {
    // Update body pose
    if (showBodyCheckbox.checked && results.poseLandmarks) {
        updateBodyMesh(results.poseLandmarks, bodyMesh, updateBone);
        
        // Move character based on arm movements
        controlCharacterWithPose(results.poseLandmarks);
    } else {
        // Hide body mesh
        hideBodyMesh(bodyMesh);
    }
    
    // Update face
    if (showFaceCheckbox.checked && results.faceLandmarks) {
        updateFaceMesh(results.faceLandmarks, faceMesh, updateBone);
        
        // Rotate character based on head rotation
        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            controlCharacterWithHead(results.faceLandmarks);
        }
    } else {
        // Hide face mesh
        hideFaceMesh(faceMesh);
    }
    
    // Update hands
    if (showHandsCheckbox.checked) {
        // Update left hand
        if (results.leftHandLandmarks) {
            updateHandMesh(results.leftHandLandmarks, leftHandMesh, updateBone);
        } else {
            hideHandMesh(leftHandMesh);
        }
        
        // Update right hand
        if (results.rightHandLandmarks) {
            updateHandMesh(results.rightHandLandmarks, rightHandMesh, updateBone);
        } else {
            hideHandMesh(rightHandMesh);
        }
    } else {
        // Hide hand meshes
        hideHandMesh(leftHandMesh);
        hideHandMesh(rightHandMesh);
    }
}

// Control character movement with arm positions
function controlCharacterWithPose(landmarks) {
    if (!landmarks || landmarks.length < 16) return;
    
    // Get current wrist Y positions (landmarks 15 and 16 are the wrists)
    const leftWristY = landmarks[15].y;
    const rightWristY = landmarks[16].y;
    
    // Calculate change in wrist position
    const leftDelta = previousLeftWristY - leftWristY;
    const rightDelta = previousRightWristY - rightWristY;
    
    // Store current positions for next frame
    previousLeftWristY = leftWristY;
    previousRightWristY = rightWristY;
    
    // Move forward if both arms are moving up and down in sync
    if (Math.abs(leftDelta) > config.character.armMovementThreshold && 
        Math.abs(rightDelta) > config.character.armMovementThreshold &&
        Math.sign(leftDelta) === Math.sign(rightDelta)) {
        
        // Get direction vector from character's rotation
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(characterGroup.quaternion);
        
        // Move character forward
        characterGroup.position.add(direction.multiplyScalar(config.character.moveSpeed));
        
        // Keep character above terrain
        const x = characterGroup.position.x;
        const z = characterGroup.position.z;
        const y = terrain.getHeightAt(x, z) + 1; // +1 to keep character above ground
        characterGroup.position.y = y;
    }
}

// Control character rotation with head rotation
function controlCharacterWithHead(faceLandmarks) {
    // Calculate head yaw by comparing nose and eye positions
    const nose = faceLandmarks[1];
    const leftEye = faceLandmarks[33];
    const rightEye = faceLandmarks[263];
    
    // Simple calculation of head rotation based on horizontal nose position
    const headYaw = (nose.x - 0.5) * 2;
    
    // Only rotate if the head movement is greater than threshold
    if (Math.abs(headYaw - previousHeadYaw) > config.character.headRotationThreshold) {
        // Rotate character group
        characterGroup.rotation.y -= (headYaw - previousHeadYaw) * config.character.rotationSpeed;
    }
    
    previousHeadYaw = headYaw;
}

// Process and visualize the tracking results
function onResults(results) {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Only draw if we have results
    if (!results) return;
    
    // Update 3D visualization with the new pose data
    updateThreeJSPose(results);
    
    // Draw body pose if enabled (on the small webcam feed)
    if (showBodyCheckbox.checked && results.poseLandmarks) {
        // Draw pose connectors
        drawConnectors(
            ctx, results.poseLandmarks, POSE_CONNECTIONS,
            {color: config.colors.body.connectors}
        );
        
        // Draw pose landmarks
        drawLandmarks(
            ctx, results.poseLandmarks,
            {color: config.colors.body.landmarks, radius: config.pointSizes.body}
        );
    }
    
    // Draw face if enabled (on the small webcam feed)
    if (showFaceCheckbox.checked) {
        if (results.faceLandmarks) {
            // Draw face landmarks
            drawLandmarks(
                ctx, results.faceLandmarks,
                {color: config.colors.face.landmarks, radius: config.pointSizes.face}
            );
        }
        
        if (results.faceGeometry && config.modelSettings.enableFaceGeometry) {
            // Additional face geometry visualization could be added here
        }
        
        if (results.faceMesh) {
            // Draw face mesh tesselation
            drawConnectors(
                ctx, results.faceMesh, FACEMESH_TESSELATION,
                {color: config.colors.face.mesh, lineWidth: 0.5}
            );
            
            // Draw face contours
            drawConnectors(
                ctx, results.faceMesh, FACEMESH_CONTOURS,
                {color: config.colors.face.connectors}
            );
        }
    }
    
    // Draw hands if enabled (on the small webcam feed)
    if (showHandsCheckbox.checked) {
        // Left hand
        if (results.leftHandLandmarks) {
            drawConnectors(
                ctx, results.leftHandLandmarks, HAND_CONNECTIONS,
                {color: config.colors.leftHand.connectors}
            );
            
            drawLandmarks(
                ctx, results.leftHandLandmarks,
                {color: config.colors.leftHand.landmarks, radius: config.pointSizes.hand}
            );
        }
        
        // Right hand
        if (results.rightHandLandmarks) {
            drawConnectors(
                ctx, results.rightHandLandmarks, HAND_CONNECTIONS,
                {color: config.colors.rightHand.connectors}
            );
            
            drawLandmarks(
                ctx, results.rightHandLandmarks,
                {color: config.colors.rightHand.landmarks, radius: config.pointSizes.hand}
            );
        }
    }
}

// Initialize the app when the page loads
window.addEventListener('DOMContentLoaded', init);