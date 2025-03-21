/**
 * Utility functions for 3D visualization
 */

// Create a bone (cylinder) between joints
export function createBone(material, radius) {
    // Create a cylinder for the bone
    const geometry = new THREE.CylinderGeometry(radius, radius, 1, 8);
    // Rotate the cylinder so it's aligned along the z-axis
    geometry.rotateX(Math.PI / 2);
    const bone = new THREE.Mesh(geometry, material);
    return bone;
}

// Update bone position and orientation
export function updateBone(bone, startPos, endPos) {
    // Position
    const midpoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
    bone.position.copy(midpoint);
    
    // Orientation
    bone.lookAt(endPos);
    
    // Scale
    const length = startPos.distanceTo(endPos);
    bone.scale.set(1, 1, length);
}

// Position smoothing with exponential moving average
export function smoothPosition(currentPos, newPos, smoothingFactor = 0.8) {
    if (!currentPos) return newPos.clone();
    
    return new THREE.Vector3(
        currentPos.x * smoothingFactor + newPos.x * (1 - smoothingFactor),
        currentPos.y * smoothingFactor + newPos.y * (1 - smoothingFactor),
        currentPos.z * smoothingFactor + newPos.z * (1 - smoothingFactor)
    );
}