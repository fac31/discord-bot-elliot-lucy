const mongoose = require('mongoose')

const codeReviewSchema = new mongoose.Schema({
    link: { 
        type: String, 
        required: true 
    },
    taskId: {
        type: String,
        required: true 
    }
});

module.exports = mongoose.model('Code Review Data', codeReviewSchema)