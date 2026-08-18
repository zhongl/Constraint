export function mix ( min: number, max: number, val: number ): number {
    return val <= 0 ? min : val >= 1 ? max : min + ( max - min ) * val;
}

export const lerp = mix;

export function hash (val: number): number {
    const value = Math.sin( val ) * 43758.5453123;
    return value - Math.floor( value );
}
