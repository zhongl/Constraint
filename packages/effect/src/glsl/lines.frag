
// chunk(common);
// Match the legacy encoder used by lineDepth.frag.
const float UnpackDownscale = 255. / 256.;
const vec4 UnpackFactors = UnpackDownscale / vec4( 256. * 256. * 256., 256. * 256., 256., 1. );

float unpackRGBAToDepth( const in vec4 v ) {
    return dot( v, UnpackFactors );
}

vec2 unpackRGBATo2Half( vec4 v ) {
    return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
// chunk(fog_pars_fragment);
// chunk(bsdfs);
// chunk(lights_pars_begin);
// chunk(envmap_physical_pars_fragment);
// chunk(shadowmap_pars_fragment);
// chunk(shadowmask_pars_fragment);

varying float vBrightness;
varying float vSide;
varying float vAlpha;

uniform float lightRatio;

void main() {

    vec3 outgoingLight = vec3(1.0);

    vec3 shadowMask = vec3( getShadowMask() );

    outgoingLight = 0.1 + pow(shadowMask, vec3(1.5 - lightRatio * 1.0)) * 0.9 + vBrightness * (1.0 - lightRatio * 0.65);

    // chunk(fog_fragment);

    gl_FragColor = vec4(outgoingLight, 1.0);
}
