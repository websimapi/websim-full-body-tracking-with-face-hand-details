import { config } from './config.js';
const THREE = window.THREE;

// Three.js objects
let scene, renderer, camera3D;
let bodyMesh = {};
let faceMesh = {};
let leftHandMesh = {};
let rightHandMesh = {};

// Constants for landmark connections
// POSE_CONNECTIONS for body pose
const POSE_CONNECTIONS = [
    // Face
    [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
    // Upper body
    [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19], 
    [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20], [11, 23], [12, 24], 
    [23, 24], [23, 25], [24, 26], [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], 
    [30, 32], [27, 31], [28, 32]
];

// FACEMESH_CONTOURS for face contours
const FACEMESH_CONTOURS = [
    // Face oval
    [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389], 
    [389, 356], [356, 454], [454, 323], [323, 361], [361, 288], [288, 397], 
    [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152], 
    [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172], 
    [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162], 
    [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10],
];

// HAND_CONNECTIONS for hand landmarks
const HAND_CONNECTIONS = [
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

// Initialize Three.js scene
function initThreeJS(sceneContainer) {
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
    createBodyMesh();
    createFaceMesh();
    createHandMeshes();

    // Handle window resize
    window.addEventListener('resize', () => {
        camera3D.aspect = sceneContainer.clientWidth / sceneContainer.clientHeight;
        camera3D.updateProjectionMatrix();
        renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
    });

    // Start animation loop
    animate();
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
function updateThreeJSPose(results, showBody, showFace, showHands) {
    // Update body pose
    if (showBody && results.poseLandmarks) {
        updateBodyMesh(results.poseLandmarks, results.leftHandLandmarks, results.rightHandLandmarks);
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

// Improved method to better align arm bones with hands
function updateBodyMesh(landmarks, leftHandLandmarks, rightHandLandmarks) {
    // First position all body joints
    for (let i = 0; i < landmarks.length; i++) {
        const landmark = landmarks[i];
        const joint = bodyMesh.joints[i];
        
        // Convert to 3D space, flipping coordinates as needed
        joint.position.set(
            -(landmark.x - 0.5) * 2, // x flipped and centered
            (landmark.y - 0.5) * -2, // y inverted and centered
            (landmark.z * 2) // z scaled for better visibility
        );
        
        joint.visible = landmark.visibility > 0.5;
    }
    
    // Special handling for wrist joints if hands are detected
    // This ensures better alignment between arms and hands
    if (leftHandLandmarks && leftHandLandmarks.length > 0 && bodyMesh.joints[15].visible) {
        // Left wrist (joint 15) should align with hand base (0)
        const wristJoint = bodyMesh.joints[15];
        const handBase = new THREE.Vector3(
            -(leftHandLandmarks[0].x - 0.5) * 2,
            (leftHandLandmarks[0].y - 0.5) * -2,
            (leftHandLandmarks[0].z * 2)
        );
        
        // Adjust the wrist position for smoother connection
        wristJoint.position.lerp(handBase, config.threeJS.armAdjustFactor);
        
        // Also adjust elbow position (joint 13) to create a natural arm posture
        const elbowToWrist = new THREE.Vector3().subVectors(wristJoint.position, bodyMesh.joints[13].position);
        elbowToWrist.multiplyScalar(config.threeJS.armAdjustFactor * 0.5);
        bodyMesh.joints[13].position.add(elbowToWrist);
    }
    
    if (rightHandLandmarks && rightHandLandmarks.length > 0 && bodyMesh.joints[16].visible) {
        // Right wrist (joint 16) should align with hand base (0)
        const wristJoint = bodyMesh.joints[16];
        const handBase = new THREE.Vector3(
            -(rightHandLandmarks[0].x - 0.5) * 2,
            (rightHandLandmarks[0].y - 0.5) * -2,
            (rightHandLandmarks[0].z * 2)
        );
        
        // Adjust the wrist position for smoother connection
        wristJoint.position.lerp(handBase, config.threeJS.armAdjustFactor);
        
        // Also adjust elbow position (joint 14) to create a natural arm posture
        const elbowToWrist = new THREE.Vector3().subVectors(wristJoint.position, bodyMesh.joints[14].position);
        elbowToWrist.multiplyScalar(config.threeJS.armAdjustFactor * 0.5);
        bodyMesh.joints[14].position.add(elbowToWrist);
    }
    
    // Now update all bones between joints with potentially adjusted positions
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
    if (!landmarks || landmarks.length === 0) return;
    
    // Update face landmarks
    for (let i = 0; i < landmarks.length; i++) {
        if (!faceMesh.landmarks[i]) continue; // Skip if landmark doesn't exist in our mesh
        
        const landmark = landmarks[i];
        const joint = faceMesh.landmarks[i];
        
        // Position face landmarks in 3D space
        joint.position.set(
            -(landmark.x - 0.5) * 2, 
            (landmark.y - 0.5) * -2, 
            (landmark.z * 2)
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
        
        // Position hand landmarks in 3D space
        joint.position.set(
            -(landmark.x - 0.5) * 2, 
            (landmark.y - 0.5) * -2, 
            (landmark.z * 2)
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
    
    // Orientation
    bone.lookAt(endPos);
    
    // Scale
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

export { 
    initThreeJS, 
    updateThreeJSPose
};