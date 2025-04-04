import { config } from './config.js';
import { initBodyTracking, updateBodyMesh, hideBodyMesh, POSE_CONNECTIONS } from './bodyTracking.js'; 
import { initFaceTracking, updateFaceMesh, hideFaceMesh, FACEMESH_TESSELATION, FACEMESH_CONTOURS } from './faceTracking.js';
import { initHandTracking, updateHandMesh, hideHandMesh, HAND_CONNECTIONS } from './handTracking.js';
import { createBone, updateBone } from './utils.js';

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

    // Initialize avatar meshes
    bodyMesh = initBodyTracking(scene, THREE, config);
    faceMesh = initFaceTracking(scene, THREE, config);
    leftHandMesh = initHandTracking(scene, THREE, config, 'left');
    rightHandMesh = initHandTracking(scene, THREE, config, 'right');

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
        // Pass hand landmarks to potentially override wrist positions
        updateBodyMesh(
            results.poseLandmarks, 
            bodyMesh, 
            updateBone,
            results.leftHandLandmarks,
            results.rightHandLandmarks
        );
    } else {
        // Hide body mesh
        hideBodyMesh(bodyMesh);
    }
    
    // Update face
    if (showFaceCheckbox.checked && results.faceLandmarks) {
        updateFaceMesh(results.faceLandmarks, faceMesh, updateBone);
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

// Process and visualize the tracking results
function onResults(results) {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Only draw if we have results
    if (!results || !results.poseLandmarks) return; // Ensure pose landmarks exist
    
    // Update 3D visualization with the new pose data
    updateThreeJSPose(results);
    
    // Draw body pose if enabled (on the small webcam feed)
    if (showBodyCheckbox.checked && results.poseLandmarks) {
        // Draw pose connectors - Use the filtered POSE_CONNECTIONS
        drawConnectors(
            ctx, results.poseLandmarks, POSE_CONNECTIONS,
            {color: config.colors.body.connectors}
        );
        
        // Draw pose landmarks - Filter out face landmarks (0-10) for drawing
        const bodyLandmarksOnly = results.poseLandmarks.slice(11); 
        // Create a map for landmark indices for drawLandmarks
        const bodyLandmarkIndices = {};
        results.poseLandmarks.forEach((lm, index) => {
            if (index >= 11) { // Only include non-face landmarks
                bodyLandmarkIndices[index] = lm;
            }
        });
        
        drawLandmarks(
            ctx, Object.values(bodyLandmarkIndices), // Pass only the non-face landmarks
            {color: config.colors.body.landmarks, radius: config.pointSizes.body}
        );
    }
    
    // Draw face if enabled (on the small webcam feed)
    // Keep this section as is, it handles the separate detailed face tracking
    if (showFaceCheckbox.checked) {
        if (results.faceLandmarks) {
            // Draw face landmarks
            drawLandmarks(
                ctx, results.faceLandmarks,
                {color: config.colors.face.landmarks, radius: config.pointSizes.face}
            );
        }
        
        // The MediPipe Holistic results object uses 'faceLandmarks' for the detailed mesh,
        // not 'faceMesh'. Let's correct the drawing calls.
        if (results.faceLandmarks) { // Check for faceLandmarks again
            // Draw face mesh tesselation using the detailed faceLandmarks
            drawConnectors(
                ctx, results.faceLandmarks, FACEMESH_TESSELATION, // Use faceLandmarks here
                {color: config.colors.face.mesh, lineWidth: 0.5}
            );
            
            // Draw face contours using the detailed faceLandmarks
            drawConnectors(
                ctx, results.faceLandmarks, FACEMESH_CONTOURS, // Use faceLandmarks here
                {color: config.colors.face.connectors}
            );
        }
         if (results.faceGeometry && config.modelSettings.enableFaceGeometry) {
            // Additional face geometry visualization could be added here
        }
    }
    
    // Draw hands if enabled (on the small webcam feed)
    // Keep this section as is
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