export const PI = Math.PI;
export const TAU = PI * 2;

export function step ( edge, val ) {
    return val < edge ? 0 : 1;
}

export function smoothstep ( edge0, edge1, val ) {
    val = unMix( edge0, edge1, val );
    return val * val ( 3 - val * 2 );
}

export function clamp ( val, min, max ) {
    return val < min ? min : val > max ? max : val;
}

export function mix ( min, max, val ) {
    return val <= 0 ? min : val >= 1 ? max : min + ( max - min ) * val;
}

export const lerp = mix;

export function unMix ( min, max, val ) {
    return val <= min ? 0 : val >= max ? 1 : ( val - min ) / ( max - min );
}

export const unLerp = unMix;

export function fract ( val ) {
    return val - Math.floor( val );
}

export function hash (val) {
    return fract( Math.sin( val ) * 43758.5453123 );
}

export function hash2 (val1, val2) {
    return fract( Math.sin( val1 * 12.9898 + val2 * 4.1414 ) * 43758.5453 );
}

export function sign (val) {
    return val ? val < 0 ? - 1 : 1 : 0;
}
