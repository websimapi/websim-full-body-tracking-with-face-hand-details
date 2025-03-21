/**
 * Hand tracking module for 3D visualization
 */

// Constants for hand landmark connections
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

// Initialize hand tracking
export function initHandTracking(scene, THREE, config, side) {
    const handMesh = {
        landmarks: {},
        connections: {}
    };
    
    const isLeft = side === 'left';
    const colorKey = isLeft ? 'leftHandColor' : 'rightHandColor';
    
    const handMaterial = new THREE.MeshStandardMaterial({ 
        color: config.threeJS[colorKey],
        emissive: config.threeJS[colorKey],
        emissiveIntensity: 0.3
    });
    
    const jointGeometry = new THREE.SphereGeometry(config.threeJS.jointRadius * 0.6, 8, 8);
    
    // Create hand joints
    for (let i = 0; i < 21; i++) {
        const joint = new THREE.Mesh(jointGeometry, handMaterial);
        joint.visible = false;
        scene.add(joint);
        handMesh.landmarks[i] = joint;
    }
    
    // Create hand connections
    const handConnectorMaterial = new THREE.MeshStandardMaterial({ 
        color: config.threeJS[colorKey],
        emissive: config.threeJS[colorKey],
        emissiveIntensity: 0.2
    });
    
    for (const connection of HAND_CONNECTIONS) {
        const geometry = new THREE.CylinderGeometry(
            config.threeJS.boneRadius * 0.5, 
            config.threeJS.boneRadius * 0.5, 
            1, 8
        );
        geometry.rotateX(Math.PI / 2);
        const bone = new THREE.Mesh(geometry, handConnectorMaterial);
        scene.add(bone);
        bone.visible = false;
        handMesh.connections[connection.join('-')] = bone;
    }
    
    return handMesh;
}

// Update hand mesh with new landmark data
export function updateHandMesh(landmarks, handMesh, updateBoneFn, smoothingEnabled = true, smoothingFactor = 0.75) {
    // Update hand landmarks
    for (let i = 0; i < landmarks.length; i++) {
        const landmark = landmarks[i];
        const joint = handMesh.landmarks[i];
        
        // Calculate new position in 3D space
        const newPosition = new THREE.Vector3(
            -(landmark.x - 0.5) * 2, 
            (landmark.y - 0.5) * -2, 
            (landmark.z * 2)
        );
        
        // Apply smoothing if enabled
        if (smoothingEnabled && joint.userData && joint.userData.prevPosition) {
            if (!joint.userData.prevPosition) {
                joint.userData.prevPosition = new THREE.Vector3();
            }
            joint.position.copy(smoothPosition(joint.userData.prevPosition, newPosition, smoothingFactor));
        } else {
            joint.position.copy(newPosition);
        }
        
        // Store current position for next frame's smoothing
        if (!joint.userData) {
            joint.userData = {};
        }
        joint.userData.prevPosition = joint.position.clone();
        
        joint.visible = true;
    }
    
    // Update hand connections
    for (const connection of HAND_CONNECTIONS) {
        const [i, j] = connection;
        const bone = handMesh.connections[connection.join('-')];
        
        updateBoneFn(bone, handMesh.landmarks[i].position, handMesh.landmarks[j].position);
        bone.visible = true;
    }
}

// Function to smooth position
function smoothPosition(prevPosition, newPosition, smoothingFactor) {
    return prevPosition.multiplyScalar(smoothingFactor).add(newPosition.multiplyScalar(1 - smoothingFactor));
}

// Hide hand mesh
export function hideHandMesh(handMesh) {
    // Hide all hand landmarks and connections
    for (const key in handMesh.landmarks) {
        handMesh.landmarks[key].visible = false;
    }
    
    for (const key in handMesh.connections) {
        handMesh.connections[key].visible = false;
    }
}