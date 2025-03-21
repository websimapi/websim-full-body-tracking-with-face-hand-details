import { config } from './config.js';
import { POSE_CONNECTIONS, HAND_CONNECTIONS, FACEMESH_CONTOURS } from './app.js';

// Three.js objects
let scene, renderer, camera3D;
let bodyMesh = {};
let faceMesh = {};
let leftHandMesh = {};
let rightHandMesh = {};
const THREE = window.THREE;

// Initialize Three.js scene
export function initThreeJS(container) {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(config.threeJS.background);

    // Create camera
    camera3D = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera3D.position.set(0, 0, 2);
    camera3D.lookAt(0, 0, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 1, 2);
    scene.add(directionalLight);

    // Initialize avatar meshes
    createBodyMesh();
    createFaceMesh();
    createHandMeshes();

    // Handle window resize
    window.addEventListener('resize', () => {
        camera3D.aspect = container.clientWidth / container.clientHeight;
        camera3D.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // Start animation loop
    animate();
    
    return scene;
}

function createBodyMesh() {
    // Create joints
    bodyMesh.joints = {};
    bodyMesh.bones = {};
    
    // Create a material for body joints
    const jointMaterial = new THREE.MeshStandardMaterial({ 
        color: config.threeJS.bodyColor,
        emissive: config.threeJS.bodyColor,
        emissiveIntensity: 0.3
    });
    
    const jointGeometry = new THREE.SphereGeometry(config.threeJS.jointRadius, 16, 16);
    
    // Add body joints to the scene (we'll position them in the update function)
    for (let i = 0; i < 33; i++) {
        const joint = new THREE.Mesh(jointGeometry, jointMaterial);
        joint.visible = false;
        scene.add(joint);
        bodyMesh.joints[i] = joint;
    }
    
    // Create bones (cylinders between joints)
    const boneMaterial = new THREE.MeshStandardMaterial({ 
        color: config.threeJS.bodyColor,
        emissive: config.threeJS.bodyColor,
        emissiveIntensity: 0.2
    });
    
    // Create bones for pose connections
    for (const connection of POSE_CONNECTIONS) {
        const bone = createBone(boneMaterial, config.threeJS.boneRadius);
        scene.add(bone);
        bone.visible = false;
        bodyMesh.bones[connection.join('-')] = bone;
    }
}

function createFaceMesh() {
    // Create face landmarks
    faceMesh.landmarks = {};
    faceMesh.connections = {};
    
    const faceMaterial = new THREE.MeshStandardMaterial({ 
        color: config.threeJS.faceColor,
        emissive: config.threeJS.faceColor,
        emissiveIntensity: 0.3
    });
    
    const jointGeometry = new THREE.SphereGeometry(config.threeJS.jointRadius * 0.5, 8, 8);
    
    // We'll add only key face landmarks for simplicity
    for (let i = 0; i < 468; i++) {
        const joint = new THREE.Mesh(jointGeometry, faceMaterial);
        joint.visible = false;
        scene.add(joint);
        faceMesh.landmarks[i] = joint;
    }
    
    // Create face connections for important contours
    const faceConnectorMaterial = new THREE.MeshStandardMaterial({ 
        color: config.threeJS.faceColor,
        emissive: config.threeJS.faceColor,
        emissiveIntensity: 0.2
    });
    
    for (const connection of FACEMESH_CONTOURS) {
        const bone = createBone(faceConnectorMaterial, config.threeJS.boneRadius * 0.4);
        scene.add(bone);
        bone.visible = false;
        faceMesh.connections[connection.join('-')] = bone;
    }
}

function createHandMeshes() {
    // Create hand landmarks and connections
    leftHandMesh.landmarks = {};
    leftHandMesh.connections = {};
    rightHandMesh.landmarks = {};
    rightHandMesh.connections = {};
    
    const leftHandMaterial = new THREE.MeshStandardMaterial({ 
        color: config.threeJS.leftHandColor,
        emissive: config.threeJS.leftHandColor,
        emissiveIntensity: 0.3
    });
    
    const rightHandMaterial = new THREE.MeshStandardMaterial({ 
        color: config.threeJS.rightHandColor,
        emissive: config.threeJS.rightHandColor,
        emissiveIntensity: 0.3
    });
    
    const jointGeometry = new THREE.SphereGeometry(config.threeJS.jointRadius * 0.6, 8, 8);
    
    // Create left hand joints
    for (let i = 0; i < 21; i++) {
        const joint = new THREE.Mesh(jointGeometry, leftHandMaterial);
        joint.visible = false;
        scene.add(joint);
        leftHandMesh.landmarks[i] = joint;
    }
    
    // Create right hand joints
    for (let i = 0; i < 21; i++) {
        const joint = new THREE.Mesh(jointGeometry, rightHandMaterial);
        joint.visible = false;
        scene.add(joint);
        rightHandMesh.landmarks[i] = joint;
    }
    
    // Create hand connections
    const leftHandConnectorMaterial = new THREE.MeshStandardMaterial({ 
        color: config.threeJS.leftHandColor,
        emissive: config.threeJS.leftHandColor,
        emissiveIntensity: 0.2
    });
    
    const rightHandConnectorMaterial = new THREE.MeshStandardMaterial({ 
        color: config.threeJS.rightHandColor,
        emissive: config.threeJS.rightHandColor,
        emissiveIntensity: 0.2
    });
    
    for (const connection of HAND_CONNECTIONS) {
        // Left hand bones
        const leftBone = createBone(leftHandConnectorMaterial, config.threeJS.boneRadius * 0.5);
        scene.add(leftBone);
        leftBone.visible = false;
        leftHandMesh.connections[connection.join('-')] = leftBone;
        
        // Right hand bones
        const rightBone = createBone(rightHandConnectorMaterial, config.threeJS.boneRadius * 0.5);
        scene.add(rightBone);
        rightBone.visible = false;
        rightHandMesh.connections[connection.join('-')] = rightBone;
    }
}

// Helper function to create a bone (cylinder) between joints
function createBone(material, radius) {
    // Create a cylinder for the bone
    const geometry = new THREE.CylinderGeometry(radius, radius, 1, 8);
    // Rotate the cylinder so it's aligned along the z-axis
    geometry.rotateX(Math.PI / 2);
    const bone = new THREE.Mesh(geometry, material);
    return bone;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera3D);
}

// Update the 3D scene with new pose data
export function updateThreeJSPose(results, showBody, showFace, showHands) {
    // Update body pose
    if (showBody && results.poseLandmarks) {
        updateBodyMesh(results.poseLandmarks);
    } else {
        // Hide body mesh
        hideBodyMesh();
    }
    
    // Update face
    if (showFace && results.faceLandmarks) {
        updateFaceMesh(results.faceLandmarks);
    } else {
        // Hide face mesh
        hideFaceMesh();
    }
    
    // Update hands
    if (showHands) {
        // Update left hand
        if (results.leftHandLandmarks) {
            updateHandMesh(results.leftHandLandmarks, leftHandMesh);
        } else {
            hideHandMesh(leftHandMesh);
        }
        
        // Update right hand
        if (results.rightHandLandmarks) {
            updateHandMesh(results.rightHandLandmarks, rightHandMesh);
        } else {
            hideHandMesh(rightHandMesh);
        }
    } else {
        // Hide hand meshes
        hideHandMesh(leftHandMesh);
        hideHandMesh(rightHandMesh);
    }
}

function updateBodyMesh(landmarks) {
    // Scale and position the joints based on the landmarks
    for (let i = 0; i < landmarks.length; i++) {
        const landmark = landmarks[i];
        const joint = bodyMesh.joints[i];
        
        // Convert to 3D space, flipping coordinates as needed
        joint.position.set(
            -(landmark.x - 0.5) * 2, // x flipped and centered
            (landmark.y - 0.5) * -2, // y inverted and centered
            (landmark.z * 4) // z scaled for better visibility - increased scaling factor
        );
        
        joint.visible = landmark.visibility > 0.5;
    }
    
    // Update bones between joints
    for (const connection of POSE_CONNECTIONS) {
        const [i, j] = connection;
        const bone = bodyMesh.bones[connection.join('-')];
        
        const jointA = bodyMesh.joints[i];
        const jointB = bodyMesh.joints[j];
        
        // Only show bones if both joints are visible
        if (jointA.visible && jointB.visible) {
            updateBone(bone, jointA.position, jointB.position);
            bone.visible = true;
        } else {
            bone.visible = false;
        }
    }
}

function updateFaceMesh(landmarks) {
    if (!landmarks) return;
    
    // Update face landmarks
    for (let i = 0; i < landmarks.length; i++) {
        if (!faceMesh.landmarks[i]) continue; // Skip if landmark doesn't exist in our mesh
        
        const landmark = landmarks[i];
        const joint = faceMesh.landmarks[i];
        
        // Position face landmarks in 3D space with increased z scaling
        joint.position.set(
            -(landmark.x - 0.5) * 2, 
            (landmark.y - 0.5) * -2, 
            (landmark.z * 4) // Increased z scaling to match body
        );
        
        joint.visible = true;
    }
    
    // Update face contour connections
    for (const connection of FACEMESH_CONTOURS) {
        const [i, j] = connection;
        if (!faceMesh.connections[connection.join('-')] || !faceMesh.landmarks[i] || !faceMesh.landmarks[j]) continue;
        
        const bone = faceMesh.connections[connection.join('-')];
        
        updateBone(bone, faceMesh.landmarks[i].position, faceMesh.landmarks[j].position);
        bone.visible = true;
    }
}

function updateHandMesh(landmarks, handMesh) {
    // Update hand landmarks
    for (let i = 0; i < landmarks.length; i++) {
        const landmark = landmarks[i];
        const joint = handMesh.landmarks[i];
        
        // Position hand landmarks in 3D space with increased z scaling
        joint.position.set(
            -(landmark.x - 0.5) * 2, 
            (landmark.y - 0.5) * -2, 
            (landmark.z * 4) // Increased z scaling to match body
        );
        
        joint.visible = true;
    }
    
    // Update hand connections
    for (const connection of HAND_CONNECTIONS) {
        const [i, j] = connection;
        const bone = handMesh.connections[connection.join('-')];
        
        updateBone(bone, handMesh.landmarks[i].position, handMesh.landmarks[j].position);
        bone.visible = true;
    }
}

function updateBone(bone, startPos, endPos) {
    // Position
    const midpoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
    bone.position.copy(midpoint);
    
    // Orientation - make the bone point toward the end position
    bone.lookAt(endPos);
    
    // Scale - length scaled to match the distance between joints
    const length = startPos.distanceTo(endPos);
    bone.scale.set(1, 1, length);
}

function hideBodyMesh() {
    // Hide all body joints and bones
    for (const key in bodyMesh.joints) {
        bodyMesh.joints[key].visible = false;
    }
    
    for (const key in bodyMesh.bones) {
        bodyMesh.bones[key].visible = false;
    }
}

function hideFaceMesh() {
    // Hide all face landmarks and connections
    for (const key in faceMesh.landmarks) {
        faceMesh.landmarks[key].visible = false;
    }
    
    for (const key in faceMesh.connections) {
        faceMesh.connections[key].visible = false;
    }
}

function hideHandMesh(handMesh) {
    // Hide all hand landmarks and connections
    for (const key in handMesh.landmarks) {
        handMesh.landmarks[key].visible = false;
    }
    
    for (const key in handMesh.connections) {
        handMesh.connections[key].visible = false;
    }
}