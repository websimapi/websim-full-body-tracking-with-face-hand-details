import { config } from './config.js';
import * as ThreeUtils from './three-utils.js';

// Global references to MediaPipe objects now loaded via script tags
const Holistic = window.Holistic;
const drawConnectors = window.drawConnectors;
const drawLandmarks = window.drawLandmarks;
const Camera = window.Camera;

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
        ThreeUtils.initThreeJS(sceneContainer);
        
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

// Handle window resize
window.addEventListener('resize', resizeCanvasToDisplaySize);

function resizeCanvasToDisplaySize() {
    const vidWidth = video.clientWidth;
    const vidHeight = video.clientHeight;
    
    canvas.width = vidWidth;
    canvas.height = vidHeight;
}

// Process and visualize the tracking results
function onResults(results) {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Only draw if we have results
    if (!results) return;
    
    // Update 3D visualization with the new pose data
    ThreeUtils.updateThreeJSPose(results, showBodyCheckbox, showFaceCheckbox, showHandsCheckbox);
    
    // Draw body pose if enabled (on the small webcam feed)
    if (showBodyCheckbox.checked && results.poseLandmarks) {
        // Draw pose connectors
        drawConnectors(
            ctx, results.poseLandmarks, ThreeUtils.POSE_CONNECTIONS,
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
                ctx, results.faceMesh, ThreeUtils.FACEMESH_TESSELATION,
                {color: config.colors.face.mesh, lineWidth: 0.5}
            );
            
            // Draw face contours
            drawConnectors(
                ctx, results.faceMesh, ThreeUtils.FACEMESH_CONTOURS,
                {color: config.colors.face.connectors}
            );
        }
    }
    
    // Draw hands if enabled (on the small webcam feed)
    if (showHandsCheckbox.checked) {
        // Left hand
        if (results.leftHandLandmarks) {
            drawConnectors(
                ctx, results.leftHandLandmarks, ThreeUtils.HAND_CONNECTIONS,
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
                ctx, results.rightHandLandmarks, ThreeUtils.HAND_CONNECTIONS,
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