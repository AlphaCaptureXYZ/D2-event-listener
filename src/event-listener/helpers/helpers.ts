export const isNullOrUndefined = (value: any) => {
    const checkValue = [
        undefined,
        null,
        'undefined',
        'UNDEFINED',
        'Undefined',
        'null',
        'NULL',
        'Null',
        'NONE',
        'None',
        'none',
    ]?.includes(value)
        ? undefined
        : value;
    const check = checkValue === undefined || null ? true : false;
    return check;
}

export const getBoolean = (value: any): boolean => {
    const data = {
        true: true,
        false: false,
        1: true,
        0: false,
        undefined: false,
        null: false,
    };
    const response = (data as any)[value];
    return response;
}