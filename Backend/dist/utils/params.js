export const parseParamId = (param) => {
    if (Array.isArray(param)) {
        return parseInt(param[0], 10);
    }
    return parseInt(param || '0', 10);
};
export const parseParamString = (param) => {
    if (Array.isArray(param)) {
        return param[0] || '';
    }
    return param || '';
};
