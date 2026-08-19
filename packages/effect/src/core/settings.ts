import * as THREE from 'three';

export interface ConstraintSettings {
    textureSize: number;
    lineAmount: number;
    followMouse: boolean;
    constraintRatio: number;
    useLightNodes: boolean;
    lightNodesRatio: number;
    isLight: boolean;
    lightRatio: number;
    backgroundDark: string;
    backgroundLight: string;
    groundDark: string;
    groundLight: string;
    fogDensity: number;
    mouse3d: THREE.Vector3;
    ignoredMaterial: THREE.Material;
}

export function createSettings(): ConstraintSettings {
    return {
        textureSize: 128,
        lineAmount: 65536,
        followMouse: false,
        constraintRatio: 0.07,
        useLightNodes: false,
        lightNodesRatio: 1,
        isLight: false,
        lightRatio: 0,
        backgroundDark: '#222222',
        backgroundLight: '#eeeeee',
        groundDark: '#111111',
        groundLight: '#cccccc',
        fogDensity: 0.001,
        mouse3d: new THREE.Vector3(),
        ignoredMaterial: new THREE.Material()
    };
}
