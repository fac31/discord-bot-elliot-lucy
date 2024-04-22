const mongoose = require('mongoose')

const tokenSchema = new mongoose.Schema({
    tokens: {
        type: String,
        required: true
    },
    userID: {
        type: String,
        default: '0000000000'
    }
});

module.exports = mongoose.model('User Tokens', tokenSchema)