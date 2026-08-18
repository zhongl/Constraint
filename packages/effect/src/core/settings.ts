import * as THREE from 'three';

export interface ConstraintSettings {
    textureSize: number;
    lineAmount: number;
    followMouse: boolean;
    constraintRatio: number;
    useWhiteNodes: boolean;
    whiteNodesRatio: number;
    isWhite: boolean;
    whiteRatio: number;
    mouse3d: THREE.Vector3;
    ignoredMaterial: THREE.Material;
}

export function createSettings(): ConstraintSettings {
    return {
        textureSize: 128,
        lineAmount: 65536,
        followMouse: false,
        constraintRatio: 0.07,
        useWhiteNodes: false,
        whiteNodesRatio: 1,
        isWhite: false,
        whiteRatio: 0,
        mouse3d: new THREE.Vector3(),
        ignoredMaterial: new THREE.Material()
    };
}
