// Configuration options for the body tracking application

export const config = {
    // Visualization settings
    colors: {
        body: {
            connectors: 'rgba(255, 255, 255, 0.8)',
            landmarks: 'rgba(0, 255, 0, 0.9)'
        },
        face: {
            connectors: 'rgba(255, 138, 0, 0.8)',
            landmarks: 'rgba(255, 138, 0, 0.9)',
            mesh: 'rgba(255, 138, 0, 0.5)'
        },
        leftHand: {
            connectors: 'rgba(255, 0, 0, 0.8)',
            landmarks: 'rgba(255, 0, 0, 0.9)'
        },
        rightHand: {
            connectors: 'rgba(0, 217, 231, 0.8)',
            landmarks: 'rgba(0, 217, 231, 0.9)'
        }
    },
    
    // Landmark point sizes
    pointSizes: {
        body: 4,
        face: 2,
        faceMesh: 1,
        hand: 4
    },
    
    // Holistic model settings
    modelSettings: {
        smoothLandmarks: true,
        enableFaceGeometry: false,
        refineFaceLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    },
    
    // Camera settings
    camera: {
        width: 1280,
        height: 720,
        fps: 30
    }
};

