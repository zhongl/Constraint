import * as THREE from 'three';

var threeChunkReplaceRegExp = /\/\/\s?chunk_replace\s(.+)([\d\D]+)\/\/\s?end_chunk_replace/gm;
var threeChunkRegExp = /\/\/\s?chunk\(\s?(\w+)\s?\);/g;
var glslifyBugFixRegExp = /(_\d+_\d+)(_\d+_\d+)+/g;
var glslifyGlobalRegExp = /GLOBAL_VAR_(.+)(_\d+_\d+)+/g;

let _chunkReplaceObj: Record<string, string>;

function _storeChunkReplaceParse(shader: string): string {
    _chunkReplaceObj = {};
    return shader.replace(threeChunkReplaceRegExp, _storeChunkReplaceFunc);
}

function _threeChunkParse(shader: string): string {
    return shader.replace(threeChunkRegExp, _replaceThreeChunkFunc);
}

function _glslifyBugFixParse(shader: string): string {
    return shader.replace(glslifyBugFixRegExp, _returnFirst);
}

function _glslifyGlobalParse(shader: string): string {
    return shader.replace(glslifyGlobalRegExp, _returnFirst);
}

function _storeChunkReplaceFunc(_a: string, b: string, c: string): string {
    _chunkReplaceObj[b.trim()] = c;
    return '';
}

function _replaceThreeChunkFunc(_a: string, b: string): string {
    var str = THREE.ShaderChunk[b as keyof typeof THREE.ShaderChunk] + '\n';
    for(var id in _chunkReplaceObj) {
        str = str.replace(id, _chunkReplaceObj[id]);
    }
    return str;
}

function _returnFirst(_a: string, b: string): string {
    return b;
}

function parse(shader: string): string {
    shader = _storeChunkReplaceParse(shader);
    shader = _threeChunkParse(shader);
    shader = _glslifyBugFixParse(shader);
    return _glslifyGlobalParse(shader);
}

export default parse;
