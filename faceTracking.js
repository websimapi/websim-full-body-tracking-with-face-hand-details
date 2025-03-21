import { FACEMESH_CONTOURS } from './app.js';
import { updateBone } from './utils.js';
import * as THREE from 'three';

export function initFaceTracking(scene, config) {
    const faceMesh = {
        landmarks: {},
        connections: {}
    };
    
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
    
    return faceMesh;
}

export function updateFaceMesh(faceMesh, landmarks) {
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

export function hideFaceMesh(faceMesh) {
    // Hide all face landmarks and connections
    for (const key in faceMesh.landmarks) {
        faceMesh.landmarks[key].visible = false;
    }
    
    for (const key in faceMesh.connections) {
        faceMesh.connections[key].visible = false;
    }
}

function createBone(material, radius) {
    // Create a cylinder for the bone
    const geometry = new THREE.CylinderGeometry(radius, radius, 1, 8);
    // Rotate the cylinder so it's aligned along the z-axis
    geometry.rotateX(Math.PI / 2);
    const bone = new THREE.Mesh(geometry, material);
    return bone;
}