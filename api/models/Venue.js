import { DataTypes } from 'sequelize';
import messages from '../config/messages.js';
import sequelize from '../db/sequelize.js';

/**
 * Estadio / sede del torneo (16 sedes en EE.UU., Canadá y México).
 */
const Venue = sequelize.define('venues', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: messages.error.venue.fields_empty.name },
        },
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    country: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    external_id: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    tableName: 'venues',
    timestamps: true,
    paranoid: true,
    indexes: [
        { fields: ['name'] },
    ],
});

export default Venue;
