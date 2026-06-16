const messages = {
    generic: {
        fields_required: 'Todos los campos requeridos deben ser completados',
        invalid_status: 'El estado proporcionado no es válido',
        invalid_enum_value: 'El valor proporcionado no está permitido',
        id_required: 'El ID es requerido',
        not_found: 'Recurso no encontrado',
        invalid_date_format: 'Formato de fecha inválido',
        fields_empty: 'Campos vacíos',
        unauthorized: 'No autorizado.',
        error: 'Ocurrió un error al procesar la solicitud.',
    },

    error: {
        team: {
            fields_empty: {
                name: 'El nombre de la selección no puede estar vacío',
                code: 'El código de la selección no puede estar vacío',
            },
            not_found: 'Selección no encontrada',
        },

        match: {
            fields_empty: {
                home_team_id: 'El equipo local no puede estar vacío',
                away_team_id: 'El equipo visitante no puede estar vacío',
                kickoff_utc: 'La fecha y hora del partido no puede estar vacía',
                status: 'El estado del partido no puede estar vacío',
            },
            not_found: 'Partido no encontrado',
            already_played: 'No se puede simular un partido que ya se jugó',
            not_simulable: 'Solo se pueden simular partidos programados',
        },

        venue: {
            fields_empty: {
                name: 'El nombre del estadio no puede estar vacío',
            },
        },

        simulation: {
            not_found: 'No hay una simulación guardada para este partido',
            missing_features: 'Faltan datos de las selecciones para simular',
        },

        device: {
            fields_empty: {
                device_uuid: 'El identificador del dispositivo no puede estar vacío',
                type: 'El tipo no puede estar vacío',
                status: 'El estado no puede estar vacío',
            },
            not_found: 'Dispositivo no encontrado',
        },

        notification: {
            fields_empty: {
                device_id: 'El dispositivo no puede estar vacío',
                type: 'El tipo de notificación no puede estar vacío',
                status: 'El estado no puede estar vacío',
            },
        },
    },
};

export default messages;
