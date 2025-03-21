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

// Smoothing function using moving average
export function smoothPosition(newPosition, history, smoothingFactor) {
    if (history.length === 0) {
        history.push(newPosition.clone());
        return newPosition.clone();
    }
    
    // Apply exponential smoothing
    const smoothed = new THREE.Vector3().copy(history[history.length - 1]);
    smoothed.lerp(newPosition, 1 - smoothingFactor);
    
    // Store in history
    history.push(smoothed.clone());
    
    // Keep history at the right size
    if (history.length > 10) {
        history.shift();
    }
    
    return smoothed;
}