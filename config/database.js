const { Model } = require('objection');
const Knex = require('knex');
// Initialize knex.

// console.log("process.env.DB_CONNECTION", process.env.DB_CONNECTION)

const knex = Knex({
    client: process.env.DB_CONNECTION,
    connection: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    }
});

// console.log("knex", knex)

// Give the knex object to objection.
Model.knex(knex);
module.exports = Model;