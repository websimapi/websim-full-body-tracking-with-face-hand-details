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

// Create a terrain with height variations
export function createTerrain(scene, THREE, config) {
    // Create a terrain geometry
    const terrainGeometry = new THREE.PlaneGeometry(
        config.terrain.size,
        config.terrain.size,
        config.terrain.segments,
        config.terrain.segments
    );
    
    // Rotate the terrain to be horizontal
    terrainGeometry.rotateX(-Math.PI / 2);
    
    // Generate terrain height map using Perlin noise
    const positions = terrainGeometry.attributes.position.array;
    const heightMap = new Array(positions.length / 3);
    
    // Simple perlin noise approximation for height
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        
        // Generate a height value using simplex noise approximation
        const height = Math.sin(x * 0.5) * Math.cos(z * 0.5) * config.terrain.heightScale;
        
        // Apply height to the y-coordinate
        positions[i + 1] = height;
        
        // Store height in the map
        const vertexIndex = i / 3;
        heightMap[vertexIndex] = height;
    }
    
    // Update normals after modifying positions
    terrainGeometry.computeVertexNormals();
    
    // Create terrain material
    const terrainMaterial = new THREE.MeshStandardMaterial({
        color: config.terrain.color,
        roughness: 0.8,
        metalness: 0.2,
        flatShading: false
    });
    
    // Create terrain mesh
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    scene.add(terrain);
    
    // Add water plane below terrain
    const waterGeometry = new THREE.PlaneGeometry(config.terrain.size * 2, config.terrain.size * 2);
    waterGeometry.rotateX(-Math.PI / 2);
    
    const waterMaterial = new THREE.MeshStandardMaterial({
        color: config.terrain.waterColor,
        transparent: true,
        opacity: 0.7,
        roughness: 0.1,
        metalness: 0.8
    });
    
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.position.y = -0.2;
    scene.add(water);
    
    // Method to get height at any point on the terrain
    terrain.getHeightAt = (x, z) => {
        // Convert world coordinates to terrain local coordinates
        const terrainX = x + config.terrain.size / 2;
        const terrainZ = z + config.terrain.size / 2;
        
        // Convert to grid coordinates
        const gridX = Math.floor(terrainX / config.terrain.size * config.terrain.segments);
        const gridZ = Math.floor(terrainZ / config.terrain.size * config.terrain.segments);
        
        // Ensure we're within terrain bounds
        if (gridX < 0 || gridX >= config.terrain.segments || 
            gridZ < 0 || gridZ >= config.terrain.segments) {
            return -0.2; // Return water level for out of bounds
        }
        
        // Get vertex index
        const vertexIndex = gridZ * (config.terrain.segments + 1) + gridX;
        
        // Return the height at this position
        return heightMap[vertexIndex] || 0;
    };
    
    return terrain;
}