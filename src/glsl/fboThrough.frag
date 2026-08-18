uniform vec2 resolution;
uniform sampler2D inputTexture;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 color = texture2D( inputTexture, uv ).xyz;
    gl_FragColor = vec4( color, 1.0 );
}
