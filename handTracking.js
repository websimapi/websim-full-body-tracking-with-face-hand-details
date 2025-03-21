import { HAND_CONNECTIONS } from './app.js';
import { createBone, updateBone } from './utils.js';

export function initHandTracking(scene, config, handType) {
    const handMesh = {
        landmarks: {},
        connections: {}
    };
    
    const material = new THREE.MeshStandardMaterial({ 
        color: handType === 'left' ? config.threeJS.leftHandColor : config.threeJS.rightHandColor,
        emissive: handType === 'left' ? config.threeJS.leftHandColor : config.threeJS.rightHandColor,
        emissiveIntensity: 0.3
    });
    
    const jointGeometry = new THREE.SphereGeometry(config.threeJS.jointRadius * 0.6, 8, 8);
    
    // Create hand joints
    for (let i = 0; i < 21; i++) {
        const joint = new THREE.Mesh(jointGeometry, material);
        joint.visible = false;
        scene.add(joint);
        handMesh.landmarks[i] = joint;
    }
    
    // Create hand connections
    const connectorMaterial = new THREE.MeshStandardMaterial({ 
        color: handType === 'left' ? config.threeJS.leftHandColor : config.threeJS.rightHandColor,
        emissive: handType === 'left' ? config.threeJS.leftHandColor : config.threeJS.rightHandColor,
        emissiveIntensity: 0.2
    });
    
    for (const connection of HAND_CONNECTIONS) {
        const bone = createBone(connectorMaterial, config.threeJS.boneRadius * 0.5);
        scene.add(bone);
        bone.visible = false;
        handMesh.connections[connection.join('-')] = bone;
    }
    
    return handMesh;
}

export function updateHandMesh(handMesh, landmarks) {
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

export function hideHandMesh(handMesh) {
    // Hide all hand landmarks and connections
    for (const key in handMesh.landmarks) {
        handMesh.landmarks[key].visible = false;
    }
    
    for (const key in handMesh.connections) {
        handMesh.connections[key].visible = false;
    }
}