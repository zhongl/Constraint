import parse from 'mout/queryString/parse';

const settings = {
    query: parse(window.location.href.replace('#','?')),

    // need restart
    useStats: false,
    textureSize: 128,
    lineAmount: 65536,

    // lines
    followMouse: false,
    constraintRatio: 0.07,
    useWhiteNodes: false,
    whiteNodesRatio: 1,

    useReflectedGround: true,

    isWhite: false,
    whiteRatio: 0
};

export const query = settings.query;
export default settings;
