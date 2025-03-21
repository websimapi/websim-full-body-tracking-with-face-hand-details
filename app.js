import { config } from './config.js';
import { initBodyTracking, updateBodyMesh, hideBodyMesh } from './bodyTracking.js';
import { initFaceTracking, updateFaceMesh, hideFaceMesh } from './faceTracking.js';
import { initHandTracking, updateHandMesh, hideHandMesh } from './handTracking.js';

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
    camera3D.position.set(0, 0, 2);
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

    // Initialize tracking meshes
    bodyMesh = initBodyTracking(scene, config);
    faceMesh = initFaceTracking(scene, config);
    leftHandMesh = initHandTracking(scene, config, 'left');
    rightHandMesh = initHandTracking(scene, config, 'right');

    // Handle window resize
    window.addEventListener('resize', () => {
        camera3D.aspect = sceneContainer.clientWidth / sceneContainer.clientHeight;
        camera3D.updateProjectionMatrix();
        renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
    });

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
        updateBodyMesh(bodyMesh, results.poseLandmarks);
    } else {
        // Hide body mesh
        hideBodyMesh(bodyMesh);
    }
    
    // Update face
    if (showFaceCheckbox.checked && results.faceLandmarks) {
        updateFaceMesh(faceMesh, results.faceLandmarks);
    } else {
        // Hide face mesh
        hideFaceMesh(faceMesh);
    }
    
    // Update hands
    if (showHandsCheckbox.checked) {
        // Update left hand
        if (results.leftHandLandmarks) {
            updateHandMesh(leftHandMesh, results.leftHandLandmarks);
        } else {
            hideHandMesh(leftHandMesh);
        }
        
        // Update right hand
        if (results.rightHandLandmarks) {
            updateHandMesh(rightHandMesh, results.rightHandLandmarks);
        } else {
            hideHandMesh(rightHandMesh);
        }
    } else {
        // Hide hand meshes
        hideHandMesh(leftHandMesh);
        hideHandMesh(rightHandMesh);
    }
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

// Constants for landmark connections
export const POSE_CONNECTIONS = [
    // Face
    [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
    // Upper body
    [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19], 
    [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20], [11, 23], [12, 24], 
    [23, 24], [23, 25], [24, 26], [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], 
    [30, 32], [27, 31], [28, 32]
];

export const FACEMESH_TESSELATION = [
    // A subset of the full mesh connections
    [127, 34], [34, 139], [139, 127], [11, 0], [0, 37], [37, 11], 
    [232, 231], [231, 120], [120, 232], [72, 37], [37, 39], [39, 72],
    [128, 121], [121, 47], [47, 128], [232, 121], [121, 128], [128, 232],
    [104, 69], [69, 67], [67, 104], [175, 152], [152, 157], [157, 175],
    [36, 142], [142, 70], [70, 36], [124, 46], [46, 91], [91, 124],
    // Simplified for brevity
];

export const FACEMESH_CONTOURS = [
    // Face oval
    [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389], 
    [389, 356], [356, 454], [454, 323], [323, 361], [361, 288], [288, 397], 
    [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152], 
    [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172], 
    [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162], 
    [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10],
    // Simplified for brevity
];

export const HAND_CONNECTIONS = [
    // Thumb
    [0, 1], [1, 2], [2, 3], [3, 4],
    // Index finger
    [0, 5], [5, 6], [6, 7], [7, 8],
    // Middle finger
    [0, 9], [9, 10], [10, 11], [11, 12],
    // Ring finger
    [0, 13], [13, 14], [14, 15], [15, 16],
    // Pinky
    [0, 17], [17, 18], [18, 19], [19, 20],
    // Palm
    [0, 17], [5, 9], [9, 13], [13, 17]
];

// Initialize the app when the page loads
window.addEventListener('DOMContentLoaded', init);