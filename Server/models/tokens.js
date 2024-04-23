const mongoose = require('mongoose')

const tokenSchema = new mongoose.Schema({
    tokens: {
        type: Object,
        required: true
    },
    userID: {
        type: String,
        default: '0000000000'
    },
    userEmail: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('User Tokens', tokenSchema)