import { config } from './config.js';
const THREE = window.THREE;

// 3D visualization components
export class ThreeScene {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.bodyMesh = { joints: {}, bones: {} };
        this.faceMesh = { landmarks: {}, connections: {} };
        this.leftHandMesh = { landmarks: {}, connections: {} };
        this.rightHandMesh = { landmarks: {}, connections: {} };
        
        this.init();
    }
    
    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(config.threeJS.background);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            this.container.clientWidth / this.container.clientHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 0, 2);
        this.camera.lookAt(0, 0, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 1, 2);
        this.scene.add(directionalLight);

        // Initialize avatar meshes
        this.createBodyMesh();
        this.createFaceMesh();
        this.createHandMeshes();

        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        });

        // Start animation loop
        this.animate();
    }
    
    animate = () => {
        requestAnimationFrame(this.animate);
        this.renderer.render(this.scene, this.camera);
    }
    
    createBodyMesh() {
        // Create joints
        const jointMaterial = new THREE.MeshStandardMaterial({ 
            color: config.threeJS.bodyColor,
            emissive: config.threeJS.bodyColor,
            emissiveIntensity: 0.3
        });
        
        const jointGeometry = new THREE.SphereGeometry(config.threeJS.jointRadius, 16, 16);
        
        // Add body joints to the scene
        for (let i = 0; i < 33; i++) {
            const joint = new THREE.Mesh(jointGeometry, jointMaterial);
            joint.visible = false;
            this.scene.add(joint);
            this.bodyMesh.joints[i] = joint;
        }
        
        // Create bones (cylinders between joints)
        const boneMaterial = new THREE.MeshStandardMaterial({ 
            color: config.threeJS.bodyColor,
            emissive: config.threeJS.bodyColor,
            emissiveIntensity: 0.2
        });
        
        // Create bones for pose connections
        for (const connection of POSE_CONNECTIONS) {
            const bone = this.createBone(boneMaterial, config.threeJS.boneRadius);
            this.scene.add(bone);
            bone.visible = false;
            this.bodyMesh.bones[connection.join('-')] = bone;
        }
    }
    
    createFaceMesh() {
        // Create face landmarks
        const faceMaterial = new THREE.MeshStandardMaterial({ 
            color: config.threeJS.faceColor,
            emissive: config.threeJS.faceColor,
            emissiveIntensity: 0.3
        });
        
        const jointGeometry = new THREE.SphereGeometry(config.threeJS.jointRadius * 0.5, 8, 8);
        
        // We'll add face landmarks
        for (let i = 0; i < 468; i++) {
            const joint = new THREE.Mesh(jointGeometry, faceMaterial);
            joint.visible = false;
            this.scene.add(joint);
            this.faceMesh.landmarks[i] = joint;
        }
        
        // Create face connections for important contours
        const faceConnectorMaterial = new THREE.MeshStandardMaterial({ 
            color: config.threeJS.faceColor,
            emissive: config.threeJS.faceColor,
            emissiveIntensity: 0.2
        });
        
        for (const connection of FACEMESH_CONTOURS) {
            const bone = this.createBone(faceConnectorMaterial, config.threeJS.boneRadius * 0.4);
            this.scene.add(bone);
            bone.visible = false;
            this.faceMesh.connections[connection.join('-')] = bone;
        }
    }
    
    createHandMeshes() {
        // Create hand landmarks and connections
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
            this.scene.add(joint);
            this.leftHandMesh.landmarks[i] = joint;
        }
        
        // Create right hand joints
        for (let i = 0; i < 21; i++) {
            const joint = new THREE.Mesh(jointGeometry, rightHandMaterial);
            joint.visible = false;
            this.scene.add(joint);
            this.rightHandMesh.landmarks[i] = joint;
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
            const leftBone = this.createBone(leftHandConnectorMaterial, config.threeJS.boneRadius * 0.5);
            this.scene.add(leftBone);
            leftBone.visible = false;
            this.leftHandMesh.connections[connection.join('-')] = leftBone;
            
            // Right hand bones
            const rightBone = this.createBone(rightHandConnectorMaterial, config.threeJS.boneRadius * 0.5);
            this.scene.add(rightBone);
            rightBone.visible = false;
            this.rightHandMesh.connections[connection.join('-')] = rightBone;
        }
    }
    
    // Helper function to create a bone (cylinder) between joints
    createBone(material, radius) {
        const geometry = new THREE.CylinderGeometry(radius, radius, 1, 8);
        geometry.rotateX(Math.PI / 2);
        const bone = new THREE.Mesh(geometry, material);
        return bone;
    }
    
    // Update the 3D scene with pose data
    updatePose(results, options) {
        const { showBody, showFace, showHands } = options;
        
        // Update body pose
        if (showBody && results.poseLandmarks) {
            this.updateBodyMesh(results.poseLandmarks);
        } else {
            this.hideBodyMesh();
        }
        
        // Update face
        if (showFace && results.faceLandmarks) {
            this.updateFaceMesh(results.faceLandmarks);
        } else {
            this.hideFaceMesh();
        }
        
        // Update hands
        if (showHands) {
            // Update left hand
            if (results.leftHandLandmarks) {
                this.updateHandMesh(results.leftHandLandmarks, this.leftHandMesh, 'left');
            } else {
                this.hideHandMesh(this.leftHandMesh);
            }
            
            // Update right hand
            if (results.rightHandLandmarks) {
                this.updateHandMesh(results.rightHandLandmarks, this.rightHandMesh, 'right');
            } else {
                this.hideHandMesh(this.rightHandMesh);
            }
        } else {
            this.hideHandMesh(this.leftHandMesh);
            this.hideHandMesh(this.rightHandMesh);
        }
    }
    
    // Convert MediaPipe coordinates to Three.js coordinates
    normalizeCoordinates(landmark, handType = null) {
        // Base transformation for all landmarks
        let x = -(landmark.x - 0.5) * 2; // x flipped and centered
        let y = (landmark.y - 0.5) * -2; // y inverted and centered
        let z = landmark.z * 2; // z scaled for better visibility
        
        // Apply additional adjustments for hands to match with body arms
        if (handType === 'left') {
            // Adjust left hand positioning to connect properly with the arm
            if (landmark.x > 0.2) { // Only adjust if hand is away from body center
                x *= 0.85; // Scale x to better align with wrist
            }
        } else if (handType === 'right') {
            // Adjust right hand positioning to connect properly with the arm
            if (landmark.x < 0.8) { // Only adjust if hand is away from body center
                x *= 0.85; // Scale x to better align with wrist
            }
        }
        
        return { x, y, z };
    }
    
    updateBodyMesh(landmarks) {
        // Scale and position the joints based on the landmarks
        for (let i = 0; i < landmarks.length; i++) {
            const landmark = landmarks[i];
            const joint = this.bodyMesh.joints[i];
            
            // Convert to 3D space
            const position = this.normalizeCoordinates(landmark);
            joint.position.set(position.x, position.y, position.z);
            
            joint.visible = landmark.visibility > 0.5;
        }
        
        // Update bones between joints
        for (const connection of POSE_CONNECTIONS) {
            const [i, j] = connection;
            const bone = this.bodyMesh.bones[connection.join('-')];
            
            const jointA = this.bodyMesh.joints[i];
            const jointB = this.bodyMesh.joints[j];
            
            // Only show bones if both joints are visible
            if (jointA.visible && jointB.visible) {
                this.updateBone(bone, jointA.position, jointB.position);
                bone.visible = true;
            } else {
                bone.visible = false;
            }
        }
    }
    
    updateFaceMesh(landmarks) {
        // Update face landmarks
        for (let i = 0; i < landmarks.length; i++) {
            if (!this.faceMesh.landmarks[i]) continue; // Skip if landmark doesn't exist in our mesh
            
            const landmark = landmarks[i];
            const joint = this.faceMesh.landmarks[i];
            
            // Position face landmarks in 3D space
            const position = this.normalizeCoordinates(landmark);
            joint.position.set(position.x, position.y, position.z);
            
            joint.visible = true;
        }
        
        // Update face contour connections
        for (const connection of FACEMESH_CONTOURS) {
            const [i, j] = connection;
            if (!this.faceMesh.connections[connection.join('-')] || 
                !this.faceMesh.landmarks[i] || 
                !this.faceMesh.landmarks[j]) continue;
            
            const bone = this.faceMesh.connections[connection.join('-')];
            
            this.updateBone(bone, this.faceMesh.landmarks[i].position, this.faceMesh.landmarks[j].position);
            bone.visible = true;
        }
    }
    
    updateHandMesh(landmarks, handMesh, handType) {
        // Update hand landmarks
        for (let i = 0; i < landmarks.length; i++) {
            const landmark = landmarks[i];
            const joint = handMesh.landmarks[i];
            
            // Position hand landmarks in 3D space with special adjustments for hands
            const position = this.normalizeCoordinates(landmark, handType);
            joint.position.set(position.x, position.y, position.z);
            
            joint.visible = true;
        }
        
        // Update hand connections
        for (const connection of HAND_CONNECTIONS) {
            const [i, j] = connection;
            const bone = handMesh.connections[connection.join('-')];
            
            this.updateBone(bone, handMesh.landmarks[i].position, handMesh.landmarks[j].position);
            bone.visible = true;
        }
    }
    
    updateBone(bone, startPos, endPos) {
        // Position
        const midpoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
        bone.position.copy(midpoint);
        
        // Orientation
        bone.lookAt(endPos);
        
        // Scale
        const length = startPos.distanceTo(endPos);
        bone.scale.set(1, 1, length);
    }
    
    hideBodyMesh() {
        // Hide all body joints and bones
        for (const key in this.bodyMesh.joints) {
            this.bodyMesh.joints[key].visible = false;
        }
        
        for (const key in this.bodyMesh.bones) {
            this.bodyMesh.bones[key].visible = false;
        }
    }
    
    hideFaceMesh() {
        // Hide all face landmarks and connections
        for (const key in this.faceMesh.landmarks) {
            this.faceMesh.landmarks[key].visible = false;
        }
        
        for (const key in this.faceMesh.connections) {
            this.faceMesh.connections[key].visible = false;
        }
    }
    
    hideHandMesh(handMesh) {
        // Hide all hand landmarks and connections
        for (const key in handMesh.landmarks) {
            handMesh.landmarks[key].visible = false;
        }
        
        for (const key in handMesh.connections) {
            handMesh.connections[key].visible = false;
        }
    }
}

// Constants for landmark connections
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