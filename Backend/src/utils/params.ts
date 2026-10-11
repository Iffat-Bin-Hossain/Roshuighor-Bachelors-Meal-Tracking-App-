export const parseParamId = (param: string | string[] | undefined): number => {
  if (Array.isArray(param)) {
    return parseInt(param[0], 10);
  }
  return parseInt(param || '0', 10);
};

export const parseParamString = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) {
    return param[0] || '';
  }
  return param || '';
};
