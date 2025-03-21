/**
 * Body tracking module for 3D visualization
 */

// Constants for body landmark connections
export const POSE_CONNECTIONS = [
    // Face
    [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
    // Upper body
    [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19], 
    [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20], [11, 23], [12, 24], 
    [23, 24], [23, 25], [24, 26], [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], 
    [30, 32], [27, 31], [28, 32]
];

// Initialize body tracking
export function initBodyTracking(scene, THREE, config) {
    const bodyMesh = {
        joints: {},
        bones: {}
    };
    
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
        const geometry = new THREE.CylinderGeometry(config.threeJS.boneRadius, config.threeJS.boneRadius, 1, 8);
        geometry.rotateX(Math.PI / 2);
        const bone = new THREE.Mesh(geometry, boneMaterial);
        scene.add(bone);
        bone.visible = false;
        bodyMesh.bones[connection.join('-')] = bone;
    }
    
    return bodyMesh;
}

// Update body mesh with new pose data
export function updateBodyMesh(landmarks, bodyMesh, updateBoneFn) {
    // Scale and position the joints based on the landmarks
    for (let i = 0; i < landmarks.length; i++) {
        const landmark = landmarks[i];
        const joint = bodyMesh.joints[i];
        
        // Convert to 3D space, flipping coordinates as needed
        // x is flipped to mirror the pose correctly
        joint.position.set(
            -(landmark.x - 0.5) * 2, // x flipped and centered
            (landmark.y - 0.5) * -2, // y inverted and centered
            (landmark.z * 2) // z scaled for better visibility
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
            updateBoneFn(bone, jointA.position, jointB.position);
            bone.visible = true;
        } else {
            bone.visible = false;
        }
    }
}

// Hide body mesh
export function hideBodyMesh(bodyMesh) {
    // Hide all body joints and bones
    for (const key in bodyMesh.joints) {
        bodyMesh.joints[key].visible = false;
    }
    
    for (const key in bodyMesh.bones) {
        bodyMesh.bones[key].visible = false;
    }
}