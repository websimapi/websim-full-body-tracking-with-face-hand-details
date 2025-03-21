import { POSE_CONNECTIONS } from './app.js';
import { createBone, updateBone } from './utils.js';

export function initBodyTracking(scene, config) {
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
        const bone = createBone(boneMaterial, config.threeJS.boneRadius);
        scene.add(bone);
        bone.visible = false;
        bodyMesh.bones[connection.join('-')] = bone;
    }
    
    return bodyMesh;
}

export function updateBodyMesh(bodyMesh, landmarks) {
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
            updateBone(bone, jointA.position, jointB.position);
            bone.visible = true;
        } else {
            bone.visible = false;
        }
    }
}

export function hideBodyMesh(bodyMesh) {
    // Hide all body joints and bones
    for (const key in bodyMesh.joints) {
        bodyMesh.joints[key].visible = false;
    }
    
    for (const key in bodyMesh.bones) {
        bodyMesh.bones[key].visible = false;
    }
}