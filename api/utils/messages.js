/**
 * Respuestas estándar de la API: { status: 1, ... } éxito | { status: 0, ... } error.
 * En los errores se descarta el campo `error` de `extra` para no exponer detalles técnicos.
 */
export const errorMessage = ({ extra = null, message = null, code = null } = {}) => {
    let safeExtra = null;
    if (extra) {
        const { error: _dropped, ...rest } = extra;
        safeExtra = Object.keys(rest).length > 0 ? rest : null;
    }
    return Object.assign(
        { status: 0 },
        message ? { message } : null,
        code ? { code } : null,
        safeExtra
    );
};

export const successMessage = ({ extra = null, message = null, code = null } = {}) =>
    Object.assign(
        { status: 1 },
        message ? { message } : null,
        code ? { code } : null,
        extra
    );
