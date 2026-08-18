import type * as THREE from 'three';

interface Settings {
    textureSize: number;
    lineAmount: number;
    followMouse: boolean;
    constraintRatio: number;
    useWhiteNodes: boolean;
    whiteNodesRatio: number;
    isWhite: boolean;
    whiteRatio: number;
    mouse?: THREE.Vector2;
    mouse3d?: THREE.Vector3;
    ignoredMaterial?: THREE.Material;
}

const settings: Settings = {
    textureSize: 128,
    lineAmount: 65536,

    // lines
    followMouse: false,
    constraintRatio: 0.07,
    useWhiteNodes: false,
    whiteNodesRatio: 1,

    isWhite: false,
    whiteRatio: 0
};

export default settings;
